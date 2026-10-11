// Sends one check-in to a Healthchecks.io check (M0, D118). Needs HEALTHCHECKS_PING_URL, the ping URL of a
// check made for this test. Locally:
//   node --env-file=.env apps/backend/src/cli/test-check-in.ts
import { checkIn } from '../checkins.ts';
import { required } from '../config.ts';

const message = `Meridian test check-in at commit ${process.env.GIT_COMMIT ?? 'unknown'}, ${new Date().toISOString()}`;
await checkIn({ url: required('HEALTHCHECKS_PING_URL'), message });
console.log(`Checked in: ${message}`);
