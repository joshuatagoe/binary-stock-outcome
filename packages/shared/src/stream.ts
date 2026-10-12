// The live stream and the backend's API bodies (ARCHITECTURE.md section 6 "The backend's API", D14, D16, D91, D95, D120).
// `GET /stream?topics=META,AAPL` sends server-sent events of five types, each with a sequence number and its topic (D95). The section
// names the types and the envelope, not the payloads; the payloads below are the minimum each type needs and are the first thing the
// backend slice may refine (a change to a wire contract is a logged decision).
import type { Level } from './worstPrice.ts';

export const STREAM_MESSAGE_TYPES = ['snapshot', 'book', 'price', 'market', 'heartbeat'] as const;
export type StreamMessageType = (typeof STREAM_MESSAGE_TYPES)[number];

/** Every message carries these. The topic is the stock ("META"); `seq` is what `Last-Event-ID` resumes from (D16). */
export interface StreamEnvelope {
  type: StreamMessageType;
  seq: number;
  topic: string;
}

/** A market's key reads like `META-680-2026-10-08` (D72). */
export type MarketKey = string;

export interface BookView {
  marketKey: MarketKey;
  /** [cents, quantity], best first. */
  asks: Level[];
  bids: Level[];
}

export interface MarketView {
  marketKey: MarketKey;
  /** Trading, Under review, Proposed or Settled (USERS.md). */
  status: 'Trading' | 'UnderReview' | 'Proposed' | 'Settled';
  /** Set once Settled. */
  outcome?: 'Yes' | 'No';
}

export interface PriceView {
  /** Pyth's integer and exponent, never a float (D52). */
  price: string;
  exponent: number;
  /** Unix seconds. */
  publishTime: number;
}

export type StreamMessage =
  | (StreamEnvelope & { type: 'snapshot'; markets: MarketView[]; books: BookView[]; price?: PriceView })
  | (StreamEnvelope & { type: 'book' } & BookView)
  | (StreamEnvelope & { type: 'price' } & PriceView)
  | (StreamEnvelope & { type: 'market' } & MarketView)
  | (StreamEnvelope & { type: 'heartbeat'; at: number });

/** A runtime check of the envelope. The payload is the producer's to get right. */
export function isStreamMessage(value: unknown): value is StreamMessage {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.type === 'string' &&
    (STREAM_MESSAGE_TYPES as readonly string[]).includes(v.type) &&
    typeof v.seq === 'number' && Number.isInteger(v.seq) && v.seq >= 0 &&
    typeof v.topic === 'string' && v.topic.length > 0
  );
}

/** Errors come back as `{code, message}`. */
export interface ApiError {
  code: string;
  message: string;
}

/** `POST /api/reports`: 202, 400 over 500 characters, 404 if the market is not Under review or Proposed, 429 if rate-limited (D91). */
export interface ReportBody {
  market_key: MarketKey;
  body: string;
  wallet?: string;
}
export const REPORT_MAX_CHARS = 500;

/** `POST /api/client-errors`: 202, or 429 if rate-limited. Wallet addresses are stripped (D120). */
export interface ClientErrorBody {
  page: string;
  message: string;
  browser: string;
  tracker_state: string;
}

/** `GET /api/health` (D98, D132, P25). 200 when the database answers and no migration is pending, 503 otherwise. */
export interface HealthResponse {
  role: 'primary' | 'standby';
  commit: string;
  last_pass_at: string | null;
  chain: { slot: number; seen_at: string };
  database: { answers: boolean; migrations: { applied: number; current: number } };
}

/** The query of `GET /api/timeline` and `GET /api/wallets/{address}/history`; every field is optional. */
export interface TimelineQuery {
  day?: string;
  stock?: string;
  market?: MarketKey;
  kind?: string;
  wallet?: string;
  cursor?: string;
}
