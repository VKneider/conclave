import { DASHBOARD_NAME_MAX } from '../../../AppConfig.js';

export default class DashboardView extends HTMLElement {
  constructor(props) {
    super();
    slice.attachTemplate(this);
    this.$root = this.querySelector('.dashboard-view');
    slice.controller.setComponentProps(this, props);
  }

  async init() {
    this._roster = slice.getComponent('PlantillaService');
    this._html = slice.getComponent('HtmlService');
    this._charts = slice.getComponent('ChartService');
    this._icons = slice.getComponent('IconProvider');
    this._viewHeaderSlot = this.querySelector('.viewheader-slot');
    const viewHeader = await slice.build('ViewHeader', { sliceId: 'dashViewHeader', title: 'Dashboard', subtitle: 'Resumen de tus respuestas — progreso, asignaciones, votaciones, rankings y texto libre.' });
    if (viewHeader instanceof Node) this._viewHeaderSlot.appendChild(viewHeader);
    await this._buildShell();
    this._render();
    slice.context.watch('respuestas', this, () => this._render());
    slice.context.watch('settings', this, () => this._render());
    // A modo change / add / rename / import changes the SHAPE (which sections
    // exist), so the shell is rebuilt when needed, not just re-rendered.
    slice.context.watch('plantilla', this, () => this._rebuildIfNeeded());
  }

  update() {
    // Cached revisit: rebuild only if the shape (which temas/modos exist)
    // changed while away; otherwise just refresh the numbers.
    this._rebuildIfNeeded();
  }

  // Which temas exist, their modo and name — everything the SHELL bakes in.
  _shapeKey() {
    return this._roster.getTemas().map((t) => `${t.id}:${t.modo}:${t.nombre}`).join('|');
  }

  _rebuildIfNeeded() {
    if (this._shapeKey() !== this._builtShapeKey) this._rebuild();
    else this._render();
  }

  beforeDestroy() {
    slice.controller.destroyByContainer(this.$root);
    if (this._teamModal) slice.controller.destroyComponent(this._teamModal);
    this._charts?.destroy(this._completionChart);
  }

  async _rebuild() {
    // Tear down the old shell's built children (StatusBadges) before rebuilding.
    slice.controller.destroyByContainer(this.$root);
    this._charts?.destroy(this._completionChart);
    this._completionChart = null;
    await this._buildShell();
    this._render();
  }

  async _buildShell() {
    const roster = this._roster;
    const esc = (s) => this._html.esc(s);
    const ic = (n, s, c) => this._icons.svg(n, s, c);
    const temas = roster.getTemas();
    const temasReparto = roster.getTemasParticipables();
    const temasVotacion = roster.getTemasVotacion();
    const temasRanking = roster.getTemasRanking();
    const temasTexto = roster.getTemasTexto();

    // A per-tema answered/pending list — shared by votación / ranking / texto.
    const modoSection = (title, sub, temas, prefix) => `
      <h3 class="view-title dash-section-title">${title}</h3>
      <p class="view-sub">${sub}</p>
      <div class="texto-list">
        ${temas.map((c) => `
          <div class="texto-row">
            <span class="texto-row__name">${esc(c.nombre)}</span>
            <span class="badge" data-el="${prefix}-badge-${c.id}"></span>
          </div>`).join('')}
      </div>`;

    if (!temas.length) {
      this.$root.innerHTML = '';
      const empty = await slice.build('EmptyState', {
        icon: 'clipboard',
        title: 'Todav\u00EDa no hay una Plantilla',
        description: 'Cre\u00E1 una plantilla con Temas y Opciones para empezar a asignar equipos, votar y m\u00E1s.',
        buttonLabel: 'Ir a Plantilla',
        buttonRoute: '/plantilla',
      });
      if (empty instanceof Node) this.$root.appendChild(empty);
      this._els = { plantillaName: null, plantillaMeta: null, sub: null, totalTemas: null, answered: null, enRango: null, conProblema: null, cardRango: null, cardProblema: null, completionPct: null, shareBtnSlot: null };
      this._teamEls = {};
      this._votoEls = {};
      this._rankEls = {};
      this._textoEls = {};
      this._badges = {};
      return;
    }

    let html = `
      <div class="dash-info-row">
        <div data-el="shareBtnSlot"></div>
        <span class="dash-plantilla__name" data-el="plantillaName"></span>
        <span class="dash-plantilla__meta" data-el="plantillaMeta"></span>
      </div>
      <p class="view-sub" data-el="sub"></p>
      <div class="stat-grid">
        <div class="stat-card stat-card--chart">
          <div class="k">Progreso</div>
          <div class="dash-chart-wrap">
            <canvas data-el="completionCanvas"></canvas>
            <div class="dash-chart-pct" data-el="completionPct"></div>
          </div>
        </div>
        <div class="stat-card"><div class="k">Temas</div><div class="v" data-el="totalTemas"></div></div>
        <div class="stat-card"><div class="k">Respondido</div><div class="v" data-el="answered"></div></div>
        <div class="stat-card" data-el="cardRango" hidden><div class="k">En rango</div><div class="v" data-el="enRango"></div></div>
        <div class="stat-card" data-el="cardProblema" hidden><div class="k">Fuera de rango</div><div class="v" data-el="conProblema"></div></div>
      </div>`;

    if (temasReparto.length) {
      html += `
        <h3 class="view-title dash-section-title">${ic('target', 16, 'var(--primary-color)')} Asignación</h3>
        <p class="view-sub">Cada barra muestra las opciones asignadas frente al mínimo y máximo. Toca un tema para ver quiénes quedaron.</p>
        <div class="tema-grid">
          ${temasReparto.map((t) => {
        const col = roster.colorFor(t.id);
        return `
            <div class="tema-card" data-tema-id="${t.id}" style="--tema-color:${col}">
              <div class="tema-head">
                <h3><span class="color-dot" style="background:${col}"></span>${esc(t.nombre)}</h3>
                <div class="tema-count" style="color:${col}"><span data-el="n-${t.id}"></span><small>/${t.max != null ? t.max : '–'}</small></div>
              </div>
              <div class="tema-meta">Mín ${t.min != null ? t.min : '–'} · Máx ${t.max != null ? t.max : '–'}</div>
              <div class="tema-lider" data-el="lider-${t.id}"></div>
              <div class="bar"><span data-el="bar-${t.id}" style="background:${col}"></span></div>
              <div class="badge-slot" data-badge="${t.id}"></div>
            </div>`;
      }).join('')}
        </div>`;
    }

    if (temasVotacion.length) html += modoSection(`${ic('vote', 16, 'var(--secondary-color)')} Votación`, 'Respondido = elegiste una opción en el tema.', temasVotacion, 'voto');
    if (temasRanking.length) html += modoSection(`${ic('trophy', 16, 'var(--warning-color)')} Ranking`, 'Respondido = ordenaste las opciones del tema.', temasRanking, 'rank');
    if (temasTexto.length) html += modoSection(`${ic('pen', 16, 'var(--success-color)')} Texto libre`, 'Respondido = escribiste tu propuesta.', temasTexto, 'texto');

    this.$root.innerHTML = this._html.sanitize(html);

    this._els = {
      plantillaName: this.$root.querySelector('[data-el="plantillaName"]'),
      plantillaMeta: this.$root.querySelector('[data-el="plantillaMeta"]'),
      sub: this.$root.querySelector('[data-el="sub"]'),
      totalTemas: this.$root.querySelector('[data-el="totalTemas"]'),
      answered: this.$root.querySelector('[data-el="answered"]'),
      enRango: this.$root.querySelector('[data-el="enRango"]'),
      conProblema: this.$root.querySelector('[data-el="conProblema"]'),
      cardRango: this.$root.querySelector('[data-el="cardRango"]'),
      cardProblema: this.$root.querySelector('[data-el="cardProblema"]'),
      completionPct: this.$root.querySelector('[data-el="completionPct"]'),
    };
    this._els.shareBtnSlot = this.$root.querySelector('[data-el="shareBtnSlot"]');
    if (this._els.shareBtnSlot) {
      const shareBtn = await slice.build('Button', {
        sliceId: 'dashShareBtn',
        value: 'Compartir respuestas',
        icon: { name: 'share-2' },
        variant: 'filled',
        onClick: () => {
          const modal = slice.getComponent('exportRespuestasModal');
          if (modal?.show) modal.show();
        },
      });
      if (shareBtn instanceof Node) this._els.shareBtnSlot.appendChild(shareBtn);
    }

    if (this._charts.isAvailable()) {
      const canvas = this.$root.querySelector('[data-el="completionCanvas"]');
      this._completionChart = this._charts.create(canvas, {
        type: 'doughnut',
        data: {
          labels: ['Respondido', 'Pendiente'],
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
    temasReparto.forEach((t) => {
      this._teamEls[t.id] = {
        n: this.$root.querySelector(`[data-el="n-${t.id}"]`),
        bar: this.$root.querySelector(`[data-el="bar-${t.id}"]`),
        lider: this.$root.querySelector(`[data-el="lider-${t.id}"]`),
      };
    });

    this._votoEls = {};
    temasVotacion.forEach((c) => { this._votoEls[c.id] = this.$root.querySelector(`[data-el="voto-badge-${c.id}"]`); });
    this._rankEls = {};
    temasRanking.forEach((c) => { this._rankEls[c.id] = this.$root.querySelector(`[data-el="rank-badge-${c.id}"]`); });
    this._textoEls = {};
    temasTexto.forEach((c) => { this._textoEls[c.id] = this.$root.querySelector(`[data-el="texto-badge-${c.id}"]`); });

    // StatusBadges only for reparto temas (guard the first/rest pattern).
    this._badges = {};
    if (temasReparto.length) {
      const badgeProps = temasReparto.map((t) => ({ sliceId: `dashBadge${t.id}`, status: 'empty', label: '' }));
      const [first, ...rest] = badgeProps;
      const firstBadge = await slice.build('StatusBadge', first);
      const restBadges = await Promise.all(rest.map((p) => slice.build('StatusBadge', p)));
      const badgeNodes = [firstBadge, ...restBadges];
      temasReparto.forEach((t, i) => {
        this._badges[t.id] = badgeNodes[i];
        this.$root.querySelector(`[data-badge="${t.id}"]`).appendChild(badgeNodes[i]);
      });

      this.$root.querySelector('.tema-grid').addEventListener('click', (e) => {
        const card = e.target.closest('.tema-card');
        if (card) this._openTemaModal(card.dataset.temaId);
      });
    }

    this._builtShapeKey = this._shapeKey();
  }

  _render() {
    // Empty state — nothing to render
    if (!this._els?.sub) return;

    const roster = this._roster;
    const temasReparto = roster.getTemasParticipables();
    const asignaciones = slice.getComponent('RespuestasService').getState().seleccion;
    const counts = roster.countByTema(asignaciones);
    const autor = slice.getComponent('SettingsService').getState().autor;
    const progress = roster.getAnswerProgress();

    this._els.sub.textContent = `Resumen de tus respuestas${autor ? ' — ' + autor : ''}.`;

    const esc = (s) => this._html.esc(s);
    const nombrePlantilla = roster.getNombre();
    const nReparto = roster.getTemas().filter((c) => c.modo === 'reparto').length;
    const nVotacion = roster.getTemasVotacion().length;
    const nRanking = roster.getTemasRanking().length;
    const nTexto = roster.getTemasTexto().length;
    const ic = (n, s, c) => this._icons.svg(n, s, c);
    const composicion = [
      nReparto ? `${ic('target', 14, 'var(--primary-color)')} ${nReparto} de asignación` : null,
      nVotacion ? `${ic('vote', 14, 'var(--secondary-color)')} ${nVotacion} de votación` : null,
      nRanking ? `${ic('trophy', 14, 'var(--warning-color)')} ${nRanking} de ranking` : null,
      nTexto ? `${ic('pen', 14, 'var(--success-color)')} ${nTexto} de texto libre` : null,
    ].filter(Boolean).join(' · ');
    const maxName = (nombrePlantilla || 'Plantilla sin nombre').slice(0, DASHBOARD_NAME_MAX);
    this._els.plantillaName.innerHTML = `${ic('clipboard', 16, 'var(--font-secondary-color)')} ${esc(maxName)}${(nombrePlantilla || '').length > DASHBOARD_NAME_MAX ? '…' : ''}`;
    this._els.plantillaName.title = nombrePlantilla || '';
    this._els.plantillaMeta.innerHTML = composicion;
    this._els.plantillaMeta.hidden = !composicion;

    this._els.totalTemas.textContent = roster.getTemas().length;
    this._els.answered.innerHTML = `${progress.answered} <small>/ ${progress.total}</small>`;

    // Reparto-only cards: shown + filled only when there ARE reparto temas.
    const showReparto = temasReparto.length > 0;
    this._els.cardRango.hidden = !showReparto;
    this._els.cardProblema.hidden = !showReparto;
    if (showReparto) {
      const enRango = temasReparto.filter((t) => roster.statusOf(t, counts[t.id]) === 'ok').length;
      const conProblema = temasReparto.filter((t) => ['under', 'over'].includes(roster.statusOf(t, counts[t.id]))).length;
      this._els.enRango.innerHTML = `${enRango} <small>/ ${temasReparto.length}</small>`;
      this._els.conProblema.textContent = conProblema;
    }

    if (this._completionChart) {
      this._completionChart.data.datasets[0].data = [progress.answered, Math.max(progress.total - progress.answered, 0)];
      this._completionChart.update();
    }
    this._els.completionPct.textContent = `${progress.total ? Math.round((progress.answered / progress.total) * 100) : 0}%`;

    temasReparto.forEach((t) => {
      const n = counts[t.id];
      const st = roster.statusOf(t, n);
      const denom = t.max || Math.max(n, 1);
      const pct = Math.min(100, Math.round((n / denom) * 100));
      this._teamEls[t.id].n.textContent = n;
      this._teamEls[t.id].bar.style.width = `${pct}%`;
      if (this._badges[t.id]) slice.setComponentProps(this._badges[t.id], { status: st, label: roster.statusLabel(t, n) });
      const lider = slice.getComponent('SettingsService').getEffectiveLider(t.id);
      this._teamEls[t.id].lider.innerHTML = lider && lider.opcion ? `${ic('crown', 14)} ${this._html.esc(lider.opcion.nombre)}` : '';
    });

    const resp = slice.getComponent('RespuestasService').getState();
    const setBadge = (el, answered) => {
      el.className = `badge ${answered ? 'ok' : 'empty'}`;
      el.textContent = answered ? 'Respondido' : 'Pendiente';
    };
    Object.entries(this._votoEls).forEach(([id, el]) => setBadge(el, resp.voto?.[id] != null));
    Object.entries(this._rankEls).forEach(([id, el]) => setBadge(el, (resp.ranking?.[id] || []).length > 0));
    Object.entries(this._textoEls).forEach(([id, el]) => setBadge(el, !!(resp.texto?.[id] || '').trim()));
  }

  async _openTemaModal(temaId) {
    const roster = this._roster;
    const ic = (n, s, c) => this._icons.svg(n, s, c);
    const tema = roster.getTemasParticipables().find((t) => t.id === temaId);
    if (!tema) return;

    const asignaciones = slice.getComponent('RespuestasService').getState().seleccion;
    const opciones = roster.getOpcionesDisponibles().filter((m) => asignaciones[m.id] === temaId);
    const lider = slice.getComponent('SettingsService').getEffectiveLider(temaId);
    const liderId = lider?.opcion ? String(lider.opcion.id) : null;

    if (!this._teamModal) {
      this._teamModal = await slice.build('Modal', { sliceId: 'temaOpcionesModal', dismissable: true });
      this._teamModal.classList.add('tema-opciones-modal');
      this._teamOpcionList = document.createElement('div');
      this._teamOpcionList.className = 'tema-opcion-list';
      this._teamModal.appendBody(this._teamOpcionList);
      document.body.appendChild(this._teamModal);
    }

    this._teamModal.title = `${tema.nombre}${lider ? ` ${ic('crown', 16, 'var(--warning-color)')}` : ''}`;
    this._teamOpcionList.innerHTML = this._html.sanitize(opciones.length
      ? opciones.map((m) => `
        <div class="tema-opcion-item${liderId === String(m.id) ? ' is-lider' : ''}">
          <span class="nm">${this._html.esc(m.nombre)}</span>
          ${liderId === String(m.id) ? '<span class="lider-badge">Responsable</span>' : ''}
        </div>`).join('')
      : '<div class="empty-state">Sin opciones asignadas</div>');

    this._teamModal.open = true;
  }
}

customElements.define('slice-dashboardview', DashboardView);
