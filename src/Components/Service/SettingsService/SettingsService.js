import { ensureContext } from '../../../utils/context.js';

// Owns the `settings` context: { autor, lideres, lideresEnabled, sexoEnabled,
// edadEnabled } — the user's own personal identity and per-Plantilla display
// toggles. The Plantilla's own name lives in PlantillaService.getNombre()/
// setNombre() now (it's a property of the Plantilla, not a personal
// per-device setting). Leaders set in the Plantilla itself
// (PlantillaService.getLiderName, meta.lider) take precedence and are
// read-only.
//
// sexoEnabled/edadEnabled default to true (existing Opción demographic
// fields stay visible unless explicitly turned off) — the inverse default
// of lideresEnabled, which is a newer opt-in feature. Turning either off
// only hides it from the UI (PlantillaBuilderView's OpcionRow fields, and
// every downstream display: DashboardView, PorCategoriaView,
// MisRespuestasView, CompareCarousel) — it never deletes the underlying
// meta.sexo/meta.edad data, so re-enabling shows it again unchanged.
const CONTEXT = 'settings';
const STORAGE_KEY = 'conclave-settings-v3';
const INITIAL_STATE = { autor: '', lideres: {}, lideresEnabled: false, sexoEnabled: true, edadEnabled: true };

export default class SettingsService {
  init() {
    ensureContext(CONTEXT, INITIAL_STATE, STORAGE_KEY);
  }

  getState() {
    ensureContext(CONTEXT, INITIAL_STATE, STORAGE_KEY);
    return slice.context.getState(CONTEXT);
  }

  setAutor(name) {
    ensureContext(CONTEXT, INITIAL_STATE, STORAGE_KEY);
    slice.context.setState(CONTEXT, (prev) => ({ ...prev, autor: name || '' }));
  }

  getLider(teamId) {
    const state = this.getState();
    return state.lideres?.[teamId] || null;
  }

  setLider(teamId, memberId) {
    ensureContext(CONTEXT, INITIAL_STATE, STORAGE_KEY);
    slice.context.setState(CONTEXT, (prev) => ({
      ...prev,
      lideres: { ...prev.lideres, [teamId]: memberId },
    }));
  }

  clearLider(teamId) {
    ensureContext(CONTEXT, INITIAL_STATE, STORAGE_KEY);
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
    ensureContext(CONTEXT, INITIAL_STATE, STORAGE_KEY);
    slice.context.setState(CONTEXT, (prev) => ({ ...prev, lideresEnabled: enabled === true }));
  }

  isSexoEnabled() {
    return this.getState().sexoEnabled !== false;
  }

  setSexoEnabled(enabled) {
    ensureContext(CONTEXT, INITIAL_STATE, STORAGE_KEY);
    slice.context.setState(CONTEXT, (prev) => ({ ...prev, sexoEnabled: enabled === true }));
  }

  isEdadEnabled() {
    return this.getState().edadEnabled !== false;
  }

  setEdadEnabled(enabled) {
    ensureContext(CONTEXT, INITIAL_STATE, STORAGE_KEY);
    slice.context.setState(CONTEXT, (prev) => ({ ...prev, edadEnabled: enabled === true }));
  }

  getEffectiveLider(teamId) {
    if (!this.isLideresEnabled()) return null;
    const plantilla = slice.getComponent('PlantillaService');
    const locked = plantilla.isLiderLocked(teamId);
    if (locked) {
      const name = plantilla.getLiderName(teamId);
      return { member: plantilla.resolveOpcionByName(name), locked: true };
    }
    const memberId = this.getLider(teamId);
    if (memberId) return { member: plantilla.getOpcionById(memberId), locked: false };
    return null;
  }
}
