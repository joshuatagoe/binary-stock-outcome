export const meta = {
  name: 'decision-review',
  description: 'Meridian stage 1 decision review: blind research per story group, source checks, one writer, Opus judge',
  whenToUse: 'Stage 1 decision review (and the stage 3 rerun). Pass args {date: "YYYY-MM-DD", label: "pilot" or "full", groups: [1..7]}.',
  phases: [
    { title: 'Research', detail: 'one blind researcher per group, questions only', model: 'sonnet' },
    { title: 'Verify', detail: 'reopen the source behind every CONFIRMED claim', model: 'sonnet' },
    { title: 'Save', detail: 'one writer saves the verified findings', model: 'haiku' },
    { title: 'Judge', detail: 'verdicts for decisions, briefings for open questions', model: 'opus' },
  ],
}

// Generated from docs/stories/README.md and docs/research/inputs/ on 2026-10-09.
const STORIES = {
  "S1": {
    "folder": "S01-learn-what-a-contract-pays",
    "title": "Learns what a contract pays, with live prices, before connecting a wallet"
  },
  "S2": {
    "folder": "S02-connect-wallet-see-usdc",
    "title": "Connects a wallet and sees the USDC balance"
  },
  "S3": {
    "folder": "S03-browse-contracts-and-prices",
    "title": "Browses today's contracts by stock, with Yes and No prices and the implied probability"
  },
  "S4": {
    "folder": "S04-buy-yes",
    "title": "Buys Yes with a market or limit order, signing once"
  },
  "S5": {
    "folder": "S05-buy-no",
    "title": "Buys No with one approval; the app mints a pair and sells the Yes"
  },
  "S6": {
    "folder": "S06-sell-yes",
    "title": "Sells Yes and sees the realized P&L"
  },
  "S7": {
    "folder": "S07-sell-no",
    "title": "Sells No; the app buys a Yes and closes the pair"
  },
  "S8": {
    "folder": "S08-position-constraint",
    "title": "Is stopped from holding Yes and No on one strike, and shown how to exit first"
  },
  "S9": {
    "folder": "S09-live-order-book-and-countdown",
    "title": "Watches the order book live from both sides, with a countdown to 4:00 PM ET"
  },
  "S10": {
    "folder": "S10-market-maker-mint-and-quote",
    "title": "Deposits $1 per pair and quotes Yes on the book"
  },
  "S11": {
    "folder": "S11-market-maker-dashboard",
    "title": "Sees exposure, fills and P&L across markets"
  },
  "S12": {
    "folder": "S12-morning-market-creation",
    "title": "Reads the previous close at 8:00, computes strikes and creates every market by 8:30"
  },
  "S13": {
    "folder": "S13-daily-open-and-close",
    "title": "Opens minting at 9:00 and trading at 9:30, and stops trading at 4:00"
  },
  "S14": {
    "folder": "S14-admin-adds-strike",
    "title": "Adds a strike during the trading day"
  },
  "S15": {
    "folder": "S15-automatic-settlement",
    "title": "Settles every contract at about 4:05 after staleness and confidence checks, retrying for up to 15 minutes"
  },
  "S16": {
    "folder": "S16-admin-override-settle",
    "title": "Settles by hand with a manual price, only after the enforced delay"
  },
  "S17": {
    "folder": "S17-see-outcome-and-redeem",
    "title": "Sees the settlement price and outcome, then redeems winnings in one transaction, at any time"
  },
  "S18": {
    "folder": "S18-portfolio-and-history",
    "title": "Tracks positions, entry price, P&L and every past trade"
  },
  "S19": {
    "folder": "S19-one-dollar-invariant",
    "title": "Can rely on every pair being backed by exactly $1, and on outcomes never changing"
  },
  "S20": {
    "folder": "S20-initialize-config",
    "title": "Sets up the tickers, oracle feeds and admin authority once"
  },
  "S21": {
    "folder": "S21-pause-and-unpause",
    "title": "Pauses minting and trading in an emergency"
  },
  "S22": {
    "folder": "S22-mainnet-operations-bonus",
    "title": "Runs it on mainnet with monitoring and alerts (bonus only)"
  },
  "S23": {
    "folder": "S23-grader-runs-lifecycle",
    "title": "Runs one command and watches create, mint, trade, settle and redeem on devnet"
  },
  "S24": {
    "folder": "S24-grader-reads-rationale",
    "title": "Reads why each chain and architecture choice was made, and the known limits"
  },
  "S25": {
    "folder": "S25-get-test-money",
    "title": "Gets devnet SOL and test USDC, clearly labelled as play money with no value"
  },
  "S26": {
    "folder": "S26-open-order-refunded-at-close",
    "title": "Has an order still open at 4:00 cancelled and refunded, and is told so"
  },
  "S27": {
    "folder": "S27-buy-no-limit-pending",
    "title": "Sees a Buy No limit order as pending, not a position; cancelling it returns $1 per pair"
  },
  "S28": {
    "folder": "S28-under-review-when-band-straddles",
    "title": "Sees \"Under review\" instead of an outcome when the price band straddles the strike"
  },
  "S29": {
    "folder": "S29-devnet-outage",
    "title": "Sees trading and settlement pause during a devnet outage, then catch up when it returns"
  }
}
const GROUPS = {
  "1": {
    "name": "Onboarding",
    "input": "docs/research/inputs/G1-onboarding.md",
    "stories": [
      "S1",
      "S2",
      "S3",
      "S25"
    ],
    "items": [
      "D10",
      "Q7",
      "Q19",
      "Q22",
      "Q40",
      "Q52",
      "Q54"
    ],
    "legal": false
  },
  "2": {
    "name": "Trading and liquidity",
    "input": "docs/research/inputs/G2-trading-and-liquidity.md",
    "stories": [
      "S4",
      "S5",
      "S6",
      "S7",
      "S8",
      "S9",
      "S10",
      "S11",
      "S26",
      "S27"
    ],
    "items": [
      "D5",
      "D9",
      "D13",
      "D14",
      "D15",
      "D16",
      "D20",
      "D21",
      "D25",
      "A1",
      "Q4",
      "Q5",
      "Q6",
      "Q11",
      "Q17",
      "Q18",
      "Q21",
      "Q28",
      "Q29",
      "Q31",
      "Q38",
      "Q41"
    ],
    "legal": false
  },
  "3": {
    "name": "Daily cycle",
    "input": "docs/research/inputs/G3-daily-cycle.md",
    "stories": [
      "S12",
      "S13",
      "S14"
    ],
    "items": [
      "D6",
      "D7",
      "D12",
      "D29",
      "Q8",
      "Q9",
      "Q10",
      "Q14",
      "Q32",
      "Q33",
      "Q34",
      "Q35",
      "Q42"
    ],
    "legal": false
  },
  "4": {
    "name": "Settlement and payout",
    "input": "docs/research/inputs/G4-settlement-and-payout.md",
    "stories": [
      "S15",
      "S16",
      "S17",
      "S18",
      "S19",
      "S28"
    ],
    "items": [
      "D1",
      "D2",
      "D8",
      "D26",
      "D28",
      "A4",
      "Q2",
      "Q3",
      "Q13",
      "Q16",
      "Q20",
      "Q27",
      "Q30",
      "Q36",
      "Q37",
      "Q39",
      "Q43",
      "Q45",
      "Q48"
    ],
    "legal": false
  },
  "5": {
    "name": "Platform",
    "input": "docs/research/inputs/G5-platform.md",
    "stories": [
      "S20",
      "S21",
      "S22",
      "S29"
    ],
    "items": [
      "D17",
      "D19",
      "D22",
      "D23",
      "D24",
      "D27",
      "Q12",
      "Q25",
      "Q26",
      "Q44",
      "Q53"
    ],
    "legal": false
  },
  "6": {
    "name": "Proof for the grader",
    "input": "docs/research/inputs/G6-proof-for-the-grader.md",
    "stories": [
      "S23",
      "S24"
    ],
    "items": [
      "D4",
      "D11",
      "D18",
      "D30",
      "A2",
      "Q23",
      "Q24",
      "Q55"
    ],
    "legal": false
  },
  "7": {
    "name": "Legal and compliance lens",
    "input": "docs/research/inputs/G7-legal-and-compliance.md",
    "stories": [
      "S1",
      "S2",
      "S3",
      "S4",
      "S5",
      "S6",
      "S7",
      "S8",
      "S9",
      "S10",
      "S11",
      "S12",
      "S13",
      "S14",
      "S15",
      "S16",
      "S17",
      "S18",
      "S19",
      "S20",
      "S21",
      "S22",
      "S23",
      "S24",
      "S25",
      "S26",
      "S27",
      "S28",
      "S29"
    ],
    "items": [
      "D3",
      "Q46",
      "Q47",
      "Q49",
      "Q50",
      "Q51"
    ],
    "legal": true
  }
}

const SPEC = 'docs/spec/meridian_project.txt'
const PLAN_COPY = 'docs/planning/2026-10-08-phase-1-plan-session-2.md'
const RUNNING_EXAMPLE = '"META >= $680 today?", Yes at $0.65, No at $0.35; Alice buys Yes, Bob buys No'

// ---- arguments: the script has no clock or filesystem, so the date comes in through args
const A = args || {}
if (!/^\d{4}-\d{2}-\d{2}$/.test(A.date || '')) throw new Error('args.date must be YYYY-MM-DD')
if (!/^[a-z0-9-]+$/.test(A.label || '')) throw new Error('args.label must be lowercase letters, digits or dashes')
const RUN = A.groups && A.groups.length ? A.groups : [1, 2, 3, 4, 5, 6, 7]
for (const g of RUN) if (!GROUPS[g]) throw new Error('unknown group ' + g)
const TAG = A.date + '-' + A.label
log('Run ' + TAG + ': groups ' + RUN.join(', '))

const RESEARCH_SCHEMA = {
  type: 'object',
  required: ['items', 'findings', 'gaps'],
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        required: ['item', 'kind', 'summary', 'counter_case', 'finding_ids'],
        properties: {
          item: { type: 'string' },
          kind: { type: 'string', enum: ['decision', 'open question'] },
          summary: { type: 'string', description: 'decision: your leading answer; open question: the options with their evidence, no pick' },
          counter_case: { type: 'string', description: 'decision: the strongest case against your leading answer; open question: what evidence would change the picture' },
          finding_ids: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'items', 'stories', 'lens', 'claim', 'label', 'sources'],
        properties: {
          id: { type: 'string', description: 'F<group>.<two digits>, e.g. F6.01' },
          items: { type: 'array', items: { type: 'string' } },
          stories: { type: 'array', items: { type: 'string' }, description: 'story IDs like S23; empty if the finding serves no single story' },
          lens: { type: 'string', enum: ['venues', 'technical', 'user', 'legal'] },
          claim: { type: 'string' },
          label: { type: 'string', enum: ['CONFIRMED', 'SECONDARY', 'UNCONFIRMED'] },
          sources: {
            type: 'array',
            items: {
              type: 'object',
              required: ['url', 'title', 'quote'],
              properties: { url: { type: 'string' }, title: { type: 'string' }, quote: { type: 'string', description: 'the short passage from the source that supports the claim' } },
            },
          },
        },
      },
    },
    gaps: { type: 'array', items: { type: 'string' }, description: 'what you looked for and could not find' },
  },
}

const VERIFY_SCHEMA = {
  type: 'object',
  required: ['checks'],
  properties: {
    checks: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'label_after', 'note'],
        properties: {
          id: { type: 'string' },
          label_after: { type: 'string', enum: ['CONFIRMED', 'SECONDARY', 'UNCONFIRMED'] },
          note: { type: 'string', description: 'what you opened and what it said' },
        },
      },
    },
  },
}

const WRITE_SCHEMA = {
  type: 'object',
  required: ['written', 'skipped'],
  properties: {
    written: { type: 'array', items: { type: 'string' } },
    skipped: { type: 'array', items: { type: 'string' }, description: 'create-only files that already existed' },
  },
}

const JUDGE_SCHEMA = {
  type: 'object',
  required: ['path', 'verdicts', 'briefings', 'conflicts'],
  properties: {
    path: { type: 'string' },
    verdicts: {
      type: 'array',
      items: {
        type: 'object',
        required: ['item', 'verdict'],
        properties: { item: { type: 'string' }, verdict: { type: 'string', enum: ['Holds', 'Holds with a caveat', 'Contested', 'Your call'] } },
      },
    },
    briefings: { type: 'array', items: { type: 'string' } },
    conflicts: { type: 'array', items: { type: 'string' } },
  },
}

const storyPaths = (ids) => ids.map((s) => 'docs/stories/' + STORIES[s].folder + '/story.md')

function researchPrompt(g) {
  const G = GROUPS[g]
  return [
    'You are the group ' + g + ' researcher (' + G.name + ') in the Meridian stage 1 decision review.',
    '',
    'Read first: your questions in ' + G.input + '; your story files: ' + storyPaths(G.stories).join(', ') + '; and the spec at ' + SPEC + ' (open it by that exact path).',
    'Do not open docs/DECISIONS.md, docs/planning/ or any plan file: they hold proposed answers and this review is blind. Write no files.',
    '',
    'For every item in the input file (' + G.items.join(', ') + '), return one entry in `items`:',
    '- decision: `summary` = your leading answer; `counter_case` = the strongest case against it.',
    '- open question: `summary` = the options with their evidence, without picking one; `counter_case` = what evidence would change the picture.',
    '',
    'Back every point with `findings`. Number them F' + g + '.01, F' + g + '.02, ... Tag each with the items it serves and the story IDs it serves (' + G.stories.join(', ') + '); use an empty story list when it serves no single story.',
    'Label every finding: CONFIRMED only if you opened the primary source and it says this; SECONDARY for third-party write-ups or search snippets; UNCONFIRMED otherwise, or when sources contradict each other. Give each source its URL, title and the short passage that supports the claim.',
    G.legal
      ? 'Use the legal lens only: law, regulation, licensing and market practice, with sources. This is not legal advice; never claim the product is compliant, legal or regulated.'
      : 'Use three lenses and set `lens` on each finding: venues (how real venues do it), technical (the technical facts), user (what the user needs).',
    'Prefer primary sources and current ones (today is ' + A.date + '). Put what you could not find in `gaps`.',
  ].join('\n')
}

function verifyPrompt(g, report) {
  const confirmed = report.findings.filter((f) => f.label === 'CONFIRMED')
  return [
    'You are the source checker for group ' + g + ' (' + GROUPS[g].name + ') in the Meridian stage 1 decision review. Write no files.',
    '',
    'For each finding below, open its source URLs yourself (WebFetch) and check that the page actually says what the claim and quote say.',
    '- It does, on a primary source: label_after = CONFIRMED.',
    '- It does, but the source is a third-party write-up: label_after = SECONDARY.',
    '- The page does not say it, cannot be opened, or contradicts it: label_after = UNCONFIRMED.',
    'Say in `note` what you opened and what it said. Return one check per finding, ' + confirmed.length + ' in total.',
    '',
    JSON.stringify(confirmed.map((f) => ({ id: f.id, claim: f.claim, sources: f.sources })), null, 1),
  ].join('\n')
}

function merge(g, report, verify) {
  const checks = {}
  for (const c of (verify && verify.checks) || []) checks[c.id] = c
  const findings = report.findings.map((f) => {
    const c = checks[f.id]
    if (f.label !== 'CONFIRMED') return Object.assign({}, f, { verification: 'not rechecked (' + f.label + ')' })
    if (!c) return Object.assign({}, f, { label: 'UNCONFIRMED', verification: 'downgraded from CONFIRMED: the checker returned no result' })
    if (c.label_after === 'CONFIRMED') return Object.assign({}, f, { verification: 'held: ' + c.note })
    return Object.assign({}, f, { label: c.label_after, verification: 'downgraded from CONFIRMED: ' + c.note })
  })
  const covered = report.items.map((i) => i.item)
  const missing = GROUPS[g].items.filter((i) => covered.indexOf(i) < 0)
  const badStories = findings.filter((f) => f.stories.some((s) => !STORIES[s])).map((f) => f.id)
  if (missing.length) log('Group ' + g + ': no answer for ' + missing.join(', '))
  if (badStories.length) log('Group ' + g + ': unknown story IDs in ' + badStories.join(', '))
  return { group: g, items: report.items, gaps: report.gaps, findings: findings, missing: missing }
}

function findingBlock(f) {
  const tags = f.items.concat(f.stories).map((t) => '[' + t + ']').join(' ')
  const lines = ['### ' + f.id + ' ' + tags + ' ' + f.label, '', f.claim, '', '- Lens: ' + f.lens]
  for (const s of f.sources) lines.push('- Source: [' + s.title + '](' + s.url + '): "' + s.quote + '"')
  lines.push('- Verification (' + A.date + '): ' + f.verification)
  return lines.join('\n')
}

function runHeading(g) {
  return '## ' + A.date + ' decision review (' + A.label + '), group ' + g + ': ' + GROUPS[g].name
}

function groupReport(r) {
  const G = GROUPS[r.group]
  const out = ['# Decision review ' + TAG + ', group ' + r.group + ': ' + G.name, '',
    'Verified research for ' + G.items.join(', ') + '. Stories: ' + G.stories.join(', ') + '. Input: `' + G.input + '`.', '']
  if (r.missing.length) out.push('**Not answered by the researcher:** ' + r.missing.join(', '), '')
  out.push('## Items', '')
  for (const i of r.items) {
    out.push('### ' + i.item + ' (' + i.kind + ')', '', i.summary, '')
    if (i.counter_case) out.push('**Against:** ' + i.counter_case, '')
    out.push('Findings: ' + (i.finding_ids.join(', ') || 'none'), '')
  }
  out.push('## Gaps', '')
  for (const gap of r.gaps) out.push('- ' + gap)
  out.push('', '## Findings', '')
  for (const f of r.findings) out.push(findingBlock(f), '')
  return out.join('\n')
}

function storyHeader(s) {
  return '# Research: ' + s + ' ' + STORIES[s].title + '\n\nAppend-only. A finding later shown wrong gets a dated correction line below it, never an edit.\n'
}

// ---- Research and verify, each group on its own (no barrier between the two stages)
const results = await pipeline(
  RUN,
  (g) => agent(researchPrompt(g), { label: 'research:G' + g, phase: 'Research', agentType: 'researcher', schema: RESEARCH_SCHEMA }),
  async (report, g) => {
    if (!report) { log('Group ' + g + ': the researcher returned nothing'); return null }
    const n = report.findings.filter((f) => f.label === 'CONFIRMED').length
    const verify = n ? await agent(verifyPrompt(g, report), { label: 'verify:G' + g, phase: 'Verify', model: 'sonnet', schema: VERIFY_SCHEMA }) : { checks: [] }
    return merge(g, report, verify)
  },
)
const done = results.filter(Boolean)
if (!done.length) return { run: TAG, error: 'no group produced a report' }

// ---- One writer saves everything, so no two agents ever write the same file (barrier: needs every group's findings)
const files = []
for (const r of done) files.push({ path: 'docs/research/reports/' + TAG + '-G' + r.group + '.md', mode: 'create', header: '', content: groupReport(r) })
const perStory = {}
const cross = []
for (const r of done) {
  for (const f of r.findings) {
    if (!f.stories.length) cross.push({ g: r.group, f: f })
    for (const s of f.stories) if (STORIES[s]) (perStory[s] = perStory[s] || []).push({ g: r.group, f: f })
  }
}
for (const s of Object.keys(perStory)) {
  const byGroup = {}
  for (const x of perStory[s]) (byGroup[x.g] = byGroup[x.g] || []).push(findingBlock(x.f))
  const body = Object.keys(byGroup).map((g) => runHeading(g) + '\n\n' + byGroup[g].join('\n\n')).join('\n\n')
  files.push({ path: 'docs/stories/' + STORIES[s].folder + '/research.md', mode: 'append', header: storyHeader(s), content: body })
}
if (cross.length) {
  const byGroup = {}
  for (const x of cross) (byGroup[x.g] = byGroup[x.g] || []).push(findingBlock(x.f))
  files.push({
    path: 'docs/research/cross-cutting.md', mode: 'append',
    header: '# Cross-cutting research\n\nFindings that serve no single story. Append-only. A finding later shown wrong gets a dated correction line below it, never an edit.\n',
    content: Object.keys(byGroup).map((g) => runHeading(g) + '\n\n' + byGroup[g].join('\n\n')).join('\n\n'),
  })
}

phase('Save')
const saved = await agent([
  'Save these ' + files.length + ' files in the repo. Copy each `content` byte for byte: do not reformat, shorten, fix or summarize anything.',
  '- mode "create": create the file. If it already exists, do not touch it; list it in `skipped`.',
  '- mode "append": if the file exists, add one blank line and then `content` at its end, keeping everything already there. If it does not exist, create it with `header`, one blank line, then `content`.',
  'Create folders as needed. Return the paths you wrote.',
  '',
  JSON.stringify(files),
].join('\n'), { label: 'save', phase: 'Save', model: 'haiku', effort: 'low', schema: WRITE_SCHEMA })

const expected = files.map((f) => f.path)
const notWritten = expected.filter((p) => !saved || saved.written.indexOf(p) < 0)
if (notWritten.length) log('Not saved: ' + notWritten.join(', '))

// ---- The judge: the only agent that reads the plan's proposed decisions
phase('Judge')
const reportPaths = done.map((r) => 'docs/research/reports/' + TAG + '-G' + r.group + '.md')
const judgeItems = done.reduce((acc, r) => acc.concat(GROUPS[r.group].items), [])
const judge = await agent([
  'You are the judge of the Meridian stage 1 decision review, run ' + TAG + '. The reader is the project owner, who is new to finance and blockchain: use plain words and define each term the first time it appears.',
  '',
  'Read: the verified group reports ' + reportPaths.join(', ') + '; the input files ' + done.map((r) => GROUPS[r.group].input).join(', ') + '; and the dated plan copy ' + PLAN_COPY + ', which holds the proposed decisions (D, A) and the open questions (Q) with the owner\'s directions so far. You are the only agent in this review that reads the plan.',
  'Only CONFIRMED and SECONDARY findings carry weight. Say so whenever a verdict rests on an UNCONFIRMED finding. Cite finding IDs.',
  '',
  'Cover exactly these items: ' + judgeItems.join(', ') + '.',
  '- Each decision or assumption (D, A): compare the plan\'s proposal with the evidence and give a verdict: Holds, Holds with a caveat, Contested, or Your call, with two to four sentences on why.',
  '- Each open question (Q): a briefing with (1) the term explained, (2) one worked example in dollars using the running example (' + RUNNING_EXAMPLE + '), (3) the options with their evidence, (4) what each answer commits the owner to. You may add a clearly labelled recommendation; never answer for the owner.',
  '- Conflicts: any place where findings for different items or groups pull against each other.',
  '',
  'Write the result to docs/research/decision-review-' + TAG + '.md: a one-paragraph summary, a verdict table (columns: item, source, verdict, why; source is copied from the plan: spec, owner, Claude proposal, or a mix), the briefings, the conflicts, and the weakest spots in the evidence. If that file already exists, do not overwrite it; return its path with empty lists. Write no other file.',
].join('\n'), { label: 'judge', phase: 'Judge', model: 'opus', schema: JUDGE_SCHEMA })

const count = (r, key, val) => r.findings.filter((f) => f[key] === val).length
return {
  run: TAG,
  groups: done.map((r) => ({
    group: r.group,
    items_answered: r.items.length,
    items_missing: r.missing,
    findings: r.findings.length,
    labels: { CONFIRMED: count(r, 'label', 'CONFIRMED'), SECONDARY: count(r, 'label', 'SECONDARY'), UNCONFIRMED: count(r, 'label', 'UNCONFIRMED') },
    held: r.findings.filter((f) => f.verification.indexOf('held') === 0).length,
    downgraded: r.findings.filter((f) => f.verification.indexOf('downgraded') === 0).length,
  })),
  files_expected: expected,
  files_not_saved: notWritten,
  skipped: saved ? saved.skipped : [],
  judge: judge,
}
