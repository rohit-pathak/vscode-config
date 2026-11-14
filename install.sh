#!/usr/bin/env bash
# Set up VS Code from this repo on the current machine:
#   1. Symlink settings.json and keybindings.json into VS Code's user folder,
#      so the repo files *are* the live settings (edits show up in git diff).
#   2. Build the local extensions from source and install them.
#
# Safe to re-run. Existing files that aren't already our symlinks are moved
# aside to <name>.backup-<timestamp> first, never overwritten.
#
# Supports macOS and Linux. Set VSCODE_USER_DIR to override the target folder.
set -euo pipefail

REPO="$(cd "$(dirname "$0")" && pwd)"

case "$(uname -s)" in
  Darwin) DEFAULT_USER_DIR="$HOME/Library/Application Support/Code/User" ;;
  Linux)  DEFAULT_USER_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/Code/User" ;;
  *) echo "Unsupported OS: $(uname -s). Set VSCODE_USER_DIR to continue." >&2
     [[ -n "${VSCODE_USER_DIR:-}" ]] || exit 1 ;;
esac
USER_DIR="${VSCODE_USER_DIR:-$DEFAULT_USER_DIR}"
mkdir -p "$USER_DIR"

link() {
  local src="$REPO/$1" dest="$USER_DIR/$1"
  if [[ -L "$dest" && "$(readlink "$dest")" == "$src" ]]; then
    echo "ok       $dest"
    return
  fi
  if [[ -e "$dest" || -L "$dest" ]]; then
    local backup="$dest.backup-$(date +%Y%m%d-%H%M%S)"
    mv "$dest" "$backup"
    echo "backup   $dest -> $backup"
  fi
  ln -s "$src" "$dest"
  echo "linked   $dest -> $src"
}

link settings.json
link keybindings.json

for build in "$REPO"/extensions/*/build.sh; do
  echo "extension $(basename "$(dirname "$build")")"
  "$build" --install
done

echo
echo "Done. Run 'Developer: Reload Window' in VS Code."
