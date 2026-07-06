// Full-screen-ish, large-text cards showing every source's free-text
// proposal for one modo `texto_libre` Tema at a time — the spec's
// "tercera vista" for the idea-generation use case (large cards, big text,
// filling most of the screen), sibling to CompareCarousel's per-Opción cards.
export default class TextCompareCards extends HTMLElement {
  constructor(props) {
    super();
    slice.attachTemplate(this);
    this.$root = this.querySelector('.tcc-root');
    this.$fs = this.querySelector('.tcc-fs');
    this.$fsAutor = this.querySelector('.tcc-fs__autor');
    this.$fsText = this.querySelector('.tcc-fs__text');
    this.$fsClose = this.querySelector('.tcc-fs__close');
    this._sources = [];
    this._temaIndex = 0;

    // Read a proposal fullscreen (delegated — the cards are re-rendered).
    this.$fsClose.addEventListener('click', () => this._closeFs());
    this.$fs.addEventListener('click', (e) => { if (e.target === this.$fs) this._closeFs(); });
    this._onKeydown = (e) => {
      if (e.key === 'Escape' && !this.$fs.hidden) { e.preventDefault(); this._closeFs(); return; }
      if (e.key === 'Tab' && !this.$fs.hidden) this._trapFocus(e);
    };

    slice.controller.setComponentProps(this, props);
  }

  init() {
    this._html = slice.getComponent('HtmlService');
    document.addEventListener('keydown', this._onKeydown);
    slice.context.watch('decisionFinal', this, () => this._render());
    slice.context.watch('plantilla', this, () => this._render());
    this._render();
  }

  beforeDestroy() {
    document.removeEventListener('keydown', this._onKeydown);
    document.body.style.overflow = '';
  }

  _openFs(autor, texto) {
    this.$fsAutor.textContent = autor;
    this.$fsText.textContent = texto;
    this.$fs.hidden = false;
    document.body.style.overflow = 'hidden';
    this.$fsClose.focus();
  }

  _closeFs() {
    if (this.$fs.hidden) return;
    this.$fs.hidden = true;
    document.body.style.overflow = '';
  }

  _trapFocus(e) {
    const focusable = this.$fs.querySelectorAll('button, [tabindex]:not([tabindex="-1"])');
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  set sources(arr) {
    this._sources = arr || [];
    if (this.isConnected) this._render();
  }

  _plantilla() { return slice.getComponent('PlantillaService'); }
  _consenso() { return slice.getComponent('ConsensoService'); }

  _render() {
    const temas = this._plantilla().getTemasTexto();
    const sources = this._sources;

    if (!temas.length) {
      this.$root.innerHTML = '<div class="empty-state">Esta Plantilla no tiene temas de texto libre.</div>';
      return;
    }
    if (this._temaIndex >= temas.length) this._temaIndex = Math.max(0, temas.length - 1);
    const tema = temas[this._temaIndex];
    const consenso = this._consenso();
    const final = consenso.finalTextoFor(tema.id);

    let html = '';
    if (temas.length > 1) {
      html += `<div class="tcc-nav">
        <button class="btn btn-sm" data-tccact="prev" ${this._temaIndex === 0 ? 'disabled' : ''}>‹ Anterior</button>
        <div class="tcc-nav-title">${this._html.esc(tema.nombre)} <span class="tcc-nav-count">(${this._temaIndex + 1}/${temas.length})</span></div>
        <button class="btn btn-sm" data-tccact="next" ${this._temaIndex === temas.length - 1 ? 'disabled' : ''}>Siguiente ›</button>
      </div>`;
    } else {
      html += `<h3 class="tcc-solo-title">${this._html.esc(tema.nombre)}</h3>`;
    }

    if (final) {
      html += `<div class="tcc-final-banner">✓ Elegida: <b>${this._html.esc(final.autor)}</b> <button class="linkish" data-tccact="clear-final">Quitar ✕</button></div>`;
    }

    const withText = sources.filter((s) => (s.texto?.[tema.id] || '').trim());
    if (!withText.length) {
      html += '<div class="empty-state">Nadie propuso todavía una respuesta para este tema.</div>';
    } else {
      html += `<div class="tcc-grid">${withText.map((s) => {
        const texto = s.texto[tema.id];
        const isFinal = final && final.autor === s.autor && final.texto === texto;
        return `
        <div class="tcc-card${isFinal ? ' is-final' : ''}" style="--tcc-color:${s.color}">
          <div class="tcc-card-head">
            <span class="tcc-swatch" style="background:${s.color}"></span>
            <span class="tcc-autor">${this._html.esc(s.autor)}</span>
            ${isFinal ? '<span class="tcc-final-tag">Elegida</span>' : ''}
            <button class="tcc-read" type="button" data-tccread="${this._html.esc(s.autor)}" title="Leer en pantalla completa">⛶</button>
          </div>
          <p class="tcc-text">${this._html.esc(texto)}</p>
          <button class="btn btn-sm tcc-pick" data-tccpick="${this._html.esc(s.autor)}">${isFinal ? '✓ Elegida' : 'Marcar como elegida'}</button>
        </div>`;
      }).join('')}</div>`;
    }

    this.$root.innerHTML = this._html.sanitize(html);
    this._bindInteractions(tema, withText);
  }

  _bindInteractions(tema, withText) {
    const prev = this.$root.querySelector('[data-tccact="prev"]');
    const next = this.$root.querySelector('[data-tccact="next"]');
    if (prev) prev.onclick = () => { this._temaIndex--; this._render(); };
    if (next) next.onclick = () => { this._temaIndex++; this._render(); };

    const clear = this.$root.querySelector('[data-tccact="clear-final"]');
    if (clear) clear.onclick = () => { this._consenso().clearResolutionTexto(tema.id); this._render(); };

    this.$root.querySelectorAll('.tcc-pick').forEach((btn) => {
      btn.onclick = () => {
        const src = withText.find((s) => s.autor === btn.dataset.tccpick);
        if (!src) return;
        this._consenso().setResolutionTexto(tema.id, src.autor, src.texto[tema.id]);
        this._render();
      };
    });

    this.$root.querySelectorAll('.tcc-read').forEach((btn) => {
      btn.onclick = () => {
        const src = withText.find((s) => s.autor === btn.dataset.tccread);
        if (src) this._openFs(src.autor, src.texto[tema.id]);
      };
    });
  }
}

customElements.define('slice-textcomparecards', TextCompareCards);
