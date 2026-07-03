import { SEED_TEMAS, SEED_OPCIONES, DEFAULT_ATRIBUTOS } from '../../../data/seedData.js';

const PALETTE = ['#6d8bff', '#3fb964', '#e2a13a', '#ff7eb6', '#8a6dff', '#42c8c0', '#e25c5c', '#b9c34a', '#f0883e', '#4ec9b0', '#c678dd', '#5aa0ff'];
const CONTEXT = 'plantilla';
const STORAGE_KEY = 'conclave-plantilla-v1';
const SEED_STATE = { nombre: 'Mi Plantilla', atributos: DEFAULT_ATRIBUTOS, temas: SEED_TEMAS, opciones: SEED_OPCIONES };

// Owns the `plantilla` context: { nombre, temas, opciones } — the
// shared setup every response is measured against (generalizes
// Equipos/Miembros into Tema/Opción). `nombre` replaces the old
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
  // deliberately emptying temas/opciones via the CRUD (Fase B) doesn't
  // get silently re-seeded.
  _ensure() {
    const existed = slice.context.has(CONTEXT);
    slice.getComponent('StoreService').ensure(CONTEXT, SEED_STATE, STORAGE_KEY);
    if (existed) return;
    // Migrate the persisted shape BEFORE the invalid check — a returning user
    // has {nombre, categorias, opciones} from before the Categoría→Tema rename;
    // reading state.temas would be undefined, the invalid check would treat it
    // as empty and reseed, wiping their data. IDs are unchanged (a tema keeps
    // its id), so respuestas/decisionFinal/settings need no migration — only
    // this one property rename in the plantilla context. Runs once per session
    // (guarded by !existed).
    this._migrate();
    const state = slice.context.getState(CONTEXT);
    const invalid = !state || !Array.isArray(state.temas) || !Array.isArray(state.opciones)
      || !state.temas.length || !state.opciones.length;
    if (invalid) {
      slice.context.setState(CONTEXT, () => SEED_STATE);
    }
  }

  // One-shot shape migration for returning users (runs once per session from
  // _ensure, before the invalid check). IDs never change, so respuestas/
  // decisionFinal/settings need no migration — only the plantilla shape.
  //   • categorias → temas (Categoría→Tema rename)
  //   • modo 'seleccion' → 'reparto' (freed up "selection" wording for the new
  //     'votacion' modo)
  //   • opciones gain temaId (null = global pool for reparto)
  //   • atributos defaults to [] (custom fields, Fase 3)
  _migrate() {
    const state = slice.context.getState(CONTEXT);
    if (!state) return;
    let changed = false;

    let temas = Array.isArray(state.temas) ? state.temas
      : (Array.isArray(state.categorias) ? (changed = true, state.categorias) : state.temas);
    if (Array.isArray(temas)) {
      const mapped = temas.map((t) => (t && t.modo === 'seleccion' ? { ...t, modo: 'reparto' } : t));
      if (mapped.some((t, i) => t !== temas[i])) { temas = mapped; changed = true; }
    }

    let opciones = state.opciones;
    if (Array.isArray(opciones)) {
      const mapped = opciones.map((o) => (o && o.temaId === undefined ? { ...o, temaId: null } : o));
      if (mapped.some((o, i) => o !== opciones[i])) { opciones = mapped; changed = true; }
    }

    // Old data predates `atributos` but had hardcoded sexo/edad in meta —
    // adopt the default sexo/edad attribute defs so those values stay editable
    // and visible instead of becoming orphaned.
    let atributos = state.atributos;
    if (!Array.isArray(atributos)) { atributos = DEFAULT_ATRIBUTOS; changed = true; }

    if (changed) {
      slice.context.setState(CONTEXT, (prev) => {
        const { categorias, ...rest } = prev;
        return { ...rest, temas, opciones, atributos };
      });
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

  getTemas() { return this.getState().temas; }
  // modo 'reparto' (ex 'seleccion'): the shared Opción pool is distributed into
  // these temas. "participables" = reparto temas that accept assignments.
  getTemasParticipables() { return this.getTemas().filter((c) => c.participable && c.modo === 'reparto'); }
  getTemasTexto() { return this.getTemas().filter((c) => c.modo === 'texto_libre'); }
  getTemasVotacion() { return this.getTemas().filter((c) => c.modo === 'votacion'); }
  getTemasRanking() { return this.getTemas().filter((c) => c.modo === 'ranking'); }
  getOpciones() { return this.getState().opciones; }
  // Pool = opciones not owned by a tema (temaId null) — the reparto pool.
  // votacion/ranking temas own their own opciones (temaId === that tema).
  getOpcionesPool() { return this.getOpciones().filter((o) => o.temaId == null); }
  getOpcionesDisponibles() { return this.getOpcionesPool().filter((o) => !o.meta?.fijo); }
  getOpcionesDeTema(temaId) { return this.getOpciones().filter((o) => String(o.temaId) === String(temaId)); }
  getAtributos() { return this.getState().atributos || []; }

  // Formats one attribute's stored value for display; null if empty/absent
  // (so callers can skip it). Keeps display logic in the service, not the view.
  formatAtributo(atributo, value) {
    if (value == null || value === '') return null;
    if (atributo.type === 'siNo') return (value === true || value === 'true') ? 'Sí' : null;
    return String(value);
  }

  // View-model: an Opción's non-empty attribute values as [{ key, label,
  // display }] — the generic replacement for the old hardcoded sexo/edad tags.
  getOpcionAtributos(opcion) {
    return this.getAtributos()
      .map((a) => ({ a, display: this.formatAtributo(a, opcion?.meta?.[a.key]) }))
      .filter((x) => x.display != null)
      .map((x) => ({ key: x.a.key, label: x.a.label, display: x.display }));
  }
  getTemaById(id) { return this.getTemas().find((c) => c.id === id); }
  getOpcionById(id) { return this.getOpciones().find((o) => String(o.id) === String(id)); }

  // Answer progress across ALL modos, for the current user's respuestas.
  // Unit per modo: reparto → each pool Opción (answered = assigned);
  // votacion/ranking/texto_libre → each Tema (answered = has a vote / a
  // non-empty order / non-empty text). Used by the Dashboard doughnut and the
  // Responder progress line.
  getAnswerProgress() {
    const resp = slice.getComponent('RespuestasService').getState();
    const pool = this.getOpcionesDisponibles();
    const reparto = { total: pool.length, answered: pool.filter((o) => resp.seleccion[o.id]).length };
    const votacion = this._modoProgress(this.getTemasVotacion(), (t) => resp.voto?.[t.id] != null);
    const ranking = this._modoProgress(this.getTemasRanking(), (t) => (resp.ranking?.[t.id] || []).length > 0);
    const texto = this._modoProgress(this.getTemasTexto(), (t) => !!(resp.texto?.[t.id] || '').trim());
    return {
      reparto, votacion, ranking, texto,
      total: reparto.total + votacion.total + ranking.total + texto.total,
      answered: reparto.answered + votacion.answered + ranking.answered + texto.answered,
    };
  }

  _modoProgress(temas, isAnswered) {
    return { total: temas.length, answered: temas.filter(isAnswered).length };
  }

  // A pure function of the id — NOT the tema's position in any list.
  // Used to derive the position by index into PALETTE, which meant every
  // Tema's color silently shifted whenever a sibling was added/removed
  // anywhere before it in the array. Now stable under reordering (newest-
  // first inserts in addTema, deletes, imports) — same id always gets
  // the same color.
  colorFor(temaId) {
    const key = String(temaId);
    let hash = 0;
    for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
    return PALETTE[hash % PALETTE.length];
  }

  getLiderName(temaId) {
    const tema = this.getTemaById(temaId);
    return tema?.meta?.lider || null;
  }

  isLiderLocked(temaId) {
    return !!this.getLiderName(temaId);
  }

  resolveOpcionByName(name) {
    if (!name) return null;
    return this.getOpciones().find((o) => o.nombre === name) || null;
  }

  countByTema(seleccion) {
    const counts = {};
    this.getTemasParticipables().forEach((c) => { counts[c.id] = 0; });
    Object.values(seleccion || {}).forEach((cid) => {
      if (cid && counts[cid] !== undefined) counts[cid]++;
    });
    return counts;
  }

  statusOf(tema, count) {
    if (count === 0) return 'empty';
    if (tema.min != null && count < tema.min) return 'under';
    if (tema.max != null && count > tema.max) return 'over';
    return 'ok';
  }

  statusLabel(tema, count) {
    const st = this.statusOf(tema, count);
    const labels = {
      ok: 'En rango',
      under: `Faltan ${tema.min - count}`,
      over: `Sobran ${count - tema.max}`,
      empty: 'Vacío',
    };
    return labels[st] || '';
  }

  isFull(temaId, seleccion, exceptOpcionId) {
    const tema = this.getTemaById(temaId);
    if (!tema || tema.max == null) return false;
    let n = 0;
    Object.keys(seleccion || {}).forEach((oid) => {
      if (seleccion[oid] === temaId && oid !== String(exceptOpcionId)) n++;
    });
    return n >= tema.max;
  }

  // `id` is rendered unescaped as an HTML attribute value / querySelector
  // token all over the app (data-tema="${t.id}" and friends) — that was safe
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
  // loadFromData(result.temas, result.opciones, result.nombre).
  prepareImport(data) {
    if (!Array.isArray(data?.temas) || !Array.isArray(data?.opciones)) {
      throw new Error('Formato no reconocido — se espera un JSON de Plantilla.');
    }
    const badTema = data.temas.find((c) => !this.isSafeId(c.id));
    const badOpcion = data.opciones.find((o) => !this.isSafeId(o.id));
    if (badTema || badOpcion) {
      throw new Error('La Plantilla contiene IDs con caracteres no permitidos.');
    }
    return {
      temas: data.temas,
      opciones: data.opciones,
      nombre: data.nombre,
      atributos: Array.isArray(data.atributos) ? data.atributos : [],
      impact: this._impactOfReplacing(data.temas, data.opciones),
    };
  }

  _impactOfReplacing(newTemas, newOpciones) {
    const newCatIds = new Set(newTemas.map((c) => c.id));
    const newOpcIds = new Set(newOpciones.map((o) => String(o.id)));
    const respuestas = slice.getComponent('RespuestasService').getState();
    let n = 0;
    Object.entries(respuestas.seleccion).forEach(([opcionId, temaId]) => {
      if (!newOpcIds.has(String(opcionId)) || !newCatIds.has(temaId)) n++;
    });
    Object.keys(respuestas.texto).forEach((temaId) => {
      if (!newCatIds.has(temaId)) n++;
    });
    Object.entries(respuestas.voto || {}).forEach(([temaId, opcionId]) => {
      if (!newCatIds.has(temaId) || !newOpcIds.has(String(opcionId))) n++;
    });
    Object.keys(respuestas.ranking || {}).forEach((temaId) => {
      if (!newCatIds.has(temaId)) n++;
    });
    return n;
  }

  // When replacing the entire dataset, clean up any respuestas/decisionFinal
  // entries that reference now-deleted temas or opciones. Also cleans
  // settings.lideres and imported sources. `nombre` is optional — omit it to
  // keep the current Plantilla name (e.g. a CRUD bulk-edit), pass it when
  // adopting a whole new Plantilla (import, reset to seed). Throws if any
  // Tema/Opción id fails the safe-charset check — callers should
  // normally go through prepareImport() first so this never happens on the
  // import path, but the guard stays here too since this is the actual
  // trust boundary (defense in depth for any future caller).
  loadFromData(temas, opciones, nombre, atributos) {
    const badTema = temas.find((c) => !this.isSafeId(c.id));
    const badOpcion = opciones.find((o) => !this.isSafeId(o.id));
    if (badTema || badOpcion) {
      throw new Error('La Plantilla contiene IDs con caracteres no permitidos.');
    }

    const prev = this.getState();
    const oldTemaIds = new Set(prev.temas.map((c) => c.id));
    const oldOpcionIds = new Set(prev.opciones.map((o) => String(o.id)));

    slice.context.setState(CONTEXT, (p) => ({
      nombre: nombre !== undefined ? nombre : p.nombre,
      atributos: atributos !== undefined ? atributos : (p.atributos || []),
      temas,
      opciones,
    }));

    const newTemaIds = new Set(temas.map((c) => c.id));
    const newOpcionIds = new Set(opciones.map((o) => String(o.id)));

    const removedTemaIds = [...oldTemaIds].filter((id) => !newTemaIds.has(id));
    const removedOpcionIds = [...oldOpcionIds].filter((id) => !newOpcionIds.has(id));

    if (removedTemaIds.length || removedOpcionIds.length) {
      this._cleanupOrphaned(removedTemaIds, removedOpcionIds);
    }
  }

  resetToSeed() {
    this.loadFromData(SEED_TEMAS, SEED_OPCIONES, SEED_STATE.nombre, SEED_STATE.atributos);
  }

  _cleanupOrphaned(removedTemaIds, removedOpcionIds) {
    const rmvTemas = new Set(removedTemaIds);
    const rmvOpciones = new Set(removedOpcionIds.map(String));

    const cleanSeleccion = (seleccion) => {
      if (!seleccion || !Object.keys(seleccion).length) return seleccion;
      const next = {};
      let changed = false;
      Object.entries(seleccion).forEach(([opcionId, temaId]) => {
        if (rmvOpciones.has(String(opcionId)) || rmvTemas.has(temaId)) { changed = true; return; }
        next[opcionId] = temaId;
      });
      return changed ? next : seleccion;
    };

    const cleanTexto = (texto) => {
      if (!texto || !Object.keys(texto).length) return texto;
      const next = {};
      let changed = false;
      Object.entries(texto).forEach(([temaId, value]) => {
        if (rmvTemas.has(temaId)) { changed = true; return; }
        next[temaId] = value;
      });
      return changed ? next : texto;
    };

    // voto: {[temaId]: opcionId} — drop if either the tema or the chosen opción
    // was removed. ranking: {[temaId]: opcionId[]} — drop the whole entry if the
    // tema went, else filter removed opciones out of the ordered list.
    const cleanVoto = (voto) => {
      if (!voto || !Object.keys(voto).length) return voto;
      const next = {};
      let changed = false;
      Object.entries(voto).forEach(([temaId, opcionId]) => {
        if (rmvTemas.has(temaId) || rmvOpciones.has(String(opcionId))) { changed = true; return; }
        next[temaId] = opcionId;
      });
      return changed ? next : voto;
    };

    const cleanRanking = (ranking) => {
      if (!ranking || !Object.keys(ranking).length) return ranking;
      const next = {};
      let changed = false;
      Object.entries(ranking).forEach(([temaId, ids]) => {
        if (rmvTemas.has(temaId)) { changed = true; return; }
        const list = Array.isArray(ids) ? ids : [];
        const filtered = list.filter((oid) => !rmvOpciones.has(String(oid)));
        if (filtered.length !== list.length) changed = true;
        next[temaId] = filtered;
      });
      return changed ? next : ranking;
    };

    // Clean respuestas.seleccion / respuestas.texto
    const respuestas = slice.getComponent('RespuestasService');
    if (respuestas && respuestas.getState) {
      const respState = respuestas.getState();
      const seleccionCleaned = cleanSeleccion(respState.seleccion);
      const textoCleaned = cleanTexto(respState.texto);
      const votoCleaned = cleanVoto(respState.voto);
      const rankingCleaned = cleanRanking(respState.ranking);
      if (seleccionCleaned !== respState.seleccion || textoCleaned !== respState.texto
        || votoCleaned !== respState.voto || rankingCleaned !== respState.ranking) {
        slice.context.setState('respuestas', (prevR) => ({ ...prevR, seleccion: seleccionCleaned, texto: textoCleaned, voto: votoCleaned, ranking: rankingCleaned }));
      }
    }

    // Clean decisionFinal.seleccion / decisionFinal.texto (same seleccion/texto
    // split as respuestas — see ConsensoService's header comment)
    const consenso = slice.getComponent('ConsensoService');
    if (consenso && consenso.getState) {
      const consensoState = consenso.getState();
      const seleccionCleaned = cleanSeleccion(consensoState.seleccion);
      const textoCleaned = cleanTexto(consensoState.texto);
      const votoCleaned = cleanVoto(consensoState.voto);
      const rankingCleaned = cleanRanking(consensoState.ranking);
      if (seleccionCleaned !== consensoState.seleccion || textoCleaned !== consensoState.texto
        || votoCleaned !== consensoState.voto || rankingCleaned !== consensoState.ranking) {
        slice.context.setState('decisionFinal', (prevD) => ({ ...prevD, seleccion: seleccionCleaned, texto: textoCleaned, voto: votoCleaned, ranking: rankingCleaned }));
      }
    }

    // Clean settings.lideres — remove leader assignments for deleted opciones/temas
    const settings = slice.getComponent('SettingsService');
    const settingsState = settings.getState();
    if (settingsState.lideres && Object.keys(settingsState.lideres).length) {
      const lideres = { ...settingsState.lideres };
      let liderChanged = false;
      Object.entries(lideres).forEach(([temaId, opcionId]) => {
        if (rmvOpciones.has(String(opcionId)) || rmvTemas.has(temaId)) { delete lideres[temaId]; liderChanged = true; }
      });
      if (liderChanged) {
        slice.context.setState('settings', (prevS) => ({ ...prevS, lideres }));
      }
    }

    // Clean imported comparison sources — remove orphaned references
    const imp = slice.getComponent('RespuestasImportService');
    if (imp && imp.removeOrphaned) {
      imp.removeOrphaned(removedOpcionIds, removedTemaIds);
    }
  }

  nextTemaId() {
    return Math.max(0, ...this.getTemas().map((c) => {
      const n = parseInt(c.meta?.numero, 10);
      return isNaN(n) ? 0 : n;
    })) + 1;
  }

  nextOpcionId() {
    return Math.max(0, ...this.getOpciones().map((o) => Number(o.id) || 0)) + 1;
  }

  updateTema(temaId, changes) {
    slice.context.setState(CONTEXT, (prev) => ({
      ...prev,
      temas: prev.temas.map((c) => (c.id === temaId ? { ...c, ...changes } : c)),
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
    // temaId null = global reparto pool; a non-null temaId means this Opción
    // belongs to that votacion/ranking tema (see getOpcionesDeTema).
    const o = { nombre: '', temaId: null, meta: { sexo: '', edad: null, fijo: false, rolFijo: null }, ...opcion, id };
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
  // Tema/Opción CRUD is symmetric.
  addTema(tema) {
    const numero = this.nextTemaId();
    // Always route an explicit id through _slug() too — never trust a
    // caller-supplied id blindly (see isSafeId's comment).
    const id = tema?.id ? this._slug(String(tema.id)) : this._slug(tema?.nombre);
    const c = {
      id, nombre: '', modo: 'reparto', orden: numero, min: null, max: null,
      participable: true, meta: { lider: null, numero },
      ...tema, id,
    };
    // Prepended, not appended — newest-first, same reasoning as addOpcion.
    slice.context.setState(CONTEXT, (prev) => ({ ...prev, temas: [c, ...prev.temas] }));
    return c;
  }

  removeTema(temaId) {
    // Cascade: a votacion/ranking tema owns its opciones (temaId === it) —
    // remove those too so they don't dangle as orphans in the pool.
    const ownedOpcionIds = this.getOpciones().filter((o) => String(o.temaId) === String(temaId)).map((o) => String(o.id));
    slice.context.setState(CONTEXT, (prev) => ({
      ...prev,
      temas: prev.temas.filter((c) => c.id !== temaId),
      opciones: prev.opciones.filter((o) => String(o.temaId) !== String(temaId)),
    }));
    this._cleanupOrphaned([temaId], ownedOpcionIds);
  }

  // ── Bulk operations (multi-select delete / delete-all in the builder) ──
  removeTemas(ids) {
    const idSet = new Set(ids);
    const ownedOpcionIds = this.getOpciones().filter((o) => idSet.has(o.temaId)).map((o) => String(o.id));
    slice.context.setState(CONTEXT, (prev) => ({
      ...prev,
      temas: prev.temas.filter((c) => !idSet.has(c.id)),
      opciones: prev.opciones.filter((o) => !idSet.has(o.temaId)),
    }));
    this._cleanupOrphaned([...idSet], ownedOpcionIds);
  }

  removeOpciones(ids) {
    const idSet = new Set(ids.map(String));
    slice.context.setState(CONTEXT, (prev) => ({ ...prev, opciones: prev.opciones.filter((o) => !idSet.has(String(o.id))) }));
    this._cleanupOrphaned([], [...idSet]);
  }

  clearTemas() {
    const ids = this.getTemas().map((c) => c.id);
    const ownedOpcionIds = this.getOpciones().filter((o) => o.temaId != null).map((o) => String(o.id));
    slice.context.setState(CONTEXT, (prev) => ({ ...prev, temas: [], opciones: prev.opciones.filter((o) => o.temaId == null) }));
    this._cleanupOrphaned(ids, ownedOpcionIds);
  }

  clearOpciones() {
    const ids = this.getOpciones().map((o) => String(o.id));
    slice.context.setState(CONTEXT, (prev) => ({ ...prev, opciones: [] }));
    this._cleanupOrphaned([], ids);
  }

  // ── Atributos custom (dynamic per-Plantilla Opción fields; Fase 3 UI) ──
  addAtributo(atributo) {
    const label = atributo?.label || 'Atributo';
    const a = { key: this._slug(atributo?.key || label), label, type: 'texto', opciones: [], ...atributo };
    slice.context.setState(CONTEXT, (prev) => ({ ...prev, atributos: [...(prev.atributos || []), a] }));
    return a;
  }

  updateAtributo(key, changes) {
    slice.context.setState(CONTEXT, (prev) => ({
      ...prev,
      atributos: (prev.atributos || []).map((a) => (a.key === key ? { ...a, ...changes } : a)),
    }));
  }

  removeAtributo(key) {
    slice.context.setState(CONTEXT, (prev) => ({ ...prev, atributos: (prev.atributos || []).filter((a) => a.key !== key) }));
  }

  _slug(name) {
    return (name || '')
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'tema';
  }
}
