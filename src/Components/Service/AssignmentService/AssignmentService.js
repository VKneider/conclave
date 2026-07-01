import { ensureContext } from '/utils/context.js';

// Owns the `assignment` context: { [memberId]: teamId } — the user's own
// working assignment. Persisted to localStorage by the context (persist: true).
// User identity (autor) and org branding live in `settings` (SettingsService),
// not here.
const CONTEXT = 'assignment';
const STORAGE_KEY = 'conclave-assignment-v1';

export default class AssignmentService {
  init() {
    ensureContext(CONTEXT, {}, STORAGE_KEY);
  }

  getState() {
    ensureContext(CONTEXT, {}, STORAGE_KEY);
    return slice.context.getState(CONTEXT);
  }

  // Assigning past a team's max is ALLOWED on purpose: it's easier for
  // organizers to move or remove excess people afterward than to leave
  // members unassigned while they hunt for room. The team's "over" status
  // (RosterService.statusOf) becomes a persistent badge wherever it's shown
  // (Dashboard, Por equipo, Comparar's final tally) — that's the durable,
  // always-visible alert; this toast is just an immediate heads-up.
  assign(memberId, teamId) {
    ensureContext(CONTEXT, {}, STORAGE_KEY);
    const roster = slice.getComponent('RosterService');
    const team = roster.getTeamById(teamId);
    const wasFull = roster.isFull(teamId, this.getState(), memberId);
    slice.context.setState(CONTEXT, (prev) => ({ ...prev, [memberId]: teamId }));
    if (wasFull) {
      slice.events.emit('toast:show', { message: `«${team?.nombre || teamId}» quedó con exceso de personas`, type: 'warning' });
    }
  }

  unassign(memberId) {
    ensureContext(CONTEXT, {}, STORAGE_KEY);
    slice.context.setState(CONTEXT, (prev) => {
      const next = { ...prev };
      delete next[memberId];
      return next;
    });
  }

  reset() {
    ensureContext(CONTEXT, {}, STORAGE_KEY);
    slice.context.setState(CONTEXT, () => ({}));
  }

  // The caller (a view) is responsible for prompting for a name first (via
  // SettingsService.setAutor) when settings.autor is empty, before calling this.
  exportMine() {
    const asignaciones = this.getState();
    const autor = slice.getComponent('SettingsService').getState().autor;
    slice.getComponent('ExportService').downloadAsignaciones(autor, asignaciones);
  }
}
