// Full-screen-ish, large-text cards showing every source's free-text
// proposal for one modo `texto_libre` Categoría at a time — the spec's
// "tercera vista" for the idea-generation use case (large cards, big text,
// filling most of the screen), sibling to CompareCarousel's per-Opción cards.
export default class TextCompareCards extends HTMLElement {
  constructor(props) {
    super();
    slice.attachTemplate(this);
    this.$root = this.querySelector('.tcc-root');
    this._sources = [];
    this._categoriaIndex = 0;
    slice.controller.setComponentProps(this, props);
  }

  init() {
    this._esc = slice.getComponent('FormatService').esc;
    this._sanitize = slice.getComponent('SanitizeService').sanitize.bind(slice.getComponent('SanitizeService'));
    slice.context.watch('decisionFinal', this, () => this._paint());
    slice.context.watch('plantilla', this, () => this._paint());
    this._paint();
  }

  set sources(arr) {
    this._sources = arr || [];
    if (this.isConnected) this._paint();
  }

  _plantilla() { return slice.getComponent('PlantillaService'); }
  _consenso() { return slice.getComponent('ConsensoService'); }

  _paint() {
    const categorias = this._plantilla().getCategoriasTexto();
    const sources = this._sources;

    if (!categorias.length) {
      this.$root.innerHTML = '<div class="empty-state">Esta Plantilla no tiene categorías de texto libre.</div>';
      return;
    }
    if (this._categoriaIndex >= categorias.length) this._categoriaIndex = Math.max(0, categorias.length - 1);
    const categoria = categorias[this._categoriaIndex];
    const consenso = this._consenso();
    const final = consenso.finalTextoFor(categoria.id);

    let html = '';
    if (categorias.length > 1) {
      html += `<div class="tcc-nav">
        <button class="btn btn-sm" data-tccact="prev" ${this._categoriaIndex === 0 ? 'disabled' : ''}>‹ Anterior</button>
        <div class="tcc-nav-title">${this._esc(categoria.nombre)} <span class="tcc-nav-count">(${this._categoriaIndex + 1}/${categorias.length})</span></div>
        <button class="btn btn-sm" data-tccact="next" ${this._categoriaIndex === categorias.length - 1 ? 'disabled' : ''}>Siguiente ›</button>
      </div>`;
    } else {
      html += `<h3 class="tcc-solo-title">${this._esc(categoria.nombre)}</h3>`;
    }

    if (final) {
      html += `<div class="tcc-final-banner">✓ Elegida: <b>${this._esc(final.autor)}</b> <button class="linkish" data-tccact="clear-final">Quitar ✕</button></div>`;
    }

    const withText = sources.filter((s) => (s.texto?.[categoria.id] || '').trim());
    if (!withText.length) {
      html += '<div class="empty-state">Nadie propuso todavía una respuesta para esta categoría.</div>';
    } else {
      html += `<div class="tcc-grid">${withText.map((s) => {
        const texto = s.texto[categoria.id];
        const isFinal = final && final.autor === s.autor && final.texto === texto;
        return `
        <div class="tcc-card${isFinal ? ' is-final' : ''}" style="--tcc-color:${s.color}">
          <div class="tcc-card-head">
            <span class="tcc-swatch" style="background:${s.color}"></span>
            <span class="tcc-autor">${this._esc(s.autor)}</span>
            ${isFinal ? '<span class="tcc-final-tag">Elegida</span>' : ''}
          </div>
          <p class="tcc-text">${this._esc(texto)}</p>
          <button class="btn btn-sm tcc-pick" data-tccpick="${this._esc(s.autor)}">${isFinal ? '✓ Elegida' : 'Marcar como elegida'}</button>
        </div>`;
      }).join('')}</div>`;
    }

    this.$root.innerHTML = this._sanitize(html);
    this._bindInteractions(categoria, withText);
  }

  _bindInteractions(categoria, withText) {
    const prev = this.$root.querySelector('[data-tccact="prev"]');
    const next = this.$root.querySelector('[data-tccact="next"]');
    if (prev) prev.onclick = () => { this._categoriaIndex--; this._paint(); };
    if (next) next.onclick = () => { this._categoriaIndex++; this._paint(); };

    const clear = this.$root.querySelector('[data-tccact="clear-final"]');
    if (clear) clear.onclick = () => { this._consenso().clearResolutionTexto(categoria.id); this._paint(); };

    this.$root.querySelectorAll('.tcc-pick').forEach((btn) => {
      btn.onclick = () => {
        const src = withText.find((s) => s.autor === btn.dataset.tccpick);
        if (!src) return;
        this._consenso().setResolutionTexto(categoria.id, src.autor, src.texto[categoria.id]);
        this._paint();
      };
    });
  }
}

customElements.define('slice-textcomparecards', TextCompareCards);
