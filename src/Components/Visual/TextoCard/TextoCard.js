// Self-contained text-response card — title, expand button, EnhancedEditor,
// and inline save/status. Built as a Slice component so the parent can
// manage a list of cards via reconciliation (build once, update props).
// Props: temaId, nombre, value, onsave(temaId, value), onexpand()
export default class TextoCard extends HTMLElement {
  constructor(props) {
    super();
    slice.attachTemplate(this);
    this.$title = this.querySelector('.rt-title');
    this.$expandBtn = this.querySelector('.rt-expand');
    this.$editorSlot = this.querySelector('.rt-editor-slot');
    this.$status = this.querySelector('.rt-status');
    this._editor = null;
    this._onsave = null;
    this._onexpand = null;

    this.$expandBtn.addEventListener('click', () => { if (this._onexpand) this._onexpand(); });

    slice.controller.setComponentProps(this, props);
  }

  async init() {
    this.$title.textContent = this.nombre;
    this.$expandBtn.dataset.expand = this.temaId;

    this._editor = await slice.build('EnhancedEditor', {
      value: this.value || '',
      placeholder: 'Escribe tu propuesta…',
      oninput: () => this._debouncedSave(),
      onblur: () => this._save(),
    });
    this.$editorSlot.appendChild(this._editor);
  }

  set temaId(v) { this._temaId = v; if (this.$expandBtn) this.$expandBtn.dataset.expand = v; }
  get temaId() { return this._temaId; }

  set nombre(v) { this._nombre = v; if (this.$title) this.$title.textContent = v; }
  get nombre() { return this._nombre; }

  set value(v) { if (this._editor) this._editor.value = v; }
  get value() { return this._editor?.value || ''; }

  set onsave(fn) { this._onsave = fn; }
  set onexpand(fn) { this._onexpand = fn; }

  focusEditor() { if (this._editor) this._editor.focus(); }
  setSelectionRange(a, b) { if (this._editor) this._editor.setSelectionRange(a, b); }

  _debouncedSave() {
    clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => this._save(), 400);
  }

  _save() {
    if (this._onsave) this._onsave(this._temaId, this.value);
    this.$status.textContent = '✓ Guardado';
    clearTimeout(this._statusTimer);
    this._statusTimer = setTimeout(() => { this.$status.textContent = ''; }, 1200);
  }

  beforeDestroy() {
    clearTimeout(this._saveTimer);
    clearTimeout(this._statusTimer);
  }
}

customElements.define('slice-textocard', TextoCard);
