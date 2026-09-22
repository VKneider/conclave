import { ACCEPT_ALL, BIENVENIDA_MAX_LENGTH, DEBOUNCE_SAVE_MS, DEFAULT_TEMA_MODO, TEMA_MODOS } from '../../../AppConfig.js';
import { PRESETS } from '../../../public/data/presets.js';

const ATRIB_TYPE_OPTIONS = [
  { text: 'Texto', value: 'texto' },
  { text: 'Número', value: 'numero' },
  { text: 'Lista', value: 'lista' },
  { text: 'Sí/No', value: 'siNo' },
];

const ADD_ERROR_VISIBLE_MS = 2500;

// Replaces HelpView's CSV/JSON textarea with real visual CRUD for
// Temas/Opciones — the "SETUP now lives entirely in the UI, no files
// on the server" direction. Tema/Opción rows are real Visual components
// (TemaRow/OpcionRow — build-once, reused by stable sliceId, updated
// via a setter) instead of re-templated HTML strings: no more manual
// expanded/collapsed state tracking here, and no innerHTML+string-
// interpolation surface left in this view at all. Text fields use the
// registry Input/Textarea/Select/Checkbox (reskinned to Sticker Book in
// their own CSS) instead of raw <input>/<select> — see the TemaRow.css header
// comment for why that reskin is safe (no Shadow DOM). Also hosts the
// Plantilla-level settings that used to live in the now-retired
// SettingsView: "Nombre de la Plantilla" (Detalles) and the "responsables"
// toggle (scoped inside Temas, since it only applies to modo
// Asignación/reparto). Personal/session settings (tu nombre, tema) moved to
// UserMenu instead.
export default class PlantillaBuilderView extends HTMLElement {
  constructor(props) {
    super();
    slice.attachTemplate(this);
    this.$root = this.querySelector('.plantilla-builder-view');
    this.$nombreSlot = this.querySelector('#plantillaNombreSlot');
    this.$bienvenidaSlot = this.querySelector('#bienvenidaSlot');
    this.$bienvenidaCount = this.querySelector('#bienvenidaCount');
    this.$bienvenidaPreviewSlot = this.querySelector('#bienvenidaPreviewSlot');
    this.$lideresSlot = this.querySelector('#lideresToggleSlot');
    this.$presetGrid = this.querySelector('#presetGrid');
    this.$atribList = this.querySelector('#atribList');
    this.$atribEmpty = this.querySelector('#atribEmpty');
    this.$atribAddLabelSlot = this.querySelector('#atribAddLabelSlot');
    this.$atribAddError = this.querySelector('#atribAddError');
    this.$atribAddTypeSlot = this.querySelector('#atribAddTypeSlot');
    this.$atribAddBtnSlot = this.querySelector('#atribAddBtnSlot');
    this.$addCatSlot = this.querySelector('#addCatSlot');
    this.$addCatModoSlot = this.querySelector('#addCatModoSlot');
    this.$addCatError = this.querySelector('#addCatError');
    this.$addOpcSlot = this.querySelector('#addOpcSlot');
    this.$addOpcError = this.querySelector('#addOpcError');
    this.$addCatBtnSlot = this.querySelector('#addCatBtnSlot');
    this.$addOpcBtnSlot = this.querySelector('#addOpcBtnSlot');
    this.$catList = this.querySelector('#catList');
    this.$opcList = this.querySelector('#opcList');
    this.$catCount = this.querySelector('#catCount');
    this.$catFilters = this.querySelector('#catFilters');
    this.$catEmpty = this.querySelector('#catEmpty');
    this.$catFilterEmpty = this.querySelector('#catFilterEmpty');
    this.$opcCount = this.querySelector('#opcCount');
    this.$opcEmpty = this.querySelector('#opcEmpty');
    this.$opcSection = this.querySelector('#opcSection');
    this.$shareBtnSlot = this.querySelector('#sharePlantillaBtnSlot');
    this.$importBtnSlot = this.querySelector('#importPlantillaBtnSlot');
    this.$viewHeaderSlot = this.querySelector('.viewheader-slot');
    this.$importFile = this.querySelector('#importPlantillaFile');
    this.$catClearAllSlot = this.querySelector('#catClearAllSlot');
    this.$catBulkBar = this.querySelector('#catBulkBar');
    this.$catBulkCount = this.querySelector('#catBulkCount');
    this.$catBulkDeleteSlot = this.querySelector('#catBulkDeleteSlot');
    this.$opcClearAllSlot = this.querySelector('#opcClearAllSlot');
    this.$opcBulkBar = this.querySelector('#opcBulkBar');
    this.$opcBulkCount = this.querySelector('#opcBulkCount');
    this.$opcBulkDeleteSlot = this.querySelector('#opcBulkDeleteSlot');

    // Bulk selection — delegated event on the list container.
    this.$catList.addEventListener('change', (e) => {
      if (e.target.classList.contains('cat-row__select')) this._updateCatBulk();
    });
    this.$opcList.addEventListener('change', (e) => {
      if (e.target.classList.contains('opc-row__select')) this._updateOpcBulk();
    });

    // Preset gallery: load a starter Plantilla (confirm-gated if not empty).
    this.$presetGrid.addEventListener('click', (e) => {
      const card = e.target.closest('[data-preset]');
      if (!card) return;
      const preset = PRESETS.find((p) => p.id === card.dataset.preset);
      if (preset) this._loadPreset(preset);
    });

    // Atributos rows are AtributoRow components now (build-once, reused by
    // stable sliceId) — each one owns its own fields and its remove button,
    // so this view no longer delegates edits for them.

    // Non-restrictive view filter for the Temas list — groups by modo
    // so a Plantilla that mixes Asignación and Texto libre stays scannable,
    // and gives new temas a smart default modo. Never blocks what you
    // can create; "Todas" always shows everything regardless of this.
    this._catFilter = 'all';
    this._catRows = {};
    this._opcRows = {};
    this._atribRows = {};
    this._syncQueues = Object.create(null);
    this._addErrorTimers = new Map();
    this._onTemaMove = ({ temaId, direction }) => this._moveTemaPastHidden(temaId, direction);
    this._onOpcionMove = ({ opcionId, direction }) => this._plantilla.moveOpcion(opcionId, direction);

    this.$importFile.onchange = (e) => this._handleImportFile(e);

    slice.controller.setComponentProps(this, props);
  }

  async init() {
    this.$importFile.accept = ACCEPT_ALL;
    this._plantilla = slice.getComponent('PlantillaService');
    this._html = slice.getComponent('HtmlService');
    this._icons = slice.getComponent('IconProvider');
    const settings = slice.getComponent('SettingsService');

    this.events = slice.events.bind(this);
    this.events.subscribe('tema:move', this._onTemaMove);
    this.events.subscribe('opcion:move', this._onOpcionMove);

    const [nombreInput, lideresCheckbox, addCatInput, addCatModoSelect, addOpcInput, viewHeader, shareBtn, importBtn, catClearAll, opcClearAll, catBulkDelete, opcBulkDelete, addCatBtn, addOpcBtn, atribAddBtn, atribTypeSelect, atribAddLabel] = await Promise.all([
      slice.build('Input', { sliceId: 'pbNombre', placeholder: 'Nombre de la Plantilla' }),
      slice.build('Checkbox', { sliceId: 'pbLideres', label: 'Habilitar responsables de tema' }),
      // A Textarea, not an Input: a tema is usually a full question, and a
      // single-line field scrolls it out of sight while it's being written.
      // autoGrow keeps it one line tall until the text actually wraps.
      slice.build('Textarea', { sliceId: 'pbAddCat', placeholder: 'Nuevo tema o pregunta… — escribe y presiona Enter', rows: 1, autoGrow: true }),
      slice.build('Select', { sliceId: 'pbAddCatModo', options: TEMA_MODOS, visibleProp: 'text' }),
      slice.build('Input', { sliceId: 'pbAddOpc', placeholder: 'Nueva opción… — escribe y presiona Enter' }),
      slice.build('ViewHeader', { sliceId: 'pbViewHeader', title: 'Plantilla', subtitle: 'Una Plantilla es una lista de <b>Temas</b>. Cada Tema elige su <b>modo</b>: <i>Asignación</i> (repartir una lista de personas u opciones entre equipos), <i>Votación</i> (elegir una), <i>Ranking</i> (ordenar) o <i>Texto libre</i> (responder con una idea). Puedes mezclar modos en la misma Plantilla — o empezar desde un ejemplo:' }),
      slice.build('Button', { sliceId: 'pbShareBtn', value: 'Compartir plantilla', icon: { name: 'share-2', size: '14' }, variant: 'filled', onClick: () => slice.getComponent('sharePlantillaModal').show() }),
      slice.build('Button', { sliceId: 'pbImportBtn', value: 'Importar Plantilla', icon: { name: 'upload', size: '14' }, variant: 'ghost', onClick: () => this.$importFile.click() }),
      slice.build('Button', { sliceId: 'pbCatClearAll', value: 'Borrar todo', icon: { name: 'trash-2', size: '14', color: 'var(--danger-color)' }, variant: 'ghost', customColor: { text: 'var(--danger-color)' }, onClick: () => this._confirmClear('temas') }),
      slice.build('Button', { sliceId: 'pbOpcClearAll', value: 'Borrar todo', icon: { name: 'trash-2', size: '14', color: 'var(--danger-color)' }, variant: 'ghost', customColor: { text: 'var(--danger-color)' }, onClick: () => this._confirmClear('opciones') }),
      slice.build('Button', { sliceId: 'pbCatBulkDelete', value: 'Borrar seleccionados', variant: 'danger', size: 'sm', onClick: () => this._confirmBulkDelete('temas') }),
      slice.build('Button', { sliceId: 'pbOpcBulkDelete', value: 'Borrar seleccionadas', variant: 'danger', size: 'sm', onClick: () => this._confirmBulkDelete('opciones') }),
      slice.build('Button', { sliceId: 'pbAddCatBtn', value: 'Agregar', icon: { name: 'plus', size: '14' }, variant: 'filled' }),
      slice.build('Button', { sliceId: 'pbAddOpcBtn', value: 'Agregar', icon: { name: 'plus', size: '14' }, variant: 'filled' }),
      slice.build('Button', { sliceId: 'pbAtribAddBtn', value: 'Agregar', variant: 'ghost' }),
      slice.build('Select', { sliceId: 'pbAtribType', options: ATRIB_TYPE_OPTIONS, visibleProp: 'text' }),
      slice.build('Input', { sliceId: 'pbAtribAddLabel', placeholder: 'Nombre del atributo (ej. Rol)' }),
    ]);
    if (viewHeader instanceof Node) this.$viewHeaderSlot.appendChild(viewHeader);
    this.$nombreInput = nombreInput;
    this.$lideresCheckbox = lideresCheckbox;
    this.$addCatInput = addCatInput;
    this.$addCatModoSelect = addCatModoSelect;
    this.$addOpcInput = addOpcInput;

    this.$nombreSlot.appendChild(nombreInput);
    this.$lideresSlot.appendChild(lideresCheckbox);
    this.$addCatSlot.appendChild(addCatInput);
    this.$addCatModoSlot.appendChild(addCatModoSelect);
    this.$addOpcSlot.appendChild(addOpcInput);
    this.$shareBtnSlot.appendChild(shareBtn);
    this.$importBtnSlot.appendChild(importBtn);
    this.$catClearAllSlot.appendChild(catClearAll);
    this.$opcClearAllSlot.appendChild(opcClearAll);
    this.$catBulkDeleteSlot.appendChild(catBulkDelete);
    this.$opcBulkDeleteSlot.appendChild(opcBulkDelete);
    this.$addCatBtnSlot.appendChild(addCatBtn);
    this.$addOpcBtnSlot.appendChild(addOpcBtn);
    this.$atribAddBtnSlot.appendChild(atribAddBtn);
    this.$atribAddTypeSlot.appendChild(atribTypeSelect);
    this.$atribAddLabelSlot.appendChild(atribAddLabel);
    this.$atribAddLabel = atribAddLabel;

    this.$shareBtn = shareBtn;
    this.$importBtn = importBtn;
    this.$catClearAll = catClearAll;
    this.$opcClearAll = opcClearAll;
    this.$catBulkDelete = catBulkDelete;
    this.$opcBulkDelete = opcBulkDelete;
    this.$addCatBtn = addCatBtn;
    this.$addOpcBtn = addOpcBtn;
    this.$atribAddBtn = atribAddBtn;
    this.$atribTypeSelect = atribTypeSelect;
    atribTypeSelect.value = [ATRIB_TYPE_OPTIONS[0]];

    nombreInput.value = this._plantilla.getNombre();
    nombreInput.addEventListener('change', () => this._plantilla.setNombre(nombreInput.value.trim()));

    // Mensaje de bienvenida. Mismo contrato que TextoCard: guardado con
    // debounce mientras se escribe + guardado inmediato al salir del campo.
    // El contador es de TEXTO PLANO, que es lo que acota `maxLength`; el peso
    // real en el enlace es mayor (las etiquetas HTML cuentan) y lo avisa
    // PlantillaService.canShareByLink() al momento de compartir.
    this.$bienvenidaEditor = await slice.build('EnhancedEditor', {
      sliceId: 'pbBienvenida',
      value: this._plantilla.getBienvenida(),
      placeholder: 'Ej.: Hola equipo — respondan antes del viernes. Cualquier duda, escríbanme.',
      maxLength: BIENVENIDA_MAX_LENGTH,
      oninput: () => { this._updateBienvenidaCount(); this._debouncedSaveBienvenida(); },
      onblur: () => this._saveBienvenida(),
    });
    if (this.$bienvenidaEditor instanceof Node) this.$bienvenidaSlot.appendChild(this.$bienvenidaEditor);

    this.$bienvenidaPreviewBtn = await slice.build('Button', {
      sliceId: 'pbBienvenidaPreview',
      value: 'Vista previa',
      icon: { name: 'eye', size: '14' },
      variant: 'outlined',
      onClick: () => this._previewBienvenida(),
    });
    if (this.$bienvenidaPreviewBtn instanceof Node) this.$bienvenidaPreviewSlot.appendChild(this.$bienvenidaPreviewBtn);

    this._updateBienvenidaCount();

    lideresCheckbox.checked = settings.isLideresEnabled();
    lideresCheckbox.addEventListener('change', () => settings.setLideresEnabled(lideresCheckbox.checked));

    // The modo is chosen at creation time (it used to be silently DEFAULT_TEMA_MODO
    // for every new tema, to be fixed row by row afterwards). It defaults to
    // the active filter — a user looking at "Votación" is most likely adding
    // one — and stays put after each add, so several of a kind go in a row.
    this._setAddCatModo(this._defaultModoForNew());
    this._bindAddInput(addCatInput, addCatBtn, this.$addCatError, 'Escribe el nombre o la pregunta del tema antes de agregarlo.', (name) => {
      const tema = this._plantilla.addTema({ nombre: name, modo: this._selectedAddCatModo() });
      this._flashRow(this._catRows, this.$catList, tema.id);
    });
    this._bindAddInput(addOpcInput, addOpcBtn, this.$addOpcError, 'Escribe el nombre de la opción antes de agregarla.', (name) => {
      const opcion = this._plantilla.addOpcion({ nombre: name });
      this._flashRow(this._opcRows, this.$opcList, opcion.id);
    });
    // Third add row, same contract as the other two — it used to be a raw
    // <input> that silently did nothing when empty.
    this._bindAddInput(atribAddLabel, atribAddBtn, this.$atribAddError, 'Escribe el nombre del atributo antes de agregarlo.', (label) => {
      this._plantilla.addAtributo({ label, type: this._selectedAtribType() });
    });

    this._renderPresets();
    await this._renderTemas();
    // Touch included: a row arms for sorting after a short hold (a swipe still
    // scrolls) — see DragDropService's header. ▲/▼ stay as the precise path.
    this._initSortable();
    this._renderOpciones();
    this._renderAtributos();

    // Catches mutations from outside this view too (e.g. CompareView's
    // Plantilla import) — matches the watch convention every other view uses.
    slice.context.watch('plantilla', this, () => {
      if (this.$nombreInput && document.activeElement !== this.$nombreInput) {
        this.$nombreInput.value = this._plantilla.getNombre();
      }
      this._syncBienvenidaFromState();
      this._renderTemas(); this._renderOpciones(); this._renderAtributos();
    });
    slice.context.watch('settings', this, (s) => {
      if (this.$lideresCheckbox && document.activeElement !== this.$lideresCheckbox) {
        this.$lideresCheckbox.checked = s.lideresEnabled === true;
      }
    });

    this.querySelector('.pb-presets summary').innerHTML = `${this._icons.svg('sparkles', 14, 'var(--primary-color)')} Empieza desde una plantilla de ejemplo`;
  }

  update() {
    if (this.$nombreInput && document.activeElement !== this.$nombreInput) {
      this.$nombreInput.value = this._plantilla.getNombre();
    }
    this._syncBienvenidaFromState();
    this._renderTemas();
    this._renderOpciones();
    this._renderAtributos();
  }

  beforeDestroy() {
    clearTimeout(this._bienvenidaTimer);
    this._addErrorTimers.forEach((t) => clearTimeout(t));
    this._addErrorTimers.clear();
    // The sortables hold the list containers in DragDropService's registry.
    const dnd = slice.getComponent('DragDropService');
    if (dnd?.detach && this._sortableInitialized) { dnd.detach(this.$catList); dnd.detach(this.$opcList); }
  }

  // ── Mensaje de bienvenida ───────────────────────────────────

  _debouncedSaveBienvenida() {
    clearTimeout(this._bienvenidaTimer);
    this._bienvenidaTimer = setTimeout(() => this._saveBienvenida(), DEBOUNCE_SAVE_MS);
  }

  _saveBienvenida() {
    if (!this.$bienvenidaEditor) return;
    clearTimeout(this._bienvenidaTimer);
    const value = this.$bienvenidaEditor.value;
    // Sin cambios reales → no tocar el contexto: cada setState dispara el
    // watcher, que repinta temas y opciones. Un blur sin edición no debe
    // costar un repintado completo de la vista.
    if (value === this._plantilla.getBienvenida()) return;
    this._plantilla.setBienvenida(value);
  }

  // Refresco desde afuera (import de archivo, preset, otra pestaña). Nunca
  // pisa lo que se está escribiendo: el foco vive en el contenteditable de
  // adentro del editor, así que se pregunta por `contains`, no por identidad.
  _syncBienvenidaFromState() {
    if (!this.$bienvenidaEditor) return;
    if (this.$bienvenidaEditor.contains(document.activeElement)) return;
    const stored = this._plantilla.getBienvenida();
    if (this.$bienvenidaEditor.value !== stored) this.$bienvenidaEditor.value = stored;
    this._updateBienvenidaCount();
  }

  // Muestra el mensaje tal como lo verá quien importe la Plantilla, reusando
  // el mismo BienvenidaModal en vez de dibujar una copia acá: un preview con
  // su propio renderizado se desincroniza del real en cuanto uno de los dos
  // cambia, y encima mentiría sobre el saneado (enseñaría estilos o enlaces
  // que después se caen).
  //
  // Fuerza el guardado antes de abrir, porque el guardado va con debounce: si
  // no, la vista previa mostraría el texto de hace 400 ms.
  _previewBienvenida() {
    this._saveBienvenida();
    if (!this._plantilla.hasBienvenida()) {
      this._showToast('Escribe primero un mensaje de bienvenida.', 'info');
      return;
    }
    slice.getComponent('bienvenidaModal').show({
      navigateOnStart: false,
      titulo: 'Vista previa del mensaje',
    }).catch(() => {});
  }

  _updateBienvenidaCount() {
    if (!this.$bienvenidaCount || !this.$bienvenidaEditor) return;
    const used = this.$bienvenidaEditor.textLength;
    this.$bienvenidaCount.textContent = used ? `${used} / ${BIENVENIDA_MAX_LENGTH}` : '';
    this.$bienvenidaCount.classList.toggle('is-full', used >= BIENVENIDA_MAX_LENGTH);
  }

  // Registry Input/Textarea have no submit prop — their native field still
  // fires real DOM events that bubble through the (light-DOM) custom element,
  // so listening for 'keydown' directly on the built instance works exactly
  // like it would on a plain <input>. Type a name, press Enter: added, and
  // the field clears/refocuses itself so several items can be typed
  // back-to-back — no dialog per item.
  //
  // An empty submit is answered, not swallowed: the field shakes (the
  // registry component's own triggerError) and `errorEl` names what's
  // missing. A silent no-op on a pressed button reads as "broken".
  _bindAddInput(input, button, errorEl, emptyMessage, addFn) {
    const commit = () => {
      // Collapse inner whitespace too: a Textarea can hold newlines
      // (Shift+Enter), and a tema name is single-line everywhere it's shown.
      const name = input.value.replace(/\s+/g, ' ').trim();
      if (!name) {
        input.triggerError?.();
        this._showAddError(errorEl, emptyMessage);
        input.focus();
        return;
      }
      this._showAddError(errorEl, '');
      addFn(name);
      input.value = '';
      input.focus();
    };
    // Enter works on desktop; on mobile the virtual "Go/Done/Intro" key is
    // unreliable (Android/Gboard often reports keyCode 229 / key 'Unidentified'
    // mid-composition instead of a clean 'Enter'), so the visible "Agregar"
    // button is the dependable path there. Plain Enter submits even in the
    // Textarea (Shift+Enter still inserts a newline).
    input.addEventListener('keydown', (e) => {
      if ((e.key === 'Enter' || e.keyCode === 13) && !e.shiftKey) { e.preventDefault(); commit(); }
    });
    input.addEventListener('input', () => this._showAddError(errorEl, ''));
    if (button) button.addEventListener('click', commit);
    // Label the mobile keyboard's action key on the inner native field.
    const native = input.querySelector ? input.querySelector('input, textarea') : null;
    if (native) native.setAttribute('enterkeyhint', 'done');
  }

  // Inline message under an add row. Empty text hides it. Auto-hides after a
  // moment so it never lingers as stale scolding once the user moves on.
  _showAddError(errorEl, message) {
    if (!errorEl) return;
    clearTimeout(this._addErrorTimers.get(errorEl));
    errorEl.textContent = message;
    errorEl.hidden = !message;
    if (!message) return;
    this._addErrorTimers.set(errorEl, setTimeout(() => this._showAddError(errorEl, ''), ADD_ERROR_VISIBLE_MS));
  }

  _defaultModoForNew() {
    return this._catFilter !== 'all' && TEMA_MODOS.some((o) => o.value === this._catFilter)
      ? this._catFilter
      : DEFAULT_TEMA_MODO;
  }

  _selectedAddCatModo() {
    const chosen = this.$addCatModoSelect?.value;
    const value = chosen && typeof chosen === 'object' && !Array.isArray(chosen) ? chosen.value : null;
    return TEMA_MODOS.some((o) => o.value === value) ? value : this._defaultModoForNew();
  }

  _setAddCatModo(modo) {
    if (!this.$addCatModoSelect) return;
    const match = TEMA_MODOS.find((o) => o.value === modo);
    if (match) this.$addCatModoSelect.value = [match];
  }

  // Draws the eye to the row a just-added item landed in (it's appended at
  // the END of the list, which may be a screen away from where the cursor
  // is). Waits for the sync pass that builds the row, then pulses it once.
  async _flashRow(registry, container, id) {
    const pending = this._syncQueues[container?.id];
    if (pending) await pending.catch(() => {});
    const row = registry[String(id)];
    if (!(row instanceof HTMLElement)) return;
    row.classList.remove('is-new');
    void row.offsetWidth; // restart the animation if it's still running
    row.classList.add('is-new');
    row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    row.addEventListener('animationend', () => row.classList.remove('is-new'), { once: true });
  }

  // ── Temas ──────────────────────────────────────────────

  async _renderTemas() {
    const temas = this._plantilla.getTemas();
    this.$catCount.textContent = temas.length;
    this.$catEmpty.hidden = temas.length > 0;
    this._renderCatFilters(temas);

    await this._syncRows(this._catRows, temas, this.$catList, 'TemaRow', (row, c) => { row.tema = c; });
    this._applyCatFilter();
    this._updateCatBulk();
  }

  _renderCatFilters(_temas) {
    const filters = [{ value: 'all', text: 'Todas' }, ...TEMA_MODOS];
    if (!filters.some((f) => f.value === this._catFilter)) this._catFilter = 'all';

    this.$catFilters.innerHTML = this._html.sanitize(filters.map((f) =>
      `<button class="pb-filter-btn${f.value === this._catFilter ? ' active' : ''}" data-filter="${f.value}" type="button">${f.icon ? `${this._icons.svg(f.icon, 14, f.color)} ` : ''}${f.text}</button>`
    ).join(''));

    Array.from(this.$catFilters.children).forEach((btn) => {
      btn.onclick = () => {
        this._catFilter = btn.dataset.filter;
        Array.from(this.$catFilters.children).forEach((b) => b.classList.toggle('active', b === btn));
        this._applyCatFilter();
        // The filter is also the smart default for the next tema's modo.
        this._setAddCatModo(this._defaultModoForNew());
      };
    });
  }

  // ▲/▼ move relative to the neighbour the user can SEE. With a modo filter
  // active, a plain ±1 swap against a hidden neighbour looked like a no-op
  // (the row stayed put, only its number changed).
  _moveTemaPastHidden(temaId, direction) {
    const temas = this._plantilla.getTemas();
    const from = temas.findIndex((t) => String(t.id) === String(temaId));
    if (from === -1) return;
    const visible = (t) => this._catFilter === 'all' || t.modo === this._catFilter;
    let to = from + direction;
    while (to >= 0 && to < temas.length && !visible(temas[to])) to += direction;
    if (to < 0 || to >= temas.length) return;
    this._plantilla.reorderTemas(from, to);
  }

  _applyCatFilter() {
    const temas = this._plantilla.getTemas();
    let visibleCount = 0;
    temas.forEach((c) => {
      const row = this._catRows[String(c.id)];
      if (!row) return;
      const show = this._catFilter === 'all' || c.modo === this._catFilter;
      row.hidden = !show;
      if (show) visibleCount++;
    });
    this.$catFilterEmpty.hidden = temas.length === 0 || visibleCount > 0;
  }

  // ── Opciones ────────────────────────────────────────────────

  async _renderOpciones() {
    // The pool only makes sense with at least one Asignación (reparto) Tema —
    // a pure votación/ideas Plantilla shows only Temas (each owning its
    // opciones inline), no separate pool section.
    const hasReparto = this._plantilla.getTemas().some((t) => t.modo === 'reparto');
    this.$opcSection.hidden = !hasReparto;

    // Only the reparto POOL here — votación/ranking temas own their opciones,
    // edited inline in their own TemaRow, not in this global list.
    const opciones = this._plantilla.getOpcionesPool();
    this.$opcCount.textContent = opciones.length;
    this.$opcEmpty.hidden = opciones.length > 0;

    await this._syncRows(this._opcRows, opciones, this.$opcList, 'OpcionRow', (row, o) => { row.opcion = o; });
    this._updateOpcBulk();
  }

  // ── Preset gallery ──────────────────────────────────────────
  _renderPresets() {
    if (!this.$presetGrid) return;
    const esc = (s) => this._html.esc(s);
    this.$presetGrid.innerHTML = this._html.sanitize(PRESETS.map((p) => `
      <button class="pb-preset" type="button" data-preset="${esc(p.id)}">
        <span class="pb-preset__icon">${this._icons.svg(p.icon, 24)}</span>
        <span class="pb-preset__body">
          <span class="pb-preset__name">${esc(p.nombre)}</span>
          <span class="pb-preset__desc">${esc(p.descripcion)}</span>
        </span>
      </button>`).join(''));
  }

  _loadPreset(preset) {
    let prepared;
    try {
      prepared = this._plantilla.prepareImport(preset.plantilla);
    } catch (err) {
      slice.events.emit('toast:show', { message: err.message || 'No se pudo cargar la plantilla.', type: 'error' });
      return;
    }
    const apply = () => {
      this._plantilla.loadFromData(prepared.temas, prepared.opciones, prepared.nombre, prepared.atributos, '', '', prepared.bienvenida);
      slice.events.emit('toast:show', { message: `Plantilla «${preset.nombre}» cargada`, type: 'success' });
    };
    const nTemas = this._plantilla.getTemas().length;
    const nOpc = this._plantilla.getOpciones().length;
    if (nTemas === 0 && nOpc === 0) { apply(); return; }
    slice.events.emit('confirm:request', {
      title: `¿Empezar desde «${preset.nombre}»?`,
      message: `Reemplazará tu Plantilla actual (${nTemas} temas, ${nOpc} opciones)${prepared.impact ? ` y limpiará ${prepared.impact} respuesta(s) que la referencian` : ''}. No se puede deshacer.`,
      confirmLabel: 'Cargar plantilla',
      danger: true,
      onConfirm: apply,
    });
  }

  // ── Atributos custom (dynamic per-Opción fields) ────────────
  _selectedAtribType() {
    const chosen = this.$atribTypeSelect?.value;
    return (chosen && typeof chosen === 'object' && !Array.isArray(chosen) ? chosen.value : chosen) || 'texto';
  }

  // Rows are AtributoRow components, synced by stable key like Temas/Opciones.
  // `key` is this list's identity (an atributo has no `id`), so _syncRows is
  // told how to read it.
  async _renderAtributos() {
    if (!this.$atribList) return;
    const atributos = this._plantilla.getAtributos();
    this.$atribEmpty.hidden = atributos.length > 0;
    await this._syncRows(this._atribRows, atributos, this.$atribList, 'AtributoRow', (row, a) => { row.atributo = a; }, (a) => a.key);
  }

  // ── Bulk selection / delete ─────────────────────────────────
  _selectedTemaIds() {
    return Object.entries(this._catRows).filter(([, row]) => row && row.selected).map(([id]) => id);
  }

  _selectedOpcionIds() {
    return Object.entries(this._opcRows).filter(([, row]) => row && row.selected).map(([id]) => id);
  }

  _updateCatBulk() {
    const n = this._selectedTemaIds().length;
    this.$catBulkBar.hidden = n === 0;
    this.$catBulkCount.textContent = `${n} seleccionado${n === 1 ? '' : 's'}`;
  }

  _updateOpcBulk() {
    const n = this._selectedOpcionIds().length;
    this.$opcBulkBar.hidden = n === 0;
    this.$opcBulkCount.textContent = `${n} seleccionada${n === 1 ? '' : 's'}`;
  }

  _confirmBulkDelete(kind) {
    const ids = kind === 'temas' ? this._selectedTemaIds() : this._selectedOpcionIds();
    if (!ids.length) return;
    const noun = kind === 'temas' ? (ids.length === 1 ? 'tema' : 'temas') : (ids.length === 1 ? 'opción' : 'opciones');
    slice.events.emit('confirm:request', {
      title: `¿Borrar ${ids.length} ${noun}?`,
      message: 'Se quitarán de la Plantilla y se limpiarán las respuestas que las referencian. No se puede deshacer.',
      confirmLabel: 'Borrar',
      danger: true,
      onConfirm: () => {
        if (kind === 'temas') this._plantilla.removeTemas(ids);
        else this._plantilla.removeOpciones(ids);
      },
    });
  }

  _confirmClear(kind) {
    const count = kind === 'temas' ? this._plantilla.getTemas().length : this._plantilla.getOpciones().length;
    if (!count) return;
    const noun = kind === 'temas' ? 'los temas' : 'las opciones';
    slice.events.emit('confirm:request', {
      title: `¿Borrar todos ${noun}?`,
      message: `Se eliminarán ${count} y se limpiarán las respuestas que los referencian. No se puede deshacer.`,
      confirmLabel: 'Borrar todo',
      danger: true,
      onConfirm: () => {
        if (kind === 'temas') this._plantilla.clearTemas();
        else this._plantilla.clearOpciones();
      },
    });
  }

  // Shared "reuse by stable id" list sync: builds a row component for every
  // new item (first-then-Promise.all(rest)), updates existing rows via their
  // setter (cheap, idempotent), destroys rows for items that no longer exist,
  // and reorders the DOM to match. Never rebuilds a survivor.
  //
  // IMPORTANT: keep literal `slice.build('TemaRow', ...)`,
  // `slice.build('OpcionRow', ...)` and `slice.build('AtributoRow', ...)`
  // call sites here (`idOf` reads each list's identity — `id` for temas and
  // opciones, `key` for atributos). The CLI analyzer only
  // detects literal names, so variable-based `slice.build(componentName, ...)`
  // can exclude rows from route bundles (see GOTCHAS.md §5).
  async _syncRows(registry, items, container, componentName, applyItem, idOf = (it) => it.id) {
    const queueKey = container?.id || componentName;
    const run = async () => {
      const rowSliceId = (it) => `${this.sliceId}-${container.id}-${idOf(it)}`;

      const findExistingNode = (sliceId) => {
        if (!container || !sliceId) return null;
        return container.querySelector(`[slice-id="${sliceId}"]`)
          || container.querySelector(`[sliceid="${sliceId}"]`)
          || container.querySelector(`[data-slice-id="${sliceId}"]`);
      };

      const currentIds = new Set(items.map((it) => String(idOf(it))));
      Object.keys(registry).forEach((id) => {
        if (!currentIds.has(id)) {
          slice.controller.destroyComponent(registry[id]);
          delete registry[id];
        }
      });

      items.forEach((it) => {
        const id = String(idOf(it));
        if (registry[id]) return;
        const existing = findExistingNode(rowSliceId(it));
        if (existing) registry[id] = existing;
      });

      const toBuild = items.filter((it) => !registry[String(idOf(it))]);
      if (toBuild.length) {
        const [first, ...rest] = toBuild;
        const registerBuilt = (row, id) => {
          if (!(row instanceof Node)) return;
          registry[String(id)] = row;
        };

        if (componentName === 'TemaRow') {
          const firstSid = rowSliceId(first);
          const firstRow = await slice.build('TemaRow', { sliceId: firstSid }).catch(() => findExistingNode(firstSid));
          const restRows = await Promise.all(rest.map((it) => {
            const sid = rowSliceId(it);
            return slice.build('TemaRow', { sliceId: sid }).catch(() => findExistingNode(sid));
          }));
          [firstRow, ...restRows].forEach((row, i) => registerBuilt(row, idOf(toBuild[i])));
        } else if (componentName === 'OpcionRow') {
          const firstSid = rowSliceId(first);
          const firstRow = await slice.build('OpcionRow', { sliceId: firstSid }).catch(() => findExistingNode(firstSid));
          const restRows = await Promise.all(rest.map((it) => {
            const sid = rowSliceId(it);
            return slice.build('OpcionRow', { sliceId: sid }).catch(() => findExistingNode(sid));
          }));
          [firstRow, ...restRows].forEach((row, i) => registerBuilt(row, idOf(toBuild[i])));
        } else if (componentName === 'AtributoRow') {
          const firstSid = rowSliceId(first);
          const firstRow = await slice.build('AtributoRow', { sliceId: firstSid }).catch(() => findExistingNode(firstSid));
          const restRows = await Promise.all(rest.map((it) => {
            const sid = rowSliceId(it);
            return slice.build('AtributoRow', { sliceId: sid }).catch(() => findExistingNode(sid));
          }));
          [firstRow, ...restRows].forEach((row, i) => registerBuilt(row, idOf(toBuild[i])));
        } else {
          const firstSid = rowSliceId(first);
          const firstRow = await slice.build(componentName, { sliceId: firstSid }).catch(() => findExistingNode(firstSid));
          const restRows = await Promise.all(rest.map((it) => {
            const sid = rowSliceId(it);
            return slice.build(componentName, { sliceId: sid }).catch(() => findExistingNode(sid));
          }));
          [firstRow, ...restRows].forEach((row, i) => registerBuilt(row, idOf(toBuild[i])));
        }
      }

      items.forEach((it) => {
        const row = registry[String(idOf(it))];
        if (!row) return;
        applyItem(row, it);
      });

      // Reorder to match the current item order (covers newly-added rows,
      // which build() appended at the end regardless of where they belong).
      items.forEach((it) => {
        const row = registry[String(idOf(it))];
        if (row instanceof Node) container.appendChild(row);
      });
    };

    const pending = this._syncQueues[queueKey] || Promise.resolve();
    const current = pending.then(run, run);
    this._syncQueues[queueKey] = current;
    await current;
    if (this._syncQueues[queueKey] === current) delete this._syncQueues[queueKey];
  }

  // Única entrada de import de Plantilla por archivo de la app (CompareView
  // sólo importa Respuestas y consenso, a pesar de lo que decían los docs).
  // Valida forma e ids y confirma contra el conteo de impacto vía
  // PlantillaService.prepareImport — armar una Plantilla desde cero es
  // justo cuando quieres partir del archivo que te compartieron.
  _handleImportFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      let data;
      try {
        data = JSON.parse(reader.result);
      } catch (err) {
        this._showToast(`No se pudo leer ${file.name}: archivo inválido.`, 'error');
        return;
      }
      let prepared;
      try {
        prepared = this._plantilla.prepareImport(data);
      } catch (err) {
        this._showToast(err.message, 'error');
        return;
      }
      const proceed = () => {
        try {
          this._plantilla.loadFromData(prepared.temas, prepared.opciones, prepared.nombre, prepared.atributos, data.autor || '', data.email || '', prepared.bienvenida);
          this._plantilla.marcarComoImportada();
          this._showToast('Plantilla importada', 'success');
          // Importar acá es el mismo hecho que importar desde un enlace: si la
          // Plantilla trae mensaje de bienvenida, se muestra igual — pero sin
          // el CTA que navega, porque se está editando, no respondiendo.
          // show() es async y este callback no lo es: sin .catch(), un fallo
          // al construir el modal quedaría como unhandledrejection, que los
          // specs detectan como error de página.
          if (this._plantilla.hasBienvenida()) {
            slice.getComponent('bienvenidaModal').show({ navigateOnStart: false }).catch(() => {});
          }
        } catch (err) {
          this._showToast(err.message, 'error');
        }
      };
      if (prepared.impact) {
        slice.events.emit('confirm:request', {
          title: '¿Reemplazar la Plantilla actual?',
          message: `Se reemplazan tus Temas y Opciones actuales por las de «${data.nombre || file.name}». Se limpiarán ${prepared.impact} respuesta${prepared.impact !== 1 ? 's' : ''} que ya no aplicarían. Esta acción no se puede deshacer.`,
          confirmLabel: 'Reemplazar de todas formas',
          danger: true,
          onConfirm: proceed,
        });
      } else {
        proceed();
      }
    };
    reader.readAsText(file);
  }

  _initSortable() {
    if (this._sortableInitialized) return;
    const dnd = slice.getComponent('DragDropService');
    if (!dnd?.makeSortable) return;
    dnd.makeSortable(this.$catList, {
      axis: 'y',
      onReorder: ({ fromIndex, toIndex }) => this._plantilla.reorderTemas(fromIndex, toIndex),
    });
    // The pool list only ever holds pool rows (no filter), so DOM indices are
    // pool indices — exactly what reorderOpcionesPool expects.
    dnd.makeSortable(this.$opcList, {
      axis: 'y',
      onReorder: ({ fromIndex, toIndex }) => this._plantilla.reorderOpcionesPool(fromIndex, toIndex),
    });
    this._sortableInitialized = true;
  }

  _showToast(message, type) {
    slice.events.emit('toast:show', { message, type });
  }
}

customElements.define('slice-plantillabuilderview', PlantillaBuilderView);
