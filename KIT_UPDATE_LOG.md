# claude_local kit â€” update log

Track what changed between `claude_local.zip` releases. The same file is bundled
inside each zip at the root.

---
## 2026-06-28 - v0.7 (deterministic debug-log strip) — claude_local_orc_v07.zip

### Strip debug console.* lines deterministically

v06 carried M1-M3 green and built M4 (first integration milestone), but M4
exposed a recurring waste: the local model repeatedly left debug `console.log`
statements in `run-simulation.js` / `vehicle.js`, the diagnostics flagged them
every iteration ("debug console output still present"), and the model kept
ignoring the instruction to remove them — burning fix turns and polluting test
output.

Per the kit's deterministic-control principle (don't leave to model judgment),
v07 strips standalone `console.*` debug lines from source files in code:
- after each RLM implement pass (`loop.mjs`),
- after each fix attempt, before the targeted verify (`fix-cycle.mjs`).

| File | Purpose |
|------|---------|
| `scripts/orchestrator/strip-debug.mjs` | Removes single-line `console.*` calls from src (never tests) |

Only standalone single-line `console.(log|debug|info|warn|error|trace)(...)`
lines are removed; code that merely mentions console in a comment is preserved.

---
## 2026-06-28 - v0.6 (per-file budget for complex modules) — claude_local_orc_v06.zip

### Larger per-file implement/test budgets

v05 resume (test012) carried M1+M2 green and reached M3, but M3's ABS controllers
exposed a budget limit: `modes.js` and `threshold-controller.js` implement
sub-calls hit max-turns at 6 turns and left **incomplete stubs**
(`placeholder/sentinel return may be unfinished`), which the fix phase then could
not complete. Controller factories are more complex than physics formulas.

v06 raises the default per-file budgets so complex modules finish in one pass:

| Knob | v05 | v06 |
|------|-----|-----|
| `rlm_impl_turns` | 6 | 8 |
| `rlm_test_turns` | 8 | 10 |

These remain per-file (still bounded) — overall context per call stays small;
only the action budget for a single complex file grows.

---
## 2026-06-28 - v0.5 (correctness fixes) — claude_local_orc_v05.zip

### Two kit bugs surfaced by the RLM bounded fix

v04 test (test012, ABS) drove M1 and M2 to fully GREEN (53 tests), but two
pre-existing kit bugs masked the success and crashed the run:

1. **False BLOCKED on "max turns + green".** With bounded RLM fixes the model
   often edits correctly and *then* hits max turns. `fix-cycle.mjs` still
   incremented `maxTurnStreak` and aborted even though `health` was GREEN. A fix
   that turns health green is progress: it now resets all loop-breaker counters
   and never aborts.
2. **`diagnostics.mjs` EISDIR crash.** `importedFiles`/`scanSources`/test-context
   read a path that could be a directory (an import resolving to a folder),
   throwing `EISDIR` and killing the orchestrator during a recovery pass. All
   reads are now guarded by an `isFile()` check.

| File | Fix |
|------|-----|
| `scripts/orchestrator/fix-cycle.mjs` | GREEN health resets counters + returns `abort:false` |
| `scripts/orchestrator/diagnostics.mjs` | `isFile()` guard before every `readFileSync` |

---
## 2026-06-28 - v0.4 (RLM fix: inline failing test) — claude_local_orc_v04.zip

### Inline the failing test + harden directives

v03 test (test011, ABS) made fix calls converge (the model finished instead of
maxing out), but exposed a deeper failure class: the model writes the source and
the test in separate sub-calls and they disagree on the API
("imported symbol exists but is not exported as the test expects"). The v03 fix
prompt inlined the source but NOT the failing test, so the model could not see
both sides of the mismatch and burned turns reading; it also left debug
`console.log`s and edited the shared `tests/test-utils.js`.

v04 changes (`rlm-fix.mjs`):
- **Inline the failing test file** read-only alongside the source, so the model
  reconciles exported names/signatures against the exact test contract in one
  shot (RLM "everything needed inline").
- **Harden directives** — align exports to the test's imports, remove ALL added
  debug logs, never edit the test or `tests/test-utils.js`.

---
## 2026-06-28 - v0.3 (RLM bounded fix) — claude_local_orc_v03.zip

### RLM-style bounded fix phase

v02 test (test010, ABS) made the implement phase clean (every milestone built in
one pass), but exposed the real bottleneck: the **fix phase**. On the harder M2
`vehicle.js` physics bug (NaN at zero speed + boolean invariants), the local 9B
model wandered — re-reading files and exploring — and repeatedly hit max-turns,
tripping `max_turn_limit` and grinding through great-loop recoveries that also
maxed out.

v03 applies the RLM "bounded context, focused task" principle to fixing:
- `rlm-fix.mjs` builds a tight fix prompt that **inlines the milestone's small
  source files** (no re-read turns), states the failing assertion + diagnostics,
  restricts edits to that milestone's source, and runs **only the targeted test**.
- `fix-cycle.mjs` uses `rlmFixPrompt` when `rlm_enabled`, else the legacy
  `fixPrompt`.

| File | Purpose |
|------|---------|
| `scripts/orchestrator/rlm-fix.mjs` | Bounded, inline-source fix prompt for weak models |
| `scripts/orchestrator/fix-cycle.mjs` | Selects the RLM bounded fix prompt when `rlm_enabled` |

---
## 2026-06-28 - v0.2 (RLM hardening) — claude_local_orc_v02.zip

### Retry-on-MISSING + write-to-disk directive

v01 test (test009, ABS) proved RLM decomposition completes milestones, but
exposed a failure: a sub-call could report `done` while never writing its file
to disk. The missing file then cascaded (downstream imports broke, the test file
was written against an incomplete API), forcing a full 24-turn fix cycle and
spec drift before a re-implement pass finally created the file.

v02 fixes this inside the RLM driver:
- **Retry-on-MISSING** — `subCallFile` retries a file up to `rlm_retries`
  (default 2) times when the file is absent after the sub-call, with an escalated
  prompt ("FIRST action MUST be to write the file to disk").
- **Write-to-disk directive** — every sub-call prompt now states that a
  printed-but-unwritten file counts as a failure and the file tool must be used.

| Config knob | Default | Purpose |
|-------------|---------|---------|
| `rlm_retries` | 2 | extra attempts per file when it ends up MISSING |

---
## 2026-06-28 - v0.1 (RLM integration) — claude_local_orc_v01.zip

### Recursive Language Model (RLM) implement phase

Inspired by *Recursive Language Models* (Zhang, Kraska, Khattab — arXiv:2512.24601).
Small local models reliably hit `max-turns` when asked to build every file of a
milestone in a single agent call, and the tests they generate mismatch the
source. The implement phase is now an **RLM-style recursive decomposition**: the
deterministic orchestrator acts as the external environment, and dispatches one
bounded sub-call per file with symbolic handles (sibling export names only)
instead of full-file context.

RLM principles applied:
- **Context offload via symbolic handles** — sub-calls see siblings as exported
  symbol names, never full content (`exportsOf`).
- **Bounded per-call context** — one file per sub-call, small turn budget.
- **Deterministic stitching** — source files first (declared/dependency order),
  test files last, written against the real exported interface.
- **`rlm_max_depth`** — integration milestones expose prior-milestone src exports
  as the available API.

| File | Purpose |
|------|---------|
| `scripts/orchestrator/rlm.mjs` | Decomposes a milestone into ordered per-file recursive sub-calls |
| `scripts/orchestrator/rlm-prompts.mjs` | Builds bounded per-file sub-call prompts + `exportsOf` symbolic handles |
| `scripts/orchestrator/loop.mjs` | Implement phase calls `implementMilestoneRLM` when `rlm_enabled` |
| `scripts/orchestrator/config.mjs` | Parses `rlm_enabled`, `rlm_impl_turns`, `rlm_test_turns`, `rlm_max_depth` |

**New config knobs (frontmatter, all optional):**

```yaml
rlm_enabled: true     # default on; false restores the single-call implement path
rlm_impl_turns: 6     # per source-file sub-call budget
rlm_test_turns: 8     # per test-file sub-call budget
rlm_max_depth: 1      # integration milestones expose prior src exports as API
```

The health / fix / great-loop recovery machinery is unchanged — RLM only replaces
the implement phase, so it is fully reversible via `rlm_enabled: false`.

---
## 2026-06-20 - v0.9.1

### Command-line progress summaries

The watchdog now prints concise terminal summaries during autonomous runs while
keeping full model transcripts in `logs/orchestrator-*.log`.

| File | Purpose |
|------|---------|
| `scripts/orchestrator/terminal-summary.mjs` | Renders file changes, first-failure facts, and agent result notes |
| `scripts/orchestrator/agent.mjs` | Prints labelled agent start/finish lines with turn budgets |
| `scripts/orchestrator/loop.mjs` | Prints files created/modified by milestone implementation |
| `scripts/orchestrator/fix-cycle.mjs` | Prints first failure, diagnostic facts, file changes, targeted verification, and health |
| `scripts/orchestrator/great-loop.mjs` | Prints recovery diagnostics, recovery file changes, and post-recovery health |

---
## 2026-06-20 - v0.9.0

### Failure microscope diagnostics

Fix and recovery prompts now include deterministic diagnostics for the first
failing test. The goal is to help small local models solve behavior bugs by
showing assertion shape, nearby test context, direct imports, common failure
classes, suspicious boundary guards, and optional project probe facts.

| File | Purpose |
|------|---------|
| `scripts/diagnose-failure.mjs` | Manual CLI for the same first-failure microscope used by the orchestrator |
| `scripts/orchestrator/diagnostics.mjs` | Parses failing test output, reads test context, classifies failure shape, and scans scoped source |
| `scripts/orchestrator/diagnostic-probe.mjs` | Runs optional project hook `scripts/diagnostics/probe.mjs` with JSON stdin |
| `scripts/orchestrator/diagnostic-render.mjs` | Renders compact prompt-safe diagnostic text |
| `scripts/orchestrator/evidence.mjs` | Adds diagnostics to the evidence bundle |

**New command:**
- `npm run diagnose`

**New optional config knob:**
- `diagnostic_probe_timeout_ms: 5000`

---

## 2026-06-18 â€” v0.8.1

### Starter zip hygiene and scoped hints

Test007 showed that packaging kit self-tests into generated projects polluted
project health and graph evidence. It also showed that journal hints could still
inject app-test "top-level assertion" and ABS advice without scoped evidence.

| File | Purpose |
|------|---------|
| `scripts/build-kit-zip.mjs` | Builds `claude_local.zip` from an explicit manifest so starter projects exclude kit self-tests |
| `scripts/orchestrator/hints.mjs` | Scoped hints now stay conservative when no failing-file context is provided |
| `scripts/orchestrator/state.mjs` | Adds `max_turn_limit` loop breaker for repeated max-turn agent exits |
| `scripts/orchestrator/fix-cycle.mjs` | Tracks consecutive max-turn fix attempts instead of resetting same-error streak forever |
| `tests/kit-zip.test.js` | Verifies starter zip manifest excludes `tests/orchestrator-*.test.js` |
| `tests/orchestrator-evidence.test.js` | Adds journal-style hint regression coverage |
| `tests/orchestrator-attempt.test.js` | Adds max-turn breaker regression coverage |

**Packaging change:** `claude_local.zip` includes only starter tests:
- `tests/scaffold.test.js`
- `tests/test-utils.js`

The orchestrator self-tests remain in the development repo but are no longer
included in generated projects.

**New config knob:**
- `max_turn_limit: 2` â€” block/recover when agents repeatedly hit max turns

---

## 2026-06-18 â€” v0.8.0

### Deterministic graph evidence

Graphs are now used as deterministic evidence, not raw prompt decoration. CodeGraph
is treated as the primary local code graph; Graphify remains secondary context.
If Docker or graph services are unavailable, the orchestrator continues with the
v0.7 evidence path unless `graph_required: true`.

| File | Purpose |
|------|---------|
| `scripts/orchestrator/graph-resolver.mjs` | Parses CodeGraph/Graphify output into normalized facts `{ file, symbol, relation, reason, source }` |
| `scripts/orchestrator/graph-ranker.mjs` | Scores graph facts against failing tests, direct imports, symbols, and active scope |
| `scripts/orchestrator/evidence.mjs` | Merges high-scoring graph files into allowed scope and carries structured graph evidence |
| `scripts/orchestrator/prompts.mjs` | Uses concise deterministic graph facts in implement/fix prompts; no raw graph dumps |
| `scripts/orchestrator/recovery-prompt.mjs` | Uses the same graph fact rendering for recovery |
| `scripts/orchestrator/graph-context.mjs` | Supports `graph_auto`, `graph_required`, and graph query timeout |
| `scripts/graph-sidecar/context.mjs` | Applies graph query timeout to CodeGraph and Graphify calls |
| `scripts/graph-sidecar/docker.mjs` | Supports spawn timeout for Docker compose exec |

**New config knobs:**
- `graph_auto: true` â€” use an existing graph sidecar when available
- `graph_required: false` â€” keep graphs optional by default
- `graph_scope_threshold: 3` â€” minimum graph score to expand edit scope
- `graph_prompt_facts: 8` â€” maximum graph facts in prompts
- `graph_query_timeout_ms: 15000` â€” cap graph query latency

**New tests:**
- `tests/orchestrator-graph.test.js`
- `tests/orchestrator-config.test.js`

### Kit zip v0.8.0

The zip includes the v0.8 graph resolver/ranker, updated docs, samples, and
graph-sidecar timeout support.

---

## 2026-06-18 â€” v0.7.0

### Reliability-first fix workflow for local/small models

This release redesigns the fix/recovery path after the test006 M4 post-mortem.
The orchestrator now gives the model a smaller, more relevant evidence bundle
and verifies model claims with deterministic checks instead of trusting narration.

| File | Purpose |
|------|---------|
| `scripts/orchestrator/evidence.mjs` | Builds compact evidence: first failing test, failing files, direct imports, scoped files, graph context |
| `scripts/orchestrator/attempt.mjs` | Classifies max-turn exits, no-edit attempts, false success claims, targeted test commands, integration budgets |
| `scripts/orchestrator/prompts.mjs` | Fix prompt now requires `READ`, `PATCH`, `VERIFY`, `LEARN` sections and scoped evidence |
| `scripts/orchestrator/recovery-prompt.mjs` | Recovery uses the same evidence contract instead of broad vague procedure steps |
| `scripts/orchestrator/hints.mjs` | Hints are context-aware; ABS/top-level assertion advice no longer leaks into unrelated app failures |
| `scripts/orchestrator/journal.mjs` | Prompt context includes completed failure analyses only, not placeholder journal blocks |
| `scripts/orchestrator/learn.mjs` | Analyzer output is checked; missing `root_cause` / `do_not_repeat` is retried and marked |
| `scripts/orchestrator/fix-cycle.mjs` | Runs targeted failing tests before full health and records false success / max-turn facts |
| `scripts/orchestrator/great-loop.mjs` | Recovery builds evidence and uses integration-aware turn budgets |
| `scripts/orchestrator/config.mjs` | Adds optional integration turn-budget knobs |

**New config knobs:**
- `integration_fix_turns: 24`
- `integration_recovery_turns: 32`
- `integration_analyze_turns: 12`

**New tests:**
- `tests/orchestrator-evidence.test.js`
- `tests/orchestrator-prompts.test.js`
- `tests/orchestrator-attempt.test.js`

**Validated:** `npm run health` and `npm run health:full` pass with 48 tests.

### Kit zip v0.7.0

The zip includes the reliability-first orchestrator, updated README files, update
log, design/plan docs, and graph sidecar files. It excludes local experiment
folders (`test00x/`), logs, generated graph outputs, and `node_modules/`.

---

## 2026-06-17 â€” v0.6.0

### Learning from failures (two journal files)

| File | Purpose |
|------|---------|
| `scripts/orchestrator/journal.mjs` | `failure_journal.log` â€” orchestrator facts + model `root_cause` / `do_not_repeat` |
| `scripts/orchestrator/learn.mjs` | Wires analyze pass after failed fix/recovery; `learned_skills.log` |
| `scripts/orchestrator/analyze-prompt.mjs` | Dedicated analyst call (`analyze_turns: 8`) â€” read code, write journals |
| `scripts/orchestrator/fix-cycle.mjs` | Fix attempt + post-failure analyze hook |

**New config knob:** `analyze_turns: 8`

**State files (cleared on SUCCESS):**
- `failure_journal.log` â€” what failed, do NOT repeat
- `learned_skills.log` â€” reusable patterns for later milestones

**Validated:** test003 TextStats SUCCESS (~2 min); test004 ABS Simulator SUCCESS (~18 min, 48 tests, 4 recoveries).

### Kit zip v0.6.0 â€” 43 files

15 orchestrator modules + samples + generic templates (no app code in root).

---

## 2026-06-17 â€” v0.5.0

### Milestone-focused orchestration (local-LLM guided)

| File | Purpose |
|------|---------|
| `scripts/orchestrator/active.mjs` | Detects active milestone from failing test paths; scopes fix/recovery |
| `prompts.mjs` | ESM test rules; fix/implement scoped to active milestone files only |
| `recovery-prompt.mjs` | Recovery scoped to hung milestone |
| `loop.mjs` | Logs `[M3]`/`[M4]` on fix; skips re-implement when milestone files exist |
| `great-loop.mjs` | Hang streak resets on progress OR when hang moves to new milestone |
| `hints.mjs` | window/jsdom + module-level assertion hints |

**Milestone JSON:** optional `"mode": "pure-logic"` â€” autonomous projects should avoid DOM/browser milestones.

### Kit zip v0.5.0 layout

- No application code in zip root â€” generic templates only
- `README.md` â€” full kit documentation (replaces README_KIT.md in zip)
- `samples/` â€” four ready-made specs (`miniledger`, `abs-brake-simulator`, `text-stats`, `unit-converter`)

---

## 2026-06-17 â€” v0.4.0

### Great loop (outer recovery)

When the inner orchestrator BLOCKEDs (same error 2Ã—, stall, no milestone progress),
a **recovery pass** runs before giving up:

| File | Purpose |
|------|---------|
| `scripts/orchestrator/great-loop.mjs` | Wraps inner `loop.mjs`; up to `great_loop_retries` consecutive hangs **per stage** (resets on progress) |
| `scripts/orchestrator/recovery-prompt.mjs` | Broad prompt: read source + tests, fix root cause, delete junk files |
| `scripts/orchestrator/hints.mjs` | Added ABS/state-machine hints for recovery |

**New config knobs** (`project_description.md` frontmatter):

- `great_loop_retries: 5` â€” max recovery attempts after inner BLOCKED
- `recovery_turns: 20` â€” turn budget per recovery pass (wider than `fix_turns`)

**New state file:** `recovery_attempts.log` (gitignored; cleared on SUCCESS)

### Kit contents (28 files)

Adds `great-loop.mjs`, `recovery-prompt.mjs` to orchestrator modules (11 total).

---

## 2026-06-17 â€” v0.3.0

### New files

| File | Purpose |
|------|---------|
| `scripts/orchestrator/hints.mjs` | Auto-detects common local-model errors in health output and injects targeted fix hints into orchestrator fix prompts |
| `tests/test-utils.js` | `approximateEqual()` helper â€” Node `assert` has no float compare |
| `KIT_UPDATE_LOG.md` | This changelog (repo + inside zip) |

### Updated files

| File | Change |
|------|--------|
| `scripts/orchestrator/prompts.mjs` | Implement/fix prompts warn against invented `assert.approximateEqual`; fix prompt calls `errorHints()` from `hints.mjs` |
| `README_KIT.md` | Documents `test-utils.js`, `run-tests.mjs`, `hints.mjs`; adds **Milestone design (local models)** section |
| `CLAUDE.md` | Adds **Common local-model mistakes** section (fake assert APIs, describe-body assertions, duplicate exports, ESM paths) |
| `.claude/skills/goal/SKILL.md` | `/goal` procedure lists the same common local-model mistakes |

### Unchanged since v0.2.0 (still included)

| File | Purpose |
|------|---------|
| `scripts/run-tests.mjs` | Strict test gate â€” fails when `node --test` under-reports (e.g. assertions in `describe()` body) |
| `scripts/orchestrator/*.mjs` | Deterministic loop engine (now 9 modules including `hints.mjs`) |
| Generic templates | `project_description.md` and `scripts/milestones.json` are project-agnostic placeholders |

### Kit contents (26 files)

```
CLAUDE.md
KIT_UPDATE_LOG.md
README_KIT.md
watchdog.md
project_description.md          # template â€” edit for your project
package.json
.gitignore
run-watchdog.ps1
run-watchdog.sh
scripts/health-check.mjs
scripts/run-tests.mjs
scripts/parse-project-config.mjs
scripts/milestones.json         # template â€” edit for your project
scripts/orchestrator.mjs
scripts/orchestrator/agent.mjs
scripts/orchestrator/config.mjs
scripts/orchestrator/exec.mjs
scripts/orchestrator/hints.mjs
scripts/orchestrator/loop.mjs
scripts/orchestrator/milestones.mjs
scripts/orchestrator/prompts.mjs
scripts/orchestrator/state.mjs
tests/scaffold.test.js
tests/test-utils.js
.claude/skills/loop/SKILL.md
.claude/skills/goal/SKILL.md
```

### Not in the zip (repo-only)

- `README.md` â€” full GitHub readme with MiniLedger example and troubleshooting table
- `src/`, example tests â€” worked MiniLedger demo in the dev repo only
- `test001/` â€” separate ABS simulator experiment

---

## 2026-06-17 â€” v0.2.0

- Added `scripts/run-tests.mjs` hardened test gate
- Generic `project_description.md` / `scripts/milestones.json` templates (not project-specific)
- Cross-platform zip paths (forward slashes)
- UTF-8 normalization for all kit text files

---

## 2026-06-17 â€” v0.1.0

- Initial `claude_local.zip` drop-in kit
- Deterministic orchestrator, launchers, scaffold test, `/loop` and `/goal` skills
