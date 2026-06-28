import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { parseFailingTests } from './active.mjs';
import { projectProbe } from './diagnostic-probe.mjs';
import { renderDiagnostics } from './diagnostic-render.mjs';

const MAX_FACTS = 10;

function isFile(p) {
  return existsSync(p) && statSync(p).isFile();
}

function norm(path) {
  return path.replace(/\\/g, '/');
}

function firstMatch(text, patterns) {
  for (const p of patterns) {
    const m = (text || '').match(p);
    if (m) return m;
  }
  return null;
}

export function failureDetails(output) {
  const loc = firstMatch(output, [
    /test at ([^\s:]+\.js):(\d+):\d+/,
    /file:\/\/\/?(.+?\.js):(\d+):\d+/
  ]);
  const name = firstMatch(output, [
    /^\s*\u2716\s+(.+?)\s+\(/m,
    /^\s*not ok \d+\s+-\s+(.+)$/m
  ]);
  const actual = firstMatch(output, [/actual:\s*([^,\n]+)/]);
  const expected = firstMatch(output, [/expected:\s*([^,\n]+)/]);
  const operator = firstMatch(output, [/operator:\s*'([^']+)'/]);
  return {
    file: loc ? norm(loc[1]).replace(/^.*?(tests\/)/, 'tests/') : parseFailingTests(output)[0],
    line: loc ? Number(loc[2]) : null,
    name: name?.[1]?.trim() || 'unknown',
    actual: actual?.[1]?.trim(),
    expected: expected?.[1]?.trim(),
    operator: operator?.[1],
  };
}

function lineWindow(root, file, line, radius = 7) {
  if (!file || !line) return [];
  const p = join(root, file);
  if (!isFile(p)) return [];
  const lines = readFileSync(p, 'utf8').split(/\r?\n/);
  const start = Math.max(1, line - radius);
  const end = Math.min(lines.length, line + radius);
  return lines.slice(start - 1, end).map((text, i) => `${start + i}: ${text}`);
}

function importedFiles(root, file) {
  const p = join(root, file || '');
  if (!isFile(p)) return [];
  const base = dirname(p);
  const text = readFileSync(p, 'utf8');
  return [...text.matchAll(/import\s+[^'"]*['"]([^'"]+)['"]/g)]
    .map((m) => m[1])
    .filter((s) => s.startsWith('.'))
    .map((s) => norm(relative(root, resolve(base, s))));
}

function scanSources(root, files) {
  const facts = [];
  for (const file of files.filter((f) => f && !f.startsWith('tests/'))) {
    const p = join(root, file);
    if (!isFile(p)) continue;
    const lines = readFileSync(p, 'utf8').split(/\r?\n/);
    lines.forEach((line, idx) => {
      const lno = idx + 1;
      if (/throw new Error\([^)]*not implemented|TODO|return\s+(undefined|null|false)\b/.test(line))
        facts.push(`${file}:${lno} placeholder or sentinel return may be unfinished.`);
      if (/if\s*\([^)]*(?:[<>]=?\s*0|0\s*[<>]=?)[^)]*(?:&&|\|\|)[^)]*(?:[<>]=?\s*0|0\s*[<>]=?)/.test(line))
        facts.push(`${file}:${lno} boundary guard combines zero checks; verify edge-state behavior.`);
      if (/\bconsole\.(log|debug|dir|table)\s*\(/.test(line))
        facts.push(`${file}:${lno} debug console output is still present; remove it before trusting test output.`);
    });
  }
  return facts.slice(0, 5);
}

function classify(output, detail, context) {
  const facts = [];
  if (/ERR_MODULE_NOT_FOUND|Cannot find module/.test(output)) facts.push('Import/file resolution failure: verify path, extension, and exported file exists.');
  if (/SyntaxError|Duplicate export|Identifier .* already been declared/.test(output)) facts.push('Syntax/module shape failure: inspect the first parser error before logic changes.');
  if (/ReferenceError: Cannot access '([^']+)' before initialization/.test(output)) facts.push('Initialization-order failure: a local binding is used before it is declared or imported.');
  if (/TypeError: .* is not a function/.test(output)) facts.push('API mismatch: imported symbol exists but is not exported as the test expects.');
  if (/\bNaN\b|Infinity/.test(output)) facts.push('Invalid numeric state appears in output; probe the first non-finite input and guard missing data.');
  if (detail.actual === 'false' && detail.expected === 'true') facts.push('Boolean invariant stayed false; inspect the state transition that should make it true.');
  if (detail.actual && detail.expected && /[-\d.]+/.test(detail.actual + detail.expected)) facts.push('Numeric mismatch: run a tiny probe that prints inputs, outputs, and boundary values.');
  if (/for\s*\(|while\s*\(/.test(context.join('\n')) && /eventually|until|stopped|reaches|becomes/i.test(context.join('\n')))
    facts.push('Loop/convergence test: print final state after the loop, not only the thrown assertion.');
  return facts;
}

export function diagnoseFailure(cfg, output, seed = {}) {
  const detail = { ...failureDetails(output), ...(seed.failure || {}) };
  const context = lineWindow(cfg.root, detail.file, detail.line);
  const imports = importedFiles(cfg.root, detail.file);
  const scope = [...new Set([...(seed.scopeFiles || []), detail.file, ...imports].filter(Boolean))];
  const facts = [
    ...classify(output, detail, context),
    ...scanSources(cfg.root, scope),
    ...projectProbe(cfg, { failure: detail, scopeFiles: scope, outputTail: output.split(/\r?\n/).slice(-80).join('\n') })
  ].slice(0, MAX_FACTS);
  return { detail, context, imports, facts, text: renderDiagnostics({ detail, context, imports, facts }) };
}

export { renderDiagnostics };
