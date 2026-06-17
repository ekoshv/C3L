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
max_iterations: 40
same_error_limit: 2
stall_limit: 2
impl_attempt_limit: 3
great_loop_retries: 5
recovery_turns: 20
analyze_turns: 8
---

# TextStats

## Vision

Pure-logic text analysis library: tokenize words, count frequencies, summarize
lines and paragraphs. No file I/O in tests — pass strings directly.

## Milestones

### M1 — Tokenizer
### M2 — Word frequencies
### M3 — Document summary

See `milestones.json` for required files.
