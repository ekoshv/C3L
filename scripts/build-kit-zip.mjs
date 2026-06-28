import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const TOP = [
  'CLAUDE.md', 'watchdog.md', 'README.md', 'README_KIT.md', 'KIT_UPDATE_LOG.md',
  'project_description.md', 'package.json', '.gitignore', 'run-watchdog.ps1',
  'run-watchdog.sh', 'docker-compose.graph.yml',
];
const DIRS = ['scripts', 'docker', 'docs', 'samples', '.claude'];
const STARTER_TESTS = ['tests/scaffold.test.js', 'tests/test-utils.js'];

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(relative(root, full).replace(/\\/g, '/'));
  }
  return out;
}

export function kitFiles() {
  return [
    ...TOP,
    ...DIRS.flatMap((d) => walk(join(root, d))),
    ...STARTER_TESTS,
  ].filter((f) => !/^tests\/orchestrator-.*\.test\.js$/.test(f));
}

function copyFileToStage(stage, file) {
  const dest = join(stage, file);
  mkdirSync(dirname(dest), { recursive: true });
  cpSync(join(root, file), dest);
}

export function buildZip(zip = join(root, 'claude_local.zip')) {
  const stage = join(process.env.TEMP || root, `claude_local_zip_${Date.now()}`);
  mkdirSync(stage, { recursive: true });
  for (const file of kitFiles()) copyFileToStage(stage, file);
  if (existsSync(zip)) rmSync(zip);
  const ps = `Compress-Archive -Path '${stage}\\*' -DestinationPath '${zip}' -CompressionLevel Optimal`;
  const res = spawnSync('powershell', ['-NoProfile', '-Command', ps], { encoding: 'utf8' });
  if (res.status !== 0) throw new Error(res.stderr || res.stdout);
  return { zip, files: kitFiles().length };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = buildZip();
  console.log(`[kit-zip] ${result.zip} (${result.files} files)`);
}
