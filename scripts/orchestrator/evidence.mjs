import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { parseFailingTests } from './active.mjs';
import { resolveGraphFacts } from './graph-resolver.mjs';
import { rankGraphFacts, renderGraphFacts } from './graph-ranker.mjs';
import { diagnoseFailure } from './diagnostics.mjs';

function norm(path) {
  return path.replace(/\\/g, '/');
}

export function firstFailure(output) {
  const file = parseFailingTests(output)[0] || null;
  const match = (output || '').match(/^✖\s+(.+?)\s+\(/m);
  return { file, name: match?.[1] || 'unknown' };
}

export function extractImportSpecifiers(source) {
  const specs = [];
  for (const m of (source || '').matchAll(/import\s+[^'"]*['"]([^'"]+)['"]/g)) {
    if (m[1].startsWith('.')) specs.push(m[1]);
  }
  return specs;
}

export function extractImports(root, file) {
  const abs = join(root, file);
  if (!existsSync(abs)) return [];
  const base = dirname(abs);
  return extractImportSpecifiers(readFileSync(abs, 'utf8'))
    .map((spec) => norm(relative(root, resolve(base, spec))));
}

export function completedAnalyses(text, limit = 3) {
  return (text || '')
    .split(/\n---\n/)
    .filter((block) => /root_cause:/i.test(block) && /do_not_repeat:/i.test(block))
    .slice(-limit);
}

export function integrationScope(root, milestone, failingTests = []) {
  const files = new Set([...(milestone?.files || []), ...failingTests]);
  for (const file of [...files]) {
    for (const imported of extractImports(root, file)) files.add(imported);
  }
  return [...files].filter(Boolean);
}

export function buildEvidence(cfg, output, milestone) {
  const failure = firstFailure(output);
  const failingTests = parseFailingTests(output);
  const baseScope = integrationScope(cfg.root, milestone, failingTests);
  const seed = { failure, failingTests, scopeFiles: baseScope };
  const resolved = resolveGraphFacts(cfg, milestone, seed);
  const ranked = rankGraphFacts(resolved.facts, seed, cfg);
  const scopeFiles = [...new Set([...baseScope, ...ranked.scopeFiles])];
  const diagnostics = diagnoseFailure(cfg, output, { ...seed, scopeFiles });
  return {
    failure,
    failingTests,
    scopeFiles,
    diagnostics,
    graph: {
      available: resolved.available,
      status: resolved.status,
      scopeFiles: ranked.scopeFiles,
      facts: ranked.promptFacts,
      text: renderGraphFacts(ranked.promptFacts),
      omitted: ranked.omitted,
    },
  };
}
