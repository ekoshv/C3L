import { join } from 'node:path';
import { writeFileSync, rmSync, existsSync } from 'node:fs';
import { runHealth } from './exec.mjs';
import { invokeAgent } from './agent.mjs';
import { implementPrompt, fixPrompt } from './prompts.mjs';
import { nextIncomplete, milestoneFilesPresent } from './milestones.mjs';
import {
  fingerprint, snapshotFiles, listSourceFiles, shouldAbort, abortReason
} from './state.mjs';

const log = (m) => console.log(`[orch] ${m}`);

function recordFailure(root, reason, output) {
  const body = `# Orchestrator stopped\nReason: ${reason}\n\nLast output (tail):\n` +
    (output || '').trim().split('\n').slice(-30).join('\n') + '\n';
  writeFileSync(join(root, 'failed_attempts.log'), body);
}

function clearFailure(root) {
  const p = join(root, 'failed_attempts.log');
  if (existsSync(p)) rmSync(p);
}

export function run(cfg, logFile) {
  const root = cfg.root;
  const counters = { sameErrorStreak: 0, noEditStreak: 0, implNoProgress: 0 };
  let lastFp = null;

  for (let i = 1; i <= cfg.max_iterations; i++) {
    const quick = runHealth(cfg, cfg.health_quick);

    if (quick.ok) {
      const m = nextIncomplete(root, cfg.milestones);
      if (!m) {
        const full = runHealth(cfg, cfg.health_full);
        if (full.ok) {
          clearFailure(root);
          log(`iter ${i}: all milestones present and health:full GREEN`);
          return { status: 'success', iterations: i };
        }
        log(`iter ${i}: milestones done but health:full FAILED -> fix`);
        if (fixCycle(cfg, full.output, counters, logFile, root, lastFp).abort)
          return blocked(root, counters, cfg, full.output);
        lastFp = fingerprint(full.output);
        continue;
      }

      log(`iter ${i}: health GREEN; implement ${m.id} (${m.title})`);
      const before = milestoneFilesPresent(root, m);
      invokeAgent(implementPrompt(cfg, m), cfg.impl_turns, logFile);
      const after = milestoneFilesPresent(root, m);
      counters.implNoProgress = after > before ? 0 : counters.implNoProgress + 1;
      if (shouldAbort(counters, cfg)) return blocked(root, counters, cfg, '');
      continue;
    }

    log(`iter ${i}: health quick FAILED -> fix`);
    const res = fixCycle(cfg, quick.output, counters, logFile, root, lastFp);
    lastFp = res.fp;
    if (res.abort) return blocked(root, counters, cfg, quick.output);
  }

  recordFailure(root, `max_iterations (${cfg.max_iterations}) reached`, '');
  log('BLOCKED: max iterations reached');
  return { status: 'blocked', reason: 'max_iterations' };
}

function fixCycle(cfg, output, counters, logFile, root, lastFp) {
  const fp = fingerprint(output);
  const files = listSourceFiles(root);
  const before = snapshotFiles(root, files);
  invokeAgent(fixPrompt(cfg, output), cfg.fix_turns, logFile);
  const after = snapshotFiles(root, files);

  counters.sameErrorStreak = fp === lastFp ? counters.sameErrorStreak + 1 : 1;
  counters.noEditStreak = after === before ? counters.noEditStreak + 1 : 0;
  return { fp, abort: shouldAbort(counters, cfg) };
}

function blocked(root, counters, cfg, output) {
  const reason = abortReason(counters, cfg);
  recordFailure(root, reason, output);
  log(`BLOCKED: ${reason} (see failed_attempts.log)`);
  return { status: 'blocked', reason };
}
