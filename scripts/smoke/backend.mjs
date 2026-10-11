// The backend's smoke test (D132, M0): after a deploy, /api/health must answer 200 for the commit just deployed,
// as the primary, with its database answering and its migrations current. CI runs it after `flyctl deploy`:
//   node scripts/smoke/backend.mjs https://meridian-devnet-backend.fly.dev <commit>
// It retries for up to 2 minutes, since a new machine takes a few seconds to start.
import { pathToFileURL } from 'node:url';

export function judgeHealth(status, body, commit) {
  const problems = [];
  if (status !== 200) problems.push(`/api/health answered ${status}`);
  if (body?.commit !== commit) problems.push(`the live commit is ${body?.commit}; the deployed one is ${commit}`);
  if (body?.role !== 'primary') problems.push(`the backend says it is the ${body?.role}, not the primary`);
  if (!body?.database?.answers) problems.push('the database does not answer');
  else if (!body.database.migrations?.current) problems.push('the migrations are not current');
  return problems;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [base, commit] = process.argv.slice(2);
  if (!base || !/^[0-9a-f]{40}$/.test(commit ?? '')) {
    console.error('usage: node scripts/smoke/backend.mjs <base URL> <40-character commit>');
    process.exit(2);
  }
  let problems = ['not tried'];
  for (let attempt = 1; attempt <= 24 && problems.length; attempt++) {
    if (attempt > 1) await new Promise((r) => setTimeout(r, 5000));
    try {
      const res = await fetch(new URL('/api/health', base), { signal: AbortSignal.timeout(10_000) });
      problems = judgeHealth(res.status, await res.json().catch(() => null), commit);
    } catch (error) {
      problems = [`no answer: ${error.message}`];
    }
    console.log(`attempt ${attempt}: ${problems.length ? problems.join('; ') : 'ok'}`);
  }
  process.exit(problems.length ? 1 : 0);
}
