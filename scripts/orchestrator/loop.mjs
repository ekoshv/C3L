import { join } from 'node:path';
import { writeFileSync, rmSync, existsSync } from 'node:fs';
import { runHealth } from './exec.mjs';
import { invokeAgent } from './agent.mjs';
import { implementPrompt } from './prompts.mjs';
import { nextIncomplete, milestoneFilesPresent } from './milestones.mjs';
import { activeMilestone } from './active.mjs';
import { abortReason, diffSignatures, listSourceFiles, signatureMap } from './state.mjs';
import { fixCycle } from './fix-cycle.mjs';
import { clearJournals } from './learn.mjs';
import { implementMilestoneRLM } from './rlm.mjs';
import { stripDebugLogs } from './strip-debug.mjs';
import { printAgentResult, printFileDiff } from './terminal-summary.mjs';

const log = (m) => console.log(`[orch] ${m}`);

function recordFailure(root, reason, output, milestone) {
  const tag = milestone ? `Milestone: ${milestone.id} (${milestone.title})\n` : '';
  const body = `# Orchestrator stopped\nReason: ${reason}\n${tag}\nLast output (tail):\n` +
    (output || '').trim().split('\n').slice(-30).join('\n') + '\n';
  writeFileSync(join(root, 'failed_attempts.log'), body);
}

function clearFailure(root) {
  const p = join(root, 'failed_attempts.log');
  if (existsSync(p)) rmSync(p);
}

export function run(cfg, logFile) {
  const root = cfg.root;
  const counters = { sameErrorStreak: 0, noEditStreak: 0, implNoProgress: 0, maxTurnStreak: 0 };
  let lastFp = null;
  let passedBlock = false;

  for (let i = 1; i <= cfg.max_iterations; i++) {
    const quick = runHealth(cfg, cfg.health_quick);
    const active = activeMilestone(
      root, cfg.milestones, quick.output, quick.ok, nextIncomplete
    );

    if (quick.ok) {
      passedBlock = true;
      const m = nextIncomplete(root, cfg.milestones);
      if (!m) {
        const full = runHealth(cfg, cfg.health_full);
        if (full.ok) {
          clearFailure(root);
          clearJournals(root);
          log(`iter ${i}: all milestones present and health:full GREEN`);
          return { status: 'success', iterations: i, passedBlock: true };
        }
        const fullActive = activeMilestone(
          root, cfg.milestones, full.output, false, nextIncomplete
        );
        log(`iter ${i}: milestones done but health:full FAILED -> fix [${fullActive?.id}]`);
        const res = fixCycle(cfg, full.output, counters, logFile, root, lastFp, fullActive);
        if (res.abort) return blocked(root, counters, cfg, full.output, passedBlock, fullActive);
        lastFp = res.fp;
        continue;
      }

      log(`iter ${i}: health GREEN; implement ${m.id} (${m.title})`);
      if (milestoneFilesPresent(root, m) === m.files.length) {
        log(`iter ${i}: ${m.id} files present — skip implement`);
        continue;
      }
      const beforeCount = milestoneFilesPresent(root, m);
      const tracked = [...new Set([...listSourceFiles(root), ...m.files])];
      const beforeSig = signatureMap(root, tracked);
      if (cfg.rlm_enabled) {
        implementMilestoneRLM(cfg, m, logFile);
        stripDebugLogs(root, m.files);
      } else {
        const agent = invokeAgent(implementPrompt(cfg, m), cfg.impl_turns, logFile, `implement ${m.id}`);
        printAgentResult('[orch]', agent);
      }
      const afterTracked = [...new Set([...tracked, ...listSourceFiles(root), ...m.files])];
      const afterSig = signatureMap(root, afterTracked);
      printFileDiff('[orch]', diffSignatures(beforeSig, afterSig));
      const afterCount = milestoneFilesPresent(root, m);
      log(`iter ${i}: ${m.id} files present ${beforeCount}/${m.files.length} -> ${afterCount}/${m.files.length}`);
      if (afterCount > beforeCount) passedBlock = true;
      counters.implNoProgress = afterCount > beforeCount ? 0 : counters.implNoProgress + 1;
      if (shouldAbort(counters, cfg)) return blocked(root, counters, cfg, '', passedBlock, m);
      continue;
    }

    log(`iter ${i}: health FAILED -> fix [${active?.id}]`);
    const res = fixCycle(cfg, quick.output, counters, logFile, root, lastFp, active);
    lastFp = res.fp;
    if (res.abort) return blocked(root, counters, cfg, quick.output, passedBlock, active);
  }

  recordFailure(root, `max_iterations (${cfg.max_iterations}) reached`, '', null);
  log('BLOCKED: max iterations reached');
  return { status: 'blocked', reason: 'max_iterations', passedBlock };
}

function shouldAbort(counters, cfg) {
  return (
    counters.sameErrorStreak >= cfg.same_error_limit ||
    counters.noEditStreak >= cfg.stall_limit ||
    counters.implNoProgress >= cfg.impl_attempt_limit ||
    counters.maxTurnStreak >= (cfg.max_turn_limit || 2)
  );
}

function blocked(root, counters, cfg, output, passedBlock, milestone) {
  const reason = abortReason(counters, cfg);
  recordFailure(root, reason, output, milestone);
  log(`BLOCKED: ${reason} at ${milestone?.id || '?'} (see failed_attempts.log)`);
  return { status: 'blocked', reason, passedBlock, milestone };
}
