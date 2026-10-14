// What size an order was placed at: the chain keeps only what is left, so this browser remembers the size when it places an
// order (F6's "4 filled · 6 open"). Storage can be blocked or full, and then the Portfolio simply claims no size.
import { describe, expect, it } from 'vitest';
import { createPlaced } from '../src/placed.ts';

function memory(): Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: (k) => void data.delete(k) };
}

describe('the size an order was placed at', () => {
  it('is remembered by wallet, market and order ID', () => {
    const placed = createPlaced(memory());
    placed.remember('WALLET', 'MARKET', 4242n, 10);
    expect(placed.sizeOf('WALLET', 'MARKET', 4242n)).toBe(10);
    expect(placed.sizeOf('WALLET', 'MARKET', 4243n)).toBeNull();
    expect(placed.sizeOf('WALLET', 'OTHER', 4242n)).toBeNull();
    expect(placed.sizeOf('ANOTHER WALLET', 'MARKET', 4242n)).toBeNull();
  });

  it('survives a new page load, which reads the same storage', () => {
    const storage = memory();
    createPlaced(storage).remember('W', 'M', 1n, 7);
    expect(createPlaced(storage).sizeOf('W', 'M', 1n)).toBe(7);
  });

  it('keeps the newest orders and forgets the oldest', () => {
    const placed = createPlaced(memory(), 3);
    for (let i = 1n; i <= 5n; i++) placed.remember('W', 'M', i, Number(i));
    expect(placed.sizeOf('W', 'M', 1n)).toBeNull();
    expect(placed.sizeOf('W', 'M', 2n)).toBeNull();
    expect(placed.sizeOf('W', 'M', 5n)).toBe(5);
  });

  it('knows nothing when storage is missing, throws, or holds rubbish', () => {
    expect(createPlaced(null).sizeOf('W', 'M', 1n)).toBeNull();
    createPlaced(null).remember('W', 'M', 1n, 5);
    const throwing = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('full'); }, removeItem: () => {} };
    expect(createPlaced(throwing).sizeOf('W', 'M', 1n)).toBeNull();
    expect(() => createPlaced(throwing).remember('W', 'M', 1n, 5)).not.toThrow();
    const rubbish = memory();
    rubbish.setItem('meridian-placed', '{not json');
    expect(createPlaced(rubbish).sizeOf('W', 'M', 1n)).toBeNull();
  });
});
