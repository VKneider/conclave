const CONTEXT = 'respuestasImportadas';
const STORAGE_KEY = 'conclave-respuestas-importadas-v1';

// Validates and persists imported comparison sources — read and repainted by
// CompareView/CompareCarousel/FinalTally/TextCompareCards. Several components
// read and react to this same list, so per context-vs-events.md it belongs in
// Context. Each source carries all four answer modos: seleccion (reparto),
// texto (texto_libre), voto (votacion), ranking — all normalized against the
// current Plantilla (references to non-existent temas/opciones are dropped).
export default class RespuestasImportService {
  init() {
    slice.getComponent('StoreService').ensure(CONTEXT, [], STORAGE_KEY);
    this._normalizeAgainstPlantilla();
  }

  // Filters one source's answers against the current Plantilla, dropping any
  // reference to a tema/opción that no longer exists. Shared by init-time
  // normalization and import().
  _normalizeRespuestas(respuestas) {
    const plantilla = slice.getComponent('PlantillaService');
    const r = respuestas || {};
    const seleccion = Object.fromEntries(
      Object.entries(r.seleccion || {}).filter(([opcionId, temaId]) =>
        plantilla.getOpcionById(opcionId) && plantilla.getTemaById(temaId))
    );
    const texto = Object.fromEntries(
      Object.entries(r.texto || {}).filter(([temaId]) => plantilla.getTemaById(temaId))
    );
    const voto = Object.fromEntries(
      Object.entries(r.voto || {}).filter(([temaId, opcionId]) =>
        plantilla.getTemaById(temaId) && plantilla.getOpcionById(opcionId))
    );
    const ranking = Object.fromEntries(
      Object.entries(r.ranking || {})
        .filter(([temaId]) => plantilla.getTemaById(temaId))
        .map(([temaId, ids]) => [temaId, (Array.isArray(ids) ? ids : []).filter((id) => plantilla.getOpcionById(id))])
    );
    return { seleccion, texto, voto, ranking };
  }

  _isEmpty(respuestas) {
    return !Object.keys(respuestas.seleccion).length
      && !Object.keys(respuestas.texto).length
      && !Object.keys(respuestas.voto).length
      && !Object.keys(respuestas.ranking).length;
  }

  _normalizeAgainstPlantilla() {
    const next = this.getSources()
      .map((src) => ({ ...src, respuestas: this._normalizeRespuestas(src.respuestas) }))
      .filter((src) => !this._isEmpty(src.respuestas));
    slice.context.setState(CONTEXT, () => next);
  }

  getSources() {
    return slice.context.getState(CONTEXT);
  }

  isDuplicate(data) {
    const autor = data?.autor || '';
    const seleccion = data?.respuestas?.seleccion || {};
    const voto = data?.respuestas?.voto || {};
    return this.getSources().some((s) =>
      s.autor === autor
      && JSON.stringify(s.respuestas.seleccion) === JSON.stringify(seleccion)
      && JSON.stringify(s.respuestas.voto || {}) === JSON.stringify(voto));
  }

  import(data, filename) {
    const autorBase = data?.autor ? String(data.autor) : filename.replace(/\.json$/i, '');
    const raw = data?.respuestas || {};
    const rawCount = Object.keys(raw.seleccion || {}).length + Object.keys(raw.texto || {}).length
      + Object.keys(raw.voto || {}).length + Object.keys(raw.ranking || {}).length;
    const respuestas = this._normalizeRespuestas(raw);
    const recognized = Object.keys(respuestas.seleccion).length + Object.keys(respuestas.texto).length
      + Object.keys(respuestas.voto).length + Object.keys(respuestas.ranking).length;
    const ignored = Math.max(0, rawCount - recognized);

    const sources = this.getSources();
    let autor = autorBase;
    let n = 2;
    while (sources.some((s) => s.autor === autor)) autor = `${autorBase} (${n++})`;

    slice.context.setState(CONTEXT, (prev) => [...prev, { autor, respuestas }]);
    return { recognized, ignored };
  }

  remove(autor) {
    slice.context.setState(CONTEXT, (prev) => prev.filter((s) => s.autor !== autor));
  }

  removeOrphaned(removedOpcionIds, removedTemaIds) {
    const oSet = new Set((removedOpcionIds || []).map(String));
    const cSet = new Set((removedTemaIds || []).map(String));
    let changed = false;
    const next = this.getSources().map((src) => {
      const r = src.respuestas || {};
      let srcChanged = false;
      const gone = (id) => oSet.has(String(id));
      const temaGone = (id) => cSet.has(String(id));

      const seleccion = {};
      Object.entries(r.seleccion || {}).forEach(([opcionId, temaId]) => {
        if (gone(opcionId) || temaGone(temaId)) { srcChanged = true; return; }
        seleccion[opcionId] = temaId;
      });
      const texto = {};
      Object.entries(r.texto || {}).forEach(([temaId, value]) => {
        if (temaGone(temaId)) { srcChanged = true; return; }
        texto[temaId] = value;
      });
      const voto = {};
      Object.entries(r.voto || {}).forEach(([temaId, opcionId]) => {
        if (temaGone(temaId) || gone(opcionId)) { srcChanged = true; return; }
        voto[temaId] = opcionId;
      });
      const ranking = {};
      Object.entries(r.ranking || {}).forEach(([temaId, ids]) => {
        if (temaGone(temaId)) { srcChanged = true; return; }
        const list = (Array.isArray(ids) ? ids : []).filter((id) => !gone(id));
        if (list.length !== (Array.isArray(ids) ? ids.length : 0)) srcChanged = true;
        ranking[temaId] = list;
      });

      if (!srcChanged) return src;
      changed = true;
      return { ...src, respuestas: { seleccion, texto, voto, ranking } };
    }).filter((src) => !this._isEmpty(src.respuestas));
    if (changed) slice.context.setState(CONTEXT, () => next);
    return changed;
  }
}
