// Save the files of a decision-review run, step 2 of 3 (see the whenToUse in .claude/workflows/decision-review.js).
//
// It replays the finished run from its journal through the workflow's own code (stage "render"), so no model
// copies any text: what is saved is exactly what the workflow produced. It never overwrites a file, never appends
// the same run twice, and re-reads every file after writing.
//
// Usage: node scripts/save-review.mjs <run transcript dir> '<args JSON>' [--write]
//   <run transcript dir>  the "Transcript dir" printed when the workflow was launched
//   <args JSON>           the args the run used, e.g. '{"date":"2026-10-09","label":"full","groups":[1,2,3,4,5,6,7]}'
//   --write               without it, only lists what would be written
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const repo = join(dirname(fileURLToPath(import.meta.url)), '..')
const [transcriptDir, argsJson, flag] = process.argv.slice(2)
if (!transcriptDir || !argsJson) {
  console.error("usage: node scripts/save-review.mjs <run transcript dir> '<args JSON>' [--write]")
  process.exit(2)
}
const write = flag === '--write'
const args = Object.assign(JSON.parse(argsJson), { stage: 'render', replay: true })

// Each agent's result, by label. A resumed run can hold two results for one label; the first one is the run's own.
const labelOf = {}
const results = {}
for (const line of readFileSync(join(transcriptDir, 'journal.jsonl'), 'utf8').split('\n').filter(Boolean)) {
  const d = JSON.parse(line)
  if (d.type === 'started') labelOf[d.agentId] = d.label
  if (d.type === 'result') {
    const label = labelOf[d.agentId]
    if (label in results) console.log('note: a second result for ' + label + ' is ignored (from a resume)')
    else results[label] = d.result
  }
}

const src = readFileSync(join(repo, '.claude/workflows/decision-review.js'), 'utf8').replace('export const meta', 'const meta')
const agent = async (prompt, opts) => {
  if (!(opts.label in results)) throw new Error('the run has no result for ' + opts.label + '; it did not finish, so there is nothing to save')
  return results[opts.label]
}
const pipeline = async (items, ...stages) => Promise.all(items.map(async (it, i) => { let v = it; for (const [k, s] of stages.entries()) v = await s(k === 0 ? it : v, it, i); return v }))
const parallel = async (thunks) => Promise.all(thunks.map((t) => t()))
const run = new Function('agent', 'pipeline', 'parallel', 'log', 'phase', 'args', 'budget', 'return (async () => {' + src + '\n})()')
const out = await run(agent, pipeline, parallel, (m) => console.log('run log: ' + m), () => {}, args, { total: null })
if (!out || !out.files) throw new Error('the replay returned no files: ' + JSON.stringify(out).slice(0, 300))

const plan = []
for (const f of out.files) {
  const full = join(repo, f.path)
  const exists = existsSync(full)
  const firstLine = f.content.split('\n')[0]
  if (f.mode === 'create') {
    if (!exists) plan.push({ f, full, action: 'create', text: f.content + '\n' })
    else if (readFileSync(full, 'utf8').replace(/\r\n/g, '\n').replace(/\s+$/, '') === f.content.replace(/\s+$/, '')) plan.push({ f, full, action: 'already saved' })
    else plan.push({ f, full, action: 'CONFLICT: exists with different text' })
  } else {
    const old = exists ? readFileSync(full, 'utf8').replace(/\r\n/g, '\n') : null
    if (old !== null && old.indexOf(firstLine) >= 0) plan.push({ f, full, action: 'already saved' })
    else if (old !== null) plan.push({ f, full, action: 'append', text: old.replace(/\s+$/, '') + '\n\n' + f.content + '\n' })
    else plan.push({ f, full, action: 'create', text: f.header + '\n' + f.content + '\n' })
  }
}
for (const p of plan) console.log((write && p.text ? 'WRITE ' : '') + p.action.padEnd(14) + ' ' + p.f.path + ' (' + p.f.content.length + ' chars)')
const conflicts = plan.filter((p) => p.action.startsWith('CONFLICT'))
if (conflicts.length) { console.error(conflicts.length + ' conflict(s): nothing written'); process.exit(1) }
if (!write) { console.log(plan.filter((p) => p.text).length + ' to write. Run again with --write to save.'); process.exit(0) }

for (const p of plan.filter((p) => p.text)) { mkdirSync(dirname(p.full), { recursive: true }); writeFileSync(p.full, p.text, 'utf8') }
// Read every file back: a created file is exactly its text; an appended file keeps what it had and ends with the new run.
let bad = 0
for (const p of plan) {
  const now = readFileSync(p.full, 'utf8').replace(/\r\n/g, '\n').replace(/\s+$/, '')
  const ok = p.f.mode === 'create' ? now === p.f.content.replace(/\s+$/, '') : now.endsWith(p.f.content.replace(/\s+$/, '')) || now.indexOf(p.f.content.split('\n')[0]) >= 0
  if (!ok) { bad++; console.error('CHECK FAILED ' + p.f.path) }
}
console.log(bad ? bad + ' file(s) failed the read-back check' : 'all ' + plan.length + ' files read back correctly')
process.exit(bad ? 1 : 0)
