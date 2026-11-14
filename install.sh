#!/usr/bin/env bash
# Set up VS Code from this repo on the current machine:
#   1. Copy settings.json and keybindings.json into VS Code's user folder.
#      This is one-way: changes made later in VS Code stay on this machine
#      and never touch the repo.
#   2. Build the local extensions from source and install them.
#
# Safe to re-run. A file that differs from the repo's is moved aside to
# <name>.backup-<timestamp> before being replaced, never silently overwritten.
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

install_file() {
  local src="$REPO/$1" dest="$USER_DIR/$1"
  if [[ -L "$dest" ]]; then
    # Left over from the old symlink-based installer: drop the link itself.
    rm "$dest"
    echo "unlink   $dest"
  elif [[ -f "$dest" ]] && cmp -s "$src" "$dest"; then
    echo "ok       $dest"
    return
  elif [[ -e "$dest" ]]; then
    local backup="$dest.backup-$(date +%Y%m%d-%H%M%S)"
    mv "$dest" "$backup"
    echo "backup   $dest -> $backup"
  fi
  cp "$src" "$dest"
  echo "copied   $src -> $dest"
}

install_file settings.json
install_file keybindings.json

for build in "$REPO"/extensions/*/build.sh; do
  echo "extension $(basename "$(dirname "$build")")"
  "$build" --install
done

echo
echo "Done. Run 'Developer: Reload Window' in VS Code."
