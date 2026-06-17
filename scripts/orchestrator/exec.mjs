import { spawnSync } from 'node:child_process';

const isWin = process.platform === 'win32';

export function runCommand(cmd, cwd) {
  const result = spawnSync(cmd, {
    cwd,
    shell: true,
    encoding: 'utf8',
    windowsHide: true,
    maxBuffer: 32 * 1024 * 1024
  });
  const output = (result.stdout || '') + (result.stderr || '');
  return { ok: result.status === 0, code: result.status ?? 1, output };
}

export function runHealth(cfg, command) {
  return runCommand(command || cfg.health_command, cfg.root);
}
