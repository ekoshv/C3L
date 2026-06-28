# Reliability-First Orchestrator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `claude_local` reliably guide small/local models through evidence-based fix cycles instead of repeated narration and stale-hint loops.

**Architecture:** Add deterministic evidence, journal, hint, and attempt gates around existing orchestrator calls. Keep the orchestrator modular and under the 100-line file convention by adding focused helper modules instead of expanding `fix-cycle.mjs` and `prompts.mjs` heavily.

**Tech Stack:** Node.js ESM, `node:test`, `node:assert/strict`, existing `npm run health` gate, no new runtime dependencies.

## Global Constraints

- Keep code files at or under 100 lines where practical.
- Node ESM only; include `.js` or `.mjs` import extensions.
- Do not commit unless the user explicitly asks.
- Preserve current public launcher behavior: `run-watchdog.ps1`, `run-watchdog.sh`, and `node scripts/orchestrator.mjs`.
- Optimize for local/small model reliability over speed.

---

## File Structure

- Create `scripts/orchestrator/evidence.mjs`: builds compact evidence bundles from health output, milestone metadata, imports, journals, and graph context.
- Create `scripts/orchestrator/attempt.mjs`: classifies agent outcomes, detects max-turn exits, false success claims, and no-edit attempts.
- Create `tests/orchestrator-evidence.test.js`: covers failing-test parsing, import extraction, journal filtering, and integration scope expansion.
- Create `tests/orchestrator-attempt.test.js`: covers max-turn and false-success classification.
- Modify `scripts/orchestrator/hints.mjs`: make hint matching milestone/file aware.
- Modify `scripts/orchestrator/journal.mjs`: expose completed-analysis filtering and latest-block analysis checks.
- Modify `scripts/orchestrator/learn.mjs`: verify analyzer wrote structured learning; retry narrow prompt once when missing.
- Modify `scripts/orchestrator/prompts.mjs`: replace vague fix prompt with evidence-contract prompt.
- Modify `scripts/orchestrator/recovery-prompt.mjs`: use the same evidence-contract style for recovery.
- Modify `scripts/orchestrator/fix-cycle.mjs`: run evidence build, invoke patch prompt, classify attempt, run targeted then full health.
- Modify `scripts/orchestrator/config.mjs`: parse optional integration budgets.

## Task 1: Evidence Bundle Module

**Files:**
- Create: `scripts/orchestrator/evidence.mjs`
- Test: `tests/orchestrator-evidence.test.js`

**Interfaces:**
- Produces: `buildEvidence(cfg, output, milestone)` returning `{ failingTests, firstError, scopeFiles, journal, skills, graph }`.
- Produces: `extractImports(root, file)` returning normalized relative source import paths.
- Produces: `completedAnalyses(text, limit)` returning only journal blocks with `root_cause:` and `do_not_repeat:`.

- [ ] **Step 1: Write failing tests for evidence extraction**

```javascript
import test from 'node:test';
import assert from 'node:assert/strict';

import { completedAnalyses, firstFailure, extractImportSpecifiers } from '../scripts/orchestrator/evidence.mjs';

test('completedAnalyses ignores placeholder journal blocks', () => {
  const text = `
---
[orchestrator]
[model: append below with root_cause and do_not_repeat]
---
[orchestrator]
root_cause: real issue
do_not_repeat:
- old bad fix
`;
  const blocks = completedAnalyses(text, 3);
  assert.equal(blocks.length, 1);
  assert.match(blocks[0], /real issue/);
});

test('firstFailure extracts test name and file', () => {
  const output = 'test at tests\\\\app.test.js:41:1\\n✖ velocity decreases more gradually with ABS (0.2ms)';
  assert.deepEqual(firstFailure(output), {
    file: 'tests/app.test.js',
    name: 'velocity decreases more gradually with ABS',
  });
});

test('extractImportSpecifiers returns local import paths only', () => {
  const src = "import test from 'node:test';\\nimport { Simulation } from '../src/app/simulation.js';";
  assert.deepEqual(extractImportSpecifiers(src), ['../src/app/simulation.js']);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/orchestrator-evidence.test.js`

Expected: FAIL with module not found or missing exports from `evidence.mjs`.

- [ ] **Step 3: Implement `evidence.mjs`**

```javascript
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, normalize, relative, resolve } from 'node:path';
import { parseFailingTests } from './active.mjs';
import { graphContextBlock } from './graph-context.mjs';

export function firstFailure(output) {
  const file = parseFailingTests(output)[0] || null;
  const match = (output || '').match(/^✖\s+(.+?)\s+\(/m);
  return { file, name: match?.[1] || 'unknown' };
}

export function extractImportSpecifiers(source) {
  const specs = [];
  for (const m of source.matchAll(/import\s+[^'"]*['"]([^'"]+)['"]/g)) {
    if (m[1].startsWith('.')) specs.push(m[1]);
  }
  return specs;
}

export function extractImports(root, file) {
  const abs = join(root, file);
  if (!existsSync(abs)) return [];
  const base = dirname(abs);
  return extractImportSpecifiers(readFileSync(abs, 'utf8'))
    .map((s) => relative(root, resolve(base, s)).replace(/\\/g, '/'));
}

export function completedAnalyses(text, limit = 3) {
  return (text || '').split(/\n---\n/)
    .filter((b) => /root_cause:/i.test(b) && /do_not_repeat:/i.test(b))
    .slice(-limit);
}

export function integrationScope(root, milestone, failingTests = []) {
  const files = new Set([...(milestone?.files || []), ...failingTests]);
  for (const f of [...files]) for (const imp of extractImports(root, f)) files.add(normalize(imp).replace(/\\/g, '/'));
  return [...files].filter(Boolean);
}

export function buildEvidence(cfg, output, milestone) {
  const failure = firstFailure(output);
  const failingTests = parseFailingTests(output);
  const scopeFiles = integrationScope(cfg.root, milestone, failingTests);
  const graph = graphContextBlock(cfg, milestone);
  return { failure, failingTests, scopeFiles, graph };
}
```

- [ ] **Step 4: Run evidence tests**

Run: `node --test tests/orchestrator-evidence.test.js`

Expected: PASS.

## Task 2: Journal Filtering and Analyzer Gate

**Files:**
- Modify: `scripts/orchestrator/journal.mjs`
- Modify: `scripts/orchestrator/learn.mjs`
- Test: `tests/orchestrator-evidence.test.js`

**Interfaces:**
- Produces: `latestAnalysisComplete(root)` returning boolean.
- Changes: `journalContext(root)` includes only completed analyses plus learned skills.

- [ ] **Step 1: Add tests for completed journal context**

```javascript
import { journalContextFromText } from '../scripts/orchestrator/journal.mjs';

test('journalContextFromText excludes incomplete orchestrator placeholders', () => {
  const ctx = journalContextFromText('---\\n[orchestrator]\\n[model: append below]\\n---\\nroot_cause: x\\ndo_not_repeat:\\n- y');
  assert.match(ctx, /root_cause: x/);
  assert.doesNotMatch(ctx, /append below/);
});
```

- [ ] **Step 2: Implement filtering helpers**

```javascript
export function completedJournalBlocks(text, limit = 3) {
  return (text || '').split(/\n---\n/)
    .filter((b) => /root_cause:/i.test(b) && /do_not_repeat:/i.test(b))
    .slice(-limit);
}

export function journalContextFromText(failText, skillsText = '') {
  const done = completedJournalBlocks(failText, 3).join('\n---\n') || '(empty)';
  return `--- completed failure analyses ---\n${done}\n\n--- learned_skills.log ---\n${skillsText || '(empty)'}`;
}
```

- [ ] **Step 3: Update `afterFailedAttempt` to verify analyzer writes**

After `invokeAgent(analyzeFailurePrompt(...))`, read the journal and check the latest block for both `root_cause:` and `do_not_repeat:`. If missing, invoke a short narrow prompt once. If still missing, append `analysis_missing: true`.

- [ ] **Step 4: Run health**

Run: `npm run health`

Expected: PASS.

## Task 3: Scoped Hints

**Files:**
- Modify: `scripts/orchestrator/hints.mjs`
- Modify: `scripts/orchestrator/prompts.mjs`
- Test: `tests/orchestrator-evidence.test.js`

**Interfaces:**
- Changes: `errorHints(output, ctx = {})`.
- Consumes: `{ milestone, failingTests, scopeFiles }`.

- [ ] **Step 1: Add tests rejecting broad app-test hints**

```javascript
import { errorHints } from '../scripts/orchestrator/hints.mjs';

test('normal app TestContext stack does not trigger top-level assertion hint', () => {
  const output = 'test at tests\\\\app.test.js:41:1\\n✖ velocity decreases (0.2ms)\\n at TestContext.<anonymous>';
  const hints = errorHints(output, { failingTests: ['tests/app.test.js'], scopeFiles: ['src/app/simulation.js'] });
  assert.doesNotMatch(hints, /module top level/);
});

test('ABS hints are limited to ABS files', () => {
  const hints = errorHints('slipRatio failed', { failingTests: ['tests/app.test.js'], scopeFiles: ['src/app/simulation.js'] });
  assert.doesNotMatch(hints, /omega_wheel/);
});
```

- [ ] **Step 2: Implement context-aware rules**

Use file-aware predicates:

```javascript
function hasAbsContext(ctx) {
  return [...(ctx.failingTests || []), ...(ctx.scopeFiles || [])].some((f) => /(^|\/)(abs|tests\/abs\.test\.js)/.test(f));
}

function importTimeAssertion(output) {
  return /triggerUncaughtException|describe\(\)[\s\S]*AssertionError/.test(output || '');
}
```

- [ ] **Step 3: Update prompt calls**

Pass evidence context into `errorHints(output, evidence)`.

- [ ] **Step 4: Run tests**

Run: `npm run health`

Expected: PASS.

## Task 4: Evidence-Based Prompts

**Files:**
- Modify: `scripts/orchestrator/prompts.mjs`
- Modify: `scripts/orchestrator/recovery-prompt.mjs`
- Test: existing health tests

**Interfaces:**
- Changes: `fixPrompt(cfg, output, milestone, evidence)`.
- Changes: `recoveryPrompt(cfg, ctx)` includes `ctx.evidence`.

- [ ] **Step 1: Replace the fix prompt contract**

The prompt must include the READ/PATCH/VERIFY/LEARN contract exactly:

```text
Required response sections:
READ:
PATCH:
VERIFY:
LEARN:

Do not claim success unless the command output in this run says it passed.
If you cannot finish, make the smallest useful edit and stop.
Do not output replacement code blocks unless you also edit files.
```

- [ ] **Step 2: Include compact evidence**

Prompt fields:

```text
First failure:
- test file
- test name
- error tail

Allowed scope:
- one file per line

Relevant completed analyses:
- last three completed journal blocks
```

- [ ] **Step 3: Run health**

Run: `npm run health`

Expected: PASS.

## Task 5: Attempt Classification and Fix Cycle Gates

**Files:**
- Create: `scripts/orchestrator/attempt.mjs`
- Modify: `scripts/orchestrator/agent.mjs`
- Modify: `scripts/orchestrator/fix-cycle.mjs`
- Test: `tests/orchestrator-attempt.test.js`

**Interfaces:**
- Produces: `classifyAttempt(agentResult, before, after, health)` returning `{ maxTurns, changed, falseSuccess, ok }`.
- Changes: `invokeAgent` returns `{ ok, status, output, maxTurns }`.

- [ ] **Step 1: Write attempt tests**

```javascript
import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyAttempt } from '../scripts/orchestrator/attempt.mjs';

test('classifyAttempt detects max turns', () => {
  const res = classifyAttempt({ output: 'Error: Reached max turns (8)', status: 1 }, 'a', 'a', { ok: false });
  assert.equal(res.maxTurns, true);
});

test('classifyAttempt detects false success claims', () => {
  const res = classifyAttempt({ output: 'health passes now', status: 0 }, 'a', 'b', { ok: false });
  assert.equal(res.falseSuccess, true);
});
```

- [ ] **Step 2: Implement `attempt.mjs`**

```javascript
export function classifyAttempt(agentResult, before, after, health) {
  const output = agentResult.output || '';
  const maxTurns = /Reached max turns/i.test(output);
  const changed = before !== after;
  const claimedPass = /health (check )?(is )?(fixed|green|pass|passes)|all tests .*pass/i.test(output);
  return {
    maxTurns,
    changed,
    falseSuccess: claimedPass && !health.ok,
    ok: health.ok,
  };
}
```

- [ ] **Step 3: Update `invokeAgent`**

Return the process status and `maxTurns` flag:

```javascript
return {
  ok: result.status === 0,
  status: result.status,
  output: out,
  maxTurns: /Reached max turns/i.test(out),
};
```

- [ ] **Step 4: Update `fix-cycle.mjs`**

Build evidence, invoke prompt with evidence, snapshot files in expanded scope, run targeted test when `evidence.failingTests[0]` exists, then run full health. Feed attempt classification into counters and journal entries.

- [ ] **Step 5: Run health**

Run: `npm run health`

Expected: PASS.

## Task 6: Integration Budgets and Scope

**Files:**
- Modify: `scripts/orchestrator/config.mjs`
- Modify: `scripts/orchestrator/fix-cycle.mjs`
- Modify: `project_description.md`
- Test: `tests/orchestrator-evidence.test.js`

**Interfaces:**
- Config keys: `integration_fix_turns`, `integration_recovery_turns`, `integration_analyze_turns`.
- Milestone mode: existing `mode` field may be `integration`.

- [ ] **Step 1: Add config parsing**

Add the three keys to the numeric config list with fallback behavior in call sites.

- [ ] **Step 2: Use integration turns**

When evidence scope has imports outside the active milestone or milestone mode is `integration`, choose integration budgets.

- [ ] **Step 3: Run health**

Run: `npm run health`

Expected: PASS.

## Task 7: End-to-End Verification

**Files:**
- Modify as needed from previous tasks only

- [ ] **Step 1: Run quick health**

Run: `npm run health`

Expected: PASS.

- [ ] **Step 2: Run full health**

Run: `npm run health:full`

Expected: PASS.

- [ ] **Step 3: Manual prompt sanity check**

Inspect generated fix/recovery prompts in code and confirm they include:

- `READ:`
- `PATCH:`
- `VERIFY:`
- `LEARN:`
- compact evidence
- no unfiltered placeholder journal spam

Expected: prompt text matches spec.

## Self-Review Notes

- Spec coverage: all spec sections map to tasks above.
- Placeholder scan: no task uses TBD/TODO or vague "add tests" language.
- Type consistency: `buildEvidence`, `classifyAttempt`, `completedAnalyses`, and `errorHints(output, ctx)` are defined before later tasks consume them.
- Commit steps are intentionally omitted because this environment must not commit unless explicitly requested by the user.
