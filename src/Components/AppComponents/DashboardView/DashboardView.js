import { esc } from '/utils/format.js';

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
    slice.context.watch('settings', this, () => this._refresh());
    slice.events.subscribe('roster:changed', () => this._refresh());
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
        <div class="stat-card"><div class="k"><span class="gender-dot M"></span> Hombres</div><div class="v" data-el="hombres"></div></div>
        <div class="stat-card"><div class="k"><span class="gender-dot F"></span> Mujeres</div><div class="v" data-el="mujeres"></div></div>
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
          <div class="team-lider" data-el="lider-${t.id}"></div>
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
      hombres: this.$root.querySelector('[data-el="hombres"]'),
      mujeres: this.$root.querySelector('[data-el="mujeres"]'),
      enRango: this.$root.querySelector('[data-el="enRango"]'),
      conProblema: this.$root.querySelector('[data-el="conProblema"]'),
    };

    this._teamEls = {};
    teams.forEach((t) => {
      this._teamEls[t.id] = {
        n: this.$root.querySelector(`[data-el="n-${t.id}"]`),
        bar: this.$root.querySelector(`[data-el="bar-${t.id}"]`),
        lider: this.$root.querySelector(`[data-el="lider-${t.id}"]`),
      };
    });

    const badgeProps = teams.map((t) => ({ sliceId: `dash-badge-${t.id}`, status: 'empty', label: '' }));
    const [first, ...rest] = badgeProps;
    const firstBadge = await slice.build('StatusBadge', first);
    const restBadges = await Promise.all(rest.map((p) => slice.build('StatusBadge', p)));
    const badgeNodes = [firstBadge, ...restBadges];
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
    const members = roster.getAssignableMembers();
    const totalMembers = members.length;
    const assigned = members.filter((m) => asignaciones[m.id]).length;
    const enRango = teams.filter((t) => roster.statusOf(t, counts[t.id]) === 'ok').length;
    const conProblema = teams.filter((t) => ['under', 'over'].includes(roster.statusOf(t, counts[t.id]))).length;
    const autor = slice.getComponent('SettingsService').getState().autor;

    this._els.sub.textContent = `Resumen de tus asignaciones${autor ? ' — ' + autor : ''}.`;
    const hombres = members.filter((m) => m.sexo === 'M').length;
    const mujeres = members.filter((m) => m.sexo === 'F').length;

    this._els.total.textContent = totalMembers;
    this._els.assigned.innerHTML = `${assigned} <small>/ ${totalMembers}</small>`;
    this._els.hombres.textContent = hombres;
    this._els.mujeres.textContent = mujeres;
    this._els.enRango.innerHTML = `${enRango} <small>/ ${teams.length}</small>`;
    this._els.conProblema.textContent = conProblema;

    teams.forEach((t) => {
      const n = counts[t.id];
      const st = roster.statusOf(t, n);
      const denom = t.max || t.capacidad || Math.max(n, 1);
      const pct = Math.min(100, Math.round((n / denom) * 100));
      const label = roster.statusLabel(t, n);

      this._teamEls[t.id].n.textContent = n;
      this._teamEls[t.id].bar.style.width = `${pct}%`;
      slice.setComponentProps(this._badges[t.id], { status: st, label });

      const lider = slice.getComponent('SettingsService').getEffectiveLider(t.id);
      this._teamEls[t.id].lider.textContent = lider && lider.member ? `👑 ${lider.member.nombre}` : '';
    });
  }

  async _openTeamModal(teamId) {
    const roster = this._roster;
    const team = roster.getAssignableTeams().find((t) => t.id === teamId);
    if (!team) return;

    const asignaciones = slice.getComponent('AssignmentService').getState();
    const members = roster.getAssignableMembers().filter((m) => asignaciones[m.id] === teamId);

    const lider = slice.getComponent('SettingsService').getEffectiveLider(teamId);
    const liderId = lider?.member ? String(lider.member.id) : null;

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

    this._teamModal.title = `${team.nombre} ${lider ? '👑' : ''}`;
    this._teamMemberList.innerHTML = members.length
      ? members.map((m) => `
        <div class="team-member-item${liderId === String(m.id) ? ' is-lider' : ''}">
          <span class="sx ${m.sexo || ''}"></span>
          <span class="nm">${esc(m.nombre)}</span>
          ${liderId === String(m.id) ? '<span class="lider-badge">Líder</span>' : ''}
        </div>
      `).join('')
      : '<div class="empty-state">Sin miembros asignados</div>';

    this._teamModal.open = true;
  }
}

customElements.define('slice-dashboardview', DashboardView);
