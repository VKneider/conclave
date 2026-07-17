import { SEED_CATEGORIAS, SEED_OPCIONES } from '../../../public/data/seedData.js';
import { ensureContext } from '../../../utils/context.js';

const PALETTE = ['#6d8bff', '#3fb964', '#e2a13a', '#ff7eb6', '#8a6dff', '#42c8c0', '#e25c5c', '#b9c34a', '#f0883e', '#4ec9b0', '#c678dd', '#5aa0ff'];
const CONTEXT = 'plantilla';
const STORAGE_KEY = 'conclave-plantilla-v1';
const SEED_STATE = { nombre: 'Mi Plantilla', categorias: SEED_CATEGORIAS, opciones: SEED_OPCIONES };

// Owns the `plantilla` context: { nombre, categorias, opciones } — the
// shared setup every response is measured against (generalizes
// Equipos/Miembros into Categoría/Opción). `nombre` replaces the old
// `settings.nombreOrganizacion` — it's a property of the Plantilla itself
// (shown in the topbar/landing, and exported in the Plantilla JSON), not a
// personal per-device setting. Persisted to localStorage by the context
// (persist: true); falls back to the bundled seed the first time the app
// runs, or if localStorage holds something empty/invalid.
export default class PlantillaService {
  init() {
    this._ensure();
  }

  // Creates the context on first boot and falls back to seed data if
  // whatever was persisted is missing/empty — mirrors what the old
  // RosterService._loadFromStorage() did by hand. Only runs the
  // empty/invalid check right after creation, never on later reads, so
  // deliberately emptying categorías/opciones via the CRUD (Fase B) doesn't
  // get silently re-seeded.
  _ensure() {
    const existed = slice.context.has(CONTEXT);
    ensureContext(CONTEXT, SEED_STATE, STORAGE_KEY);
    if (existed) return;
    const state = slice.context.getState(CONTEXT);
    const invalid = !state || !Array.isArray(state.categorias) || !Array.isArray(state.opciones)
      || !state.categorias.length || !state.opciones.length;
    if (invalid) {
      slice.context.setState(CONTEXT, () => SEED_STATE);
    }
  }

  getState() {
    this._ensure();
    return slice.context.getState(CONTEXT);
  }

  getNombre() { return this.getState().nombre || ''; }
  setNombre(nombre) {
    slice.context.setState(CONTEXT, (prev) => ({ ...prev, nombre: nombre || '' }));
  }

  getCategorias() { return this.getState().categorias; }
  getCategoriasParticipables() { return this.getCategorias().filter((c) => c.participable && c.modo === 'seleccion'); }
  getCategoriasTexto() { return this.getCategorias().filter((c) => c.modo === 'texto_libre'); }
  getOpciones() { return this.getState().opciones; }
  getOpcionesDisponibles() { return this.getOpciones().filter((o) => !o.meta?.fijo); }
  getCategoriaById(id) { return this.getCategorias().find((c) => c.id === id); }
  getOpcionById(id) { return this.getOpciones().find((o) => String(o.id) === String(id)); }

  // A pure function of the id — NOT the categoría's position in any list.
  // Used to derive the position by index into PALETTE, which meant every
  // Categoría's color silently shifted whenever a sibling was added/removed
  // anywhere before it in the array. Now stable under reordering (newest-
  // first inserts in addCategoria, deletes, imports) — same id always gets
  // the same color.
  colorFor(categoriaId) {
    const key = String(categoriaId);
    let hash = 0;
    for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
    return PALETTE[hash % PALETTE.length];
  }

  getLiderName(categoriaId) {
    const categoria = this.getCategoriaById(categoriaId);
    return categoria?.meta?.lider || null;
  }

  isLiderLocked(categoriaId) {
    return !!this.getLiderName(categoriaId);
  }

  resolveOpcionByName(name) {
    if (!name) return null;
    return this.getOpciones().find((o) => o.nombre === name) || null;
  }

  countByCategoria(seleccion) {
    const counts = {};
    this.getCategoriasParticipables().forEach((c) => { counts[c.id] = 0; });
    Object.values(seleccion || {}).forEach((cid) => {
      if (cid && counts[cid] !== undefined) counts[cid]++;
    });
    return counts;
  }

  statusOf(categoria, count) {
    if (count === 0) return 'empty';
    if (categoria.min != null && count < categoria.min) return 'under';
    if (categoria.max != null && count > categoria.max) return 'over';
    return 'ok';
  }

  statusLabel(categoria, count) {
    const st = this.statusOf(categoria, count);
    const labels = {
      ok: 'En rango',
      under: `Faltan ${categoria.min - count}`,
      over: `Sobran ${count - categoria.max}`,
      empty: 'Vacío',
    };
    return labels[st] || '';
  }

  isFull(categoriaId, seleccion, exceptOpcionId) {
    const categoria = this.getCategoriaById(categoriaId);
    if (!categoria || categoria.max == null) return false;
    let n = 0;
    Object.keys(seleccion || {}).forEach((oid) => {
      if (seleccion[oid] === categoriaId && oid !== String(exceptOpcionId)) n++;
    });
    return n >= categoria.max;
  }

  // `id` is rendered unescaped as an HTML attribute value / querySelector
  // token all over the app (data-team="${t.id}" and friends) — that was safe
  // while every id was either bundled seed data or locally slugified via
  // _slug()/nextOpcionId(). Importing someone else's Plantilla JSON (Fase D)
  // broke that assumption: a hostile id like `"><script>` could break out of
  // an attribute. Rather than escaping every one of those call sites (easy
  // to miss one), every id is validated at this single trust boundary — the
  // safe charset a slug/number was already restricted to, so legitimate
  // Plantillas are unaffected.
  isSafeId(id) {
    return typeof id === 'string' || typeof id === 'number' ? /^[a-zA-Z0-9_-]{1,64}$/.test(String(id)) : false;
  }

  // Shared by every Plantilla-import entry point (CompareView,
  // PlantillaBuilderView): validates shape + id safety and computes how many
  // current Respuestas would be orphaned by adopting this data. Throws on
  // bad shape or unsafe ids — callers must catch and surface as a rejected
  // import, never apply partially-validated data. On success, callers still
  // decide whether to confirm with the user (using `.impact`) before calling
  // loadFromData(result.categorias, result.opciones, result.nombre).
  prepareImport(data) {
    if (!Array.isArray(data?.categorias) || !Array.isArray(data?.opciones)) {
      throw new Error('Formato no reconocido — se espera un JSON de Plantilla.');
    }
    const badCategoria = data.categorias.find((c) => !this.isSafeId(c.id));
    const badOpcion = data.opciones.find((o) => !this.isSafeId(o.id));
    if (badCategoria || badOpcion) {
      throw new Error('La Plantilla contiene IDs con caracteres no permitidos.');
    }
    return {
      categorias: data.categorias,
      opciones: data.opciones,
      nombre: data.nombre,
      impact: this._impactOfReplacing(data.categorias, data.opciones),
    };
  }

  _impactOfReplacing(newCategorias, newOpciones) {
    const newCatIds = new Set(newCategorias.map((c) => c.id));
    const newOpcIds = new Set(newOpciones.map((o) => String(o.id)));
    const respuestas = slice.getComponent('RespuestasService').getState();
    let n = 0;
    Object.entries(respuestas.seleccion).forEach(([opcionId, categoriaId]) => {
      if (!newOpcIds.has(String(opcionId)) || !newCatIds.has(categoriaId)) n++;
    });
    Object.keys(respuestas.texto).forEach((categoriaId) => {
      if (!newCatIds.has(categoriaId)) n++;
    });
    return n;
  }

  // When replacing the entire dataset, clean up any respuestas/decisionFinal
  // entries that reference now-deleted categorías or opciones. Also cleans
  // settings.lideres and imported sources. `nombre` is optional — omit it to
  // keep the current Plantilla name (e.g. a CRUD bulk-edit), pass it when
  // adopting a whole new Plantilla (import, reset to seed). Throws if any
  // Categoría/Opción id fails the safe-charset check — callers should
  // normally go through prepareImport() first so this never happens on the
  // import path, but the guard stays here too since this is the actual
  // trust boundary (defense in depth for any future caller).
  loadFromData(categorias, opciones, nombre) {
    const badCategoria = categorias.find((c) => !this.isSafeId(c.id));
    const badOpcion = opciones.find((o) => !this.isSafeId(o.id));
    if (badCategoria || badOpcion) {
      throw new Error('La Plantilla contiene IDs con caracteres no permitidos.');
    }

    const prev = this.getState();
    const oldCategoriaIds = new Set(prev.categorias.map((c) => c.id));
    const oldOpcionIds = new Set(prev.opciones.map((o) => String(o.id)));

    slice.context.setState(CONTEXT, (p) => ({ nombre: nombre !== undefined ? nombre : p.nombre, categorias, opciones }));

    const newCategoriaIds = new Set(categorias.map((c) => c.id));
    const newOpcionIds = new Set(opciones.map((o) => String(o.id)));

    const removedCategoriaIds = [...oldCategoriaIds].filter((id) => !newCategoriaIds.has(id));
    const removedOpcionIds = [...oldOpcionIds].filter((id) => !newOpcionIds.has(id));

    if (removedCategoriaIds.length || removedOpcionIds.length) {
      this._cleanupOrphaned(removedCategoriaIds, removedOpcionIds);
    }
  }

  resetToSeed() {
    this.loadFromData(SEED_CATEGORIAS, SEED_OPCIONES, SEED_STATE.nombre);
  }

  _cleanupOrphaned(removedCategoriaIds, removedOpcionIds) {
    const rmvCategorias = new Set(removedCategoriaIds);
    const rmvOpciones = new Set(removedOpcionIds.map(String));

    const cleanSeleccion = (seleccion) => {
      if (!seleccion || !Object.keys(seleccion).length) return seleccion;
      const next = {};
      let changed = false;
      Object.entries(seleccion).forEach(([opcionId, categoriaId]) => {
        if (rmvOpciones.has(String(opcionId)) || rmvCategorias.has(categoriaId)) { changed = true; return; }
        next[opcionId] = categoriaId;
      });
      return changed ? next : seleccion;
    };

    const cleanTexto = (texto) => {
      if (!texto || !Object.keys(texto).length) return texto;
      const next = {};
      let changed = false;
      Object.entries(texto).forEach(([categoriaId, value]) => {
        if (rmvCategorias.has(categoriaId)) { changed = true; return; }
        next[categoriaId] = value;
      });
      return changed ? next : texto;
    };

    // Clean respuestas.seleccion / respuestas.texto
    const respuestas = slice.getComponent('RespuestasService');
    if (respuestas && respuestas.getState) {
      const respState = respuestas.getState();
      const seleccionCleaned = cleanSeleccion(respState.seleccion);
      const textoCleaned = cleanTexto(respState.texto);
      if (seleccionCleaned !== respState.seleccion || textoCleaned !== respState.texto) {
        slice.context.setState('respuestas', (prevR) => ({ ...prevR, seleccion: seleccionCleaned, texto: textoCleaned }));
      }
    }

    // Clean decisionFinal.seleccion / decisionFinal.texto (same seleccion/texto
    // split as respuestas — see ConsensoService's header comment)
    const consenso = slice.getComponent('ConsensoService');
    if (consenso && consenso.getState) {
      const consensoState = consenso.getState();
      const seleccionCleaned = cleanSeleccion(consensoState.seleccion);
      const textoCleaned = cleanTexto(consensoState.texto);
      if (seleccionCleaned !== consensoState.seleccion || textoCleaned !== consensoState.texto) {
        slice.context.setState('decisionFinal', (prevD) => ({ ...prevD, seleccion: seleccionCleaned, texto: textoCleaned }));
      }
    }

    // Clean settings.lideres — remove leader assignments for deleted opciones/categorías
    const settings = slice.getComponent('SettingsService');
    const settingsState = settings.getState();
    if (settingsState.lideres && Object.keys(settingsState.lideres).length) {
      const lideres = { ...settingsState.lideres };
      let liderChanged = false;
      Object.entries(lideres).forEach(([categoriaId, opcionId]) => {
        if (rmvOpciones.has(String(opcionId)) || rmvCategorias.has(categoriaId)) { delete lideres[categoriaId]; liderChanged = true; }
      });
      if (liderChanged) {
        slice.context.setState('settings', (prevS) => ({ ...prevS, lideres }));
      }
    }

    // Clean imported comparison sources — remove orphaned references
    const imp = slice.getComponent('RespuestasImportService');
    if (imp && imp.removeOrphaned) {
      imp.removeOrphaned(removedOpcionIds, removedCategoriaIds);
    }
  }

  nextCategoriaId() {
    return Math.max(0, ...this.getCategorias().map((c) => {
      const n = parseInt(c.meta?.numero, 10);
      return isNaN(n) ? 0 : n;
    })) + 1;
  }

  nextOpcionId() {
    return Math.max(0, ...this.getOpciones().map((o) => Number(o.id) || 0)) + 1;
  }

  updateCategoria(categoriaId, changes) {
    slice.context.setState(CONTEXT, (prev) => ({
      ...prev,
      categorias: prev.categorias.map((c) => (c.id === categoriaId ? { ...c, ...changes } : c)),
    }));
  }

  updateOpcion(opcionId, changes) {
    const id = String(opcionId);
    slice.context.setState(CONTEXT, (prev) => ({
      ...prev,
      opciones: prev.opciones.map((o) => (String(o.id) === id ? { ...o, ...changes } : o)),
    }));
  }

  addOpcion(opcion) {
    // Only accept an explicit id if it's actually a safe positive integer —
    // never trust a caller-supplied id blindly (see isSafeId's comment).
    const explicitId = Number(opcion?.id);
    const id = opcion?.id != null && Number.isInteger(explicitId) && explicitId > 0 ? explicitId : this.nextOpcionId();
    const o = { nombre: '', meta: { sexo: '', edad: null, fijo: false, rolFijo: null }, ...opcion, id };
    // Prepended, not appended — newest-first, so a just-added row shows up
    // at the top of PlantillaBuilderView's list without scrolling to find it.
    slice.context.setState(CONTEXT, (prev) => ({ ...prev, opciones: [o, ...prev.opciones] }));
    return o;
  }

  removeOpcion(opcionId) {
    const id = String(opcionId);
    slice.context.setState(CONTEXT, (prev) => ({ ...prev, opciones: prev.opciones.filter((o) => String(o.id) !== id) }));
    this._cleanupOrphaned([], [id]);
  }

  // NEW in Fase A — not wired to any UI yet (Fase B's CRUD form is the first
  // caller), but must exist and behave correctly per the approved plan so
  // Categoría/Opción CRUD is symmetric.
  addCategoria(categoria) {
    const numero = this.nextCategoriaId();
    // Always route an explicit id through _slug() too — never trust a
    // caller-supplied id blindly (see isSafeId's comment).
    const id = categoria?.id ? this._slug(String(categoria.id)) : this._slug(categoria?.nombre);
    const c = {
      id, nombre: '', modo: 'seleccion', orden: numero, min: null, max: null,
      participable: true, meta: { lider: null, numero },
      ...categoria, id,
    };
    // Prepended, not appended — newest-first, same reasoning as addOpcion.
    slice.context.setState(CONTEXT, (prev) => ({ ...prev, categorias: [c, ...prev.categorias] }));
    return c;
  }

  removeCategoria(categoriaId) {
    slice.context.setState(CONTEXT, (prev) => ({ ...prev, categorias: prev.categorias.filter((c) => c.id !== categoriaId) }));
    this._cleanupOrphaned([categoriaId], []);
  }

  _slug(name) {
    return (name || '')
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'categoria';
  }
}
