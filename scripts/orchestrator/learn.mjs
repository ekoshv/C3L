import { invokeAgent } from './agent.mjs';
import {
  appendOrchestratorFailure, appendLearnedSkill, parseFailCount, clearJournals
} from './journal.mjs';
import { analyzeFailurePrompt } from './analyze-prompt.mjs';
import { fingerprint } from './state.mjs';

export { clearJournals };

export function afterFailedAttempt(cfg, logFile, ctx) {
  const fp = ctx.fingerprint || fingerprint(ctx.output);
  appendOrchestratorFailure(cfg.root, { ...ctx, fingerprint: fp });
  const turns = cfg.analyze_turns || 8;
  invokeAgent(analyzeFailurePrompt(cfg, { ...ctx, fingerprint: fp }), turns, logFile);
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
