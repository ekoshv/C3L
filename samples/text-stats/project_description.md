---
name: TextStats
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

# TextStats

## Vision

Pure-logic text analysis library: tokenize words, count frequencies, summarize
lines and paragraphs. No file I/O in tests â€” pass strings directly.

## Milestones

### M1 â€” Tokenizer
### M2 â€” Word frequencies
### M3 â€” Document summary

See `milestones.json` for required files.
