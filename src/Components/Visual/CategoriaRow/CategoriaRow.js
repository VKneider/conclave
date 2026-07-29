

const MODO_OPTIONS = [
  { text: 'Selección', value: 'seleccion' },
  { text: 'Texto libre', value: 'texto_libre' },
];

// One row per Categoría in PlantillaBuilderView — a real build-once Visual
// component (reused by stable sliceId, updated via the `categoria` setter)
// instead of a re-templated HTML string. Talks directly to PlantillaService,
// same pattern OpcionChip already uses for DragDropService. Nombre/Líder use
// the registry Input, Modo uses the registry Select, Participable uses the
// registry Checkbox — reskinned in CategoriaRow.css to match Sticker Book
// (see that file's header comment for why). Mín/Máx stay plain <input>:
// three dense number fields in a row don't fit Input's floating-label
// pattern, and they're already tucked behind "Detalles".
export default class CategoriaRow extends HTMLElement {
  static props = {
    categoria: { type: 'object', default: null },
  };

  constructor(props) {
    super();
    slice.attachTemplate(this);
    this.$root = this.querySelector('.cat-row');
    this.$icon = this.querySelector('.cat-row__icon');
    this.$nameSlot = this.querySelector('.cat-row__name-slot');
    this.$modoSlot = this.querySelector('.cat-row__modo-slot');
    this.$toggle = this.querySelector('.cat-row__toggle');
    this.$remove = this.querySelector('.cat-row__remove');
    this.$hint = this.querySelector('.cat-row__hint');
    this.$extra = this.querySelector('.cat-row__extra');
    this.$min = this.querySelector('.cat-row__min');
    this.$max = this.querySelector('.cat-row__max');
    this.$liderSlot = this.querySelector('.cat-row__lider-slot');
    this.$participableSlot = this.querySelector('.cat-row__participable-slot');

    // Lives on the instance now, not in a Set the parent view has to track —
    // survives every `categoria` update since the row itself is never rebuilt.
    this._expanded = false;
    this._categoria = null;

    this.$toggle.addEventListener('click', () => this._setExpanded(!this._expanded));
    this.$remove.addEventListener('click', () => this._confirmRemove());
    this.$min.addEventListener('change', () => this._patch({ min: this.$min.value === '' ? null : Number(this.$min.value) }));
    this.$max.addEventListener('change', () => this._patch({ max: this.$max.value === '' ? null : Number(this.$max.value) }));

    // Pattern B: props may arrive before the async sub-components in init()
    // exist — `categoria`'s setter guards on that (see _sync()).
    slice.controller.setComponentProps(this, props);
  }

  async init() {
    const [nameInput, modoSelect, liderInput, participableCheckbox] = await Promise.all([
      slice.build('Input', { sliceId: `${this.sliceId}-name`, placeholder: 'Nombre' }),
      slice.build('Select', { sliceId: `${this.sliceId}-modo`, options: MODO_OPTIONS, visibleProp: 'text' }),
      slice.build('Input', { sliceId: `${this.sliceId}-lider`, placeholder: 'Responsable fijo (opcional)' }),
      slice.build('Checkbox', { sliceId: `${this.sliceId}-participable`, label: 'Participable' }),
    ]);
    this.$nameInput = nameInput;
    this.$modoSelect = modoSelect;
    this.$liderInput = liderInput;
    this.$participableCheckbox = participableCheckbox;

    this.$nameSlot.appendChild(nameInput);
    this.$modoSlot.appendChild(modoSelect);
    this.$liderSlot.appendChild(liderInput);
    this.$participableSlot.appendChild(participableCheckbox);

    nameInput.addEventListener('change', () => this._patch({ nombre: nameInput.value.trim() }));
    modoSelect.onChange = () => {
      const chosen = modoSelect.value;
      if (chosen && !Array.isArray(chosen)) this._patch({ modo: chosen.value });
    };
    liderInput.addEventListener('change', () => {
      this._patch({ meta: { ...this._categoria.meta, lider: liderInput.value.trim() || null } });
    });
    participableCheckbox.addEventListener('change', () => this._patch({ participable: participableCheckbox.checked }));

    this._sync();
  }

  set categoria(value) {
    this._categoria = value;
    if (value) this.dataset.catId = String(value.id);
    this._sync();
  }

  get categoria() { return this._categoria; }

  // Applies the current categoría to every child field. Guarded so it's safe
  // to call before init()'s sub-components exist, and idempotent so the
  // per-mutation context-watch repaint (which calls this on every row, not
  // just the one that changed) is cheap and side-effect-free.
  _sync() {
    const c = this._categoria;
    if (!c) return;
    const isSeleccion = c.modo === 'seleccion';

    this.$icon.innerHTML = slice.getComponent('IconProvider').svg(isSeleccion ? 'target' : 'file-text', 14, isSeleccion ? 'var(--primary-color)' : 'var(--success-color)');
    this.$icon.title = isSeleccion ? 'Selección' : 'Texto libre';
    this.$hint.textContent = isSeleccion
      ? 'Ej: un equipo, una charla — las Opciones se ubican acá.'
      : 'Ej: "¿Qué propones para el cierre?" — cada persona escribe su respuesta, sin Opciones.';
    this.$toggle.hidden = !isSeleccion;

    if (this.$nameInput && this.$nameInput.value !== c.nombre) this.$nameInput.value = c.nombre || '';
    if (this.$modoSelect) {
      const match = MODO_OPTIONS.find((o) => o.value === c.modo) || MODO_OPTIONS[0];
      if (!this.$modoSelect.value || this.$modoSelect.value.value !== match.value) this.$modoSelect.value = [match];
    }
    if (this.$min.value !== String(c.min ?? '')) this.$min.value = c.min ?? '';
    if (this.$max.value !== String(c.max ?? '')) this.$max.value = c.max ?? '';
    const liderValue = c.meta?.lider || '';
    if (this.$liderInput && this.$liderInput.value !== liderValue) this.$liderInput.value = liderValue;
    if (this.$participableCheckbox) this.$participableCheckbox.checked = !!c.participable;

    this._setExpanded(this._expanded && isSeleccion);
  }

  _setExpanded(expanded) {
    this._expanded = expanded;
    const isSeleccion = this._categoria?.modo === 'seleccion';
    this.$extra.hidden = !expanded || !isSeleccion;
    this.$toggle.innerHTML = `${expanded ? slice.getComponent('IconProvider').svg('chevron-down', 14) : slice.getComponent('IconProvider').svg('chevron-right', 14)} Detalles`;
    this.$toggle.setAttribute('aria-expanded', String(expanded));
  }

  _patch(changes) {
    slice.getComponent('PlantillaService').updateCategoria(this._categoria.id, changes);
  }

  _confirmRemove() {
    const plantilla = slice.getComponent('PlantillaService');
    const c = this._categoria;
    const respuestas = slice.getComponent('RespuestasService').getState();
    const impact = c.modo === 'texto_libre'
      ? (respuestas.texto[c.id] ? 1 : 0)
      : Object.values(respuestas.seleccion).filter((cid) => cid === c.id).length;
    const suffix = impact ? ` Se limpiarán ${impact} respuesta${impact !== 1 ? 's' : ''} que apuntaban a ella.` : '';
    slice.events.emit('confirm:request', {
      title: `¿Eliminar «${c.nombre || c.id}»?`,
      message: `Esta acción no se puede deshacer.${suffix}`,
      confirmLabel: 'Eliminar',
      danger: true,
      onConfirm: () => {
        plantilla.removeCategoria(c.id);
        slice.events.emit('toast:show', { message: 'Categoría eliminada', type: 'success' });
      },
    });
  }
}

customElements.define('slice-categoriarow', CategoriaRow);
