// Owns the `resolutions` context: { [memberId]: teamId } — the manually
// overridden "Final" decisions in Comparar, kept separate from the user's own
// `assignment` context. Rows come from CompareView: { member, vals: teamId[] }.
const CONTEXT = 'resolutions';
const STORAGE_KEY = 'conclave-resolutions-v1';

export default class ResolutionService {
  init() {
    this._ensureContext();
  }

  _ensureContext() {
    if (!slice.context.has(CONTEXT)) {
      slice.context.create(CONTEXT, {}, { persist: true, storageKey: STORAGE_KEY });
    }
  }

  getState() {
    this._ensureContext();
    return slice.context.getState(CONTEXT);
  }

  hasResolution(memberId) {
    return Object.prototype.hasOwnProperty.call(this.getState(), memberId);
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
    if (this.hasResolution(row.member.id)) return this.getState()[row.member.id] || null;
    return this.suggestFinal(row);
  }

  setResolution(memberId, teamId) {
    this._ensureContext();
    slice.context.setState(CONTEXT, (prev) => ({ ...prev, [memberId]: teamId }));
  }

  fillAllWithSuggestion(rows) {
    this._ensureContext();
    const updates = {};
    rows.forEach((row) => {
      const f = this.finalFor(row);
      if (f) updates[row.member.id] = f;
    });
    slice.context.setState(CONTEXT, (prev) => ({ ...prev, ...updates }));
  }

  clearAll() {
    this._ensureContext();
    slice.context.setState(CONTEXT, () => ({}));
  }

  exportFinalList(rows) {
    const asignaciones = {};
    rows.forEach((row) => {
      const f = this.finalFor(row);
      if (f) asignaciones[row.member.id] = f;
    });
    const autor = slice.getComponent('SettingsService').getState().autor || 'Consenso';
    const payload = {
      app: 'conclave',
      version: 1,
      tipo: 'lista-final',
      autor: `${autor} — lista final`,
      fecha: new Date().toISOString(),
      asignaciones,
    };
    slice.getComponent('FileDownloadService').download(
      'lista_final_equipos.json',
      JSON.stringify(payload, null, 2),
      'application/json'
    );
  }
}
