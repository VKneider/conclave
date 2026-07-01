// Loads /data/equipos.json + /data/miembros.json once at boot and exposes
// synchronous lookups. No context: v1 has no in-app roster editing, so a
// reactive store isn't needed — Providers awaits load() before any view mounts.
const PALETTE = ['#6d8bff', '#3fb964', '#e2a13a', '#ff7eb6', '#8a6dff', '#42c8c0', '#e25c5c', '#b9c34a', '#f0883e', '#4ec9b0', '#c678dd', '#5aa0ff'];

export default class RosterService {
  constructor() {
    this._teams = [];
    this._members = [];
    this._teamById = {};
    this._memberById = {};
    this._colors = {};
    this._loaded = false;
  }

  async init() {
    await this.load();
  }

  async load() {
    if (this._loaded) return;
    const fetcher = await slice.build('FetchManager', { singleton: true });
    this._teams = await fetcher.request('GET', null, '/data/equipos.json');
    this._members = await fetcher.request('GET', null, '/data/miembros.json');
    this._teamById = Object.fromEntries(this._teams.map((t) => [t.id, t]));
    this._memberById = Object.fromEntries(this._members.map((m) => [String(m.id), m]));
    this.getAssignableTeams().forEach((t, i) => {
      this._colors[t.id] = PALETTE[i % PALETTE.length];
    });
    this._loaded = true;
  }

  getTeams() { return this._teams; }
  getAssignableTeams() { return this._teams.filter((t) => t.asignable); }
  getMembers() { return this._members; }
  getAssignableMembers() { return this._members.filter((m) => !m.fijo); }
  getTeamById(id) { return this._teamById[id]; }
  getMemberById(id) { return this._memberById[String(id)]; }
  colorFor(teamId) { return this._colors[teamId] || '#9aa1b1'; }

  countByTeam(asignaciones) {
    const counts = {};
    this.getAssignableTeams().forEach((t) => { counts[t.id] = 0; });
    Object.values(asignaciones || {}).forEach((tid) => {
      if (tid && counts[tid] !== undefined) counts[tid]++;
    });
    return counts;
  }

  statusOf(team, count) {
    if (count === 0) return 'empty';
    if (team.min != null && count < team.min) return 'under';
    if (team.max != null && count > team.max) return 'over';
    return 'ok';
  }

  // Excludes exceptMemberId (already counted) so re-dropping a member on their
  // own team never reads as "full".
  isFull(teamId, asignaciones, exceptMemberId) {
    const team = this._teamById[teamId];
    if (!team || team.max == null) return false;
    let n = 0;
    Object.keys(asignaciones || {}).forEach((mid) => {
      if (asignaciones[mid] === teamId && mid !== String(exceptMemberId)) n++;
    });
    return n >= team.max;
  }
}
