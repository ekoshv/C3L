import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { TEST_RULES } from './prompts.mjs';

const isTestFile = (f) => /(^|\/)tests?\//i.test(f) || /\.test\.[mc]?js$/i.test(f);

function tail(text, lines = 24) {
  return (text || '(empty)').trim().split('\n').slice(-lines).join('\n');
}

function inlineFile(root, f) {
  const p = join(root, f);
  return existsSync(p) ? `----- ${f} -----\n${readFileSync(p, 'utf8')}` : '';
}

// Inline the small source files in scope so a weak model does not spend turns
// re-reading them (RLM "bounded context" applied to the fix phase).
function inlineSources(root, files, cap = 4) {
  const out = [];
  for (const f of files.filter((x) => !isTestFile(x)).slice(0, cap)) {
    const body = inlineFile(root, f);
    if (body) out.push(body);
  }
  return out.join('\n\n') || '(no source files in scope)';
}

// RLM-style bounded fix: everything needed is inline, the edit target is one
// milestone's source, and only the targeted test is run. Minimises wandering.
export function rlmFixPrompt(cfg, output, milestone, evidence) {
  const root = cfg.root;
  const failure = evidence?.failure || {};
  const scope = evidence?.scopeFiles?.length ? evidence.scopeFiles : (milestone?.files || []);
  const editable = (milestone?.files || scope).filter((f) => !isTestFile(f));
  const testFile = failure.file || (milestone?.files || []).find(isTestFile);
  const diag = typeof evidence?.diagnostics === 'string'
    ? evidence.diagnostics
    : (evidence?.diagnostics?.text || '');
  const testBody = testFile ? inlineFile(root, testFile) : '';

  return `Fix ONE failing test with a minimal, focused edit.

Failing test: ${failure.name || 'unknown'}  (file: ${testFile || 'unknown'})

${diag}

Edit ONLY these source files (do NOT modify the test or tests/test-utils.js, do
NOT touch any other file):
${editable.map((f) => `- ${f}`).join('\n') || '(none)'}

The failing test file (read-only — make the source satisfy THIS exact contract):
${testBody || '(unavailable)'}

Current source (already on disk — DO NOT re-read, edit in place):
${inlineSources(root, scope)}

How to work (keep it short — you have a tight turn budget):
1. Compare the test's imports/expectations against the source above. Fix the
   single root cause: align exported names/signatures to what the test imports,
   guard non-finite math (no NaN/Infinity), make boolean invariants hold.
2. Make the smallest source edit that satisfies the test. Remove ALL debug
   console.log / print statements you add.
3. Run ONLY: node --test ${testFile || ''} . Do NOT run the full health check.
4. If green, stop. If still red after 2 edits, stop and write your root cause.

Rules:
- Do not claim success unless the targeted command output says it passed.
- Do not rewrite the test unless it violates the milestone spec.
${TEST_RULES}

Failing output (tail):
${tail(output)}`;
}
