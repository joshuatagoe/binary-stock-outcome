// Sends one test alert to the operator's Telegram chat and records it in the store (M0, D117).
// Needs TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID; the store is the backend's (DATABASE_PATH, or meridian.db).
// The store opens first, so a failure there sends nothing. Locally:
//   node --env-file=.env apps/backend/src/cli/test-alert.ts
import { recordAlert, sendTelegram } from '../alerts.ts';
import { databasePath, required } from '../config.ts';
import { migrate, openDatabase } from '../db.ts';

const token = required('TELEGRAM_BOT_TOKEN');
const chatId = required('TELEGRAM_CHAT_ID');
const db = openDatabase(databasePath());
migrate(db);

const at = new Date();
const message = `Meridian test alert from ${process.env.MERIDIAN_ROLE ?? 'primary'} at commit ${process.env.GIT_COMMIT ?? 'unknown'}, ${at.toISOString()}`;
await sendTelegram({ token, chatId, text: message });
recordAlert(db, { at, kind: 'test', message });
db.close();
console.log(`Sent and recorded: ${message}`);
