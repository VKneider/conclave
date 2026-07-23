// "Elige una" response view for modo `votacion` temas: one card per votación
// Tema, its owned Opciones as pickable pills, exactly one chosen per Tema
// (RespuestasService.voto). Plain-HTML render (no nested Slice components) so
// innerHTML is the right tool; clicks are delegated. Follows the component
// contract (docs/COMPONENT-PATTERNS.md): init caches refs + does the first
// _render(), update()/watchers delegate to the same _render().
export default class RespuestasVotacionView extends HTMLElement {
  constructor(props) {
    super();
    slice.attachTemplate(this);
    this.$root = this.querySelector('.votacion-view');
    this.$list = this.querySelector('.vv-list');

    this.$list.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-vote]');
      if (!btn) return;
      const { temaId, opcionId } = btn.dataset;
      const resp = slice.getComponent('RespuestasService');
      // Clicking the current pick clears it; picking another replaces it.
      if (String(resp.getVoto(temaId)) === String(opcionId)) resp.clearVoto(temaId);
      else resp.setVoto(temaId, opcionId);
    });

    slice.controller.setComponentProps(this, props);
  }

  async init() {
    this._plantilla = slice.getComponent('PlantillaService');
    this._resp = slice.getComponent('RespuestasService');
    this._html = slice.getComponent('HtmlService');
    this._icons = slice.getComponent('IconProvider');
    this._render();
    slice.context.watch('respuestas', this, () => this._render(), (s) => s.voto);
    slice.context.watch('plantilla', this, () => this._render());
  }

  update() { this._render(); }

  _render() {
    const esc = (s) => this._html.esc(s);
    const ic = (n, s) => this._icons.svg(n, s);
    const temas = this._plantilla.getTemasVotacion();

    if (!temas.length) {
      this.$list.innerHTML = this._html.sanitize('<div class="empty-state">No hay temas de votación en esta Plantilla.</div>');
      return;
    }

    const html = temas.map((t) => {
      const opciones = this._plantilla.getOpcionesDeTema(t.id);
      const voto = this._resp.getVoto(t.id);
      const answered = voto != null;
      const opcHtml = opciones.length
        ? opciones.map((o) => {
            const chosen = String(voto) === String(o.id);
            return `<button class="vv-opc${chosen ? ' vv-opc--chosen' : ''}" type="button"
              data-vote data-tema-id="${esc(t.id)}" data-opcion-id="${esc(o.id)}"
              aria-pressed="${chosen ? 'true' : 'false'}">
              <span class="vv-opc__radio" aria-hidden="true"></span>
              <span class="vv-opc__name">${esc(o.nombre)}</span>
            </button>`;
          }).join('')
        : '<div class="vv-noopc">Este tema todavía no tiene opciones — cargalas en Plantilla.</div>';
      return `<div class="vv-card${answered ? ' vv-card--answered' : ''}">
        <div class="vv-card__head">
          <h3 class="vv-card__title">${ic('vote', 16)} ${esc(t.nombre)}</h3>
          <span class="vv-card__status">${answered ? '✓ Elegida' : 'Elige una'}</span>
        </div>
        <div class="vv-opciones">${opcHtml}</div>
      </div>`;
    }).join('');

    this.$list.innerHTML = this._html.sanitize(html);
  }
}

customElements.define('slice-respuestasvotacionview', RespuestasVotacionView);
