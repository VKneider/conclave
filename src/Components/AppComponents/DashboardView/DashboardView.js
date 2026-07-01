import { esc } from '/utils/format.js';
import { buildEach } from '/utils/sliceBuild.js';

export default class DashboardView extends HTMLElement {
  constructor(props) {
    super();
    slice.attachTemplate(this);
    this.$root = this.querySelector('.dashboard-view');
    slice.controller.setComponentProps(this, props);
  }

  async init() {
    this._roster = slice.getComponent('RosterService');
    await this._buildShell();
    this._refresh();
    // MultiRoute's update()-on-revisit only fires on navigation — it does NOT
    // catch a mutation that happens while THIS view is already the one on
    // screen (e.g. the footer's "Reiniciar" button, which is reachable
    // regardless of which view is active). Watch the context directly so an
    // external mutation still repaints without requiring a round-trip nav.
    slice.context.watch('assignment', this, () => this._refresh());
  }

  // Called by MultiRoute on cached revisit — the shell already exists, only
  // the numbers need refreshing.
  update() {
    this._refresh();
  }

  // StatusBadge instances are built with slice.build after init(), so the
  // parent-destroy cascade won't find them — clean up explicitly.
  beforeDestroy() {
    slice.controller.destroyByContainer(this.$root);
    if (this._teamModal) this._teamModal.remove();
  }

  // Builds the static structure + one StatusBadge per team, once. Later
  // refreshes only touch cached element refs / call setComponentProps —
  // never re-template or rebuild the badges.
  async _buildShell() {
    const roster = this._roster;
    const teams = roster.getAssignableTeams();

    let html = `
      <h2 class="view-title">Dashboard</h2>
      <p class="view-sub" data-el="sub"></p>
      <div class="stat-grid">
        <div class="stat-card"><div class="k">Miembros</div><div class="v" data-el="total"></div></div>
        <div class="stat-card"><div class="k">Asignados</div><div class="v" data-el="assigned"></div></div>
        <div class="stat-card"><div class="k">Equipos en rango</div><div class="v" data-el="enRango"></div></div>
        <div class="stat-card"><div class="k">Fuera de rango</div><div class="v" data-el="conProblema"></div></div>
      </div>
      <h3 class="view-title" style="font-size:16px">Equipos</h3>
      <p class="view-sub">Cada barra muestra los asignados frente al mínimo y máximo recomendado.</p>
      <div class="team-grid">`;

    teams.forEach((t) => {
      const col = roster.colorFor(t.id);
      html += `
        <div class="team-card" data-team-id="${t.id}" style="--team-color:${col}">
          <div class="team-head">
            <h3><span class="color-dot" style="background:${col}"></span>${esc(t.nombre)}</h3>
            <div class="team-count" style="color:${col}"><span data-el="n-${t.id}"></span><small>/${t.max != null ? t.max : '–'}</small></div>
          </div>
          <div class="team-meta">Mín ${t.min != null ? t.min : '–'} · Máx ${t.max != null ? t.max : '–'} · Cap ${t.capacidad != null ? t.capacidad : '–'}</div>
          <div class="bar"><span data-el="bar-${t.id}" style="background:${col}"></span></div>
          <div class="badge-slot" data-badge="${t.id}"></div>
        </div>`;
    });
    html += `</div>`;
    this.$root.innerHTML = html;

    this._els = {
      sub: this.$root.querySelector('[data-el="sub"]'),
      total: this.$root.querySelector('[data-el="total"]'),
      assigned: this.$root.querySelector('[data-el="assigned"]'),
      enRango: this.$root.querySelector('[data-el="enRango"]'),
      conProblema: this.$root.querySelector('[data-el="conProblema"]'),
    };

    this._teamEls = {};
    teams.forEach((t) => {
      this._teamEls[t.id] = {
        n: this.$root.querySelector(`[data-el="n-${t.id}"]`),
        bar: this.$root.querySelector(`[data-el="bar-${t.id}"]`),
      };
    });

    const badgeNodes = await buildEach('StatusBadge', teams.map((t) => ({ sliceId: `dash-badge-${t.id}`, status: 'empty', label: '' })));
    this._badges = {};
    teams.forEach((t, i) => {
      this._badges[t.id] = badgeNodes[i];
      this.$root.querySelector(`[data-badge="${t.id}"]`).appendChild(badgeNodes[i]);
    });

    this.$root.querySelector('.team-grid').addEventListener('click', (e) => {
      const card = e.target.closest('.team-card');
      if (!card) return;
      this._openTeamModal(card.dataset.teamId);
    });
  }

  _refresh() {
    const roster = this._roster;
    const teams = roster.getAssignableTeams();
    const asignaciones = slice.getComponent('AssignmentService').getState();
    const counts = roster.countByTeam(asignaciones);
    const totalMembers = roster.getAssignableMembers().length;
    const assigned = roster.getAssignableMembers().filter((m) => asignaciones[m.id]).length;
    const enRango = teams.filter((t) => roster.statusOf(t, counts[t.id]) === 'ok').length;
    const conProblema = teams.filter((t) => ['under', 'over'].includes(roster.statusOf(t, counts[t.id]))).length;
    const autor = slice.getComponent('SettingsService').getState().autor;

    this._els.sub.textContent = `Resumen de tus asignaciones${autor ? ' — ' + autor : ''}.`;
    this._els.total.textContent = totalMembers;
    this._els.assigned.innerHTML = `${assigned} <small>/ ${totalMembers}</small>`;
    this._els.enRango.innerHTML = `${enRango} <small>/ ${teams.length}</small>`;
    this._els.conProblema.textContent = conProblema;

    teams.forEach((t) => {
      const n = counts[t.id];
      const st = roster.statusOf(t, n);
      const denom = t.max || t.capacidad || Math.max(n, 1);
      const pct = Math.min(100, Math.round((n / denom) * 100));
      const label = { ok: 'En rango', under: `Faltan ${t.min - n}`, over: `Sobran ${n - t.max}`, empty: 'Vacío' }[st];

      this._teamEls[t.id].n.textContent = n;
      this._teamEls[t.id].bar.style.width = `${pct}%`;
      slice.setComponentProps(this._badges[t.id], { status: st, label });
    });
  }

  async _openTeamModal(teamId) {
    const roster = this._roster;
    const team = roster.getAssignableTeams().find((t) => t.id === teamId);
    if (!team) return;

    const asignaciones = slice.getComponent('AssignmentService').getState();
    const members = roster.getAssignableMembers().filter((m) => asignaciones[m.id] === teamId);

    if (!this._teamModal) {
      this._teamModal = await slice.build('Modal', {
        sliceId: 'team-members-modal',
        dismissable: true,
      });
      this._teamModal.classList.add('team-members-modal');
      this._teamMemberList = document.createElement('div');
      this._teamMemberList.className = 'team-member-list';
      this._teamModal.appendBody(this._teamMemberList);
      document.body.appendChild(this._teamModal);
    }

    this._teamModal.title = team.nombre;
    this._teamMemberList.innerHTML = members.length
      ? members.map((m) => `
        <div class="team-member-item">
          <span class="sx ${m.sexo || ''}"></span>
          <span class="nm">${esc(m.nombre)}</span>
        </div>
      `).join('')
      : '<div class="empty-state">Sin miembros asignados</div>';

    this._teamModal.open = true;
  }
}

customElements.define('slice-dashboardview', DashboardView);
