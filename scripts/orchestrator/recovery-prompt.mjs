import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { errorHints } from './hints.mjs';
import { scopeLines } from './active.mjs';
import { journalContext } from './journal.mjs';

function tail(text, lines = 40) {
  return (text || '(empty)').trim().split('\n').slice(-lines).join('\n');
}

function readLog(root, name) {
  const p = join(root, name);
  return existsSync(p) ? readFileSync(p, 'utf8') : '';
}

export function recoveryPrompt(cfg, ctx) {
  const failed = readLog(cfg.root, 'failed_attempts.log');
  const scope = scopeLines(ctx.milestone);
  const evidence = ctx.evidence || {};
  const allowed = (evidence.scopeFiles || ctx.milestone?.files || [])
    .map((f) => `- ${f}`).join('\n') || '(none)';
  const graphText = typeof evidence.graph === 'string'
    ? evidence.graph
    : (evidence.graph?.text || '');
  const diagnostics = typeof evidence.diagnostics === 'string'
    ? evidence.diagnostics
    : (evidence.diagnostics?.text || '');

  return `RECOVERY MODE — inner orchestrator BLOCKED at a hang point.
Hang recovery ${ctx.attempt}/${cfg.great_loop_retries}. Reason: ${ctx.reason}

${scope}

First failure:
- file: ${evidence.failure?.file || 'unknown'}
- test: ${evidence.failure?.name || 'unknown'}

Allowed scope:
${allowed}

${diagnostics}

${graphText}

Required response sections:
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
- root cause and do_not_repeat if still failing

Rules:
- Read watchdog.md, failure_journal.log, learned_skills.log, and failed_attempts.log.
- Do not claim health passed unless command output in this run says it passed.
- If you cannot finish, make the smallest useful edit and stop.
- Do not output replacement code blocks unless you also edit files.
- Do not rewrite tests unless they violate the milestone spec or mandatory test rules.

Hard rules: ≤100 lines/file; Node ESM; test-utils.js for floats; pure logic only.
${errorHints(ctx.healthOutput, evidence)}

${journalContext(cfg.root)}

--- failed_attempts.log (last BLOCKED snapshot) ---
${tail(failed, 20)}

--- latest health output ---
${tail(ctx.healthOutput, 55)}`;
}
