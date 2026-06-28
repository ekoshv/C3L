# Reliability-First Orchestrator Design

## Purpose

Redesign `claude_local` so small/local models use available evidence more intelligently and stop wasting cycles on narration, stale hints, empty journals, and repeated phantom fixes.

The goal is reliability over speed. The orchestrator should do more deterministic work before and after each model call, and prompts should force the model into a read, patch, verify, and learn workflow with observable artifacts.

## Observations From Test006

The M4 integration milestone exposed workflow failures rather than only application-code failures:

- Agents repeatedly claimed `npm run health` passed while the orchestrator still observed red health.
- Many failed attempts produced only prose in logs, not file edits.
- `failure_journal.log` accumulated placeholder blocks, while only a few `root_cause` entries were actually persisted.
- Broad regex hints injected unrelated advice, such as ABS mode hints and top-level assertion warnings, into normal app integration failures.
- Learned skills from earlier milestones were reused without checking whether they applied to current files or symbols.
- Fix scope was too narrow for integration work because M4 depended on behavior from earlier milestones.
- Turn budgets were too small for local models to read tests, inspect imports, edit, and verify in one call.
- The graph sidecar supplied text context, but it was not filtered for the active failure and sometimes emphasized orchestrator infrastructure instead of project code.

## Design Principles

- Deterministic control owns the workflow. The model proposes and edits; Node verifies.
- Prompts should include compact, relevant evidence, not long noisy logs.
- No model claim counts as success unless the orchestrator verifies it.
- A failed attempt should either change tracked files, write structured learning, or be classified as non-progress.
- Integration milestones need dependency-aware scope, not only the milestone file list.
- Hints must be conservative and tied to concrete failing files or stack patterns.

## New Workflow

### Implement Cycle

For new milestones, keep the current single implement call, but change the prompt to require:

- read the milestone spec and exact file list
- create or update only missing milestone files
- run the quick health command
- report only files changed and verification result

If an implement call exits because of max turns or creates no new files, the orchestrator treats that as non-progress.

### Fix Cycle

Replace the current one-shot "Fix it" flow with deterministic phases:

1. `triage`: no edits. Identify the first failing test, relevant source imports, active invariant, and likely fix surface.
2. `patch`: edit only files in the evidence bundle and approved scope.
3. `targeted verify`: run the failing test file first.
4. `full verify`: run `npm run health` only after the targeted test passes.
5. `learn`: if still failing, append a structured root cause and do-not-repeat entry before the next attempt.

This makes local models solve one smaller problem at a time.

## Evidence Bundle

Before each fix or recovery prompt, the orchestrator builds a compact evidence bundle:

- active milestone id, title, mode, and spec
- failing test file paths parsed from health output
- first failing test name and error message
- direct source imports from failing test files
- active milestone files
- dependency scope for integration milestones
- last three completed failure analyses
- learned skills that mention active files or active symbols
- graph sidecar context only if it references active files or symbols

The bundle should avoid placeholder journal entries and unrelated graph output.

## Prompt Contract

Every fix prompt must require this response discipline:

```text
READ:
- files inspected
- invariant understood

PATCH:
- files changed
- why each change addresses the first failure

VERIFY:
- targeted command run
- full command run, if targeted passed
- observed result

LEARN:
- root cause, if still failing
- do_not_repeat entries, if still failing
```

The prompt must explicitly say:

- Do not claim health passed unless the command output in this run says it passed.
- If you cannot finish within the turn budget, write the smallest useful edit and stop.
- Do not output replacement code blocks unless you also edit the files.
- Do not rewrite tests unless they violate the milestone spec or mandatory test rules.

## Verification Gates

`invokeAgent` and `fix-cycle` should record and enforce:

- agent exit status
- whether stderr/stdout includes `Reached max turns`
- tracked file snapshot before and after
- whether targeted test passed
- whether full health passed
- whether a required journal entry was appended

If an agent exits on max turns, the attempt is not treated as a normal strategy failure. It should either retry with more turns for integration mode or enter recovery with a "budget exhausted" reason.

If the model claims success but full health is red, the orchestrator logs a "false success claim" fact and feeds it into the next prompt.

## Journal Rules

`failure_journal.log` should contain completed analyses, not mostly placeholders.

The orchestrator should:

- append an orchestrator block before analysis
- call the analyzer
- verify that the latest block now contains `root_cause:` and `do_not_repeat:`
- retry analysis once with a narrower prompt if missing
- mark the block `analysis_missing: true` if still missing

Prompt context should include only completed analyses by default.

## Hint Rules

Hints should be scoped:

- Test-structure hints fire only for syntax/import-time failures, not normal `TestContext` stack traces.
- ABS hints fire only for `tests/abs.test.js` or files under `src/abs`.
- UI/browser hints fire only for UI milestone files.
- Learned skills are injected only when they mention an active file, imported symbol, or failing test name.

Hints should be presented as "possible checks" unless the error pattern is exact.

## Integration Mode

Milestones with mode `pure-logic` but cross-module behavior, or explicit mode `integration`, should get wider scope:

- milestone files
- failing test files
- direct imports from failing tests
- direct imports from milestone source files
- `tests/test-utils.js` when imported

This lets the model fix wiring bugs without violating scope.

Integration mode should use larger budgets:

- `integration_fix_turns`: 24
- `integration_recovery_turns`: 32
- `integration_analyze_turns`: 12

Defaults can fall back to existing values when omitted.

## Graph Context

Graph context should be filtered before prompt injection:

- include only lines mentioning active files, active symbols, or failing test names
- cap by section, not raw tail length
- omit graph context entirely if no relevant lines remain

Graph output should help scoped navigation, not replace direct evidence from failing tests and imports.

## Testing Strategy

Add orchestrator unit tests for:

- parsing failing test names and paths
- extracting direct imports from a test file
- filtering completed journal analyses
- detecting missing analyzer writes
- rejecting broad hints for normal app test stack traces
- expanding scope for integration milestones
- detecting false success claims

Use `npm run health` as the final verification.

## Success Criteria

The redesign is successful when:

- M4-like failures receive a compact evidence bundle with the failing test and direct imports.
- Broad ABS/top-level-assertion hints no longer appear for normal app integration failures.
- A max-turn agent result is visible to the orchestrator and affects control flow.
- A failed fix attempt creates a completed journal entry or is marked as missing analysis.
- Models cannot silently "pass" by narration; orchestrator health remains the source of truth.
- Integration milestones can legally inspect and edit direct dependency files.
