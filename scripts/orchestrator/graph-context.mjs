import { fetchGraphContext, initGraphs } from '../graph-sidecar/context.mjs';
import { up, dockerOk } from '../graph-sidecar/docker.mjs';

export function ensureGraphSidecar(cfg) {
  if (!cfg.graph_sidecar && !cfg.graph_required) return { ok: true, skipped: true };
  if (!dockerOk()) {
    console.warn('[orch] graph_sidecar enabled but Docker unavailable — skipping');
    return { ok: false, skipped: true };
  }
  const u = up(cfg.root);
  if (u.status !== 0) return { ok: false, detail: u.stderr || u.stdout };
  const init = initGraphs(cfg.root);
  if (!init.ok) console.warn('[orch] graph init partial:', init.log);
  return { ok: true, init: init.log };
}

export function graphContextBlock(cfg, milestone) {
  if (!(cfg.graph_sidecar || cfg.graph_auto || cfg.graph_required) || !dockerOk()) return '';
  const block = fetchGraphContext(cfg.root, milestone, { timeout: cfg.graph_query_timeout_ms || 15000 });
  return block ? `\n${block}\n` : '';
}
