import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

export function projectProbe(cfg, payload) {
  const hook = join(cfg.root, 'scripts', 'diagnostics', 'probe.mjs');
  if (!existsSync(hook)) return [];
  const res = spawnSync(process.execPath, [hook], {
    cwd: cfg.root,
    input: JSON.stringify(payload),
    encoding: 'utf8',
    windowsHide: true,
    timeout: cfg.diagnostic_probe_timeout_ms || 5000,
    maxBuffer: 512 * 1024
  });
  if (res.status !== 0) {
    const tail = (res.stderr || res.stdout || '').trim().split('\n').slice(-2).join(' ');
    return [`Project probe failed or timed out: ${tail}`];
  }
  const lines = (res.stdout || '').trim().split(/\r?\n/).filter(Boolean);
  const probeLines = lines.filter((line) => /\bprobe\b/i.test(line));
  return (probeLines.length ? probeLines : lines).slice(0, 8);
}
