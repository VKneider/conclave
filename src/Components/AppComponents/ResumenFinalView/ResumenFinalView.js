import { EXT_CONSENSO, EXT_BACKUP, SAVE_STATUS_MS, DEBOUNCE_SAVE_MS } from '../../../AppConfig.js';

export default class ResumenFinalView extends HTMLElement {
  constructor(props) {
    super();
    slice.attachTemplate(this);
    this.$root = this.querySelector('.resumen-view');
    this.$content = this.querySelector('#resumenContent');
    this.$viewHeaderSlot = this.querySelector('.viewheader-slot');
    this.$includeNotesCheckboxSlot = this.querySelector('#includeNotesCheckboxSlot');
    this.$shareBtnSlot = this.querySelector('#shareBtnSlot');
    this.$importBtnSlot = this.querySelector('#importBtnSlot');
    this.$importFile = this.querySelector('#importConclaveFile');
    this.$exportDropDownSlot = this.querySelector('#exportDropDownSlot');
    this.$backupImportFile = this.querySelector('#importBackupFile');
    this._STORE_KEY = 'conclave-notas-por-tema-v1';
    this._notesByTema = {};
    this._noteTimers = {};
    this._activeTemaId = null;
    slice.controller.setComponentProps(this, props);
  }

  async init() {
    this._html = slice.getComponent('HtmlService');
    this._roster = slice.getComponent('PlantillaService');
    this._consenso = slice.getComponent('ConsensoService');
    this._icons = slice.getComponent('IconProvider');

    const viewHeader = await slice.build('ViewHeader', { sliceId: 'rfViewHeader', title: 'Resumen del consenso final', subtitle: 'Todas las decisiones finales \u2014 asignaciones, votos, rankings y textos adoptados \u2014 en un solo vistazo.' });
    if (viewHeader instanceof Node) this.$viewHeaderSlot.appendChild(viewHeader);

    this.$includeNotesCheckbox = await slice.build('Checkbox', {
      label: 'Incluir notas',
      checked: true,
    });
    this._includeNotes = true;
    this.$includeNotesCheckbox.addEventListener('change', (e) => {
      this._includeNotes = !!e.target.checked;
    });
    this.$includeNotesCheckboxSlot.replaceWith(this.$includeNotesCheckbox);

    this.$shareBtn = await slice.build('Button', {
      value: 'Compartir decisiones',
      icon: { name: 'file-text' },
      variant: 'filled',
      onClick: () => this._openShareModal(),
    });
    this.$shareBtnSlot.replaceWith(this.$shareBtn);

    this.$importBtn = await slice.build('Button', {
      value: `Importar (${EXT_CONSENSO})`,
      icon: { name: 'folder-open' },
      variant: 'ghost',
      onClick: () => this.$importFile.click(),
    });
    this.$importBtnSlot.replaceWith(this.$importBtn);

    this.$importFile.accept = EXT_CONSENSO;
    this.$importFile.addEventListener('change', () => this._handleImportFile());

    this.$exportDropDown = await slice.build('DropDown', {
      label: 'Exportar / Backup',
      options: [
        { text: 'Descargar HTML', callback: () => this._consenso.exportHtml({ includeNotes: this._includeNotes, notesByTema: this._notesByTema }) },
        { text: 'Imprimir', callback: () => this._consenso.exportPrint({ includeNotes: this._includeNotes, notesByTema: this._notesByTema }) },
        { text: 'Exportar backup completo', callback: () => slice.getComponent('ExportService').downloadBackup() },
        { text: 'Importar backup', callback: () => this.$backupImportFile.click() }
      ]
    });
    this.$exportDropDownSlot.replaceWith(this.$exportDropDown);

    this.$backupImportFile.accept = EXT_BACKUP;
    this.$backupImportFile.addEventListener('change', () => this._handleImportBackup());

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
      this._setNoteStatus(temaId, '\u2713 Guardado');
      setTimeout(() => this._setNoteStatus(temaId, ''), SAVE_STATUS_MS);
    };
    if (immediate) run();
    else this._noteTimers[temaId] = setTimeout(run, DEBOUNCE_SAVE_MS);
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
      title: 'Notas del resumen',
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

  _openShareModal() {
    const modal = slice.getComponent('shareConsensoModal');
    if (modal?.show) modal.show();
  }

  _handleImportBackup() {
    const file = this.$backupImportFile.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!data || data.tipo !== 'backup' || !data.plantilla) {
          slice.getComponent('ToastProvider')?.show?.('El archivo no contiene un backup v\u00E1lido.', { type: 'error' });
          return;
        }

        const p = data.plantilla;
        const resumen = [];
        if (p.temas?.length) resumen.push(`${p.temas.length} temas`);
        if (p.opciones?.length) resumen.push(`${p.opciones.length} opciones`);
        if (data.respuestasImportadas?.length) resumen.push(`${data.respuestasImportadas.length} participantes`);
        if (data.decisionFinal) {
          const d = data.decisionFinal;
          const totalDecisions = Object.keys(d.seleccion || {}).length + Object.keys(d.voto || {}).length
            + Object.keys(d.ranking || {}).length + Object.keys(d.texto || {}).length;
          if (totalDecisions) resumen.push(`${totalDecisions} decisiones`);
        }

        slice.events.emit('confirm:request', {
          title: `Restaurar backup: ${p.nombre || 'sin nombre'}`,
          message: `Esto reemplazar\u00E1 toda la informaci\u00F3n actual: ${resumen.join(', ')}.\n\nLos datos actuales se perder\u00E1n. \u00BFContinuar?`,
          confirmLabel: 'Restaurar',
          danger: true,
          onConfirm: () => {
            try {
              const roster = slice.getComponent('PlantillaService');
              roster.loadFromData(p.temas || [], p.opciones || [], p.nombre, p.atributos, p.creadoPor, p.creadoEmail);

              if (data.respuestas) {
                slice.getComponent('RespuestasService').importMine(data.respuestas);
              }

              if (data.respuestasImportadas) {
                slice.context.setState('respuestasImportadas', () => data.respuestasImportadas);
              }

              if (data.decisionFinal) {
                this._consenso.importState(data.decisionFinal);
              }

              if (data.notas && typeof data.notas === 'object') {
                this._consenso._saveNotes(data.notas);
                this._loadNotes();
              }

              slice.events.emit('toast:show', { message: 'Backup restaurado correctamente', type: 'success', duration: 4000 });
            } catch (_err) {
              slice.events.emit('toast:show', { message: 'Error al restaurar el backup.', type: 'error' });
            }
          },
        });
      } catch {
        slice.getComponent('ToastProvider')?.show?.('Error al leer el archivo.', { type: 'error' });
      }
    };
    reader.readAsText(file);
    this.$backupImportFile.value = '';
  }

  _handleImportFile() {
    const file = this.$importFile.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        const prevNotes = { ...this._notesByTema };
        const result = this._consenso.importState(data);
        this._loadNotes();
        const notesChanged = JSON.stringify(prevNotes) !== JSON.stringify(this._notesByTema);
        if (result.ok) {
          let msg = result.ignored > 0
            ? `Decisiones importadas (${result.recognized} reconocidas, ${result.ignored} ignoradas por no coincidir con la plantilla actual)`
            : `Decisiones finales importadas (${result.recognized} entradas)`;
          if (notesChanged) msg += ' · Notas restauradas';
          slice.getComponent('ToastProvider')?.show?.(msg, { type: 'success', duration: 4000 });
          this._render();
        } else {
          slice.getComponent('ToastProvider')?.show?.('El archivo no contiene datos de consenso v\u00e1lidos.', { type: 'error' });
        }
      } catch {
        slice.getComponent('ToastProvider')?.show?.('Error al leer el archivo.', { type: 'error' });
      }
    };
    reader.readAsText(file);
    this.$importFile.value = '';
  }

  beforeDestroy() {
    Object.values(this._noteTimers).forEach((t) => clearTimeout(t));
    document.body.style.overflow = '';
    if (this._fullscreen) {
      const topbar = slice.getComponent('appTopbar');
      if (topbar) topbar.show();
    }
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
      body = '<div class="rf-empty">No hay decisiones finales de asignaci\u00F3n.</div>';
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
      const autor = entry ? this._consenso.descripcionTextoFinal(entry) : null;
      return '<div class="rf-card"><div class="rf-card__title">' + this._html.esc(tema.nombre) + '</div>' + (entry?.texto ? '<div class="rf-card__body"><div class="rf-quote tp-render">' + this._html.sanitize(entry.texto) + '<span class="rf-quote__autor">\u2014 ' + this._html.esc(autor || '') + '</span></div></div>' : '<div class="rf-card__body rf-empty">Sin texto adoptado</div>') + '</div>';
    }).join('');

    return '<div class="rf-section"><h3 class="rf-section__title">Texto libre</h3><div class="rf-card-list">' + cards + '</div></div>';
  }
}

customElements.define('slice-resumenfinalview', ResumenFinalView);
