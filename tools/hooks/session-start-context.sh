#!/usr/bin/env bash
# Claude Code SessionStart hook (startup|resume|compact|clear): print the checkpoint summary so
# the agent resumes from recorded state, and say whether the pinned Node the gates need is here.
# Plain stdout is added to the context for SessionStart.
set -uo pipefail
ROOT="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"
cd "$ROOT" || exit 0
CP="docs/work/CHECKPOINT.md"
[ -f "$CP" ] || { echo "fence.js: no $CP yet."; exit 0; }
node - "$CP" <<'JS'
const { readFileSync } = require("node:fs");
const text = readFileSync(process.argv[2], "utf8");
const m = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(text);
const fm = m ? m[1] : "";
const body = m ? m[2] : text;
const field = (k) => (fm.match(new RegExp(`^${k}:\\s*(.*)$`, "m")) || [])[1]?.trim().replace(/^['"]|['"]$/g, "") ?? "?";
const section = (name) => (body.match(new RegExp(`^## ${name}\\s*\\n([\\s\\S]*?)(?=^## |$(?![\\r\\n]))`, "m")) || [])[1]?.trim() ?? "";
console.log(`fence.js CHECKPOINT (${process.argv[2]}): milestone=${field("milestone")} updated=${field("updated")}`);
console.log(`  next_action: ${field("next_action")}`);
const ip = section("In progress");
if (ip) console.log("  In progress:\n    " + ip.split("\n").slice(0, 8).join("\n    "));
console.log("  Read the full checkpoint and docs/INDEX.md; run `npm run gates` before changing governed files.");
JS
# shellcheck source=SCRIPTDIR/pinned-node.sh
. "$ROOT/tools/hooks/pinned-node.sh"
if [ "$PINNED_NODE_STATUS" = missing ]; then
  echo "  WARNING: $(pinned_node_missing_message 'npm scripts and the gate hooks')"
else
  echo "  Toolchain: Node $PINNED_NODE (mise.toml), $PINNED_NODE_STATUS on this machine; run npm commands under mise (mise activate, or mise exec -- npm ...)."
fi
