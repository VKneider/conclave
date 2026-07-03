// One textarea per modo `texto_libre` Tema — the free-text counterpart to the
// carousel/board, for temas with no Opción pool. Each card can expand to a
// FULLSCREEN editor (⛶) so writing a long answer doesn't feel cramped; the
// overlay lives outside the innerHTML-rebuilt cards area so a repaint never
// touches it.
export default class RespuestasTextoView extends HTMLElement {
  constructor(props) {
    super();
    slice.attachTemplate(this);
    this.$root = this.querySelector('.respuestas-texto-view');
    this.$fs = this.querySelector('.rt-fs');
    this.$fsTitle = this.querySelector('.rt-fs__title');
    this.$fsTextarea = this.querySelector('.rt-fs__textarea');
    this.$fsClose = this.querySelector('.rt-fs__close');
    this.$fsStatus = this.querySelector('.rt-fs__status');
    this._fsTemaId = null;

    // Expand → fullscreen (delegated, since the cards are re-rendered).
    this.$root.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-expand]');
      if (btn) this._openFs(btn.dataset.expand);
    });
    this.$fsClose.addEventListener('click', () => this._closeFs());
    this.$fs.addEventListener('click', (e) => { if (e.target === this.$fs) this._closeFs(); });
    this._onKeydown = (e) => { if (e.key === 'Escape' && !this.$fs.hidden) this._closeFs(); };
    this.$fsTextarea.addEventListener('input', () => {
      this.$fsStatus.textContent = 'Escribiendo…';
      clearTimeout(this._fsSaveTimer);
      this._fsSaveTimer = setTimeout(() => this._saveFs(), 400);
    });

    slice.controller.setComponentProps(this, props);
  }

  init() {
    this._plantilla = slice.getComponent('PlantillaService');
    this._html = slice.getComponent('HtmlService');
    document.addEventListener('keydown', this._onKeydown);
    this._render();
    slice.context.watch('plantilla', this, () => this._render());
    slice.context.watch('respuestas', this, () => this._syncValues());
  }

  update() {
    this._render();
  }

  beforeDestroy() {
    clearTimeout(this._statusTimer);
    clearTimeout(this._fsSaveTimer);
    document.removeEventListener('keydown', this._onKeydown);
    document.body.style.overflow = '';
  }

  // ── Fullscreen editor ───────────────────────────────────────
  _openFs(temaId) {
    const tema = this._plantilla.getTemaById(temaId);
    if (!tema) return;
    this._fsTemaId = temaId;
    this.$fsTitle.textContent = tema.nombre;
    this.$fsTextarea.value = slice.getComponent('RespuestasService').getState().texto[temaId] || '';
    this.$fsStatus.textContent = '';
    this.$fs.hidden = false;
    document.body.style.overflow = 'hidden';
    this.$fsTextarea.focus();
  }

  _saveFs() {
    if (!this._fsTemaId) return;
    slice.getComponent('RespuestasService').setTexto(this._fsTemaId, this.$fsTextarea.value);
    this.$fsStatus.textContent = '✓ Guardado';
    clearTimeout(this._statusTimer);
    this._statusTimer = setTimeout(() => { if (!this.$fs.hidden) this.$fsStatus.textContent = ''; }, 1200);
  }

  _closeFs() {
    if (this.$fs.hidden) return;
    clearTimeout(this._fsSaveTimer);
    this._saveFs();
    this.$fs.hidden = true;
    document.body.style.overflow = '';
    this._fsTemaId = null;
    this._syncValues();
  }

  _render() {
    const temas = this._plantilla.getTemasTexto();
    if (!temas.length) {
      this.$root.innerHTML = '<div class="empty-state">Todavía no hay temas de texto libre en esta Plantilla.</div>';
      return;
    }

    // Preserve an in-progress, uncommitted edit across this rebuild (see
    // _syncValues for the same concern on `respuestas` changes).
    const active = document.activeElement;
    const activeId = active?.classList?.contains('rt-textarea') ? active.closest('.rt-card')?.dataset.temaId : null;
    const activeValue = activeId ? active.value : null;
    const selStart = activeId ? active.selectionStart : null;
    const selEnd = activeId ? active.selectionEnd : null;

    const esc = (s) => this._html.esc(s);
    const texto = slice.getComponent('RespuestasService').getState().texto;
    this.$root.innerHTML = this._html.sanitize(temas.map((c) => `
      <div class="rt-card" data-tema-id="${esc(c.id)}">
        <div class="rt-card__head">
          <h3 class="rt-title">${esc(c.nombre)}</h3>
          <button class="rt-expand" type="button" data-expand="${esc(c.id)}" title="Pantalla completa">⛶ Ampliar</button>
        </div>
        <textarea class="rt-textarea" rows="5" placeholder="Escribe tu propuesta…">${esc(c.id === activeId ? activeValue : (texto[c.id] || ''))}</textarea>
        <div class="rt-status" data-el="status"></div>
      </div>`).join(''));

    this.$root.querySelectorAll('.rt-card').forEach((card) => {
      const id = card.dataset.temaId;
      const textarea = card.querySelector('.rt-textarea');
      const status = card.querySelector('[data-el="status"]');
      textarea.onchange = () => {
        slice.getComponent('RespuestasService').setTexto(id, textarea.value);
        status.textContent = '✓ Guardado';
        clearTimeout(this._statusTimer);
        this._statusTimer = setTimeout(() => { status.textContent = ''; }, 1200);
      };
      if (id === activeId) {
        textarea.focus();
        textarea.setSelectionRange(selStart, selEnd);
      }
    });
  }

  // Reflects external changes into the textareas without stealing focus from
  // whichever one the user is typing in.
  _syncValues() {
    const texto = slice.getComponent('RespuestasService').getState().texto;
    this.$root.querySelectorAll('.rt-card').forEach((card) => {
      const id = card.dataset.temaId;
      const textarea = card.querySelector('.rt-textarea');
      if (document.activeElement !== textarea) textarea.value = texto[id] || '';
    });
  }
}

customElements.define('slice-respuestastextoview', RespuestasTextoView);
