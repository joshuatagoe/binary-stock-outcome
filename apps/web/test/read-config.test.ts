// Reading Config gives up after a time limit, and tells "devnet didn't answer" from "Config isn't there".
import { describe, expect, it } from 'vitest';
import { ConfigMissing, readConfig } from '../src/read-config.ts';

// An RPC whose getAccountInfo either never answers (until aborted) or answers that the account doesn't exist.
function fakeRpc(answer: 'hang' | 'missing') {
  return {
    getAccountInfo: () => ({
      send: ({ abortSignal }: { abortSignal?: AbortSignal } = {}) =>
        answer === 'missing'
          ? Promise.resolve({ context: { slot: 1n }, value: null })
          : new Promise((_, reject) => abortSignal?.addEventListener('abort', () => reject(abortSignal.reason))),
    }),
  } as never;
}

describe('reading Config', () => {
  it('gives up on a devnet that never answers', async () => {
    const started = Date.now();
    await expect(readConfig(fakeRpc('hang'), new AbortController().signal, 50)).rejects.toThrow();
    expect(Date.now() - started).toBeLessThan(2000);
  });

  it('says Config is missing when devnet answers without it, as after a reset (D19)', async () => {
    await expect(readConfig(fakeRpc('missing'), new AbortController().signal, 1000)).rejects.toBeInstanceOf(ConfigMissing);
  });
});
