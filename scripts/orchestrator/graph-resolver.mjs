import { graphContextBlock } from './graph-context.mjs';

const FILE_RE = /(?:src|tests|scripts|docs)\/[\w./-]+\.(?:js|mjs|json|md)/g;

function sourceFor(line) {
  return /^NODE |^EDGE |Graphify/i.test(line) ? 'graphify' : 'codegraph';
}

function symbolFor(line) {
  return line.match(/`([^`]+)`/)?.[1] || line.match(/^NODE\s+([^\s[]+)/)?.[1] || null;
}

function relationFor(line) {
  const rel = line.match(/\)\s*-\s*(.+)$/)?.[1] || line.match(/--([^-]+)-->/)?.[1] || '';
  return rel.trim() || 'mentions';
}

export function parseGraphFacts(raw) {
  const facts = [];
  for (const line of (raw || '').split('\n')) {
    const files = line.match(FILE_RE) || [];
    for (const file of files) {
      facts.push({
        file: file.replace(/\\/g, '/'),
        symbol: symbolFor(line),
        relation: relationFor(line),
        reason: line.trim(),
        source: sourceFor(line),
      });
    }
  }
  return facts;
}

export function resolveGraphFacts(cfg, milestone, seed = {}) {
  const enabled = cfg?.graph_auto || cfg?.graph_sidecar || cfg?.graph_required;
  if (!enabled) return { available: false, status: 'unavailable', facts: [], raw: '' };
  const fetcher = cfg.graph_fetcher || ((c, m) => graphContextBlock(c, m));
  try {
    const raw = fetcher(cfg, milestone, seed) || '';
    const facts = parseGraphFacts(raw);
    return { available: facts.length > 0, status: facts.length ? 'ready' : 'partial', facts, raw };
  } catch (error) {
    if (cfg.graph_required) throw error;
    return { available: false, status: 'unavailable', facts: [], raw: '', error: String(error.message || error) };
  }
}
