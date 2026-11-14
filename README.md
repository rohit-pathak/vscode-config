# vscode-config

My VS Code setup: user settings, keybindings, and a small local extension,
installable on any macOS or Linux machine with one script.

## Install

```bash
git clone https://github.com/rohit-pathak/vscode-config ~/Development/tools/vscode-config
~/Development/tools/vscode-config/install.sh
```

Then run **Developer: Reload Window** in VS Code.

`install.sh` copies `settings.json` and `keybindings.json` into VS Code's
user folder, then builds each extension in `extensions/` from source and
installs it. Re-running it is safe: a file that differs from the repo's is
backed up as `<name>.backup-<timestamp>` before being replaced.

The copy is one-way. Settings changed later in VS Code stay on that machine and
never reach this repo, so machine-specific (e.g. work) settings can't leak. To
change the shared setup, edit the files here, commit, and re-run `install.sh`.

## Marketplace extensions the settings expect

Not installed by the script. Install them yourself:

- **Vim** (`vscodevim.vim`): the `vim.*` settings
- **Nord** (`arcticicestudio.nord-visual-studio-code`): `workbench.colorTheme`

Without them VS Code ignores those settings and uses the default theme.

Keybindings use `cmd`, so they only apply on macOS.

## Local extensions

- [`markdown-preview-colors`](extensions/markdown-preview-colors): colors bold
  text and headings in the markdown preview to match the theme's code view.
