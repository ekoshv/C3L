# claude_local — Autonomous Watchdog Starter Kit (v0.6.0)

Drop these files into any empty project folder, add your spec, run one command.
The **orchestrator** (Node.js) drives the loop — not the model — so small local
LLMs (LM Studio, etc.) can finish without spiraling.

This zip contains **no application code**. Copy a sample from `samples/` or write
your own `project_description.md` + `scripts/milestones.json`.

---

## Quick start

1. Extract the zip into your project folder (or an empty directory).
2. Pick a starter spec:
   - Copy `samples/<name>/project_description.md` → project root
   - Copy `samples/<name>/milestones.json` → `scripts/milestones.json`
3. Run: `.\run-watchdog.ps1` (Windows) or `./run-watchdog.sh` (Linux/macOS)

Test only: `.\run-watchdog.ps1 -Test`

---

## Sample projects (`samples/`)

| Folder | Description | Milestones |
|--------|-------------|------------|
| `miniledger/` | In-memory accounting (integer cents) | 3 |
| `abs-brake-simulator/` | ABS physics + telemetry (pure logic) | 4 |
| `text-stats/` | Word/line statistics library | 3 |
| `unit-converter/` | Temperature & length converters | 3 |

See `samples/README.md` for copy commands. All use `"mode": "pure-logic"`.

---

## Architecture (v0.6)

- **Inner loop:** health → scoped implement or fix; milestone focus via `active.mjs`
- **Great loop:** 5 recoveries per hang (resets on progress)
- **Learning:** `failure_journal.log` (do_not_repeat) + `learned_skills.log` (reuse patterns)
- **Analyze pass:** after each failed fix/recovery (`analyze_turns: 8`)

---

## Config knobs

```yaml
great_loop_retries: 5
recovery_turns: 20
analyze_turns: 8
```

Full list in `project_description.md` template. See `KIT_UPDATE_LOG.md` for changes.

---

## Prerequisites

Node.js 18+ and [Claude Code CLI](https://code.claude.com) with your local model.

MIT License
