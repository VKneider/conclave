// Owns the `settings` context: { autor, nombreOrganizacion, lideres } — the
// user's own identity, org/event branding, and per-team leaders set via UI.
// Leaders set in the data file (equipos.json → RosterService.getLiderName)
// take precedence and are read-only.
const CONTEXT = 'settings';
const STORAGE_KEY = 'conclave-settings-v3';

export default class SettingsService {
  init() {
    this._ensureContext();
  }

  _ensureContext() {
    if (!slice.context.has(CONTEXT)) {
      slice.context.create(CONTEXT, { autor: '', nombreOrganizacion: '', lideres: {}, lideresEnabled: false }, { persist: true, storageKey: STORAGE_KEY });
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

  getLider(teamId) {
    const state = this.getState();
    return state.lideres?.[teamId] || null;
  }

  setLider(teamId, memberId) {
    this._ensureContext();
    slice.context.setState(CONTEXT, (prev) => ({
      ...prev,
      lideres: { ...prev.lideres, [teamId]: memberId },
    }));
  }

  clearLider(teamId) {
    this._ensureContext();
    slice.context.setState(CONTEXT, (prev) => {
      const lideres = { ...prev.lideres };
      delete lideres[teamId];
      return { ...prev, lideres };
    });
  }

  isLideresEnabled() {
    return this.getState().lideresEnabled === true;
  }

  setLideresEnabled(enabled) {
    this._ensureContext();
    slice.context.setState(CONTEXT, (prev) => ({ ...prev, lideresEnabled: enabled === true }));
  }

  getEffectiveLider(teamId) {
    if (!this.isLideresEnabled()) return null;
    const roster = slice.getComponent('RosterService');
    const locked = roster.isLiderLocked(teamId);
    if (locked) {
      const name = roster.getLiderName(teamId);
      return { member: roster.resolveMemberByName(name), locked: true };
    }
    const memberId = this.getLider(teamId);
    if (memberId) return { member: roster.getMemberById(memberId), locked: false };
    return null;
  }
}
