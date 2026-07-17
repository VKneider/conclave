export default class CompareNotesModal extends HTMLElement {
  constructor(props) {
    super();
    slice.attachTemplate(this);
    this.$fab = this.querySelector('[data-cmp-notes-fab]');
    this._modalPromise = null;
    this._temas = [];
    this._notesByTema = {};
    this._activeTemaId = null;
    this._title = '📝 Notas';
    this._onInput = null;
    this._onBlur = null;
    this._onTemaChange = null;
    slice.controller.setComponentProps(this, props || {});
  }

  init() {
    // CompareView owns when to open and with which context.
  }

  get fab() {
    return this.$fab;
  }

  async _ensureModal() {
    if (!this._modalPromise) this._modalPromise = this._buildModal();
    await this._modalPromise;
  }

  async _buildModal() {
    this.$modal = await slice.build('Modal', {
      sliceId: `${this.sliceId}-dialog`,
      title: this._title,
      dismissable: true,
      draggable: true,
      width: 'min(92vw, 960px)',
      maxWidth: '960px',
    });
    this.$modal.classList.add('compare-notes-modal');
    document.body.appendChild(this.$modal);

    this.$body = document.createElement('div');
    this.$body.className = 'compare-notes-modal__body';
    this.$modal.appendBody(this.$body);

    this.$toolbar = document.createElement('div');
    this.$toolbar.className = 'compare-notes-modal__toolbar';
    this.$body.appendChild(this.$toolbar);

    this.$temaSelect = await slice.build('Select', {
      sliceId: `${this.sliceId}-tema-select`,
      label: 'Pregunta',
      visibleProp: 'text',
      onChange: () => {
        const value = this.$temaSelect.value;
        this._activeTemaId = Array.isArray(value) ? value[0]?.id : value?.id;
        this._onTemaChange?.(this._activeTemaId);
        this._renderContent();
      },
    });
    this.$toolbar.appendChild(this.$temaSelect);

    this.$content = document.createElement('div');
    this.$content.className = 'compare-notes-modal__content';
    this.$body.appendChild(this.$content);

    this.$closeBtn = await slice.build('Button', {
      value: 'Cerrar',
      variant: 'filled',
      onClick: () => { this.$modal.open = false; },
    });
    this.$modal.appendFooter(this.$closeBtn);

    this.$content.addEventListener('input', (e) => {
      const ta = e.target.closest('[data-modal-note]');
      if (!ta) return;
      const temaId = ta.dataset.modalNote;
      this._syncTemaInputs(temaId, ta.value, ta);
      this._onInput?.(temaId, ta.value);
    });

    this.$content.addEventListener('blur', (e) => {
      const ta = e.target.closest('[data-modal-note]');
      if (!ta) return;
      const temaId = ta.dataset.modalNote;
      this._onBlur?.(temaId, ta.value);
    }, true);
  }

  _renderContent() {
    if (!this.$content) return;
    const html = slice.getComponent('HtmlService');
    const esc = (s) => html.esc(s);
    const temas = Array.isArray(this._temas) ? this._temas : [];

    if (!temas.length) {
      this.$content.innerHTML = html.sanitize('<div class="empty-state">No hay preguntas para anotar en esta vista.</div>');
      return;
    }

    if (!temas.some((t) => String(t.id) === String(this._activeTemaId))) this._activeTemaId = temas[0].id;
    const current = temas.find((t) => String(t.id) === String(this._activeTemaId));
    const currentNote = this._notesByTema[this._activeTemaId] || '';

    this.$content.innerHTML = html.sanitize(`
      <div class="compare-notes-modal__current">
        <h4>${esc(current?.nombre || '')}</h4>
        <textarea data-modal-note="${esc(this._activeTemaId)}" placeholder="Notas de esta pregunta…">${esc(currentNote)}</textarea>
        <footer data-note-status="${esc(this._activeTemaId)}"></footer>
      </div>

      <div class="compare-notes-modal__all">
        <h4>Todas las notas</h4>
        <div class="compare-notes-modal__grid">
          ${temas.map((t) => `
            <article class="compare-notes-modal__card">
              <header>${esc(t.nombre)}</header>
              <textarea data-modal-note="${esc(t.id)}" placeholder="Notas de esta pregunta…">${esc(this._notesByTema[t.id] || '')}</textarea>
              <footer data-note-status="${esc(t.id)}"></footer>
            </article>
          `).join('')}
        </div>
      </div>
    `);
  }

  _render() {
    if (!this.$body) return;
    const temas = Array.isArray(this._temas) ? this._temas : [];
    const options = temas.map((t) => ({ id: String(t.id), text: t.nombre }));
    this.$temaSelect.options = options;
    const selected = options.find((o) => String(o.id) === String(this._activeTemaId)) || options[0] || null;
    if (selected) {
      this.$temaSelect.value = [selected];
      this._activeTemaId = selected.id;
    }
    this._renderContent();
  }

  _syncTemaInputs(temaId, value, origin) {
    this.$content?.querySelectorAll(`[data-modal-note="${temaId}"]`).forEach((el) => {
      if (el === origin) return;
      if (el.value !== value) el.value = value;
    });
  }

  setStatus(temaId, text) {
    this.$body?.querySelectorAll(`[data-note-status="${temaId}"]`).forEach((el) => { el.textContent = text; });
  }

  async show({ title, temas, notesByTema, currentTemaId, onTemaChange, onInput, onBlur } = {}) {
    await this._ensureModal();
    if (Array.isArray(temas)) this._temas = temas;
    if (notesByTema) this._notesByTema = notesByTema;
    if (title) this._title = title;
    if (currentTemaId != null) this._activeTemaId = currentTemaId;
    this._onTemaChange = typeof onTemaChange === 'function' ? onTemaChange : null;
    this._onInput = typeof onInput === 'function' ? onInput : null;
    this._onBlur = typeof onBlur === 'function' ? onBlur : null;
    this.$modal.title = this._title;
    this._render();
    this.$modal.open = true;
  }
}

customElements.define('slice-comparenotesmodal', CompareNotesModal);
