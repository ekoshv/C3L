# Project Memory — Autonomous AI Watchdog & Self-Healing System

This project runs an autonomous, self-healing loop under Claude Code. The goal is
uninterrupted operation for hours without human intervention, while avoiding
infinite failure cycles.

## Golden rules (always apply)

@watchdog.md

Before attempting any fix, read `watchdog.md` and `failed_attempts.log`. Never
repeat a strategy already recorded as failed.

## Architecture

Built for **small/local models** (e.g. LM Studio). The control loop is
deterministic code, NOT model judgment, so a weak model cannot spiral into
re-reading files or repeating a dead fix.

- **Project spec (`project_description.md`):** vision, milestones, and orchestrator
  config (turn caps, loop-breaker limits). Read before building.
- **Milestone manifest (`scripts/milestones.json`):** machine-checkable list of
  required files per milestone (how "done" is decided).
- **Orchestrator (`scripts/orchestrator/`):** the deterministic autonomous engine.
  Runs health checks itself, calls the model for ONE small scoped task per step
  with a tight turn cap, detects stalls, and decides completion.
- **Launchers (`run-watchdog.ps1`, `run-watchdog.sh`):** run
  `node scripts/orchestrator.mjs` (default), `--test` (one health check), or
  `--interactive`.
- **Skills (`/loop`, `/goal`):** still available for manual/interactive use, but the
  orchestrator is the primary autonomous driver because it does not depend on the
  model to manage the loop.

### Why deterministic control (local-model rule)
- The model never decides when to stop, retry, or that work is "done".
- Each model call is short, single-purpose, and bounded by `impl_turns`/`fix_turns`.
- Fresh context per call prevents the re-read spiral.
- Loop-breakers (`same_error_limit`, `stall_limit`, `impl_attempt_limit`,
  `max_iterations`) force a stop and write `failed_attempts.log`.

## Health-check command

Use tiered checks as the project grows. Prefer **quick** in `/loop`; run **full**
before merges or on a longer interval.

| Tier | Command | Runs |
|------|---------|------|
| Quick (default loop) | `npm run health` | tests only |
| Full (nightly / pre-merge) | `npm run health:full` | tests + build |

Implementation: `scripts/health-check.mjs`. Add steps there (lint, typecheck,
e2e) as complexity increases.

A health check is considered failed when it returns a non-zero exit code.

## Complex projects

When the codebase grows beyond a single app, follow these rules:

### Structure
- Split by domain: `src/scene/`, `src/api/`, `src/ui/` — not one giant file.
- Every code file ≤ 100 lines; refactor before adding features.
- One responsibility per module; export small, named functions.

### Watchdog tuning
- **Quick loop (5m):** `/loop "npm run health" --interval 5m`
- **Full loop (30m):** `/loop "npm run health:full" --interval 30m`
- On failure, `/goal` must fix **only the failing layer** (test vs build vs lint),
  not rewrite unrelated modules.

### Fixer scope (`/goal`)
1. Read the failing command output and identify the **first failing step**.
2. Limit edits to files referenced in the stack trace or test name.
3. If 3+ unrelated areas fail, stop and ask for human review — do not shotgun-fix.

### Monorepos
- Add per-package health scripts; run from package root or use `npm run health -w pkg`.
- Log failures with package name in `failed_attempts.log`.

## Self-healing workflow

1. `/loop` runs the health check on an interval (default 5m, use 30m for `health:full`).
2. On non-zero exit, `/loop` spawns `/goal` with a strict `--max-turns 12` budget.
3. `/goal` reads `watchdog.md` + `failed_attempts.log`, pivots to a new approach,
   applies the fix, and re-runs the health check to verify.
4. On success, delete `failed_attempts.log`. On repeated failure within budget,
   stop and wait for human review.

## Code structure conventions

- **100-line limit:** Keep every code file at or under 100 lines (excluding blank
  lines and comments). When a file grows beyond 100 lines, refactor it before
  continuing — split it into smaller, single-responsibility modules so each unit
  stays easy to read, test, and control.
- Extract cohesive logic into separate files/modules; prefer many small files over
  one large file. Keep functions focused and short.
- Refactors must be behavior-preserving: run the health check after splitting a
  file and confirm it still passes before moving on.
- This limit does not apply to docs, config, lockfiles, or generated files.

## State files

- `watchdog.md` — behavioral anti-loop rules (do not delete).
- `failed_attempts.log` — short-term memory of what did NOT work. Append on
  failure; delete only after a verified green health check.

## Safety

Long autonomous sessions are started with:

```bash
claude --dangerously-skip-permissions --max-budget-usd 10.00
```

`--max-budget-usd` is a hard financial ceiling; the session terminates if exceeded.
