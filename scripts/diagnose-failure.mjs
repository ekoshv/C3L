import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { loadConfig } from './orchestrator/config.mjs';
import { runCommand } from './orchestrator/exec.mjs';
import { buildEvidence } from './orchestrator/evidence.mjs';
import { activeMilestone } from './orchestrator/active.mjs';
import { nextIncomplete } from './orchestrator/milestones.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const cfg = loadConfig(root);
const command = process.argv.slice(2).join(' ') || cfg.health_quick;

console.log(`[diagnose] running: ${command}`);
const result = runCommand(command, root);
const milestone = activeMilestone(
  root, cfg.milestones, result.output, result.ok, nextIncomplete
);

if (result.ok) {
  console.log('[diagnose] command passed; no failure to diagnose');
  process.exit(0);
}

const evidence = buildEvidence(cfg, result.output, milestone);
console.log(evidence.diagnostics?.text || '[diagnose] no diagnostics available');

if (evidence.graph?.text) {
  console.log('\n' + evidence.graph.text);
}

process.exit(1);
