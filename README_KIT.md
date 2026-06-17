# claude_local — Autonomous Watchdog Starter Kit

Drop these files into any project folder, describe your project, and run one
command. A deterministic orchestrator (not the model) drives the build/fix loop,
so even small local models (LM Studio) finish without spiraling.

## What is inside

- CLAUDE.md — project memory / conventions (auto-loaded by Claude Code)
- watchdog.md — anti-loop rules
- project_description.md — EDIT THIS: your spec + config (YAML frontmatter)
- package.json — test + health scripts (merge into yours if one already exists)
- .gitignore
- run-watchdog.ps1 — Windows launcher
- run-watchdog.sh — Linux/macOS launcher
- scripts/health-check.mjs — quick = npm test; full = npm test + build if present
- scripts/run-tests.mjs — robust test gate (fails even when node --test under-reports)
- scripts/parse-project-config.mjs — reads project_description.md frontmatter
- scripts/milestones.json — EDIT THIS: machine-checkable milestone file lists
- scripts/orchestrator.mjs — entry point for the deterministic engine
- scripts/orchestrator/ — the engine modules
- tests/scaffold.test.js — keeps health green on a fresh project
- .claude/skills/loop and .claude/skills/goal — optional interactive commands

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
