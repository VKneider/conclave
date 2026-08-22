// Owns the `settings` context: { autor, lideres, lideresEnabled } — the user's
// own personal identity + the líder (responsable) toggle. The Plantilla's name
// lives in PlantillaService; per-Opción fields are now dynamic Plantilla
// `atributos` (Fase 3), not settings toggles — the old sexoEnabled/edadEnabled
// are gone.
//
// Context is created ONCE in init() via StoreService.ensure() — boot order
// guarantees init runs before any consumer, so no per-method defensive ensure.
const CONTEXT = 'settings';
const STORAGE_KEY = 'conclave-settings-v3';
const INITIAL_STATE = { autor: '', email: '', lideres: {}, lideresEnabled: false, soundEnabled: true, bienvenidaOculta: '' };

export default class SettingsService {
  init() {
    slice.getComponent('StoreService').ensure(CONTEXT, INITIAL_STATE, STORAGE_KEY);
  }

  getState() {
    return slice.context.getState(CONTEXT);
  }

  setAutor(name) {
    slice.context.setState(CONTEXT, (prev) => ({ ...prev, autor: name || '' }));
  }

  getEmail() { return this.getState().email || ''; }
  setEmail(email) {
    slice.context.setState(CONTEXT, (prev) => ({ ...prev, email: email || '' }));
  }

  getLider(temaId) {
    const state = this.getState();
    return state.lideres?.[temaId] || null;
  }

  setLider(temaId, opcionId) {
    slice.context.setState(CONTEXT, (prev) => ({
      ...prev,
      lideres: { ...prev.lideres, [temaId]: opcionId },
    }));
  }

  clearLider(temaId) {
    slice.context.setState(CONTEXT, (prev) => {
      const lideres = { ...prev.lideres };
      delete lideres[temaId];
      return { ...prev, lideres };
    });
  }

  isLideresEnabled() {
    return this.getState().lideresEnabled === true;
  }

  setLideresEnabled(enabled) {
    slice.context.setState(CONTEXT, (prev) => ({ ...prev, lideresEnabled: enabled === true }));
  }

  getEffectiveLider(temaId) {
    if (!this.isLideresEnabled()) return null;
    const plantilla = slice.getComponent('PlantillaService');
    const locked = plantilla.isLiderLocked(temaId);
    if (locked) {
      const name = plantilla.getLiderName(temaId);
      return { opcion: plantilla.resolveOpcionByName(name), locked: true };
    }
    const opcionId = this.getLider(temaId);
    if (opcionId) return { opcion: plantilla.getOpcionById(opcionId), locked: false };
    return null;
  }

  // ── Ocultar el mensaje de bienvenida ────────────────────────
  // Es una preferencia del DISPOSITIVO, no de la Plantilla: quien la comparte
  // no decide por el resto, y si la Plantilla llevara el "oculto" adentro se
  // propagaría a todo el grupo.
  //
  // Se guarda la huella del mensaje ocultado, no un booleano: así, cuando
  // llega una Plantilla nueva con OTRO mensaje, la huella deja de coincidir y
  // vuelve a mostrarse. Con un booleano, ocultar una vez silenciaría para
  // siempre todos los mensajes futuros.
  isBienvenidaOculta(mensaje) {
    const huella = this._huella(mensaje);
    return !!huella && this.getState().bienvenidaOculta === huella;
  }

  ocultarBienvenida(mensaje) {
    const bienvenidaOculta = this._huella(mensaje);
    slice.context.setState(CONTEXT, (prev) => ({ ...prev, bienvenidaOculta }));
  }

  // Hash barato y estable del contenido (mismo esquema que
  // PlantillaService.colorFor). No necesita ser criptográfico: sólo distinguir
  // "es el mismo mensaje que oculté" de "es otro". Se le antepone el largo
  // para abaratar el caso distinto y hacer una colisión aún menos probable.
  _huella(mensaje) {
    const texto = (mensaje || '').trim();
    if (!texto) return '';
    let hash = 0;
    for (let i = 0; i < texto.length; i++) hash = (hash * 31 + texto.charCodeAt(i)) >>> 0;
    return `${texto.length}-${hash.toString(36)}`;
  }

  isSoundEnabled() {
    return this.getState().soundEnabled !== false;
  }

  setSoundEnabled(enabled) {
    slice.context.setState(CONTEXT, (prev) => ({ ...prev, soundEnabled: enabled === true }));
  }
}
