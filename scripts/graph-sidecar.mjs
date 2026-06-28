#!/usr/bin/env node
/** CLI: start | stop | status | init | context — Docker CodeGraph + Graphify sidecar. */
import { loadConfig } from './orchestrator/config.mjs';
import { dockerOk, up, down, ps, execIn } from './graph-sidecar/docker.mjs';
import { initGraphs, fetchGraphContext } from './graph-sidecar/context.mjs';
import { nextIncomplete } from './orchestrator/milestones.mjs';
import { resolve } from 'node:path';

const root = process.cwd();
const cmd = process.argv[2] || 'status';

function fail(msg) {
  console.error(`[graph-sidecar] ${msg}`);
  process.exit(1);
}

if (!dockerOk()) fail('Docker not running. Start Docker Desktop first.');

if (cmd === 'up' || cmd === 'start') {
  const r = up(root);
  process.stdout.write(r.stdout || r.stderr || '');
  console.log(r.status === 0 ? '[graph-sidecar] containers up' : '[graph-sidecar] up failed');
  process.exit(r.status ?? 1);
}

if (cmd === 'down' || cmd === 'stop') {
  const r = down(root);
  console.log(r.status === 0 ? '[graph-sidecar] stopped' : '[graph-sidecar] stop failed');
  process.exit(r.status ?? 1);
}

if (cmd === 'status') {
  const r = ps(root);
  process.stdout.write(r.stdout || '');
  process.exit(r.status ?? 1);
}

if (cmd === 'init') {
  up(root);
  const res = initGraphs(root);
  console.log(res.log);
  if (!res.ok) {
    console.error(res.detail || '');
    process.exit(1);
  }
  console.log('[graph-sidecar] indexes ready under .codegraph/ and graphify-out/');
  process.exit(0);
}

if (cmd === 'context') {
  const projectRoot = process.env.GRAPH_PROJECT
    ? resolve(process.env.GRAPH_PROJECT)
    : root;
  const cfg = loadConfig(projectRoot);
  const m = nextIncomplete(projectRoot, cfg.milestones);
  console.log(fetchGraphContext(root, m));
  process.exit(0);
}

if (cmd === 'mcp-hint') {
  const compose = 'docker-compose.graph.yml';
  console.log(JSON.stringify({
    codegraph: {
      command: 'docker',
      args: ['compose', '-f', compose, 'exec', '-T', 'codegraph', 'codegraph', 'serve', '--mcp'],
    },
    graphify: {
      command: 'docker',
      args: ['compose', '-f', compose, 'exec', '-T', 'graphify', 'graphify-mcp'],
    },
  }, null, 2));
  process.exit(0);
}

fail(`Unknown command: ${cmd}. Use: up | down | status | init | context | mcp-hint`);
