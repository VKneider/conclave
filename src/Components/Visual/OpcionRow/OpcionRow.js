const SEXO_OPTIONS = [
  { text: '—', value: '' },
  { text: 'M', value: 'M' },
  { text: 'F', value: 'F' },
];

// One row per Opción in PlantillaBuilderView — build-once, reused by stable
// sliceId, updated via the `opcion` setter. Same registry-component split as
// CategoriaRow: Input for nombre/rol fijo, Select for sexo, Checkbox for
// fijo, plain <input> for edad (dense, tucked behind "Detalles" already).
export default class OpcionRow extends HTMLElement {
  static props = {
    opcion: { type: 'object', default: null },
  };

  constructor(props) {
    super();
    slice.attachTemplate(this);
    this.$root = this.querySelector('.opc-row');
    this.$fijoTag = this.querySelector('.opc-row__fijo-tag');
    this.$nameSlot = this.querySelector('.opc-row__name-slot');
    this.$toggle = this.querySelector('.opc-row__toggle');
    this.$remove = this.querySelector('.opc-row__remove');
    this.$extra = this.querySelector('.opc-row__extra');
    this.$sexoSlot = this.querySelector('.opc-row__sexo-slot');
    this.$edad = this.querySelector('.opc-row__edad');
    this.$edadWrap = this.$edad.closest('.opc-row__mini-field');
    this.$rolfijoSlot = this.querySelector('.opc-row__rolfijo-slot');
    this.$fijoSlot = this.querySelector('.opc-row__fijo-slot');

    this._expanded = false;
    this._opcion = null;

    this.$toggle.addEventListener('click', () => this._setExpanded(!this._expanded));
    this.$remove.addEventListener('click', () => this._confirmRemove());
    this.$edad.addEventListener('change', () => this._patchMeta({ edad: this.$edad.value === '' ? null : Number(this.$edad.value) }));

    slice.controller.setComponentProps(this, props);
  }

  async init() {
    const [nameInput, sexoSelect, rolfijoInput, fijoCheckbox] = await Promise.all([
      slice.build('Input', { sliceId: `${this.sliceId}-name`, placeholder: 'Nombre' }),
      slice.build('Select', { sliceId: `${this.sliceId}-sexo`, options: SEXO_OPTIONS, visibleProp: 'text' }),
      slice.build('Input', { sliceId: `${this.sliceId}-rolfijo`, placeholder: 'Rol fijo (opcional)' }),
      slice.build('Checkbox', { sliceId: `${this.sliceId}-fijo`, label: 'Fijo (excluida del pool general)' }),
    ]);
    this.$nameInput = nameInput;
    this.$sexoSelect = sexoSelect;
    this.$rolfijoInput = rolfijoInput;
    this.$fijoCheckbox = fijoCheckbox;

    this.$nameSlot.appendChild(nameInput);
    this.$sexoSlot.appendChild(sexoSelect);
    this.$rolfijoSlot.appendChild(rolfijoInput);
    this.$fijoSlot.appendChild(fijoCheckbox);

    nameInput.addEventListener('change', () => this._patch({ nombre: nameInput.value.trim() }));
    sexoSelect.onChange = () => {
      const chosen = sexoSelect.value;
      if (chosen && !Array.isArray(chosen)) this._patchMeta({ sexo: chosen.value });
    };
    rolfijoInput.addEventListener('change', () => this._patchMeta({ rolFijo: rolfijoInput.value.trim() || null }));
    fijoCheckbox.addEventListener('change', () => this._patchMeta({ fijo: fijoCheckbox.checked }));

    // Toggled off in PlantillaBuilderView's Opciones section when they don't
    // matter for this Plantilla (e.g. assigning ponentes, not people) — the
    // underlying meta.sexo/meta.edad is never touched, just hidden/shown.
    slice.context.watch('settings', this, () => this._syncToggles());

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
    if (this.$sexoSelect) {
      const match = SEXO_OPTIONS.find((s) => s.value === (o.meta?.sexo || '')) || SEXO_OPTIONS[0];
      if (!this.$sexoSelect.value || this.$sexoSelect.value.value !== match.value) this.$sexoSelect.value = [match];
    }
    if (this.$edad.value !== String(o.meta?.edad ?? '')) this.$edad.value = o.meta?.edad ?? '';
    const rolFijoValue = o.meta?.rolFijo || '';
    if (this.$rolfijoInput && this.$rolfijoInput.value !== rolFijoValue) this.$rolfijoInput.value = rolFijoValue;
    if (this.$fijoCheckbox) this.$fijoCheckbox.checked = fijo;

    this._syncToggles();
  }

  _syncToggles() {
    const settings = slice.getComponent('SettingsService');
    this.$sexoSlot.hidden = !settings.isSexoEnabled();
    if (this.$edadWrap) this.$edadWrap.hidden = !settings.isEdadEnabled();
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
