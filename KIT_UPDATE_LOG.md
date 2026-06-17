# claude_local kit — update log

Track what changed between `claude_local.zip` releases. The same file is bundled
inside each zip at the root.

---

## 2026-06-17 — v0.6.0

### Learning from failures (two journal files)

| File | Purpose |
|------|---------|
| `scripts/orchestrator/journal.mjs` | `failure_journal.log` — orchestrator facts + model `root_cause` / `do_not_repeat` |
| `scripts/orchestrator/learn.mjs` | Wires analyze pass after failed fix/recovery; `learned_skills.log` |
| `scripts/orchestrator/analyze-prompt.mjs` | Dedicated analyst call (`analyze_turns: 8`) — read code, write journals |
| `scripts/orchestrator/fix-cycle.mjs` | Fix attempt + post-failure analyze hook |

**New config knob:** `analyze_turns: 8`

**State files (cleared on SUCCESS):**
- `failure_journal.log` — what failed, do NOT repeat
- `learned_skills.log` — reusable patterns for later milestones

**Validated:** test003 TextStats SUCCESS (~2 min); test004 ABS Simulator SUCCESS (~18 min, 48 tests, 4 recoveries).

### Kit zip v0.6.0 — 43 files

15 orchestrator modules + samples + generic templates (no app code in root).

---

## 2026-06-17 — v0.5.0

### Milestone-focused orchestration (local-LLM guided)

| File | Purpose |
|------|---------|
| `scripts/orchestrator/active.mjs` | Detects active milestone from failing test paths; scopes fix/recovery |
| `prompts.mjs` | ESM test rules; fix/implement scoped to active milestone files only |
| `recovery-prompt.mjs` | Recovery scoped to hung milestone |
| `loop.mjs` | Logs `[M3]`/`[M4]` on fix; skips re-implement when milestone files exist |
| `great-loop.mjs` | Hang streak resets on progress OR when hang moves to new milestone |
| `hints.mjs` | window/jsdom + module-level assertion hints |

**Milestone JSON:** optional `"mode": "pure-logic"` — autonomous projects should avoid DOM/browser milestones.

### Kit zip v0.5.0 layout

- No application code in zip root — generic templates only
- `README.md` — full kit documentation (replaces README_KIT.md in zip)
- `samples/` — four ready-made specs (`miniledger`, `abs-brake-simulator`, `text-stats`, `unit-converter`)

---

## 2026-06-17 — v0.4.0

### Great loop (outer recovery)

When the inner orchestrator BLOCKEDs (same error 2×, stall, no milestone progress),
a **recovery pass** runs before giving up:

| File | Purpose |
|------|---------|
| `scripts/orchestrator/great-loop.mjs` | Wraps inner `loop.mjs`; up to `great_loop_retries` consecutive hangs **per stage** (resets on progress) |
| `scripts/orchestrator/recovery-prompt.mjs` | Broad prompt: read source + tests, fix root cause, delete junk files |
| `scripts/orchestrator/hints.mjs` | Added ABS/state-machine hints for recovery |

**New config knobs** (`project_description.md` frontmatter):

- `great_loop_retries: 5` — max recovery attempts after inner BLOCKED
- `recovery_turns: 20` — turn budget per recovery pass (wider than `fix_turns`)

**New state file:** `recovery_attempts.log` (gitignored; cleared on SUCCESS)

### Kit contents (28 files)

Adds `great-loop.mjs`, `recovery-prompt.mjs` to orchestrator modules (11 total).

---

## 2026-06-17 — v0.3.0

### New files

| File | Purpose |
|------|---------|
| `scripts/orchestrator/hints.mjs` | Auto-detects common local-model errors in health output and injects targeted fix hints into orchestrator fix prompts |
| `tests/test-utils.js` | `approximateEqual()` helper — Node `assert` has no float compare |
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
| `scripts/run-tests.mjs` | Strict test gate — fails when `node --test` under-reports (e.g. assertions in `describe()` body) |
| `scripts/orchestrator/*.mjs` | Deterministic loop engine (now 9 modules including `hints.mjs`) |
| Generic templates | `project_description.md` and `scripts/milestones.json` are project-agnostic placeholders |

### Kit contents (26 files)

```
CLAUDE.md
KIT_UPDATE_LOG.md
README_KIT.md
watchdog.md
project_description.md          # template — edit for your project
package.json
.gitignore
run-watchdog.ps1
run-watchdog.sh
scripts/health-check.mjs
scripts/run-tests.mjs
scripts/parse-project-config.mjs
scripts/milestones.json         # template — edit for your project
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

- `README.md` — full GitHub readme with MiniLedger example and troubleshooting table
- `src/`, example tests — worked MiniLedger demo in the dev repo only
- `test001/` — separate ABS simulator experiment

---

## 2026-06-17 — v0.2.0

- Added `scripts/run-tests.mjs` hardened test gate
- Generic `project_description.md` / `scripts/milestones.json` templates (not project-specific)
- Cross-platform zip paths (forward slashes)
- UTF-8 normalization for all kit text files

---

## 2026-06-17 — v0.1.0

- Initial `claude_local.zip` drop-in kit
- Deterministic orchestrator, launchers, scaffold test, `/loop` and `/goal` skills
