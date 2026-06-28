import { invokeAgent } from './agent.mjs';
import {
  appendOrchestratorFailure,
  appendLearnedSkill,
  clearJournals,
  failureJournalText,
  latestAnalysisComplete,
  markAnalysisMissing,
  parseFailCount,
} from './journal.mjs';
import { analyzeFailurePrompt } from './analyze-prompt.mjs';
import { fingerprint } from './state.mjs';
import { turnsForAnalyze } from './attempt.mjs';

export { clearJournals };

function narrowAnalyzePrompt(ctx) {
  const mid = ctx.milestone?.id || '?';
  return `ANALYSIS RETRY for milestone ${mid}. Do not edit source.
Append to the latest failure_journal.log block exactly:
root_cause: <one specific cause from the failing test/source>
do_not_repeat:
- <one failed or wrong strategy>

Failing output tail:
${(ctx.output || '').trim().split('\n').slice(-15).join('\n')}`;
}

export function afterFailedAttempt(cfg, logFile, ctx) {
  const fp = ctx.fingerprint || fingerprint(ctx.output);
  appendOrchestratorFailure(cfg.root, { ...ctx, fingerprint: fp });
  const turns = turnsForAnalyze(cfg, ctx.milestone, ctx.evidence);
  invokeAgent(
    analyzeFailurePrompt(cfg, { ...ctx, fingerprint: fp }),
    turns,
    logFile,
    `analyze ${ctx.phase || 'failure'} ${ctx.milestone?.id || '?'}`
  );
  if (latestAnalysisComplete(failureJournalText(cfg.root))) return;
  invokeAgent(
    narrowAnalyzePrompt(ctx),
    Math.max(4, Math.ceil(turns / 2)),
    logFile,
    `analyze retry ${ctx.milestone?.id || '?'}`
  );
  if (!latestAnalysisComplete(failureJournalText(cfg.root))) markAnalysisMissing(cfg.root);
}

export function recordProgressSkill(cfg, milestone, beforeOut, afterOut) {
  const before = parseFailCount(beforeOut);
  const after = parseFailCount(afterOut);
  if (after >= before || after === 0) return;
  appendLearnedSkill(
    cfg.root,
    `skill: failures dropped ${before} → ${after}; capture what fix worked\n` +
      `applies_when: similar errors at ${milestone?.id || '?'}`,
    milestone
  );
}
