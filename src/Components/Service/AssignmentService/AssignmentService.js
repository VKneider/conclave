// Owns the `assignment` context: { [memberId]: teamId } — the user's own
// working assignment. Persisted to localStorage by the context (persist: true).
// User identity (autor) and org branding live in `settings` (SettingsService),
// not here.
const CONTEXT = 'assignment';
const STORAGE_KEY = 'conclave-assignment-v1';

export default class AssignmentService {
  init() {
    this._ensureContext();
  }

  _ensureContext() {
    if (!slice.context.has(CONTEXT)) {
      slice.context.create(CONTEXT, {}, { persist: true, storageKey: STORAGE_KEY });
    }
  }

  _roster() {
    return slice.getComponent('RosterService');
  }

  getState() {
    this._ensureContext();
    return slice.context.getState(CONTEXT);
  }

  // Assigning past a team's max is ALLOWED on purpose: it's easier for
  // organizers to move or remove excess people afterward than to leave
  // members unassigned while they hunt for room. The team's "over" status
  // (RosterService.statusOf) becomes a persistent badge wherever it's shown
  // (Dashboard, Por equipo, Comparar's final tally) — that's the durable,
  // always-visible alert; this toast is just an immediate heads-up.
  assign(memberId, teamId) {
    this._ensureContext();
    const roster = this._roster();
    const team = roster.getTeamById(teamId);
    const wasFull = roster.isFull(teamId, this.getState(), memberId);
    slice.context.setState(CONTEXT, (prev) => ({ ...prev, [memberId]: teamId }));
    if (wasFull) {
      slice.events.emit('toast:show', { message: `«${team?.nombre || teamId}» quedó con exceso de personas`, type: 'warning' });
    }
  }

  unassign(memberId) {
    this._ensureContext();
    slice.context.setState(CONTEXT, (prev) => {
      const next = { ...prev };
      delete next[memberId];
      return next;
    });
  }

  reset() {
    this._ensureContext();
    slice.context.setState(CONTEXT, () => ({}));
  }

  // The caller (a view) is responsible for prompting for a name first (via
  // SettingsService.setAutor) when settings.autor is empty, before calling this.
  exportMine() {
    const asignaciones = this.getState();
    const autor = slice.getComponent('SettingsService').getState().autor;
    const payload = {
      app: 'conclave',
      version: 1,
      autor: autor || 'Anónimo',
      fecha: new Date().toISOString(),
      asignaciones,
    };
    const safe = (autor || 'anonimo').replace(/[^a-z0-9]+/gi, '_').toLowerCase();
    slice.getComponent('FileDownloadService').download(
      `asignaciones_${safe}.json`,
      JSON.stringify(payload, null, 2),
      'application/json'
    );
  }
}
