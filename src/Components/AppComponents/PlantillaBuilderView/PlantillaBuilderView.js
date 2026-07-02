// Replaces HelpView's CSV/JSON textarea with real visual CRUD for
// Categorías/Opciones — the "SETUP now lives entirely in the UI, no files
// on the server" direction. Categoría/Opción rows are real Visual components
// (CategoriaRow/OpcionRow — build-once, reused by stable sliceId, updated
// via a setter) instead of re-templated HTML strings: no more manual
// expanded/collapsed state tracking here, and no innerHTML+string-
// interpolation surface left in this view at all. Text fields use the
// registry Input/Select/Checkbox (reskinned to Sticker Book in this file's
// CSS) instead of raw <input>/<select> — see the CategoriaRow.css header
// comment for why that reskin is safe (no Shadow DOM). Also hosts the
// Plantilla-level settings that used to live in the now-retired
// SettingsView: "Nombre de la Plantilla" (Detalles) and the "responsables"
// toggle (scoped inside Categorías, since it only applies to modo
// Selección). Personal/session settings (tu nombre, tema) moved to
// UserMenu instead.
export default class PlantillaBuilderView extends HTMLElement {
  constructor(props) {
    super();
    slice.attachTemplate(this);
    this.$root = this.querySelector('.plantilla-builder-view');
    this.$nombreSlot = this.querySelector('#plantillaNombreSlot');
    this.$lideresSlot = this.querySelector('#lideresToggleSlot');
    this.$sexoSlot = this.querySelector('#sexoToggleSlot');
    this.$edadSlot = this.querySelector('#edadToggleSlot');
    this.$addCatSlot = this.querySelector('#addCatSlot');
    this.$addOpcSlot = this.querySelector('#addOpcSlot');
    this.$catList = this.querySelector('#catList');
    this.$opcList = this.querySelector('#opcList');
    this.$catCount = this.querySelector('#catCount');
    this.$opcCount = this.querySelector('#opcCount');
    this.$catEmpty = this.querySelector('#catEmpty');
    this.$catFilterEmpty = this.querySelector('#catFilterEmpty');
    this.$opcEmpty = this.querySelector('#opcEmpty');
    this.$exportBtn = this.querySelector('#exportPlantillaBtn');
    this.$importBtn = this.querySelector('#importPlantillaBtn');
    this.$importFile = this.querySelector('#importPlantillaFile');
    this.$resetBtn = this.querySelector('#resetBtn');

    // Non-restrictive view filter for the Categorías list — groups by modo
    // so a Plantilla that mixes Selección and Texto libre stays scannable,
    // and gives new categorías a smart default modo. Never blocks what you
    // can create; "Todas" always shows everything regardless of this.
    this._catFilter = 'all';
    this._catRows = {};
    this._opcRows = {};

    this.$root.querySelectorAll('.pb-filter-btn').forEach((btn) => {
      btn.onclick = () => {
        this._catFilter = btn.dataset.filter;
        this.$root.querySelectorAll('.pb-filter-btn').forEach((b) => b.classList.toggle('active', b === btn));
        this._applyCatFilter();
      };
    });

    this.$exportBtn.onclick = () => this._exportPlantilla();
    this.$importBtn.onclick = () => this.$importFile.click();
    this.$importFile.onchange = (e) => this._handleImportFile(e);
    this.$resetBtn.onclick = () => this._confirmReset();

    slice.controller.setComponentProps(this, props);
  }

  async init() {
    this._plantilla = slice.getComponent('PlantillaService');
    const settings = slice.getComponent('SettingsService');

    const [nombreInput, lideresCheckbox, sexoCheckbox, edadCheckbox, addCatInput, addOpcInput] = await Promise.all([
      slice.build('Input', { sliceId: 'pb-nombre', placeholder: 'Nombre de la Plantilla' }),
      slice.build('Checkbox', { sliceId: 'pb-lideres', label: '👑 Habilitar responsables de categoría' }),
      slice.build('Checkbox', { sliceId: 'pb-sexo', label: 'Habilitar sexo' }),
      slice.build('Checkbox', { sliceId: 'pb-edad', label: 'Habilitar edad' }),
      slice.build('Input', { sliceId: 'pb-add-cat', placeholder: 'Nueva categoría… — escribí y presioná Enter' }),
      slice.build('Input', { sliceId: 'pb-add-opc', placeholder: 'Nueva opción… — escribí y presioná Enter' }),
    ]);
    this.$nombreInput = nombreInput;
    this.$lideresCheckbox = lideresCheckbox;
    this.$sexoCheckbox = sexoCheckbox;
    this.$edadCheckbox = edadCheckbox;
    this.$addCatInput = addCatInput;
    this.$addOpcInput = addOpcInput;

    this.$nombreSlot.appendChild(nombreInput);
    this.$lideresSlot.appendChild(lideresCheckbox);
    this.$sexoSlot.appendChild(sexoCheckbox);
    this.$edadSlot.appendChild(edadCheckbox);
    this.$addCatSlot.appendChild(addCatInput);
    this.$addOpcSlot.appendChild(addOpcInput);

    nombreInput.value = this._plantilla.getNombre();
    nombreInput.addEventListener('change', () => this._plantilla.setNombre(nombreInput.value.trim()));

    lideresCheckbox.checked = settings.isLideresEnabled();
    lideresCheckbox.addEventListener('change', () => settings.setLideresEnabled(lideresCheckbox.checked));

    sexoCheckbox.checked = settings.isSexoEnabled();
    sexoCheckbox.addEventListener('change', () => settings.setSexoEnabled(sexoCheckbox.checked));

    edadCheckbox.checked = settings.isEdadEnabled();
    edadCheckbox.addEventListener('change', () => settings.setEdadEnabled(edadCheckbox.checked));

    this._bindAddInput(addCatInput, (name) => {
      // New categorías default to whatever the active filter is focused on
      // — one less click when bulk-adding a run of the same modo. "Todas"
      // keeps PlantillaService.addCategoria's own default (modo: 'seleccion').
      const modo = this._catFilter === 'texto_libre' ? 'texto_libre' : undefined;
      this._plantilla.addCategoria(modo ? { nombre: name, modo } : { nombre: name });
    });
    this._bindAddInput(addOpcInput, (name) => this._plantilla.addOpcion({ nombre: name }));

    this._renderCategorias();
    this._renderOpciones();

    // Catches mutations from outside this view too (e.g. CompareView's
    // Plantilla import) — matches the watch convention every other view uses.
    slice.context.watch('plantilla', this, () => { this._renderCategorias(); this._renderOpciones(); });
    slice.context.watch('settings', this, (s) => {
      if (this.$lideresCheckbox && document.activeElement !== this.$lideresCheckbox) {
        this.$lideresCheckbox.checked = s.lideresEnabled === true;
      }
      if (this.$sexoCheckbox && document.activeElement !== this.$sexoCheckbox) {
        this.$sexoCheckbox.checked = s.sexoEnabled !== false;
      }
      if (this.$edadCheckbox && document.activeElement !== this.$edadCheckbox) {
        this.$edadCheckbox.checked = s.edadEnabled !== false;
      }
    });
  }

  update() {
    if (this.$nombreInput) this.$nombreInput.value = this._plantilla.getNombre();
    this._renderCategorias();
    this._renderOpciones();
  }

  // Registry Input has no onChange prop — its native <input> still fires
  // real DOM events that bubble through the (light-DOM) custom element, so
  // listening for 'keydown' directly on the built instance works exactly
  // like it would on a plain <input>. Type a name, press Enter: added, and
  // the field clears/refocuses itself so several items can be typed
  // back-to-back — no dialog per item.
  _bindAddInput(input, addFn) {
    input.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      const name = input.value.trim();
      if (!name) return;
      addFn(name);
      input.value = '';
      input.focus();
    });
  }

  // ── Categorías ──────────────────────────────────────────────

  async _renderCategorias() {
    const categorias = this._plantilla.getCategorias();
    this.$catCount.textContent = categorias.length;
    this.$catEmpty.hidden = categorias.length > 0;

    await this._syncRows(this._catRows, categorias, this.$catList, 'CategoriaRow', (row, c) => { row.categoria = c; });
    this._applyCatFilter();
  }

  _applyCatFilter() {
    const categorias = this._plantilla.getCategorias();
    let visibleCount = 0;
    categorias.forEach((c) => {
      const row = this._catRows[String(c.id)];
      if (!row) return;
      const show = this._catFilter === 'all' || c.modo === this._catFilter;
      row.hidden = !show;
      if (show) visibleCount++;
    });
    this.$catFilterEmpty.hidden = categorias.length === 0 || visibleCount > 0;
  }

  // ── Opciones ────────────────────────────────────────────────

  async _renderOpciones() {
    const opciones = this._plantilla.getOpciones();
    this.$opcCount.textContent = opciones.length;
    this.$opcEmpty.hidden = opciones.length > 0;

    await this._syncRows(this._opcRows, opciones, this.$opcList, 'OpcionRow', (row, o) => { row.opcion = o; });
  }

  // Shared "reuse by stable id" list sync: builds a row component for every
  // new item (first-then-Promise.all(rest), so slice.build('X', ...) stays a
  // literal call site the bundle analyzer can see — see GOTCHAS.md §5),
  // updates existing rows via their setter (cheap, idempotent), destroys
  // rows for items that no longer exist, and reorders the DOM to match.
  // Never rebuilds a survivor.
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
      const firstRow = await slice.build(componentName, { sliceId: `${container.id}-${first.id}` });
      const restRows = await Promise.all(rest.map((it) => slice.build(componentName, { sliceId: `${container.id}-${it.id}` })));
      [firstRow, ...restRows].forEach((row, i) => { registry[String(toBuild[i].id)] = row; });
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
        this._showToast(`No se pudo leer ${file.name}: JSON inválido.`, 'error');
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
          this._plantilla.loadFromData(prepared.categorias, prepared.opciones, prepared.nombre);
          this._showToast('Plantilla importada', 'success');
        } catch (err) {
          this._showToast(err.message, 'error');
        }
      };
      if (prepared.impact) {
        slice.events.emit('confirm:request', {
          title: '¿Reemplazar la Plantilla actual?',
          message: `Se reemplazan tus Categorías y Opciones actuales por las de «${data.nombre || file.name}». Se limpiarán ${prepared.impact} respuesta${prepared.impact !== 1 ? 's' : ''} que ya no aplicarían. Esta acción no se puede deshacer.`,
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

  _exportPlantilla() {
    const plantilla = {
      nombre: this._plantilla.getNombre() || 'Plantilla sin nombre',
      autor: slice.getComponent('SettingsService').getState().autor || '',
      categorias: this._plantilla.getCategorias(),
      opciones: this._plantilla.getOpciones(),
    };
    slice.getComponent('ExportService').downloadPlantilla(plantilla);
    this._showToast('Plantilla exportada', 'success');
  }

  _confirmReset() {
    slice.events.emit('confirm:request', {
      title: '¿Restaurar datos de ejemplo?',
      message: 'Se perderán todas tus categorías y opciones actuales. Las respuestas que las referencian se limpiarán automáticamente.',
      confirmLabel: 'Restaurar',
      danger: true,
      onConfirm: () => {
        this._plantilla.resetToSeed();
        this._showToast('Datos de ejemplo restaurados', 'success');
      },
    });
  }

  _showToast(message, type) {
    slice.events.emit('toast:show', { message, type });
  }
}

customElements.define('slice-plantillabuilderview', PlantillaBuilderView);
