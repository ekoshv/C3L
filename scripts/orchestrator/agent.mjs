import { spawnSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';

export function invokeAgent(prompt, turns, logFile, label = 'agent') {
  const args = [
    '-p', prompt,
    '--dangerously-skip-permissions',
    '--max-turns', String(turns),
    '--output-format', 'text'
  ];

  appendFileSync(logFile, `\n\n=== agent call: ${label} (max-turns=${turns}) ===\n`);
  console.log(`[agent] ${label}: start (max-turns=${turns})`);
  const result = spawnSync('claude', args, {
    encoding: 'utf8',
    windowsHide: true,
    maxBuffer: 64 * 1024 * 1024
  });

  const out = (result.stdout || '') + (result.stderr || '');
  appendFileSync(logFile, out);
  const maxTurns = /Reached max turns/i.test(out);
  const status = maxTurns ? 'max turns' : result.status === 0 ? 'done' : `exit ${result.status ?? 1}`;
  console.log(`[agent] ${label}: ${status}`);
  return {
    ok: result.status === 0,
    status: result.status ?? 1,
    output: out,
    maxTurns,
  };
}
