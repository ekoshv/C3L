import { spawnSync } from 'node:child_process';

// Robust test gate. Node's --test runner can exit 0 even when assertions throw
// inside a describe() body (it prints "failing tests:" but tallies fail 0). We
// therefore fail on ANY of: non-zero exit, a fail count > 0, or a failure marker.
const patterns = process.argv.slice(2);
const args = ['--test', ...(patterns.length ? patterns : ['tests/**/*.test.js'])];

const res = spawnSync(process.execPath, args, {
  encoding: 'utf8',
  windowsHide: true,
  maxBuffer: 64 * 1024 * 1024
});

const out = (res.stdout || '') + (res.stderr || '');
process.stdout.write(out);

function maxFailCount(text) {
  let n = 0;
  for (const m of text.matchAll(/^\s*(?:\u2139|#)?\s*fail\s+(\d+)\s*$/gm)) {
    n = Math.max(n, Number(m[1]));
  }
  return n;
}

const markers = /(failing tests:|\bnot ok\b|ERR_ASSERTION)/.test(out);
const failed = res.status !== 0 || maxFailCount(out) > 0 || markers;

if (failed) {
  console.error('[run-tests] FAILURES detected (exit nonzero)');
  process.exit(1);
}
console.log('[run-tests] all tests passed');
process.exit(0);
