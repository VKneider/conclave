const MODO_OPTIONS = [
  { text: 'Asignación', value: 'reparto' },
  { text: 'Votación', value: 'votacion' },
  { text: 'Ranking', value: 'ranking' },
  { text: 'Texto libre', value: 'texto_libre' },
];

// One row per Tema in PlantillaBuilderView — a real build-once Visual
// component (reused by stable sliceId, updated via the `tema` setter)
// instead of a re-templated HTML string. Talks directly to PlantillaService,
// same pattern OpcionChip already uses for DragDropService. Nombre/Líder use
// the registry Input, Modo uses the registry Select, Participable uses the
// registry Checkbox — reskinned in TemaRow.css to match Sticker Book
// (see that file's header comment for why). Mín/Máx/Cap stay plain <input>:
// three dense number fields in a row don't fit Input's floating-label
// pattern, and they're already tucked behind "Detalles".
export default class TemaRow extends HTMLElement {
  static props = {
    tema: { type: 'object', default: null },
  };

  constructor(props) {
    super();
    slice.attachTemplate(this);
    this.$root = this.querySelector('.cat-row');
    this.$select = this.querySelector('.cat-row__select');
    this.$icon = this.querySelector('.cat-row__icon');
    this.$nameSlot = this.querySelector('.cat-row__name-slot');
    this.$modoSlot = this.querySelector('.cat-row__modo-slot');
    this.$toggle = this.querySelector('.cat-row__toggle');
    this.$remove = this.querySelector('.cat-row__remove');
    this.$hint = this.querySelector('.cat-row__hint');
    this.$extra = this.querySelector('.cat-row__extra');
    this.$min = this.querySelector('.cat-row__min');
    this.$max = this.querySelector('.cat-row__max');
    this.$cap = this.querySelector('.cat-row__cap');
    this.$liderSlot = this.querySelector('.cat-row__lider-slot');
    this.$participableSlot = this.querySelector('.cat-row__participable-slot');
    this.$repartoFields = this.querySelector('.cat-row__reparto-fields');
    this.$votacionEditor = this.querySelector('.cat-row__votacion-editor');
    this.$opcList = this.querySelector('.cat-row__opc-list');
    this.$opcAdd = this.querySelector('.cat-row__opc-add');
    this.$opcAddBtn = this.querySelector('.cat-row__opc-add-btn');

    // Lives on the instance now, not in a Set the parent view has to track —
    // survives every `tema` update since the row itself is never rebuilt.
    this._expanded = false;
    this._tema = null;

    this.$toggle.addEventListener('click', () => this._setExpanded(!this._expanded));
    this.$remove.addEventListener('click', () => this._confirmRemove());
    this.$min.addEventListener('change', () => this._patch({ min: this.$min.value === '' ? null : Number(this.$min.value) }));
    this.$max.addEventListener('change', () => this._patch({ max: this.$max.value === '' ? null : Number(this.$max.value) }));
    this.$cap.addEventListener('change', () => this._patch({ capacidad: this.$cap.value === '' ? null : Number(this.$cap.value) }));

    // Votación/ranking editor: this Tema owns its opciones (temaId === this
    // tema). Plain-HTML list (no nested Slice components) so innerHTML is safe.
    // Add via Enter (desktop) or the "+ Agregar" button (reliable on mobile,
    // where the virtual Enter key is unreliable — same reason as the builder's
    // add rows).
    const addOpc = () => {
      const nombre = this.$opcAdd.value.trim();
      if (!nombre || !this._tema) { this.$opcAdd.focus(); return; }
      slice.getComponent('PlantillaService').addOpcion({ nombre, temaId: this._tema.id });
      this.$opcAdd.value = '';
      this.$opcAdd.focus();
    };
    this.$opcAdd.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.keyCode === 13) { e.preventDefault(); addOpc(); }
    });
    this.$opcAddBtn.addEventListener('click', addOpc);
    this.$opcList.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-remove-opc]');
      if (btn) slice.getComponent('PlantillaService').removeOpcion(btn.dataset.removeOpc);
    });

    // Pattern B: props may arrive before the async sub-components in init()
    // exist — `tema`'s setter guards on that (see _sync()).
    slice.controller.setComponentProps(this, props);
  }

  async init() {
    this._html = slice.getComponent('HtmlService');
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
      this._patch({ meta: { ...this._tema.meta, lider: liderInput.value.trim() || null } });
    });
    participableCheckbox.addEventListener('change', () => this._patch({ participable: participableCheckbox.checked }));

    this._sync();
  }

  set tema(value) {
    this._tema = value;
    if (value) this.dataset.temaId = String(value.id);
    this._sync();
  }

  get tema() { return this._tema; }

  // Applies the current tema to every child field. Guarded so it's safe
  // to call before init()'s sub-components exist, and idempotent so the
  // per-mutation context-watch repaint (which calls this on every row, not
  // just the one that changed) is cheap and side-effect-free.
  _sync() {
    const c = this._tema;
    if (!c) return;
    const isReparto = c.modo === 'reparto';
    const isVotacion = c.modo === 'votacion';
    const isRanking = c.modo === 'ranking';
    const ownsOpciones = isVotacion || isRanking; // votación/ranking own their Opciones
    const hasExtra = isReparto || ownsOpciones;

    this.$icon.textContent = isReparto ? '🎯' : isVotacion ? '🗳️' : isRanking ? '🏆' : '📝';
    this.$icon.title = isReparto ? 'Asignación' : isVotacion ? 'Votación' : isRanking ? 'Ranking' : 'Texto libre';
    this.$hint.textContent = isReparto
      ? 'Ej: un equipo, una charla — las Opciones se ubican acá.'
      : isVotacion
        ? 'Ej: "¿Qué fecha elegimos?" — carga las opciones acá; cada persona elige una.'
        : isRanking
          ? 'Ej: "Ordena las ideas por prioridad" — carga las opciones acá; cada persona las ordena.'
          : 'Ej: "¿Qué proponés para el cierre?" — cada persona escribe su respuesta, sin Opciones.';
    this.$toggle.hidden = !hasExtra;
    if (this.$repartoFields) this.$repartoFields.hidden = !isReparto;
    if (this.$votacionEditor) this.$votacionEditor.hidden = !ownsOpciones;

    if (this.$nameInput && this.$nameInput.value !== c.nombre) this.$nameInput.value = c.nombre || '';
    if (this.$modoSelect) {
      const match = MODO_OPTIONS.find((o) => o.value === c.modo) || MODO_OPTIONS[0];
      if (!this.$modoSelect.value || this.$modoSelect.value.value !== match.value) this.$modoSelect.value = [match];
    }
    if (this.$min.value !== String(c.min ?? '')) this.$min.value = c.min ?? '';
    if (this.$max.value !== String(c.max ?? '')) this.$max.value = c.max ?? '';
    if (this.$cap.value !== String(c.capacidad ?? '')) this.$cap.value = c.capacidad ?? '';
    const liderValue = c.meta?.lider || '';
    if (this.$liderInput && this.$liderInput.value !== liderValue) this.$liderInput.value = liderValue;
    if (this.$participableCheckbox) this.$participableCheckbox.checked = !!c.participable;

    if (ownsOpciones) this._renderOpcList();

    this._setExpanded(this._expanded && hasExtra);
  }

  // Plain-HTML list of this votación Tema's owned opciones — no nested Slice
  // components, so innerHTML is the right tool. The add <input> lives OUTSIDE
  // this container so a repaint never interrupts typing.
  _renderOpcList() {
    if (!this.$opcList || !this._tema) return;
    const opciones = slice.getComponent('PlantillaService').getOpcionesDeTema(this._tema.id);
    const esc = (s) => (this._html ? this._html.esc(s) : String(s == null ? '' : s));
    const html = opciones.length
      ? opciones.map((o) => `
          <div class="cat-row__opc-item">
            <span class="cat-row__opc-name">${esc(o.nombre)}</span>
            <button class="cat-row__opc-remove" type="button" data-remove-opc="${esc(o.id)}" title="Quitar opción">✕</button>
          </div>`).join('')
      : '<div class="cat-row__opc-empty">Sin opciones todavía — agrega al menos dos para votar.</div>';
    this.$opcList.innerHTML = this._html ? this._html.sanitize(html) : html;
  }

  _setExpanded(expanded) {
    this._expanded = expanded;
    const m = this._tema?.modo;
    const hasExtra = m === 'reparto' || m === 'votacion' || m === 'ranking';
    this.$extra.hidden = !expanded || !hasExtra;
    this.$toggle.textContent = `${expanded ? '▾' : '▸'} Detalles`;
    this.$toggle.setAttribute('aria-expanded', String(expanded));
  }

  // Bulk-select state (read by PlantillaBuilderView's bulk-delete bar). The
  // checkbox's native change event bubbles to the list container, where the
  // builder delegates it — no per-row wiring needed here.
  get selected() { return !!(this.$select && this.$select.checked); }
  set selected(v) { if (this.$select) this.$select.checked = !!v; }

  _patch(changes) {
    slice.getComponent('PlantillaService').updateTema(this._tema.id, changes);
  }

  _confirmRemove() {
    const plantilla = slice.getComponent('PlantillaService');
    const c = this._tema;
    const respuestas = slice.getComponent('RespuestasService').getState();
    const impact = c.modo === 'texto_libre'
      ? (respuestas.texto[c.id] ? 1 : 0)
      : c.modo === 'votacion'
        ? (respuestas.voto?.[c.id] ? 1 : 0)
        : c.modo === 'ranking'
          ? ((respuestas.ranking?.[c.id] || []).length ? 1 : 0)
          : Object.values(respuestas.seleccion).filter((cid) => cid === c.id).length;
    const ownsOpciones = c.modo === 'votacion' || c.modo === 'ranking';
    const ownedOpc = ownsOpciones ? plantilla.getOpcionesDeTema(c.id).length : 0;
    const opcSuffix = ownedOpc ? ` Se eliminarán también sus ${ownedOpc} opción${ownedOpc !== 1 ? 'es' : ''}.` : '';
    const suffix = (impact ? ` Se limpiarán ${impact} respuesta${impact !== 1 ? 's' : ''} que apuntaban a ella.` : '') + opcSuffix;
    slice.events.emit('confirm:request', {
      title: `¿Eliminar «${c.nombre || c.id}»?`,
      message: `Esta acción no se puede deshacer.${suffix}`,
      confirmLabel: 'Eliminar',
      danger: true,
      onConfirm: () => {
        plantilla.removeTema(c.id);
        slice.events.emit('toast:show', { message: 'Tema eliminada', type: 'success' });
      },
    });
  }
}

customElements.define('slice-temarow', TemaRow);
