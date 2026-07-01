import { esc } from '/utils/format.js';

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
    this.cmpView = 'member';
    slice.controller.setComponentProps(this, props);
  }

  async init() {
    this._roster = slice.getComponent('RosterService');

    const importDrop = await slice.build('ImportDrop', { sliceId: 'cmp-import' });
    importDrop.onFiles = (files) => this._handleFiles(files);
    this.querySelector('.cmp-import-slot').appendChild(importDrop);

    this._finalTally = await slice.build('FinalTally', { sliceId: 'cmp-finaltally' });
    this.querySelector('.cmp-finaltally-slot').appendChild(this._finalTally);

    await this._paint();
    slice.context.watch('assignment', this, () => this._paint());
    slice.context.watch('resolutions', this, () => this._paint());
    slice.events.subscribe('roster:changed', () => this._paint());
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

  _buildTeamRows(all) {
    const teams = this._roster.getAssignableTeams();
    return teams.map((team) => {
      const vals = all.map((src) => {
        const members = [];
        Object.keys(src.asignaciones).forEach((memberId) => {
          if (src.asignaciones[memberId] === team.id) {
            const m = this._roster.getMemberById(memberId);
            if (m) members.push(m);
          }
        });
        return members;
      });
      return { team, vals };
    });
  }

  _autoResolveAgreed(rows) {
    const resolution = slice.getComponent('ResolutionService');
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
    const all = this._buildComparisonSources();
    this._renderSourceTags(all);
    if (all.length < 2) {
      this.$root.querySelector('.cmp-dynamic').innerHTML = '<div class="empty-state">Importa al menos un JSON de otra persona para comparar.<br/>Tu trabajo actual ya cuenta como una fuente.</div>';
      this._finalTally.items = [];
      return;
    }
    const rows = this._buildRows(all);
    const prevScrollTop = this.$root.querySelector('.cmp-table-wrap')?.scrollTop;
    const isTeam = this.cmpView === 'team';
    this.$root.querySelector('.cmp-final-heading').hidden = isTeam;
    this.$root.querySelector('.cmp-final-heading + .view-sub').hidden = isTeam;
    this.$root.querySelector('.cmp-finaltally-slot').hidden = isTeam;
    if (isTeam) {
      this._renderTeamView(all, prevScrollTop);
      this._finalTally.items = [];
    } else {
      this._renderMemberView(all, rows, prevScrollTop);
    }
  }

  _renderSourceTags(all) {
    const container = this.$root.querySelector('.source-list');
    if (!container) return;
    container.innerHTML = all.map((src) => {
      const count = Object.values(src.asignaciones).filter(Boolean).length;
      return `<div class="source-tag"><span class="swatch" style="background:${src.color}"></span>${esc(src.autor)} <span style="color:var(--font-secondary-color)">(${count})</span>${src.removable ? `<button data-rm="${esc(src.autor)}" title="Quitar">✕</button>` : ''}</div>`;
    }).join('');
    container.querySelectorAll('[data-rm]').forEach((b) => {
      b.onclick = () => {
        this.sources = this.sources.filter((s) => s.autor !== b.dataset.rm);
        this._paint();
      };
    });
  }

  _renderMemberView(all, rows, prevScrollTop) {
    const roster = this._roster;
    const teams = roster.getAssignableTeams();
    const resolution = slice.getComponent('ResolutionService');
    const svcName = (id) => (id ? roster.getTeamById(id)?.nombre || id : '—');

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
        <input class="mini-input cmp-search" type="text" placeholder="Buscar miembro…" value="${esc(this.cmpQuery)}" autocomplete="off" />
        <label class="svc-filter">Equipo
          <select id="svcFilter">
            <option value="">Todos los equipos</option>
            ${teams.map((t) => `<option value="${t.id}" ${this.cmpService === t.id ? 'selected' : ''}>${esc(t.nombre)} (${proposedCounts[t.id]})</option>`).join('')}
          </select>
        </label>
        <span class="spacer" style="flex:1"></span>
        <button class="btn btn-sm" id="btnTeamView">◉ Vista por equipo</button>
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
      const suggestion = r.status !== 'agree' ? resolution.suggestFinal(r) : null;
      html += `<td class="final-cell"><select class="final-select ${needsReview ? 'suggested' : ''}" data-member="${r.member.id}" style="border-left:4px solid ${col}">`;
      html += `<option value="">${needsReview && suggestion ? `↳ Sugerencia: ${esc(svcName(suggestion))}` : '— sin decidir'}</option>`;
      teams.forEach((t) => { html += `<option value="${t.id}" ${f === t.id ? 'selected' : ''}>${esc(t.nombre)}</option>`; });
      html += `</select>${needsReview && suggestion ? `<span class="suggestion-hint">↳ ${esc(svcName(suggestion))}</span>` : ''}</td></tr>`;
    });
    html += `</tbody></table></div>`;

    this.$root.querySelector('.cmp-dynamic').innerHTML = html;
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
        badgeText: { ok: 'En rango', under: `Faltan ${t.min - n}`, over: `Sobran ${n - t.max}`, empty: 'Vacío' }[st],
      };
    });
  }

  _renderTeamView(all, prevScrollTop) {
    const roster = this._roster;
    const teams = roster.getAssignableTeams();
    const teamRows = this._buildTeamRows(all);

    let html = `
      <div class="cmp-filters">
        <label class="svc-filter">Equipo
          <select id="svcFilter">
            <option value="">Todos los equipos</option>
            ${teams.map((t) => `<option value="${t.id}" ${this.cmpService === t.id ? 'selected' : ''}>${esc(t.nombre)}</option>`).join('')}
          </select>
        </label>
        <input class="mini-input cmp-search" type="text" placeholder="Buscar miembro…" value="${esc(this.cmpQuery)}" autocomplete="off" />
        <span class="spacer" style="flex:1"></span>
        <button class="btn btn-sm btn-primary" id="btnMemberView">☰ Vista por miembro</button>
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

    html += `<div class="cmp-table-wrap"><table class="cmp-table team-table"><thead><tr><th>Equipo</th>`;
    all.forEach((src) => { html += `<th><span class="cell-val"><span class="swatch" style="background:${src.color}"></span>${esc(src.autor)}</span></th>`; });
    html += `<th>Consenso</th></tr></thead><tbody>`;

    shown.forEach((tr) => {
      const col = roster.colorFor(tr.team.id);
      html += `<tr><td><span class="color-dot" style="background:${col}"></span> <b>${esc(tr.team.nombre)}</b></td>`;
      tr.vals.forEach((members) => {
        const names = members.map((m) => m.nombre);
        html += `<td>${names.length ? names.map((n) => esc(n)).join(', ') : '<span class="muted">—</span>'}</td>`;
      });
      const agreeOn = tr.vals.reduce((acc, members) => {
        members.forEach((m) => { acc[m.id] = (acc[m.id] || 0) + 1; });
        return acc;
      }, {});
      const consensus = Object.keys(agreeOn).filter(
        (id) => agreeOn[id] >= all.length || agreeOn[id] >= all.filter((s) => s.asignaciones[id]).length
      );
      html += `<td>${consensus.length ? consensus.map((id) => esc(roster.getMemberById(id)?.nombre || id)).join(', ') : '<span class="muted">—</span>'}</td>`;
      html += `</tr>`;
    });

    html += `</tbody></table></div>`;
    this.$root.querySelector('.cmp-dynamic').innerHTML = html;
    const wrap = this.$root.querySelector('.cmp-table-wrap');
    if (wrap && prevScrollTop) wrap.scrollTop = prevScrollTop;

    this._bindTeamInteractions();
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
          if (this._isDuplicate(data)) {
            dupesSkipped++;
            slice.events.emit('toast:show', { message: `${file.name}: ya importado (mismo autor y asignaciones).`, type: 'warn' });
          } else {
            const stats = this._ingestSource(data, file.name);
            totalRecognized += stats.recognized;
            totalIgnored += stats.ignored;
          }
        } catch (e) {
          slice.events.emit('toast:show', { message: `No se pudo leer ${file.name}: JSON inválido.`, type: 'error' });
        }
        if (--pending === 0) {
          const all = this._buildComparisonSources();
          const rows = this._buildRows(all);
          this._autoResolveAgreed(rows);
          if (totalIgnored > 0) {
            slice.events.emit('toast:show', {
              message: `Importados ${totalRecognized} miembros de ${files.length - dupesSkipped} archivo(s). ${totalIgnored} ignorados (no existen en el roster actual).`,
              type: 'warn',
            });
          }
          this._paint();
        }
      };
      reader.readAsText(file);
    });
  }

  _isDuplicate(data) {
    const autor = data?.autor || '';
    const asignaciones = data?.asignaciones || {};
    return this.sources.some(
      (s) => s.autor === autor && JSON.stringify(s.asignaciones) === JSON.stringify(asignaciones)
    );
  }

  _ingestSource(data, filename) {
    const autorBase = data?.autor ? String(data.autor) : filename.replace(/\.json$/i, '');
    const asignaciones = data?.asignaciones || {};
    const roster = this._roster;
    const norm = {};
    let recognized = 0;
    let ignored = 0;
    Object.keys(asignaciones).forEach((k) => {
      const teamId = asignaciones[k];
      if (teamId && roster.getTeamById(teamId)) {
        norm[k] = teamId;
        recognized++;
      } else {
        ignored++;
      }
    });
    let autor = autorBase;
    let n = 2;
    while (this.sources.some((s) => s.autor === autor)) autor = `${autorBase} (${n++})`;
    this.sources.push({ autor, asignaciones: norm });
    return { recognized, ignored };
  }

  _bindTableInteractions(all, rows) {
    const resolution = slice.getComponent('ResolutionService');
    const search = this.$root.querySelector('.cmp-search');

    if (search) search.oninput = () => { this.cmpQuery = search.value; this._paint(); };
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

  _bindTeamInteractions() {
    const search = this.$root.querySelector('.cmp-search');
    if (search) search.oninput = () => { this.cmpQuery = search.value; this._paint(); };
    const sf = this.$root.querySelector('#svcFilter');
    if (sf) sf.onchange = () => { this.cmpService = sf.value; this._paint(); };
    const mv = this.$root.querySelector('#btnMemberView');
    if (mv) mv.onclick = () => { this.cmpView = 'member'; this._paint(); };
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
