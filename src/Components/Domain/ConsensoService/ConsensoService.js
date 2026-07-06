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

  // Exports the full state as JSON (used by ResumenFinalView).
  exportStateJson() {
    var autor = slice.getComponent('SettingsService').getState().autor || 'Consenso';
    slice.getComponent('ExportService').downloadRespuestasFinal(autor, this.getState());
  }

  // Imports consensus state from a parsed JSON object.
  // Returns true if the state was valid and loaded.
  importState(data) {
    if (!data || typeof data !== 'object') return false;
    // Handle envelope format: { respuestas: { seleccion, texto, voto, ranking } }
    const src = data.respuestas || data;
    if (!src || typeof src !== 'object') return false;
    var state = {};
    ['seleccion', 'texto', 'voto', 'ranking'].forEach(function (key) {
      state[key] = (src[key] && typeof src[key] === 'object') ? src[key] : {};
    });
    slice.context.setState(CONTEXT, function () { return state; });
    return true;
  }

  // ── HTML / PDF export ──────────────────────────────────────

  exportHtml() {
    const html = this._buildExportDoc();
    slice.getComponent('FileDownloadService').download('resumen_final.html', html, 'text/html');
  }

  exportPdf() {
    const html = this._buildExportDoc();
    slice.getComponent('FileDownloadService').download('resumen_final.html', html, 'text/html');
  }

  exportPrint() {
    const html = this._buildExportDoc();
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:0';
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();
    setTimeout(function () {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      setTimeout(function () { document.body.removeChild(iframe); }, 500);
    }, 200);
  }

  _buildExportDoc() {
    const roster = slice.getComponent('PlantillaService');
    const h = slice.getComponent('HtmlService');
    const temas = roster.getTemas();
    const state = this.getState();
    const date = new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });

    const parts = [];
    parts.push(this._buildReparto(temas, state, roster, h));
    parts.push(this._buildVotacion(temas, state, roster, h));
    parts.push(this._buildRanking(temas, state, roster, h));
    parts.push(this._buildTexto(temas, state, roster, h));
    const bodyHtml = parts.filter(Boolean).join('\n');

    return '<!DOCTYPE html>\n<html lang="es">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width,initial-scale=1.0">\n<title>Resumen del consenso final \u2014 Conclave</title>\n<style>\n*,*::before,*::after{box-sizing:border-box}\nbody{font-family:\'Segoe UI\',system-ui,-apple-system,sans-serif;max-width:800px;margin:0 auto;padding:40px 24px;color:#1a1a1a;background:#fff;line-height:1.6;-webkit-font-smoothing:antialiased}\nh1{font-size:28px;margin:0 0 4px}\n.meta{color:#666;font-size:14px;margin:0 0 36px}\nh2{font-size:20px;font-weight:700;margin:32px 0 16px;padding-bottom:8px;border-bottom:3px solid #e85d4a}\ntable{width:100%;border-collapse:collapse;margin-bottom:24px}\nth,td{text-align:left;padding:10px 14px;border-bottom:1px solid #e0e0e0}\nth{font-weight:700;text-transform:uppercase;font-size:11px;color:#888;letter-spacing:.04em}\n.cards{display:flex;flex-direction:column;gap:12px;margin-bottom:24px}\n.card{background:#f7f7f7;border-radius:12px;padding:16px 20px}\n.card h3{margin:0 0 6px;font-size:16px;font-weight:700}\n.card-body{font-size:14px;color:#333}\n.card-body.empty{color:#aaa;font-style:italic}\n.rank-list{list-style:none;padding:0;margin:8px 0 0}\n.rank-item{display:flex;align-items:center;gap:10px;padding:6px 0}\n.rank-pos{display:inline-flex;width:26px;height:26px;border-radius:50%;background:#e85d4a;color:#fff;align-items:center;justify-content:center;font-weight:700;font-size:12px;flex-shrink:0}\n.quote{font-style:italic;background:#f0f0f0;padding:14px 18px;border-left:4px solid #e85d4a;border-radius:8px;margin:6px 0 0;white-space:pre-wrap}\n.quote-autor{font-size:12px;color:#888;font-weight:600;font-style:normal;margin-top:8px;display:block}\n.empty{color:#aaa;font-style:italic;font-size:14px}\n@media print{body{margin:0;padding:20px}h2{break-after:avoid}.card{break-inside:avoid}}\n</style>\n</head>\n<body>\n<h1>Resumen del consenso final</h1>\n<p class="meta">Generado el ' + h.esc(date) + ' por Conclave</p>\n' + bodyHtml + '\n</body>\n</html>';
  }

  _buildReparto(temas, state, roster, h) {
    const repartoTemas = temas.filter(function (t) { return t.modo === 'reparto'; });
    if (!repartoTemas.length) return '';
    const sel = state.seleccion || {};
    const opcionesConTema = Object.entries(sel).filter(function (entry) { return repartoTemas.some(function (t) { return t.id === entry[1]; }); });
    if (!opcionesConTema.length) return '<h2>Asignaciones</h2><p class="empty">No hay decisiones finales de asignaci\u00f3n.</p>';

    const rows = opcionesConTema.map(function (entry) {
      var opcion = roster.getOpcionById(entry[0]);
      var tema = repartoTemas.find(function (t) { return t.id === entry[1]; });
      return '<tr><td>' + h.esc(opcion ? opcion.nombre : entry[0]) + '</td><td>' + h.esc(tema ? tema.nombre : entry[1]) + '</td></tr>';
    }).join('');
    return '<h2>Asignaciones</h2><table><thead><tr><th>Persona</th><th>Asignado a</th></tr></thead><tbody>' + rows + '</tbody></table>';
  }

  _buildVotacion(temas, state, roster, h) {
    var votacionTemas = temas.filter(function (t) { return t.modo === 'votacion'; });
    if (!votacionTemas.length) return '';
    var voto = state.voto || {};

    var cards = votacionTemas.map(function (tema) {
      var finalOpcionId = voto[tema.id];
      var opcion = finalOpcionId ? roster.getOpcionById(finalOpcionId) : null;
      return '<div class="card"><h3>' + h.esc(tema.nombre) + '</h3><div class="card-body">' + (opcion ? '<strong>' + h.esc(opcion.nombre) + '</strong>' : '<span class="empty">Sin decidir</span>') + '</div></div>';
    }).join('');
    return '<h2>Votaciones</h2><div class="cards">' + cards + '</div>';
  }

  _buildRanking(temas, state, roster, h) {
    var rankingTemas = temas.filter(function (t) { return t.modo === 'ranking'; });
    if (!rankingTemas.length) return '';
    var ranking = state.ranking || {};

    var cards = rankingTemas.map(function (tema) {
      var order = ranking[tema.id];
      if (!Array.isArray(order) || !order.length) {
        return '<div class="card"><h3>' + h.esc(tema.nombre) + '</h3><div class="card-body empty">Sin orden final</div></div>';
      }
      var items = order.map(function (id, idx) {
        var opcion = roster.getOpcionById(id);
        return '<li class="rank-item"><span class="rank-pos">' + (idx + 1) + '</span><span>' + h.esc(opcion ? opcion.nombre : id) + '</span></li>';
      }).join('');
      return '<div class="card"><h3>' + h.esc(tema.nombre) + '</h3><ol class="rank-list">' + items + '</ol></div>';
    }).join('');
    return '<h2>Rankings</h2><div class="cards">' + cards + '</div>';
  }

  _buildTexto(temas, state, roster, h) {
    var textoTemas = temas.filter(function (t) { return t.modo === 'texto_libre'; });
    if (!textoTemas.length) return '';
    var texto = state.texto || {};

    var cards = textoTemas.map(function (tema) {
      var entry = texto[tema.id];
      return '<div class="card"><h3>' + h.esc(tema.nombre) + '</h3><div class="card-body">' + (entry && entry.texto ? '<blockquote class="quote">' + h.esc(entry.texto) + '<span class="quote-autor">\u2014 ' + h.esc(entry.autor || '') + '</span></blockquote>' : '<span class="empty">Sin texto adoptado</span>') + '</div></div>';
    }).join('');
    return '<h2>Texto libre</h2><div class="cards">' + cards + '</div>';
  }
}
