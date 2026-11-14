# Keybindings

Vim mode (VSCodeVim) with LazyVim's default keys wherever LazyVim has one, so
the same muscle memory works in Neovim. Leader is `Space`.

LazyVim groups leader keys by the first letter: `f` files, `g` git, `s` search,
`c` code, `b` buffers, `u` UI toggles.

Where they live:

- Vim-mode keys: `vim.normalModeKeyBindingsNonRecursive` in [`settings.json`](settings.json)
- File-explorer keys: [`keybindings.json`](keybindings.json) (Vim mode doesn't reach the explorer)
- `]]` / `[[` and the preview's reading keys: the local [`markdown-preview-colors`](extensions/markdown-preview-colors) extension

## Files and editors

| Keys | Action |
|---|---|
| `<leader>e` | Open and focus the file explorer |
| `<leader><space>` / `<leader>ff` | Find file (Quick Open) |
| `<leader>fr` | Recent files and folders |
| `<leader>/` | Search across files |
| `<leader>,` | List open editors |
| `H` / `L` | Previous / next editor tab (replaces Vim's top/bottom of screen) |
| `<leader>bd` | Close editor |

### In the file explorer

| Keys | Action |
|---|---|
| `j` / `k` | Down / up |
| `l` | Open file, or expand folder |
| `h` | Collapse folder |
| `q` | Close the explorer |

These take `j`, `k`, `h`, `l` and `q` from type-to-find in the explorer.

## Git

| Keys | Action |
|---|---|
| `<leader>gd` | Diff the current file against HEAD |
| `<leader>gs` | Git status (Source Control view) |
| `]h` / `[h` | Next / previous changed hunk in the file |
| `<leader>ghp` | Peek the next hunk's diff inline |
| `<leader>gb` | Toggle inline blame |

## Reading code

| Keys | Action |
|---|---|
| `gd` | Go to definition (VSCodeVim built-in) |
| `gr` | References |
| `gI` | Implementation |
| `gy` | Type definition |
| `K` | Hover docs |
| `<leader>ss` | Symbols in this file (in markdown: headings) |
| `<leader>sS` | Symbols across the workspace |
| `<leader>cs` | Focus the Outline |
| `]d` / `[d` | Next / previous problem |
| `]]` / `[[` | Next / previous reference to the symbol under the cursor |
| `Ctrl-o` / `Ctrl-i` | Jump back / forward (VSCodeVim built-in) |

## Reading markdown

**`Cmd+Shift+V`** switches the tab between source and preview, both ways
(built-in `markdown.togglePreview`). Both directions keep your scroll position.

### In the preview

The preview is a web page, so VSCodeVim doesn't reach it. A script from the
local extension provides these instead:

| Keys | Action |
|---|---|
| `j` / `k` | Scroll down / up a few lines |
| `Ctrl-d` / `Ctrl-u` | Half a screen down / up |
| `gg` / `G` | Top / bottom |
| `]]` / `[[` | Next / previous heading, scrolled near the top |
| `Space` / `Shift-Space` | Page down / up (browser default) |

Leader keys don't work here: `Space` is page-down. Press `Cmd+Shift+V` to get
back to the source first.

### In the source

| Keys | Action |
|---|---|
| `<leader>cp` | Open the preview to the side (scrolls with the cursor) |
| `]]` / `[[` | Next / previous heading (skips `#` in code blocks and front matter) |
| `}` / `{` | Next / previous paragraph |
| `Ctrl-d` / `Ctrl-u` | Half a screen down / up |
| `zt` / `zz` | Put the current line at the top / middle of the screen |
| `za` | Fold or unfold this section |
| `zM` / `zR` | Fold everything (an outline of headings) / unfold everything |
| `<leader>ss` | Jump to a heading by name |
| `<leader>uz` | Zen mode, for distraction-free reading |
| `<leader>uw` | Toggle word wrap |

Sticky Scroll keeps the current heading path pinned at the top of the editor.

## Windows

| Keys | Action |
|---|---|
| `Ctrl-h/j/k/l` | Move to the split left / below / above / right |
| `<leader>\|` / `<leader>-` | Split right / below |
