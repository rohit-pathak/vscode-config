# Markdown Preview Colors

A local VS Code extension. It colors **bold** text and headings in the
markdown preview with the colors the active theme uses for them in the code
view, and dims body text slightly so both stand out.

## Why an extension

The preview webview gets the theme's workbench colors as CSS variables, but
not its token colors (`markup.bold`, `markup.heading`), and VS Code has no API
for those. So `extension.js` reads the active theme's JSON file, resolves the
two colors with simplified TextMate scope matching, and writes
`generated/preview.css`, which is contributed through `markdown.previewStyles`.

It re-runs when the theme, `editor.tokenColorCustomizations`, or its own
setting changes. Themes with no matching rule, or in `.tmTheme` format, fall
back to terminal ANSI colors.

**Limitation:** while you move through the theme picker, colors stay on the
saved theme. The theme-change event only reports the theme's `kind` (light or
dark), not its name, so the extension reads the name from `workbench.colorTheme`,
which only changes once you press Enter.

## Build and install

No dependencies and no build step: plain JavaScript with `// @ts-check`.

```bash
./build.sh --install
```

Then run **Developer: Reload Window**. Logs: Output panel → "Markdown Preview Colors".

## Setting

- `markdownPreviewColors.bodyTextStrength` (default `85`): percent of the
  editor foreground mixed into the background for body text. `100` = no dimming.
