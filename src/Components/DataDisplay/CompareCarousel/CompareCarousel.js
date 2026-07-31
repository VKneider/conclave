

export default class CompareCarousel extends HTMLElement {
  constructor(props) {
    super();
    slice.attachTemplate(this);
    this.$root = this.querySelector('.cmp-carousel');
    this.$searchSlot = this.querySelector('.cc-search-slot');
    this.$filtersSlot = this.querySelector('#ccFiltersSlot');
    this.$dynamic = this.querySelector('.cc-dynamic');
    this._sources = [];
    this._index = 0;
    this._query = '';
    this._filter = 'all';
    this._temaFilter = '';
    this._onKeydown = this._onKeydown.bind(this);
    this._boundPaint = () => this._render();
    this._filterBtns = {};
    this._temaFilterSel = null;
    this._lastTemaIds = null;
    this._lastTemaApplied = null;
    slice.controller.setComponentProps(this, props);
  }

  async init() {
    this._html = slice.getComponent('HtmlService');
    document.addEventListener('keydown', this._onKeydown);

    // Built once, unlike everything else here (rebuilt in full on every
    // _render()) — survives filter/data changes without a focus-restore hack.
    this.$searchInput = await slice.build('Input', { sliceId: 'ccSearch', placeholder: 'Buscar…' });
    this.$searchSlot.appendChild(this.$searchInput);
    this.$searchInput.addEventListener('input', () => {
      this._query = this.$searchInput.value;
      this._index = 0;
      this._render();
    });

    // Toolbar built once (like the search field) and kept out of .cc-dynamic,
    // which is re-templated on every _render(). Active pill = filled variant,
    // toggled by setter per render; the "Todos (N)" count updates via value.
    const [allBtn, disagreeBtn, agreeBtn, pendingBtn, temaFilterSel] = await Promise.all([
      slice.build('Button', { sliceId: 'ccFilterAll', value: 'Todos (0)', size: 'sm', variant: 'filled', onClick: () => this._setFilter('all') }),
      slice.build('Button', { sliceId: 'ccFilterDisagree', value: 'Diferencias', size: 'sm', variant: 'outlined', onClick: () => this._setFilter('disagree') }),
      slice.build('Button', { sliceId: 'ccFilterAgree', value: 'Coincidencias', size: 'sm', variant: 'outlined', onClick: () => this._setFilter('agree') }),
      slice.build('Button', { sliceId: 'ccFilterPending', value: 'Por revisar', size: 'sm', variant: 'outlined', onClick: () => this._setFilter('pending') }),
      slice.build('Select', { sliceId: 'ccTemaFilter', options: [{ text: 'Todos los temas', value: '' }], visibleProp: 'text' }),
    ]);
    this._filterBtns = { all: allBtn, disagree: disagreeBtn, agree: agreeBtn, pending: pendingBtn };
    this._temaFilterSel = temaFilterSel;
    this.$filtersSlot.append(allBtn, disagreeBtn, agreeBtn, pendingBtn, temaFilterSel);
    temaFilterSel.onChange = () => {
      const v = temaFilterSel.value;
      this._temaFilter = v && typeof v === 'object' ? v.value : v;
      this._index = 0;
      this._render();
    };

    slice.context.watch('decisionFinal', this, this._boundPaint);
    slice.context.watch('settings', this, this._boundPaint);
    this._render();
  }

  _setFilter(filter) {
    this._filter = filter;
    this._index = 0;
    this._render();
  }

  beforeDestroy() {
    document.removeEventListener('keydown', this._onKeydown);
  }

  set sources(arr) {
    this._sources = arr || [];
    this._index = 0;
    if (this.isConnected) this._render();
  }

  _onKeydown(e) {
    if (!this.isConnected) return;
    if (this.closest('[hidden]')) return;
    if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
    const list = this._visibleOpciones();
    if (e.key === 'ArrowLeft' && this._index > 0) {
      this._index--;
      this._render();
    } else if (e.key === 'ArrowRight' && this._index < list.length - 1) {
      this._index++;
      this._render();
    }
  }

  _roster() {
    return slice.getComponent('PlantillaService');
  }

  _resolution() {
    return slice.getComponent('ConsensoService');
  }

  _svcName(id) {
    return id ? this._roster().getTemaById(id)?.nombre || id : '—';
  }

  _visibleOpciones() {
    const roster = this._roster();
    let list = roster.getOpcionesDisponibles();
    const q = this._query.trim().toLowerCase();
    if (q) list = list.filter((m) => m.nombre.toLowerCase().includes(q));
    const all = this._sources;
    if (this._filter !== 'all' || this._temaFilter) {
      list = list.filter((m) => {
        const vals = all.map((src) => src.asignaciones[m.id] || null);
        const nonNull = vals.filter(Boolean);
        const uniq = new Set(nonNull);
        let status;
        if (nonNull.length === 0) status = 'none';
        else if (nonNull.length < all.length) status = 'partial';
        else if (uniq.size === 1) status = 'agree';
        else status = 'disagree';
        if (this._filter !== 'all' && status !== this._filter) return false;
        if (this._temaFilter && !vals.some((v) => v === this._temaFilter)) return false;
        return true;
      });
    }
    return list;
  }

  _rows() {
    const roster = this._roster();
    const all = this._sources;
    return roster.getOpcionesDisponibles().map((opcion) => {
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

  _render() {
    const all = this._sources;
    const roster = this._roster();
    const resolution = this._resolution();
    const temas = roster.getTemasParticipables();

    if (all.length < 2) {
      this.$searchSlot.hidden = true;
      this.$filtersSlot.hidden = true;
      this.$dynamic.innerHTML = '';
      return;
    }
    this.$searchSlot.hidden = false;
    this.$filtersSlot.hidden = false;

    const rows = this._rows();
    const opciones = this._visibleOpciones();
    if (this._index >= opciones.length) this._index = Math.max(0, opciones.length - 1);

    const nAgree = rows.filter((r) => r.status === 'agree').length;
    const nDisagree = rows.filter((r) => r.status === 'disagree').length;
    const nPartial = rows.filter((r) => r.status === 'partial').length;
    const comparables = rows.length - rows.filter((r) => r.status === 'none').length;
    const pct = (n) => (comparables ? Math.round((n / comparables) * 100) : 0);

    const conflictCount = rows.filter((r) => r.status === 'disagree').length;
    const resolvedConflicts = rows.filter((r) => r.status === 'disagree' && resolution.hasResolution(r.opcion.id)).length;
    const pendientes = conflictCount - resolvedConflicts;

    // Toolbar (build-once, mounted in init) — reflect current state by setter.
    this._filterBtns.all.value = `Todos (${opciones.length})`;
    for (const k of Object.keys(this._filterBtns)) {
      this._filterBtns[k].variant = this._filter === k ? 'filled' : 'outlined';
    }
    const temaOpts = [{ text: 'Todos los temas', value: '' }, ...temas.map((t) => ({ text: t.nombre, value: t.id }))];
    const temaIds = temas.map((t) => t.id).join(',');
    if (temaIds !== this._lastTemaIds) {
      this._lastTemaIds = temaIds;
      this._temaFilterSel.options = temaOpts;
    }
    if (this._temaFilter && !temaOpts.some((o) => o.value === this._temaFilter)) this._temaFilter = '';
    const curTema = (this._temaFilter && temaOpts.find((o) => o.value === this._temaFilter)) || temaOpts[0];
    if (!this._lastTemaApplied || this._lastTemaApplied.value !== curTema.value) {
      this._lastTemaApplied = curTema;
      this._temaFilterSel.value = [curTema];
    }

    // Summary
    let html = `
      <div class="cmp-summary">
        <div class="stat-card"><div class="k">Coinciden</div><div class="v" style="color:var(--success-color)">${nAgree}</div><div class="pct">${pct(nAgree)}% de ${comparables} comparados</div></div>
        <div class="stat-card"><div class="k">Difieren</div><div class="v" style="color:var(--warning-color)">${nDisagree}</div><div class="pct">${pct(nDisagree)}% de ${comparables} comparados</div></div>
        <div class="stat-card"><div class="k">Parciales / faltan votos</div><div class="v" style="color:var(--primary-color)">${nPartial}</div><div class="pct">${pct(nPartial)}% de ${comparables} comparados</div></div>
      </div>
      <div class="res-bar">
        <div class="res-info">
          <b>Lista final</b>
          <span class="res-chip ok">${rows.filter((r) => resolution.hasResolution(r.opcion.id)).length} decididos</span>
          <span class="res-chip ${pendientes ? 'warn' : 'muted'}">${pendientes ? pendientes + ' conflictos por revisar' : 'Sin conflictos pendientes'}</span>
        </div>
        <div class="res-progress">
          <div class="res-progress-track"><span style="width:${conflictCount ? Math.round((resolvedConflicts / conflictCount) * 100) : 100}%"></span></div>
          <span class="res-progress-label">${resolvedConflicts}/${conflictCount} conflictos resueltos</span>
        </div>
      </div>`;

    // Filters live in the build-once toolbar (.cc-filters slot in the .html);
    // this innerHTML region only carries the summary + carousel body.
    if (!opciones.length) {
      html += `<div class="cc-empty">No hay opciones que coincidan con los filtros.</div>`;
      this.$dynamic.innerHTML = this._html.sanitize(html);
      return;
    }

    const opcion = opciones[this._index];
    const vals = all.map((src) => src.asignaciones[opcion.id] || null);
    const nonNull = vals.filter(Boolean);
    const uniq = new Set(nonNull);
    let status;
    if (nonNull.length === 0) status = 'none';
    else if (nonNull.length < all.length) status = 'partial';
    else if (uniq.size === 1) status = 'agree';
    else status = 'disagree';
    const stTxt = { agree: 'Coincide', disagree: 'Difiere', partial: 'Faltan votos', none: 'Sin asignar' }[status];

    html += `<div class="cc-body">
      <button class="cc-arrow" data-ccact="prev" ${this._index === 0 ? 'disabled' : ''}>${slice.getComponent('IconProvider').svg('chevron-left', 20)}</button>
      <div class="cc-card">
        <div class="cc-card-top">
          <div>
            <div class="cc-id">Opción ${this._index + 1} de ${opciones.length} · #${opcion.id}</div>
            <div class="cc-name">${this._html.esc(opcion.nombre)}</div>
          </div>
          <div class="cc-tags">
            ${this._roster().getOpcionAtributos(opcion).map((a) => `<span class="cc-tag">${this._html.esc(a.label)}: ${this._html.esc(a.display)}</span>`).join('')}
            <span class="cc-status ${status}">${stTxt}</span>
          </div>
        </div>
        <div class="cc-divider"></div>
        <div class="cc-sources">`;

    all.forEach((src, i) => {
      const temaId = vals[i];
      html += `<div class="cc-source-row">
        <span class="cc-swatch" style="background:${src.color}"></span>
        <span class="cc-source-label">${this._html.esc(src.autor)}</span>
        <span class="cc-source-tema ${!temaId ? 'none' : ''}">${temaId ? this._html.esc(this._svcName(temaId)) : '—'}</span>
      </div>`;
    });

    const f = resolution.finalFor({ opcion, vals });
    const needsReview = status === 'disagree' && !resolution.hasResolution(opcion.id);
    const suggestion = status !== 'agree' ? resolution.suggestFinal({ opcion, vals }) : null;
    const col = f ? roster.colorFor(f) : 'var(--border-color)';

    html += `</div>
        <div class="cc-divider"></div>
        <div class="cc-final">
          <span class="cc-final-label">Decisión final</span>
          <select class="cc-final-select ${needsReview ? 'suggested' : ''}" data-ccmember="${opcion.id}" style="border-left:4px solid ${col}">
            <option value="">${needsReview && suggestion ? `↳ Sugerencia: ${this._html.esc(this._svcName(suggestion))}` : '— sin decidir'}</option>
            ${temas.map((t) => `<option value="${t.id}" ${f === t.id ? 'selected' : ''}>${this._html.esc(t.nombre)}</option>`).join('')}
          </select>
          ${needsReview && suggestion ? `<span class="cc-suggestion-hint">↳ ${this._html.esc(this._svcName(suggestion))}</span>` : ''}
        </div>
      </div>
      <button class="cc-arrow" data-ccact="next" ${this._index === opciones.length - 1 ? 'disabled' : ''}>${slice.getComponent('IconProvider').svg('chevron-right', 20)}</button>
    </div>`;

    // Dots
    html += `<div class="cc-dots">`;
    opciones.forEach((m, i) => {
      const cls = ['cc-dot'];
      if (resolution.hasResolution(m.id)) cls.push('done');
      if (i === this._index) cls.push('active');
      html += `<span class="${cls.join(' ')}" data-ccidx="${i}" title="${this._html.esc(m.nombre)}"></span>`;
    });
    html += `</div>`;

    this.$dynamic.innerHTML = this._html.sanitize(html);
    this._bindInteractions(opciones);
  }

  _bindInteractions(opciones) {
    const resolution = this._resolution();

    // Arrows
    const prev = this.$root.querySelector('[data-ccact="prev"]');
    const next = this.$root.querySelector('[data-ccact="next"]');
    if (prev) prev.onclick = () => { if (this._index > 0) { this._index--; this._render(); } };
    if (next) next.onclick = () => { if (this._index < opciones.length - 1) { this._index++; this._render(); } };

    // Dots
    this.$root.querySelectorAll('.cc-dot').forEach((d) => {
      d.onclick = () => { this._index = +d.dataset.ccidx; this._render(); };
    });

    // Final select
    this.$root.querySelectorAll('.cc-final-select').forEach((sel) => {
      sel.onchange = () => {
        resolution.setResolution(sel.dataset.ccmember, sel.value);
        this._render();
      };
    });
  }
}

customElements.define('slice-comparecarousel', CompareCarousel);
