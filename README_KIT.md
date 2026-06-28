# claude_local — Autonomous Watchdog Starter Kit

Drop these files into any project folder, describe your project, and run one
command. A deterministic orchestrator (not the model) drives the build/fix loop,
so even small local models (LM Studio) make evidence-based attempts and stop
without spiraling.

## What is inside

- CLAUDE.md — project memory / conventions (auto-loaded by Claude Code)
- watchdog.md — anti-loop rules
- project_description.md — EDIT THIS: your spec + config (YAML frontmatter)
- package.json — test + health scripts (merge into yours if one already exists)
- .gitignore
- run-watchdog.ps1 — Windows launcher
- run-watchdog.sh — Linux/macOS launcher
- scripts/health-check.mjs — quick = npm test; full = npm test + build if present
- scripts/parse-project-config.mjs — reads project_description.md frontmatter
- scripts/milestones.json — EDIT THIS: machine-checkable milestone file lists
- scripts/orchestrator.mjs — entry point for the deterministic engine
- scripts/orchestrator/ — the engine modules
- tests/scaffold.test.js — keeps health green on a fresh project
- tests/test-utils.js — approximateEqual helper (Node assert has no float compare)
- scripts/run-tests.mjs — strict test gate (catches describe()-body assertion bugs)
- scripts/orchestrator/hints.mjs — auto-detects common local-model errors in fix prompts
- scripts/orchestrator/great-loop.mjs — outer recovery loop when inner orchestrator BLOCKEDs
- scripts/orchestrator/recovery-prompt.mjs — broad recovery prompt (read files, fix root cause)
- scripts/orchestrator/evidence.mjs — compact first-failure bundle: test, imports, allowed scope
- scripts/orchestrator/attempt.mjs — max-turn, no-edit, false-success, targeted-test gates
- scripts/orchestrator/graph-resolver.mjs — CodeGraph-first fact extraction
- scripts/orchestrator/graph-ranker.mjs — deterministic graph scoring and prompt facts
- scripts/orchestrator/rlm.mjs — RLM recursive per-file implement decomposition (retry-on-MISSING)
- scripts/orchestrator/rlm-prompts.mjs — bounded per-file sub-call prompts + symbolic-handle exports
- scripts/orchestrator/rlm-fix.mjs — bounded fix prompt (inlines failing test + scoped source)
- scripts/orchestrator/strip-debug.mjs — deterministically removes stray console.* debug lines
- KIT_UPDATE_LOG.md — release notes for kit changes
- README.md / README_KIT.md — full docs + drop-in kit quick reference
- .claude/skills/loop and .claude/skills/goal — optional interactive commands

The zip intentionally includes only starter tests (`tests/scaffold.test.js` and
`tests/test-utils.js`). Kit self-tests are repo-only and should not run inside
generated projects.

## Failure microscope

The kit includes `scripts/diagnose-failure.mjs`. Fix and recovery prompts use
the same deterministic diagnostics: assertion shape, nearby test context, direct
imports, common failure class, suspicious boundary guards, and a recommended
next probe.

Run it manually with:

    npm run diagnose
    npm run diagnose -- node --test tests/some-file.test.js

For domain-specific failures, add `scripts/diagnostics/probe.mjs`. The hook reads
JSON from stdin and prints one short diagnostic fact per line.

## Command-line summaries

The autonomous watchdog prints short terminal summaries as it runs: agent
start/finish, files created or changed, first failing test, diagnostic facts,
targeted verification, health status, and recovery attempts. Full transcripts
remain in `logs/orchestrator-*.log`.

## Milestone design (local models)

- Prefer 3–4 milestones of **pure logic** (no DOM, canvas, or browser APIs).
- Each milestone = one small module + one test file, all files under 100 lines.
- Put float comparisons in tests via test-utils.js, not invented assert APIs.
- Defer UI/visual milestones until core logic passes autonomously.
- Each milestone may set `"mode": "pure-logic"` in milestones.json — orchestrator scopes
  fix/recovery prompts to that milestone's files only.
- Use `"mode": "integration"` for cross-module milestones. The orchestrator widens
  scope to failing tests and direct imports, then uses larger integration budgets.

## RLM recursive build (local-model boost, v0.1–v0.7)

Inspired by *Recursive Language Models* (arXiv:2512.24601): keep each model call's
working context small and bounded, give it exactly the context it needs inline,
and let the deterministic orchestrator do the decomposition. This is the decisive
enabler for small local models — in validation a 9B model that previously could
not finish a 5-milestone project completed all five with `health:full` green.

How it changes the loop (the rest of the engine is unchanged):

- **Implement phase** decomposes a milestone into one bounded sub-call **per
  file** — source files first (declared/dependency order), then the test file
  written against the real exported interface. Siblings are passed as *symbolic
  handles* (exported symbol names only, never full content). A file that ends up
  MISSING is retried (`rlm_retries`).
- **Fix phase** uses a bounded prompt that **inlines the failing test plus the
  scoped source**, restricts edits to that milestone's source, and runs only the
  targeted test — so weak models stop wandering and reconcile test/source API
  mismatches in one shot.
- **Debug hygiene** strips stray single-line `console.*` statements from source
  after each implement/fix, deterministically (not by model judgment).

Knobs (frontmatter; all optional, sensible defaults shown):

    rlm_enabled: true     # false restores the legacy single-call implement/fix
    rlm_impl_turns: 8     # per source-file sub-call budget
    rlm_test_turns: 10    # per test-file sub-call budget
    rlm_retries: 2        # extra attempts when a file ends up MISSING
    rlm_max_depth: 1      # integration milestones expose prior src exports as API

Set `rlm_enabled: false` to fully revert to the previous behavior.

## Setup (3 steps)

1. Copy all kit files into your project root. If you already have a package.json,
   copy the three scripts entries (test, health, health:full) into it instead of
   overwriting.
2. Edit project_description.md (vision + milestones + frontmatter knobs) and
   scripts/milestones.json (the exact files each milestone must produce).
3. Run the launcher.

Windows:

    .\run-watchdog.ps1

Linux/macOS:

    chmod +x run-watchdog.sh
    ./run-watchdog.sh

## Launcher modes

- run-watchdog (no args): autonomous build + self-heal until green, then STOP.
- -Test / --test: run one health check only.
- -Interactive / --interactive: open a normal interactive Claude session.

## Prerequisites

- Node.js (https://nodejs.org)
- Claude Code CLI (https://code.claude.com), pointed at your local model

## How it stays safe with weak models

The loop is deterministic code. The model is only asked for one small scoped task
at a time with a tight turn cap. It STOPS automatically when:

- the same error fingerprint repeats (same_error_limit)
- the model edits no files but the error persists (stall_limit)
- a milestone gains no new files (impl_attempt_limit)
- the total cycle ceiling is hit (max_iterations)

On any stop it writes failed_attempts.log; on full success it deletes it. Tune all
limits in the frontmatter of project_description.md.

## Reliability-first fix workflow (v0.7)

Fix and recovery calls are evidence-based. Before asking Claude to edit, the
orchestrator builds a compact bundle containing the first failing test, parsed
test file, direct imports, active milestone scope, completed journal entries, and
filtered graph context when available.

Every fix/recovery prompt requires this structure:

    READ:
    PATCH:
    VERIFY:
    LEARN:

The model is explicitly forbidden from claiming success unless command output in
that same run is green. The orchestrator still verifies independently by running
the targeted failing test first and then the configured health command.

The orchestrator also records facts when a model:

- reaches max turns
- edits no tracked files
- claims success while health remains red
- fails to write `root_cause` / `do_not_repeat` analysis

Repeated max-turn exits trip `max_turn_limit` so the loop recovers instead of
spinning until `max_iterations`.

## New tuning knobs

Add these for integration-heavy projects:

    integration_fix_turns: 24
    integration_recovery_turns: 32
    integration_analyze_turns: 12
    max_turn_limit: 2

Add these for v0.8 graph evidence:

    graph_auto: true
    graph_required: false
    graph_scope_threshold: 3
    graph_prompt_facts: 8
    graph_query_timeout_ms: 15000

Add this for optional project-specific diagnostic probes:

    diagnostic_probe_timeout_ms: 5000

## Graph workflow (v0.8)

Graphs are used as deterministic evidence, not raw prompt decoration. CodeGraph is
the primary local code graph. Graphify is secondary context. The orchestrator:

1. Parses graph output into facts with file, symbol, relation, reason, and source.
2. Scores those facts against the failing test, direct imports, and active scope.
3. Expands allowed scope only for high-scoring CodeGraph-backed files.
4. Shows the model a short "Graph facts" block instead of a raw graph dump.

If `graph_auto: true`, an already-running sidecar is used when available. Use
`-GraphSidecar` / `--graph-sidecar` to force Docker startup and indexing.
Keep `graph_required: false` for local-model reliability unless you intentionally
want graph unavailability to stop the loop.

**Great loop:** if the inner loop BLOCKEDs at the same stage 5 times in a row,
a recovery pass runs each time (`recovery_turns: 20`). The counter **resets when
the inner loop makes progress** (health green / next milestone), so each hang
point gets its own 5 attempts.
