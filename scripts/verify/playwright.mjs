// Reads a Playwright run's JSON report (PLAYWRIGHT_JSON_OUTPUT_FILE): the test count for the README, and each
// failure by name with its file. status and stderr are the finished process's; report is the file's text.
export function readPlaywrightReport({ status, report, stderr }) {
  let parsed;
  try {
    parsed = JSON.parse(report);
  } catch {
    return { count: NaN, problems: [(stderr || 'playwright wrote no report').slice(-800)] };
  }
  const problems = [];
  const walk = (suite, path) => {
    for (const spec of suite.specs ?? []) if (!spec.ok) problems.push(`failed: ${[...path, spec.title].join(' › ')}`);
    for (const child of suite.suites ?? []) walk(child, [...path, child.title]);
  };
  for (const suite of parsed.suites ?? []) walk(suite, [suite.title]);
  for (const e of parsed.errors ?? []) problems.push(`error: ${String(e.message ?? e).split('\n')[0]}`);
  if (status !== 0 && problems.length === 0) problems.push((stderr || 'playwright failed with no failing test named').slice(-800));
  const { expected = 0, unexpected = 0, flaky = 0, skipped = 0 } = parsed.stats ?? {};
  return { count: expected + unexpected + flaky + skipped, problems };
}
