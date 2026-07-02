// One textarea per modo `texto_libre` Categoría — the free-text counterpart
// to MisRespuestasView's carousel/PorCategoriaView's board, for categorías
// that don't use an Opción pool at all (e.g. "¿Qué propones para el cierre?").
export default class RespuestasTextoView extends HTMLElement {
  constructor(props) {
    super();
    slice.attachTemplate(this);
    this.$root = this.querySelector('.respuestas-texto-view');
    slice.controller.setComponentProps(this, props);
  }

  init() {
    this._plantilla = slice.getComponent('PlantillaService');
    this._esc = slice.getComponent('FormatService').esc;
    this._sanitize = slice.getComponent('SanitizeService').sanitize.bind(slice.getComponent('SanitizeService'));
    this._render();
    slice.context.watch('plantilla', this, () => this._render());
    slice.context.watch('respuestas', this, () => this._syncValues());
  }

  update() {
    this._render();
  }

  beforeDestroy() {
    clearTimeout(this._statusTimer);
  }

  _render() {
    const categorias = this._plantilla.getCategoriasTexto();
    if (!categorias.length) {
      this.$root.innerHTML = '<div class="empty-state">Todavía no hay categorías de texto libre en esta Plantilla.</div>';
      return;
    }

    // Preserve an in-progress, uncommitted edit (before its onchange/blur
    // fires) across this rebuild. MultiRoute keeps this view's instance
    // alive when the user switches sub-tabs, and `plantilla` can still
    // mutate in the background (e.g. another tab/session importing a
    // Plantilla) — without this, that mutation would silently wipe
    // whatever the user was mid-typing. Same concern _syncValues() already
    // guards against for `respuestas` changes.
    const active = document.activeElement;
    const activeId = active?.classList?.contains('rt-textarea') ? active.closest('.rt-card')?.dataset.catId : null;
    const activeValue = activeId ? active.value : null;
    const selStart = activeId ? active.selectionStart : null;
    const selEnd = activeId ? active.selectionEnd : null;

    const texto = slice.getComponent('RespuestasService').getState().texto;
    this.$root.innerHTML = this._sanitize(categorias.map((c) => `
      <div class="rt-card" data-cat-id="${this._esc(c.id)}">
        <h3 class="rt-title">${this._esc(c.nombre)}</h3>
        <textarea class="rt-textarea" rows="5" placeholder="Escribí tu propuesta…">${this._esc(c.id === activeId ? activeValue : (texto[c.id] || ''))}</textarea>
        <div class="rt-status" data-el="status"></div>
      </div>`).join(''));

    this.$root.querySelectorAll('.rt-card').forEach((card) => {
      const id = card.dataset.catId;
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

  // Reflects external changes (e.g. a session import in Fase D) into the
  // textareas without stealing focus from whichever one the user is typing in.
  _syncValues() {
    const texto = slice.getComponent('RespuestasService').getState().texto;
    this.$root.querySelectorAll('.rt-card').forEach((card) => {
      const id = card.dataset.catId;
      const textarea = card.querySelector('.rt-textarea');
      if (document.activeElement !== textarea) textarea.value = texto[id] || '';
    });
  }
}

customElements.define('slice-respuestastextoview', RespuestasTextoView);
