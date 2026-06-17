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
great_loop_retries: 5
recovery_turns: 20
analyze_turns: 8
---

# MiniLedger

## Vision

Small in-memory accounting library. Money as integer cents (no floats). Post
transactions to accounts; summarize by category. Pure Node ESM + node:test.

## Milestones

### M1 — Money utilities
### M2 — Account ledger
### M3 — Category report

See `milestones.json` for required files per milestone.
