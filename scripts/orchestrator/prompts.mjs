import { errorHints } from './hints.mjs';
import { scopeLines } from './active.mjs';
import { journalContext } from './journal.mjs';
import { resolveGraphFacts } from './graph-resolver.mjs';
import { rankGraphFacts, renderGraphFacts } from './graph-ranker.mjs';

function tail(text, lines = 40) {
  return (text || '').trim().split('\n').slice(-lines).join('\n');
}

export const TEST_RULES = `Test rules (mandatory):
- ESM imports only: import { fn } from '../src/module.js' — NEVER window.X or jsdom.
- node:test + node:assert/strict; assertions inside it()/test() only.
- Float compare: import { approximateEqual } from './test-utils.js'.
- Pure logic in Node — NO document, canvas, Three.js, requestAnimationFrame in tests.`;

export function implementPrompt(cfg, milestone) {
  const list = milestone.files.map((f) => `- ${f}`).join('\n');
  const seed = { failure: { name: milestone.title }, failingTests: [], scopeFiles: milestone.files };
  const resolved = resolveGraphFacts(cfg, milestone, seed);
  const ranked = rankGraphFacts(resolved.facts, seed, cfg);
  const graph = renderGraphFacts(ranked.promptFacts);
  return `Create milestone ${milestone.id} (${milestone.title}).

Spec: ${milestone.spec}

Create exactly these files:
${list}

Hard rules:
- Keep every file under 100 lines. Node ESM only (import/export).
${TEST_RULES}
- Do NOT read or edit unrelated files. Do NOT refactor existing modules.
- Read failure_journal.log and learned_skills.log before starting.
${graph ? '- Deterministic graph facts are below — use them for navigation, not as a substitute for tests.' : ''}
- When done, run: ${cfg.health_quick}
Stop as soon as ${cfg.health_quick} passes.${graph ? `\n\n${graph}` : ''}`;
}

function evidenceBlock(evidence) {
  if (!evidence) return '';
  const scope = (evidence.scopeFiles || []).map((f) => `- ${f}`).join('\n') || '(none)';
  const graphText = typeof evidence.graph === 'string'
    ? evidence.graph
    : (evidence.graph?.text || '');
  const diagnostics = typeof evidence.diagnostics === 'string'
    ? evidence.diagnostics
    : (evidence.diagnostics?.text || '');
  return `First failure:
- file: ${evidence.failure?.file || 'unknown'}
- test: ${evidence.failure?.name || 'unknown'}

Allowed scope:
${scope}

${diagnostics}

${graphText}`;
}

const RESPONSE_CONTRACT = `Required response sections:
READ:
- files inspected
- invariant understood

PATCH:
- files changed
- why each change addresses the first failure

VERIFY:
- targeted command run
- full command run, if targeted passed
- observed result

LEARN:
- root cause and do_not_repeat if still failing`;

export function fixPrompt(cfg, output, milestone, evidence = null) {
  const ctx = evidence || { graph: { text: '' } };
  return `Health check "${cfg.health_quick}" is FAILING. Fix it.

${scopeLines(milestone)}

${evidenceBlock(ctx)}

${RESPONSE_CONTRACT}

Rules:
- Read watchdog.md, failure_journal.log, and learned_skills.log before editing.
- Do not claim health passed unless command output in this run says it passed.
- If you cannot finish, make the smallest useful edit and stop.
- Do not output replacement code blocks unless you also edit files.
- Do not rewrite tests unless they violate the milestone spec or mandatory test rules.
- Run targeted failing tests first when possible, then ${cfg.health_quick}.
${errorHints(output, ctx)}
${TEST_RULES}

${journalContext(cfg.root)}

Failing output (tail):
${tail(output)}`;
}
