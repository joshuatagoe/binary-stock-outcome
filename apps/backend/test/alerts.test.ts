// Alerts go to a private Telegram chat through our own bot (D117) and are kept in the alerts table (§5).
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { recordAlert, sendTelegram } from '../src/alerts.ts';
import { migrate, openDatabase } from '../src/db.ts';

const TOKEN = '123456:test-token-not-real';

function fakeFetch(status: number, body: unknown) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetch = async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
  };
  return { fetch, calls };
}

describe('Telegram alerts', () => {
  it("posts the text to the chat through the Bot API's sendMessage", async () => {
    const { fetch, calls } = fakeFetch(200, { ok: true, result: { message_id: 7 } });
    await sendTelegram({ token: TOKEN, chatId: '-1001', text: 'Meridian test alert', fetch });
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(`https://api.telegram.org/bot${TOKEN}/sendMessage`);
    expect(calls[0].init.method).toBe('POST');
    expect(JSON.parse(String(calls[0].init.body))).toEqual({ chat_id: '-1001', text: 'Meridian test alert' });
  });

  it("fails with Telegram's reason, never with the token", async () => {
    const { fetch } = fakeFetch(400, { ok: false, description: 'Bad Request: chat not found' });
    const error = await sendTelegram({ token: TOKEN, chatId: '-1001', text: 'x', fetch }).catch((e: Error) => e);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toMatch(/chat not found/);
    expect((error as Error).message).not.toContain(TOKEN);
  });

  it('keeps the token out of the error when the request itself fails', async () => {
    // Node's fetch puts the whole address, token included, into a parse error's message.
    const fetch = async (url: string) => {
      throw new TypeError(`Failed to parse URL from ${url}`);
    };
    const error = await sendTelegram({ token: TOKEN, chatId: '-1001', text: 'x', fetch }).catch((e: Error) => e);
    expect((error as Error).message).toMatch(/Telegram could not be reached/);
    expect((error as Error).message).not.toContain(TOKEN);
  });

  it('keeps each alert in the alerts table', () => {
    const db = openDatabase(join(mkdtempSync(join(tmpdir(), 'meridian-alerts-')), 'meridian.db'));
    migrate(db);
    recordAlert(db, { at: new Date('2026-10-12T13:00:00Z'), kind: 'test', message: 'Meridian test alert' });
    expect(db.prepare('SELECT at, kind, message FROM alerts').all()).toEqual([
      { at: '2026-10-12T13:00:00.000Z', kind: 'test', message: 'Meridian test alert' },
    ]);
  });
});
