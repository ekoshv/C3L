import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const file = join(root, 'project_description.md');

if (!existsSync(file)) {
  console.error('project_description.md not found');
  process.exit(1);
}

const content = readFileSync(file, 'utf8');
const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);

if (!match) {
  console.error('Missing YAML frontmatter in project_description.md');
  process.exit(1);
}

const config = {};
for (const line of match[1].split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const sep = trimmed.indexOf(':');
  if (sep === -1) continue;
  const key = trimmed.slice(0, sep).trim();
  let value = trimmed.slice(sep + 1).trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  config[key] = value;
}

config.description_body = content.slice(match[0].length).trim();
config.health_command =
  config.loop_tier === 'full' ? config.health_full : config.health_quick;

console.log(JSON.stringify(config, null, 2));
