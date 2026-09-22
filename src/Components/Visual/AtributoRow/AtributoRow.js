const TYPE_LABEL = { texto: 'Texto', numero: 'Número', lista: 'Lista', siNo: 'Sí/No' };

// One row per custom Opción attribute in PlantillaBuilderView — build-once,
// reused by stable sliceId, updated via the `atributo` setter, exactly like
// TemaRow/OpcionRow. It replaces the raw <input>s the builder used to write
// into an innerHTML region: that region could not hold registry components
// without leaking them on every repaint (GOTCHAS §7), which is why those
// fields were the last hand-rolled ones left in the view.
//
// The `key` never changes (it's the property name each Opción stores its
// value under, and it travels in the exported JSON) — only `label` and, for
// type `lista`, `opciones` are editable here.
export default class AtributoRow extends HTMLElement {
  static props = {
    atributo: { type: 'object', default: null },
  };

  constructor(props) {
    super();
    slice.attachTemplate(this);
    this.$root = this.querySelector('.atr-row');
    this.$labelSlot = this.querySelector('.atr-row__label-slot');
    this.$type = this.querySelector('.atr-row__type');
    this.$optsSlot = this.querySelector('.atr-row__opts-slot');
    this.$remove = this.querySelector('.atr-row__remove');

    this._atributo = null;
    this.$remove.addEventListener('click', () => this._confirmRemove());

    // Pattern B: props can arrive before init()'s sub-components exist —
    // `atributo`'s setter guards on that (see _sync()).
    slice.controller.setComponentProps(this, props);
  }

  async init() {
    const [labelInput, optsInput] = await Promise.all([
      // Short placeholders on purpose: they double as the floating label, and
      // a long one overflows the field on a phone (the panel header already
      // says these are the Opción attributes).
      slice.build('Input', { sliceId: `${this.sliceId}-label`, placeholder: 'Nombre' }),
      slice.build('Input', { sliceId: `${this.sliceId}-opts`, placeholder: 'Opciones (coma)' }),
    ]);
    this.$labelInput = labelInput;
    this.$optsInput = optsInput;
    this.$labelSlot.appendChild(labelInput);
    this.$optsSlot.appendChild(optsInput);

    // Same contract as the other rows' name fields: write only on a real
    // change, Escape discards. An empty label falls back to the key rather
    // than leaving the attribute nameless.
    labelInput.addEventListener('change', () => {
      const label = labelInput.value.trim() || this._atributo?.key || '';
      if (this._atributo && label !== this._atributo.label) this._patch({ label });
      else labelInput.value = this._atributo?.label || '';
    });
    optsInput.addEventListener('change', () => {
      const opciones = optsInput.value.split(',').map((s) => s.trim()).filter(Boolean);
      const current = this._atributo?.opciones || [];
      if (this._atributo && opciones.join('|') !== current.join('|')) this._patch({ opciones });
    });
    [labelInput, optsInput].forEach((input) => {
      input.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        e.preventDefault();
        this._sync();
        e.target.blur?.();
      });
    });

    this._sync();
  }

  set atributo(value) {
    this._atributo = value;
    if (value) this.dataset.atribKey = String(value.key);
    this._sync();
  }

  get atributo() { return this._atributo; }

  // Idempotent and guarded: the per-mutation context-watch repaint calls this
  // on every row, not just the one that changed. Never overwrites the field
  // being typed in.
  _sync() {
    const a = this._atributo;
    if (!a) return;
    this.$type.textContent = TYPE_LABEL[a.type] || a.type;
    this.$optsSlot.hidden = a.type !== 'lista';

    if (this.$labelInput && !this.$labelInput.contains(document.activeElement) && this.$labelInput.value !== a.label) {
      this.$labelInput.value = a.label || '';
    }
    const opts = (a.opciones || []).join(', ');
    if (this.$optsInput && !this.$optsInput.contains(document.activeElement) && this.$optsInput.value !== opts) {
      this.$optsInput.value = opts;
    }
  }

  _patch(changes) {
    slice.getComponent('PlantillaService').updateAtributo(this._atributo.key, changes);
  }

  // Removing an attribute drops whatever every Opción stored under its key,
  // so it is confirm-gated like the other destructive row actions — the raw
  // button it replaces deleted on the first click, with no warning.
  _confirmRemove() {
    const a = this._atributo;
    if (!a) return;
    const plantilla = slice.getComponent('PlantillaService');
    const withValue = plantilla.getOpciones().filter((o) => {
      const v = o.meta?.[a.key];
      return v !== undefined && v !== null && v !== '';
    }).length;
    slice.events.emit('confirm:request', {
      title: `¿Quitar el atributo «${a.label || a.key}»?`,
      message: withValue
        ? `Se perderá el valor que ${withValue} opción${withValue !== 1 ? 'es tienen' : ' tiene'} guardado para este campo. No se puede deshacer.`
        : 'Se quitará de todas las Opciones. No se puede deshacer.',
      confirmLabel: 'Quitar',
      danger: true,
      onConfirm: () => plantilla.removeAtributo(a.key),
    });
  }
}

customElements.define('slice-atributorow', AtributoRow);
