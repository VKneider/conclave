// "Ordena las opciones" response view for modo `ranking` temas: one card per
// ranking Tema, its owned Opciones as an ordered list reordered with ▲▼
// (RespuestasService.ranking = ordered opcionId[]). The effective order is the
// saved ranking, with any Opciones missing from it (e.g. added later) appended
// in their natural order. Plain-HTML render + delegated clicks (see
// docs/COMPONENT-PATTERNS.md).
export default class RespuestasRankingView extends HTMLElement {
  constructor(props) {
    super();
    slice.attachTemplate(this);
    this.$root = this.querySelector('.ranking-view');
    this.$list = this.querySelector('.rk-list');

    this.$list.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-rank-move]');
      if (!btn) return;
      const { temaId, opcionId, rankMove } = btn.dataset;
      const order = this._effectiveOrder(temaId);
      const i = order.indexOf(String(opcionId));
      const j = rankMove === 'up' ? i - 1 : i + 1;
      if (i < 0 || j < 0 || j >= order.length) return;
      [order[i], order[j]] = [order[j], order[i]];
      this._resp.setRanking(temaId, order);
    });

    slice.controller.setComponentProps(this, props);
  }

  async init() {
    this._plantilla = slice.getComponent('PlantillaService');
    this._resp = slice.getComponent('RespuestasService');
    this._html = slice.getComponent('HtmlService');
    this._icons = slice.getComponent('IconProvider');
    this._render();
    slice.context.watch('respuestas', this, () => this._render(), (s) => s.ranking);
    slice.context.watch('plantilla', this, () => this._render());
  }

  update() { this._render(); }

  // Saved order filtered to still-existing opciones, plus any new ones appended.
  _effectiveOrder(temaId) {
    const opcIds = this._plantilla.getOpcionesDeTema(temaId).map((o) => String(o.id));
    const saved = (this._resp.getRanking(temaId) || []).map(String).filter((id) => opcIds.includes(id));
    opcIds.forEach((id) => { if (!saved.includes(id)) saved.push(id); });
    return saved;
  }

  _render() {
    const esc = (s) => this._html.esc(s);
    const ic = (n, s, c) => this._icons.svg(n, s, c);
    const temas = this._plantilla.getTemasRanking();

    if (!temas.length) {
      this.$list.innerHTML = this._html.sanitize('<div class="empty-state">No hay temas de ranking en esta Plantilla.</div>');
      return;
    }

    const html = temas.map((t) => {
      const order = this._effectiveOrder(t.id);
      const answered = (this._resp.getRanking(t.id) || []).length > 0;
      const byId = {};
      this._plantilla.getOpcionesDeTema(t.id).forEach((o) => { byId[String(o.id)] = o; });

      const items = order.length
        ? order.map((id, idx) => {
            const o = byId[id];
            if (!o) return '';
            return `<div class="rk-item">
              <span class="rk-pos">${idx + 1}</span>
              <span class="rk-name">${esc(o.nombre)}</span>
              <span class="rk-moves">
                <button class="rk-move" type="button" data-rank-move="up" data-tema-id="${esc(t.id)}" data-opcion-id="${esc(o.id)}" ${idx === 0 ? 'disabled' : ''} title="Subir">▲</button>
                <button class="rk-move" type="button" data-rank-move="down" data-tema-id="${esc(t.id)}" data-opcion-id="${esc(o.id)}" ${idx === order.length - 1 ? 'disabled' : ''} title="Bajar">▼</button>
              </span>
            </div>`;
          }).join('')
        : '<div class="rk-noopc">Este tema no tiene opciones — cargalas en Plantilla.</div>';

      return `<div class="rk-card${answered ? ' rk-card--answered' : ''}">
        <div class="rk-card__head">
          <h3 class="rk-card__title">${ic('trophy', 16, 'var(--warning-color)')} ${esc(t.nombre)}</h3>
          <span class="rk-card__status">${answered ? '✓ Ordenada' : 'Ordena con ▲▼'}</span>
        </div>
        <div class="rk-items">${items}</div>
      </div>`;
    }).join('');

    this.$list.innerHTML = this._html.sanitize(html);
  }
}

customElements.define('slice-respuestasrankingview', RespuestasRankingView);
