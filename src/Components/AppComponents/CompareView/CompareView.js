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
    this.cmpView = 'member';
    this.cmpKind = 'seleccion';
    slice.controller.setComponentProps(this, props);
  }

  async init() {
    this._roster = slice.getComponent('PlantillaService');
    this._imports = slice.getComponent('RespuestasImportService');
    this._esc = slice.getComponent('FormatService').esc;
    this._sanitize = slice.getComponent('SanitizeService').sanitize.bind(slice.getComponent('SanitizeService'));
    this.sources = this._imports.getSources();

    const importDrop = await slice.build('ImportDrop', { sliceId: 'cmp-import' });
    importDrop.onFiles = (files) => this._handleFiles(files);
    this.querySelector('.cmp-import-slot').appendChild(importDrop);

    const plantillaImportDrop = await slice.build('ImportDrop', { sliceId: 'cmp-plantilla-import' });
    plantillaImportDrop.multiple = false;
    plantillaImportDrop.onFiles = (files) => this._handlePlantillaFiles(files);
    this.querySelector('.cmp-plantilla-import-slot').appendChild(plantillaImportDrop);

    this._finalTally = await slice.build('FinalTally', { sliceId: 'cmp-finaltally' });
    this.querySelector('.cmp-finaltally-slot').appendChild(this._finalTally);

    this._carousel = await slice.build('CompareCarousel', { sliceId: 'cmp-carousel' });
    this.$root.querySelector('.cmp-carousel-mount').appendChild(this._carousel);

    this._textCards = await slice.build('TextCompareCards', { sliceId: 'cmp-textcards' });
    this.$root.querySelector('.cmp-text-mount').appendChild(this._textCards);

    // Built once, shared by _renderMemberView/_renderTeamView (which one is
    // visible toggles, but both use the same cmpQuery/search behavior) —
    // never regenerated, unlike the table below it, so it survives every
    // keystroke without the focus-loss dance a re-templated <input> needs.
    this.$searchInput = await slice.build('Input', { sliceId: 'cmp-search', placeholder: 'Buscar…' });
    this.$root.querySelector('.cmp-search-slot').appendChild(this.$searchInput);
    this.$searchInput.addEventListener('input', () => { this.cmpQuery = this.$searchInput.value; this._paint(); });

    this._bindModeTabs();
    this._bindKindTabs();
    await this._paint();
    slice.context.watch('respuestas', this, () => this._paint());
    slice.context.watch('decisionFinal', this, () => this._paint());
    slice.context.watch('plantilla', this, () => this._paint());
    slice.context.watch('respuestasImportadas', this, (sources) => { this.sources = sources; this._paint(); });
  }

  _bindModeTabs() {
    this.$root.querySelectorAll('.cmp-mode-tab').forEach((btn) => {
      btn.onclick = () => {
        this.cmpMode = btn.dataset.mode;
        this._paint();
      };
    });
  }

  _bindKindTabs() {
    this.$root.querySelectorAll('.cmp-kind-tab').forEach((btn) => {
      btn.onclick = () => {
        this.cmpKind = btn.dataset.kind;
        this._paint();
      };
    });
  }

  update() {
    this._paint();
  }

  _buildComparisonSources() {
    const settings = slice.getComponent('SettingsService').getState();
    const mine = {
      autor: `${settings.autor || 'Yo'} (actual)`,
      color: COLORS[0],
      asignaciones: slice.getComponent('RespuestasService').getState().seleccion,
      texto: slice.getComponent('RespuestasService').getState().texto,
      removable: false,
    };
    const imported = this.sources.map((s, i) => ({
      autor: s.autor,
      asignaciones: s.respuestas.seleccion,
      texto: s.respuestas.texto || {},
      color: COLORS[(i + 1) % COLORS.length],
      removable: true,
    }));
    return [mine, ...imported];
  }

  _buildRows(all) {
    return this._roster.getOpcionesDisponibles().map((member) => {
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

  _buildTeamRows(all) {
    const teams = this._roster.getCategoriasParticipables();
    return teams.map((team) => {
      const vals = all.map((src) => {
        const members = [];
        Object.keys(src.asignaciones).forEach((memberId) => {
          if (src.asignaciones[memberId] === team.id) {
            const m = this._roster.getOpcionById(memberId);
            if (m) members.push(m);
          }
        });
        return members;
      });
      return { team, vals };
    });
  }

  _autoResolveAgreed(rows) {
    const resolution = slice.getComponent('ConsensoService');
    const updates = {};
    rows.forEach((row) => {
      if (row.status !== 'agree') return;
      if (resolution.hasResolution(row.member.id)) return;
      const agreedTeam = row.vals.find(Boolean);
      if (agreedTeam) updates[row.member.id] = agreedTeam;
    });
    const keys = Object.keys(updates);
    if (!keys.length) return;
    keys.forEach((id) => resolution.setResolution(id, updates[id]));
  }

  async _paint() {
    const hasSeleccion = this._roster.getCategoriasParticipables().length > 0;
    const hasTexto = this._roster.getCategoriasTexto().length > 0;
    if (!hasSeleccion && hasTexto) this.cmpKind = 'texto';
    else if (!hasTexto) this.cmpKind = 'seleccion';
    this.$root.querySelector('.cmp-kind-tabs').hidden = !(hasSeleccion && hasTexto);
    this.$root.querySelectorAll('.cmp-kind-tab').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.kind === this.cmpKind);
    });

    const all = this._buildComparisonSources();
    this._renderSourceTags(all);

    if (this.cmpKind === 'texto') {
      this.$root.querySelector('.cmp-mode-tabs').hidden = true;
      this.$root.querySelector('.cmp-search-slot').hidden = true;
      this.$root.querySelector('.cmp-dynamic').hidden = true;
      this.$root.querySelector('.cmp-carousel-mount').hidden = true;
      this.$root.querySelector('.cmp-text-mount').hidden = false;
      this.$root.querySelector('.cmp-final-heading').hidden = true;
      this.$root.querySelector('.cmp-final-heading + .view-sub').hidden = true;
      this.$root.querySelector('.cmp-finaltally-slot').hidden = true;
      this._textCards.sources = all;
      return;
    }
    this.$root.querySelector('.cmp-mode-tabs').hidden = false;
    this.$root.querySelector('.cmp-text-mount').hidden = true;

    this.$root.querySelectorAll('.cmp-mode-tab').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.mode === this.cmpMode);
    });

    if (all.length < 2) {
      this.$root.querySelector('.cmp-search-slot').hidden = true;
      this.$root.querySelector('.cmp-dynamic').innerHTML = '<div class="empty-state">Importa al menos un JSON de otra persona para comparar.<br/>Tu trabajo actual ya cuenta como una fuente.</div>';
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
    } else if (this.cmpView === 'team') {
      this.$root.querySelector('.cmp-final-heading').hidden = true;
      this.$root.querySelector('.cmp-final-heading + .view-sub').hidden = true;
      this.$root.querySelector('.cmp-finaltally-slot').hidden = true;
      this._renderTeamView(all, prevScrollTop);
      this._finalTally.items = [];
    } else {
      this.$root.querySelector('.cmp-final-heading').hidden = false;
      this.$root.querySelector('.cmp-final-heading + .view-sub').hidden = false;
      this.$root.querySelector('.cmp-finaltally-slot').hidden = false;
      this._renderMemberView(all, rows, prevScrollTop);
    }
  }

  _renderSourceTags(all) {
    const container = this.$root.querySelector('.source-list');
    if (!container) return;
    container.innerHTML = this._sanitize(all.map((src) => {
      const count = Object.values(src.asignaciones).filter(Boolean).length;
      return `<div class="source-tag"><span class="swatch" style="background:${src.color}"></span>${this._esc(src.autor)} <span style="color:var(--font-secondary-color)">(${count})</span>${src.removable ? `<button data-rm="${this._esc(src.autor)}" title="Quitar">✕</button>` : ''}</div>`;
    }).join(''));
    container.querySelectorAll('[data-rm]').forEach((b) => {
      b.onclick = () => {
        this._imports.remove(b.dataset.rm);
        this.sources = this._imports.getSources();
        this._paint();
      };
    });
  }

  _renderMemberView(all, rows, prevScrollTop) {
    const roster = this._roster;
    const teams = roster.getCategoriasParticipables();
    const resolution = slice.getComponent('ConsensoService');
    const svcName = (id) => (id ? roster.getCategoriaById(id)?.nombre || id : '—');

    const nAgree = rows.filter((r) => r.status === 'agree').length;
    const nDisagree = rows.filter((r) => r.status === 'disagree').length;
    const nPartial = rows.filter((r) => r.status === 'partial').length;
    const comparables = rows.length - rows.filter((r) => r.status === 'none').length;
    const pct = (n) => (comparables ? Math.round((n / comparables) * 100) : 0);

    const decided = rows.filter((r) => resolution.hasResolution(r.member.id)).length;
    const conflictCount = rows.filter((r) => r.status === 'disagree').length;
    const resolvedConflicts = rows.filter((r) => r.status === 'disagree' && resolution.hasResolution(r.member.id)).length;
    const pendientes = conflictCount - resolvedConflicts;

    const finalCounts = {};
    teams.forEach((t) => { finalCounts[t.id] = 0; });
    rows.forEach((r) => {
      const f = resolution.finalFor(r);
      if (f && finalCounts[f] !== undefined) finalCounts[f]++;
    });

    const proposedCounts = {};
    teams.forEach((t) => { proposedCounts[t.id] = rows.filter((r) => r.vals.some((v) => v === t.id)).length; });

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
        <button class="btn btn-sm btn-primary" id="btnExportFinal">⬇ Exportar lista final (JSON)</button>
      </div>
      <div class="cmp-filters">
        <button class="btn btn-sm ${this.cmpFilter === 'all' ? 'btn-primary' : ''}" data-f="all">Todos (${rows.length})</button>
        <button class="btn btn-sm ${this.cmpFilter === 'disagree' ? 'btn-primary' : ''}" data-f="disagree">Solo diferencias (${nDisagree})</button>
        <button class="btn btn-sm ${this.cmpFilter === 'agree' ? 'btn-primary' : ''}" data-f="agree">Solo coincidencias (${nAgree})</button>
        <button class="btn btn-sm ${this.cmpFilter === 'pending' ? 'btn-primary' : ''}" data-f="pending">Por revisar (${pendientes})</button>
        <label class="svc-filter">Categoría
          <select id="svcFilter">
            <option value="">Todas las categorías</option>
            ${teams.map((t) => `<option value="${t.id}" ${this.cmpService === t.id ? 'selected' : ''}>${this._esc(t.nombre)} (${proposedCounts[t.id]})</option>`).join('')}
          </select>
        </label>
        <span class="spacer" style="flex:1"></span>
        <button class="btn btn-sm" id="btnTeamView">◉ Vista por categoría</button>
        <button class="btn btn-sm" id="btnExportCmp">⬇ Exportar comparación (CSV)</button>
      </div>`;

    let shown = rows;
    if (this.cmpFilter === 'disagree') shown = rows.filter((r) => r.status === 'disagree');
    else if (this.cmpFilter === 'agree') shown = rows.filter((r) => r.status === 'agree');
    else if (this.cmpFilter === 'pending') shown = rows.filter((r) => r.status === 'disagree' && !resolution.hasResolution(r.member.id));
    if (this.cmpService) shown = shown.filter((r) => r.vals.some((v) => v === this.cmpService));
    if (this.cmpQuery) {
      const q = this.cmpQuery.trim().toLowerCase();
      shown = shown.filter((r) => r.member.nombre.toLowerCase().includes(q));
    }

    if (this.cmpService) {
      html += `<div class="svc-filter-note">Mostrando <b>${shown.length}</b> opción(es) propuesta(s) para «<b>${this._esc(svcName(this.cmpService))}</b>» por al menos 1 persona (celdas resaltadas). <button class="linkish" id="svcFilterClear">Quitar filtro ✕</button></div>`;
    }

    html += `<div class="cmp-table-wrap"><table class="cmp-table"><thead><tr><th>Opción</th>`;
    all.forEach((src) => { html += `<th><span class="cell-val"><span class="swatch" style="background:${src.color}"></span>${this._esc(src.autor)}</span></th>`; });
    html += `<th>Estado</th><th>Final</th></tr></thead><tbody>`;

    shown.forEach((r) => {
      html += `<tr class="${r.status}"><td>${this._esc(r.member.nombre)}</td>`;
      r.vals.forEach((v, i) => {
        const match = this.cmpService && v === this.cmpService ? ' cell-match' : '';
        html += `<td class="${match.trim()}">${v ? `<span class="cell-val"><span class="swatch" style="background:${all[i].color}"></span>${this._esc(svcName(v))}</span>` : '<span style="color:var(--font-secondary-color)">—</span>'}</td>`;
      });
      const stTxt = { agree: 'Coincide', disagree: 'Difiere', partial: 'Faltan votos', none: 'Sin asignar' }[r.status];
      html += `<td><span class="tag-status ${r.status}">${stTxt}</span></td>`;
      const f = resolution.finalFor(r);
      const needsReview = r.status === 'disagree' && !resolution.hasResolution(r.member.id);
      const col = f ? roster.colorFor(f) : 'var(--border-color)';
      const suggestion = r.status !== 'agree' ? resolution.suggestFinal(r) : null;
      html += `<td class="final-cell"><select class="final-select ${needsReview ? 'suggested' : ''}" data-member="${r.member.id}" style="border-left:4px solid ${col}">`;
      html += `<option value="">${needsReview && suggestion ? `↳ Sugerencia: ${this._esc(svcName(suggestion))}` : '— sin decidir'}</option>`;
      teams.forEach((t) => { html += `<option value="${t.id}" ${f === t.id ? 'selected' : ''}>${this._esc(t.nombre)}</option>`; });
      html += `</select>${needsReview && suggestion ? `<span class="suggestion-hint">↳ ${this._esc(svcName(suggestion))}</span>` : ''}</td></tr>`;
    });
    html += `</tbody></table></div>`;

    this.$root.querySelector('.cmp-dynamic').innerHTML = this._sanitize(html);
    const wrap = this.$root.querySelector('.cmp-table-wrap');
    if (wrap && prevScrollTop) wrap.scrollTop = prevScrollTop;

    this._bindTableInteractions(all, rows);

    this._finalTally.items = teams.map((t) => {
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

  _renderTeamView(all, prevScrollTop) {
    const roster = this._roster;
    const teams = roster.getCategoriasParticipables();
    const teamRows = this._buildTeamRows(all);

    let html = `
      <div class="cmp-filters">
        <label class="svc-filter">Categoría
          <select id="svcFilter">
            <option value="">Todas las categorías</option>
            ${teams.map((t) => `<option value="${t.id}" ${this.cmpService === t.id ? 'selected' : ''}>${this._esc(t.nombre)}</option>`).join('')}
          </select>
        </label>
        <span class="spacer" style="flex:1"></span>
        <button class="btn btn-sm btn-primary" id="btnMemberView">☰ Vista por opción</button>
      </div>`;

    let shown = teamRows;
    if (this.cmpService) shown = shown.filter((tr) => tr.team.id === this.cmpService);
    if (this.cmpQuery) {
      const q = this.cmpQuery.trim().toLowerCase();
      shown = shown.map((tr) => ({
        ...tr,
        vals: tr.vals.map((members) => members.filter((m) => m.nombre.toLowerCase().includes(q))),
      }));
    }

    html += `<div class="cmp-table-wrap"><table class="cmp-table team-table"><thead><tr><th>Categoría</th>`;
    all.forEach((src) => { html += `<th><span class="cell-val"><span class="swatch" style="background:${src.color}"></span>${this._esc(src.autor)}</span></th>`; });
    html += `<th>Consenso</th></tr></thead><tbody>`;

    shown.forEach((tr) => {
      const col = roster.colorFor(tr.team.id);
      html += `<tr><td><span class="color-dot" style="background:${col}"></span> <b>${this._esc(tr.team.nombre)}</b></td>`;
      tr.vals.forEach((members) => {
        const names = members.map((m) => m.nombre);
        html += `<td>${names.length ? names.map((n) => this._esc(n)).join(', ') : '<span class="muted">—</span>'}</td>`;
      });
      const agreeOn = tr.vals.reduce((acc, members) => {
        members.forEach((m) => { acc[m.id] = (acc[m.id] || 0) + 1; });
        return acc;
      }, {});
      const consensus = Object.keys(agreeOn).filter(
        (id) => agreeOn[id] >= all.length || agreeOn[id] >= all.filter((s) => s.asignaciones[id]).length
      );
      html += `<td>${consensus.length ? consensus.map((id) => this._esc(roster.getOpcionById(id)?.nombre || id)).join(', ') : '<span class="muted">—</span>'}</td>`;
      html += `</tr>`;
    });

    html += `</tbody></table></div>`;
    this.$root.querySelector('.cmp-dynamic').innerHTML = this._sanitize(html);
    const wrap = this.$root.querySelector('.cmp-table-wrap');
    if (wrap && prevScrollTop) wrap.scrollTop = prevScrollTop;

    this._bindTeamInteractions();
  }

  async _renderCarouselView(all, rows) {
    const roster = this._roster;
    const resolution = slice.getComponent('ConsensoService');

    this.$root.querySelector('.cmp-final-heading').hidden = false;
    this.$root.querySelector('.cmp-final-heading + .view-sub').hidden = false;
    this.$root.querySelector('.cmp-finaltally-slot').hidden = false;

    this._carousel.sources = all;

    this._finalTally.items = roster.getCategoriasParticipables().map((t) => {
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

  _handleFiles(fileList) {
    const files = Array.from(fileList || []);
    let pending = files.length;
    let totalRecognized = 0;
    let totalOpcionIgnored = 0;
    let totalCategoriaIgnored = 0;
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
            totalOpcionIgnored += stats.opcionIgnored;
            totalCategoriaIgnored += stats.categoriaIgnored;
          }
        } catch (e) {
          slice.events.emit('toast:show', { message: `No se pudo leer ${file.name}: JSON inválido.`, type: 'error' });
        }
        if (--pending === 0) {
          this.sources = this._imports.getSources();
          const all = this._buildComparisonSources();
          const rows = this._buildRows(all);
          this._autoResolveAgreed(rows);
          const totalIgnored = totalOpcionIgnored + totalCategoriaIgnored;
          if (totalIgnored > 0) {
            const parts = [`Importadas ${totalRecognized} opciones de ${files.length - dupesSkipped} archivo(s).`];
            if (totalOpcionIgnored > 0) parts.push(`${totalOpcionIgnored} ignoradas (Opciones que no existen en la Plantilla actual).`);
            if (totalCategoriaIgnored > 0) parts.push(`${totalCategoriaIgnored} ignoradas (Categorías que no existen en la Plantilla actual).`);
            slice.events.emit('toast:show', { message: parts.join(' '), type: 'warning' });
          }
          this._paint();
        }
      };
      reader.readAsText(file);
    });
  }

  _handlePlantillaFiles(fileList) {
    const file = Array.from(fileList || [])[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      let data;
      try {
        data = JSON.parse(reader.result);
      } catch (e) {
        slice.events.emit('toast:show', { message: `No se pudo leer ${file.name}: JSON inválido.`, type: 'error' });
        return;
      }
      let prepared;
      try {
        prepared = this._roster.prepareImport(data);
      } catch (err) {
        slice.events.emit('toast:show', { message: err.message, type: 'error' });
        return;
      }
      const proceed = () => {
        try {
          this._roster.loadFromData(prepared.categorias, prepared.opciones, prepared.nombre);
          slice.events.emit('toast:show', { message: 'Plantilla importada', type: 'success' });
        } catch (err) {
          slice.events.emit('toast:show', { message: err.message, type: 'error' });
        }
      };
      if (prepared.impact) {
        slice.events.emit('confirm:request', {
          title: '¿Reemplazar la Plantilla actual?',
          message: `Se reemplazan tus Categorías y Opciones actuales por las de «${this._esc(data.nombre || file.name)}». Se limpiarán ${prepared.impact} respuesta${prepared.impact !== 1 ? 's' : ''} que ya no aplicarían. Esta acción no se puede deshacer.`,
          confirmLabel: 'Reemplazar de todas formas',
          danger: true,
          onConfirm: proceed,
        });
      } else {
        proceed();
      }
    };
    reader.readAsText(file);
  }

  _bindTableInteractions(all, rows) {
    const resolution = slice.getComponent('ConsensoService');

    this.$root.querySelectorAll('[data-f]').forEach((b) => {
      b.onclick = () => { this.cmpFilter = b.dataset.f; this._paint(); };
    });
    const sf = this.$root.querySelector('#svcFilter');
    if (sf) sf.onchange = () => { this.cmpService = sf.value; this._paint(); };
    const sfc = this.$root.querySelector('#svcFilterClear');
    if (sfc) sfc.onclick = () => { this.cmpService = ''; this._paint(); };
    const tv = this.$root.querySelector('#btnTeamView');
    if (tv) tv.onclick = () => { this.cmpView = 'team'; this._paint(); };

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
          this._paint();
        },
      });
    };
    const cr = this.$root.querySelector('#btnClearRes');
    if (cr) cr.onclick = () => {
      slice.events.emit('confirm:request', {
        title: '¿Vaciar las decisiones de la lista final?',
        message: 'Vuelve a las sugerencias automáticas (consenso/mayoría) para todas las Opciones.',
        confirmLabel: 'Vaciar',
        danger: true,
        onConfirm: () => { resolution.clearAll(); this._paint(); },
      });
    };
    this.$root.querySelectorAll('.final-select').forEach((sel) => {
      sel.onchange = () => {
        resolution.setResolution(sel.dataset.member, sel.value);
        this._paint();
      };
    });
  }

  _bindTeamInteractions() {
    const sf = this.$root.querySelector('#svcFilter');
    if (sf) sf.onchange = () => { this.cmpService = sf.value; this._paint(); };
    const mv = this.$root.querySelector('#btnMemberView');
    if (mv) mv.onclick = () => { this.cmpView = 'member'; this._paint(); };
  }

  _exportComparisonCSV(all, rows) {
    const roster = this._roster;
    const resolution = slice.getComponent('ConsensoService');
    const sexoEnabled = slice.getComponent('SettingsService').isSexoEnabled();
    const svcName = (id) => (id ? roster.getCategoriaById(id)?.nombre || id : '—');
    const header = ['Opción', ...(sexoEnabled ? ['Sexo'] : []), ...all.map((s) => s.autor), 'Estado', 'Final'];
    const lines = [header.map(csvCell).join(',')];
    rows.forEach((r) => {
      const stTxt = { agree: 'Coincide', disagree: 'Difiere', partial: 'Faltan votos', none: 'Sin asignar' }[r.status];
      const fin = resolution.finalFor(r);
      lines.push([r.member.nombre, ...(sexoEnabled ? [r.member.meta?.sexo || ''] : []), ...r.vals.map((v) => svcName(v)), stTxt, fin ? svcName(fin) : ''].map(csvCell).join(','));
    });
    slice.getComponent('FileDownloadService').download('comparacion_categorias.csv', '﻿' + lines.join('\r\n'), 'text/csv');
  }
}

customElements.define('slice-compareview', CompareView);
