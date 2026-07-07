const COLORS = ['#6d8bff', '#3fb964', '#e2a13a', '#ff7eb6', '#8a6dff', '#42c8c0', '#e25c5c', '#b9c34a'];

function csvCell(v) {
  const s = String(v == null ? '' : v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

export default class CompareView extends HTMLElement {
  constructor(props) {
    super();
    slice.attachTemplate(this);
    this.$root = this.querySelector('.compare-view');
    this.sources = [];
    this.cmpFilter = 'all';
    this.cmpService = '';
    this.cmpQuery = '';
    this.cmpMode = 'table';
    this.cmpView = 'opcion';
    this.cmpKind = 'seleccion';
    this._anonMode = false;
    this._revealedSources = new Set();
    this._STORE_KEY = 'conclave-notas-v1';
    slice.controller.setComponentProps(this, props);
  }

  async init() {
    this._roster = slice.getComponent('PlantillaService');
    this._imports = slice.getComponent('RespuestasImportService');
    this._html = slice.getComponent('HtmlService');
    this.sources = this._imports.getSources();

    const importDrop = await slice.build('ImportDrop', { sliceId: 'cmp-import' });
    importDrop.onFiles = (files) => this._handleFiles(files);
    this.querySelector('.cmp-import-slot').appendChild(importDrop);

    this._buildUrlImport();

    this._finalTally = await slice.build('FinalTally', { sliceId: 'cmp-finaltally' });
    this.querySelector('.cmp-finaltally-slot').appendChild(this._finalTally);

    this._carousel = await slice.build('CompareCarousel', { sliceId: 'cmp-carousel' });
    this.$root.querySelector('.cmp-carousel-mount').appendChild(this._carousel);

    this._textCards = await slice.build('TextCompareCards', {
      sliceId: 'cmp-textcards',
      sources: this._buildComparisonSources(),
    });
    this.$root.querySelector('.cmp-text-mount').appendChild(this._textCards);

    // Built once, shared by _renderOpcionView/_renderTemaView (which one is
    // visible toggles, but both use the same cmpQuery/search behavior) —
    // never regenerated, unlike the table below it, so it survives every
    // keystroke without the focus-loss dance a re-templated <input> needs.
    this.$searchInput = await slice.build('Input', { sliceId: 'cmp-search', placeholder: 'Buscar…' });
    this.$root.querySelector('.cmp-search-slot').appendChild(this.$searchInput);
    this.$searchInput.addEventListener('input', () => { this.cmpQuery = this.$searchInput.value; this._render(); });

    this._kindTabsCmp = await slice.build('Tabs', {
      sliceId: 'cmp-kind-tabs',
      variant: 'primary',
      items: [{ id: 'seleccion', label: '🎯 Asignación' }, { id: 'votacion', label: '🗳️ Votación' }, { id: 'ranking', label: '🏆 Ranking' }, { id: 'texto', label: '📝 Texto libre' }],
      activeTab: this.cmpKind,
      onChange: (id) => { this.cmpKind = id; this._render(); },
    });
    if (this._kindTabsCmp instanceof Node) this.$root.querySelector('.cmp-kind-tabs').appendChild(this._kindTabsCmp);

    this._modeTabsCmp = await slice.build('Tabs', {
      sliceId: 'cmp-mode-tabs',
      variant: 'secondary',
      items: [{ id: 'table', label: '📋 Tabla' }, { id: 'carousel', label: '🔄 Carrusel' }],
      activeTab: this.cmpMode,
      onChange: (id) => { this.cmpMode = id; this._render(); },
    });
    if (this._modeTabsCmp instanceof Node) this.$root.querySelector('.cmp-mode-tabs').appendChild(this._modeTabsCmp);

    this._fsBtn = await slice.build('Button', {
      sliceId: 'cmp-fs-btn',
      value: '⛶ Enfocar',
      variant: 'filled',
      onClick: () => {
        this._fullscreen = !this._fullscreen;
        this.$root.classList.toggle('cmp-fullscreen', this._fullscreen);
        this._fsBtn.value = this._fullscreen ? '✕ Salir' : '⛶ Enfocar';
      },
    });
    this.$root.querySelector('.cmp-fs-slot').appendChild(this._fsBtn);
    this._onFsKeydown = (e) => {
      if (e.key === 'Escape' && this._fullscreen) {
        this._fullscreen = false;
        this.$root.classList.remove('cmp-fullscreen');
        this._fsBtn.value = '⛶ Enfocar';
      }
    };
    document.addEventListener('keydown', this._onFsKeydown);

    // Votación comparison: pick/clear the final decision per tema (delegated on
    // the mount so it survives the innerHTML repaints of _renderVotacion).
    this.$root.querySelector('.cmp-votacion-mount').addEventListener('click', (e) => {
      const consenso = slice.getComponent('ConsensoService');
      const pick = e.target.closest('[data-vt-pick]');
      if (pick) {
        const { tema, opcion } = pick.dataset;
        if (String(consenso.finalVotoFor(tema)) === String(opcion)) consenso.clearResolutionVoto(tema);
        else consenso.setResolutionVoto(tema, opcion);
        return;
      }
      const clear = e.target.closest('[data-vt-clear]');
      if (clear) consenso.clearResolutionVoto(clear.dataset.tema);
    });

    // Ranking comparison: adopt the majority (Borda) order as final, or clear.
    this.$root.querySelector('.cmp-ranking-mount').addEventListener('click', (e) => {
      const consenso = slice.getComponent('ConsensoService');
      const adopt = e.target.closest('[data-rk-adopt]');
      if (adopt) {
        consenso.setResolutionRanking(adopt.dataset.rkAdopt, adopt.dataset.rkOrder.split(',').filter(Boolean));
        return;
      }
      const clear = e.target.closest('[data-rk-clear]');
      if (clear) consenso.clearResolutionRanking(clear.dataset.rkClear);
    });

    await this._initNotes();

    this._anonSwitch = await slice.build('Switch', {
      sliceId: 'cmp-anon',
      label: '👤 Identificado',
      checked: false,
      labelPlacement: 'left',
      onChange: (checked) => {
        this._anonMode = checked;
        this._revealedSources.clear();
        this._render();
      },
    });
    this.querySelector('.source-list').after(this._anonSwitch);

    // Watch imported sources BEFORE the first _render() so TextCompareCards
    // receives populated data on its first render, not an empty array.
    slice.context.watch('respuestasImportadas', this, (sources) => { this.sources = sources; this._render(); });

    await this._render();
    slice.context.watch('respuestas', this, () => this._render());
    slice.context.watch('decisionFinal', this, () => this._render());
    slice.context.watch('plantilla', this, () => this._render());
  }

  update() {
    this._render();
  }

  _buildComparisonSources() {
    const settings = slice.getComponent('SettingsService').getState();
    const myResp = slice.getComponent('RespuestasService').getState();
    const mine = {
      autor: `${settings.autor || 'Yo'} (actual)`,
      color: COLORS[0],
      asignaciones: myResp.seleccion,
      texto: myResp.texto,
      voto: myResp.voto || {},
      ranking: myResp.ranking || {},
      removable: false,
    };
    const imported = this.sources.map((s, i) => ({
      autor: s.autor,
      asignaciones: s.respuestas.seleccion,
      texto: s.respuestas.texto || {},
      voto: s.respuestas.voto || {},
      ranking: s.respuestas.ranking || {},
      color: COLORS[(i + 1) % COLORS.length],
      removable: true,
    }));
    const all = [mine, ...imported];
    this._anonLabels = {};
    all.forEach((src, i) => { this._anonLabels[src.autor] = `Participante ${i + 1}`; });
    return all;
  }

  _displayName(srcAutor) {
    if (!this._anonMode) return srcAutor;
    if (this._revealedSources.has(srcAutor)) return srcAutor;
    return this._anonLabels[srcAutor] || srcAutor;
  }

  async _initNotes() {
    this.$notesFab = this.$root.querySelector('[data-notes-fab]');
    this.$notesOverlay = this.$root.querySelector('[data-notes-overlay]');
    this.$notesEditorSlot = this.$root.querySelector('[data-notes-editor]');
    this.$notesEditor = await slice.build('EnhancedEditor', {
      placeholder: 'Escribí tus observaciones, acuerdos o dudas a medida que comparás las respuestas…',
    });
    this.$notesEditorSlot.appendChild(this.$notesEditor);
    this.$notesStatus = this.$root.querySelector('.cmp-notes-foot > span');
    this.$notesClose = this.$root.querySelector('[data-notes-close]');

    const saved = localStorage.getItem(this._STORE_KEY);
    if (saved) this.$notesEditor.value = saved;

    this.$notesFab.addEventListener('click', () => {
      this.$notesOverlay.hidden = false;
      this.$notesEditor.focus();
      this.$notesEditor.setSelectionRange(this.$notesEditor.value.length, this.$notesEditor.value.length);
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
    this.$notesEditor.oninput = () => {
      this.$notesStatus.textContent = 'Guardando…';
      clearTimeout(this._notesTimer);
      this._notesTimer = setTimeout(() => this._saveNotes(), 400);
    };
    this.$notesEditor.onblur = () => this._saveNotes();
    this._onNotesKeydown = (e) => {
      if (e.key === 'Escape' && !this.$notesOverlay.hidden) { e.preventDefault(); this._closeNotes(); }
    };
    document.addEventListener('keydown', this._onNotesKeydown);
  }

  beforeDestroy() {
    document.removeEventListener('keydown', this._onNotesKeydown);
    document.removeEventListener('keydown', this._onFsKeydown);
    clearTimeout(this._notesTimer);
    document.body.style.overflow = '';
  }

  _saveNotes() {
    localStorage.setItem(this._STORE_KEY, this.$notesEditor.value);
    this.$notesStatus.textContent = '✓ Guardado';
    setTimeout(() => { if (!this.$notesOverlay.hidden) this.$notesStatus.textContent = ''; }, 1500);
  }

  _buildRows(all) {
    return this._roster.getOpcionesDisponibles().map((opcion) => {
      const vals = all.map((src) => src.asignaciones[opcion.id] || null);
      const nonNull = vals.filter(Boolean);
      const uniq = new Set(nonNull);
      let status;
      if (nonNull.length === 0) status = 'none';
      else if (nonNull.length < all.length) status = 'partial';
      else if (uniq.size === 1) status = 'agree';
      else status = 'disagree';
      return { opcion, vals, status };
    });
  }

  _buildTemaRows(all) {
    const temas = this._roster.getTemasParticipables();
    return temas.map((tema) => {
      const vals = all.map((src) => {
        const opciones = [];
        Object.keys(src.asignaciones).forEach((opcionId) => {
          if (src.asignaciones[opcionId] === tema.id) {
            const m = this._roster.getOpcionById(opcionId);
            if (m) opciones.push(m);
          }
        });
        return opciones;
      });
      return { tema, vals };
    });
  }

  _autoResolveAgreed(rows) {
    const resolution = slice.getComponent('ConsensoService');
    const updates = {};
    rows.forEach((row) => {
      if (row.status !== 'agree') return;
      if (resolution.hasResolution(row.opcion.id)) return;
      const agreedTema = row.vals.find(Boolean);
      if (agreedTema) updates[row.opcion.id] = agreedTema;
    });
    const keys = Object.keys(updates);
    if (!keys.length) return;
    keys.forEach((id) => resolution.setResolution(id, updates[id]));
  }

  // Per-tema vote tally + majority + manual-override final decision. Plain
  // HTML (no nested Slice components) → innerHTML is the right tool; the
  // pick/clear clicks are delegated on the mount (wired once in init).
  _renderVotacion(all) {
    const consenso = slice.getComponent('ConsensoService');
    const q = this.cmpQuery?.toLowerCase().trim();
    const temas = this._roster.getTemasVotacion().filter((t) => !q || t.nombre.toLowerCase().includes(q));
    const esc = (s) => this._html.esc(s);
    const mount = this.$root.querySelector('.cmp-votacion-mount');

    if (!temas.length) {
      mount.innerHTML = this._html.sanitize('<div class="empty-state">No hay temas de votación en esta Plantilla.</div>');
      return;
    }

    const html = temas.map((tema) => {
      const opciones = this._roster.getOpcionesDeTema(tema.id);
      const counts = {};
      const voters = {};
      opciones.forEach((o) => { counts[String(o.id)] = 0; voters[String(o.id)] = []; });
      all.forEach((src) => {
        const v = src.voto?.[tema.id];
        if (v != null && counts[String(v)] !== undefined) { counts[String(v)]++; voters[String(v)].push(this._displayName(src.autor)); }
      });
      const totalVotes = Object.values(counts).reduce((a, b) => a + b, 0);
      let majId = null, majN = 0;
      opciones.forEach((o) => { const n = counts[String(o.id)]; if (n > majN) { majN = n; majId = String(o.id); } });
      const manual = consenso.finalVotoFor(tema.id);
      const effectiveFinal = manual != null ? String(manual) : (majN > 0 ? majId : null);

      const opcHtml = opciones.length
        ? opciones.map((o) => {
            const n = counts[String(o.id)];
            const pct = totalVotes ? Math.round((n / totalVotes) * 100) : 0;
            const isFinal = effectiveFinal != null && String(o.id) === effectiveFinal;
            const voterHtml = voters[String(o.id)].length
              ? `<span class="cmp-vt-voters">${voters[String(o.id)].map((name) => `<span class="cmp-vt-voter">${esc(name)}</span>`).join(', ')}</span>`
              : '';
            return `<div class="cmp-vt-opc${isFinal ? ' cmp-vt-opc--final' : ''}">
              <button class="cmp-vt-star" type="button" data-vt-pick data-tema="${esc(tema.id)}" data-opcion="${esc(o.id)}" title="Marcar como decisión final">${isFinal ? '★' : '☆'}</button>
              <span class="cmp-vt-name">${esc(o.nombre)}</span>
              <span class="cmp-vt-bar"><span class="cmp-vt-bar__fill" style="width:${pct}%"></span></span>
              <span class="cmp-vt-count">${n}</span>
              ${voterHtml}
            </div>`;
          }).join('')
        : '<div class="cmp-vt-noopc">Este tema no tiene opciones cargadas.</div>';

      const finalName = effectiveFinal != null ? opciones.find((o) => String(o.id) === effectiveFinal)?.nombre : null;
      const banner = finalName != null
        ? `<div class="cmp-vt-final">✓ Final: <b>${esc(finalName)}</b>${manual == null ? ' <span class="cmp-vt-auto">(mayoría)</span>' : ` <button class="linkish" data-vt-clear data-tema="${esc(tema.id)}">Quitar ✕</button>`}</div>`
        : '<div class="cmp-vt-final cmp-vt-final--none">Sin votos todavía</div>';

      return `<div class="cmp-vt-card">
        <h3 class="cmp-vt-title">🗳️ ${esc(tema.nombre)} <span class="cmp-vt-total">${totalVotes} voto${totalVotes !== 1 ? 's' : ''}</span></h3>
        <div class="cmp-vt-opciones">${opcHtml}</div>
        ${banner}
      </div>`;
    }).join('');

    mount.innerHTML = this._html.sanitize(html);
  }

  // Per-tema Borda aggregation of everyone's ranking: each source's order gives
  // (n-1-position) points per opción; the aggregate order sorts by total points.
  // The organizer can adopt that order as the final decision, or clear it.
  _renderRanking(all) {
    const consenso = slice.getComponent('ConsensoService');
    const q = this.cmpQuery?.toLowerCase().trim();
    const temas = this._roster.getTemasRanking().filter((t) => !q || t.nombre.toLowerCase().includes(q));
    const esc = (s) => this._html.esc(s);
    const mount = this.$root.querySelector('.cmp-ranking-mount');

    if (!temas.length) {
      mount.innerHTML = this._html.sanitize('<div class="empty-state">No hay temas de ranking en esta Plantilla.</div>');
      return;
    }

    const html = temas.map((tema) => {
      const opciones = this._roster.getOpcionesDeTema(tema.id);
      const byId = {}; opciones.forEach((o) => { byId[String(o.id)] = o; });
      const opcIds = opciones.map((o) => String(o.id));
      const points = {}; opcIds.forEach((id) => { points[id] = 0; });
      const rankers = {}; opcIds.forEach((id) => { rankers[id] = []; });
      let nSources = 0;
      all.forEach((src) => {
        const r = src.ranking?.[tema.id];
        if (!Array.isArray(r) || !r.length) return;
        const order = r.map(String).filter((id) => opcIds.includes(id));
        if (!order.length) return;
        nSources++;
        order.forEach((id, idx) => {
          points[id] += (order.length - 1 - idx);
          rankers[id].push({ autor: this._displayName(src.autor), pos: idx + 1, total: order.length });
        });
      });

      const aggregate = [...opcIds].sort((a, b) => points[b] - points[a]);
      const manual = consenso.finalRankingFor(tema.id);
      const hasManual = Array.isArray(manual) && manual.length > 0;
      const effective = (hasManual ? manual.map(String).filter((id) => opcIds.includes(id)) : aggregate).slice();
      opcIds.forEach((id) => { if (!effective.includes(id)) effective.push(id); });

      const itemsHtml = opcIds.length
        ? effective.map((id, idx) => {
            const o = byId[id];
            if (!o) return '';
            const voterHtml = rankers[id].length
              ? `<span class="cmp-rk-voters">${rankers[id].map((v) => `<span class="cmp-rk-voter">${esc(v.autor)} #${v.pos}/${v.total}</span>`).join(', ')}</span>`
              : '<span class="cmp-rk-voters cmp-rk-voters--none">Sin ordenar</span>';
            return `<div class="cmp-rk-item">
              <span class="cmp-rk-pos">${idx + 1}</span>
              <span class="cmp-rk-name">${esc(o.nombre)}</span>
              <span class="cmp-rk-pts">${points[id]} pts</span>
              ${voterHtml}
            </div>`;
          }).join('')
        : '<div class="cmp-rk-noopc">Este tema no tiene opciones cargadas.</div>';

      const banner = hasManual
        ? `<div class="cmp-rk-final">✓ Orden final fijado <button class="linkish" data-rk-clear="${esc(tema.id)}">Quitar ✕</button></div>`
        : nSources > 0
          ? `<div class="cmp-rk-final cmp-rk-final--suggested">Orden sugerido por mayoría <button class="linkish" data-rk-adopt="${esc(tema.id)}" data-rk-order="${esc(aggregate.join(','))}">Adoptar</button></div>`
          : '<div class="cmp-rk-final cmp-rk-final--none">Nadie ordenó todavía</div>';

      return `<div class="cmp-rk-card">
        <h3 class="cmp-rk-title">🏆 ${esc(tema.nombre)} <span class="cmp-rk-total">${nSources} orden${nSources !== 1 ? 'es' : ''}</span></h3>
        <div class="cmp-rk-items">${itemsHtml}</div>
        ${banner}
      </div>`;
    }).join('');

    mount.innerHTML = this._html.sanitize(html);
  }

  async _render() {
    const KINDS = [
      { id: 'seleccion', label: '🎯 Asignación', ok: this._roster.getTemasParticipables().length > 0 },
      { id: 'votacion', label: '🗳️ Votación', ok: this._roster.getTemasVotacion().length > 0 },
      { id: 'ranking', label: '🏆 Ranking', ok: this._roster.getTemasRanking().length > 0 },
      { id: 'texto', label: '📝 Texto libre', ok: this._roster.getTemasTexto().length > 0 },
    ];
    const available = KINDS.filter((k) => k.ok);
    if (!available.some((k) => k.id === this.cmpKind)) this.cmpKind = available.length ? available[0].id : 'seleccion';
    const showKindTabs = available.length > 1;
    this.$root.querySelector('.cmp-kind-tabs').hidden = !showKindTabs;
    if (this._kindTabsCmp) {
      const key = available.map((k) => k.id).join(',');
      if (key !== this._cmpKindKey) { this._kindTabsCmp.items = available.map((k) => ({ id: k.id, label: k.label })); this._cmpKindKey = key; }
      this._kindTabsCmp.activeTab = this.cmpKind;
    }

    const all = this._buildComparisonSources();
    this._renderSourceTags(all);

    if (this.cmpKind === 'votacion') {
      this.$root.querySelector('.cmp-mode-tabs').hidden = true;
      this.$root.querySelector('.cmp-search-slot').hidden = false;
      this.$root.querySelector('.cmp-dynamic').hidden = true;
      this.$root.querySelector('.cmp-carousel-mount').hidden = true;
      this.$root.querySelector('.cmp-text-mount').hidden = true;
      this.$root.querySelector('.cmp-final-heading').hidden = true;
      this.$root.querySelector('.cmp-final-heading + .view-sub').hidden = true;
      this.$root.querySelector('.cmp-finaltally-slot').hidden = true;
      this.$root.querySelector('.cmp-ranking-mount').hidden = true;
      this.$root.querySelector('.cmp-votacion-mount').hidden = false;
      this._renderVotacion(all);
      return;
    }
    this.$root.querySelector('.cmp-votacion-mount').hidden = true;

    if (this.cmpKind === 'ranking') {
      this.$root.querySelector('.cmp-mode-tabs').hidden = true;
      this.$root.querySelector('.cmp-search-slot').hidden = false;
      this.$root.querySelector('.cmp-dynamic').hidden = true;
      this.$root.querySelector('.cmp-carousel-mount').hidden = true;
      this.$root.querySelector('.cmp-text-mount').hidden = true;
      this.$root.querySelector('.cmp-final-heading').hidden = true;
      this.$root.querySelector('.cmp-final-heading + .view-sub').hidden = true;
      this.$root.querySelector('.cmp-finaltally-slot').hidden = true;
      this.$root.querySelector('.cmp-ranking-mount').hidden = false;
      this._renderRanking(all);
      return;
    }
    this.$root.querySelector('.cmp-ranking-mount').hidden = true;

    if (this.cmpKind === 'texto') {
      this.$root.querySelector('.cmp-mode-tabs').hidden = true;
      this.$root.querySelector('.cmp-search-slot').hidden = true;
      this.$root.querySelector('.cmp-dynamic').hidden = true;
      this.$root.querySelector('.cmp-carousel-mount').hidden = true;
      this.$root.querySelector('.cmp-text-mount').hidden = false;
      this.$root.querySelector('.cmp-final-heading').hidden = true;
      this.$root.querySelector('.cmp-final-heading + .view-sub').hidden = true;
      this.$root.querySelector('.cmp-finaltally-slot').hidden = true;
      this._textCards.sources = all.map((src) => ({
        ...src,
        autorLabel: this._displayName(src.autor),
      }));
      return;
    }
    this.$root.querySelector('.cmp-mode-tabs').hidden = false;
    this.$root.querySelector('.cmp-text-mount').hidden = true;
    if (this._modeTabsCmp) this._modeTabsCmp.activeTab = this.cmpMode;

    if (all.length < 2) {
      this.$root.querySelector('.cmp-search-slot').hidden = true;
      this.$root.querySelector('.cmp-dynamic').innerHTML = '<div class="empty-state">Importa al menos un archivo de respuestas de otra persona para comparar.<br/>Tu trabajo actual ya cuenta como una fuente.</div>';
      this._finalTally.items = [];
      return;
    }
    const rows = this._buildRows(all);
    const prevScrollTop = this.$root.querySelector('.cmp-table-wrap')?.scrollTop;

    const isCarousel = this.cmpMode === 'carousel';
    this.$root.querySelector('.cmp-search-slot').hidden = isCarousel;
    this.$root.querySelector('.cmp-dynamic').hidden = isCarousel;
    this.$root.querySelector('.cmp-carousel-mount').hidden = !isCarousel;

    if (isCarousel) {
      this._renderCarouselView(all, rows);
    } else if (this.cmpView === 'tema') {
      this.$root.querySelector('.cmp-final-heading').hidden = true;
      this.$root.querySelector('.cmp-final-heading + .view-sub').hidden = true;
      this.$root.querySelector('.cmp-finaltally-slot').hidden = true;
      this._renderTemaView(all, prevScrollTop);
      this._finalTally.items = [];
    } else {
      this.$root.querySelector('.cmp-final-heading').hidden = false;
      this.$root.querySelector('.cmp-final-heading + .view-sub').hidden = false;
      this.$root.querySelector('.cmp-finaltally-slot').hidden = false;
      this._renderOpcionView(all, rows, prevScrollTop);
    }
  }

  _renderSourceTags(all) {
    const container = this.$root.querySelector('.source-list');
    if (!container) return;
    container.innerHTML = this._html.sanitize(all.map((src) => {
      const count = Object.values(src.asignaciones).filter(Boolean).length
        + Object.keys(src.voto || {}).length
        + Object.keys(src.texto || {}).length;
      const display = this._displayName(src.autor);
      const revealAttr = this._anonMode && !this._revealedSources.has(src.autor)
        ? ` data-reveal="${this._html.esc(src.autor)}" title="Revelar identidad" style="cursor:pointer"`
        : '';
      return `<div class="source-tag${revealAttr ? ' source-tag--anon' : ''}"${revealAttr}>
        <span class="swatch" style="background:${src.color}"></span>
        <span class="source-tag__name">${this._html.esc(display)}</span>
        <span style="color:var(--font-secondary-color)">(${count})</span>
        ${src.removable ? `<button data-rm="${this._html.esc(src.autor)}" title="Quitar">✕</button>` : ''}
      </div>`;
    }).join(''));
    container.querySelectorAll('[data-rm]').forEach((b) => {
      b.onclick = () => {
        this._imports.remove(b.dataset.rm);
        this.sources = this._imports.getSources();
        this._render();
      };
    });
    container.querySelectorAll('[data-reveal]').forEach((el) => {
      el.onclick = () => { this._revealedSources.add(el.dataset.reveal); this._render(); };
    });
    if (this._anonSwitch) {
      this._anonSwitch.checked = this._anonMode;
      this._anonSwitch.label = this._anonMode ? '🔒 Anónimo' : '👤 Identificado';
    }
  }

  _renderOpcionView(all, rows, prevScrollTop) {
    const roster = this._roster;
    const temas = roster.getTemasParticipables();
    const resolution = slice.getComponent('ConsensoService');
    const svcName = (id) => (id ? roster.getTemaById(id)?.nombre || id : '—');

    const nAgree = rows.filter((r) => r.status === 'agree').length;
    const nDisagree = rows.filter((r) => r.status === 'disagree').length;
    const nPartial = rows.filter((r) => r.status === 'partial').length;
    const comparables = rows.length - rows.filter((r) => r.status === 'none').length;
    const pct = (n) => (comparables ? Math.round((n / comparables) * 100) : 0);

    const decided = rows.filter((r) => resolution.hasResolution(r.opcion.id)).length;
    const conflictCount = rows.filter((r) => r.status === 'disagree').length;
    const resolvedConflicts = rows.filter((r) => r.status === 'disagree' && resolution.hasResolution(r.opcion.id)).length;
    const pendientes = conflictCount - resolvedConflicts;

    const finalCounts = {};
    temas.forEach((t) => { finalCounts[t.id] = 0; });
    rows.forEach((r) => {
      const f = resolution.finalFor(r);
      if (f && finalCounts[f] !== undefined) finalCounts[f]++;
    });

    const proposedCounts = {};
    temas.forEach((t) => { proposedCounts[t.id] = rows.filter((r) => r.vals.some((v) => v === t.id)).length; });

    let html = `
      <div class="cmp-summary">
        <div class="stat-card"><div class="k">Coinciden</div><div class="v" style="color:var(--success-color)">${nAgree}</div><div class="pct">${pct(nAgree)}% de ${comparables} comparados</div></div>
        <div class="stat-card"><div class="k">Difieren</div><div class="v" style="color:var(--warning-color)">${nDisagree}</div><div class="pct">${pct(nDisagree)}% de ${comparables} comparados</div></div>
        <div class="stat-card"><div class="k">Parciales / faltan votos</div><div class="v" style="color:var(--primary-color)">${nPartial}</div><div class="pct">${pct(nPartial)}% de ${comparables} comparados</div></div>
      </div>
      <div class="res-bar">
        <div class="res-info">
          <b>Lista final</b>
          <span class="res-chip ok">${decided} decididos</span>
          <span class="res-chip ${pendientes ? 'warn' : 'muted'}">${pendientes ? pendientes + ' conflictos por revisar' : 'Sin conflictos pendientes'}</span>
        </div>
        <div class="res-progress">
          <div class="res-progress-track"><span style="width:${conflictCount ? Math.round((resolvedConflicts / conflictCount) * 100) : 100}%"></span></div>
          <span class="res-progress-label">${resolvedConflicts}/${conflictCount} conflictos resueltos</span>
        </div>
        <span class="spacer" style="flex:1"></span>
        <button class="btn btn-sm" id="btnFillSug">✓ Autocompletar con sugerencia</button>
        <button class="btn btn-sm" id="btnClearRes">Vaciar decisiones</button>
        <button class="btn btn-sm btn-primary" id="btnExportFinal">⬇ Exportar lista final</button>
      </div>
      <div class="cmp-filters">
        <button class="btn btn-sm ${this.cmpFilter === 'all' ? 'btn-primary' : ''}" data-f="all">Todos (${rows.length})</button>
        <button class="btn btn-sm ${this.cmpFilter === 'disagree' ? 'btn-primary' : ''}" data-f="disagree">Solo diferencias (${nDisagree})</button>
        <button class="btn btn-sm ${this.cmpFilter === 'agree' ? 'btn-primary' : ''}" data-f="agree">Solo coincidencias (${nAgree})</button>
        <button class="btn btn-sm ${this.cmpFilter === 'pending' ? 'btn-primary' : ''}" data-f="pending">Por revisar (${pendientes})</button>
        <label class="svc-filter">Tema
          <select id="svcFilter">
            <option value="">Todos los temas</option>
            ${temas.map((t) => `<option value="${t.id}" ${this.cmpService === t.id ? 'selected' : ''}>${this._html.esc(t.nombre)} (${proposedCounts[t.id]})</option>`).join('')}
          </select>
        </label>
        <span class="spacer" style="flex:1"></span>
        <button class="btn btn-sm" id="btnTemaView">◉ Vista por tema</button>
        <button class="btn btn-sm" id="btnExportCmp">⬇ Exportar comparación como hoja de cálculo</button>
      </div>`;

    let shown = rows;
    if (this.cmpFilter === 'disagree') shown = rows.filter((r) => r.status === 'disagree');
    else if (this.cmpFilter === 'agree') shown = rows.filter((r) => r.status === 'agree');
    else if (this.cmpFilter === 'pending') shown = rows.filter((r) => r.status === 'disagree' && !resolution.hasResolution(r.opcion.id));
    if (this.cmpService) shown = shown.filter((r) => r.vals.some((v) => v === this.cmpService));
    if (this.cmpQuery) {
      const q = this.cmpQuery.trim().toLowerCase();
      shown = shown.filter((r) => r.opcion.nombre.toLowerCase().includes(q));
    }

    if (this.cmpService) {
      html += `<div class="svc-filter-note">Mostrando <b>${shown.length}</b> opción(es) propuesta(s) para «<b>${this._html.esc(svcName(this.cmpService))}</b>» por al menos 1 persona (celdas resaltadas). <button class="linkish" id="svcFilterClear">Quitar filtro ✕</button></div>`;
    }

    html += `<div class="cmp-table-wrap"><table class="cmp-table"><thead><tr><th>Opción</th>`;
    all.forEach((src) => { html += `<th><span class="cell-val"><span class="swatch" style="background:${src.color}"></span>${this._html.esc(src.autor)}</span></th>`; });
    html += `<th>Estado</th><th>Final</th></tr></thead><tbody>`;

    shown.forEach((r) => {
      html += `<tr class="${r.status}"><td>${this._html.esc(r.opcion.nombre)}</td>`;
      r.vals.forEach((v, i) => {
        const match = this.cmpService && v === this.cmpService ? ' cell-match' : '';
        html += `<td class="${match.trim()}">${v ? `<span class="cell-val"><span class="swatch" style="background:${all[i].color}"></span>${this._html.esc(svcName(v))}</span>` : '<span style="color:var(--font-secondary-color)">—</span>'}</td>`;
      });
      const stTxt = { agree: 'Coincide', disagree: 'Difiere', partial: 'Faltan votos', none: 'Sin asignar' }[r.status];
      html += `<td><span class="tag-status ${r.status}">${stTxt}</span></td>`;
      const f = resolution.finalFor(r);
      const needsReview = r.status === 'disagree' && !resolution.hasResolution(r.opcion.id);
      const col = f ? roster.colorFor(f) : 'var(--border-color)';
      const suggestion = r.status !== 'agree' ? resolution.suggestFinal(r) : null;
      html += `<td class="final-cell"><select class="final-select ${needsReview ? 'suggested' : ''}" data-opcion="${r.opcion.id}" style="border-left:4px solid ${col}">`;
      html += `<option value="">${needsReview && suggestion ? `↳ Sugerencia: ${this._html.esc(svcName(suggestion))}` : '— sin decidir'}</option>`;
      temas.forEach((t) => { html += `<option value="${t.id}" ${f === t.id ? 'selected' : ''}>${this._html.esc(t.nombre)}</option>`; });
      html += `</select>${needsReview && suggestion ? `<span class="suggestion-hint">↳ ${this._html.esc(svcName(suggestion))}</span>` : ''}</td></tr>`;
    });
    html += `</tbody></table></div>`;

    this.$root.querySelector('.cmp-dynamic').innerHTML = this._html.sanitize(html);
    const wrap = this.$root.querySelector('.cmp-table-wrap');
    if (wrap && prevScrollTop) wrap.scrollTop = prevScrollTop;

    this._bindTableInteractions(all, rows);

    this._finalTally.items = temas.map((t) => {
      const n = finalCounts[t.id];
      const st = roster.statusOf(t, n);
      return {
        nombre: t.nombre,
        color: roster.colorFor(t.id),
        count: n,
        max: t.max,
        status: st,
        badgeText: roster.statusLabel(t, n),
      };
    });
  }

  _renderTemaView(all, prevScrollTop) {
    const roster = this._roster;
    const temas = roster.getTemasParticipables();
    const temaRows = this._buildTemaRows(all);

    let html = `
      <div class="cmp-filters">
        <label class="svc-filter">Tema
          <select id="svcFilter">
            <option value="">Todos los temas</option>
            ${temas.map((t) => `<option value="${t.id}" ${this.cmpService === t.id ? 'selected' : ''}>${this._html.esc(t.nombre)}</option>`).join('')}
          </select>
        </label>
        <span class="spacer" style="flex:1"></span>
        <button class="btn btn-sm btn-primary" id="btnOpcionView">☰ Vista por opción</button>
      </div>`;

    let shown = temaRows;
    if (this.cmpService) shown = shown.filter((tr) => tr.tema.id === this.cmpService);
    if (this.cmpQuery) {
      const q = this.cmpQuery.trim().toLowerCase();
      shown = shown.map((tr) => ({
        ...tr,
        vals: tr.vals.map((opciones) => opciones.filter((m) => m.nombre.toLowerCase().includes(q))),
      }));
    }

    html += `<div class="cmp-table-wrap"><table class="cmp-table tema-table"><thead><tr><th>Tema</th>`;
    all.forEach((src) => { html += `<th><span class="cell-val"><span class="swatch" style="background:${src.color}"></span>${this._html.esc(src.autor)}</span></th>`; });
    html += `<th>Consenso</th></tr></thead><tbody>`;

    shown.forEach((tr) => {
      const col = roster.colorFor(tr.tema.id);
      html += `<tr><td><span class="color-dot" style="background:${col}"></span> <b>${this._html.esc(tr.tema.nombre)}</b></td>`;
      tr.vals.forEach((opciones) => {
        const names = opciones.map((m) => m.nombre);
        html += `<td>${names.length ? names.map((n) => this._html.esc(n)).join(', ') : '<span class="muted">—</span>'}</td>`;
      });
      const agreeOn = tr.vals.reduce((acc, opciones) => {
        opciones.forEach((m) => { acc[m.id] = (acc[m.id] || 0) + 1; });
        return acc;
      }, {});
      const consensus = Object.keys(agreeOn).filter(
        (id) => agreeOn[id] >= all.length || agreeOn[id] >= all.filter((s) => s.asignaciones[id]).length
      );
      html += `<td>${consensus.length ? consensus.map((id) => this._html.esc(roster.getOpcionById(id)?.nombre || id)).join(', ') : '<span class="muted">—</span>'}</td>`;
      html += `</tr>`;
    });

    html += `</tbody></table></div>`;
    this.$root.querySelector('.cmp-dynamic').innerHTML = this._html.sanitize(html);
    const wrap = this.$root.querySelector('.cmp-table-wrap');
    if (wrap && prevScrollTop) wrap.scrollTop = prevScrollTop;

    this._bindTemaInteractions();
  }

  async _renderCarouselView(all, rows) {
    const roster = this._roster;
    const resolution = slice.getComponent('ConsensoService');

    this.$root.querySelector('.cmp-final-heading').hidden = false;
    this.$root.querySelector('.cmp-final-heading + .view-sub').hidden = false;
    this.$root.querySelector('.cmp-finaltally-slot').hidden = false;

    this._carousel.sources = all;

    this._finalTally.items = roster.getTemasParticipables().map((t) => {
      const n = rows.filter((r) => resolution.finalFor(r) === t.id).length;
      const st = roster.statusOf(t, n);
      return {
        nombre: t.nombre,
        color: roster.colorFor(t.id),
        count: n,
        max: t.max,
        status: st,
        badgeText: roster.statusLabel(t, n),
      };
    });
  }

  _buildUrlImport() {
    const details = document.createElement('details');
    details.className = 'cmp-url-import';
    details.innerHTML = `<summary>🔗 Importar desde enlaces compartidos</summary>
      <p class="view-sub" style="margin:8px 0 10px">Pegá los enlaces de respuestas que te compartieron (uno por línea).</p>
      <textarea class="cmp-url-import__input" placeholder="https://ejemplo.com/#respuestas=…"></textarea>
      <button class="btn btn-primary cmp-url-import__btn" type="button">Importar</button>
      <span class="cmp-url-import__status"></span>`;
    this.querySelector('.cmp-import-slot').appendChild(details);

    const input = details.querySelector('.cmp-url-import__input');
    const btn = details.querySelector('.cmp-url-import__btn');
    const status = details.querySelector('.cmp-url-import__status');

    btn.onclick = async () => {
      const raw = input.value.trim();
      if (!raw) return;
      const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);
      btn.disabled = true;
      status.textContent = `Procesando ${lines.length} enlace(s)…`;
      const compressor = slice.getComponent('CompressionService');
      let imported = 0, failed = 0, dupes = 0;
      for (const line of lines) {
        const hash = line.includes('#') ? line.split('#')[1] : line.startsWith('respuestas=') ? line : null;
        if (!hash) { failed++; continue; }
        const compressed = hash.startsWith('respuestas=') ? hash.slice('respuestas='.length) : hash;
        if (!compressed) { failed++; continue; }
        let data;
        try {
          data = compressor.decompressFromURI(compressed);
          data = compressor.unpackFromURI(data);
        } catch (e) {
          failed++;
          continue;
        }
        if (!data || !data.respuestas) { failed++; continue; }
        if (this._imports.isDuplicate(data)) {
          dupes++;
          continue;
        }
        this._imports.import(data, data.autor || 'enlace');
        imported++;
      }
      this.sources = this._imports.getSources();
      this._render();
      btn.disabled = false;
      const parts = [];
      if (imported) parts.push(`${imported} importado(s)`);
      if (dupes) parts.push(`${dupes} duplicado(s)`);
      if (failed) parts.push(`${failed} inválido(s)`);
      status.textContent = parts.join(', ') || 'Nada que importar';
      if (imported) slice.events.emit('toast:show', { message: `${imported} fuente(s) importada(s) desde enlaces`, type: 'success' });
    };
  }

  _handleFiles(fileList) {
    const files = Array.from(fileList || []);
    let pending = files.length;
    let totalRecognized = 0;
    let totalIgnored = 0;
    let dupesSkipped = 0;
    if (!pending) return;
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result);
          if (this._imports.isDuplicate(data)) {
            dupesSkipped++;
            slice.events.emit('toast:show', { message: `${file.name}: ya importado (mismo autor y asignaciones).`, type: 'warning' });
          } else {
            const stats = this._imports.import(data, file.name);
            totalRecognized += stats.recognized;
            totalIgnored += stats.ignored;
          }
        } catch (e) {
          slice.events.emit('toast:show', { message: `No se pudo leer ${file.name}: archivo inválido.`, type: 'error' });
        }
        if (--pending === 0) {
          this.sources = this._imports.getSources();
          const all = this._buildComparisonSources();
          const rows = this._buildRows(all);
          this._autoResolveAgreed(rows);
          if (totalIgnored > 0) {
            slice.events.emit('toast:show', {
              message: `Importadas ${totalRecognized} respuesta(s) de ${files.length - dupesSkipped} archivo(s). ${totalIgnored} ignorada(s) (referencian Temas u Opciones que no existen en la Plantilla actual).`,
              type: 'warning',
            });
          }
          this._render();
        }
      };
      reader.readAsText(file);
    });
  }

  _bindTableInteractions(all, rows) {
    const resolution = slice.getComponent('ConsensoService');

    this.$root.querySelectorAll('[data-f]').forEach((b) => {
      b.onclick = () => { this.cmpFilter = b.dataset.f; this._render(); };
    });
    const sf = this.$root.querySelector('#svcFilter');
    if (sf) sf.onchange = () => { this.cmpService = sf.value; this._render(); };
    const sfc = this.$root.querySelector('#svcFilterClear');
    if (sfc) sfc.onclick = () => { this.cmpService = ''; this._render(); };
    const tv = this.$root.querySelector('#btnTemaView');
    if (tv) tv.onclick = () => { this.cmpView = 'tema'; this._render(); };

    const ec = this.$root.querySelector('#btnExportCmp');
    if (ec) ec.onclick = () => this._exportComparisonCSV(all, rows);
    const ef = this.$root.querySelector('#btnExportFinal');
    if (ef) ef.onclick = () => resolution.exportFinal(rows);
    const fs = this.$root.querySelector('#btnFillSug');
    if (fs) fs.onclick = () => {
      slice.events.emit('confirm:request', {
        title: '¿Autocompletar con sugerencias?',
        message: 'Fija como decisión final la sugerencia (consenso o mayoría) para todas las Opciones que aún no tienen una decisión tomada.',
        confirmLabel: 'Autocompletar',
        onConfirm: () => {
          resolution.fillAllWithSuggestion(rows);
          slice.events.emit('toast:show', { message: 'Sugerencias fijadas como decisión final' });
          this._render();
        },
      });
    };
    const cr = this.$root.querySelector('#btnClearRes');
    if (cr) cr.onclick = () => {
      slice.events.emit('confirm:request', {
        title: '¿Vaciar las decisiones de la lista final?',
        message: 'Vuelve a las sugerencias automaticas (consenso/mayoría) para todas las Opciones.',
        confirmLabel: 'Vaciar',
        danger: true,
        onConfirm: () => { resolution.clearAll(); this._render(); },
      });
    };
    this.$root.querySelectorAll('.final-select').forEach((sel) => {
      sel.onchange = () => {
        resolution.setResolution(sel.dataset.opcion, sel.value);
        this._render();
      };
    });
  }

  _bindTemaInteractions() {
    const sf = this.$root.querySelector('#svcFilter');
    if (sf) sf.onchange = () => { this.cmpService = sf.value; this._render(); };
    const mv = this.$root.querySelector('#btnOpcionView');
    if (mv) mv.onclick = () => { this.cmpView = 'opcion'; this._render(); };
  }

  _exportComparisonCSV(all, rows) {
    const roster = this._roster;
    const resolution = slice.getComponent('ConsensoService');
    const atributos = roster.getAtributos();
    const svcName = (id) => (id ? roster.getTemaById(id)?.nombre || id : '—');
    const header = ['Opción', ...atributos.map((a) => a.label), ...all.map((s) => s.autor), 'Estado', 'Final'];
    const lines = [header.map(csvCell).join(',')];
    rows.forEach((r) => {
      const stTxt = { agree: 'Coincide', disagree: 'Difiere', partial: 'Faltan votos', none: 'Sin asignar' }[r.status];
      const fin = resolution.finalFor(r);
      const attrVals = atributos.map((a) => roster.formatAtributo(a, r.opcion.meta?.[a.key]) || '');
      lines.push([r.opcion.nombre, ...attrVals, ...r.vals.map((v) => svcName(v)), stTxt, fin ? svcName(fin) : ''].map(csvCell).join(','));
    });
    slice.getComponent('FileDownloadService').download('comparacion_temas.csv', '﻿' + lines.join('\r\n'), 'text/csv');
  }
}

customElements.define('slice-compareview', CompareView);
