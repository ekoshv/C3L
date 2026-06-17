---
name: ABS Brake Simulator
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

# ABS Brake Simulator

## Vision

Educational ABS simulation as pure-logic Node modules: tire/vehicle physics,
ABS control, telemetry/chart data structures, headless simulation loop.
No DOM, canvas, or Three.js in autonomous milestones.

## Milestones

### M1 — Core physics engine
### M2 — ABS algorithm
### M3 — Telemetry and chart data
### M4 — Integrated simulation

See `milestones.json` for required files.
