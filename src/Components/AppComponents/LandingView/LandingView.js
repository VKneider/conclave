export default class LandingView extends HTMLElement {
  constructor(props) {
    super();
    slice.attachTemplate(this);
    this.$root = this.querySelector('.landing-view');
    slice.controller.setComponentProps(this, props);
  }

  init() {
    this._roster = slice.getComponent('PlantillaService');
    this._esc = slice.getComponent('FormatService').esc;
    this._sanitize = slice.getComponent('SanitizeService').sanitize.bind(slice.getComponent('SanitizeService'));
    this._render();
    slice.context.watch('respuestas', this, () => this._render());
    slice.context.watch('plantilla', this, () => this._render());
  }

  update() {
    this._render();
  }

  _render() {
    const orgName = this._roster.getNombre();

    const roster = this._roster;
    const members = roster.getOpcionesDisponibles();
    const teams = roster.getCategoriasParticipables();
    const asignaciones = slice.getComponent('RespuestasService').getState().seleccion;
    const assigned = members.filter((m) => asignaciones[m.id]).length;
    const total = members.length;

    this.$root.innerHTML = this._sanitize(`
      <div class="landing-hero">
        <div class="landing-brandmark">🏷️</div>
        <h1 class="landing-title">Conclave</h1>
        ${orgName ? `<p class="landing-org">${this._esc(orgName)}</p>` : '<p class="landing-sub">Organiza decisiones en equipo</p>'}
        <p class="landing-desc">Definí una Plantilla, respondé por tu cuenta, comparen respuestas y decidan juntos.</p>
        <button class="btn btn-primary landing-cta" id="landingGo">Ir al Dashboard →</button>
      </div>

      <div class="landing-stats">
        <div class="stat-card"><div class="k">Opciones</div><div class="v">${total}</div></div>
        <div class="stat-card"><div class="k">Categorías</div><div class="v">${teams.length}</div></div>
        <div class="stat-card"><div class="k">Respondidas</div><div class="v">${assigned}<small>/${total}</small></div></div>
      </div>

      <div class="landing-actions">
        <button class="la-card" data-href="/mis-respuestas" aria-label="Responder uno por uno">
          <span class="la-icon">🎯</span>
          <span class="la-label">Responder</span>
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
        <button class="la-card" data-href="/plantilla" aria-label="Diseñar la Plantilla">
          <span class="la-icon">📐</span>
          <span class="la-label">Plantilla</span>
          <span class="la-sub">Categorías y Opciones</span>
        </button>
      </div>

      <section class="landing-howto">
        <h2 class="landing-section-title">Cómo funciona</h2>
        <div class="howto-steps">
          <div class="howto-step">
            <span class="howto-num">1</span>
            <span class="howto-icon">📐</span>
            <h3>Diseñá tu Plantilla</h3>
            <p>Categorías y Opciones, o preguntas de texto libre — el líder arma el setup una vez.</p>
          </div>
          <span class="howto-arrow">→</span>
          <div class="howto-step">
            <span class="howto-num">2</span>
            <span class="howto-icon">✍️</span>
            <h3>Cada quien responde</h3>
            <p>A su manera, en su propio dispositivo, sin coordinar en tiempo real.</p>
          </div>
          <span class="howto-arrow">→</span>
          <div class="howto-step">
            <span class="howto-num">3</span>
            <span class="howto-icon">🔀</span>
            <h3>Comparen y decidan</h3>
            <p>Importen las Respuestas de todos y vean coincidencias, diferencias e ideas juntos.</p>
          </div>
        </div>
      </section>

      <section class="landing-usecases">
        <h2 class="landing-section-title">Para qué podés usarla</h2>
        <div class="usecases-grid">
          <div class="usecase-card usecase-card--primary">
            <span class="usecase-icon">🎯</span>
            <h3>Asignación de equipos</h3>
            <p>Cada organizador asigna personas a equipos con su propio criterio. Comparen las listas y decidan la versión final juntos.</p>
          </div>
          <div class="usecase-card usecase-card--secondary">
            <span class="usecase-icon">🎤</span>
            <h3>Ponentes y exposiciones</h3>
            <p>Mismo flujo, otro contexto: asignen quién expone qué tema, propongan por separado y reconcilien en la reunión.</p>
          </div>
          <div class="usecase-card usecase-card--success">
            <span class="usecase-icon">💡</span>
            <h3>Generación de ideas</h3>
            <p>Cada persona escribe su propuesta en texto libre frente a un problema común. Compárenlas en cards grandes y elijan la mejor.</p>
          </div>
        </div>
      </section>`);

    const go = this.$root.querySelector('#landingGo');
    if (go) go.onclick = () => slice.router.navigate('/dashboard');

    this.$root.querySelectorAll('.la-card').forEach((el) => {
      el.onclick = () => { const h = el.dataset.href; if (h) slice.router.navigate(h); };
    });
  }
}

customElements.define('slice-landingview', LandingView);
