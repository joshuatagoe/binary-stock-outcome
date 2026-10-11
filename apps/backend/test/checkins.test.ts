// Healthchecks.io is the outside watchdog (D118): a job pings its check's URL, or the URL plus /fail.
import { describe, expect, it } from 'vitest';
import { checkIn } from '../src/checkins.ts';

// Not a real Healthchecks address: the secrets check refuses anything shaped like one (P21).
const PING = 'https://healthchecks.example/ping/test-check';

function fakeFetch(status: number) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetch = async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    return new Response('OK', { status });
  };
  return { fetch, calls };
}

describe('Healthchecks check-ins', () => {
  it('posts the message to the check URL', async () => {
    const { fetch, calls } = fakeFetch(200);
    await checkIn({ url: PING, message: 'M0 test check-in', fetch });
    expect(calls).toEqual([{ url: PING, init: { method: 'POST', body: 'M0 test check-in' } }]);
  });

  it('reports a failure to the URL plus /fail', async () => {
    const { fetch, calls } = fakeFetch(200);
    await checkIn({ url: PING, message: 'step failed', failed: true, fetch });
    expect(calls[0].url).toBe(`${PING}/fail`);
  });

  it('keeps the ping URL out of the error when the request itself fails', async () => {
    // A URL pasted without its scheme makes Node's fetch throw with the URL in the message.
    const fetch = async (url: string) => {
      throw new TypeError(`Failed to parse URL from ${url}`);
    };
    const error = await checkIn({ url: 'hc-ping.example/secret-check', message: 'x', fetch }).catch((e: Error) => e);
    expect((error as Error).message).toMatch(/Healthchecks could not be reached/);
    expect((error as Error).message).not.toContain('secret-check');
  });

  it('throws when Healthchecks does not accept the ping', async () => {
    const { fetch } = fakeFetch(404);
    await expect(checkIn({ url: PING, message: 'x', fetch })).rejects.toThrow(/404/);
  });
});
