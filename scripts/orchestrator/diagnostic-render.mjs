export function renderDiagnostics(diag) {
  const facts = diag.facts?.length
    ? diag.facts.map((f) => `- ${f}`).join('\n')
    : '- No deterministic suspects found; use the targeted test output.';
  const loc = diag.detail?.file
    ? `${diag.detail.file}${diag.detail.line ? ':' + diag.detail.line : ''}`
    : 'unknown';
  const ctx = diag.context?.length
    ? `\nTest context:\n${diag.context.slice(0, 16).join('\n')}`
    : '';
  const imports = diag.imports?.length
    ? `\nDirect test imports:\n${diag.imports.map((f) => `- ${f}`).join('\n')}`
    : '';
  return `Failure diagnostics (deterministic):
- location: ${loc}
- test: ${diag.detail?.name || 'unknown'}
- actual/expected/operator: ${diag.detail?.actual || '?'} / ${diag.detail?.expected || '?'} / ${diag.detail?.operator || '?'}

Diagnostic facts:
${facts}
${imports}${ctx}

Recommended probe:
- Run the targeted test first. For state/loop failures, print the final state at the failing assertion before patching.`;
}
