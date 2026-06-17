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

  return `RECOVERY MODE — inner orchestrator BLOCKED at a hang point.
Hang recovery ${ctx.attempt}/${cfg.great_loop_retries}. Reason: ${ctx.reason}

${scope}

Procedure:
1. Read watchdog.md, failure_journal.log, learned_skills.log — do NOT repeat do_not_repeat entries.
2. Read failed_attempts.log; open failing test + every source file it imports.
3. Fix implementation OR rewrite tests (ESM imports, no window/jsdom).
4. Apply patterns from learned_skills.log where relevant.
5. Run ${cfg.health_quick}. Stop when it passes.
6. If you learn something reusable, append to learned_skills.log.

Hard rules: ≤100 lines/file; Node ESM; test-utils.js for floats; pure logic only.
${errorHints(ctx.healthOutput)}

${journalContext(cfg.root)}

--- failed_attempts.log (last BLOCKED snapshot) ---
${tail(failed, 20)}

--- latest health output ---
${tail(ctx.healthOutput, 55)}`;
}
