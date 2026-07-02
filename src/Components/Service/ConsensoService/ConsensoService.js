import { ensureContext } from '../../../utils/context.js';

// Owns the `decisionFinal` context: { seleccion: {[opcionId]: categoriaId},
// texto: {[categoriaId]: {autor, texto}} } — the manually overridden
// "Final" decisions in Comparar, kept separate from the user's own
// `respuestas` context. Mirrors `respuestas`' seleccion/texto split (Fase A
// design correction) for the same reason: seleccion is naturally indexed by
// Opción (many Opciones per Categoría), texto is naturally indexed by
// Categoría (one chosen answer per question). Rows for `seleccion` methods
// come from CompareView: { member, vals: categoriaId[] } (member here is
// really an Opción — kept named `member` in the row shape, unchanged from
// the source app).
const CONTEXT = 'decisionFinal';
const STORAGE_KEY = 'conclave-decision-final-v1';
const INITIAL_STATE = { seleccion: {}, texto: {} };

export default class ConsensoService {
  init() {
    ensureContext(CONTEXT, INITIAL_STATE, STORAGE_KEY);
  }

  getState() {
    ensureContext(CONTEXT, INITIAL_STATE, STORAGE_KEY);
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
    if (this.hasResolution(row.member.id)) return this.getState().seleccion[row.member.id] || null;
    return this.suggestFinal(row);
  }

  setResolution(opcionId, categoriaId) {
    ensureContext(CONTEXT, INITIAL_STATE, STORAGE_KEY);
    slice.context.setState(CONTEXT, (prev) => ({ ...prev, seleccion: { ...prev.seleccion, [opcionId]: categoriaId } }));
  }

  fillAllWithSuggestion(rows) {
    ensureContext(CONTEXT, INITIAL_STATE, STORAGE_KEY);
    const updates = {};
    rows.forEach((row) => {
      const f = this.finalFor(row);
      if (f) updates[row.member.id] = f;
    });
    slice.context.setState(CONTEXT, (prev) => ({ ...prev, seleccion: { ...prev.seleccion, ...updates } }));
  }

  clearAll() {
    ensureContext(CONTEXT, INITIAL_STATE, STORAGE_KEY);
    slice.context.setState(CONTEXT, (prev) => ({ ...prev, seleccion: {} }));
  }

  // ── Modo texto_libre ────────────────────────────────────────

  hasResolutionTexto(categoriaId) {
    return Object.prototype.hasOwnProperty.call(this.getState().texto, categoriaId);
  }

  // "Final" for a texto_libre categoría = one author's exact proposal
  // adopted as-is (mirrors the seleccion majority-pick UX, no merge/synthesis
  // editor in this phase).
  finalTextoFor(categoriaId) {
    return this.getState().texto[categoriaId] || null;
  }

  setResolutionTexto(categoriaId, autor, texto) {
    ensureContext(CONTEXT, INITIAL_STATE, STORAGE_KEY);
    slice.context.setState(CONTEXT, (prev) => ({ ...prev, texto: { ...prev.texto, [categoriaId]: { autor, texto } } }));
  }

  clearResolutionTexto(categoriaId) {
    ensureContext(CONTEXT, INITIAL_STATE, STORAGE_KEY);
    slice.context.setState(CONTEXT, (prev) => {
      const texto = { ...prev.texto };
      delete texto[categoriaId];
      return { ...prev, texto };
    });
  }

  // ── Export ──────────────────────────────────────────────────

  exportFinal(rows) {
    const seleccion = {};
    rows.forEach((row) => {
      const f = this.finalFor(row);
      if (f) seleccion[row.member.id] = f;
    });
    const texto = {};
    Object.entries(this.getState().texto).forEach(([categoriaId, entry]) => {
      if (entry?.texto) texto[categoriaId] = entry.texto;
    });
    const autor = slice.getComponent('SettingsService').getState().autor || 'Consenso';
    slice.getComponent('ExportService').downloadRespuestasFinal(autor, { seleccion, texto });
  }
}
