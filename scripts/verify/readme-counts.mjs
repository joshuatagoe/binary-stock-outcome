// Every test count the README states matches a fresh count (the OpenEMR report's lesson, D129).
// A count is written as <!-- count:SUITE -->N<!-- /count -->, where SUITE is a suite verify runs.
// Any other "N tests" in the README fails, so a hand-typed number can't go stale unnoticed,
// and so does a suite with no count, so a new suite can't go unmentioned.

const MARKED = /<!-- count:([\w-]+) -->(\d+)<!-- \/count -->/g;
const UNMARKED = /\b\d+ tests?\b/g;

// readme: the README's text, or null if there is none. counts: { suite: number } from this run.
export function checkReadmeCounts(readme, counts) {
  if (readme == null) return [];
  const problems = [];
  for (const [, suite, stated] of readme.matchAll(MARKED)) {
    if (!(suite in counts)) problems.push(`README counts suite "${suite}", which verify doesn't run`);
    else if (Number(stated) !== counts[suite]) {
      problems.push(`README says ${suite} has ${stated} tests; this run counted ${counts[suite]}`);
    }
  }
  const stated = new Set([...readme.matchAll(MARKED)].map(([, suite]) => suite));
  for (const suite of Object.keys(counts)) {
    if (!stated.has(suite)) problems.push(`README states no count for suite "${suite}", which verify runs`);
  }
  for (const [text] of readme.replace(MARKED, '').matchAll(UNMARKED)) {
    problems.push(`README states "${text}" without a count marker`);
  }
  return problems;
}
