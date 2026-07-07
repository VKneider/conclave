// Carousel-by-tema for modo `texto_libre` using CarouselView.
// Shows every source's proposal for one tema at a time.
export default class TextCompareCards extends HTMLElement {
  constructor(props) {
    super();
    slice.attachTemplate(this);
    this.$wrap = this.querySelector('.tcc-wrap');
    this.$fs = this.querySelector('.tcc-fs');
    this.$fsAutor = this.querySelector('.tcc-fs__autor');
    this.$fsText = this.querySelector('.tcc-fs__text');
    this.$fsClose = this.querySelector('.tcc-fs__close');
    this._sources = [];
    this._carousel = null;

    this.$fsClose.addEventListener('click', () => this._closeFs());
    this.$fs.addEventListener('click', (e) => { if (e.target === this.$fs) this._closeFs(); });
    this._onKeydown = this._onKeydown.bind(this);

    slice.controller.setComponentProps(this, props);
  }

  async init() {
    this._html = slice.getComponent('HtmlService');

    this._carousel = await slice.build('CarouselView', { mode: 'single' });
    this.$wrap.insertBefore(this._carousel, this.$fs);

    document.addEventListener('keydown', this._onKeydown);
    slice.context.watch('decisionFinal', this, () => this._render());
    slice.context.watch('plantilla', this, () => this._render());
    this._render();
  }

  beforeDestroy() {
    document.removeEventListener('keydown', this._onKeydown);
    document.body.style.overflow = '';
  }

  _onKeydown(e) {
    if (e.key === 'Escape' && !this.$fs.hidden) { e.preventDefault(); this._closeFs(); return; }
    if (e.key === 'Tab' && !this.$fs.hidden) { this._trapFocus(e); }
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
    if (!this._html || !this._carousel) return;
    const temas = this._plantilla().getTemasTexto();
    const sources = this._sources;
    const esc = (s) => this._html.esc(s);

    if (!temas.length) {
      this._carousel.items = [];
      return;
    }

    const consenso = this._consenso();
    const items = temas.map((tema) => {
      const final = consenso.finalTextoFor(tema.id);
      const withText = sources.filter((s) => (s.texto?.[tema.id] || '').trim());

      let html = `<div class="tcc-section">
        <h3 class="tcc-section-title">${esc(tema.nombre)}</h3>`;

      if (final) {
        const finalSrc = sources.find((s) => s.autor === final.autor);
        const finalLabel = (finalSrc && finalSrc.autorLabel) || final.autor;
        html += `<div class="tcc-final-banner" data-tema="${esc(tema.id)}">✓ Elegida: <b>${esc(finalLabel)}</b> <button class="linkish" data-tccact="clear-final">Quitar ✕</button></div>`;
      }

      if (!withText.length) {
        html += '<div class="empty-state">Nadie propuso todavía una respuesta para este tema.</div>';
      } else {
        html += `<div class="tcc-grid">${withText.map((s) => {
          const texto = s.texto[tema.id];
          const label = s.autorLabel || s.autor;
          const isFinal = final && final.autor === s.autor && final.texto === texto;
          return `
          <div class="tcc-card${isFinal ? ' is-final' : ''}" style="--tcc-color:${s.color}" data-tema="${esc(tema.id)}">
            <div class="tcc-card-head">
              <span class="tcc-swatch" style="background:${s.color}"></span>
              <span class="tcc-autor">${esc(label)}</span>
              ${isFinal ? '<span class="tcc-final-tag">Elegida</span>' : ''}
              <button class="tcc-read" type="button" data-tccread="${esc(s.autor)}" title="Leer en pantalla completa">⛶</button>
            </div>
            <p class="tcc-text">${esc(texto)}</p>
            <button class="btn btn-sm tcc-pick" data-tccpick="${esc(s.autor)}">${isFinal ? '✓ Elegida' : 'Marcar como elegida'}</button>
          </div>`;
        }).join('')}</div>`;
      }

      html += '</div>';
      return this._buildItem(html, tema.id, sources);
    });

    this._carousel.items = items;
  }

  _buildItem(html, temaId, sources) {
    const div = document.createElement('div');
    div.style.padding = '2px 0';
    div.innerHTML = this._html.sanitize(html);

    div.querySelectorAll('[data-tccact="clear-final"]').forEach((btn) => {
      btn.onclick = () => {
        this._consenso().clearResolutionTexto(temaId);
        this._render();
      };
    });

    div.querySelectorAll('.tcc-pick').forEach((btn) => {
      btn.onclick = () => {
        const src = sources.find((s) => s.autor === btn.dataset.tccpick);
        if (!src) return;
        this._consenso().setResolutionTexto(temaId, src.autor, src.texto[temaId]);
        this._render();
      };
    });

    div.querySelectorAll('.tcc-read').forEach((btn) => {
      btn.onclick = () => {
        const src = sources.find((s) => s.autor === btn.dataset.tccread);
        if (src) this._openFs(src.autorLabel || src.autor, src.texto[temaId]);
      };
    });

    return div;
  }
}

customElements.define('slice-textcomparecards', TextCompareCards);
