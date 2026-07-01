import { SEED_TEAMS, SEED_MEMBERS } from '/data/seedData.js';

const PALETTE = ['#6d8bff', '#3fb964', '#e2a13a', '#ff7eb6', '#8a6dff', '#42c8c0', '#e25c5c', '#b9c34a', '#f0883e', '#4ec9b0', '#c678dd', '#5aa0ff'];
const TEAMS_KEY = 'conclave-teams-v1';
const MEMBERS_KEY = 'conclave-members-v1';

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
    this._loadFromStorage();
  }

  _loadFromStorage() {
    let teams, members;
    try {
      const t = localStorage.getItem(TEAMS_KEY);
      const m = localStorage.getItem(MEMBERS_KEY);
      teams = t ? JSON.parse(t) : null;
      members = m ? JSON.parse(m) : null;
    } catch { teams = null; members = null; }
    if (!teams || !members || !teams.length || !members.length) {
      teams = SEED_TEAMS;
      members = SEED_MEMBERS;
      this._saveToStorage();
    }
    this._rebuild(teams, members);
  }

  _saveToStorage() {
    try {
      localStorage.setItem(TEAMS_KEY, JSON.stringify(this._teams));
      localStorage.setItem(MEMBERS_KEY, JSON.stringify(this._members));
    } catch {}
  }

  _rebuild(teams, members) {
    this._teams = teams;
    this._members = members;
    this._teamById = Object.fromEntries(this._teams.map((t) => [t.id, t]));
    this._memberById = Object.fromEntries(this._members.map((m) => [String(m.id), m]));
    this._colors = {};
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

  getLiderName(teamId) {
    const team = this._teamById[teamId];
    return team?.lider || null;
  }

  isLiderLocked(teamId) {
    return !!this.getLiderName(teamId);
  }

  resolveMemberByName(name) {
    if (!name) return null;
    return this._members.find((m) => m.nombre === name) || null;
  }

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

  statusLabel(team, count) {
    const st = this.statusOf(team, count);
    const labels = {
      ok: 'En rango',
      under: `Faltan ${team.min - count}`,
      over: `Sobran ${count - team.max}`,
      empty: 'Vacío',
    };
    return labels[st] || '';
  }

  isFull(teamId, asignaciones, exceptMemberId) {
    const team = this._teamById[teamId];
    if (!team || team.max == null) return false;
    let n = 0;
    Object.keys(asignaciones || {}).forEach((mid) => {
      if (asignaciones[mid] === teamId && mid !== String(exceptMemberId)) n++;
    });
    return n >= team.max;
  }

  // When replacing the entire dataset, clean up any assignments or resolutions
  // that reference now-deleted members or teams. Also cleans imported sources.
  loadFromData(teams, members) {
    const oldTeamIds = new Set(this._teams.map((t) => t.id));
    const oldMemberIds = new Set(this._members.map((m) => String(m.id)));

    this._rebuild(teams, members);

    const newTeamIds = new Set(teams.map((t) => t.id));
    const newMemberIds = new Set(members.map((m) => String(m.id)));

    const removedTeamIds = [...oldTeamIds].filter((id) => !newTeamIds.has(id));
    const removedMemberIds = [...oldMemberIds].filter((id) => !newMemberIds.has(id));

    if (removedTeamIds.length || removedMemberIds.length) {
      this._cleanupOrphaned(removedTeamIds, removedMemberIds);
    }

    this._saveToStorage();
    slice.events.emit('roster:changed');
  }

  resetToSeed() {
    const oldTeamIds = new Set(this._teams.map((t) => t.id));
    const oldMemberIds = new Set(this._members.map((m) => String(m.id)));
    const seedTeamIds = new Set(SEED_TEAMS.map((t) => t.id));
    const seedMemberIds = new Set(SEED_MEMBERS.map((m) => String(m.id)));

    this._rebuild(SEED_TEAMS, SEED_MEMBERS);

    const removedTeamIds = [...oldTeamIds].filter((id) => !seedTeamIds.has(id));
    const removedMemberIds = [...oldMemberIds].filter((id) => !seedMemberIds.has(id));

    if (removedTeamIds.length || removedMemberIds.length) {
      this._cleanupOrphaned(removedTeamIds, removedMemberIds);
    }

    this._saveToStorage();
    slice.events.emit('roster:changed');
  }

  _cleanupOrphaned(removedTeamIds, removedMemberIds) {
    const rmvTeams = new Set(removedTeamIds);
    const rmvMembers = new Set(removedMemberIds);

    const clean = (state) => {
      if (!state || !Object.keys(state).length) return state;
      const next = {};
      let changed = false;
      Object.entries(state).forEach(([memberId, teamId]) => {
        if (rmvMembers.has(memberId) || rmvTeams.has(teamId)) {
          changed = true;
          return;
        }
        next[memberId] = teamId;
      });
      return changed ? next : state;
    };

    const asgn = slice.getComponent('AssignmentService');
    const asgnState = asgn.getState();
    const asgnCleaned = clean(asgnState);
    if (asgnCleaned !== asgnState) {
      slice.context.setState('assignment', () => asgnCleaned);
    }

    const res = slice.getComponent('ResolutionService');
    if (res && res.getState) {
      const resState = res.getState();
      const resCleaned = clean(resState);
      if (resCleaned !== resState) {
        slice.context.setState('resolutions', () => resCleaned);
      }
    }

    // Clean settings lideres — remove leader assignments for deleted members
    const settings = slice.getComponent('SettingsService');
    const settingsState = settings.getState();
    if (settingsState.lideres && Object.keys(settingsState.lideres).length) {
      const lideres = { ...settingsState.lideres };
      let liderChanged = false;
      Object.entries(lideres).forEach(([teamId, memberId]) => {
        if (rmvMembers.has(memberId) || rmvTeams.has(teamId)) { delete lideres[teamId]; liderChanged = true; }
      });
      if (liderChanged) {
        slice.context.setState('settings', (prev) => ({ ...prev, lideres }));
      }
    }

    // Clean imported comparison sources — remove orphaned references
    const imp = slice.getComponent('ImportService');
    if (imp && imp.removeOrphaned) {
      imp.removeOrphaned(removedMemberIds, removedTeamIds);
    }
  }

  nextTeamId() {
    return Math.max(0, ...this._teams.map((t) => {
      const n = parseInt(t.numero, 10);
      return isNaN(n) ? 0 : n;
    })) + 1;
  }

  nextMemberId() {
    return Math.max(0, ...this._members.map((m) => m.id), ...Object.keys(this._memberById).map(Number)) + 1;
  }

  updateTeam(teamId, changes) {
    const team = this._teamById[teamId];
    if (!team) return;
    Object.assign(team, changes);
    this._teamById[teamId] = team;
    this._saveToStorage();
    slice.events.emit('roster:changed');
  }

  updateMember(memberId, changes) {
    const member = this._memberById[String(memberId)];
    if (!member) return;
    Object.assign(member, changes);
    this._memberById[String(memberId)] = member;
    this._saveToStorage();
    slice.events.emit('roster:changed');
  }

  addMember(member) {
    const m = { id: this.nextMemberId(), nombre: '', sexo: '', edad: null, fijo: false, rolFijo: null, ...member };
    this._members.push(m);
    this._memberById[String(m.id)] = m;
    this._saveToStorage();
    slice.events.emit('roster:changed');
    return m;
  }

  removeMember(memberId) {
    const id = String(memberId);
    const idx = this._members.findIndex((m) => String(m.id) === id);
    if (idx === -1) return;
    this._members.splice(idx, 1);
    delete this._memberById[id];
    this._saveToStorage();
    this._cleanupOrphaned([], [id]);
    slice.events.emit('roster:changed');
  }
}
