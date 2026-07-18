import { ACCEPT_ALL } from '../../Core/AppConfig/AppConfig.js';

export default class ResumenFinalView extends HTMLElement {
  constructor(props) {
    super();
    slice.attachTemplate(this);
    this.$root = this.querySelector('.resumen-view');
    this.$content = this.querySelector('#resumenContent');
    this.$exportHtmlSlot = this.querySelector('#exportHtmlBtnSlot');
    this.$exportPrintBtnSlot = this.querySelector('#exportPrintBtnSlot');
    this.$includeNotesCheckboxSlot = this.querySelector('#includeNotesCheckboxSlot');
    this.$jsonDropDownSlot = this.querySelector('#jsonDropDownSlot');
    this.$importFile = this.querySelector('#importJsonFile');
    this._STORE_KEY = 'conclave-notas-por-tema-v1';
    this._notesByTema = {};
    this._noteTimers = {};
    this._activeTemaId = null;
    slice.controller.setComponentProps(this, props);
  }

  async init() {
    this.$importFile.accept = ACCEPT_ALL;
    this._html = slice.getComponent('HtmlService');
    this._roster = slice.getComponent('PlantillaService');
    this._consenso = slice.getComponent('ConsensoService');

    this.$exportHtml = await slice.build('Button', {
      value: 'Descargar HTML',
      variant: 'filled',
      onClick: () => this._consenso.exportHtml({ includeNotes: this._includeNotes, notesByTema: this._notesByTema })
    });
    this.$exportHtmlSlot.replaceWith(this.$exportHtml);

    this.$exportPrint = await slice.build('Button', {
      value: '\uD83D\uDDA8 Imprimir',
      variant: 'filled',
      onClick: () => this._consenso.exportPrint({ includeNotes: this._includeNotes, notesByTema: this._notesByTema })
    });
    this.$exportPrintBtnSlot.replaceWith(this.$exportPrint);

    this.$includeNotesCheckbox = await slice.build('Checkbox', {
      label: 'Incluir notas',
      checked: true,
    });
    this.$includeNotes = true;
    this.$includeNotesCheckbox.addEventListener('change', (e) => {
      this._includeNotes = !!e.target.checked;
    });
    this.$includeNotesCheckboxSlot.replaceWith(this.$includeNotesCheckbox);

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

    this._notesModal = await slice.build('CompareNotesModal', { sliceId: 'rfNotesModal' });
    this.$root.appendChild(this._notesModal);
    this._loadNotes();
    this._notesModal.fab?.addEventListener('click', () => this._openNotesModal());

    slice.context.watch('decisionFinal', this, () => this._render());
    slice.context.watch('plantilla', this, () => this._render());
    this._render();
  }

  update() { this._render(); }

  _loadNotes() {
    const raw = localStorage.getItem(this._STORE_KEY);
    if (!raw) {
      const legacy = localStorage.getItem('conclave-notas-v1');
      if (legacy) this._notesByTema = { __global__: legacy };
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        this._notesByTema = parsed;
        return;
      }
    } catch {
      this._notesByTema = {};
    }
    this._notesByTema = { __global__: raw };
  }

  _setNoteStatus(temaId, text) {
    this._notesModal?.setStatus?.(temaId, text);
  }

  _saveNote(temaId, immediate = false) {
    if (this._noteTimers[temaId]) clearTimeout(this._noteTimers[temaId]);
    const run = () => {
      localStorage.setItem(this._STORE_KEY, JSON.stringify(this._notesByTema));
      this._setNoteStatus(temaId, '✓ Guardado');
      setTimeout(() => this._setNoteStatus(temaId, ''), 1200);
    };
    if (immediate) run();
    else this._noteTimers[temaId] = setTimeout(run, 350);
  }

  _noteTemas() {
    const temas = this._roster.getTemas();
    if (!temas.length) return [{ id: '__global__', nombre: 'Notas generales' }];
    return [{ id: '__global__', nombre: 'Notas generales' }, ...temas];
  }

  async _openNotesModal() {
    const temas = this._noteTemas();
    if (!temas.some((t) => String(t.id) === String(this._activeTemaId))) this._activeTemaId = temas[0].id;
    await this._notesModal.show({
      title: '📝 Notas del resumen',
      temas,
      notesByTema: this._notesByTema,
      currentTemaId: this._activeTemaId,
      onTemaChange: (temaId) => { this._activeTemaId = temaId; },
      onInput: (temaId, value) => {
        this._notesByTema[temaId] = value;
        this._setNoteStatus(temaId, 'Guardando...');
        this._saveNote(temaId);
      },
      onBlur: (temaId, value) => {
        this._notesByTema[temaId] = value;
        this._saveNote(temaId, true);
      },
    });
  }

  beforeDestroy() {
    Object.values(this._noteTimers).forEach((t) => clearTimeout(t));
    document.body.style.overflow = '';
    if (this._fullscreen) {
      const topbar = slice.getComponent('appTopbar');
      if (topbar) topbar.show();
    }
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
      return '<div class="rf-card"><div class="rf-card__title">' + this._html.esc(tema.nombre) + '</div>' + (entry?.texto ? '<div class="rf-card__body"><div class="rf-quote tp-render">' + this._html.sanitize(entry.texto) + '<span class="rf-quote__autor">\u2014 ' + this._html.esc(entry.autor || '') + '</span></div></div>' : '<div class="rf-card__body rf-empty">Sin texto adoptado</div>') + '</div>';
    }).join('');

    return '<div class="rf-section"><h3 class="rf-section__title">Texto libre</h3><div class="rf-card-list">' + cards + '</div></div>';
  }
}

customElements.define('slice-resumenfinalview', ResumenFinalView);
