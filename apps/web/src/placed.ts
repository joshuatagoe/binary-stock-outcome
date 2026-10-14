// The size an order was placed at (F6: "4 filled · 6 open"). The chain keeps only what is left of an order, so this browser
// remembers the size when it places one. It is a convenience: another browser, a cleared store or a blocked store just means the
// Portfolio shows what is open and claims no filled count.
type Store = Pick<Storage, 'getItem' | 'setItem'>;

const KEY = 'meridian-placed';

export function createPlaced(storage: Store | null, keep = 200) {
  const id = (wallet: string, market: string, orderId: bigint) => `${wallet}:${market}:${orderId}`;
  const load = (): [string, number][] => {
    try {
      const parsed: unknown = JSON.parse(storage?.getItem(KEY) ?? '[]');
      return Array.isArray(parsed) ? parsed.filter((e): e is [string, number] => Array.isArray(e) && typeof e[0] === 'string' && typeof e[1] === 'number') : [];
    } catch {
      return [];
    }
  };
  return {
    remember(wallet: string, market: string, orderId: bigint, size: number) {
      try {
        const rest = load().filter(([k]) => k !== id(wallet, market, orderId));
        storage?.setItem(KEY, JSON.stringify([...rest, [id(wallet, market, orderId), size]].slice(-keep)));
      } catch {
        /* the Portfolio then claims no size */
      }
    },
    sizeOf(wallet: string, market: string, orderId: bigint): number | null {
      return load().find(([k]) => k === id(wallet, market, orderId))?.[1] ?? null;
    },
  };
}

export const placed = createPlaced(
  (() => {
    try {
      return typeof localStorage === 'undefined' ? null : localStorage;
    } catch {
      return null;
    }
  })(),
);
