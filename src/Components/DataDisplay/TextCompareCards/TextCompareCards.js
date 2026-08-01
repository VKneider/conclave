

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
    this.$fsCloseSlot = this.querySelector('.tcc-fs__close-slot');
    this._sources = [];
    this._carousel = null;
    this._modalPromise = null;
    this._synthTemaId = null;
    this._synthFuentes = new Set();

    this.$fs.addEventListener('click', (e) => { if (e.target === this.$fs) this._closeFs(); });
    this._onKeydown = this._onKeydown.bind(this);

    slice.controller.setComponentProps(this, props);
  }

  async init() {
    this._html = slice.getComponent('HtmlService');

    this._carousel = await slice.build('CarouselView', { mode: 'single' });
    this.$wrap.insertBefore(this._carousel, this.$fs);

    this.$fsClose = await slice.build('Button', {
      sliceId: 'tccFsClose',
      value: 'Cerrar',
      icon: { name: 'x', size: '14' },
      variant: 'outlined',
      size: 'sm',
      onClick: () => this._closeFs(),
    });
    this.$fsCloseSlot.appendChild(this.$fsClose);

    document.addEventListener('keydown', this._onKeydown);
    slice.context.watch('decisionFinal', this, () => this._render());
    slice.context.watch('plantilla', this, () => this._render());
    this._render();
  }

  beforeDestroy() {
    document.removeEventListener('keydown', this._onKeydown);
    document.body.style.overflow = '';
    if (this.$synthModal) {
      if (this.$synthModal.open) this.$synthModal.open = false;
      slice.controller.destroyComponent(this.$synthModal);
      this.$synthModal = null;
      this._modalPromise = null;
    }
  }

  _onKeydown(e) {
    if (e.key === 'Escape' && !this.$fs.hidden) { e.preventDefault(); this._closeFs(); return; }
    if (e.key === 'Tab' && !this.$fs.hidden) { this._trapFocus(e); }
  }

  _openFs(autor, texto) {
    this.$fsAutor.textContent = autor;
    this.$fsText.innerHTML = this._html.sanitize(texto);
    this.$fs.hidden = false;
    document.body.style.overflow = 'hidden';
    this.$fsClose.querySelector('.slice_button').focus();
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

  // ── Síntesis: modal "Redactar respuesta final" ────────────────
  // Lazy-built once (pattern CompareNotesModal: _ensureModal + _modalPromise),
  // mounted on document.body. The EnhancedEditor is a real Slice component, so
  // it is never placed inside innerHTML regions — it lives in a body slot; the
  // sources list is plain HTML re-rendered on open (no nested Slice controls).

  async _openSynth(temaId) {
    await this._ensureModal();
    this._synthTemaId = temaId;
    this._synthFuentes = new Set();
    const final = this._consenso().finalTextoFor(temaId);
    this._synthEditor.value = final?.texto || '';
    if (final?.esSintesis && Array.isArray(final.fuentes)) {
      final.fuentes.forEach((f) => this._synthFuentes.add(f));
    }
    const tema = this._plantilla().getTemaById(temaId);
    this.$synthModal.title = tema ? `Redactar respuesta final · ${tema.nombre}` : 'Redactar respuesta final';
    this._renderSynthSources();
    this.$synthModal.open = true;
    requestAnimationFrame(() => this._synthEditor?.focus());
  }

  async _ensureModal() {
    if (!this._modalPromise) this._modalPromise = this._buildModal();
    await this._modalPromise;
  }

  async _buildModal() {
    this.$synthModal = await slice.build('Modal', {
      sliceId: `${this.sliceId}-synth-dialog`,
      title: 'Redactar respuesta final',
      dismissable: true,
      draggable: true,
      width: 'min(92vw, 960px)',
      maxWidth: '960px',
    });
    this.$synthModal.classList.add('tcc-synth-modal');
    document.body.appendChild(this.$synthModal);

    this.$synthBody = document.createElement('div');
    this.$synthBody.className = 'tcc-synth__body';
    this.$synthModal.appendBody(this.$synthBody);

    this.$synthSources = document.createElement('div');
    this.$synthSources.className = 'tcc-synth__sources';
    this.$synthBody.appendChild(this.$synthSources);

    this.$synthEditorSlot = document.createElement('div');
    this.$synthEditorSlot.className = 'tcc-synth__editor';
    this.$synthBody.appendChild(this.$synthEditorSlot);

    this._synthEditor = await slice.build('EnhancedEditor', {
      sliceId: `${this.sliceId}-synth-editor`,
      placeholder: 'Combiná las respuestas y escribí el texto final del equipo…',
    });
    this.$synthEditorSlot.appendChild(this._synthEditor);

    this.$synthQuitarBtn = await slice.build('Button', {
      sliceId: `${this.sliceId}-synth-quitar`,
      value: 'Quitar',
      icon: { name: 'trash', size: '14' },
      variant: 'ghost',
      onClick: () => this._clearSynth(),
    });
    this.$synthModal.appendFooter(this.$synthQuitarBtn);

    this.$synthCloseBtn = await slice.build('Button', {
      sliceId: `${this.sliceId}-synth-close`,
      value: 'Cerrar',
      variant: 'outlined',
      onClick: () => { this.$synthModal.open = false; },
    });
    this.$synthModal.appendFooter(this.$synthCloseBtn);

    this.$synthSaveBtn = await slice.build('Button', {
      sliceId: `${this.sliceId}-synth-save`,
      value: 'Guardar como respuesta final',
      icon: { name: 'check', size: '14' },
      variant: 'filled',
      onClick: () => this._saveSynth(),
    });
    this.$synthModal.appendFooter(this.$synthSaveBtn);
  }

  _sourcesForTema(temaId) {
    return this._sources.filter((s) => (s.texto?.[temaId] || '').trim());
  }

  _renderSynthSources() {
    if (!this.$synthSources) return;
    const esc = (s) => this._html.esc(s);
    const temaId = this._synthTemaId;
    const sources = this._sourcesForTema(temaId);
    const icons = slice.getComponent('IconProvider');

    if (!sources.length) {
      this.$synthSources.innerHTML = this._html.sanitize('<div class="empty-state">No hay respuestas de otras personas para combinar todavía.</div>');
      return;
    }

    this.$synthSources.innerHTML = this._html.sanitize(`
      <h4 class="tcc-synth__sources-title">Respuestas para combinar</h4>
      <div class="tcc-synth__sources-list">
        ${sources.map((s) => {
          const label = s.autorLabel || s.autor;
          const inserted = this._synthFuentes.has(s.autor);
          return `<div class="tcc-synth__source${inserted ? ' is-inserted' : ''}" style="--tcc-color:${s.color}">
            <span class="tcc-swatch" style="background:${s.color}"></span>
            <span class="tcc-synth__source-name">${esc(label)}</span>
            <button class="btn btn-sm tcc-synth__insert" type="button" data-synth-insert="${esc(s.autor)}" ${inserted ? 'disabled' : ''}>${inserted ? `${icons.svg('check', 13)} Insertada` : `Insertar ${icons.svg('plus', 13)}`}</button>
            <div class="tcc-synth__source-text tp-render">${this._html.sanitize(s.texto[temaId])}</div>
          </div>`;
        }).join('')}
      </div>`);

    this.$synthSources.querySelectorAll('[data-synth-insert]').forEach((btn) => {
      btn.onclick = () => this._insertFuente(btn.dataset.synthInsert);
    });
  }

  _insertFuente(autor) {
    const src = this._sources.find((s) => s.autor === autor);
    const texto = src?.texto?.[this._synthTemaId];
    if (!texto || !this._synthEditor) return;
    this._synthFuentes.add(autor);
    const esc = (s) => this._html.esc(s);
    const block = `<p><strong>${esc(src.autorLabel || src.autor)}</strong></p><blockquote>${texto}</blockquote>`;
    this._synthEditor.value = this._synthEditor.value ? `${this._synthEditor.value}${block}` : block;
    this._renderSynthSources();
  }

  _saveSynth() {
    const texto = this._synthEditor?.value || '';
    const plain = texto.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    if (!plain) {
      slice.events.emit('toast:show', { message: 'Escribí un texto antes de guardar la respuesta final.', type: 'warning' });
      return;
    }
    this._consenso().setSintesisTexto(this._synthTemaId, texto, [...this._synthFuentes]);
    this.$synthModal.open = false;
    this._render();
  }

  _clearSynth() {
    this._consenso().clearResolutionTexto(this._synthTemaId);
    this.$synthModal.open = false;
    this._render();
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
        <div class="tcc-section-head">
          <h3 class="tcc-section-title">${esc(tema.nombre)}</h3>
          <button class="btn btn-sm tcc-synth-open" type="button" data-tccsynth="${esc(tema.id)}">${slice.getComponent('IconProvider').svg('pen', 13)} ${final ? 'Editar' : 'Redactar'} respuesta final</button>
        </div>`;

      if (final) {
        const isSynth = !!final.esSintesis;
        const label = isSynth
          ? (consenso.descripcionTextoFinal(final) || 'Síntesis del equipo')
          : ((sources.find((s) => s.autor === final.autor)?.autorLabel) || final.autor);
        const editBtn = `<button class="linkish" data-tccact="edit-synth">Editar ${slice.getComponent('IconProvider').svg('pen', 12)}</button>`;
        html += `<div class="tcc-final-banner${isSynth ? ' tcc-final-banner--synth' : ''}" data-tema="${esc(tema.id)}">${slice.getComponent('IconProvider').svg('check', 14)} ${isSynth ? 'Final' : 'Elegida'}: <b>${esc(label)}</b> ${editBtn} <button class="linkish" data-tccact="clear-final">Quitar ${slice.getComponent('IconProvider').svg('x', 12)}</button></div>`;
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
              <button class="tcc-read" type="button" data-tccread="${esc(s.autor)}" title="Leer en pantalla completa">${slice.getComponent('IconProvider').svg('maximize-2', 14)}</button>
            </div>
            <div class="tcc-text tp-render">${this._html.sanitize(texto)}</div>
            <button class="btn btn-sm tcc-pick" data-tccpick="${esc(s.autor)}">${isFinal ? `${slice.getComponent('IconProvider').svg('check', 14)} Elegida` : 'Marcar como elegida'}</button>
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

    div.querySelectorAll('[data-tccsynth]').forEach((btn) => {
      btn.onclick = () => this._openSynth(btn.dataset.tccsynth);
    });

    div.querySelectorAll('[data-tccact="edit-synth"]').forEach((btn) => {
      btn.onclick = () => this._openSynth(temaId);
    });

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
