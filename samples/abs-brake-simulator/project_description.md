---
name: EduABS Advanced Simulator
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
max_iterations: 60
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

# EduABS Advanced Simulator

## Vision

Build an educational, dependency-free anti-lock braking system simulator as pure
Node ESM logic. The project teaches why ABS works by modeling tire slip, road
friction, brake pressure modulation, vehicle deceleration, stopping distance,
and learner-facing telemetry.

This is a headless simulator first: no DOM, canvas, browser APIs, or jsdom. The
output should be structured data that a UI could later render as charts, lesson
panels, or scenario comparisons.

## Learning goals

- Show that maximum braking force occurs near an optimal slip ratio, not at full
  wheel lock.
- Compare braking with ABS disabled, simple threshold ABS, and advanced cadence
  modulation.
- Demonstrate how dry, wet, gravel, snow, ice, and split-mu roads change stopping
  distance and wheel behavior.
- Teach telemetry terms: vehicle speed, wheel speed, slip ratio, brake pressure,
  tire force, ABS state, lockup events, and stopping distance.
- Produce concise explanations that connect the numeric simulation to the lesson.

## Quality rules

- Keep every code file under 100 lines, excluding blanks and comments.
- Pure logic only. No DOM, canvas, timers, random behavior, network, or external
  dependencies.
- Use deterministic calculations and deterministic tests.
- Use SI units internally: meters, seconds, Newtons, kilograms, radians/sec.
- Tests use `node:test` and `node:assert/strict`. Put assertions inside `test()`
  blocks only.
- Use `tests/test-utils.js` for approximate numeric comparisons.
- Fix only the failing layer. Read `watchdog.md`, `failed_attempts.log`,
  `failure_journal.log`, and `learned_skills.log` before fixes when present.

## Milestones

Each milestone is also listed in `scripts/milestones.json`, which is the
machine-checkable source of truth for the orchestrator.

### M1 - Tire and road physics

Create road-surface definitions and tire-slip math. The module should calculate
slip ratio, tire friction coefficient, and longitudinal tire force. The tire
curve should peak near the surface's optimal slip and fall off toward wheel lock.

### M2 - Vehicle and brake dynamics

Create wheel, brake, and vehicle update logic. The model should advance one time
step at a time, clamp impossible values, accumulate stopping distance, and expose
state snapshots suitable for tests and telemetry.

### M3 - ABS control algorithms

Create reusable ABS controllers: disabled braking, threshold ABS, and advanced
cadence modulation. The controller should reduce or restore brake pressure based
on slip, wheel lock risk, and recovery thresholds.

### M4 - Scenario simulation

Wire the physics and controllers into deterministic scenario runs. Scenarios
should compare ABS modes across road conditions, including split-mu behavior,
and stop when speed reaches zero or a configured time limit is reached.

### M5 - Educational telemetry and lessons

Transform simulation samples into chart-ready series and learner-facing lesson
summaries. The module should identify lockup events, ABS activation windows,
peak-slip moments, stopping-distance differences, and plain-English takeaways.

## Autonomous build strategy

The watchdog should implement the milestones in order. M1-M3 are pure-logic
milestones with tight scope. M4 and M5 are integration milestones because they
wire earlier modules together, so they use the larger integration turn budgets.

The project is complete only when all milestone files exist and
`npm run health:full` is green.
