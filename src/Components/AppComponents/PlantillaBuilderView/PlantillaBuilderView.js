import { PRESETS } from '../../../data/presets.js';

// Replaces HelpView's CSV/JSON textarea with real visual CRUD for
// Temas/Opciones — the "SETUP now lives entirely in the UI, no files
// on the server" direction. Tema/Opción rows are real Visual components
// (TemaRow/OpcionRow — build-once, reused by stable sliceId, updated
// via a setter) instead of re-templated HTML strings: no more manual
// expanded/collapsed state tracking here, and no innerHTML+string-
// interpolation surface left in this view at all. Text fields use the
// registry Input/Select/Checkbox (reskinned to Sticker Book in this file's
// CSS) instead of raw <input>/<select> — see the TemaRow.css header
// comment for why that reskin is safe (no Shadow DOM). Also hosts the
// Plantilla-level settings that used to live in the now-retired
// SettingsView: "Nombre de la Plantilla" (Detalles) and the "responsables"
// toggle (scoped inside Temas, since it only applies to modo
// Selección). Personal/session settings (tu nombre, tema) moved to
// UserMenu instead.
export default class PlantillaBuilderView extends HTMLElement {
  constructor(props) {
    super();
    slice.attachTemplate(this);
    this.$root = this.querySelector('.plantilla-builder-view');
    this.$nombreSlot = this.querySelector('#plantillaNombreSlot');
    this.$lideresSlot = this.querySelector('#lideresToggleSlot');
    this.$presetGrid = this.querySelector('#presetGrid');
    this.$atribList = this.querySelector('#atribList');
    this.$atribAddLabel = this.querySelector('#atribAddLabel');
    this.$atribAddType = this.querySelector('#atribAddType');
    this.$atribAddBtn = this.querySelector('#atribAddBtn');
    this.$addCatSlot = this.querySelector('#addCatSlot');
    this.$addOpcSlot = this.querySelector('#addOpcSlot');
    this.$catList = this.querySelector('#catList');
    this.$opcList = this.querySelector('#opcList');
    this.$catCount = this.querySelector('#catCount');
    this.$catFilters = this.querySelector('#catFilters');
    this.$catEmpty = this.querySelector('#catEmpty');
    this.$catFilterEmpty = this.querySelector('#catFilterEmpty');
    this.$opcCount = this.querySelector('#opcCount');
    this.$opcEmpty = this.querySelector('#opcEmpty');
    this.$opcSection = this.querySelector('#opcSection');
    this.$sharePlantillaBtn = this.querySelector('#sharePlantillaBtn');
    this.$importBtn = this.querySelector('#importPlantillaBtn');
    this.$importFile = this.querySelector('#importPlantillaFile');
    this.$catClearAll = this.querySelector('#catClearAll');
    this.$catBulkBar = this.querySelector('#catBulkBar');
    this.$catBulkCount = this.querySelector('#catBulkCount');
    this.$catBulkDelete = this.querySelector('#catBulkDelete');
    this.$opcClearAll = this.querySelector('#opcClearAll');
    this.$opcBulkBar = this.querySelector('#opcBulkBar');
    this.$opcBulkCount = this.querySelector('#opcBulkCount');
    this.$opcBulkDelete = this.querySelector('#opcBulkDelete');

    // Bulk selection: each row carries a checkbox whose native change event
    // bubbles to the list container — delegate it here to keep the "N
    // seleccionados" bar in sync. Delete-selected and delete-all both go
    // through confirm:request (destructive) and the PlantillaService bulk
    // methods (which cascade + clean up references).
    this.$catList.addEventListener('change', (e) => {
      if (e.target.classList.contains('cat-row__select')) this._updateCatBulk();
    });
    this.$opcList.addEventListener('change', (e) => {
      if (e.target.classList.contains('opc-row__select')) this._updateOpcBulk();
    });
    this.$catClearAll.onclick = () => this._confirmClear('temas');
    this.$opcClearAll.onclick = () => this._confirmClear('opciones');
    this.$catBulkDelete.onclick = () => this._confirmBulkDelete('temas');
    this.$opcBulkDelete.onclick = () => this._confirmBulkDelete('opciones');

    // Preset gallery: load a starter Plantilla (confirm-gated if not empty).
    this.$presetGrid.addEventListener('click', (e) => {
      const card = e.target.closest('[data-preset]');
      if (!card) return;
      const preset = PRESETS.find((p) => p.id === card.dataset.preset);
      if (preset) this._loadPreset(preset);
    });

    // Atributos editor: add / edit label / edit lista options / remove.
    this.$atribAddBtn.onclick = () => this._addAtributo();
    this.$atribAddLabel.addEventListener('keydown', (e) => { if (e.key === 'Enter') this._addAtributo(); });
    this.$atribList.addEventListener('click', (e) => {
      const rm = e.target.closest('[data-atrib-remove]');
      if (rm) this._plantilla.removeAtributo(rm.dataset.atribRemove);
    });
    this.$atribList.addEventListener('change', (e) => {
      const el = e.target.closest('[data-atrib-field]');
      if (!el) return;
      const key = el.dataset.atribKey;
      if (el.dataset.atribField === 'label') this._plantilla.updateAtributo(key, { label: el.value.trim() || key });
      else if (el.dataset.atribField === 'opciones') this._plantilla.updateAtributo(key, { opciones: el.value.split(',').map((s) => s.trim()).filter(Boolean) });
    });

    // Non-restrictive view filter for the Temas list — groups by modo
    // so a Plantilla that mixes Selección and Texto libre stays scannable,
    // and gives new temas a smart default modo. Never blocks what you
    // can create; "Todas" always shows everything regardless of this.
    this._catFilter = 'all';
    this._catRows = {};
    this._opcRows = {};

    this.$sharePlantillaBtn.onclick = () => slice.getComponent('SharePlantillaModal').show();
    this.$importBtn.onclick = () => this.$importFile.click();
    this.$importFile.onchange = (e) => this._handleImportFile(e);

    slice.controller.setComponentProps(this, props);
  }

  async init() {
    this._plantilla = slice.getComponent('PlantillaService');
    this._html = slice.getComponent('HtmlService');
    const settings = slice.getComponent('SettingsService');

    const [nombreInput, lideresCheckbox, addCatInput, addOpcInput] = await Promise.all([
      slice.build('Input', { sliceId: 'pb-nombre', placeholder: 'Nombre de la Plantilla' }),
      slice.build('Checkbox', { sliceId: 'pb-lideres', label: '👑 Habilitar responsables de tema' }),
      slice.build('Input', { sliceId: 'pb-add-cat', placeholder: 'Nuevo tema… — escribe y presiona Enter' }),
      slice.build('Input', { sliceId: 'pb-add-opc', placeholder: 'Nueva opción… — escribe y presiona Enter' }),
    ]);
    this.$nombreInput = nombreInput;
    this.$lideresCheckbox = lideresCheckbox;
    this.$addCatInput = addCatInput;
    this.$addOpcInput = addOpcInput;

    this.$nombreSlot.appendChild(nombreInput);
    this.$lideresSlot.appendChild(lideresCheckbox);
    this.$addCatSlot.appendChild(addCatInput);
    this.$addOpcSlot.appendChild(addOpcInput);

    nombreInput.value = this._plantilla.getNombre();
    nombreInput.addEventListener('change', () => this._plantilla.setNombre(nombreInput.value.trim()));

    lideresCheckbox.checked = settings.isLideresEnabled();
    lideresCheckbox.addEventListener('change', () => settings.setLideresEnabled(lideresCheckbox.checked));

    this._bindAddInput(addCatInput, this.querySelector('#addCatBtn'), (name) => {
      // New temas default to whatever the active filter is focused on
      // — one less click when bulk-adding a run of the same modo. "Todas"
      // keeps PlantillaService.addTema's own default (modo: 'reparto').
      const modo = this._catFilter === 'texto_libre' ? 'texto_libre' : undefined;
      this._plantilla.addTema(modo ? { nombre: name, modo } : { nombre: name });
    });
    this._bindAddInput(addOpcInput, this.querySelector('#addOpcBtn'), (name) => this._plantilla.addOpcion({ nombre: name }));

    this._renderPresets();
    this._renderTemas();
    this._renderOpciones();
    this._renderAtributos();

    // Catches mutations from outside this view too (e.g. CompareView's
    // Plantilla import) — matches the watch convention every other view uses.
    slice.context.watch('plantilla', this, () => {
      if (this.$nombreInput && document.activeElement !== this.$nombreInput) {
        this.$nombreInput.value = this._plantilla.getNombre();
      }
      this._renderTemas(); this._renderOpciones(); this._renderAtributos();
    });
    slice.context.watch('settings', this, (s) => {
      if (this.$lideresCheckbox && document.activeElement !== this.$lideresCheckbox) {
        this.$lideresCheckbox.checked = s.lideresEnabled === true;
      }
    });
  }

  update() {
    if (this.$nombreInput && document.activeElement !== this.$nombreInput) {
      this.$nombreInput.value = this._plantilla.getNombre();
    }
    this._renderTemas();
    this._renderOpciones();
    this._renderAtributos();
  }

  // Registry Input has no onChange prop — its native <input> still fires
  // real DOM events that bubble through the (light-DOM) custom element, so
  // listening for 'keydown' directly on the built instance works exactly
  // like it would on a plain <input>. Type a name, press Enter: added, and
  // the field clears/refocuses itself so several items can be typed
  // back-to-back — no dialog per item.
  _bindAddInput(input, button, addFn) {
    const commit = () => {
      const name = input.value.trim();
      if (!name) { input.focus(); return; }
      addFn(name);
      input.value = '';
      input.focus();
    };
    // Enter works on desktop; on mobile the virtual "Go/Done/Intro" key is
    // unreliable (Android/Gboard often reports keyCode 229 / key 'Unidentified'
    // mid-composition instead of a clean 'Enter'), so the visible "+ Agregar"
    // button is the dependable path there.
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.keyCode === 13) { e.preventDefault(); commit(); }
    });
    if (button) button.addEventListener('click', commit);
    // Label the mobile keyboard's action key on the inner native <input>.
    const native = input.querySelector ? input.querySelector('input') : null;
    if (native) native.setAttribute('enterkeyhint', 'done');
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

  _renderCatFilters(temas) {
    const modoLabels = { reparto: '🎯 Asignación', votacion: '🗳️ Votación', ranking: '🏆 Ranking', texto_libre: '📝 Texto libre' };
    const present = new Set(temas.map((t) => t.modo));
    const filters = ['all', ...Object.keys(modoLabels).filter((m) => present.has(m))];
    if (!filters.includes(this._catFilter)) this._catFilter = 'all';

    this.$catFilters.innerHTML = this._html.sanitize(filters.map((f) =>
      `<button class="pb-filter-btn${f === this._catFilter ? ' active' : ''}" data-filter="${f}" type="button">${f === 'all' ? 'Todas' : modoLabels[f]}</button>`
    ).join(''));

    Array.from(this.$catFilters.children).forEach((btn) => {
      btn.onclick = () => {
        this._catFilter = btn.dataset.filter;
        Array.from(this.$catFilters.children).forEach((b) => b.classList.toggle('active', b === btn));
        this._applyCatFilter();
      };
    });
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
        <span class="pb-preset__icon">${esc(p.icon)}</span>
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
      this._plantilla.loadFromData(prepared.temas, prepared.opciones, prepared.nombre, prepared.atributos, '', '');
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
  _addAtributo() {
    const label = this.$atribAddLabel.value.trim();
    if (!label) return;
    this._plantilla.addAtributo({ label, type: this.$atribAddType.value || 'texto' });
    this.$atribAddLabel.value = '';
    this.$atribAddLabel.focus();
  }

  _renderAtributos() {
    if (!this.$atribList) return;
    const esc = (s) => this._html.esc(s);
    const TYPE_LABEL = { texto: 'Texto', numero: 'Número', lista: 'Lista', siNo: 'Sí/No' };
    const atributos = this._plantilla.getAtributos();
    const html = atributos.length
      ? atributos.map((a) => {
          const optsField = a.type === 'lista'
            ? `<input class="pb-atrib__opts" data-atrib-field="opciones" data-atrib-key="${esc(a.key)}" type="text" placeholder="opciones separadas por coma" value="${esc((a.opciones || []).join(', '))}" />`
            : '';
          return `<div class="pb-atrib">
            <input class="pb-atrib__label" data-atrib-field="label" data-atrib-key="${esc(a.key)}" type="text" value="${esc(a.label)}" />
            <span class="pb-atrib__type">${esc(TYPE_LABEL[a.type] || a.type)}</span>
            ${optsField}
            <button class="pb-atrib__rm" type="button" data-atrib-remove="${esc(a.key)}" title="Quitar atributo">✕</button>
          </div>`;
        }).join('')
      : '<div class="pb-atrib__empty">Sin atributos. Agrega campos extra para tus Opciones (opcional).</div>';
    this.$atribList.innerHTML = this._html.sanitize(html);
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
  // IMPORTANT: keep literal `slice.build('TemaRow', ...)` and
  // `slice.build('OpcionRow', ...)` call sites here. The CLI analyzer only
  // detects literal names, so variable-based `slice.build(componentName, ...)`
  // can exclude rows from route bundles (see GOTCHAS.md §5).
  async _syncRows(registry, items, container, componentName, applyItem) {
    const currentIds = new Set(items.map((it) => String(it.id)));
    Object.keys(registry).forEach((id) => {
      if (!currentIds.has(id)) {
        slice.controller.destroyComponent(registry[id]);
        delete registry[id];
      }
    });

    const toBuild = items.filter((it) => !registry[String(it.id)]);
    if (toBuild.length) {
      const [first, ...rest] = toBuild;

      if (componentName === 'TemaRow') {
        const firstRow = await slice.build('TemaRow', { sliceId: `${container.id}-${first.id}` });
        const restRows = await Promise.all(rest.map((it) => slice.build('TemaRow', { sliceId: `${container.id}-${it.id}` })));
        [firstRow, ...restRows].forEach((row, i) => { registry[String(toBuild[i].id)] = row; });
      } else if (componentName === 'OpcionRow') {
        const firstRow = await slice.build('OpcionRow', { sliceId: `${container.id}-${first.id}` });
        const restRows = await Promise.all(rest.map((it) => slice.build('OpcionRow', { sliceId: `${container.id}-${it.id}` })));
        [firstRow, ...restRows].forEach((row, i) => { registry[String(toBuild[i].id)] = row; });
      } else {
        const firstRow = await slice.build(componentName, { sliceId: `${container.id}-${first.id}` });
        const restRows = await Promise.all(rest.map((it) => slice.build(componentName, { sliceId: `${container.id}-${it.id}` })));
        [firstRow, ...restRows].forEach((row, i) => { registry[String(toBuild[i].id)] = row; });
      }
    }

    items.forEach((it) => applyItem(registry[String(it.id)], it));

    // Reorder to match the current item order (covers newly-added rows,
    // which build() appended at the end regardless of where they belong).
    items.forEach((it) => container.appendChild(registry[String(it.id)]));
  }

  // Same JSON-shape/id validation + impact-count confirm as CompareView's
  // Plantilla import (PlantillaService.prepareImport is the shared source of
  // truth) — offered here too since building a Plantilla from scratch is
  // exactly when you'd want to start from someone else's shared file.
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
          this._plantilla.loadFromData(prepared.temas, prepared.opciones, prepared.nombre, prepared.atributos, data.autor || '', data.email || '');
          this._showToast('Plantilla importada', 'success');
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

  _showToast(message, type) {
    slice.events.emit('toast:show', { message, type });
  }
}

customElements.define('slice-plantillabuilderview', PlantillaBuilderView);
