// D139: a market's address and its linked accounts' addresses. The market comes from the word "market", the ticker's letters, the trading
// day as a 4-byte little-endian yyyymmdd and the strike in cents as an 8-byte little-endian number. The Yes mint, No mint, vault, book and
// the book's two token accounts each come from their own word and the market's address. Changing a seed stops every lane (D139, P12).
import { getAddressEncoder, getProgramDerivedAddress } from '@solana/kit';
import type { Address } from '@solana/kit';

/** From Anchor.toml. */
export const PROGRAM_ADDRESS = 'kvQXEAnqr5muN7CKBGWFQ9R5d3L4Yf1bqPgG2BQX3Ly' as Address;

const text = new TextEncoder();

function littleEndian(value: bigint, bytes: number): Uint8Array {
  if (value < 0n || value >= 1n << BigInt(bytes * 8)) throw new RangeError(`${value} does not fit in ${bytes} bytes`);
  const out = new Uint8Array(bytes);
  for (let i = 0, v = value; i < bytes; i++, v >>= 8n) out[i] = Number(v & 0xffn);
  return out;
}

/** The four seeds of a market's address. */
export function marketSeeds(ticker: string, day: number, strikeCents: bigint | number): Uint8Array[] {
  if (!Number.isInteger(day)) throw new RangeError('The day must be a whole yyyymmdd number');
  return [text.encode('market'), text.encode(ticker), littleEndian(BigInt(day), 4), littleEndian(BigInt(strikeCents), 8)];
}

export async function marketAddress(ticker: string, day: number, strikeCents: bigint | number): Promise<Address> {
  const [address] = await getProgramDerivedAddress({ programAddress: PROGRAM_ADDRESS, seeds: marketSeeds(ticker, day, strikeCents) });
  return address;
}

export interface MarketAccounts {
  yesMint: Address;
  noMint: Address;
  vault: Address;
  book: Address;
  bookUsdc: Address;
  bookYes: Address;
  /** Paired offers' No (D142). */
  bookNo: Address;
}

/** The six per-market accounts, each from its word and the market's address. */
export async function marketAccounts(market: Address): Promise<MarketAccounts> {
  const marketBytes = getAddressEncoder().encode(market);
  const derive = async (word: string): Promise<Address> => {
    const [address] = await getProgramDerivedAddress({ programAddress: PROGRAM_ADDRESS, seeds: [text.encode(word), marketBytes] });
    return address;
  };
  const [yesMint, noMint, vault, book, bookUsdc, bookYes, bookNo] = await Promise.all(
    ['yes', 'no', 'vault', 'book', 'book_usdc', 'book_yes', 'book_no'].map(derive),
  );
  return { yesMint: yesMint!, noMint: noMint!, vault: vault!, book: book!, bookUsdc: bookUsdc!, bookYes: bookYes!, bookNo: bookNo! };
}
