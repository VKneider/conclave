// Lightweight HTML editor using contenteditable.
// Toolbar: bold, italic, bullet list, ordered list.
// Keyboard shortcuts: Ctrl+B, Ctrl+I, Ctrl+Shift+7, Ctrl+Shift+8.
// Usage: slice.build('EnhancedEditor', { value, placeholder, oninput, onblur })
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
    this._onSelectionChange = null;

    this.$btnBold = null;
    this.$btnItalic = null;
    this.$btnList = null;
    this.$btnOlist = null;

    slice.controller.setComponentProps(this, props);
  }

  init() {
    this.$mount.setAttribute('contenteditable', 'true');
    this.$mount.setAttribute('role', 'textbox');
    this.$mount.setAttribute('aria-multiline', 'true');
    this.$mount.dataset.placeholder = this.placeholder || 'Escribe...';
    this.$mount.innerHTML = this._stashedValue || '';
    this._syncEmptyState();

    this.$btnBold = this.$toolbar.querySelector('[data-md-cmd="bold"]');
    this.$btnItalic = this.$toolbar.querySelector('[data-md-cmd="italic"]');
    this.$btnList = this.$toolbar.querySelector('[data-md-cmd="list"]');
    this.$btnOlist = this.$toolbar.querySelector('[data-md-cmd="olist"]');

    this._onEditorInput = () => {
      this._syncEmptyState();
      if (this._updating) return;
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

    this.$mount.addEventListener('input', this._onEditorInput);
    this.$mount.addEventListener('blur', this._onEditorBlur);
    this.$mount.addEventListener('keydown', this._onEditorKeydown);
    this.$mount.addEventListener('keyup', this._onEditorKeyup);
    this.$mount.addEventListener('mouseup', this._onEditorMouseup);
    document.addEventListener('selectionchange', this._onSelectionChange);

    this.$btnBold.addEventListener('mousedown', (e) => {
      e.preventDefault();
      this._command('bold');
    });
    this.$btnItalic.addEventListener('mousedown', (e) => {
      e.preventDefault();
      this._command('italic');
    });
    this.$btnList.addEventListener('mousedown', (e) => {
      e.preventDefault();
      this._command('insertUnorderedList');
    });
    this.$btnOlist.addEventListener('mousedown', (e) => {
      e.preventDefault();
      this._command('insertOrderedList');
    });

    this._refreshToolbarState();
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
  setSelectionRange() {
    if (this.$mount) this.$mount.focus();
  }

  beforeDestroy() {
    if (this.$mount && this._onEditorInput) this.$mount.removeEventListener('input', this._onEditorInput);
    if (this.$mount && this._onEditorBlur) this.$mount.removeEventListener('blur', this._onEditorBlur);
    if (this.$mount && this._onEditorKeydown) this.$mount.removeEventListener('keydown', this._onEditorKeydown);
    if (this.$mount && this._onEditorKeyup) this.$mount.removeEventListener('keyup', this._onEditorKeyup);
    if (this.$mount && this._onEditorMouseup) this.$mount.removeEventListener('mouseup', this._onEditorMouseup);
    if (this._onSelectionChange) document.removeEventListener('selectionchange', this._onSelectionChange);
  }

  _command(cmd) {
    this.focus();
    document.execCommand(cmd, false, null);
    this._syncEmptyState();
    this._refreshToolbarState();
    if (this._oninput) this._oninput(this.value);
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
      this._setButtonActive(this.$btnList, false);
      this._setButtonActive(this.$btnOlist, false);
      return;
    }

    this._setButtonActive(this.$btnBold, document.queryCommandState('bold'));
    this._setButtonActive(this.$btnItalic, document.queryCommandState('italic'));
    this._setButtonActive(this.$btnList, document.queryCommandState('insertUnorderedList'));
    this._setButtonActive(this.$btnOlist, document.queryCommandState('insertOrderedList'));
  }
}

customElements.define('slice-enhancededitor', EnhancedEditor);
