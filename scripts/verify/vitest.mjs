// Reads a `vitest run --reporter=json` run: the test count for the README, and each failure by name.
// status, stdout and stderr are the finished process's.
export function readVitestReport({ status, stdout, stderr }) {
  let report;
  try {
    report = JSON.parse(stdout);
  } catch {
    return { count: NaN, problems: [(stderr || stdout).slice(-800)] };
  }
  const problems = [];
  for (const file of report.testResults) {
    if (file.status === 'failed' && file.assertionResults.length === 0) {
      problems.push(`failed to load: ${file.name}: ${file.message.split('\n')[0]}`);
    }
    for (const a of file.assertionResults) if (a.status === 'failed') problems.push(`failed: ${a.fullName}`);
  }
  if (status !== 0 && problems.length === 0) problems.push((stderr || 'vitest failed with no failing test named').slice(-800));
  return { count: report.numTotalTests, problems };
}
