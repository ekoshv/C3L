import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { invokeAgent } from './agent.mjs';
import { subImplementPrompt } from './rlm-prompts.mjs';
import { listSourceFiles } from './state.mjs';

const log = (m) => console.log(`[rlm] ${m}`);
const isTestFile = (f) => /(^|\/)tests?\//i.test(f) || /\.test\.[mc]?js$/i.test(f);

// Deterministic decomposition: source files in declared (dependency) order
// first, then test files written against the real interface.
function orderSubtasks(milestone) {
  const src = milestone.files.filter((f) => !isTestFile(f));
  const tests = milestone.files.filter(isTestFile);
  return [...src, ...tests];
}

// RLM symbolic handles available to a sub-call: already-created milestone
// siblings, plus (for integration milestones) all existing src exports.
function apiForFile(cfg, milestone, file) {
  const root = cfg.root;
  const present = (paths) => paths.filter((f) => f !== file && existsSync(join(root, f)));
  const siblings = present(milestone.files);
  if (milestone.mode !== 'integration') return siblings;
  const priorSrc = listSourceFiles(root).filter((f) => !isTestFile(f));
  return [...new Set([...siblings, ...priorSrc])].filter((f) => f !== file);
}

function turnsForSub(cfg, file) {
  if (isTestFile(file)) return cfg.rlm_test_turns || 8;
  return cfg.rlm_impl_turns || cfg.rlm_subimpl_turns || 6;
}

// Dispatch one bounded sub-call for a file, retrying if it ends without
// actually writing the file to disk (the v01 "done but MISSING" cascade).
function subCallFile(cfg, milestone, file, logFile) {
  const abs = join(cfg.root, file);
  const turns = turnsForSub(cfg, file);
  const attempts = (cfg.rlm_retries ?? 2) + 1;
  for (let a = 1; a <= attempts; a++) {
    const api = apiForFile(cfg, milestone, file);
    const prompt = subImplementPrompt(cfg, milestone, file, api, { escalate: a > 1 });
    const agent = invokeAgent(prompt, turns, logFile, `rlm:impl ${milestone.id}/${file}`);
    if (existsSync(abs)) {
      log(`sub-call ${file}: created (${agent.maxTurns ? 'max turns' : agent.status}, try ${a}/${attempts})`);
      return true;
    }
    log(`sub-call ${file}: MISSING (try ${a}/${attempts})`);
  }
  return false;
}

// Implement a milestone as a sequence of bounded recursive sub-calls.
export function implementMilestoneRLM(cfg, milestone, logFile) {
  const root = cfg.root;
  const order = orderSubtasks(milestone);
  log(`decompose ${milestone.id} -> ${order.length} sub-call(s) (depth=${cfg.rlm_max_depth ?? 1})`);
  const results = [];
  for (const file of order) {
    if (existsSync(join(root, file))) {
      log(`sub-call ${file}: skip (already present)`);
      continue;
    }
    results.push({ file, created: subCallFile(cfg, milestone, file, logFile) });
  }
  return results;
}
