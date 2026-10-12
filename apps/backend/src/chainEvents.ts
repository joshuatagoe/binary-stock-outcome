// Turns a transaction into the program's events (D62), decoding with the generated client in clients/ts. Two places hold them:
//   - event calls: the program calls itself with Anchor's tag, then the event's discriminator and fields (the same bytes as
//     emit_cpi!, programs/meridian/src/events.rs). They show as inner instructions of the instruction that made them.
//   - "Program data" log lines, which Anchor's emit! writes (Initialize Config still uses it).
// A failed transaction's events were rolled back, so it yields none.
import * as client from '@meridian/client';
import { EVENT_KINDS, type EventKind, type MeridianEvent } from '@meridian/shared';
import { getBase58Encoder, getBase64Encoder } from '@solana/kit';
import type { RawTx } from './chainReader.ts';

/** Anchor's EVENT_IX_TAG_LE: the first 8 bytes of an event call. */
const EVENT_IX_TAG = new Uint8Array([228, 69, 165, 46, 81, 203, 154, 29]);

type Codecs = {
  getDiscriminator(): Uint8Array;
  getDecoder(): { decode(bytes: Uint8Array): unknown };
};

const hex = (bytes: Uint8Array) => Buffer.from(bytes).toString('hex');

// One decoder per event, looked up by the generated client's names, so a new event in the program needs no edit here.
const DECODERS = new Map<string, { kind: EventKind; decode(bytes: Uint8Array): unknown }>(
  EVENT_KINDS.map((kind) => {
    const exports = client as unknown as Record<string, (() => unknown) | undefined>;
    const discriminator = exports[`get${kind}EventDiscriminatorBytes`];
    const decoder = exports[`get${kind}EventDecoder`];
    if (!discriminator || !decoder) throw new Error(`the generated client has no ${kind} event; regenerate clients/ts or update packages/shared`);
    const codecs: Codecs = { getDiscriminator: discriminator as () => Uint8Array, getDecoder: decoder as () => { decode(bytes: Uint8Array): unknown } };
    return [hex(codecs.getDiscriminator()), { kind, decode: (bytes: Uint8Array) => codecs.getDecoder().decode(bytes) }] as const;
  }),
);

// The generated decoders give an enum as its number (Side: 0 is Buy); packages/shared names them. The generated enum objects map both ways.
const ENUM_FIELDS: Partial<Record<EventKind, Record<string, Record<number, string>>>> = {
  Fill: { side: client.Side },
  OrderPlaced: { side: client.Side },
  OrderCancelled: { side: client.Side, reason: client.CancelReason },
  Redeemed: { mode: client.RedeemMode },
  MarketSettled: { outcome: client.Outcome, settledBy: client.SettledBy },
  MarketHeld: { reason: client.HoldReason },
  ResultProposed: { outcome: client.Outcome },
};

function named(kind: EventKind, value: Record<string, unknown>): Record<string, unknown> {
  for (const [field, names] of Object.entries(ENUM_FIELDS[kind] ?? {})) {
    const raw = value[field];
    const name = typeof raw === 'number' ? names[raw] : raw;
    if (name === undefined) throw new Error(`${kind}.${field} is ${String(raw)}, which the generated client has no name for`);
    value[field] = name;
  }
  return value;
}

/**
 * Decodes an event's bytes (its 8-byte discriminator, then its fields). Null for bytes that are not one of ours, such as an event
 * from a newer program; throws for one of ours that is cut short or malformed, so half an event is never stored.
 */
export function decodeEvent(bytes: Uint8Array): MeridianEvent | null {
  if (bytes.length < 8) return null;
  const known = DECODERS.get(hex(bytes.subarray(0, 8)));
  if (!known) return null;
  return { kind: known.kind, ...named(known.kind, { ...(known.decode(bytes) as Record<string, unknown>) }) } as MeridianEvent;
}

export interface ExtractedEvent {
  /** The top-level instruction that made it. */
  ixIndex: number;
  /** Its place among the transaction's events, in the order they happened. */
  eventIndex: number;
  event: MeridianEvent;
}

const startsWith = (bytes: Uint8Array, prefix: Uint8Array) => bytes.length >= prefix.length && prefix.every((b, i) => bytes[i] === b);
const base58 = getBase58Encoder();
const base64 = getBase64Encoder();

export function extractEvents(tx: RawTx, program: string): ExtractedEvent[] {
  if (tx.failed) return [];
  // Every event call and every data line of our program takes a place in the numbering, readable or not, so the numbers never
  // depend on what the decoder understood. `event` is null for a data line that is not one of our events.
  const found: { ixIndex: number; order: number; event: MeridianEvent | null }[] = [];
  let order = 0;

  for (const group of tx.inner) {
    for (const ix of group.instructions) {
      if (ix.programId !== program) continue;
      const data = new Uint8Array(base58.encode(ix.data));
      if (!startsWith(data, EVENT_IX_TAG)) continue;
      const event = decodeEvent(data.subarray(EVENT_IX_TAG.length));
      // Our program's own event call that we cannot read is a newer program or a stale client: stop, never drop it.
      if (!event) throw new Error(`unknown event in transaction ${tx.signature}, instruction ${group.index}: regenerate clients/ts and update packages/shared`);
      found.push({ ixIndex: group.index, order: order++, event });
    }
  }

  // Log lines: follow which program is running, and which top-level instruction it is inside.
  const stack: string[] = [];
  let top = -1;
  const logged: typeof found = [];
  for (const line of tx.logs) {
    const invoke = /^Program (\w+) invoke \[(\d+)\]$/.exec(line);
    if (invoke) {
      if (invoke[2] === '1') top++;
      stack.push(invoke[1]!);
    } else if (/^Program \w+ (success|failed)/.test(line)) {
      stack.pop();
    } else if (line.startsWith('Program data: ') && stack.at(-1) === program) {
      const event = decodeEvent(new Uint8Array(base64.encode(line.slice('Program data: '.length))));
      logged.push({ ixIndex: top, order: order++, event });
    }
  }

  // Within an instruction, event calls come before log lines; the order is fixed so a second read numbers the same way.
  return [...found, ...logged]
    .sort((a, b) => a.ixIndex - b.ixIndex || a.order - b.order)
    .flatMap((e, eventIndex) => (e.event ? [{ ixIndex: e.ixIndex, eventIndex, event: e.event }] : []));
}
