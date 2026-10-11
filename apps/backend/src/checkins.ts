// Healthchecks.io is the outside watchdog (D118): a job posts to its check's ping URL when it finishes, or to
// the URL plus /fail. The URL lets anyone ping the check, so it lives in .env and no error message includes it.
import { unreachable, type Fetch } from './alerts.ts';

type CheckIn = { url: string; message: string; failed?: boolean; fetch?: Fetch };

export async function checkIn({ url, message, failed = false, fetch: send = fetch }: CheckIn) {
  let res: Response;
  try {
    res = await send(failed ? `${url}/fail` : url, { method: 'POST', body: message });
  } catch (error) {
    throw unreachable('Healthchecks', error);
  }
  if (!res.ok) throw new Error(`Healthchecks refused the check-in: HTTP ${res.status}`);
}
