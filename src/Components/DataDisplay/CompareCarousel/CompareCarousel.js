import { esc } from '/utils/format.js';

export default class CompareCarousel extends HTMLElement {
  constructor(props) {
    super();
    slice.attachTemplate(this);
    this.$root = this.querySelector('.cmp-carousel');
    this._sources = [];
    this._index = 0;
    this._query = '';
    this._filter = 'all';
    this._teamFilter = '';
    this._onKeydown = this._onKeydown.bind(this);
    this._boundPaint = () => this._paint();
    slice.controller.setComponentProps(this, props);
  }

  init() {
    document.addEventListener('keydown', this._onKeydown);
    slice.context.watch('resolutions', this, this._boundPaint);
    this._paint();
  }

  beforeDestroy() {
    document.removeEventListener('keydown', this._onKeydown);
  }

  set sources(arr) {
    this._sources = arr || [];
    this._index = 0;
    if (this.isConnected) this._paint();
  }

  _onKeydown(e) {
    if (!this.isConnected) return;
    if (this.closest('[hidden]')) return;
    if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
    const list = this._visibleMembers();
    if (e.key === 'ArrowLeft' && this._index > 0) {
      this._index--;
      this._paint();
    } else if (e.key === 'ArrowRight' && this._index < list.length - 1) {
      this._index++;
      this._paint();
    }
  }

  _roster() {
    return slice.getComponent('RosterService');
  }

  _resolution() {
    return slice.getComponent('ResolutionService');
  }

  _svcName(id) {
    return id ? this._roster().getTeamById(id)?.nombre || id : '—';
  }

  _visibleMembers() {
    const roster = this._roster();
    let list = roster.getAssignableMembers();
    const q = this._query.trim().toLowerCase();
    if (q) list = list.filter((m) => m.nombre.toLowerCase().includes(q));
    const all = this._sources;
    if (this._filter !== 'all' || this._teamFilter) {
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
        if (this._teamFilter && !vals.some((v) => v === this._teamFilter)) return false;
        return true;
      });
    }
    return list;
  }

  _rows() {
    const roster = this._roster();
    const all = this._sources;
    return roster.getAssignableMembers().map((member) => {
      const vals = all.map((src) => src.asignaciones[member.id] || null);
      const nonNull = vals.filter(Boolean);
      const uniq = new Set(nonNull);
      let status;
      if (nonNull.length === 0) status = 'none';
      else if (nonNull.length < all.length) status = 'partial';
      else if (uniq.size === 1) status = 'agree';
      else status = 'disagree';
      return { member, vals, status };
    });
  }

  _paint() {
    const all = this._sources;
    const roster = this._roster();
    const resolution = this._resolution();
    const teams = roster.getAssignableTeams();

    if (all.length < 2) {
      this.$root.innerHTML = '';
      return;
    }

    const rows = this._rows();
    const members = this._visibleMembers();
    if (this._index >= members.length) this._index = Math.max(0, members.length - 1);

    const nAgree = rows.filter((r) => r.status === 'agree').length;
    const nDisagree = rows.filter((r) => r.status === 'disagree').length;
    const nPartial = rows.filter((r) => r.status === 'partial').length;
    const comparables = rows.length - rows.filter((r) => r.status === 'none').length;
    const pct = (n) => (comparables ? Math.round((n / comparables) * 100) : 0);

    const conflictCount = rows.filter((r) => r.status === 'disagree').length;
    const resolvedConflicts = rows.filter((r) => r.status === 'disagree' && resolution.hasResolution(r.member.id)).length;
    const pendientes = conflictCount - resolvedConflicts;

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
          <span class="res-chip ok">${rows.filter((r) => resolution.hasResolution(r.member.id)).length} decididos</span>
          <span class="res-chip ${pendientes ? 'warn' : 'muted'}">${pendientes ? pendientes + ' conflictos por revisar' : 'Sin conflictos pendientes'}</span>
        </div>
        <div class="res-progress">
          <div class="res-progress-track"><span style="width:${conflictCount ? Math.round((resolvedConflicts / conflictCount) * 100) : 100}%"></span></div>
          <span class="res-progress-label">${resolvedConflicts}/${conflictCount} conflictos resueltos</span>
        </div>
      </div>`;

    // Filters — always render so the user can change/search even in empty state
    html += `<div class="cc-filters">
      <input class="mini-input cc-search" type="text" placeholder="Buscar miembro…" value="${esc(this._query)}" autocomplete="off" />
      <button class="cc-filter-btn ${this._filter === 'all' ? 'active' : ''}" data-ccf="all">Todos (${members.length})</button>
      <button class="cc-filter-btn ${this._filter === 'disagree' ? 'active' : ''}" data-ccf="disagree">Diferencias</button>
      <button class="cc-filter-btn ${this._filter === 'agree' ? 'active' : ''}" data-ccf="agree">Coincidencias</button>
      <button class="cc-filter-btn ${this._filter === 'pending' ? 'active' : ''}" data-ccf="pending">Por revisar</button>
      <select class="cc-filter-select" id="ccTeamFilter">
        <option value="">Todos los equipos</option>
        ${teams.map((t) => `<option value="${t.id}" ${this._teamFilter === t.id ? 'selected' : ''}>${esc(t.nombre)}</option>`).join('')}
      </select>
    </div>`;

    if (!members.length) {
      html += `<div class="cc-empty">No hay miembros que coincidan con los filtros.</div>`;
      this.$root.innerHTML = html;
      return;
    }

    const member = members[this._index];
    const vals = all.map((src) => src.asignaciones[member.id] || null);
    const nonNull = vals.filter(Boolean);
    const uniq = new Set(nonNull);
    let status;
    if (nonNull.length === 0) status = 'none';
    else if (nonNull.length < all.length) status = 'partial';
    else if (uniq.size === 1) status = 'agree';
    else status = 'disagree';
    const stTxt = { agree: 'Coincide', disagree: 'Difiere', partial: 'Faltan votos', none: 'Sin asignar' }[status];

    html += `<div class="cc-body">
      <button class="cc-arrow" data-ccact="prev" ${this._index === 0 ? 'disabled' : ''}>‹</button>
      <div class="cc-card">
        <div class="cc-card-top">
          <div>
            <div class="cc-id">Miembro ${this._index + 1} de ${members.length} · #${member.id}</div>
            <div class="cc-name">${esc(member.nombre)}</div>
          </div>
          <div class="cc-tags">
            ${member.sexo ? `<span class="cc-tag sexo-${esc(member.sexo)}">${member.sexo === 'M' ? 'Masculino' : member.sexo === 'F' ? 'Femenino' : esc(member.sexo)}</span>` : ''}
            ${member.edad != null ? `<span class="cc-tag">${member.edad} años</span>` : ''}
            <span class="cc-status ${status}">${stTxt}</span>
          </div>
        </div>
        <div class="cc-divider"></div>
        <div class="cc-sources">`;

    all.forEach((src, i) => {
      const teamId = vals[i];
      html += `<div class="cc-source-row">
        <span class="cc-swatch" style="background:${src.color}"></span>
        <span class="cc-source-label">${esc(src.autor)}</span>
        <span class="cc-source-team ${!teamId ? 'none' : ''}">${teamId ? esc(this._svcName(teamId)) : '—'}</span>
      </div>`;
    });

    const f = resolution.finalFor({ member, vals });
    const needsReview = status === 'disagree' && !resolution.hasResolution(member.id);
    const suggestion = status !== 'agree' ? resolution.suggestFinal({ member, vals }) : null;
    const col = f ? roster.colorFor(f) : 'var(--border-color)';

    html += `</div>
        <div class="cc-divider"></div>
        <div class="cc-final">
          <span class="cc-final-label">Decisión final</span>
          <select class="cc-final-select ${needsReview ? 'suggested' : ''}" data-ccmember="${member.id}" style="border-left:4px solid ${col}">
            <option value="">${needsReview && suggestion ? `↳ Sugerencia: ${esc(this._svcName(suggestion))}` : '— sin decidir'}</option>
            ${teams.map((t) => `<option value="${t.id}" ${f === t.id ? 'selected' : ''}>${esc(t.nombre)}</option>`).join('')}
          </select>
          ${needsReview && suggestion ? `<span class="cc-suggestion-hint">↳ ${esc(this._svcName(suggestion))}</span>` : ''}
        </div>
      </div>
      <button class="cc-arrow" data-ccact="next" ${this._index === members.length - 1 ? 'disabled' : ''}>›</button>
    </div>`;

    // Dots
    html += `<div class="cc-dots">`;
    members.forEach((m, i) => {
      const cls = ['cc-dot'];
      if (resolution.hasResolution(m.id)) cls.push('done');
      if (i === this._index) cls.push('active');
      html += `<span class="${cls.join(' ')}" data-ccidx="${i}" title="${esc(m.nombre)}"></span>`;
    });
    html += `</div>`;

    this.$root.innerHTML = html;
    this._bindInteractions(members);
  }

  _bindInteractions(members) {
    const roster = this._roster();
    const resolution = this._resolution();

    // Search
    const search = this.$root.querySelector('.cc-search');
    if (search) {
      search.oninput = () => {
        this._query = search.value;
        this._index = 0;
        this._paint();
      };
    }

    // Filter buttons
    this.$root.querySelectorAll('.cc-filter-btn').forEach((b) => {
      b.onclick = () => {
        this._filter = b.dataset.ccf;
        this._index = 0;
        this._paint();
      };
    });

    // Team filter
    const tf = this.$root.querySelector('#ccTeamFilter');
    if (tf) {
      tf.onchange = () => {
        this._teamFilter = tf.value;
        this._index = 0;
        this._paint();
      };
    }

    // Arrows
    const prev = this.$root.querySelector('[data-ccact="prev"]');
    const next = this.$root.querySelector('[data-ccact="next"]');
    if (prev) prev.onclick = () => { if (this._index > 0) { this._index--; this._paint(); } };
    if (next) next.onclick = () => { if (this._index < members.length - 1) { this._index++; this._paint(); } };

    // Dots
    this.$root.querySelectorAll('.cc-dot').forEach((d) => {
      d.onclick = () => { this._index = +d.dataset.ccidx; this._paint(); };
    });

    // Final select
    this.$root.querySelectorAll('.cc-final-select').forEach((sel) => {
      sel.onchange = () => {
        resolution.setResolution(sel.dataset.ccmember, sel.value);
        this._paint();
      };
    });
  }
}

customElements.define('slice-comparecarousel', CompareCarousel);
