function shortList(files, max = 8) {
  if (!files?.length) return '(none)';
  const shown = files.slice(0, max).join(', ');
  return files.length > max ? `${shown}, +${files.length - max} more` : shown;
}

export function printFileDiff(prefix, diff) {
  const total =
    (diff.created?.length || 0) + (diff.modified?.length || 0) + (diff.deleted?.length || 0);
  if (!total) {
    console.log(`${prefix} files changed: none`);
    return;
  }
  if (diff.created?.length) console.log(`${prefix} files created: ${shortList(diff.created)}`);
  if (diff.modified?.length) console.log(`${prefix} files modified: ${shortList(diff.modified)}`);
  if (diff.deleted?.length) console.log(`${prefix} files deleted: ${shortList(diff.deleted)}`);
}

export function printFailureSummary(prefix, evidence) {
  if (!evidence) return;
  const file = evidence.failure?.file || 'unknown file';
  const test = evidence.failure?.name || 'unknown test';
  console.log(`${prefix} hurdle: ${file} :: ${test}`);
  const facts = evidence.diagnostics?.facts || [];
  for (const fact of facts.slice(0, 4)) console.log(`${prefix} fact: ${fact}`);
  if (evidence.scopeFiles?.length) {
    console.log(`${prefix} allowed scope: ${shortList(evidence.scopeFiles, 6)}`);
  }
}

export function printAgentResult(prefix, agent) {
  const status = agent.maxTurns ? 'max turns reached' : agent.ok ? 'finished' : `exit ${agent.status}`;
  console.log(`${prefix} agent: ${status}`);
  const lines = (agent.output || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const useful = lines.find((l) =>
    /all .*pass|health .*green|complete|success|root cause|files created/i.test(l)
  );
  if (useful) console.log(`${prefix} agent note: ${useful.slice(0, 180)}`);
}
