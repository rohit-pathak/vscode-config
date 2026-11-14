// @ts-check
/*
 * Vim-style reading keys inside the markdown preview.
 *
 * The preview is a webview (a sandboxed web page), so VSCodeVim never sees
 * these keys. This script is injected into the page through
 * `markdown.previewScripts` and handles them itself:
 *
 *   j / k            scroll down / up a few lines
 *   Ctrl-d / Ctrl-u  half a screen down / up
 *   gg / G           top / bottom
 *   ]] / [[          next / previous heading, scrolled near the top
 *
 * Cmd+Shift+V (built-in markdown.togglePreview) switches back to the source.
 */
(() => {
  const LINE_STEP = 60; // px per j / k
  const HEADING_OFFSET = 8; // px of space left above a heading after ]] / [[
  const SEQUENCE_TIMEOUT = 1000; // ms to wait for the second key of gg / ]] / [[

  /** First key of a two-key sequence ('g', ']' or '['), if one is pending. */
  let pending = null;
  let pendingTimer = 0;

  const scroller = () => document.scrollingElement ?? document.documentElement;

  /** @param {number} dy */
  const scrollByPx = (dy) => window.scrollBy({ top: dy, behavior: 'auto' });

  /** @param {number} top */
  const scrollToPx = (top) => window.scrollTo({ top, behavior: 'auto' });

  /**
   * Scroll so the next (1) or previous (-1) heading sits near the top.
   * Headings are the rendered <h1>-<h6>, so `#` lines inside code blocks
   * never count.
   * @param {1 | -1} direction
   */
  const jumpToHeading = (direction) => {
    const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
    // A heading we just jumped to sits at HEADING_OFFSET; the margins below
    // make sure the next jump moves past it instead of landing on it again.
    const target =
      direction > 0
        ? headings.find((h) => h.getBoundingClientRect().top > HEADING_OFFSET + 4)
        : headings.findLast((h) => h.getBoundingClientRect().top < HEADING_OFFSET - 4);
    if (!target) return;
    scrollToPx(window.scrollY + target.getBoundingClientRect().top - HEADING_OFFSET);
  };

  /** @param {EventTarget | null} target */
  const isTyping = (target) =>
    target instanceof HTMLElement &&
    (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));

  const clearPending = () => {
    pending = null;
    window.clearTimeout(pendingTimer);
  };

  /** @param {string} key */
  const startPending = (key) => {
    clearPending();
    pending = key;
    pendingTimer = window.setTimeout(clearPending, SEQUENCE_TIMEOUT);
  };

  /**
   * Run the action for a key. Returns false if the key isn't ours, so the
   * browser (or VS Code) keeps its default behavior.
   * @param {KeyboardEvent} e
   */
  const handle = (e) => {
    if (e.ctrlKey) {
      const half = window.innerHeight / 2;
      if (e.key === 'd') scrollByPx(half);
      else if (e.key === 'u') scrollByPx(-half);
      else return false;
      return true;
    }

    if (pending) {
      const sequence = pending + e.key;
      clearPending();
      if (sequence === 'gg') scrollToPx(0);
      else if (sequence === ']]') jumpToHeading(1);
      else if (sequence === '[[') jumpToHeading(-1);
      else return false;
      return true;
    }

    switch (e.key) {
      case 'j': scrollByPx(LINE_STEP); return true;
      case 'k': scrollByPx(-LINE_STEP); return true;
      case 'G': scrollToPx(scroller().scrollHeight); return true;
      case 'g':
      case ']':
      case '[':
        startPending(e.key);
        return true;
      default:
        return false;
    }
  };

  document.addEventListener(
    'keydown',
    (e) => {
      if (e.defaultPrevented || e.metaKey || e.altKey || isTyping(e.target)) return;
      if (handle(e)) e.preventDefault();
    },
    true,
  );
})();
