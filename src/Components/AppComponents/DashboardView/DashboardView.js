export default class DashboardView extends HTMLElement {
  constructor(props) {
    super();
    slice.attachTemplate(this);
    this.$root = this.querySelector('.dashboard-view');
    slice.controller.setComponentProps(this, props);
  }

  async init() {
    this._roster = slice.getComponent('PlantillaService');
    this._esc = slice.getComponent('FormatService').esc;
    this._sanitize = slice.getComponent('SanitizeService').sanitize.bind(slice.getComponent('SanitizeService'));
    this._charts = slice.getComponent('ChartService');
    await this._buildShell();
    this._refresh();
    // MultiRoute's update()-on-revisit only fires on navigation — it does NOT
    // catch a mutation that happens while THIS view is already the one on
    // screen (e.g. the footer's "Reiniciar" button, which is reachable
    // regardless of which view is active). Watch the context directly so an
    // external mutation still repaints without requiring a round-trip nav.
    slice.context.watch('respuestas', this, () => this._refresh());
    slice.context.watch('settings', this, () => this._refresh());
    slice.context.watch('plantilla', this, () => this._refresh());
  }

  // Called by MultiRoute on cached revisit — the shell already exists, only
  // the numbers need refreshing.
  update() {
    this._refresh();
  }

  // StatusBadge instances are built with slice.build after init(), so the
  // parent-destroy cascade won't find them — clean up explicitly. The team
  // modal is appended to <body> (outside $root) with its own registered
  // sliceId, so destroyByContainer($root) can't reach it either — a plain
  // .remove() would leave it registered in the controller after the DOM
  // node is gone. destroyComponent() unregisters it properly.
  beforeDestroy() {
    slice.controller.destroyByContainer(this.$root);
    if (this._teamModal) slice.controller.destroyComponent(this._teamModal);
    this._charts?.destroy(this._completionChart);
  }

  // Builds the static structure + one StatusBadge per team, once. Later
  // refreshes only touch cached element refs / call setComponentProps —
  // never re-template or rebuild the badges.
  async _buildShell() {
    const roster = this._roster;
    const teams = roster.getCategoriasParticipables();
    const categoriasTexto = roster.getCategoriasTexto();

    let html = `
      <h2 class="view-title">Dashboard</h2>
      <div class="dash-plantilla" data-el="plantillaLine"></div>
      <p class="view-sub" data-el="sub"></p>
      <div class="stat-grid">
        <div class="stat-card stat-card--chart">
          <div class="k">Progreso</div>
          <div class="dash-chart-wrap">
            <canvas data-el="completionCanvas"></canvas>
            <div class="dash-chart-pct" data-el="completionPct"></div>
          </div>
        </div>
        <div class="stat-card"><div class="k">Opciones</div><div class="v" data-el="total"></div></div>
        <div class="stat-card"><div class="k">Asignadas</div><div class="v" data-el="assigned"></div></div>
        <div class="stat-card"><div class="k">Categorías en rango</div><div class="v" data-el="enRango"></div></div>
        <div class="stat-card"><div class="k">Fuera de rango</div><div class="v" data-el="conProblema"></div></div>
        <div class="stat-card" data-el="cardHombres"><div class="k"><span class="gender-dot M"></span> Hombres</div><div class="v" data-el="hombres"></div></div>
        <div class="stat-card" data-el="cardMujeres"><div class="k"><span class="gender-dot F"></span> Mujeres</div><div class="v" data-el="mujeres"></div></div>
      </div>
      <h3 class="view-title" style="font-size:16px">Categorías</h3>
      <p class="view-sub">Cada barra muestra los asignados frente al mínimo y máximo recomendado.</p>
      <div class="team-grid">`;

    teams.forEach((t) => {
      const col = roster.colorFor(t.id);
      html += `
        <div class="team-card" data-team-id="${t.id}" style="--team-color:${col}">
          <div class="team-head">
            <h3><span class="color-dot" style="background:${col}"></span>${this._esc(t.nombre)}</h3>
            <div class="team-count" style="color:${col}"><span data-el="n-${t.id}"></span><small>/${t.max != null ? t.max : '–'}</small></div>
          </div>
          <div class="team-meta">Mín ${t.min != null ? t.min : '–'} · Máx ${t.max != null ? t.max : '–'} · Cap ${t.capacidad != null ? t.capacidad : '–'}</div>
          <div class="team-lider" data-el="lider-${t.id}"></div>
          <div class="bar"><span data-el="bar-${t.id}" style="background:${col}"></span></div>
          <div class="badge-slot" data-badge="${t.id}"></div>
        </div>`;
    });
    html += `</div>`;

    if (categoriasTexto.length) {
      html += `
        <h3 class="view-title" style="font-size:16px">Texto libre</h3>
        <p class="view-sub">Tus respuestas de texto libre para esta Plantilla.</p>
        <div class="texto-list">
          ${categoriasTexto.map((c) => `
            <div class="texto-row">
              <span class="texto-row__name">${this._esc(c.nombre)}</span>
              <span class="badge" data-el="texto-badge-${c.id}"></span>
            </div>`).join('')}
        </div>`;
    }

    this.$root.innerHTML = this._sanitize(html);

    this._els = {
      plantillaLine: this.$root.querySelector('[data-el="plantillaLine"]'),
      sub: this.$root.querySelector('[data-el="sub"]'),
      total: this.$root.querySelector('[data-el="total"]'),
      assigned: this.$root.querySelector('[data-el="assigned"]'),
      hombres: this.$root.querySelector('[data-el="hombres"]'),
      mujeres: this.$root.querySelector('[data-el="mujeres"]'),
      cardHombres: this.$root.querySelector('[data-el="cardHombres"]'),
      cardMujeres: this.$root.querySelector('[data-el="cardMujeres"]'),
      enRango: this.$root.querySelector('[data-el="enRango"]'),
      conProblema: this.$root.querySelector('[data-el="conProblema"]'),
      completionPct: this.$root.querySelector('[data-el="completionPct"]'),
    };

    if (this._charts.isAvailable()) {
      const canvas = this.$root.querySelector('[data-el="completionCanvas"]');
      this._completionChart = this._charts.create(canvas, {
        type: 'doughnut',
        data: {
          labels: ['Asignadas', 'Sin asignar'],
          datasets: [{
            data: [0, 0],
            backgroundColor: [this._charts.themeColor('--success-color'), this._charts.themeColor('--secondary-background-color')],
            borderColor: this._charts.themeColor('--font-primary-color'),
            borderWidth: 2,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '72%',
          animation: { duration: 300 },
          plugins: { legend: { display: false }, tooltip: { enabled: false } },
        },
      });
    }

    this._teamEls = {};
    teams.forEach((t) => {
      this._teamEls[t.id] = {
        n: this.$root.querySelector(`[data-el="n-${t.id}"]`),
        bar: this.$root.querySelector(`[data-el="bar-${t.id}"]`),
        lider: this.$root.querySelector(`[data-el="lider-${t.id}"]`),
      };
    });

    this._textoEls = {};
    categoriasTexto.forEach((c) => {
      this._textoEls[c.id] = this.$root.querySelector(`[data-el="texto-badge-${c.id}"]`);
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
    const teams = roster.getCategoriasParticipables();
    const categoriasTexto = roster.getCategoriasTexto();
    const asignaciones = slice.getComponent('RespuestasService').getState().seleccion;
    const counts = roster.countByCategoria(asignaciones);
    const members = roster.getOpcionesDisponibles();
    const totalMembers = members.length;
    const assigned = members.filter((m) => asignaciones[m.id]).length;
    const enRango = teams.filter((t) => roster.statusOf(t, counts[t.id]) === 'ok').length;
    const conProblema = teams.filter((t) => ['under', 'over'].includes(roster.statusOf(t, counts[t.id]))).length;
    const autor = slice.getComponent('SettingsService').getState().autor;

    this._els.sub.textContent = `Resumen de tus asignaciones${autor ? ' — ' + autor : ''}.`;

    // No single "tipo" field exists on purpose — a Plantilla can freely mix
    // Categorías in modo Selección and Texto libre (see PlantillaBuilderView's
    // non-restrictive filter). This shows what's actually in it instead of
    // forcing it into an artificial fixed category.
    const nombrePlantilla = roster.getNombre();
    const nSeleccion = roster.getCategorias().filter((c) => c.modo === 'seleccion').length;
    const nTexto = categoriasTexto.length;
    const composicion = [
      nSeleccion ? `🎯 ${nSeleccion} de selección` : null,
      nTexto ? `📝 ${nTexto} de texto libre` : null,
    ].filter(Boolean).join(' · ');
    this._els.plantillaLine.innerHTML = this._sanitize(
      `<span class="dash-plantilla__name">📋 ${this._esc(nombrePlantilla || 'Plantilla sin nombre')}</span>${composicion ? `<span class="dash-plantilla__meta">${composicion}</span>` : ''}`
    );

    const sexoEnabled = slice.getComponent('SettingsService').isSexoEnabled();
    this._els.cardHombres.hidden = !sexoEnabled;
    this._els.cardMujeres.hidden = !sexoEnabled;
    if (sexoEnabled) {
      this._els.hombres.textContent = members.filter((m) => m.meta?.sexo === 'M').length;
      this._els.mujeres.textContent = members.filter((m) => m.meta?.sexo === 'F').length;
    }

    this._els.total.textContent = totalMembers;
    this._els.assigned.innerHTML = `${assigned} <small>/ ${totalMembers}</small>`;
    this._els.enRango.innerHTML = `${enRango} <small>/ ${teams.length}</small>`;
    this._els.conProblema.textContent = conProblema;

    if (this._completionChart) {
      this._completionChart.data.datasets[0].data = [assigned, Math.max(totalMembers - assigned, 0)];
      this._completionChart.update();
    }
    const completionPct = totalMembers ? Math.round((assigned / totalMembers) * 100) : 0;
    this._els.completionPct.textContent = `${completionPct}%`;

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

    const texto = slice.getComponent('RespuestasService').getState().texto;
    Object.entries(this._textoEls).forEach(([categoriaId, el]) => {
      const answered = !!(texto[categoriaId] || '').trim();
      el.className = `badge ${answered ? 'ok' : 'empty'}`;
      el.textContent = answered ? 'Respondida' : 'Pendiente';
    });
  }

  async _openTeamModal(teamId) {
    const roster = this._roster;
    const team = roster.getCategoriasParticipables().find((t) => t.id === teamId);
    if (!team) return;

    const asignaciones = slice.getComponent('RespuestasService').getState().seleccion;
    const members = roster.getOpcionesDisponibles().filter((m) => asignaciones[m.id] === teamId);

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

    const sexoEnabled = slice.getComponent('SettingsService').isSexoEnabled();
    this._teamModal.title = `${team.nombre} ${lider ? '👑' : ''}`;
    this._teamMemberList.innerHTML = this._sanitize(members.length
      ? members.map((m) => `
        <div class="team-member-item${liderId === String(m.id) ? ' is-lider' : ''}">
          ${sexoEnabled ? `<span class="sx ${m.meta?.sexo || ''}"></span>` : ''}
          <span class="nm">${this._esc(m.nombre)}</span>
          ${liderId === String(m.id) ? '<span class="lider-badge">Responsable</span>' : ''}
        </div>
      `).join('')
      : '<div class="empty-state">Sin opciones asignadas</div>');

    this._teamModal.open = true;
  }
}

customElements.define('slice-dashboardview', DashboardView);
