const STORAGE_KEY = 'conclave-imported-sources-v1';

// Validates and persists imported comparison sources. No context — views
// call getSources() directly after mutations, matching RosterService's
// in-memory-cache pattern (no reactivity needed for batch imports).
export default class ImportService {
  constructor() {
    this._sources = [];
  }

  init() {
    this._load();
  }

  _load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) { this._sources = []; return; }
      const roster = slice.getComponent('RosterService');
      this._sources = JSON.parse(raw).map((src) => ({
        ...src,
        asignaciones: Object.fromEntries(
          Object.entries(src.asignaciones).filter(([memberId, teamId]) =>
            roster.getMemberById(memberId) && roster.getTeamById(teamId)
          )
        ),
      })).filter((src) => Object.keys(src.asignaciones).length > 0);
    } catch { this._sources = []; }
  }

  _save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this._sources)); } catch {}
  }

  getSources() {
    return this._sources;
  }

  isDuplicate(data) {
    const autor = data?.autor || '';
    const asignaciones = data?.asignaciones || {};
    return this._sources.some(
      (s) => s.autor === autor && JSON.stringify(s.asignaciones) === JSON.stringify(asignaciones)
    );
  }

  import(data, filename) {
    const autorBase = data?.autor ? String(data.autor) : filename.replace(/\.json$/i, '');
    const asignaciones = data?.asignaciones || {};
    const roster = slice.getComponent('RosterService');
    const norm = {};
    let recognized = 0;
    let memberIgnored = 0;
    let teamIgnored = 0;
    Object.keys(asignaciones).forEach((k) => {
      const teamId = asignaciones[k];
      if (!teamId) { teamIgnored++; return; }
      if (!roster.getMemberById(k)) { memberIgnored++; return; }
      if (!roster.getTeamById(teamId)) { teamIgnored++; return; }
      norm[k] = teamId;
      recognized++;
    });
    let autor = autorBase;
    let n = 2;
    while (this._sources.some((s) => s.autor === autor)) autor = `${autorBase} (${n++})`;
    this._sources.push({ autor, asignaciones: norm });
    this._save();
    return { recognized, memberIgnored, teamIgnored };
  }

  remove(autor) {
    this._sources = this._sources.filter((s) => s.autor !== autor);
    this._save();
  }

  removeOrphaned(removedMemberIds, removedTeamIds) {
    const mSet = new Set(removedMemberIds);
    const tSet = new Set(removedTeamIds);
    let changed = false;
    this._sources = this._sources.map((src) => {
      const filtered = {};
      let srcChanged = false;
      Object.entries(src.asignaciones || {}).forEach(([mid, tid]) => {
        if (mSet.has(mid) || tSet.has(tid)) { srcChanged = true; return; }
        filtered[mid] = tid;
      });
      if (!srcChanged) return src;
      changed = true;
      return { ...src, asignaciones: filtered };
    }).filter((src) => Object.keys(src.asignaciones || {}).length > 0);
    if (changed) this._save();
    return changed;
  }
}
