#!/usr/bin/env bash
# Claude Code Stop hook. Blocks the stop (exit 2, stderr shown to Claude) while
# docs/work/CHECKPOINT.md is older than the newest change to the tracker or the decision records,
# or fails the checkpoint check. stop_hook_active guards against loops. The freshness comparison
# needs no toolchain; the content check runs under the Node pinned in mise.toml, and when that is
# not installed the hook says the check did not run (systemMessage) instead of blocking on it.
set -uo pipefail
ROOT="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"
cd "$ROOT" || exit 0
payload="$(cat)"
active="$(printf '%s' "$payload" | node -e '
let s = ""; process.stdin.on("data", (d) => (s += d)).on("end", () => {
  try { console.log(JSON.parse(s).stop_hook_active ? "1" : "0"); } catch { console.log("0"); }
});')"
[ "$active" = "1" ] && exit 0

CP="docs/work/CHECKPOINT.md"
[ -f "$CP" ] || { echo "Stop blocked: $CP does not exist. Write it per docs/toolchain/checkpoint-protocol.md." >&2; exit 2; }

if ! node - "$CP" <<'JS'
const { statSync, readdirSync } = require("node:fs");
const { join } = require("node:path");
const [cp] = process.argv.slice(2);
const newest = (dir) => {
  let t = 0;
  try {
    for (const f of readdirSync(dir)) t = Math.max(t, statSync(join(dir, f)).mtimeMs);
  } catch {}
  return t;
};
const tracker = Math.max(newest("docs/work/items"), newest("docs/adr"));
const checkpoint = statSync(cp).mtimeMs;
if (tracker - checkpoint > 2 * 60 * 1000) {
  console.error(`Stop blocked: ${cp} is older than the newest tracker/ADR change. Refresh it (/checkpoint) before ending.`);
  process.exit(2);
}
JS
then
  exit 2
fi

# shellcheck source=SCRIPTDIR/pinned-node.sh
. "$ROOT/tools/hooks/pinned-node.sh"
if [ "$PINNED_NODE_STATUS" = missing ]; then
  message="$(pinned_node_missing_message "the checkpoint content check")"
  node -e 'console.log(JSON.stringify({ systemMessage: process.argv[1] }))' "$message"
  exit 0
fi
[ -d node_modules ] || exit 0
out="$(npx --no-install tsx tools/gates/cli.ts checkpoint check 2>&1)"
rc=$?
if [ $rc -ne 0 ]; then
  printf 'Stop blocked: the checkpoint fails its checks:\n%s\n' "$out" >&2
  exit 2
fi
exit 0
