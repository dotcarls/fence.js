# shellcheck shell=bash
# shellcheck disable=SC2034 # PINNED_NODE_STATUS is read by the scripts that source this file.
# Sourced by the hooks. Puts the Node that mise.toml pins first on PATH, because hooks run with
# whatever Node the calling process has (Claude Code, a git GUI) and package.json devEngines
# refuses anything else (ADR-0009, ADR-0011). Never installs anything: a missing toolchain is
# reported, and `mise install` fixes it.
# Sets PINNED_NODE (the wanted version, honoring MISE_NODE_VERSION) and PINNED_NODE_STATUS:
# current | found | missing.
PINNED_NODE="${MISE_NODE_VERSION:-$(sed -n 's/^node *= *"\(.*\)".*/\1/p' "${ROOT:-.}/mise.toml" 2>/dev/null)}"
PINNED_NODE_STATUS=missing
if [ "$(node --version 2>/dev/null)" = "v$PINNED_NODE" ]; then
  PINNED_NODE_STATUS=current
elif command -v mise >/dev/null 2>&1; then
  pinned_node_bin="$(cd "${ROOT:-.}" && MISE_EXEC_AUTO_INSTALL=false mise which node 2>/dev/null)"
  if [ -n "$pinned_node_bin" ] && [ "$("$pinned_node_bin" --version 2>/dev/null)" = "v$PINNED_NODE" ]; then
    PATH="$(dirname "$pinned_node_bin"):$PATH"
    export PATH
    PINNED_NODE_STATUS=found
  fi
fi
pinned_node_missing_message() {
  if command -v mise >/dev/null 2>&1; then
    echo "Node $PINNED_NODE (mise.toml) is not installed or the project's mise.toml is not trusted, so $1 did not run. In the repository run: mise trust && mise install"
  else
    echo "mise is not installed, so Node $PINNED_NODE (mise.toml) could not be found and $1 did not run. Install mise (https://mise.jdx.dev), then in the repository run: mise trust && mise install"
  fi
}
