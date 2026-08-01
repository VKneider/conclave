export default class LandingView extends HTMLElement {
  constructor(props) {
    super();
    slice.attachTemplate(this);
    this.$root = this.querySelector('.landing-view');
    this.$plantillaName = this.$root.querySelector('[data-el="plantillaName"]');
    this.$plantillaBadges = this.$root.querySelector('[data-el="plantillaBadges"]');
    slice.controller.setComponentProps(this, props);
  }

  async init() {
    this._roster = slice.getComponent('PlantillaService');
    this._html = slice.getComponent('HtmlService');
    this._icons = slice.getComponent('IconProvider');
    this._fillIcons();
    await this._buildLinks();
    this._render();
    slice.context.watch('respuestas', this, () => this._render());
    slice.context.watch('plantilla', this, () => this._render());
  }

  update() {
    this._render();
  }

  // The howto steps render their icons via IconProvider — SVG markup is static,
  // so it lives in the template once, filled here on mount (never re-created).
  _fillIcons() {
    const ic = (name, size, c) => this._icons.svg(name, size, c);
    this.$root.querySelectorAll('[data-icon]').forEach((el) => {
      el.innerHTML = ic(el.dataset.icon, 20);
    });
  }

  // The interactive CTA/cards are Slice `Link` components (real <a href> → the
  // browser previews the URL on hover, like a native anchor) mounted into
  // persistent template slots — the refresh rule: never mount Slice controls
  // inside innerHTML regions.
  _buildLinks() {
    const build = (path, icon, iconColor, label, sub, classes) =>
      slice.build('Link', {
        path,
        icon,
        iconColor,
        text: label,
        ...(sub ? { sub } : {}),
        classes,
      });

    const links = [
      { slot: 'cta-responder', c: build('/mis-respuestas', 'pen', '', 'Responder', '', 'btn btn-primary landing-cta') },
      { slot: 'cta-editar', c: build('/plantilla', 'ruler', '', 'Editar plantilla', '', 'btn btn-ghost landing-cta') },
      { slot: 'la-responder', c: build('/mis-respuestas', 'pen', 'var(--success-color)', 'Responder', 'Tu propuesta', 'la-card') },
      { slot: 'la-comparar', c: build('/comparar', 'shuffle', 'var(--secondary-color)', 'Comparar', 'Y decidir juntos', 'la-card') },
      { slot: 'la-dashboard', c: build('/dashboard', 'bar-chart', 'var(--primary-color)', 'Dashboard', 'Resumen', 'la-card') },
      { slot: 'la-plantilla', c: build('/plantilla', 'ruler', 'var(--warning-color)', 'Plantilla', 'Arma el setup', 'la-card') },
      { slot: 'uc-asignacion', c: build('/plantilla', 'target', 'var(--primary-color)', 'Asignación', 'Reparte un grupo de personas entre equipos con cupos mín/máx. Comparen las listas y decidan la versión final.', 'usecase-card usecase-card--primary') },
      { slot: 'uc-votacion', c: build('/plantilla', 'vote', 'var(--secondary-color)', 'Votación', 'Una pregunta con varias opciones; cada quien elige una y gana la mayoría. Ideal para "¿qué fecha?" o un Sí/No.', 'usecase-card usecase-card--secondary') },
      { slot: 'uc-ranking', c: build('/plantilla', 'trophy', 'var(--warning-color)', 'Ranking', 'Ordena un conjunto de opciones por prioridad. Se agregan los órdenes de todos para un ranking de consenso.', 'usecase-card usecase-card--warning') },
      { slot: 'uc-lluvia', c: build('/plantilla', 'lightbulb', 'var(--success-color)', 'Lluvia de ideas', 'Preguntas abiertas; cada persona escribe su propuesta. Compárenlas lado a lado en cards grandes.', 'usecase-card usecase-card--success') },
    ];

    return Promise.all(links.map(({ slot, c }) => c.then((node) => {
      const target = this.$root.querySelector(`[data-slot="${slot}"]`);
      if (node instanceof Node && target) target.appendChild(node);
    })));
  }

  _render() {
    const roster = this._roster;
    const nombre = roster.getNombre();
    const esc = (s) => this._html.esc(s);
    const ic = (name, size, c) => this._icons.svg(name, size, c);

    const temas = roster.getTemas();
    const byModo = { reparto: 0, votacion: 0, ranking: 0, texto_libre: 0 };
    temas.forEach((t) => { if (byModo[t.modo] != null) byModo[t.modo]++; });
    const compBadges = [
      byModo.reparto ? `<span class="lp-badge">${ic('target', 14, 'var(--primary-color)')} ${byModo.reparto} asignación</span>` : '',
      byModo.votacion ? `<span class="lp-badge">${ic('vote', 14, 'var(--secondary-color)')} ${byModo.votacion} votación</span>` : '',
      byModo.ranking ? `<span class="lp-badge">${ic('trophy', 14, 'var(--warning-color)')} ${byModo.ranking} ranking</span>` : '',
      byModo.texto_libre ? `<span class="lp-badge">${ic('pen', 14, 'var(--success-color)')} ${byModo.texto_libre} texto libre</span>` : '',
    ].filter(Boolean).join('');

    this.$plantillaName.innerHTML = `${ic('clipboard', 18)} ${esc(nombre || 'Mi Plantilla')}`;
    this.$plantillaBadges.innerHTML = compBadges || '<span class="lp-empty">Todavía sin temas — ármala en Plantilla</span>';
  }
}

customElements.define('slice-landingview', LandingView);
