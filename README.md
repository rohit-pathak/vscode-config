# vscode-config

My VS Code setup: user settings, keybindings, and a small local extension,
installable on any macOS or Linux machine with one script.

## Install

```bash
git clone https://github.com/rohit-pathak/vscode-config ~/Development/tools/vscode-config
~/Development/tools/vscode-config/install.sh
```

Then run **Developer: Reload Window** in VS Code.

`install.sh` symlinks `settings.json` and `keybindings.json` into VS Code's
user folder (existing files are backed up, not overwritten), then builds each
extension in `extensions/` from source and installs it. Re-running it is safe.

Because the settings are symlinked, changes VS Code makes (switching theme, for
example) land in this repo. Review them with `git diff` before committing.

## Marketplace extensions the settings expect

Not installed by the script. Install them yourself:

- **Vim** (`vscodevim.vim`): the `vim.*` settings
- **Nord** (`arcticicestudio.nord-visual-studio-code`): `workbench.colorTheme`

Without them VS Code ignores those settings and uses the default theme.

Keybindings use `cmd`, so they only apply on macOS.

## Local extensions

- [`markdown-preview-colors`](extensions/markdown-preview-colors): colors bold
  text and headings in the markdown preview to match the theme's code view.
