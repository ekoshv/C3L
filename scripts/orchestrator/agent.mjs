import { spawnSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';

export function invokeAgent(prompt, turns, logFile) {
  const args = [
    '-p', prompt,
    '--dangerously-skip-permissions',
    '--max-turns', String(turns),
    '--output-format', 'text'
  ];

  appendFileSync(logFile, `\n\n=== agent call (max-turns=${turns}) ===\n`);
  const result = spawnSync('claude', args, {
    encoding: 'utf8',
    windowsHide: true,
    maxBuffer: 64 * 1024 * 1024
  });

  const out = (result.stdout || '') + (result.stderr || '');
  appendFileSync(logFile, out);
  return { ok: result.status === 0, output: out };
}
