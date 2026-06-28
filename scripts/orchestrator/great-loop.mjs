import { join } from 'node:path';
import { appendFileSync, existsSync, rmSync } from 'node:fs';
import { run } from './loop.mjs';
import { invokeAgent } from './agent.mjs';
import { runHealth } from './exec.mjs';
import { recoveryPrompt } from './recovery-prompt.mjs';
import { activeMilestone } from './active.mjs';
import { nextIncomplete } from './milestones.mjs';
import { afterFailedAttempt, recordProgressSkill, clearJournals } from './learn.mjs';
import { buildEvidence } from './evidence.mjs';
import { turnsForRecovery } from './attempt.mjs';
import {
  printAgentResult, printFailureSummary, printFileDiff
} from './terminal-summary.mjs';
import { diffSignatures, listSourceFiles, signatureMap } from './state.mjs';

const log = (m) => console.log(`[great] ${m}`);

function ensureDefaults(cfg) {
  if (!cfg.great_loop_retries) cfg.great_loop_retries = 5;
  if (!cfg.recovery_turns) cfg.recovery_turns = 20;
}

function appendRecoveryTrigger(root, streak, max, reason, milestone) {
  const tag = milestone ? `Milestone: ${milestone.id} (${milestone.title})\n` : '';
  const line =
    `\n## Hang recovery ${streak}/${max} — inner BLOCKED\n${tag}` +
    `Reason: ${reason}\nTime: ${new Date().toISOString()}\n`;
  appendFileSync(join(root, 'recovery_attempts.log'), line);
}

function clearRecoveryLog(root) {
  const p = join(root, 'recovery_attempts.log');
  if (existsSync(p)) rmSync(p);
}

function recoveryPass(cfg, logFile, streak, reason, milestone) {
  appendRecoveryTrigger(cfg.root, streak, cfg.great_loop_retries, reason, milestone);
  const health = runHealth(cfg, cfg.health_quick);
  const evidence = buildEvidence(cfg, health.output, milestone);
  const prompt = recoveryPrompt(cfg, {
    attempt: streak, reason, healthOutput: health.output, milestone, evidence
  });
  log(`recovery [${milestone?.id || '?'}] hang ${streak}/${cfg.great_loop_retries}`);
  printFailureSummary('[great]', evidence);
  const beforeFiles = [...new Set([...(evidence.scopeFiles || []), ...listSourceFiles(cfg.root)])];
  const beforeSig = signatureMap(cfg.root, beforeFiles);
  const agent = invokeAgent(
    prompt, turnsForRecovery(cfg, milestone, evidence), logFile, `recovery ${milestone?.id || '?'}`
  );
  const afterFiles = [...new Set([...beforeFiles, ...listSourceFiles(cfg.root)])];
  const afterSig = signatureMap(cfg.root, afterFiles);
  printAgentResult('[great]', agent);
  printFileDiff('[great]', diffSignatures(beforeSig, afterSig));
  const after = runHealth(cfg, cfg.health_quick);
  log(`post-recovery health: ${after.ok ? 'GREEN' : 'still failing'}`);
  if (!after.ok) {
    afterFailedAttempt(cfg, logFile, {
      phase: 'recovery', milestone, evidence, output: after.output
    });
  } else {
    recordProgressSkill(cfg, milestone, health.output, after.output);
  }
}

export function runGreatLoop(cfg, logFile) {
  ensureDefaults(cfg);
  log(`${cfg.great_loop_retries} recoveries per hang (resets after progress)`);

  let hangStreak = 0;
  let totalRecoveries = 0;
  let lastHangMilestone = null;

  while (true) {
    const result = run(cfg, logFile);
    if (result.status === 'success') {
      clearRecoveryLog(cfg.root);
      clearJournals(cfg.root);
      return { ...result, recoveryPasses: totalRecoveries };
    }

    const hangId = result.milestone?.id || null;
    if (result.passedBlock) {
      if (hangStreak > 0) log('progress made — hang streak reset');
      hangStreak = 0;
      lastHangMilestone = null;
    } else if (hangId && hangId !== lastHangMilestone) {
      if (lastHangMilestone) log(`new hang at ${hangId} — streak reset`);
      hangStreak = 0;
      lastHangMilestone = hangId;
    }

    hangStreak++;
    if (hangStreak > cfg.great_loop_retries) {
      log(`hung ${cfg.great_loop_retries}x at ${hangId || 'unknown stage'} — final BLOCKED`);
      return { status: 'blocked', reason: result.reason, recoveryPasses: totalRecoveries };
    }

    log(`inner BLOCKED at ${hangId} — recovery ${hangStreak}/${cfg.great_loop_retries}`);
    const health = runHealth(cfg, cfg.health_quick);
    const milestone = result.milestone || activeMilestone(
      cfg.root, cfg.milestones, health.output, false, nextIncomplete
    );
    recoveryPass(cfg, logFile, hangStreak, result.reason, milestone);
    totalRecoveries++;
    lastHangMilestone = hangId;
  }
}
