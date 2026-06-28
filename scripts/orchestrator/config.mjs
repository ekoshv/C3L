import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const NUMERIC = [
  'impl_turns', 'fix_turns', 'max_iterations',
  'same_error_limit', 'stall_limit', 'impl_attempt_limit',
  'max_turn_limit',
  'great_loop_retries', 'recovery_turns', 'analyze_turns',
  'integration_fix_turns', 'integration_recovery_turns', 'integration_analyze_turns',
  'graph_scope_threshold', 'graph_prompt_facts', 'graph_query_timeout_ms',
  'diagnostic_probe_timeout_ms',
  'rlm_impl_turns', 'rlm_test_turns', 'rlm_max_depth', 'rlm_retries'
];

const BOOL = ['graph_sidecar', 'graph_auto', 'graph_required', 'rlm_enabled'];

function applyRlmDefaults(cfg) {
  if (!('rlm_enabled' in cfg)) cfg.rlm_enabled = true;
  if (!cfg.rlm_impl_turns) cfg.rlm_impl_turns = 8;
  if (!cfg.rlm_test_turns) cfg.rlm_test_turns = 10;
  if (!cfg.rlm_max_depth) cfg.rlm_max_depth = 1;
  if (!Number.isInteger(cfg.rlm_retries)) cfg.rlm_retries = 2;
}

function parseFrontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) throw new Error('project_description.md missing frontmatter');
  const cfg = {};
  for (const line of match[1].split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf(':');
    if (i === -1) continue;
    let v = t.slice(i + 1).trim().replace(/^["']|["']$/g, '');
    cfg[t.slice(0, i).trim()] = v;
  }
  return cfg;
}

export function loadConfig(root) {
  const spec = readFileSync(join(root, 'project_description.md'), 'utf8');
  const cfg = parseFrontmatter(spec);
  for (const key of NUMERIC) cfg[key] = Number(cfg[key]);
  for (const key of BOOL) {
    if (key in cfg) cfg[key] = cfg[key] === true || cfg[key] === 'true';
  }
  applyRlmDefaults(cfg);
  cfg.health_command = cfg.loop_tier === 'full' ? cfg.health_full : cfg.health_quick;

  const manifest = JSON.parse(
    readFileSync(join(root, 'scripts', 'milestones.json'), 'utf8')
  );
  cfg.milestones = manifest.milestones;
  cfg.root = root;
  if (process.env.GRAPH_SIDECAR === '1') cfg.graph_sidecar = true;
  return cfg;
}
