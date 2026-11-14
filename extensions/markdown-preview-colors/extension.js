// @ts-check
'use strict';

/*
 * Markdown Preview Colors
 *
 * The markdown preview is a webview. It can see the theme's *workbench*
 * colors as CSS variables (--vscode-editor-foreground, ...), but not the
 * *token* colors (TextMate scope rules like `markup.bold`) that color the
 * code view, and VS Code has no API for them.
 *
 * So this extension reads the active theme's JSON file itself, resolves the
 * colors the code view would use for a bold token and a heading token, and
 * writes them into a CSS file that it contributes as a preview style.
 *
 * Pipeline: theme name -> theme file -> token rules -> two colors -> CSS.
 */

const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

const CSS_PATH = path.join(__dirname, 'generated', 'preview.css');
const CONFIG_SECTION = 'markdownPreviewColors';

/*
 * Scope stacks (outermost first) that VS Code's built-in markdown grammar
 * gives these tokens in the code view. We resolve the color for the innermost
 * scope, the way the editor does.
 */
const BOLD_STACK = ['text.html.markdown', 'meta.paragraph.markdown', 'markup.bold.markdown'];

/** Heading stacks for h1..h6. Most themes color all levels alike; some (Catppuccin) don't. */
const HEADING_STACKS = [1, 2, 3, 4, 5, 6].map((level) => [
  'text.html.markdown',
  'markup.heading.markdown',
  `heading.${level}.markdown`,
  'entity.name.section.markdown',
]);

/* Used when the theme has no rule for a token, or ships a format we skip. */
const FALLBACK = {
  bold: 'var(--vscode-terminal-ansiYellow)',
  heading: 'var(--vscode-terminal-ansiBlue)',
};

/** @param {vscode.ExtensionContext} context */
function activate(context) {
  const log = vscode.window.createOutputChannel('Markdown Preview Colors', { log: true });

  const update = () => {
    try {
      regenerate(log);
    } catch (err) {
      log.error('Failed to generate preview CSS:', err);
    }
  };

  context.subscriptions.push(
    log,
    vscode.commands.registerCommand('markdownPreviewColors.nextHeading', () => jumpToHeading(1)),
    vscode.commands.registerCommand('markdownPreviewColors.previousHeading', () => jumpToHeading(-1)),
    vscode.window.onDidChangeActiveColorTheme(update),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (
        e.affectsConfiguration('workbench.colorTheme') ||
        e.affectsConfiguration('workbench.preferredDarkColorTheme') ||
        e.affectsConfiguration('workbench.preferredLightColorTheme') ||
        e.affectsConfiguration('editor.tokenColorCustomizations') ||
        e.affectsConfiguration(CONFIG_SECTION)
      ) {
        update();
      }
    }),
  );

  update();
}

/* ---------- Heading navigation: ]] and [[ ---------- */

/**
 * In markdown, move the cursor to the next (1) or previous (-1) heading.
 * Elsewhere, fall back to LazyVim's meaning of ]] / [[: next/previous
 * reference to the symbol under the cursor.
 * @param {1 | -1} direction
 */
function jumpToHeading(direction) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;
  if (editor.document.languageId !== 'markdown') {
    vscode.commands.executeCommand(
      direction > 0 ? 'editor.action.wordHighlight.next' : 'editor.action.wordHighlight.prev',
    );
    return;
  }

  const lines = [];
  for (let i = 0; i < editor.document.lineCount; i++) lines.push(editor.document.lineAt(i).text);

  const target = findHeading(headingLines(lines), editor.selection.active.line, direction);
  if (target === undefined) return;

  const pos = new vscode.Position(target, 0);
  editor.selection = new vscode.Selection(pos, pos);
  editor.revealRange(new vscode.Range(pos, pos), vscode.TextEditorRevealType.InCenterIfOutsideViewport);
}

/**
 * Line numbers of ATX headings (`# Title` .. `###### Title`), skipping
 * YAML front matter and fenced code blocks, where `#` starts a comment.
 * @param {string[]} lines
 * @returns {number[]}
 */
function headingLines(lines) {
  const result = [];
  let i = 0;

  // Front matter: a `---` block on the very first line.
  if (/^---\s*$/.test(lines[0] ?? '')) {
    i = 1;
    while (i < lines.length && !/^(---|\.\.\.)\s*$/.test(lines[i])) i++;
    i++;
  }

  /** @type {string | null} the opening fence, e.g. "```" or "~~~~" */
  let fence = null;
  for (; i < lines.length; i++) {
    const line = lines[i];
    const fenceMatch = /^ {0,3}(`{3,}|~{3,})/.exec(line);
    if (fence) {
      // A fence closes with the same character, at least as long, nothing after.
      if (fenceMatch && fenceMatch[1][0] === fence[0] && fenceMatch[1].length >= fence.length &&
          line.trim() === fenceMatch[1]) {
        fence = null;
      }
    } else if (fenceMatch) {
      fence = fenceMatch[1];
    } else if (/^ {0,3}#{1,6}(\s|$)/.test(line)) {
      result.push(i);
    }
  }
  return result;
}

/**
 * The first heading after `line` (direction 1) or the last one before it (-1).
 * @param {number[]} headings sorted line numbers
 * @param {number} line
 * @param {1 | -1} direction
 */
function findHeading(headings, line, direction) {
  return direction > 0 ? headings.find((h) => h > line) : headings.findLast((h) => h < line);
}

/* ---------- Preview colors ---------- */

/** @param {vscode.LogOutputChannel} log */
function regenerate(log) {
  const themeName = activeThemeName();
  const themeFile = themeName ? findThemeFile(themeName) : undefined;
  log.info(`Theme: ${themeName ?? '(unknown)'} -> ${themeFile ?? '(file not found)'}`);

  const rules = [...(themeFile ? loadTokenRules(themeFile, log) : []), ...userTokenRules(themeName)];

  const bold = resolveForeground(rules, BOLD_STACK);
  const headings = HEADING_STACKS.map((stack) => resolveForeground(rules, stack));
  log.info(`Resolved bold=${bold ?? 'fallback'} headings=${headings.map((h) => h ?? 'fallback').join(',')}`);

  const strength = vscode.workspace.getConfiguration(CONFIG_SECTION).get('bodyTextStrength', 85);

  const css = buildCss({
    themeName: themeName ?? 'unknown',
    bold: bold ?? FALLBACK.bold,
    headings: headings.map((h) => h ?? FALLBACK.heading),
    strength: clamp(Number(strength) || 85, 50, 100),
  });

  const previous = fs.existsSync(CSS_PATH) ? fs.readFileSync(CSS_PATH, 'utf8') : '';
  if (css !== previous) {
    fs.mkdirSync(path.dirname(CSS_PATH), { recursive: true });
    fs.writeFileSync(CSS_PATH, css);
    vscode.commands.executeCommand('markdown.preview.refresh');
  }
}

/* ---------- Finding the theme ---------- */

/** The theme the window is showing, honoring auto light/dark switching. */
function activeThemeName() {
  const workbench = vscode.workspace.getConfiguration('workbench');
  const autoDetect = vscode.workspace.getConfiguration('window').get('autoDetectColorScheme');
  if (autoDetect) {
    const kind = vscode.window.activeColorTheme.kind;
    const isLight = kind === vscode.ColorThemeKind.Light || kind === vscode.ColorThemeKind.HighContrastLight;
    return workbench.get(isLight ? 'preferredLightColorTheme' : 'preferredDarkColorTheme');
  }
  return workbench.get('colorTheme');
}

/**
 * Every extension (built-ins included) lists its themes in package.json.
 * The setting stores the theme's `id`, or its `label` when it has no id.
 * @param {string} name
 */
function findThemeFile(name) {
  for (const ext of vscode.extensions.all) {
    const themes = ext.packageJSON?.contributes?.themes;
    if (!Array.isArray(themes)) continue;
    for (const theme of themes) {
      if ((theme.id ?? theme.label) === name || theme.label === name) {
        return path.join(ext.extensionPath, theme.path);
      }
    }
  }
  return undefined;
}

/* ---------- Reading token rules ---------- */

/**
 * Token rules in priority order: included (base) theme first, then this one,
 * so later rules override earlier ones, like VS Code does.
 * @param {string} file
 * @param {vscode.LogOutputChannel} log
 * @returns {any[]}
 */
function loadTokenRules(file, log, depth = 0) {
  if (depth > 5) return [];
  if (!file.endsWith('.json')) {
    // .tmTheme (XML plist) themes need a plist parser; skip them.
    log.warn(`Skipping non-JSON theme file: ${file}`);
    return [];
  }

  const theme = parseJsonc(fs.readFileSync(file, 'utf8'));
  const rules = theme.include ? loadTokenRules(path.join(path.dirname(file), theme.include), log, depth + 1) : [];

  if (Array.isArray(theme.tokenColors)) {
    rules.push(...theme.tokenColors);
  } else if (typeof theme.tokenColors === 'string') {
    log.warn(`Skipping tokenColors file reference: ${theme.tokenColors}`);
  }
  return rules;
}

/**
 * Rules from the user's `editor.tokenColorCustomizations`, global and
 * per-theme (`"[Theme Name]": { textMateRules: [...] }`). They win over the theme.
 * @param {string | undefined} themeName
 */
function userTokenRules(themeName) {
  /** @type {any} */
  const custom = vscode.workspace.getConfiguration('editor').get('tokenColorCustomizations') ?? {};
  const perTheme = themeName ? custom[`[${themeName}]`] : undefined;
  return [...(custom.textMateRules ?? []), ...(perTheme?.textMateRules ?? [])];
}

/**
 * Theme files are JSONC: JSON plus comments and trailing commas.
 * Strip comments (skipping over strings), then trailing commas.
 * @param {string} text
 */
function parseJsonc(text) {
  let out = '';
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];
    if (c === '"') {
      let j = i + 1;
      while (j < text.length && text[j] !== '"') j += text[j] === '\\' ? 2 : 1;
      out += text.slice(i, j + 1);
      i = j;
    } else if (c === '/' && next === '/') {
      while (i < text.length && text[i] !== '\n') i++;
      out += '\n';
    } else if (c === '/' && next === '*') {
      const end = text.indexOf('*/', i + 2);
      i = end === -1 ? text.length : end + 1;
    } else {
      out += c;
    }
  }
  // Good enough for theme files; would misfire on a string containing ",}".
  return JSON.parse(out.replace(/^﻿/, '').replace(/,(\s*[}\]])/g, '$1'));
}

/* ---------- Matching scopes, TextMate style ---------- */

/**
 * The foreground the code view would give the innermost token of `stack`.
 *
 * Simplified TextMate precedence. For each rule selector, score the match:
 *   1. depth: a match on a deeper (more inner) scope wins,
 *   2. specificity: `markup.bold.markdown` beats `markup.bold` beats `markup`,
 *   3. parent selectors: `heading.1 entity.name` beats `entity.name`.
 * Ties go to the later rule. Exclusions (`-`) and groups are skipped.
 *
 * @param {any[]} rules
 * @param {string[]} stack
 * @returns {string | undefined}
 */
function resolveForeground(rules, stack) {
  let best;
  let bestScore = [-1, -1, -1];
  for (const rule of rules) {
    const fg = rule?.settings?.foreground;
    if (!isSafeColor(fg) || rule.scope == null) continue; // no scope = global default
    const selectors = Array.isArray(rule.scope) ? rule.scope : String(rule.scope).split(',');
    for (const selector of selectors) {
      const score = matchSelector(String(selector).trim().split(/\s+/), stack);
      if (score && compareScores(score, bestScore) >= 0) {
        best = fg;
        bestScore = score;
      }
    }
  }
  return best;
}

/**
 * @param {string[]} parts descendant selector, e.g. ['heading.1.markdown', 'entity.name']
 * @param {string[]} stack
 * @returns {number[] | null} [depth, specificity, parent count]
 */
function matchSelector(parts, stack) {
  if (parts.some((p) => p.startsWith('-') || /[|()&]/.test(p))) return null;
  const last = parts[parts.length - 1];
  for (let depth = stack.length - 1; depth >= 0; depth--) {
    if (!scopeMatches(last, stack[depth])) continue;
    // The remaining selector parts must match ancestors, in order.
    let k = parts.length - 2;
    for (let s = depth - 1; s >= 0 && k >= 0; s--) {
      if (scopeMatches(parts[k], stack[s])) k--;
    }
    if (k < 0) return [depth, last.split('.').length, parts.length];
  }
  return null;
}

/** `markup.bold` matches `markup.bold` and `markup.bold.markdown`, not `markup.boldish`. */
function scopeMatches(selector, scope) {
  return scope === selector || scope.startsWith(selector + '.');
}

function compareScores(a, b) {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i];
  return 0;
}

/* ---------- CSS ---------- */

/** Theme files are third-party input; only let plain hex colors into the CSS. */
function isSafeColor(value) {
  return typeof value === 'string' && /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value);
}

function clamp(n, lo, hi) {
  return Math.min(hi, Math.max(lo, n));
}

/** @param {{ themeName: string, bold: string, headings: string[], strength: number }} p */
function buildCss({ themeName, bold, headings, strength }) {
  const safeName = themeName.replace(/\*\//g, '');
  const headingRules = headings.map((color, i) => `body h${i + 1} {\n  color: ${color};\n}`).join('\n\n');
  return `/* Generated by markdown-preview-colors for theme: ${safeName}. Do not edit. */

/* Dim body text a little so bold and headings have room to be brighter. */
body {
  color: color-mix(in srgb, var(--vscode-editor-foreground) ${strength}%, var(--vscode-editor-background));
}

${headingRules}

body :is(strong, b) {
  color: ${bold};
  font-weight: 700;
}

/* Bold inside a heading keeps the heading color. */
body :is(h1, h2, h3, h4, h5, h6) :is(strong, b) {
  color: inherit;
}
`;
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
  // Exported for tests.
  _internal: { headingLines, findHeading, parseJsonc, resolveForeground, matchSelector, buildCss, BOLD_STACK, HEADING_STACKS },
};
