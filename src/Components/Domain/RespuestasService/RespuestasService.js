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
const STORAGE_KEY = 'conclave-respuestas-v1';
// seleccion: reparto (pool → temas). texto: texto_libre answers. voto:
// votacion (one opción per tema). ranking: ordered opciones per tema. Returning
// users predate voto/ranking (GOTCHAS §20) — every read/write defaults them, so
// no migration is needed here.
const INITIAL_STATE = { seleccion: {}, texto: {}, voto: {}, ranking: {} };

export default class RespuestasService {
  init() {
    slice.getComponent('StoreService').ensure(CONTEXT, INITIAL_STATE, STORAGE_KEY);
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
  getShareLink(autor) {
    const respuestas = this.getState();
    const email = slice.getComponent('SettingsService').getEmail();
    const packed = slice.getComponent('CompressionService').packForURI({ tipo: 'respuestas', autor: autor || '', email, respuestas });
    const compressed = slice.getComponent('CompressionService').compressToURI(packed);
    return `${window.location.origin}${window.location.pathname}#respuestas=${compressed}`;
  }

  // Copies the share URL to clipboard, prompting for name if missing.
  copyShareLink() {
    const settings = slice.getComponent('SettingsService');
    const autor = settings.getState().autor?.trim();

    const doCopy = (name) => {
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

  // Opens the default email client with the share link, pre-filled to the
  // Plantilla's configured email (if any).
  sendShareLinkEmail() {
    const settings = slice.getComponent('SettingsService');
    const autor = settings.getState().autor?.trim();

    const doSend = (name) => {
      const url = this.getShareLink(name);
      const plantilla = slice.getComponent('PlantillaService');
      const plantillaNombre = plantilla.getNombre() || 'Conclave';
      const subject = encodeURIComponent(`Mis respuestas — ${plantillaNombre}`);
      const body = encodeURIComponent(
        `Hola,\n\n${name} ha compartido sus respuestas para "${plantillaNombre}":\n${url}\n\nSaludos`
      );
      window.location.href = `mailto:?subject=${subject}&body=${body}`;
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
