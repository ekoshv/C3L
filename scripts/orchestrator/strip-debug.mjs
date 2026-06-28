import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

const isTestFile = (f) => /(^|\/)tests?\//i.test(f) || /\.test\.[mc]?js$/i.test(f);

// A line that is ONLY a single-line console.* debug call. Pure-logic modules
// never need these; small models keep leaving them and they pollute test output
// and waste fix turns. We remove them deterministically (not by model judgment).
const DEBUG_LINE = /^\s*console\.(log|debug|info|warn|error|trace)\s*\([\s\S]*\)\s*;?\s*$/;

export function stripDebugLogs(root, files = []) {
  let removed = 0;
  for (const f of files) {
    if (!f || isTestFile(f)) continue;
    const p = join(root, f);
    if (!existsSync(p) || !statSync(p).isFile()) continue;
    const lines = readFileSync(p, 'utf8').split(/\r?\n/);
    const kept = lines.filter((l) => !DEBUG_LINE.test(l));
    if (kept.length !== lines.length) {
      writeFileSync(p, kept.join('\n'));
      removed += lines.length - kept.length;
    }
  }
  return removed;
}
