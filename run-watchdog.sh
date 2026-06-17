#!/usr/bin/env bash
# Autonomous watchdog launcher for small/local models (Linux/macOS).
# Runs the DETERMINISTIC orchestrator: the control loop lives in Node, not in the
# model, so a weak local model cannot spiral into re-reads or repeated dead fixes.
#
# Usage:
#   ./run-watchdog.sh              # autonomous: build milestones + self-heal until done
#   ./run-watchdog.sh --test       # one health check only (verify environment)
#   ./run-watchdog.sh --interactive

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

log() { printf '\033[36m[watchdog]\033[0m %s\n' "$*"; }

TEST=false
INTERACTIVE=false
for arg in "$@"; do
  case "$arg" in
    --test) TEST=true ;;
    --interactive) INTERACTIVE=true ;;
    -h|--help) echo "Usage: $0 [--test] [--interactive]"; exit 0 ;;
  esac
done

command -v claude >/dev/null 2>&1 || { echo "Claude Code CLI not found." >&2; exit 1; }
command -v node   >/dev/null 2>&1 || { echo "Node.js not found." >&2; exit 1; }
[[ -f project_description.md ]] || { echo "project_description.md not found." >&2; exit 1; }

CONFIG_JSON="$(node scripts/parse-project-config.mjs)"
read_cfg() { echo "$CONFIG_JSON" | node -e "process.stdout.write(String(JSON.parse(require('fs').readFileSync(0,'utf8'))['$1']??''))"; }
NAME="$(read_cfg name)"; VERSION="$(read_cfg version)"; HEALTH="$(read_cfg health_command)"
log "Project: $NAME v$VERSION"

if [[ "$INTERACTIVE" == true ]]; then
  log "Starting interactive Claude Code session ..."
  exec claude --dangerously-skip-permissions
fi

if [[ "$TEST" == true ]]; then
  log "Health check (one cycle): $HEALTH"
  if eval "$HEALTH"; then log "RESULT: PASS"; else log "RESULT: FAIL"; exit 1; fi
  exit 0
fi

log "Starting DETERMINISTIC orchestrator (autonomous) ..."
log "The loop runs in Node; the model is called only for small scoped tasks."
if node scripts/orchestrator.mjs; then
  log "DONE: project complete and verified green."
else
  log "STOPPED: blocked for human review (see failed_attempts.log)."
  exit 2
fi
