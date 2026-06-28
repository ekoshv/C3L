export function classifyAttempt(agentResult, before, after, health) {
  const output = agentResult.output || '';
  const maxTurns = /Reached max turns/i.test(output);
  const changed = before !== after;
  const claimedPass =
    /health (check )?(is )?(fixed|green|pass|passes)|all tests .*pass/i.test(output);
  return {
    maxTurns,
    changed,
    falseSuccess: claimedPass && !health.ok,
    ok: health.ok,
  };
}

export function targetCommand(evidence) {
  const testFile = evidence?.failingTests?.[0];
  return testFile ? `node --test ${testFile}` : null;
}

function hasExpandedScope(milestone, evidence) {
  const allowed = new Set((milestone?.files || []).map((f) => f.replace(/\\/g, '/')));
  return (evidence?.scopeFiles || []).some((f) => !allowed.has(f.replace(/\\/g, '/')));
}

export function isIntegrationAttempt(milestone, evidence) {
  return milestone?.mode === 'integration' || hasExpandedScope(milestone, evidence);
}

export function turnsForFix(cfg, milestone, evidence) {
  return isIntegrationAttempt(milestone, evidence)
    ? (cfg.integration_fix_turns || cfg.fix_turns)
    : cfg.fix_turns;
}

export function turnsForRecovery(cfg, milestone, evidence) {
  return isIntegrationAttempt(milestone, evidence)
    ? (cfg.integration_recovery_turns || cfg.recovery_turns)
    : cfg.recovery_turns;
}

export function turnsForAnalyze(cfg, milestone, evidence) {
  return isIntegrationAttempt(milestone, evidence)
    ? (cfg.integration_analyze_turns || cfg.analyze_turns || 8)
    : (cfg.analyze_turns || 8);
}
