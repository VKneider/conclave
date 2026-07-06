// Full-screen-ish, large-text cards showing every source's free-text
// proposal for ALL modo `texto_libre` Temas at once — stacked vertically
// so nothing needs clicking to see every person's answer (just vertical
// scroll). Sibling to CompareCarousel's per-Opción cards.
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
    const esc = (s) => this._html.esc(s);

    if (!temas.length) {
      this.$root.innerHTML = '<div class="empty-state">Esta Plantilla no tiene temas de texto libre.</div>';
      return;
    }

    const consenso = this._consenso();

    const sectionsHtml = temas.map((tema) => {
      const final = consenso.finalTextoFor(tema.id);
      const withText = sources.filter((s) => (s.texto?.[tema.id] || '').trim());

      let section = `<section class="tcc-section">
        <h3 class="tcc-section-title">${esc(tema.nombre)}</h3>`;

      if (final) {
        section += `<div class="tcc-final-banner" data-tema="${esc(tema.id)}">✓ Elegida: <b>${esc(final.autor)}</b> <button class="linkish" data-tccact="clear-final">Quitar ✕</button></div>`;
      }

      if (!withText.length) {
        section += '<div class="empty-state">Nadie propuso todavía una respuesta para este tema.</div>';
      } else {
        section += `<div class="tcc-grid">${withText.map((s) => {
          const texto = s.texto[tema.id];
          const isFinal = final && final.autor === s.autor && final.texto === texto;
          return `
          <div class="tcc-card${isFinal ? ' is-final' : ''}" style="--tcc-color:${s.color}" data-tema="${esc(tema.id)}">
            <div class="tcc-card-head">
              <span class="tcc-swatch" style="background:${s.color}"></span>
              <span class="tcc-autor">${esc(s.autor)}</span>
              ${isFinal ? '<span class="tcc-final-tag">Elegida</span>' : ''}
              <button class="tcc-read" type="button" data-tccread="${esc(s.autor)}" title="Leer en pantalla completa">⛶</button>
            </div>
            <p class="tcc-text">${esc(texto)}</p>
            <button class="btn btn-sm tcc-pick" data-tccpick="${esc(s.autor)}">${isFinal ? '✓ Elegida' : 'Marcar como elegida'}</button>
          </div>`;
        }).join('')}</div>`;
      }

      section += '</section>';
      return section;
    }).join('');

    this.$root.innerHTML = this._html.sanitize(sectionsHtml);
    this._bindInteractions(sources);
  }

  _bindInteractions(sources) {
    this.$root.querySelectorAll('[data-tccact="clear-final"]').forEach((btn) => {
      const section = btn.closest('.tcc-section');
      const temaId = section?.querySelector('.tcc-final-banner')?.dataset.tema;
      btn.onclick = () => {
        if (temaId) { this._consenso().clearResolutionTexto(temaId); this._render(); }
      };
    });

    this.$root.querySelectorAll('.tcc-pick').forEach((btn) => {
      const card = btn.closest('.tcc-card');
      const temaId = card?.dataset.tema;
      btn.onclick = () => {
        const src = sources.find((s) => s.autor === btn.dataset.tccpick);
        if (!src || !temaId) return;
        this._consenso().setResolutionTexto(temaId, src.autor, src.texto[temaId]);
        this._render();
      };
    });

    this.$root.querySelectorAll('.tcc-read').forEach((btn) => {
      btn.onclick = () => {
        const src = sources.find((s) => s.autor === btn.dataset.tccread);
        if (src) this._openFs(src.autor, src.texto[btn.closest('.tcc-card')?.dataset.tema]);
      };
    });
  }
}

customElements.define('slice-textcomparecards', TextCompareCards);
