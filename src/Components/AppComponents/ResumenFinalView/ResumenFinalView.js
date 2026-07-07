export default class ResumenFinalView extends HTMLElement {
  constructor(props) {
    super();
    slice.attachTemplate(this);
    this.$root = this.querySelector('.resumen-view');
    this.$content = this.querySelector('#resumenContent');
    this.$exportHtmlSlot = this.querySelector('#exportHtmlBtnSlot');
    this.$exportPrintBtnSlot = this.querySelector('#exportPrintBtnSlot');
    this.$jsonDropDownSlot = this.querySelector('#jsonDropDownSlot');
    this.$importFile = this.querySelector('#importJsonFile');
    slice.controller.setComponentProps(this, props);
  }

  async init() {
    this._html = slice.getComponent('HtmlService');
    this._roster = slice.getComponent('PlantillaService');
    this._consenso = slice.getComponent('ConsensoService');

    this.$exportHtml = await slice.build('Button', {
      value: 'Descargar HTML',
      variant: 'filled',
      onClick: () => this._consenso.exportHtml()
    });
    this.$exportHtmlSlot.replaceWith(this.$exportHtml);

    this.$exportPrint = await slice.build('Button', {
      value: '\uD83D\uDDA8 Imprimir',
      variant: 'filled',
      onClick: () => this._consenso.exportPrint()
    });
    this.$exportPrintBtnSlot.replaceWith(this.$exportPrint);

    this.$jsonDropDown = await slice.build('DropDown', {
      sliceId: 'jsonDropDown',
      label: 'Archivo',
      options: [
        { text: '\uD83D\uDCC2 Cargar respuestas guardadas', callback: () => { this.$importFile.click(); } },
        { text: '\u2B07 Guardar respuestas en archivo', callback: () => this._consenso.exportStateJson() }
      ]
    });
    this.$jsonDropDownSlot.replaceWith(this.$jsonDropDown);

    this.$importFile.addEventListener('change', () => this._handleImportFile());

    this._initNotes();

    slice.context.watch('decisionFinal', this, () => this._render());
    slice.context.watch('plantilla', this, () => this._render());
    this._render();
  }

  update() { this._render(); }

  _initNotes() {
    const STORE_KEY = 'conclave-notas-v1';
    this.$notesFab = this.$root.querySelector('[data-notes-fab]');
    this.$notesOverlay = this.$root.querySelector('[data-notes-overlay]');
    this.$notesTextarea = this.$root.querySelector('[data-notes-textarea]');
    this.$notesStatus = this.$root.querySelector('.rf-notes-foot > span');
    this.$notesClose = this.$root.querySelector('[data-notes-close]');

    const saved = localStorage.getItem(STORE_KEY);
    if (saved) this.$notesTextarea.value = saved;

    this.$notesFab.addEventListener('click', () => {
      this.$notesOverlay.hidden = false;
      this.$notesTextarea.focus();
      this.$notesTextarea.setSelectionRange(this.$notesTextarea.value.length, this.$notesTextarea.value.length);
      document.body.style.overflow = 'hidden';
    });

    this._closeNotes = () => {
      this.$notesOverlay.hidden = true;
      document.body.style.overflow = '';
      this._saveNotes();
    };
    this.$notesClose.addEventListener('click', this._closeNotes);
    this.$notesOverlay.addEventListener('click', (e) => { if (e.target === this.$notesOverlay) this._closeNotes(); });

    this._notesTimer = null;
    this.$notesTextarea.addEventListener('input', () => {
      this.$notesStatus.textContent = 'Guardando…';
      clearTimeout(this._notesTimer);
      this._notesTimer = setTimeout(() => this._saveNotes(), 400);
    });
    this._onNotesKeydown = (e) => {
      if (e.key === 'Escape' && !this.$notesOverlay.hidden) { e.preventDefault(); this._closeNotes(); }
    };
    document.addEventListener('keydown', this._onNotesKeydown);
  }

  _saveNotes() {
    localStorage.setItem('conclave-notas-v1', this.$notesTextarea.value);
    this.$notesStatus.textContent = '✓ Guardado';
    setTimeout(() => { if (!this.$notesOverlay.hidden) this.$notesStatus.textContent = ''; }, 1500);
  }

  beforeDestroy() {
    document.removeEventListener('keydown', this._onNotesKeydown);
    clearTimeout(this._notesTimer);
    document.body.style.overflow = '';
  }

  _handleImportFile() {
    const file = this.$importFile.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        const ok = this._consenso.importState(data);
        if (ok) {
          slice.getComponent('ToastProvider')?.show?.('Estado de consenso importado', { type: 'success' });
        } else {
          slice.getComponent('ToastProvider')?.show?.('El archivo no contiene datos de consenso v\u00e1lidos.', { type: 'error' });
        }
      } catch (err) {
        slice.getComponent('ToastProvider')?.show?.('Error al leer el archivo.', { type: 'error' });
      }
    };
    reader.readAsText(file);
    this.$importFile.value = '';
  }

  _render() {
    const temas = this._roster.getTemas();
    const consenso = this._consenso.getState();
    const html = [];
    const sections = [];

    sections.push(this._renderReparto(temas, consenso));
    sections.push(this._renderVotacion(temas, consenso));
    sections.push(this._renderRanking(temas, consenso));
    sections.push(this._renderTexto(temas, consenso));

    sections.forEach((s) => { if (s) html.push(s); });
    this.$content.innerHTML = this._html.sanitize(html.join(''));
  }

  _renderReparto(temas, consenso) {
    const repartoTemas = temas.filter((t) => t.modo === 'reparto');
    if (!repartoTemas.length) return '';
    const sel = consenso.seleccion || {};
    const opcionesConTema = Object.entries(sel).filter(([, temaId]) => repartoTemas.some((t) => t.id === temaId));

    let body;
    if (!opcionesConTema.length) {
      body = '<div class="rf-empty">No hay decisiones finales de asignaci\u00f3n.</div>';
    } else {
      const rows = opcionesConTema.map(([opcionId, temaId]) => {
        const opcion = this._roster.getOpcionById(opcionId);
        const tema = repartoTemas.find((t) => t.id === temaId);
        return `<tr><td>${this._html.esc(opcion?.nombre || opcionId)}</td><td>${this._html.esc(tema?.nombre || temaId)}</td></tr>`;
      }).join('');
      body = '<table class="rf-table"><thead><tr><th>Persona</th><th>Asignado a</th></tr></thead><tbody>' + rows + '</tbody></table>';
    }

    return '<div class="rf-section"><h3 class="rf-section__title">Asignaciones</h3>' + body + '</div>';
  }

  _renderVotacion(temas, consenso) {
    const votacionTemas = temas.filter((t) => t.modo === 'votacion');
    if (!votacionTemas.length) return '';
    const voto = consenso.voto || {};

    const cards = votacionTemas.map((tema) => {
      const finalOpcionId = voto[tema.id];
      const opcion = finalOpcionId ? this._roster.getOpcionById(finalOpcionId) : null;
      return '<div class="rf-card"><div class="rf-card__title">' + this._html.esc(tema.nombre) + '</div><div class="rf-card__body">' + (opcion ? '<b>' + this._html.esc(opcion.nombre) + '</b>' : '<span class="rf-empty">Sin decidir</span>') + '</div></div>';
    }).join('');

    return '<div class="rf-section"><h3 class="rf-section__title">Votaciones</h3><div class="rf-card-list">' + cards + '</div></div>';
  }

  _renderRanking(temas, consenso) {
    const rankingTemas = temas.filter((t) => t.modo === 'ranking');
    if (!rankingTemas.length) return '';
    const ranking = consenso.ranking || {};

    const cards = rankingTemas.map((tema) => {
      const order = ranking[tema.id];
      if (!Array.isArray(order) || !order.length) {
        return '<div class="rf-card"><div class="rf-card__title">' + this._html.esc(tema.nombre) + '</div><div class="rf-card__body rf-empty">Sin orden final</div></div>';
      }
      const items = order.map((id, idx) => {
        const opcion = this._roster.getOpcionById(id);
        return '<li class="rf-rank-item"><span class="rf-rank-pos">' + (idx + 1) + '</span><span>' + this._html.esc(opcion?.nombre || id) + '</span></li>';
      }).join('');
      return '<div class="rf-card"><div class="rf-card__title">' + this._html.esc(tema.nombre) + '</div><ol class="rf-rank-list">' + items + '</ol></div>';
    }).join('');

    return '<div class="rf-section"><h3 class="rf-section__title">Rankings</h3><div class="rf-card-list">' + cards + '</div></div>';
  }

  _renderTexto(temas, consenso) {
    const textoTemas = temas.filter((t) => t.modo === 'texto_libre');
    if (!textoTemas.length) return '';
    const texto = consenso.texto || {};

    const cards = textoTemas.map((tema) => {
      const entry = texto[tema.id];
      return '<div class="rf-card"><div class="rf-card__title">' + this._html.esc(tema.nombre) + '</div>' + (entry?.texto ? '<div class="rf-card__body"><p class="rf-quote">' + this._html.esc(entry.texto) + '<span class="rf-quote__autor">\u2014 ' + this._html.esc(entry.autor || '') + '</span></p></div>' : '<div class="rf-card__body rf-empty">Sin texto adoptado</div>') + '</div>';
    }).join('');

    return '<div class="rf-section"><h3 class="rf-section__title">Texto libre</h3><div class="rf-card-list">' + cards + '</div></div>';
  }
}

customElements.define('slice-resumenfinalview', ResumenFinalView);
