// Context is created ONCE in init() via StoreService.ensure() — boot order
// guarantees init runs before any consumer, so no per-method defensive ensure.
//
// Owns the `decisionFinal` context: { seleccion: {[opcionId]: temaId},
// texto: {[temaId]: {autor, texto}} } — the manually overridden
// "Final" decisions in Comparar, kept separate from the user's own
// `respuestas` context. Mirrors `respuestas`' seleccion/texto split (Fase A
// design correction) for the same reason: seleccion is naturally indexed by
// Opción (many Opciones per Tema), texto is naturally indexed by
// Tema (one chosen answer per question). Rows for `seleccion` methods
// come from CompareView: { opcion, vals: temaId[] } (opcion here is
// really an Opción — kept named `opcion` in the row shape, unchanged from
// the source app).
const CONTEXT = 'decisionFinal';
const STORAGE_KEY = 'conclave-decision-final-v1';
// Mirrors respuestas' split: seleccion (reparto) + texto (texto_libre) + voto
// (votacion, one chosen opción per tema) + ranking (ordered opción ids per
// tema). Returning users predate voto/ranking — reads default them.
const INITIAL_STATE = { seleccion: {}, texto: {}, voto: {}, ranking: {} };

export default class ConsensoService {
  init() {
    slice.getComponent('StoreService').ensure(CONTEXT, INITIAL_STATE, STORAGE_KEY);
  }

  getState() {
    return slice.context.getState(CONTEXT);
  }

  // ── Modo selección ──────────────────────────────────────────

  hasResolution(opcionId) {
    return Object.prototype.hasOwnProperty.call(this.getState().seleccion, opcionId);
  }

  // Majority vote across proposed values; ties broken by first-encountered order.
  suggestFinal(row) {
    const tally = {};
    row.vals.forEach((v) => { if (v) tally[v] = (tally[v] || 0) + 1; });
    let best = null, bestN = 0;
    row.vals.forEach((v) => { if (v && tally[v] > bestN) { best = v; bestN = tally[v]; } });
    return best;
  }

  // Manual override if present, otherwise the majority suggestion.
  finalFor(row) {
    if (this.hasResolution(row.opcion.id)) return this.getState().seleccion[row.opcion.id] || null;
    return this.suggestFinal(row);
  }

  setResolution(opcionId, temaId) {
    slice.context.setState(CONTEXT, (prev) => ({ ...prev, seleccion: { ...prev.seleccion, [opcionId]: temaId } }));
  }

  fillAllWithSuggestion(rows) {
    const updates = {};
    rows.forEach((row) => {
      const f = this.finalFor(row);
      if (f) updates[row.opcion.id] = f;
    });
    slice.context.setState(CONTEXT, (prev) => ({ ...prev, seleccion: { ...prev.seleccion, ...updates } }));
  }

  clearAll() {
    slice.context.setState(CONTEXT, (prev) => ({ ...prev, seleccion: {} }));
  }

  // ── Modo texto_libre ────────────────────────────────────────

  hasResolutionTexto(temaId) {
    return Object.prototype.hasOwnProperty.call(this.getState().texto, temaId);
  }

  // "Final" for a texto_libre tema = one author's exact proposal
  // adopted as-is (mirrors the seleccion majority-pick UX, no merge/synthesis
  // editor in this phase).
  finalTextoFor(temaId) {
    return this.getState().texto[temaId] || null;
  }

  setResolutionTexto(temaId, autor, texto) {
    slice.context.setState(CONTEXT, (prev) => ({ ...prev, texto: { ...prev.texto, [temaId]: { autor, texto } } }));
  }

  clearResolutionTexto(temaId) {
    slice.context.setState(CONTEXT, (prev) => {
      const texto = { ...prev.texto };
      delete texto[temaId];
      return { ...prev, texto };
    });
  }

  // ── Modo votacion ───────────────────────────────────────────
  // Final = one Opción adopted per tema (manual override or, later, the
  // majority pick computed in the votacion compare view — Fase 2).
  finalVotoFor(temaId) {
    return this.getState().voto?.[temaId] || null;
  }

  setResolutionVoto(temaId, opcionId) {
    slice.context.setState(CONTEXT, (prev) => ({ ...prev, voto: { ...(prev.voto || {}), [temaId]: opcionId } }));
  }

  clearResolutionVoto(temaId) {
    slice.context.setState(CONTEXT, (prev) => {
      const voto = { ...(prev.voto || {}) };
      delete voto[temaId];
      return { ...prev, voto };
    });
  }

  // ── Modo ranking ────────────────────────────────────────────
  finalRankingFor(temaId) {
    return this.getState().ranking?.[temaId] || [];
  }

  setResolutionRanking(temaId, opcionIds) {
    const list = Array.isArray(opcionIds) ? opcionIds : [];
    slice.context.setState(CONTEXT, (prev) => ({ ...prev, ranking: { ...(prev.ranking || {}), [temaId]: list } }));
  }

  clearResolutionRanking(temaId) {
    slice.context.setState(CONTEXT, (prev) => {
      const ranking = { ...(prev.ranking || {}) };
      delete ranking[temaId];
      return { ...prev, ranking };
    });
  }

  // ── Export ──────────────────────────────────────────────────

  exportFinal(rows) {
    const seleccion = {};
    rows.forEach((row) => {
      const f = this.finalFor(row);
      if (f) seleccion[row.opcion.id] = f;
    });
    const state = this.getState();
    const texto = {};
    Object.entries(state.texto).forEach(([temaId, entry]) => {
      if (entry?.texto) texto[temaId] = entry.texto;
    });
    const voto = { ...(state.voto || {}) };
    const ranking = { ...(state.ranking || {}) };
    const autor = slice.getComponent('SettingsService').getState().autor || 'Consenso';
    slice.getComponent('ExportService').downloadRespuestasFinal(autor, { seleccion, texto, voto, ranking });
  }
}
