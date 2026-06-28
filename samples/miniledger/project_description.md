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
integration_fix_turns: 24
integration_recovery_turns: 32
integration_analyze_turns: 12
graph_auto: true
graph_required: false
graph_scope_threshold: 3
graph_prompt_facts: 8
graph_query_timeout_ms: 15000
diagnostic_probe_timeout_ms: 5000
max_iterations: 40
same_error_limit: 2
stall_limit: 2
impl_attempt_limit: 3
max_turn_limit: 2
great_loop_retries: 5
recovery_turns: 20
analyze_turns: 8
---

# MiniLedger

## Vision

Small in-memory accounting library. Money as integer cents (no floats). Post
transactions to accounts; summarize by category. Pure Node ESM + node:test.

## Milestones

### M1 â€” Money utilities
### M2 â€” Account ledger
### M3 â€” Category report

See `milestones.json` for required files per milestone.
