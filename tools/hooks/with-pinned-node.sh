#!/usr/bin/env bash
# Runs a command with the Node pinned in mise.toml first on PATH (see pinned-node.sh). Used by the
# git hooks so a commit from a shell or a GUI client uses the same toolchain as CI.
# usage: with-pinned-node.sh <command> [args...]
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
# shellcheck source=SCRIPTDIR/pinned-node.sh
. "$ROOT/tools/hooks/pinned-node.sh"
if [ "$PINNED_NODE_STATUS" = missing ]; then
  pinned_node_missing_message "'$*'" >&2
  exit 1
fi
exec "$@"
