// Alerts go to the operator's private Telegram chat through our own bot (D117), and each is kept in the
// alerts table (ARCHITECTURE.md §5). The bot token is part of the URL, so no error message includes the URL.
import type { Db } from './db.ts';

export type Fetch = (url: string, init?: RequestInit) => Promise<Response>;

// A failed request, described without its message: Node's fetch can put the whole URL, secret included, there.
export function unreachable(service: string, error: unknown) {
  const code = (error as { cause?: { code?: string } }).cause?.code ?? (error as Error).name;
  return new Error(`${service} could not be reached (${code})`);
}

type Telegram = { token: string; chatId: string; text: string; fetch?: Fetch };

export async function sendTelegram({ token, chatId, text, fetch: send = fetch }: Telegram) {
  let res: Response;
  try {
    res = await send(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
  } catch (error) {
    throw unreachable('Telegram', error);
  }
  const body = (await res.json().catch(() => ({}))) as { ok?: boolean; description?: string };
  if (!res.ok || !body.ok) throw new Error(`Telegram refused the alert: ${body.description ?? `HTTP ${res.status}`}`);
}

export function recordAlert(db: Db, { at, kind, message }: { at: Date; kind: string; message: string }) {
  db.prepare('INSERT INTO alerts (at, kind, message) VALUES (?, ?, ?)').run(at.toISOString(), kind, message);
}
