---
name: MiniLedger
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
max_turn_limit: 2
great_loop_retries: 5
recovery_turns: 20
analyze_turns: 8
integration_fix_turns: 24
integration_recovery_turns: 32
integration_analyze_turns: 12
graph_auto: true
graph_required: false
graph_scope_threshold: 3
graph_prompt_facts: 8
graph_query_timeout_ms: 15000
diagnostic_probe_timeout_ms: 5000
---

# MiniLedger

## Vision

A small, dependency-free in-memory accounting library written as pure-logic Node
ESM modules. It tracks money in integer cents (no floats), records transactions
against accounts, and produces simple reports. Everything is unit-tested with the
Node built-in test runner.

## Quality rules

- 100-line limit per code file (see CLAUDE.md).
- Pure logic only — no DOM, no network, no external dependencies.
- Money is always integer cents. Never use floating point for money math.
- Fix only the failing layer on errors; read watchdog.md + failed_attempts.log first.

## Milestones (implement in order)

Each milestone is also listed in scripts/milestones.json (the machine-checkable
source of truth for "done").

### M1 — Money utilities
- src/money.js — exports toCents(dollars), formatCents(cents) -> "$X.XX",
  and addCents(...amounts). Reject non-numbers and non-integer cents.
- tests/money.test.js — covers conversion, formatting, addition, and rejection.

### M2 — Account ledger
- src/ledger.js — exports createLedger() returning { post(entry), balanceOf(account) }.
  An entry is { account, amount } in integer cents (amount may be negative).
  balanceOf sums all posted amounts for that account (0 if none). post rejects
  invalid entries (missing account or non-integer amount).
- tests/ledger.test.js — covers posting, summing, unknown-account zero, and rejection.

### M3 — Category report
- src/report.js — exports totalsByCategory(entries) where each entry is
  { category, amount } in cents; returns an object mapping category -> summed cents.
  Ignores entries with empty category by throwing an error.
- tests/report.test.js — covers grouping, summation, and the empty-category error.

## How autonomy works

The launcher runs node scripts/orchestrator.mjs, which loops deterministically:
run health; if green implement the next incomplete milestone; if failing apply one
short scoped fix; stop when all milestones exist and health:full is green, or when
a deterministic loop-breaker trips.
