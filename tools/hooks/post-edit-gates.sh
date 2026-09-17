#!/usr/bin/env bash
# Claude Code PostToolUse hook (matcher: Edit|Write). Runs the gate suite after every edit inside
# the repository and feeds findings back to the model. PostToolUse cannot block an edit; exit 2
# makes stderr visible to Claude (https://code.claude.com/docs/en/hooks). Exit 0 reports nothing.
set -uo pipefail
ROOT="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"
cd "$ROOT" || exit 0

payload="$(cat)"
file_path="$(printf '%s' "$payload" | node -e '
let s = ""; process.stdin.on("data", (d) => (s += d)).on("end", () => {
  try { const d = JSON.parse(s); console.log(d.tool_input?.file_path ?? ""); } catch { console.log(""); }
});')"
case "$file_path" in
  "$ROOT"/*|"") ;;   # inside the repository, or unknown
  *) exit 0 ;;        # outside: not ours
esac
case "$file_path" in
  */node_modules/*|*/dist/*|*/site/*|*/coverage/*|*/.git/*) exit 0 ;;
esac
[ -d node_modules ] || { echo "gates hook: node_modules missing; run npm install" >&2; exit 2; }

out="$(npx --no-install tsx tools/gates/cli.ts gates --hook 2>&1)"
rc=$?
if [ $rc -ne 0 ]; then
  printf '%s\n' "$out" >&2
  exit 2
fi
exit 0
