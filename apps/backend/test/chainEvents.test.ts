// Decoding the program's events with the generated client (D62): from event calls inside a transaction (what the program's
// writer sends, the same bytes as emit_cpi!) and from "Program data" log lines (what emit! writes, ConfigInitialized's way).
import { EVENT_KINDS, isMeridianEvent, PROGRAM_ADDRESS } from '@meridian/shared';
import { getBase64Decoder } from '@solana/kit';
import { describe, expect, it } from 'vitest';
import { decodeEvent, extractEvents } from '../src/chainEvents.ts';
import { A, EVENT_TAG, SAMPLES, eventBytes, tx } from './helpers/chainFixtures.ts';

const b64 = (bytes: Uint8Array) => getBase64Decoder().decode(bytes);

describe('decodeEvent', () => {
  it.each(EVENT_KINDS)('decodes %s back to the value the program wrote, as packages/shared defines it', (kind) => {
    const decoded = decodeEvent(eventBytes(kind, SAMPLES[kind] as never));
    expect(decoded).toEqual({ kind, ...SAMPLES[kind] });
    expect(isMeridianEvent(decoded)).toBe(true);
  });

  it('knows all 21 events the program declares', () => {
    expect(EVENT_KINDS).toHaveLength(21);
  });

  it('returns null for a discriminator it does not know, so a newer program does not stop the reader', () => {
    expect(decodeEvent(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 9, 9]))).toBeNull();
  });

  it('throws on a known event whose bytes are cut short, rather than storing half an event', () => {
    const bytes = eventBytes('Fill', SAMPLES.Fill);
    expect(() => decodeEvent(bytes.slice(0, bytes.length - 3))).toThrow();
  });

  it('returns null for fewer than 8 bytes', () => {
    expect(decodeEvent(new Uint8Array([1, 2, 3]))).toBeNull();
  });
});

describe('extractEvents', () => {
  it('reads events from the program’s own event calls, in order, with the top-level instruction index', () => {
    const t = tx({
      calls: [
        { index: 1, events: [eventBytes('Fill', SAMPLES.Fill), eventBytes('OrderPlaced', SAMPLES.OrderPlaced)] },
        { index: 3, events: [eventBytes('PairsMinted', SAMPLES.PairsMinted)] },
      ],
    });
    const got = extractEvents(t, PROGRAM_ADDRESS);
    expect(got.map((e) => [e.ixIndex, e.eventIndex, e.event.kind])).toEqual([
      [1, 0, 'Fill'], [1, 1, 'OrderPlaced'], [3, 2, 'PairsMinted'],
    ]);
  });

  it('numbers events the same way every time it reads a transaction', () => {
    const t = tx({ calls: [{ index: 0, events: [eventBytes('Paused', SAMPLES.Paused), eventBytes('Unpaused', SAMPLES.Unpaused)] }] });
    expect(extractEvents(t, PROGRAM_ADDRESS)).toEqual(extractEvents(t, PROGRAM_ADDRESS));
  });

  it('ignores a call that is not to our program and one without Anchor’s tag', () => {
    const t = tx({
      calls: [
        { index: 0, events: [eventBytes('Paused', SAMPLES.Paused)], programId: A.other },
        { index: 0, events: [eventBytes('Paused', SAMPLES.Paused)], tag: new Uint8Array(8) },
      ],
    });
    expect(extractEvents(t, PROGRAM_ADDRESS)).toEqual([]);
  });

  it('reads an emit! event from a "Program data" log line while our program is the one running', () => {
    const data = b64(eventBytes('ConfigInitialized', SAMPLES.ConfigInitialized));
    const t = tx({
      logs: [
        `Program ${A.other} invoke [1]`,
        `Program data: ${b64(eventBytes('Paused', SAMPLES.Paused))}`, // another program's data line: not ours
        `Program ${A.other} success`,
        `Program ${PROGRAM_ADDRESS} invoke [1]`,
        'Program log: Instruction: InitializeConfig',
        `Program data: ${data}`,
        `Program ${PROGRAM_ADDRESS} success`,
      ],
    });
    const got = extractEvents(t, PROGRAM_ADDRESS);
    expect(got).toHaveLength(1);
    expect(got[0]).toMatchObject({ ixIndex: 1, eventIndex: 0, event: { kind: 'ConfigInitialized' } });
  });

  it('gives the top-level index to a log event made inside a nested call', () => {
    const t = tx({
      logs: [
        `Program ${A.other} invoke [1]`,
        `Program ${PROGRAM_ADDRESS} invoke [2]`,
        `Program data: ${b64(eventBytes('ConfigInitialized', SAMPLES.ConfigInitialized))}`,
        `Program ${PROGRAM_ADDRESS} success`,
        `Program ${A.other} success`,
      ],
    });
    expect(extractEvents(t, PROGRAM_ADDRESS)[0]).toMatchObject({ ixIndex: 0 });
  });

  it('reads nothing from a failed transaction, whose events were rolled back', () => {
    const t = tx({ failed: true, calls: [{ index: 0, events: [eventBytes('Paused', SAMPLES.Paused)] }] });
    expect(extractEvents(t, PROGRAM_ADDRESS)).toEqual([]);
  });

  it('stops on an event call to our program with an unknown discriminator, so an event of a newer program is never dropped silently', () => {
    const t = tx({ calls: [{ index: 0, events: [new Uint8Array([9, 9, 9, 9, 9, 9, 9, 9, 1, 2])] }] });
    expect(() => extractEvents(t, PROGRAM_ADDRESS)).toThrow(/unknown event/i);
  });

  it('numbers events by position among all event calls and data lines, so a skipped line does not shift the others', () => {
    const real = b64(eventBytes('ConfigInitialized', SAMPLES.ConfigInitialized));
    const t = tx({
      logs: [
        `Program ${PROGRAM_ADDRESS} invoke [1]`,
        `Program data: ${b64(new Uint8Array([1, 2, 3]))}`, // ours, but not an event we can read
        `Program data: ${real}`,
        `Program ${PROGRAM_ADDRESS} success`,
      ],
    });
    expect(extractEvents(t, PROGRAM_ADDRESS).map((e) => e.eventIndex)).toEqual([1]);
  });

  it('keeps the tag out of the decoded event', () => {
    expect(EVENT_TAG).toHaveLength(8);
    const got = extractEvents(tx({ calls: [{ index: 0, events: [eventBytes('Fill', SAMPLES.Fill)] }] }), PROGRAM_ADDRESS);
    expect(got[0]!.event).toEqual({ kind: 'Fill', ...SAMPLES.Fill });
  });
});
