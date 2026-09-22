// Lightweight HTML editor using contenteditable.
// Toolbar: bold, italic, underline, bullet list, ordered list, link.
// Keyboard shortcuts: Ctrl+B, Ctrl+I, Ctrl+U, Ctrl+K, Ctrl+Shift+7/8.
// Usage: slice.build('EnhancedEditor', { value, placeholder, oninput, onblur, maxLength })
//
// `maxLength` counts PLAIN TEXT (textContent), not the resulting HTML — a
// consumer that also needs to bound the real HTML size (e.g. because it travels
// in a URL) has to measure that itself. See PlantillaService.canShareByLink().
//
// Three contracts worth knowing before touching this:
//   • Truncation trims the offending TEXT NODE and deletes what follows with a
//     Range — it must never do `textContent = …`, which flattens the whole
//     document and silently throws away the user's bold/lists.
//   • Every toolbar action is reachable by `click` (so the keyboard works) and
//     preserves the selection via `mousedown` + preventDefault. Doing only the
//     latter left the buttons dead for keyboard users.
//   • Paste is sanitised HERE, with the same sanitizeRichText() that will run
//     on save. Otherwise the editor shows styles/links that get stripped when
//     the value is stored — the editor would be lying about the result.
import { TEXTO_MAX_LENGTH } from '../../../AppConfig.js';

const SAFE_LINK_PROTOCOLS = ['http:', 'https:', 'mailto:'];

export default class EnhancedEditor extends HTMLElement {
  constructor(props) {
    super();
    slice.attachTemplate(this);
    this.$mount = this.querySelector('[data-tiptap]');
    this.$toolbar = this.querySelector('[data-md-toolbar]');
    this._updating = false;
    this._onEditorInput = null;
    this._onEditorBlur = null;
    this._onEditorKeydown = null;
    this._onEditorKeyup = null;
    this._onEditorMouseup = null;
    this._onEditorPaste = null;
    this._onSelectionChange = null;

    this.$btnBold = null;
    this.$btnItalic = null;
    this.$btnUnderline = null;
    this.$btnList = null;
    this.$btnOlist = null;
    this.$btnLink = null;
    this.$btnUnlink = null;

    slice.controller.setComponentProps(this, props);
  }

  init() {
    this._html = slice.getComponent('HtmlService');

    this.$mount.setAttribute('contenteditable', 'true');
    this.$mount.setAttribute('role', 'textbox');
    this.$mount.setAttribute('aria-multiline', 'true');
    this.$mount.dataset.placeholder = this.placeholder || 'Escribe...';
    this.$mount.innerHTML = this._stashedValue || '';
    this._syncEmptyState();

    this.$btnBold = this.$toolbar.querySelector('[data-md-cmd="bold"]');
    this.$btnItalic = this.$toolbar.querySelector('[data-md-cmd="italic"]');
    this.$btnUnderline = this.$toolbar.querySelector('[data-md-cmd="underline"]');
    this.$btnList = this.$toolbar.querySelector('[data-md-cmd="list"]');
    this.$btnOlist = this.$toolbar.querySelector('[data-md-cmd="olist"]');
    this.$btnLink = this.$toolbar.querySelector('[data-md-cmd="link"]');
    this.$btnUnlink = this.$toolbar.querySelector('[data-md-cmd="unlink"]');

    this._onEditorInput = () => {
      this._syncEmptyState();
      if (this._updating) return;
      this._enforceMaxLength();
      if (this._oninput) this._oninput(this.value);
    };
    this._onEditorBlur = () => {
      this._syncEmptyState();
      this._refreshToolbarState();
      if (this._updating) return;
      if (this._onblur) this._onblur(this.value);
    };
    this._onEditorKeydown = (e) => {
      if (!e.ctrlKey && !e.metaKey) return;
      const key = e.key.toLowerCase();
      if (key === 'b') {
        e.preventDefault();
        this._command('bold');
      } else if (key === 'i') {
        e.preventDefault();
        this._command('italic');
      } else if (key === 'u') {
        e.preventDefault();
        this._command('underline');
      } else if (key === 'k') {
        e.preventDefault();
        this._promptLink();
      } else if (e.shiftKey && key === '7') {
        e.preventDefault();
        this._command('insertOrderedList');
      } else if (e.shiftKey && key === '8') {
        e.preventDefault();
        this._command('insertUnorderedList');
      }
    };
    this._onEditorKeyup = () => {
      this._refreshToolbarState();
    };
    this._onEditorMouseup = () => {
      this._refreshToolbarState();
    };
    this._onSelectionChange = () => {
      this._refreshToolbarState();
    };
    // Paste never reaches the browser's default insert: whatever comes from
    // Word or a web page goes through the SAME allowlist that runs on save.
    this._onEditorPaste = (e) => {
      e.preventDefault();
      const clipboard = e.clipboardData;
      const html = clipboard ? clipboard.getData('text/html') : '';
      const plain = clipboard ? clipboard.getData('text/plain') : '';
      const clean = html ? this._sanitizePasted(html) : this._plainToHtml(plain);
      if (!clean) return;
      document.execCommand('insertHTML', false, clean);
      this._syncEmptyState();
      this._enforceMaxLength();
      this._refreshToolbarState();
      if (this._oninput) this._oninput(this.value);
    };

    this.$mount.addEventListener('input', this._onEditorInput);
    this.$mount.addEventListener('blur', this._onEditorBlur);
    this.$mount.addEventListener('keydown', this._onEditorKeydown);
    this.$mount.addEventListener('keyup', this._onEditorKeyup);
    this.$mount.addEventListener('mouseup', this._onEditorMouseup);
    this.$mount.addEventListener('paste', this._onEditorPaste);
    document.addEventListener('selectionchange', this._onSelectionChange);

    // `mousedown` + preventDefault keeps the caret/selection inside the
    // editor when a button is pressed with the pointer; `click` is what makes
    // the same button work from the keyboard (Enter/Space on a focused
    // <button> fires click, never mousedown).
    this._bindToolbarButton(this.$btnBold, () => this._command('bold'));
    this._bindToolbarButton(this.$btnItalic, () => this._command('italic'));
    this._bindToolbarButton(this.$btnUnderline, () => this._command('underline'));
    this._bindToolbarButton(this.$btnList, () => this._command('insertUnorderedList'));
    this._bindToolbarButton(this.$btnOlist, () => this._command('insertOrderedList'));
    this._bindToolbarButton(this.$btnLink, () => this._promptLink());
    this._bindToolbarButton(this.$btnUnlink, () => this._command('unlink'));

    this._refreshToolbarState();
  }

  _bindToolbarButton(button, action) {
    if (!button) return;
    // Keeps the selection: the editor must not lose focus to the button.
    button.addEventListener('mousedown', (e) => e.preventDefault());
    button.addEventListener('click', (e) => {
      e.preventDefault();
      action();
    });
  }

  get value() {
    if (!this.$mount) return this._stashedValue || '';
    const html = this.$mount.innerHTML.trim();
    const text = this.$mount.textContent.replace(/\u00a0/g, ' ').trim();
    if (!text && html.replace(/<br\s*\/?\s*>/gi, '').trim() === '') return '';
    return html;
  }

  set value(v) {
    this._stashedValue = v;
    if (this.$mount) {
      this._updating = true;
      this.$mount.innerHTML = v || '';
      this._syncEmptyState();
      this._refreshToolbarState();
      this._updating = false;
    }
  }

  // PLAIN-TEXT cap. Without the prop, the historical default
  // (TEXTO_MAX_LENGTH), so consumers that already existed do not change.
  get maxLength() { return this._maxLength || TEXTO_MAX_LENGTH; }
  set maxLength(v) {
    const n = Number(v);
    this._maxLength = Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
  }

  // Current plain-text length — what `maxLength` bounds. Consumers showing a
  // counter read it from here instead of reimplementing the count.
  get textLength() {
    if (!this.$mount) return 0;
    return this.$mount.textContent.replace(/\u00a0/g, ' ').trim().length;
  }

  get placeholder() { return this._placeholder; }
  set placeholder(v) {
    this._placeholder = v;
    if (this.$mount) this.$mount.dataset.placeholder = v || 'Escribe...';
  }

  set oninput(fn) { this._oninput = fn; }
  set onblur(fn) { this._onblur = fn; }

  focus() {
    if (this.$mount) this.$mount.focus();
  }

  // Places the caret/selection at a PLAIN-TEXT offset range — the same unit
  // `textLength` and `maxLength` speak, and what callers restoring a caret
  // after a repaint already pass (RespuestasTextoView). It used to ignore both
  // arguments and merely focus, so the caret jumped to the start of the field.
  setSelectionRange(start, end = start) {
    if (!this.$mount) return;
    this.$mount.focus();
    const from = this._pointAt(start);
    const to = this._pointAt(end);
    if (!from || !to) return;
    const range = document.createRange();
    range.setStart(from.node, from.offset);
    range.setEnd(to.node, to.offset);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }

  beforeDestroy() {
    if (this.$mount && this._onEditorInput) this.$mount.removeEventListener('input', this._onEditorInput);
    if (this.$mount && this._onEditorBlur) this.$mount.removeEventListener('blur', this._onEditorBlur);
    if (this.$mount && this._onEditorKeydown) this.$mount.removeEventListener('keydown', this._onEditorKeydown);
    if (this.$mount && this._onEditorKeyup) this.$mount.removeEventListener('keyup', this._onEditorKeyup);
    if (this.$mount && this._onEditorMouseup) this.$mount.removeEventListener('mouseup', this._onEditorMouseup);
    if (this.$mount && this._onEditorPaste) this.$mount.removeEventListener('paste', this._onEditorPaste);
    if (this._onSelectionChange) document.removeEventListener('selectionchange', this._onSelectionChange);
  }

  _command(cmd) {
    this.focus();
    document.execCommand(cmd, false, null);
    this._syncEmptyState();
    this._refreshToolbarState();
    if (this._oninput) this._oninput(this.value);
  }

  // ── Links ───────────────────────────────────────────────────

  // The URL is asked for through `confirm:request` (never a native prompt —
  // see AGENTS.md). Opening that modal moves focus out of the editor, so the
  // selection is captured BEFORE and restored in the callback.
  _promptLink() {
    const saved = this._saveRange();
    const selected = saved ? saved.toString().trim() : '';
    const existing = this._closestLinkHref();
    slice.events.emit('confirm:request', {
      title: existing ? 'Editar el enlace' : 'Insertar un enlace',
      message: selected
        ? `Se enlazará «${selected}».`
        : 'Sin texto seleccionado: se insertará la dirección como texto enlazado.',
      inputLabel: 'Dirección',
      inputPlaceholder: 'https://…',
      inputValue: existing || '',
      confirmLabel: existing ? 'Actualizar' : 'Insertar',
      onConfirm: (url) => this._applyLink(saved, url, selected),
    });
  }

  _applyLink(savedRange, rawUrl, selectedText) {
    const url = this._normalizeUrl(rawUrl);
    if (!url) {
      slice.events.emit('toast:show', { message: 'La dirección no es válida. Usa http://, https:// o mailto:', type: 'error' });
      return;
    }
    this._restoreRange(savedRange);
    if (!selectedText) {
      // Nothing was selected: insert the address as its own linked text.
      document.execCommand('insertText', false, url);
      const sel = window.getSelection();
      if (sel && sel.rangeCount) {
        const range = sel.getRangeAt(0);
        range.setStart(range.endContainer, Math.max(0, range.endOffset - url.length));
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }
    document.execCommand('createLink', false, url);
    this._syncEmptyState();
    this._enforceMaxLength();
    this._refreshToolbarState();
    if (this._oninput) this._oninput(this.value);
  }

  // Accepts "example.com" too — a reader typing a bare domain means https.
  // Anything that is not http/https/mailto is rejected rather than silently
  // rewritten, so `javascript:` never becomes a link (DOMPurify would strip it
  // on save anyway, but the editor should not show it in the first place).
  _normalizeUrl(raw) {
    const value = String(raw == null ? '' : raw).trim();
    if (!value) return null;
    const candidate = /^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`;
    let parsed;
    try {
      parsed = new URL(candidate);
    } catch {
      return null;
    }
    if (!SAFE_LINK_PROTOCOLS.includes(parsed.protocol)) return null;
    return parsed.href;
  }

  _closestLinkHref() {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return '';
    let node = sel.anchorNode;
    if (node && node.nodeType === Node.TEXT_NODE) node = node.parentNode;
    if (!node || !this.$mount.contains(node)) return '';
    const anchor = node.closest ? node.closest('a[href]') : null;
    return anchor ? anchor.getAttribute('href') : '';
  }

  _saveRange() {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return null;
    const range = sel.getRangeAt(0);
    return this._isSelectionInsideEditor() ? range.cloneRange() : null;
  }

  _restoreRange(range) {
    this.$mount.focus();
    if (!range) return;
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }

  // ── Paste ───────────────────────────────────────────────────

  _sanitizePasted(html) {
    if (this._html && this._html.sanitizeRichText) return this._html.sanitizeRichText(html);
    // No HtmlService (a component mounted without Providers): fall back to the
    // plain text rather than inserting unfiltered markup.
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return this._plainToHtml(tmp.textContent || '');
  }

  _plainToHtml(text) {
    const escaped = this._html
      ? this._html.esc(text)
      : String(text == null ? '' : text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    return escaped.replace(/\r?\n/g, '<br>');
  }

  // ── maxLength ───────────────────────────────────────────────

  // Trims the text node that crosses the limit and deletes everything after it
  // with a Range, so the formatting BEFORE the cut survives untouched. The old
  // implementation assigned `textContent`, which replaced the whole document
  // with one flat text node — pasting a long formatted block silently lost
  // every bold, list and paragraph in it.
  _enforceMaxLength() {
    const max = this.maxLength;
    if (this.textLength <= max) return false;

    const nodes = [];
    const walker = document.createTreeWalker(this.$mount, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) nodes.push(walker.currentNode);

    let count = 0;
    let cutNode = null;
    let cutOffset = 0;
    for (const node of nodes) {
      const len = node.data.replace(/\u00a0/g, ' ').length;
      if (count + len >= max) { cutNode = node; cutOffset = max - count; break; }
      count += len;
    }
    if (!cutNode) return false;

    this._updating = true;
    const range = document.createRange();
    range.setStart(cutNode, Math.min(cutOffset, cutNode.data.length));
    range.setEndAfter(this.$mount.lastChild);
    range.deleteContents();   // leaves the range collapsed at the cut point

    // Only move the caret when the editor actually has it — a programmatic
    // `value =` on a field nobody is typing in must not steal focus.
    if (this.$mount.contains(document.activeElement) || document.activeElement === this.$mount) {
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
    this._updating = false;
    this._syncEmptyState();
    return true;
  }

  // Maps a plain-text offset to a (node, offset) DOM point.
  _pointAt(offset) {
    const target = Math.max(0, Number(offset) || 0);
    let count = 0;
    let last = null;
    const walker = document.createTreeWalker(this.$mount, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const len = node.data.length;
      if (count + len >= target) return { node, offset: target - count };
      count += len;
      last = node;
    }
    if (last) return { node: last, offset: last.data.length };
    return { node: this.$mount, offset: this.$mount.childNodes.length };
  }

  _syncEmptyState() {
    if (!this.$mount) return;
    const isEmpty = this.value === '';
    this.$mount.classList.toggle('is-empty', isEmpty);
  }

  _isSelectionInsideEditor() {
    const sel = window.getSelection ? window.getSelection() : null;
    if (!sel || !sel.rangeCount) return false;
    const anchorNode = sel.anchorNode;
    const focusNode = sel.focusNode;
    return !!(anchorNode && focusNode && this.$mount.contains(anchorNode) && this.$mount.contains(focusNode));
  }

  _setButtonActive(button, active) {
    if (!button) return;
    button.classList.toggle('is-active', !!active);
    button.setAttribute('aria-pressed', active ? 'true' : 'false');
  }

  _refreshToolbarState() {
    const inside = this._isSelectionInsideEditor();
    if (!inside) {
      this._setButtonActive(this.$btnBold, false);
      this._setButtonActive(this.$btnItalic, false);
      this._setButtonActive(this.$btnUnderline, false);
      this._setButtonActive(this.$btnList, false);
      this._setButtonActive(this.$btnOlist, false);
      this._setButtonActive(this.$btnLink, false);
      if (this.$btnUnlink) this.$btnUnlink.hidden = true;
      return;
    }

    this._setButtonActive(this.$btnBold, document.queryCommandState('bold'));
    this._setButtonActive(this.$btnItalic, document.queryCommandState('italic'));
    this._setButtonActive(this.$btnUnderline, document.queryCommandState('underline'));
    this._setButtonActive(this.$btnList, document.queryCommandState('insertUnorderedList'));
    this._setButtonActive(this.$btnOlist, document.queryCommandState('insertOrderedList'));

    // "Quitar enlace" only appears when the caret is actually in a link —
    // a permanently disabled button is noise in a toolbar this small.
    const onLink = !!this._closestLinkHref();
    this._setButtonActive(this.$btnLink, onLink);
    if (this.$btnUnlink) this.$btnUnlink.hidden = !onLink;
  }
}

customElements.define('slice-enhancededitor', EnhancedEditor);
