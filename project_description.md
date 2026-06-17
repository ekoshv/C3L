---
name: My Autonomous Project
version: 0.1.0
health_quick: npm run health
health_full: npm run health:full
loop_tier: quick
loop_interval: 5m
goal_max_turns: 12
claude_max_turns: 45
budget_usd: 10.00
log_dir: logs
impl_turns: 12
fix_turns: 8
max_iterations: 40
same_error_limit: 2
stall_limit: 2
impl_attempt_limit: 3
---

# My Autonomous Project

## Vision

Describe what you are building, in plain language. Keep it concrete. The orchestrator
implements one milestone at a time, so order them from foundation to features.

## Quality rules

- 100-line limit per code file (see CLAUDE.md).
- Pure-logic modules with Node tests are easiest for a small local model to finish
  and for the test runner to verify deterministically (avoid DOM/browser in tests).
- Put assertions inside it()/test() blocks, never directly in a describe() body.
- Fix only the failing layer on errors; read watchdog.md + failed_attempts.log first.

## Milestones (implement in order)

Each milestone below MUST also be listed in scripts/milestones.json with its exact
required files — that file is the machine-checkable source of truth for "done".

### M1 — <first milestone title>
- src/<module>.js — <what it exports / does>.
- tests/<module>.test.js — <what it asserts>.

### M2 — <second milestone title>
- src/<module2>.js — ...
- tests/<module2>.test.js — ...

## How autonomy works

The launcher runs node scripts/orchestrator.mjs, which loops deterministically:

1. Run health_quick. If it fails, make one short model fix call (fix_turns), re-check.
2. If green, find the next incomplete milestone from milestones.json (by file
   existence) and make one short model implement call (impl_turns).
3. When all milestones exist and health_full is green, STOP with SUCCESS.
4. Deterministic loop-breakers (same error / no edits / no progress / max iterations)
   force a STOP with a written failed_attempts.log for human review.
