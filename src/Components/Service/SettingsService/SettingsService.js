// Owns the `settings` context: { autor, nombreOrganizacion } — the user's own
// identity and the org/event branding shown in the topbar. Persisted.
const CONTEXT = 'settings';
const STORAGE_KEY = 'conclave-settings-v1';

export default class SettingsService {
  init() {
    this._ensureContext();
  }

  _ensureContext() {
    if (!slice.context.has(CONTEXT)) {
      slice.context.create(CONTEXT, { autor: '', nombreOrganizacion: '' }, { persist: true, storageKey: STORAGE_KEY });
    }
  }

  getState() {
    this._ensureContext();
    return slice.context.getState(CONTEXT);
  }

  setAutor(name) {
    this._ensureContext();
    slice.context.setState(CONTEXT, (prev) => ({ ...prev, autor: name || '' }));
  }

  setNombreOrganizacion(name) {
    this._ensureContext();
    slice.context.setState(CONTEXT, (prev) => ({ ...prev, nombreOrganizacion: name || '' }));
  }
}
