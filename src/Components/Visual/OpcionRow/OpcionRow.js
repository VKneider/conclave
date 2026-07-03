// One row per Opción in PlantillaBuilderView — build-once, reused by stable
// sliceId, updated via the `opcion` setter. nombre / rol fijo / fijo stay as
// registry components (Input/Checkbox); the per-Opción attribute fields are
// now DYNAMIC — one field per Plantilla `atributo` (Fase 3), rendered as plain
// HTML (no nested Slice components → innerHTML is safe) and reflecting/writing
// `meta[key]`. The field shell is rebuilt only when the attribute SET changes;
// values are synced in place (skipping the focused field) so typing isn't
// interrupted.
export default class OpcionRow extends HTMLElement {
  static props = {
    opcion: { type: 'object', default: null },
  };

  constructor(props) {
    super();
    slice.attachTemplate(this);
    this.$root = this.querySelector('.opc-row');
    this.$select = this.querySelector('.opc-row__select');
    this.$fijoTag = this.querySelector('.opc-row__fijo-tag');
    this.$nameSlot = this.querySelector('.opc-row__name-slot');
    this.$toggle = this.querySelector('.opc-row__toggle');
    this.$remove = this.querySelector('.opc-row__remove');
    this.$extra = this.querySelector('.opc-row__extra');
    this.$atributos = this.querySelector('.opc-row__atributos');
    this.$rolfijoSlot = this.querySelector('.opc-row__rolfijo-slot');
    this.$fijoSlot = this.querySelector('.opc-row__fijo-slot');

    this._expanded = false;
    this._opcion = null;
    this._atribKey = null;
    this._atribEls = {};

    this.$toggle.addEventListener('click', () => this._setExpanded(!this._expanded));
    this.$remove.addEventListener('click', () => this._confirmRemove());

    // Delegated: any attribute field's change writes meta[key].
    this.$atributos.addEventListener('change', (e) => {
      const el = e.target.closest('[data-attr-key]');
      if (!el || !this._opcion) return;
      const key = el.dataset.attrKey;
      const atributo = this._plantilla.getAtributos().find((a) => a.key === key);
      let value;
      if (el.type === 'checkbox') value = el.checked;
      else if (atributo?.type === 'numero') value = el.value === '' ? null : Number(el.value);
      else value = el.value === '' ? null : el.value;
      this._patchMeta({ [key]: value });
    });

    slice.controller.setComponentProps(this, props);
  }

  // Bulk-select state — read by PlantillaBuilderView's bulk-delete bar (the
  // checkbox's change event bubbles to the list container it delegates on).
  get selected() { return !!(this.$select && this.$select.checked); }
  set selected(v) { if (this.$select) this.$select.checked = !!v; }

  async init() {
    this._html = slice.getComponent('HtmlService');
    this._plantilla = slice.getComponent('PlantillaService');

    const [nameInput, rolfijoInput, fijoCheckbox] = await Promise.all([
      slice.build('Input', { sliceId: `${this.sliceId}-name`, placeholder: 'Nombre' }),
      slice.build('Input', { sliceId: `${this.sliceId}-rolfijo`, placeholder: 'Rol fijo (opcional)' }),
      slice.build('Checkbox', { sliceId: `${this.sliceId}-fijo`, label: 'Fija (no entra en el reparto)' }),
    ]);
    this.$nameInput = nameInput;
    this.$rolfijoInput = rolfijoInput;
    this.$fijoCheckbox = fijoCheckbox;

    this.$nameSlot.appendChild(nameInput);
    this.$rolfijoSlot.appendChild(rolfijoInput);
    this.$fijoSlot.appendChild(fijoCheckbox);

    nameInput.addEventListener('change', () => this._patch({ nombre: nameInput.value.trim() }));
    rolfijoInput.addEventListener('change', () => this._patchMeta({ rolFijo: rolfijoInput.value.trim() || null }));
    fijoCheckbox.addEventListener('change', () => this._patchMeta({ fijo: fijoCheckbox.checked }));

    // The Plantilla's attribute definitions can change (builder editor) — keep
    // this row's dynamic fields in sync.
    slice.context.watch('plantilla', this, () => this._renderAtributos());

    this._sync();
  }

  set opcion(value) {
    this._opcion = value;
    if (value) this.dataset.opcId = String(value.id);
    this._sync();
  }

  get opcion() { return this._opcion; }

  _sync() {
    const o = this._opcion;
    if (!o) return;
    const fijo = !!o.meta?.fijo;

    this.$fijoTag.hidden = !fijo;
    this.$remove.hidden = fijo;

    if (this.$nameInput && this.$nameInput.value !== o.nombre) this.$nameInput.value = o.nombre || '';
    const rolFijoValue = o.meta?.rolFijo || '';
    if (this.$rolfijoInput && this.$rolfijoInput.value !== rolFijoValue) this.$rolfijoInput.value = rolFijoValue;
    if (this.$fijoCheckbox) this.$fijoCheckbox.checked = fijo;

    this._renderAtributos();
  }

  _renderAtributos() {
    if (!this._plantilla) return;
    const atributos = this._plantilla.getAtributos();
    const esc = (s) => this._html.esc(s);

    // Rebuild the field shell only when the attribute SET/shape changed.
    const key = atributos.map((a) => `${a.key}:${a.type}:${(a.opciones || []).join('|')}`).join(',');
    if (key !== this._atribKey) {
      this._atribKey = key;
      this.$atributos.innerHTML = this._html.sanitize(atributos.map((a) => this._fieldHtml(a, esc)).join(''));
      this._atribEls = {};
      this.$atributos.querySelectorAll('[data-attr-key]').forEach((el) => { this._atribEls[el.dataset.attrKey] = el; });
    }

    // Sync values in place — skip the focused field so typing isn't reset.
    const o = this._opcion;
    atributos.forEach((a) => {
      const el = this._atribEls[a.key];
      if (!el || el === document.activeElement) return;
      const v = o?.meta?.[a.key];
      if (el.type === 'checkbox') el.checked = (v === true || v === 'true');
      else {
        const next = v == null ? '' : String(v);
        if (el.value !== next) el.value = next;
      }
    });
  }

  _fieldHtml(a, esc) {
    const label = esc(a.label || a.key);
    if (a.type === 'siNo') {
      return `<label class="opc-row__mini-field opc-row__attr-check">
        <input type="checkbox" data-attr-key="${esc(a.key)}" /> ${label}</label>`;
    }
    if (a.type === 'lista') {
      const opts = ['<option value="">—</option>']
        .concat((a.opciones || []).map((o) => `<option value="${esc(o)}">${esc(o)}</option>`))
        .join('');
      return `<label class="opc-row__mini-field">${label}
        <select data-attr-key="${esc(a.key)}">${opts}</select></label>`;
    }
    const inputType = a.type === 'numero' ? 'number' : 'text';
    return `<label class="opc-row__mini-field">${label}
      <input type="${inputType}" data-attr-key="${esc(a.key)}" /></label>`;
  }

  _setExpanded(expanded) {
    this._expanded = expanded;
    this.$extra.hidden = !expanded;
    this.$toggle.textContent = `${expanded ? '▾' : '▸'} Detalles`;
    this.$toggle.setAttribute('aria-expanded', String(expanded));
  }

  _patch(changes) {
    slice.getComponent('PlantillaService').updateOpcion(this._opcion.id, changes);
  }

  _patchMeta(changes) {
    this._patch({ meta: { ...this._opcion.meta, ...changes } });
  }

  _confirmRemove() {
    const plantilla = slice.getComponent('PlantillaService');
    const o = this._opcion;
    const seleccion = slice.getComponent('RespuestasService').getState().seleccion;
    const impact = seleccion[o.id] ? 1 : 0;
    const suffix = impact ? ' Se limpiará su respuesta asociada.' : '';
    slice.events.emit('confirm:request', {
      title: `¿Eliminar «${o.nombre || o.id}»?`,
      message: `Esta acción no se puede deshacer.${suffix}`,
      confirmLabel: 'Eliminar',
      danger: true,
      onConfirm: () => {
        plantilla.removeOpcion(o.id);
        slice.events.emit('toast:show', { message: 'Opción eliminada', type: 'success' });
      },
    });
  }
}

customElements.define('slice-opcionrow', OpcionRow);
