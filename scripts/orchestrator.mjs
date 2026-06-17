import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { mkdirSync } from 'node:fs';
import { loadConfig } from './orchestrator/config.mjs';
import { run } from './orchestrator/loop.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const cfg = loadConfig(root);

const logDir = join(root, cfg.log_dir || 'logs');
mkdirSync(logDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const logFile = join(logDir, `orchestrator-${stamp}.log`);

console.log(`[orch] project: ${cfg.name} v${cfg.version}`);
console.log(`[orch] health:  ${cfg.health_command}`);
console.log(`[orch] milestones: ${cfg.milestones.map((m) => m.id).join(', ')}`);
console.log(`[orch] log: ${logFile}`);

const result = run(cfg, logFile);

if (result.status === 'success') {
  console.log('[orch] ===== SUCCESS: project complete and verified green =====');
  process.exit(0);
} else {
  console.log(`[orch] ===== BLOCKED: ${result.reason} — human review needed =====`);
  process.exit(2);
}
