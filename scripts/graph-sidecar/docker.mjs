import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const COMPOSE = 'docker-compose.graph.yml';

function sleep(ms) {
  spawnSync('node', ['-e', `setTimeout(()=>{},${ms})`], { windowsHide: true });
}

export function composeFile(root) {
  return join(root, COMPOSE);
}

export function dockerOk() {
  const r = spawnSync('docker', ['info'], { encoding: 'utf8', windowsHide: true });
  return r.status === 0;
}

export function compose(root, args, env = {}, options = {}) {
  const file = composeFile(root);
  if (!existsSync(file)) throw new Error(`Missing ${COMPOSE}`);
  const project = resolve(root);
  return spawnSync(
    'docker',
    ['compose', '-f', file, ...args],
    {
      encoding: 'utf8',
      windowsHide: true,
      maxBuffer: 32 * 1024 * 1024,
      timeout: options.timeout,
      env: { ...process.env, GRAPH_PROJECT: project, ...env },
      cwd: root,
    }
  );
}

export function up(root) {
  const r = compose(root, ['up', '-d', '--build']);
  sleep(2500);
  return r;
}

export function down(root) {
  return compose(root, ['down']);
}

export function ps(root) {
  return compose(root, ['ps']);
}

export function execIn(root, service, cmd, options = {}) {
  return compose(root, ['exec', '-T', service, ...cmd], {}, options);
}
