import { esc } from '/utils/format.js';

export default class LandingView extends HTMLElement {
  constructor(props) {
    super();
    slice.attachTemplate(this);
    this.$root = this.querySelector('.landing-view');
    slice.controller.setComponentProps(this, props);
  }

  init() {
    this._roster = slice.getComponent('RosterService');
    this._render();
    slice.context.watch('assignment', this, () => this._render());
    slice.context.watch('settings', this, () => this._render());
  }

  update() {
    this._render();
  }

  _render() {
    const settings = slice.getComponent('SettingsService').getState();
    const orgName = settings.nombreOrganizacion || '';

    const roster = this._roster;
    const members = roster.getAssignableMembers();
    const teams = roster.getAssignableTeams();
    const asignaciones = slice.getComponent('AssignmentService').getState();
    const assigned = members.filter((m) => asignaciones[m.id]).length;
    const total = members.length;

    this.$root.innerHTML = `
      <div class="landing-hero">
        <div class="landing-brandmark">🏷️</div>
        <h1 class="landing-title">Conclave</h1>
        ${orgName ? `<p class="landing-org">${esc(orgName)}</p>` : '<p class="landing-sub">Organiza equipos para tu evento</p>'}
        <p class="landing-desc">Asigna miembros a equipos, compara propuestas con otras personas y decide la lista final.</p>
        <button class="btn btn-primary landing-cta" id="landingGo">Ir al Dashboard →</button>
      </div>

      <div class="landing-stats">
        <div class="stat-card"><div class="k">Miembros</div><div class="v">${total}</div></div>
        <div class="stat-card"><div class="k">Equipos</div><div class="v">${teams.length}</div></div>
        <div class="stat-card"><div class="k">Asignados</div><div class="v">${assigned}<small>/${total}</small></div></div>
      </div>

      <div class="landing-actions">
        <button class="la-card" data-href="/mi-asignacion" aria-label="Asignar uno por uno">
          <span class="la-icon">🎯</span>
          <span class="la-label">Asignar</span>
          <span class="la-sub">Uno por uno</span>
        </button>
        <button class="la-card" data-href="/comparar" aria-label="Comparar propuestas">
          <span class="la-icon">🔀</span>
          <span class="la-label">Comparar</span>
          <span class="la-sub">Vs. otras propuestas</span>
        </button>
        <button class="la-card" data-href="/dashboard" aria-label="Ir al dashboard">
          <span class="la-icon">📊</span>
          <span class="la-label">Dashboard</span>
          <span class="la-sub">Resumen completo</span>
        </button>
        <button class="la-card" data-href="/configuracion" aria-label="Configurar">
          <span class="la-icon">⚙️</span>
          <span class="la-label">Configurar</span>
          <span class="la-sub">Nombre y evento</span>
        </button>
      </div>`;

    const go = this.$root.querySelector('#landingGo');
    if (go) go.onclick = () => slice.router.navigate('/dashboard');

    this.$root.querySelectorAll('.la-card').forEach((el) => {
      el.onclick = () => { const h = el.dataset.href; if (h) slice.router.navigate(h); };
    });
  }
}

customElements.define('slice-landingview', LandingView);
