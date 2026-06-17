---
name: loop
description: "Watchdog health-check loop. Use when the user says /loop or asks to continuously monitor tests/build/server and auto-trigger a fix on failure."
user-invocable: true
allowed-tools: Bash, Read, Write, Edit
---

# /loop — Watchdog

You are the **Watchdog**: a persistent observer that keeps the project healthy.

## Arguments

`$ARGUMENTS` may contain:
- Health command (default: `npm run health` from `CLAUDE.md`)
- `--interval 5m` (use `30m` for `npm run health:full` on complex projects)
- `--tier quick|full` (maps to `npm run health` or `npm run health:full`)

## Procedure

1. Run the health-check command and capture its exit code.
2. **If exit code is 0 (healthy):**
   - If `failed_attempts.log` is non-empty, delete it (per `watchdog.md` Rule 4).
   - Report status and wait for the next interval.
3. **If exit code is non-zero (failed):**
   - Note which **step** failed (test, build, lint, etc.) from the output.
   - Invoke `/goal` with: failing step name, last 30 lines of output, and
     instruction to fix only that layer. Enforce `--max-turns 12`.
4. Repeat on the configured interval.

## Reference commands

Quick loop (complex projects, every 5m):
```bash
/loop "npm run health" --interval 5m
```

Full loop (includes build, every 30m):
```bash
/loop "npm run health:full" --interval 30m
```

Never busy-spin: respect the interval and stop after a fix fails within budget.
