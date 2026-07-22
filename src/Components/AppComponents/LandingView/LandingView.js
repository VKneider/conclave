export default class LandingView extends HTMLElement {
  constructor(props) {
    super();
    slice.attachTemplate(this);
    this.$root = this.querySelector('.landing-view');
    slice.controller.setComponentProps(this, props);
  }

  init() {
    this._roster = slice.getComponent('PlantillaService');
    this._html = slice.getComponent('HtmlService');
    this._render();
    slice.context.watch('respuestas', this, () => this._render());
    slice.context.watch('plantilla', this, () => this._render());
  }

  update() {
    this._render();
  }

  _render() {
    const roster = this._roster;
    const nombre = roster.getNombre();
    const esc = (s) => this._html.esc(s);

    const temas = roster.getTemas();
    const byModo = { reparto: 0, votacion: 0, ranking: 0, texto_libre: 0 };
    temas.forEach((t) => { if (byModo[t.modo] != null) byModo[t.modo]++; });
    const compBadges = [
      byModo.reparto ? `<span class="lp-badge">🎯 ${byModo.reparto} asignación</span>` : '',
      byModo.votacion ? `<span class="lp-badge">🗳️ ${byModo.votacion} votación</span>` : '',
      byModo.ranking ? `<span class="lp-badge">🏆 ${byModo.ranking} ranking</span>` : '',
      byModo.texto_libre ? `<span class="lp-badge">📝 ${byModo.texto_libre} texto libre</span>` : '',
    ].filter(Boolean).join('');

    this.$root.innerHTML = this._html.sanitize(`
      <div class="landing-hero">
        <div class="landing-brandmark" role="img" aria-label="Conclave"></div>
        <h1 class="landing-title">Conclave</h1>
        <p class="landing-sub">Decisiones en equipo, sin reuniones eternas</p>
        <p class="landing-desc">Arma una <b>Plantilla</b>, cada quien responde por su cuenta, y después <b>comparen y decidan juntos</b> — votaciones, asignaciones, rankings o lluvias de ideas.</p>
        <div class="landing-cta-row">
          <button class="btn btn-primary landing-cta" data-href="/mis-respuestas">✍️ Responder</button>
          <button class="btn btn-ghost landing-cta" data-href="/plantilla">📐 Editar plantilla</button>
        </div>
      </div>

      <div class="landing-plantilla">
        <span class="lp-name">📋 ${esc(nombre || 'Mi Plantilla')}</span>
        ${compBadges ? `<span class="lp-badges">${compBadges}</span>` : '<span class="lp-empty">Todavía sin temas — ármala en Plantilla</span>'}
      </div>

      <div class="landing-actions">
        <button class="la-card" data-href="/mis-respuestas">
          <span class="la-icon">✍️</span><span class="la-label">Responder</span>
          <span class="la-sub">Tu propuesta</span>
        </button>
        <button class="la-card" data-href="/comparar">
          <span class="la-icon">🔀</span><span class="la-label">Comparar</span>
          <span class="la-sub">Y decidir juntos</span>
        </button>
        <button class="la-card" data-href="/dashboard">
          <span class="la-icon">📊</span><span class="la-label">Dashboard</span>
          <span class="la-sub">Resumen</span>
        </button>
        <button class="la-card" data-href="/plantilla">
          <span class="la-icon">📐</span><span class="la-label">Plantilla</span>
          <span class="la-sub">Arma el setup</span>
        </button>
      </div>

      <section class="landing-howto">
        <h2 class="landing-section-title">Cómo funciona</h2>
        <div class="howto-steps">
          <div class="howto-step">
            <span class="howto-num">1</span><span class="howto-icon">📐</span>
            <h3>Arma tu Plantilla</h3>
            <p>Suma Temas y elige el modo de cada uno — el líder arma el setup una vez. Puedes empezar desde un ejemplo.</p>
          </div>
          <span class="howto-arrow">→</span>
          <div class="howto-step">
            <span class="howto-num">2</span><span class="howto-icon">✍️</span>
            <h3>Cada quien responde</h3>
            <p>A su manera, en su propio dispositivo, sin coordinar en tiempo real. Exportas tu respuesta como archivo.</p>
          </div>
          <span class="howto-arrow">→</span>
          <div class="howto-step">
            <span class="howto-num">3</span><span class="howto-icon">🔀</span>
            <h3>Comparen y decidan</h3>
            <p>Importen las respuestas de todos y vean coincidencias, mayorías e ideas — y fijen la decisión final.</p>
          </div>
        </div>
      </section>

      <section class="landing-usecases">
        <h2 class="landing-section-title">Un modo para cada decisión</h2>
        <div class="usecases-grid">
          <button class="usecase-card usecase-card--primary" data-href="/plantilla">
            <span class="usecase-icon">🎯</span>
            <h3>Asignación</h3>
            <p>Reparte un grupo de personas entre equipos con cupos mín/máx. Comparen las listas y decidan la versión final.</p>
          </button>
          <button class="usecase-card usecase-card--secondary" data-href="/plantilla">
            <span class="usecase-icon">🗳️</span>
            <h3>Votación</h3>
            <p>Una pregunta con varias opciones; cada quien elige una y gana la mayoría. Ideal para "¿qué fecha?" o un Sí/No.</p>
          </button>
          <button class="usecase-card usecase-card--warning" data-href="/plantilla">
            <span class="usecase-icon">🏆</span>
            <h3>Ranking</h3>
            <p>Ordena un conjunto de opciones por prioridad. Se agregan los órdenes de todos para un ranking de consenso.</p>
          </button>
          <button class="usecase-card usecase-card--success" data-href="/plantilla">
            <span class="usecase-icon">💡</span>
            <h3>Lluvia de ideas</h3>
            <p>Preguntas abiertas; cada persona escribe su propuesta. Compárenlas lado a lado en cards grandes.</p>
          </button>
        </div>
      </section>`);

    this.$root.querySelectorAll('[data-href]').forEach((el) => {
      el.onclick = () => { const h = el.dataset.href; if (h) slice.router.navigate(h); };
    });
  }
}

customElements.define('slice-landingview', LandingView);
