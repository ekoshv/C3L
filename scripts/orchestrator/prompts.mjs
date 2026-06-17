function tail(text, lines = 40) {
  return (text || '').trim().split('\n').slice(-lines).join('\n');
}

export function implementPrompt(cfg, milestone) {
  const list = milestone.files.map((f) => `- ${f}`).join('\n');
  return `Create milestone ${milestone.id} (${milestone.title}).

Spec: ${milestone.spec}

Create exactly these files:
${list}

Hard rules:
- Keep every file under 100 lines.
- Node ESM only (import/export).
- Tests use node:test and node:assert/strict. Pure logic only, NO DOM/browser.
- Do NOT read or edit unrelated files. Do NOT refactor existing modules.
- When done, run: ${cfg.health_quick}
Stop as soon as ${cfg.health_quick} passes.`;
}

export function fixPrompt(cfg, output) {
  return `The health check "${cfg.health_quick}" is FAILING. Fix it.

Step 1: read watchdog.md and failed_attempts.log.
Step 2: from the output below, find the FIRST failing test or error and fix ONLY
the source file it points to. Do not edit test files unless the test is provably wrong.
Step 3: do NOT repeat any approach listed in failed_attempts.log.
Step 4: run ${cfg.health_quick} and stop as soon as it passes.

Do not re-read files you have already read. Be direct.

Failing output (tail):
${tail(output)}`;
}
