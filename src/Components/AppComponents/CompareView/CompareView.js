import { esc } from '/utils/format.js';

const COLORS = ['#6d8bff', '#3fb964', '#e2a13a', '#ff7eb6', '#8a6dff', '#42c8c0', '#e25c5c', '#b9c34a'];

function csvCell(v) {
  const s = String(v == null ? '' : v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

// sources/cmpFilter/cmpService are instance fields, not context — session-only
// and lost on full reload, same as the original app. No nested Slice
// components are built here (plain HTML table + native <select>s), so a full
// re-template per interaction is cheap and leak-free.
export default class CompareView extends HTMLElement {
  constructor(props) {
    super();
    slice.attachTemplate(this);
    this.$root = this.querySelector('.compare-view');
    this.sources = [];
    this.cmpFilter = 'all';
    this.cmpService = '';
    slice.controller.setComponentProps(this, props);
  }

  async init() {
    this._roster = slice.getComponent('RosterService');
    await this._paint();
    // CompareView reads `assignment` as its own "mine" source but never
    // mutates it — so this watcher only ever fires from an external trigger
    // (e.g. the footer's "Reiniciar" button while Comparar is on screen).
    // `resolutions` IS mutated by this view's own handlers (which already
    // repaint directly), so this watcher is occasionally redundant there —
    // harmless, since _paint() is idempotent and emit()/setState() are
    // synchronous (no flicker from the extra call).
    slice.context.watch('assignment', this, () => this._paint());
    slice.context.watch('resolutions', this, () => this._paint());
  }

  update() {
    this._paint();
  }

  _buildComparisonSources() {
    const settings = slice.getComponent('SettingsService').getState();
    const mine = {
      autor: `${settings.autor || 'Yo'} (actual)`,
      color: COLORS[0],
      asignaciones: slice.getComponent('AssignmentService').getState(),
      removable: false,
    };
    const imported = this.sources.map((s, i) => ({ ...s, color: COLORS[(i + 1) % COLORS.length], removable: true }));
    return [mine, ...imported];
  }

  _buildRows(all) {
    return this._roster.getAssignableMembers().map((member) => {
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

  async _paint() {
    const roster = this._roster;
    const teams = roster.getAssignableTeams();
    const resolution = slice.getComponent('ResolutionService');
    const svcName = (id) => (id ? roster.getTeamById(id)?.nombre || id : '—');
    const prevScrollTop = this.$root.querySelector('.cmp-table-wrap')?.scrollTop;

    const all = this._buildComparisonSources();

    let html = `
      <h2 class="view-title">Comparar asignaciones</h2>
      <p class="view-sub">Importa los JSON exportados por cada persona. Se incluye automáticamente tu trabajo actual.</p>
      <div class="import-drop" id="drop">
        <div style="font-size:15px;font-weight:600">⬆ Arrastra aquí los JSON o haz clic para seleccionarlos</div>
        <div style="margin-top:6px;font-size:12px">Puedes importar varios a la vez</div>
        <input type="file" id="fileInput" accept="application/json,.json" multiple style="display:none" />
      </div>
      <div class="source-list">`;

    all.forEach((src) => {
      const count = Object.values(src.asignaciones).filter(Boolean).length;
      html += `<div class="source-tag"><span class="swatch" style="background:${src.color}"></span>${esc(src.autor)} <span style="color:var(--font-secondary-color)">(${count})</span>${src.removable ? `<button data-rm="${esc(src.autor)}" title="Quitar">✕</button>` : ''}</div>`;
    });
    html += `</div>`;

    if (all.length < 2) {
      html += `<div class="empty-state">Importa al menos un JSON de otra persona para comparar.<br/>Tu trabajo actual ya cuenta como una fuente.</div>`;
      this.$root.innerHTML = html;
      this._bindIO();
      return;
    }

    const rows = this._buildRows(all);
    const nAgree = rows.filter((r) => r.status === 'agree').length;
    const nDisagree = rows.filter((r) => r.status === 'disagree').length;
    const nPartial = rows.filter((r) => r.status === 'partial').length;
    const comparables = rows.length - rows.filter((r) => r.status === 'none').length;
    const pct = (n) => (comparables ? Math.round((n / comparables) * 100) : 0);

    const decided = rows.filter((r) => resolution.finalFor(r)).length;
    const pendientes = rows.filter((r) => r.status === 'disagree' && !resolution.hasResolution(r.member.id)).length;

    const finalCounts = {};
    teams.forEach((t) => { finalCounts[t.id] = 0; });
    rows.forEach((r) => {
      const f = resolution.finalFor(r);
      if (f && finalCounts[f] !== undefined) finalCounts[f]++;
    });

    const proposedCounts = {};
    teams.forEach((t) => { proposedCounts[t.id] = rows.filter((r) => r.vals.some((v) => v === t.id)).length; });

    html += `
      <div class="cmp-summary">
        <div class="stat-card"><div class="k">Coinciden</div><div class="v" style="color:var(--success-color)">${nAgree}</div><div class="pct">${pct(nAgree)}% de ${comparables} comparados</div></div>
        <div class="stat-card"><div class="k">Difieren</div><div class="v" style="color:var(--warning-color)">${nDisagree}</div><div class="pct">${pct(nDisagree)}% de ${comparables} comparados</div></div>
        <div class="stat-card"><div class="k">Parciales / faltan votos</div><div class="v" style="color:var(--primary-color)">${nPartial}</div><div class="pct">${pct(nPartial)}% de ${comparables} comparados</div></div>
      </div>
      <div class="res-bar">
        <div class="res-info">
          <b>Lista final</b>
          <span class="res-chip ok">${decided} decididos</span>
          <span class="res-chip ${pendientes ? 'warn' : 'muted'}">${pendientes} conflictos por revisar</span>
        </div>
        <span class="spacer" style="flex:1"></span>
        <button class="btn btn-sm" id="btnFillSug" title="Fija la sugerencia (consenso/mayoría) como decisión en todos">✓ Autocompletar con sugerencia</button>
        <button class="btn btn-sm" id="btnClearRes">Vaciar decisiones</button>
        <button class="btn btn-sm btn-primary" id="btnExportFinal">⬇ Exportar lista final (JSON)</button>
      </div>
      <div class="cmp-filters">
        <button class="btn btn-sm ${this.cmpFilter === 'all' ? 'btn-primary' : ''}" data-f="all">Todos (${rows.length})</button>
        <button class="btn btn-sm ${this.cmpFilter === 'disagree' ? 'btn-primary' : ''}" data-f="disagree">Solo diferencias (${nDisagree})</button>
        <button class="btn btn-sm ${this.cmpFilter === 'agree' ? 'btn-primary' : ''}" data-f="agree">Solo coincidencias (${nAgree})</button>
        <button class="btn btn-sm ${this.cmpFilter === 'pending' ? 'btn-primary' : ''}" data-f="pending">Por revisar (${pendientes})</button>
        <label class="svc-filter">Equipo
          <select id="svcFilter">
            <option value="">Todos los equipos</option>
            ${teams.map((t) => `<option value="${t.id}" ${this.cmpService === t.id ? 'selected' : ''}>${esc(t.nombre)} (${proposedCounts[t.id]})</option>`).join('')}
          </select>
        </label>
        <span class="spacer" style="flex:1"></span>
        <button class="btn btn-sm" id="btnExportCmp">⬇ Exportar comparación (CSV)</button>
      </div>`;

    let shown = rows;
    if (this.cmpFilter === 'disagree') shown = rows.filter((r) => r.status === 'disagree');
    else if (this.cmpFilter === 'agree') shown = rows.filter((r) => r.status === 'agree');
    else if (this.cmpFilter === 'pending') shown = rows.filter((r) => r.status === 'disagree' && !resolution.hasResolution(r.member.id));
    if (this.cmpService) shown = shown.filter((r) => r.vals.some((v) => v === this.cmpService));

    if (this.cmpService) {
      html += `<div class="svc-filter-note">Mostrando <b>${shown.length}</b> miembro(s) propuestos para «<b>${esc(svcName(this.cmpService))}</b>» por al menos 1 persona (celdas resaltadas). <button class="linkish" id="svcFilterClear">Quitar filtro ✕</button></div>`;
    }

    html += `<div class="cmp-table-wrap"><table class="cmp-table"><thead><tr><th>Miembro</th>`;
    all.forEach((src) => { html += `<th><span class="cell-val"><span class="swatch" style="background:${src.color}"></span>${esc(src.autor)}</span></th>`; });
    html += `<th>Estado</th><th>Final</th></tr></thead><tbody>`;

    shown.forEach((r) => {
      html += `<tr class="${r.status}"><td>${esc(r.member.nombre)}</td>`;
      r.vals.forEach((v, i) => {
        const match = this.cmpService && v === this.cmpService ? ' cell-match' : '';
        html += `<td class="${match.trim()}">${v ? `<span class="cell-val"><span class="swatch" style="background:${all[i].color}"></span>${esc(svcName(v))}</span>` : '<span style="color:var(--font-secondary-color)">—</span>'}</td>`;
      });
      const stTxt = { agree: 'Coincide', disagree: 'Difiere', partial: 'Faltan votos', none: 'Sin asignar' }[r.status];
      html += `<td><span class="tag-status ${r.status}">${stTxt}</span></td>`;
      const f = resolution.finalFor(r);
      const needsReview = r.status === 'disagree' && !resolution.hasResolution(r.member.id);
      const col = f ? roster.colorFor(f) : 'var(--border-color)';
      html += `<td><select class="final-select ${needsReview ? 'suggested' : ''}" data-member="${r.member.id}" title="${needsReview ? 'Sugerencia por mayoría — revísala' : 'Equipo final'}" style="border-left:4px solid ${col}">`;
      html += `<option value="">— sin decidir</option>`;
      teams.forEach((t) => { html += `<option value="${t.id}" ${f === t.id ? 'selected' : ''}>${esc(t.nombre)}</option>`; });
      html += `</select></td></tr>`;
    });
    html += `</tbody></table></div>`;

    html += `
      <h3 class="view-title" style="font-size:15px;margin-top:24px">Resumen de la lista final</h3>
      <p class="view-sub" style="margin-bottom:12px">Conteo de la columna <b>Final</b> por equipo frente a su mínimo y máximo.</p>
      <div class="final-tally">`;
    teams.forEach((t) => {
      const n = finalCounts[t.id];
      const st = roster.statusOf(t, n);
      const col = roster.colorFor(t.id);
      const badgeTxt = { ok: 'En rango', under: `Faltan ${t.min - n}`, over: `Sobran ${n - t.max}`, empty: 'Vacío' }[st];
      html += `
        <div class="ft-chip" style="border-left-color:${col}">
          <div class="ft-top"><span class="color-dot" style="background:${col}"></span><span class="ft-name">${esc(t.nombre)}</span></div>
          <div class="ft-bottom"><span class="ft-count" style="color:${col}">${n}<small>/${t.max != null ? t.max : '–'}</small></span><span class="badge ${st}">${badgeTxt}</span></div>
        </div>`;
    });
    html += `</div>`;

    this.$root.innerHTML = html;
    const wrap = this.$root.querySelector('.cmp-table-wrap');
    if (wrap && prevScrollTop) wrap.scrollTop = prevScrollTop;

    this._bindIO();
    this._bindTableInteractions(all, rows);
  }

  _bindIO() {
    const drop = this.$root.querySelector('#drop');
    const input = this.$root.querySelector('#fileInput');
    if (drop && input) {
      drop.onclick = () => input.click();
      input.onchange = () => { this._handleFiles(input.files); input.value = ''; };
      ['dragover', 'dragenter'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('drag'); }));
      ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('drag'); }));
      drop.addEventListener('drop', (e) => { e.preventDefault(); if (e.dataTransfer?.files) this._handleFiles(e.dataTransfer.files); });
    }
    this.$root.querySelectorAll('[data-rm]').forEach((b) => {
      b.onclick = () => {
        this.sources = this.sources.filter((s) => s.autor !== b.dataset.rm);
        this._paint();
      };
    });
  }

  _handleFiles(fileList) {
    const files = Array.from(fileList || []);
    let pending = files.length;
    if (!pending) return;
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          this._ingestSource(JSON.parse(reader.result), file.name);
        } catch (e) {
          slice.events.emit('toast:show', { message: `No se pudo leer ${file.name}: JSON inválido.`, type: 'error' });
        }
        if (--pending === 0) this._paint();
      };
      reader.readAsText(file);
    });
  }

  _ingestSource(data, filename) {
    const autorBase = data?.autor ? String(data.autor) : filename.replace(/\.json$/i, '');
    const asignaciones = data?.asignaciones || {};
    const roster = this._roster;
    const norm = {};
    Object.keys(asignaciones).forEach((k) => {
      const teamId = asignaciones[k];
      if (teamId && roster.getTeamById(teamId)) norm[k] = teamId;
    });
    let autor = autorBase;
    let n = 2;
    while (this.sources.some((s) => s.autor === autor)) autor = `${autorBase} (${n++})`;
    this.sources.push({ autor, asignaciones: norm });
  }

  _bindTableInteractions(all, rows) {
    const resolution = slice.getComponent('ResolutionService');

    this.$root.querySelectorAll('[data-f]').forEach((b) => {
      b.onclick = () => { this.cmpFilter = b.dataset.f; this._paint(); };
    });
    const sf = this.$root.querySelector('#svcFilter');
    if (sf) sf.onchange = () => { this.cmpService = sf.value; this._paint(); };
    const sfc = this.$root.querySelector('#svcFilterClear');
    if (sfc) sfc.onclick = () => { this.cmpService = ''; this._paint(); };

    const ec = this.$root.querySelector('#btnExportCmp');
    if (ec) ec.onclick = () => this._exportComparisonCSV(all, rows);
    const ef = this.$root.querySelector('#btnExportFinal');
    if (ef) ef.onclick = () => resolution.exportFinalList(rows);
    const fs = this.$root.querySelector('#btnFillSug');
    if (fs) fs.onclick = () => {
      resolution.fillAllWithSuggestion(rows);
      slice.events.emit('toast:show', { message: 'Sugerencias fijadas como decisión' });
      this._paint();
    };
    const cr = this.$root.querySelector('#btnClearRes');
    if (cr) cr.onclick = () => {
      slice.events.emit('confirm:request', {
        title: '¿Vaciar las decisiones de la lista final?',
        message: 'Vuelve a las sugerencias automáticas (consenso/mayoría) para todos los miembros.',
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

  _exportComparisonCSV(all, rows) {
    const roster = this._roster;
    const resolution = slice.getComponent('ResolutionService');
    const svcName = (id) => (id ? roster.getTeamById(id)?.nombre || id : '—');
    const header = ['Miembro', 'Sexo', ...all.map((s) => s.autor), 'Estado', 'Final'];
    const lines = [header.map(csvCell).join(',')];
    rows.forEach((r) => {
      const stTxt = { agree: 'Coincide', disagree: 'Difiere', partial: 'Faltan votos', none: 'Sin asignar' }[r.status];
      const fin = resolution.finalFor(r);
      lines.push([r.member.nombre, r.member.sexo || '', ...r.vals.map((v) => svcName(v)), stTxt, fin ? svcName(fin) : ''].map(csvCell).join(','));
    });
    slice.getComponent('FileDownloadService').download('comparacion_equipos.csv', '﻿' + lines.join('\r\n'), 'text/csv');
  }
}

customElements.define('slice-compareview', CompareView);
