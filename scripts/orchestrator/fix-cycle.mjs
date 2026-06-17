import { invokeAgent } from './agent.mjs';
import { runHealth } from './exec.mjs';
import { fixPrompt } from './prompts.mjs';
import {
  fingerprint, snapshotFiles, listSourceFiles, shouldAbort
} from './state.mjs';
import { afterFailedAttempt, recordProgressSkill } from './learn.mjs';

export function fixCycle(cfg, output, counters, logFile, root, lastFp, milestone) {
  const fp = fingerprint(output);
  const scoped = milestone
    ? listSourceFiles(root).filter((f) =>
        milestone.files.some((m) => f.replace(/\\/g, '/') === m.replace(/\\/g, '/')))
    : listSourceFiles(root);
  const track = scoped.length ? scoped : listSourceFiles(root);
  const before = snapshotFiles(root, track);
  invokeAgent(fixPrompt(cfg, output, milestone), cfg.fix_turns, logFile);
  const after = snapshotFiles(root, track);
  const health = runHealth(cfg, cfg.health_quick);
  if (!health.ok) {
    afterFailedAttempt(cfg, logFile, {
      phase: 'fix', milestone, output: health.output, fingerprint: fp
    });
  } else {
    recordProgressSkill(cfg, milestone, output, health.output);
  }
  counters.sameErrorStreak = fp === lastFp ? counters.sameErrorStreak + 1 : 1;
  counters.noEditStreak = after === before ? counters.noEditStreak + 1 : 0;
  return { fp, abort: shouldAbort(counters, cfg) };
}
