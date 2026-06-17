import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const NUMERIC = [
  'impl_turns', 'fix_turns', 'max_iterations',
  'same_error_limit', 'stall_limit', 'impl_attempt_limit'
];

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
  cfg.health_command = cfg.loop_tier === 'full' ? cfg.health_full : cfg.health_quick;

  const manifest = JSON.parse(
    readFileSync(join(root, 'scripts', 'milestones.json'), 'utf8')
  );
  cfg.milestones = manifest.milestones;
  cfg.root = root;
  return cfg;
}
