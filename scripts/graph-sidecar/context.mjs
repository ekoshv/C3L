import { spawnSync } from 'node:child_process';
import { execIn } from './docker.mjs';
import { resolve } from 'node:path';

const MAX = 6000;

function tail(text, n = MAX) {
  const t = (text || '').trim();
  return t.length <= n ? t : t.slice(0, n) + '\n…[truncated]';
}

function sleep(ms) {
  spawnSync('powershell', ['-Command', `Start-Sleep -Milliseconds ${ms}`], {
    windowsHide: true,
    stdio: 'ignore',
  });
}

function run(root, service, cmd, tries = 3, timeout = 15000) {
  for (let i = 0; i < tries; i++) {
    const r = execIn(root, service, cmd, { timeout });
    const out = (r.stdout || '') + (r.stderr || '');
    if (r.status === 0) return { ok: true, out };
    if (!/not running/i.test(out)) return { ok: false, out };
    sleep(1500);
  }
  return { ok: false, out: `service ${service} not ready` };
}

export function initGraphs(root) {
  const steps = [
    ['codegraph', ['codegraph', 'init', '/workspace']],
    ['graphify', ['graphify', 'update', '/workspace', '--no-cluster']],
    ['graphify', ['graphify', 'cluster-only', '/workspace', '--no-label']],
  ];
  const log = [];
  for (const [svc, cmd] of steps) {
    const r = run(root, svc, cmd);
    log.push(`[${svc}] ${cmd.join(' ')} -> exit ${r.ok ? 0 : 1}`);
    if (!r.ok && svc === 'codegraph') return { ok: false, log: log.join('\n'), detail: r.out };
  }
  return { ok: true, log: log.join('\n') };
}

export function fetchGraphContext(root, milestone, options = {}) {
  const q = milestone
    ? `${milestone.id} ${milestone.title} ${(milestone.files || []).join(' ')}`
    : 'project architecture';
  const timeout = options.timeout || 15000;
  const cg = run(root, 'codegraph', ['codegraph', 'explore', q], 3, timeout);
  const gf = run(root, 'graphify', ['graphify', 'query', q.slice(0, 120)], 3, timeout);
  if (!cg.ok && !gf.ok) return '';
  return [
    '## Pre-indexed graph context (Docker sidecar — treat as already read)',
    cg.ok ? tail(cg.out) : '',
    gf.ok ? `\n### Graphify search\n${tail(gf.out, 2000)}` : '',
  ].filter(Boolean).join('\n\n');
}
