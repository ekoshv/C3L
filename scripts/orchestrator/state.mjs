import { createHash } from 'node:crypto';
import { existsSync, statSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

export function listSourceFiles(root, dirs = ['src', 'tests']) {
  const out = [];
  const walk = (dir) => {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(js|mjs|json)$/.test(entry.name)) {
        out.push(relative(root, full).replace(/\\/g, '/'));
      }
    }
  };
  for (const d of dirs) walk(join(root, d));
  return out;
}

export function fingerprint(output) {
  const normalized = (output || '')
    .replace(/\d+(\.\d+)?ms/g, 'Nms')
    .replace(/:\d+:\d+/g, ':L:C')
    .replace(/\d+/g, 'N')
    .replace(/\s+/g, ' ')
    .trim();
  return createHash('sha1').update(normalized).digest('hex').slice(0, 12);
}

export function snapshotFiles(root, files) {
  return files
    .map((f) => {
      const p = join(root, f);
      if (!existsSync(p)) return `${f}:absent`;
      return `${f}:${statSync(p).mtimeMs}:${statSync(p).size}`;
    })
    .join('|');
}

export function signatureMap(root, files) {
  const out = new Map();
  for (const f of files) {
    const p = join(root, f);
    out.set(f, existsSync(p) ? `${statSync(p).mtimeMs}:${statSync(p).size}` : 'absent');
  }
  return out;
}

export function diffSignatures(before, after) {
  const files = new Set([...before.keys(), ...after.keys()]);
  const diff = { created: [], modified: [], deleted: [] };
  for (const f of files) {
    const a = before.get(f) || 'absent';
    const b = after.get(f) || 'absent';
    if (a === b) continue;
    if (a === 'absent') diff.created.push(f);
    else if (b === 'absent') diff.deleted.push(f);
    else diff.modified.push(f);
  }
  return diff;
}

export function shouldAbort(counters, limits) {
  return (
    counters.sameErrorStreak >= limits.same_error_limit ||
    counters.noEditStreak >= limits.stall_limit ||
    counters.implNoProgress >= limits.impl_attempt_limit ||
    counters.maxTurnStreak >= (limits.max_turn_limit || 2)
  );
}

export function abortReason(counters, limits) {
  if (counters.maxTurnStreak >= (limits.max_turn_limit || 2))
    return `agent reached max turns ${counters.maxTurnStreak}x`;
  if (counters.sameErrorStreak >= limits.same_error_limit)
    return `same error fingerprint repeated ${counters.sameErrorStreak}x`;
  if (counters.noEditStreak >= limits.stall_limit)
    return `no file changes for ${counters.noEditStreak} iterations`;
  if (counters.implNoProgress >= limits.impl_attempt_limit)
    return `milestone made no progress for ${counters.implNoProgress} attempts`;
  return 'unknown';
}
