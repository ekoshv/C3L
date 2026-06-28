import { invokeAgent } from './agent.mjs';
import { runCommand, runHealth } from './exec.mjs';
import { fixPrompt } from './prompts.mjs';
import { rlmFixPrompt } from './rlm-fix.mjs';
import { stripDebugLogs } from './strip-debug.mjs';
import {
  fingerprint, snapshotFiles, listSourceFiles, shouldAbort,
  signatureMap, diffSignatures
} from './state.mjs';
import { afterFailedAttempt, recordProgressSkill } from './learn.mjs';
import { buildEvidence } from './evidence.mjs';
import { classifyAttempt, targetCommand, turnsForFix } from './attempt.mjs';
import {
  printAgentResult, printFailureSummary, printFileDiff
} from './terminal-summary.mjs';

export function fixCycle(cfg, output, counters, logFile, root, lastFp, milestone) {
  const fp = fingerprint(output);
  const evidence = buildEvidence(cfg, output, milestone);
  const scoped = evidence.scopeFiles?.length ? evidence.scopeFiles : (
    milestone
      ? listSourceFiles(root).filter((f) =>
          milestone.files.some((m) => f.replace(/\\/g, '/') === m.replace(/\\/g, '/')))
      : listSourceFiles(root)
  );
  const track = scoped.length ? scoped : listSourceFiles(root);
  const before = snapshotFiles(root, track);
  const beforeSig = signatureMap(root, track);
  const turns = turnsForFix(cfg, milestone, evidence);
  printFailureSummary('[orch]', evidence);
  const prompt = cfg.rlm_enabled
    ? rlmFixPrompt(cfg, output, milestone, evidence)
    : fixPrompt(cfg, output, milestone, evidence);
  const agent = invokeAgent(prompt, turns, logFile, `fix ${milestone?.id || '?'}`);
  if (cfg.rlm_enabled) {
    const n = stripDebugLogs(root, [...new Set([...track, ...listSourceFiles(root)])]);
    if (n) console.log(`[orch] stripped ${n} debug console line(s) from source`);
  }
  const after = snapshotFiles(root, track);
  const afterSig = signatureMap(root, [...new Set([...track, ...listSourceFiles(root)])]);
  printAgentResult('[orch]', agent);
  printFileDiff('[orch]', diffSignatures(beforeSig, afterSig));
  const target = targetCommand(evidence);
  const targeted = target ? runCommand(target, root) : null;
  const health = targeted && !targeted.ok ? targeted : runHealth(cfg, cfg.health_quick);
  if (targeted) {
    console.log(`[orch] targeted verify: ${target} -> ${targeted.ok ? 'GREEN' : 'RED'}`);
  }
  console.log(`[orch] health after fix: ${health.ok ? 'GREEN' : 'RED'}`);
  const attempt = classifyAttempt(agent, before, after, health);
  if (!health.ok) {
    const facts = [
      attempt.maxTurns ? '[attempt] agent reached max turns' : '',
      attempt.falseSuccess ? '[attempt] model claimed success but health stayed red' : '',
      !attempt.changed ? '[attempt] no tracked files changed' : '',
    ].filter(Boolean).join('\n');
    afterFailedAttempt(cfg, logFile, {
      phase: 'fix', milestone, evidence, output: `${health.output}\n${facts}`, fingerprint: fp
    });
  } else {
    // A fix that turns health GREEN is progress, even if the agent also hit max
    // turns (common with bounded RLM fixes). Reset counters and never abort.
    recordProgressSkill(cfg, milestone, output, health.output);
    counters.maxTurnStreak = 0;
    counters.sameErrorStreak = 0;
    counters.noEditStreak = 0;
    return { fp, abort: false };
  }
  counters.maxTurnStreak = attempt.maxTurns ? (counters.maxTurnStreak || 0) + 1 : 0;
  counters.sameErrorStreak = attempt.maxTurns ? 0 : (fp === lastFp ? counters.sameErrorStreak + 1 : 1);
  counters.noEditStreak = attempt.changed ? 0 : counters.noEditStreak + 1;
  return { fp, abort: shouldAbort(counters, cfg) };
}
