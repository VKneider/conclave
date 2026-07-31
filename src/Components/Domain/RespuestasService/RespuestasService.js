// Owns the `respuestas` context: { seleccion: {[opcionId]: temaId}, texto: {} }
// — the user's own working answers. `seleccion` covers modo `seleccion`
// temas (indexed by Opción — many Opciones can point at the same
// Tema with no array needed). `texto` holds modo `texto_libre` answers
// indexed by Tema. Persisted to localStorage (persist: true). User
// identity (autor) and org branding live in `settings` (SettingsService).
//
// Context is created ONCE in init() via StoreService.ensure() — the boot
// order (Providers) guarantees init runs before any consumer, so no per-method
// defensive ensure is needed (replaces the old utils/context.js pattern).
const CONTEXT = 'respuestas';
import { SHARE_URL_MAX_LENGTH, PRINT_DELAY_MS, PRINT_CLEANUP_MS } from '../../../AppConfig.js';

const STORAGE_KEY = 'conclave-respuestas-v1';
// seleccion: reparto (pool → temas). texto: texto_libre answers. voto:
// votacion (one opción per tema). ranking: ordered opciones per tema. Returning
// users predate voto/ranking (GOTCHAS §20) — every read/write defaults them, so
// no migration is needed here.
const INITIAL_STATE = { seleccion: {}, texto: {}, voto: {}, ranking: {} };

export default class RespuestasService {
  init() {
    slice.getComponent('StoreService').ensure(CONTEXT, INITIAL_STATE, STORAGE_KEY);
    this._normalizeAgainstPlantilla();
    slice.context.watch('plantilla', this, () => this._normalizeAgainstPlantilla());
  }

  _normalizeAgainstPlantilla() {
    const plantilla = slice.getComponent('PlantillaService');
    const prev = this.getState() || INITIAL_STATE;

    const seleccion = Object.fromEntries(
      Object.entries(prev.seleccion || {}).filter(([opcionId, temaId]) => {
        const tema = plantilla.getTemaById(temaId);
        const opcion = plantilla.getOpcionById(opcionId);
        return !!(tema && tema.modo === 'reparto' && opcion && opcion.temaId == null);
      })
    );

    const texto = Object.fromEntries(
      Object.entries(prev.texto || {}).filter(([temaId, value]) => {
        const tema = plantilla.getTemaById(temaId);
        return !!(tema && tema.modo === 'texto_libre' && String(value || '').trim());
      })
    );

    const voto = Object.fromEntries(
      Object.entries(prev.voto || {}).filter(([temaId, opcionId]) => {
        const tema = plantilla.getTemaById(temaId);
        const opcion = plantilla.getOpcionById(opcionId);
        return !!(tema && tema.modo === 'votacion' && opcion && String(opcion.temaId) === String(temaId));
      })
    );

    const ranking = Object.fromEntries(
      Object.entries(prev.ranking || {}).map(([temaId, ids]) => {
        const tema = plantilla.getTemaById(temaId);
        if (!tema || tema.modo !== 'ranking') return [temaId, []];
        const filtered = (Array.isArray(ids) ? ids : []).filter((id) => {
          const opcion = plantilla.getOpcionById(id);
          return opcion && String(opcion.temaId) === String(temaId);
        });
        return [temaId, filtered];
      }).filter(([, ids]) => ids.length > 0)
    );

    const changed = JSON.stringify(prev.seleccion || {}) !== JSON.stringify(seleccion)
      || JSON.stringify(prev.texto || {}) !== JSON.stringify(texto)
      || JSON.stringify(prev.voto || {}) !== JSON.stringify(voto)
      || JSON.stringify(prev.ranking || {}) !== JSON.stringify(ranking);

    if (changed) slice.context.setState(CONTEXT, () => ({ seleccion, texto, voto, ranking }));
  }

  getState() {
    return slice.context.getState(CONTEXT);
  }

  // Assigning past a tema's max is ALLOWED on purpose: it's easier for
  // organizers to move or remove excess people afterward than to leave
  // opciones unassigned while they hunt for room. The tema's "over"
  // status (PlantillaService.statusOf) becomes a persistent badge wherever
  // it's shown (Dashboard, Por tema, Comparar's final tally); this toast
  // is just an immediate heads-up.
  assignOpcion(opcionId, temaId) {
    const plantilla = slice.getComponent('PlantillaService');
    const tema = plantilla.getTemaById(temaId);
    const wasFull = plantilla.isFull(temaId, this.getState().seleccion, opcionId);
    slice.context.setState(CONTEXT, (prev) => ({ ...prev, seleccion: { ...prev.seleccion, [opcionId]: temaId } }));
    if (wasFull) {
      slice.events.emit('toast:show', { message: `«${tema?.nombre || temaId}» quedó con exceso de personas`, type: 'warning' });
    }
  }

  unassignOpcion(opcionId) {
    slice.context.setState(CONTEXT, (prev) => {
      const seleccion = { ...prev.seleccion };
      delete seleccion[opcionId];
      return { ...prev, seleccion };
    });
  }

  getTemaForOpcion(opcionId) {
    return this.getState().seleccion[opcionId] || null;
  }

  reset() {
    slice.context.setState(CONTEXT, () => ({ seleccion: {}, texto: {}, voto: {}, ranking: {} }));
  }

  // ── Modo votacion (pick exactly one Opción per Tema) ──────────
  getVoto(temaId) {
    return this.getState().voto?.[temaId] || null;
  }

  setVoto(temaId, opcionId) {
    slice.context.setState(CONTEXT, (prev) => ({ ...prev, voto: { ...(prev.voto || {}), [temaId]: opcionId } }));
  }

  clearVoto(temaId) {
    slice.context.setState(CONTEXT, (prev) => {
      const voto = { ...(prev.voto || {}) };
      delete voto[temaId];
      return { ...prev, voto };
    });
  }

  // ── Modo ranking (ordered list of Opción ids per Tema) ────────
  getRanking(temaId) {
    return this.getState().ranking?.[temaId] || [];
  }

  setRanking(temaId, opcionIds) {
    const list = Array.isArray(opcionIds) ? opcionIds : [];
    slice.context.setState(CONTEXT, (prev) => ({ ...prev, ranking: { ...(prev.ranking || {}), [temaId]: list } }));
  }

  clearRanking(temaId) {
    slice.context.setState(CONTEXT, (prev) => {
      const ranking = { ...(prev.ranking || {}) };
      delete ranking[temaId];
      return { ...prev, ranking };
    });
  }

  // Exports the user's respuestas. If settings.autor is empty, prompts
  // for a name first via confirm:request before exporting.
  exportMine() {
    const respuestas = this.getState();
    const autor = slice.getComponent('SettingsService').getState().autor;
    slice.getComponent('ExportService').downloadRespuestas(autor, respuestas);
  }

  exportMineWithPrompt() {
    const settings = slice.getComponent('SettingsService');
    if (settings.getState().autor?.trim()) {
      this.exportMine();
      return;
    }
    slice.events.emit('confirm:request', {
      title: '¿Cuál es tu nombre?',
      message: 'Se incluye en el archivo exportado.',
      confirmLabel: 'Exportar',
      inputLabel: 'Tu nombre',
      inputPlaceholder: '¿Quién asigna?',
      onConfirm: (name) => {
        if (!name) return;
        settings.setAutor(name);
        this.exportMine();
      },
    });
  }

  // Generates a compressed share URL for the current respuestas.
  _buildSharePayload(autor) {
    const respuestas = this.getState();
    const email = slice.getComponent('SettingsService').getEmail();
    return { tipo: 'respuestas', autor: autor || '', email, respuestas };
  }

  getShareLink(autor) {
    const packed = slice.getComponent('CompressionService').packForURI(this._buildSharePayload(autor));
    const compressed = slice.getComponent('CompressionService').compressToURI(packed);
    return `${window.location.origin}${window.location.pathname}#respuestas=${compressed}`;
  }

  getShareUrlLength(autor) {
    return this.getShareLink(autor).length;
  }

  canShareByLink(autor) {
    return this.getShareUrlLength(autor) <= SHARE_URL_MAX_LENGTH;
  }

  getShareUrlMaxLength() {
    return SHARE_URL_MAX_LENGTH;
  }

  // Copies the share URL to clipboard, prompting for name if missing.
  copyShareLink() {
    const settings = slice.getComponent('SettingsService');
    const autor = settings.getState().autor?.trim();

    const doCopy = (name) => {
      if (!this.canShareByLink(name)) {
        slice.events.emit('toast:show', {
          message: 'Las respuestas son demasiado largas para compartir por enlace. Exporta archivo.',
          type: 'warning'
        });
        return;
      }
      const url = this.getShareLink(name);
      navigator.clipboard.writeText(url).then(() => {
        slice.events.emit('toast:show', { message: 'Enlace copiado al portapapeles', type: 'success' });
      }, () => {
        slice.events.emit('toast:show', { message: 'No se pudo copiar el enlace', type: 'error' });
      });
    };

    if (autor) { doCopy(autor); return; }

    slice.events.emit('confirm:request', {
      title: '¿Cuál es tu nombre?',
      message: 'Se incluye en el enlace compartido.',
      confirmLabel: 'Compartir',
      inputLabel: 'Tu nombre',
      inputPlaceholder: '¿Quién responde?',
      onConfirm: (name) => {
        if (!name) return;
        settings.setAutor(name);
        doCopy(name);
      },
    });
  }

  // Opens the default email client with the share link, addressed to the
  // plantilla's creator email (if any).
  sendShareLinkEmail() {
    const settings = slice.getComponent('SettingsService');
    const autor = settings.getState().autor?.trim();
    const plantilla = slice.getComponent('PlantillaService');
    const to = plantilla.getCreadoEmail()?.trim();

    const doSend = (name) => {
      if (!this.canShareByLink(name)) {
        slice.events.emit('toast:show', {
          message: 'Las respuestas son demasiado largas para compartir por enlace. Exporta archivo.',
          type: 'warning'
        });
        return;
      }
      const url = this.getShareLink(name);
      const plantillaNombre = plantilla.getNombre() || 'Conclave';
      const subject = encodeURIComponent(`Mis respuestas — ${plantillaNombre}`);
      const body = encodeURIComponent(
        `Hola,\n\n${name} ha compartido sus respuestas para "${plantillaNombre}":\n${url}\n\nSaludos`
      );
      const toPart = to ? `${to}?` : '?';
      window.location.href = `mailto:${toPart}subject=${subject}&body=${body}`;
    };

    if (autor) { doSend(autor); return; }

    slice.events.emit('confirm:request', {
      title: '¿Cuál es tu nombre?',
      message: 'Se incluye en el correo.',
      confirmLabel: 'Enviar',
      inputLabel: 'Tu nombre',
      inputPlaceholder: '¿Quién responde?',
      onConfirm: (name) => {
        if (!name) return;
        settings.setAutor(name);
        doSend(name);
      },
    });
  }

  setTexto(temaId, texto) {
    slice.context.setState(CONTEXT, (prev) => ({ ...prev, texto: { ...prev.texto, [temaId]: texto } }));
  }

  clearTexto(temaId) {
    slice.context.setState(CONTEXT, (prev) => {
      const texto = { ...prev.texto };
      delete texto[temaId];
      return { ...prev, texto };
    });
  }

  exportPrint() {
    const h = slice.getComponent('HtmlService');
    const roster = slice.getComponent('PlantillaService');
    const state = this.getState();
    const settings = slice.getComponent('SettingsService');
    const autor = settings.getState().autor || 'Tus respuestas';
    const temas = roster.getTemas();
    const date = new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });

    const lines = [];
    const repartoTemas = temas.filter(function (t) { return t.modo === 'reparto'; });
    if (repartoTemas.length) {
      lines.push('<h2>Asignaciones</h2>');
      const sel = state.seleccion || {};
      const opciones = roster.getOpciones();
      var repartoRows = [];
      opciones.forEach(function (op) {
        var temaId = sel[op.id];
        if (temaId) {
          var tema = repartoTemas.find(function (t) { return t.id === temaId; });
          repartoRows.push('<tr><td>' + h.esc(op.nombre) + '</td><td>' + h.esc(tema ? tema.nombre : temaId) + '</td></tr>');
        }
      });
      if (repartoRows.length) {
        lines.push('<table><thead><tr><th>Persona</th><th>Asignado a</th></tr></thead><tbody>' + repartoRows.join('') + '</tbody></table>');
      } else {
        lines.push('<p class="empty">Sin asignaciones</p>');
      }
    }

    var votacionTemas = temas.filter(function (t) { return t.modo === 'votacion'; });
    if (votacionTemas.length) {
      lines.push('<h2>Votaciones</h2>');
      var voto = state.voto || {};
      var vCards = votacionTemas.map(function (tema) {
        var opcionId = voto[tema.id];
        var opcion = opcionId ? roster.getOpcionById(opcionId) : null;
        return '<div class="card"><h3>' + h.esc(tema.nombre) + '</h3><div class="card-body">' + (opcion ? '<strong>' + h.esc(opcion.nombre) + '</strong>' : '<span class="empty">Sin elegir</span>') + '</div></div>';
      }).join('');
      lines.push('<div class="cards">' + vCards + '</div>');
    }

    var rankingTemas = temas.filter(function (t) { return t.modo === 'ranking'; });
    if (rankingTemas.length) {
      lines.push('<h2>Rankings</h2>');
      var ranking = state.ranking || {};
      var rCards = rankingTemas.map(function (tema) {
        var order = ranking[tema.id];
        if (!Array.isArray(order) || !order.length) {
          return '<div class="card"><h3>' + h.esc(tema.nombre) + '</h3><div class="card-body empty">Sin ordenar</div></div>';
        }
        var items = order.map(function (id, idx) {
          var op = roster.getOpcionById(id);
          return '<li class="rank-item"><span class="rank-pos">' + (idx + 1) + '</span><span>' + h.esc(op ? op.nombre : id) + '</span></li>';
        }).join('');
        return '<div class="card"><h3>' + h.esc(tema.nombre) + '</h3><ol class="rank-list">' + items + '</ol></div>';
      }).join('');
      lines.push('<div class="cards">' + rCards + '</div>');
    }

    var textoTemas = temas.filter(function (t) { return t.modo === 'texto_libre'; });
    if (textoTemas.length) {
      lines.push('<h2>Texto libre</h2>');
      var texto = state.texto || {};
      var tCards = textoTemas.map(function (tema) {
        var entry = texto[tema.id];
        return '<div class="card"><h3>' + h.esc(tema.nombre) + '</h3><div class="card-body">' + (entry ? '<div class="quote tp-render">' + h.sanitize(entry) + '</div>' : '<span class="empty">Sin responder</span>') + '</div></div>';
      }).join('');
      lines.push('<div class="cards">' + tCards + '</div>');
    }

    var bodyHtml = lines.join('\n');
    var html = '<!DOCTYPE html>\n<html lang="es">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width,initial-scale=1.0">\n<title>Mis respuestas \u2014 Conclave</title>\n<style>\n*,*::before,*::after{box-sizing:border-box}\nbody{font-family:\'Segoe UI\',system-ui,-apple-system,sans-serif;max-width:800px;margin:0 auto;padding:40px 24px;color:#1a1a1a;background:#fff;line-height:1.6;-webkit-font-smoothing:antialiased}\nh1{font-size:24px;margin:0 0 2px}\n.meta{color:#666;font-size:14px;margin:0 0 32px}\nh2{font-size:18px;font-weight:700;margin:28px 0 12px;padding-bottom:6px;border-bottom:2px solid #e85d4a}\ntable{width:100%;border-collapse:collapse;margin-bottom:20px}\nth,td{text-align:left;padding:8px 12px;border-bottom:1px solid #e0e0e0}\nth{font-weight:700;text-transform:uppercase;font-size:11px;color:#888;letter-spacing:.04em}\n.cards{display:flex;flex-direction:column;gap:10px;margin-bottom:20px}\n.card{background:#f7f7f7;border-radius:10px;padding:14px 18px;break-inside:avoid}\n.card h3{margin:0 0 4px;font-size:15px;font-weight:700}\n.card-body{font-size:14px;color:#333}\n.empty{color:#aaa;font-style:italic;font-size:13px}\n.rank-list{list-style:none;padding:0;margin:6px 0 0}\n.rank-item{display:flex;align-items:center;gap:8px;padding:4px 0}\n.rank-pos{display:inline-flex;width:24px;height:24px;border-radius:50%;background:#e85d4a;color:#fff;align-items:center;justify-content:center;font-weight:700;font-size:11px;flex-shrink:0}\n.quote{background:#f0f0f0;padding:12px 16px;border-left:4px solid #e85d4a;border-radius:6px;margin:4px 0 0}\n.tp-render p{margin:0 0 6px}\n.tp-render p:last-child{margin:0}\n.tp-render ul,.tp-render ol{margin:4px 0;padding-left:1.5em}\n.tp-render li{margin-bottom:2px}\n@media print{body{margin:0;padding:16px}h2{break-after:avoid}}\n</style>\n</head>\n<body>\n<h1>' + h.esc(autor) + '</h1>\n<p class="meta">Generado el ' + h.esc(date) + '</p>\n' + bodyHtml + '\n</body>\n</html>';

    var iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:0';
    document.body.appendChild(iframe);
    var doc = iframe.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();
    setTimeout(function () {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      setTimeout(function () { document.body.removeChild(iframe); }, PRINT_DELAY_MS);
    }, PRINT_CLEANUP_MS);
  }

  // "Continue on another device" — wholesale replace of the working
  // respuestas (unlike RespuestasImportService.import, which ADDS a
  // comparison source; this REPLACES your own session). Also adopts the
  // file's autor into settings if you haven't set one yet, since the whole
  // point is picking up where you left off on a different device.
  importMine(data) {
    const r = data?.respuestas || {};
    const seleccion = r.seleccion && typeof r.seleccion === 'object' ? r.seleccion : {};
    const texto = r.texto && typeof r.texto === 'object' ? r.texto : {};
    const voto = r.voto && typeof r.voto === 'object' ? r.voto : {};
    const ranking = r.ranking && typeof r.ranking === 'object' ? r.ranking : {};
    slice.context.setState(CONTEXT, () => ({ seleccion, texto, voto, ranking }));
    if (data?.autor) {
      const settings = slice.getComponent('SettingsService');
      if (!settings.getState().autor) settings.setAutor(data.autor);
    }
  }
}
