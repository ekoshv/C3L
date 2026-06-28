import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { TEST_RULES } from './prompts.mjs';

const isTestFile = (f) => /(^|\/)tests?\//i.test(f) || /\.test\.[mc]?js$/i.test(f);

// Symbolic handle (RLM-style): a sibling file is shown only as its exported
// symbol names, never its full content, so the sub-call context stays small.
export function exportsOf(root, file) {
  const p = join(root, file);
  if (!existsSync(p)) return [];
  const src = readFileSync(p, 'utf8');
  const names = new Set();
  for (const m of src.matchAll(/export\s+(?:async\s+)?function\s+([A-Za-z0-9_]+)/g)) names.add(m[1]);
  for (const m of src.matchAll(/export\s+(?:const|let|class)\s+([A-Za-z0-9_]+)/g)) names.add(m[1]);
  for (const m of src.matchAll(/export\s*\{([^}]+)\}/g)) {
    for (const part of m[1].split(',')) {
      const name = part.trim().split(/\s+as\s+/)[0].trim();
      if (name) names.add(name);
    }
  }
  return [...names];
}

function handleLines(root, files) {
  if (!files.length) return '(none yet)';
  return files
    .map((f) => `- ${f} exports: ${exportsOf(root, f).join(', ') || '(none)'}`)
    .join('\n');
}

// One recursive sub-call per file. Source files get the spec + sibling handles;
// the test file is written LAST against the real exported interface.
export function subImplementPrompt(cfg, milestone, file, apiFiles, opts = {}) {
  const test = isTestFile(file);
  const api = handleLines(cfg.root, apiFiles);
  const retry = opts.escalate
    ? `RETRY: a previous attempt ended WITHOUT creating ${file} on disk. Your
FIRST action MUST be to write ${file} to disk with your file-creation tool.

`
    : '';
  const role = test
    ? `${retry}You are a recursive sub-call. Write ONLY the test file ${file}.`
    : `${retry}You are a recursive sub-call. Implement ONLY the source file ${file}.`;
  const focus = test
    ? `Test the modules below against their listed exports. Import the exact
exported names. Run ONLY: node --test ${file} and make it pass.
${TEST_RULES}`
    : `Implement only this file's responsibility from the milestone spec. Reuse
the listed sibling exports via ESM imports; do NOT redefine or modify them.`;
  return `${role}

Milestone ${milestone.id} (${milestone.title}) spec:
${milestone.spec}

Available API in the build environment (symbolic handles — names only):
${api}

Hard rules:
- You MUST actually write ${file} to disk with your file-creation tool. Do NOT
  only print the code in your reply — a printed-but-unwritten file counts as FAIL.
- Create/modify ONLY ${file}. Do NOT touch any other file.
- Keep the file under 100 lines. Node ESM only (import/export).
- ${focus}
- Do NOT run the full health check; keep this sub-call short and focused.
- Read failure_journal.log and learned_skills.log first if they exist.
Stop as soon as ${file} exists${test ? ` and node --test ${file} passes` : ''}.`;
}
