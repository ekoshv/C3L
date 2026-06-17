import { journalContext } from './journal.mjs';

function tail(text, lines = 25) {
  return (text || '').trim().split('\n').slice(-lines).join('\n');
}

export function analyzeFailurePrompt(cfg, ctx) {
  const mid = ctx.milestone?.id || '?';
  return `FAILURE ANALYST — do NOT edit source code. Only analyze and write logs.

After a ${ctx.phase} attempt, health is STILL failing for milestone ${mid}.

${journalContext(cfg.root)}

Orchestrator summary for THIS attempt:
- fingerprint: ${ctx.fingerprint}
- failing output tail:
${tail(ctx.output, 20)}

Your job (required):
1. Read the failing test file(s) and relevant source — identify the REAL root cause.
2. APPEND to failure_journal.log under the latest [orchestrator] block:
   root_cause: <one clear paragraph>
   do_not_repeat: <bullet list of strategies/approaches that failed or are wrong>
3. If you learned something reusable for LATER milestones, APPEND to learned_skills.log:
   skill: <pattern that works or pitfall to avoid>
   applies_when: <when to use it>

Be specific (file names, wrong API, test pattern). Do not guess — read the code.
Do not repeat anything already listed in do_not_repeat sections above.
Stop after writing both files (or only failure_journal if nothing reusable).`;
}
