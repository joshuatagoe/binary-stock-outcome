// Every D and P number cited must be a row in DECISIONS.md's decision tables,
// and every finding ID (F1.05, AR.01, WP.03, PS.01, M0.01) must have its own heading somewhere in the docs.

const DECISIONS = 'docs/DECISIONS.md';
const DEFINING_SECTIONS = ['Decision log', 'Process decisions'];
const DECISION_ID = /(?<![\w.\/-])([DP]\d{1,3})(?!\w|\.\d)/g;
const FINDING_ID = /(?<![\w.])((?:F[1-7]|AR|WP|PS|M[0-7])\.\d{2})(?!\d)/g;
const FINDING_HEADING = /^#+ +((?:F[1-7]|AR|WP|PS|M[0-7])\.\d{2})\b/gm;

function section(markdown, name) {
  const start = markdown.indexOf(`\n## ${name}`);
  if (start < 0) return '';
  const end = markdown.indexOf('\n## ', start + 4);
  return markdown.slice(start, end < 0 ? undefined : end);
}

// docs: Map of path to text for the Markdown files to check, including DECISIONS.md.
// allow: { id: reason } for IDs cited on purpose without a definition.
export function checkCitations(docs, allow = {}) {
  const decisions = docs.get(DECISIONS) ?? '';
  const rows = DEFINING_SECTIONS.map((name) => section(decisions, name)).join('\n');
  const defined = new Set([...rows.matchAll(/^\| ([DP]\d+) \|/gm)].map((m) => m[1]));
  for (const text of docs.values()) for (const m of text.matchAll(FINDING_HEADING)) defined.add(m[1]);

  const missing = new Map();
  for (const [path, text] of docs) {
    for (const pattern of [DECISION_ID, FINDING_ID]) {
      for (const m of text.matchAll(pattern)) {
        const id = m[1];
        if (defined.has(id) || id in allow) continue;
        if (!missing.has(id)) missing.set(id, new Set());
        missing.get(id).add(path);
      }
    }
  }
  return [...missing].map(([id, paths]) => `${id} is cited but not defined, in ${[...paths].join(', ')}`);
}
