import { errorHints } from './hints.mjs';
import { scopeLines } from './active.mjs';
import { journalContext } from './journal.mjs';

function tail(text, lines = 40) {
  return (text || '').trim().split('\n').slice(-lines).join('\n');
}

const TEST_RULES = `Test rules (mandatory):
- ESM imports only: import { fn } from '../src/module.js' — NEVER window.X or jsdom.
- node:test + node:assert/strict; assertions inside it()/test() only.
- Float compare: import { approximateEqual } from './test-utils.js'.
- Pure logic in Node — NO document, canvas, Three.js, requestAnimationFrame in tests.`;

export function implementPrompt(cfg, milestone) {
  const list = milestone.files.map((f) => `- ${f}`).join('\n');
  return `Create milestone ${milestone.id} (${milestone.title}).

Spec: ${milestone.spec}

Create exactly these files:
${list}

Hard rules:
- Keep every file under 100 lines. Node ESM only (import/export).
${TEST_RULES}
- Do NOT read or edit unrelated files. Do NOT refactor existing modules.
- Read failure_journal.log and learned_skills.log before starting.
- When done, run: ${cfg.health_quick}
Stop as soon as ${cfg.health_quick} passes.`;
}

export function fixPrompt(cfg, output, milestone) {
  return `Health check "${cfg.health_quick}" is FAILING. Fix it.

${scopeLines(milestone)}

Step 1: read watchdog.md, failure_journal.log, and learned_skills.log.
Step 2: find the FIRST failing test; read that test file AND its source imports together.
Step 3: fix source OR test (only if test violates spec). Do NOT use window globals in tests.
Step 4: do NOT repeat root_cause/do_not_repeat entries in failure_journal.log.
Step 5: apply patterns from learned_skills.log where relevant.
Step 6: run ${cfg.health_quick} and stop when it passes.
${errorHints(output)}
${TEST_RULES}

${journalContext(cfg.root)}

Failing output (tail):
${tail(output)}`;
}
