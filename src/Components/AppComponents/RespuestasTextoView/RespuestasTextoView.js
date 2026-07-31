// Manages a reconciled list of TextoCard Slice components via CarouselView.
// Mode toggle: grid (all at once), single (one at a time with arrows), columns.
import { SAVE_STATUS_MS, DEBOUNCE_SAVE_MS } from '../../../AppConfig.js';

export default class RespuestasTextoView extends HTMLElement {
  constructor(props) {
    super();
    slice.attachTemplate(this);
    this.$wrap = this.querySelector('.respuestas-texto-wrap');
    this.$modeToggle = this.querySelector('.rt-mode-toggle');
    this.$fs = this.querySelector('.rt-fs');
    this.$fsTitle = this.querySelector('.rt-fs__title');
    this.$fsClose = this.querySelector('.rt-fs__close');
    this.$fsFoot = this.querySelector('.rt-fs__foot');
    this.$fsEditorSlot = this.querySelector('.rt-fs__editor-slot');
    this._cards = new Map();
    this._fsEditor = null;
    this._fsTemaId = null;
    this._carousel = null;

    this.$fsClose.addEventListener('click', () => this._closeFs());
    this.$fs.addEventListener('click', (e) => { if (e.target === this.$fs) this._closeFs(); });
    this._onKeydown = (e) => {
      if (e.key === 'Escape' && !this.$fs.hidden) { e.preventDefault(); this._closeFs(); return; }
      if (e.key === 'Tab' && !this.$fs.hidden) this._trapFocus(e);
    };

    slice.controller.setComponentProps(this, props);
  }

  async init() {
    this._plantilla = slice.getComponent('PlantillaService');
    this._respuestas = slice.getComponent('RespuestasService');

    this._carousel = await slice.build('CarouselView', { mode: 'single' });
    this.$wrap.insertBefore(this._carousel, this.$fs);

    this._initModeToggle();

    document.addEventListener('keydown', this._onKeydown);
    await this._render();
    slice.context.watch('plantilla', this, () => this._render());
    slice.context.watch('respuestas', this, () => this._syncValues());
  }

  update() { this._render(); }

  beforeDestroy() {
    document.removeEventListener('keydown', this._onKeydown);
    document.body.style.overflow = '';
  }

  _initModeToggle() {
    this.$modeToggle.querySelector('[data-rtmode="single"]').classList.add('active');
    this.$modeToggle.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-rtmode]');
      if (!btn) return;
      const mode = btn.dataset.rtmode;
      this.$modeToggle.querySelectorAll('.rt-mode-btn').forEach((b) => b.classList.toggle('active', b === btn));
      this._carousel.mode = mode;
    });
  }

  async _render() {
    if (!this._carousel) return;
    const temas = this._plantilla.getTemasTexto();
    if (!temas.length) {
      this._clearCards();
      this._carousel.items = [];
      this.$modeToggle.hidden = true;
      return;
    }

    const texto = this._respuestas.getState().texto;
    const neededIds = new Set(temas.map((t) => t.id));

    for (const id of this._cards.keys()) {
      if (!neededIds.has(id)) {
        this._cards.get(id).remove();
        this._cards.delete(id);
      }
    }

    for (const tema of temas) {
      let card = this._cards.get(tema.id);
      if (!card) {
        card = await slice.build('TextoCard', {
          temaId: tema.id,
          nombre: tema.nombre,
          value: texto[tema.id] || '',
          onsave: (id, val) => this._respuestas.setTexto(id, val),
          onexpand: () => this._openFs(tema.id),
        });
        this._cards.set(tema.id, card);
      } else {
        card.nombre = tema.nombre;
        card.value = texto[tema.id] || '';
      }
    }

    this._carousel.items = [...this._cards.values()];
    this._carousel.refresh();
    this.$modeToggle.hidden = temas.length < 2;

    if (this._activeId && this._cards.has(this._activeId)) {
      const card = this._cards.get(this._activeId);
      card.focusEditor();
      card.setSelectionRange(this._activeSelStart, this._activeSelEnd);
    }
    this._activeId = null;
  }

  _clearCards() {
    for (const card of this._cards.values()) card.remove();
    this._cards.clear();
  }

  _syncValues() {
    const texto = this._respuestas.getState().texto;
    for (const [id, card] of this._cards) {
      const isActive = card.contains(document.activeElement);
      if (!isActive) {
        card.value = texto[id] || '';
      }
    }
  }

  // ── Fullscreen editor ────────────────────────────────────

  async _openFs(temaId) {
    const tema = this._plantilla.getTemaById(temaId);
    if (!tema) return;
    this._fsTemaId = temaId;
    this.$fsTitle.textContent = tema.nombre;

    if (!this._fsEditor) {
      this._fsEditor = await slice.build('EnhancedEditor', {
        placeholder: 'Escribe tu propuesta…',
        oninput: () => {
          this.$fsFoot.textContent = 'Escribiendo…';
          clearTimeout(this._fsSaveTimer);
          this._fsSaveTimer = setTimeout(() => this._saveFs(), DEBOUNCE_SAVE_MS);
        },
        onblur: () => this._saveFs(),
      });
      this._fsEditor.style.minHeight = '40vh';
      this.$fsEditorSlot.appendChild(this._fsEditor);
    }

    const val = this._respuestas.getState().texto[temaId] || '';
    this._fsEditor.value = val;
    this.$fsFoot.textContent = '';
    this.$fs.hidden = false;
    document.body.style.overflow = 'hidden';
    this._fsEditor.focus();
    this._fsEditor.setSelectionRange(val.length, val.length);
  }

  _saveFs() {
    if (!this._fsTemaId || !this._fsEditor) return;
    this._respuestas.setTexto(this._fsTemaId, this._fsEditor.value);
    this.$fsFoot.textContent = '✓ Guardado';
    clearTimeout(this._statusTimer);
    this._statusTimer = setTimeout(() => { if (!this.$fs.hidden) this.$fsFoot.textContent = ''; }, SAVE_STATUS_MS);
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

  _trapFocus(e) {
    const focusable = this.$fs.querySelectorAll('button, slice-enhancededitor, [tabindex]:not([tabindex="-1"])');
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
}

customElements.define('slice-respuestastextoview', RespuestasTextoView);
