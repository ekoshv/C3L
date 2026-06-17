# Watchdog Anti-Loop Instructions

- **Rule 1 (Strict Timeout):** If any command, script, or code patch fails 2 consecutive times with the exact same error output, you MUST abandon that approach.
- **Rule 2 (Log the Failure):** Write the failed command, the specific error log, and your hypothesis of why it failed into a temporary file named `failed_attempts.log`.
- **Rule 3 (The Pivot):** You are strictly forbidden from reusing the exact same tool arguments, file patches, or regex rewrites listed in `failed_attempts.log`. You must change your strategy (e.g., check configuration, types, environment variables, or dependencies instead of just fixing the syntax).
- **Rule 4 (Cleanup):** Once the test/build passes successfully, delete `failed_attempts.log`.

## Enforcement (for small/local models)

These rules are NOT left to model judgment. The deterministic orchestrator
(`scripts/orchestrator/`) enforces them in code:

- Rule 1 → `same_error_limit`: identical error fingerprints in a row → STOP.
- No-progress guard → `stall_limit`: model edits no files yet error persists → STOP.
- Implement guard → `impl_attempt_limit`: a milestone gains no new files → STOP.
- Hard ceiling → `max_iterations`: total cycles capped → STOP.
- Rules 2 & 4 → on stop the orchestrator writes `failed_attempts.log` (last BLOCKED
  snapshot) and deletes learning files after verified green `health:full`.
- After every failed fix/recovery attempt the orchestrator writes to
  `failure_journal.log` and runs a short **analyze** call so the model records
  `root_cause` and `do_not_repeat`. Reusable patterns go in `learned_skills.log`.

When a single scoped fix call runs, the model still receives these rules in its
prompt and must honor Rule 3 (pivot, do not repeat logged failures).
