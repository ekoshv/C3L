function norm(file) {
  return (file || '').replace(/\\/g, '/');
}

function isOrchestrator(file, evidence) {
  const f = norm(file);
  const orchFailure = [...(evidence.failingTests || []), ...(evidence.scopeFiles || [])]
    .some((p) => norm(p).startsWith('tests/orchestrator') || norm(p).startsWith('scripts/orchestrator'));
  return f.startsWith('scripts/orchestrator/') && !orchFailure;
}

function keywords(evidence) {
  return (evidence.failure?.name || '').toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 3);
}

export function scoreGraphFact(fact, evidence) {
  const file = norm(fact.file);
  if (isOrchestrator(file, evidence)) return 0;
  let score = 0;
  if ((evidence.failingTests || []).map(norm).includes(file)) score += 5;
  if ((evidence.scopeFiles || []).map(norm).includes(file)) score += 4;
  if (/calls|imports|depends|affects|blast/i.test(fact.relation || fact.reason || '')) score += 2;
  const hay = `${fact.symbol || ''} ${fact.reason || ''}`.toLowerCase();
  if (keywords(evidence).some((word) => hay.includes(word))) score += 2;
  if (fact.source === 'codegraph') score += 1;
  return score;
}

export function rankGraphFacts(facts, evidence, cfg = {}) {
  const limit = cfg.graph_prompt_facts || 8;
  const threshold = cfg.graph_scope_threshold || 3;
  const ranked = (facts || [])
    .map((fact) => ({ ...fact, score: scoreGraphFact(fact, evidence) }))
    .filter((fact) => fact.score > 0)
    .sort((a, b) => b.score - a.score || norm(a.file).localeCompare(norm(b.file)));
  const promptFacts = ranked.slice(0, limit);
  const scopeFiles = [...new Set(ranked
    .filter((fact) => fact.score >= threshold && fact.source === 'codegraph')
    .map((fact) => norm(fact.file)))];
  return { scopeFiles, promptFacts, omitted: Math.max(0, ranked.length - promptFacts.length) };
}

export function renderGraphFacts(facts) {
  if (!facts?.length) return '';
  const lines = facts.map((f) =>
    `- ${norm(f.file)}${f.symbol ? ` :: ${f.symbol}` : ''}; reason: ${f.relation || 'related'}`
  );
  return ['Graph facts (deterministically selected):', ...lines].join('\n');
}
