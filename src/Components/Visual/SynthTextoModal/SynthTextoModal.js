// Modal "Redactar respuesta final" para modo `texto_libre` — compone una
// síntesis (respuesta final conjunta) a partir de las propuestas de las demás
// personas. UI pura: recibe las fuentes + la final actual vía `show()` y avisa
// de guardar/borrar mediante callbacks. Lazy-built una sola vez (patrón
// CompareNotesModal: _ensureModal + _modalPromise), montado en document.body.
// El EnhancedEditor es un componente Slice real, por eso nunca va dentro de una
// región innerHTML — vive en un slot del body; la lista de fuentes es HTML
// plano re-renderizado al abrir (sin controles Slice anidados).

export default class SynthTextoModal extends HTMLElement {
  constructor(props) {
    super();
    slice.attachTemplate(this);
    this._modalPromise = null;
    this._sources = [];
    this._synthTemaId = null;
    this._synthFuentes = new Set();
    this._onSave = null;
    this._onClear = null;
    slice.controller.setComponentProps(this, props || {});
  }

  init() {
    this._html = slice.getComponent('HtmlService');
  }

  beforeDestroy() {
    if (this.$modal) {
      if (this.$modal.open) this.$modal.open = false;
      slice.controller.destroyComponent(this.$modal);
      this.$modal = null;
      this._modalPromise = null;
    }
  }

  async show({ temaId, temaNombre, sources, final, onSave, onClear } = {}) {
    await this._ensureModal();
    this._synthTemaId = temaId;
    this._sources = Array.isArray(sources) ? sources : [];
    this._synthFuentes = new Set();
    this._onSave = typeof onSave === 'function' ? onSave : null;
    this._onClear = typeof onClear === 'function' ? onClear : null;

    this.$synthEditor.value = final?.texto || '';
    if (final?.esSintesis && Array.isArray(final.fuentes)) {
      final.fuentes.forEach((f) => this._synthFuentes.add(f));
    }
    this.$modal.title = temaNombre ? `Redactar respuesta final · ${temaNombre}` : 'Redactar respuesta final';
    this._renderSynthSources();
    this.$modal.open = true;
    requestAnimationFrame(() => this._synthEditor?.focus());
  }

  async _ensureModal() {
    if (!this._modalPromise) this._modalPromise = this._buildModal();
    await this._modalPromise;
  }

  async _buildModal() {
    this.$modal = await slice.build('Modal', {
      sliceId: `${this.sliceId}-synth-dialog`,
      title: 'Redactar respuesta final',
      dismissable: true,
      draggable: true,
      width: 'min(92vw, 960px)',
      maxWidth: '960px',
    });
    this.$modal.classList.add('stm-modal');
    document.body.appendChild(this.$modal);

    this.$body = document.createElement('div');
    this.$body.className = 'stm__body';
    this.$modal.appendBody(this.$body);

    this.$sources = document.createElement('div');
    this.$sources.className = 'stm__sources';
    this.$body.appendChild(this.$sources);

    this.$editorSlot = document.createElement('div');
    this.$editorSlot.className = 'stm__editor';
    this.$body.appendChild(this.$editorSlot);

    this.$synthEditor = await slice.build('EnhancedEditor', {
      sliceId: `${this.sliceId}-synth-editor`,
      placeholder: 'Combiná las respuestas y escribí el texto final del equipo…',
    });
    this.$editorSlot.appendChild(this.$synthEditor);

    this.$quitarBtn = await slice.build('Button', {
      sliceId: `${this.sliceId}-synth-quitar`,
      value: 'Quitar',
      icon: { name: 'trash', size: '14' },
      variant: 'ghost',
      onClick: () => this._clearSynth(),
    });
    this.$modal.appendFooter(this.$quitarBtn);

    this.$closeBtn = await slice.build('Button', {
      sliceId: `${this.sliceId}-synth-close`,
      value: 'Cerrar',
      variant: 'outlined',
      onClick: () => { this.$modal.open = false; },
    });
    this.$modal.appendFooter(this.$closeBtn);

    this.$saveBtn = await slice.build('Button', {
      sliceId: `${this.sliceId}-synth-save`,
      value: 'Guardar como respuesta final',
      icon: { name: 'check', size: '14' },
      variant: 'filled',
      onClick: () => this._saveSynth(),
    });
    this.$modal.appendFooter(this.$saveBtn);
  }

  _sourcesForTema() {
    const temaId = this._synthTemaId;
    return this._sources.filter((s) => (s.texto?.[temaId] || '').trim());
  }

  _renderSynthSources() {
    if (!this.$sources) return;
    const esc = (s) => this._html.esc(s);
    const temaId = this._synthTemaId;
    const sources = this._sourcesForTema();
    const icons = slice.getComponent('IconProvider');

    if (!sources.length) {
      this.$sources.innerHTML = this._html.sanitize('<div class="empty-state">No hay respuestas de otras personas para combinar todavía.</div>');
      return;
    }

    this.$sources.innerHTML = this._html.sanitize(`
      <h4 class="stm__sources-title">Respuestas para combinar</h4>
      <div class="stm__sources-list">
        ${sources.map((s) => {
          const label = s.autorLabel || s.autor;
          const inserted = this._synthFuentes.has(s.autor);
          return `<div class="stm__source${inserted ? ' is-inserted' : ''}" style="--stm-color:${s.color}">
            <span class="stm-swatch" style="background:${s.color}"></span>
            <span class="stm__source-name">${esc(label)}</span>
            <button class="btn btn-sm stm__insert" type="button" data-synth-insert="${esc(s.autor)}" ${inserted ? 'disabled' : ''}>${inserted ? `${icons.svg('check', 13)} Insertada` : `Insertar ${icons.svg('plus', 13)}`}</button>
            <div class="stm__source-text tp-render">${this._html.sanitize(s.texto[temaId])}</div>
          </div>`;
        }).join('')}
      </div>`);

    this.$sources.querySelectorAll('[data-synth-insert]').forEach((btn) => {
      btn.onclick = () => this._insertFuente(btn.dataset.synthInsert);
    });
  }

  _insertFuente(autor) {
    const src = this._sources.find((s) => s.autor === autor);
    const texto = src?.texto?.[this._synthTemaId];
    if (!texto || !this.$synthEditor) return;
    this._synthFuentes.add(autor);
    const esc = (s) => this._html.esc(s);
    const block = `<p><strong>${esc(src.autorLabel || src.autor)}</strong></p><blockquote>${texto}</blockquote>`;
    this.$synthEditor.value = this.$synthEditor.value ? `${this.$synthEditor.value}${block}` : block;
    this._renderSynthSources();
  }

  _saveSynth() {
    const texto = this.$synthEditor?.value || '';
    const plain = texto.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    if (!plain) {
      slice.events.emit('toast:show', { message: 'Escribí un texto antes de guardar la respuesta final.', type: 'warning' });
      return;
    }
    this._onSave?.(this._synthTemaId, texto, [...this._synthFuentes]);
    this.$modal.open = false;
  }

  _clearSynth() {
    this._onClear?.(this._synthTemaId);
    this.$modal.open = false;
  }
}

customElements.define('slice-synthtextomodal', SynthTextoModal);
