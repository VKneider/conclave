// One-person-at-a-time carousel. carouselIndex/searchQuery are instance
// fields (not context) — MultiRoute caches this instance, so they survive
// tab switches, matching the source app's closure-scoped behavior.
export default class MisRespuestasView extends HTMLElement {
  constructor(props) {
    super();
    slice.attachTemplate(this);
    this.$root = this.querySelector('.mis-respuestas-view');
    this.$searchSlot = this.querySelector('.mrv-search-slot');
    this.$progressLabel = this.querySelector('#progressLabel');
    this.$dynamic = this.querySelector('.mrv-dynamic');
    this.carouselIndex = 0;
    this.searchQuery = '';
    this._advancePending = false;
    this._onKeydown = this._onKeydown.bind(this);
    slice.controller.setComponentProps(this, props);
  }

  async init() {
    this._roster = slice.getComponent('PlantillaService');
    this._esc = slice.getComponent('FormatService').esc;
    this._sanitize = slice.getComponent('SanitizeService').sanitize.bind(slice.getComponent('SanitizeService'));
    // Bound once; guarded by isConnected + no-input-focused so it's inert
    // while this cached view isn't the one currently on screen.
    document.addEventListener('keydown', this._onKeydown);

    // Built once in the static toolbar (outside .mrv-dynamic, which _paint()
    // rebuilds wholesale on every change) — no more focus/cursor-position
    // restore hack after each keystroke.
    this.$searchInput = await slice.build('Input', { sliceId: 'mrv-search', placeholder: 'Buscar…' });
    this.$searchSlot.appendChild(this.$searchInput);
    this.$searchInput.addEventListener('input', () => {
      this.searchQuery = this.$searchInput.value;
      this.carouselIndex = 0;
      this.update();
    });

    // First paint: paint directly. The instance isn't registered with the
    // controller until init() resolves, so the framework-wrapped update()
    // isn't safe to call yet — that's reserved for later refreshes.
    await this._paint();
    // Catches a mutation made while THIS view is on screen but the trigger
    // lives outside it (the footer's "Reiniciar" button) — MultiRoute's
    // update()-on-revisit alone only covers navigating back to this view.
    slice.context.watch('respuestas', this, () => this._paint());
    slice.context.watch('plantilla', this, () => this._paint());
    slice.context.watch('settings', this, () => this._paint());
  }

  beforeDestroy() {
    document.removeEventListener('keydown', this._onKeydown);
    clearTimeout(this._advanceTimer);
  }

  _onKeydown(e) {
    if (!this.isConnected) return;
    if (this.closest('[hidden]')) return;
    if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
    const list = this._visibleMembers();
    if (e.key === 'ArrowLeft' && this.carouselIndex > 0) {
      this.carouselIndex--;
      this.update();
    } else if (e.key === 'ArrowRight' && this.carouselIndex < list.length - 1) {
      this.carouselIndex++;
      this.update();
    }
  }

  _visibleMembers() {
    let list = this._roster.getOpcionesDisponibles();
    const q = this.searchQuery.trim().toLowerCase();
    if (q) list = list.filter((m) => m.nombre.toLowerCase().includes(q));
    return list;
  }

  // Refresh entrypoint for everything AFTER the first paint — called by
  // MultiRoute on revisit, and by every local mutation handler below. The
  // framework serializes/coalesces calls, so no manual guards needed here.
  async update() {
    await this._paint();
  }

  async _paint() {
    const roster = this._roster;
    const settings = slice.getComponent('SettingsService');
    const teams = roster.getCategoriasParticipables();
    const list = this._visibleMembers();
    if (this.carouselIndex >= list.length) this.carouselIndex = Math.max(0, list.length - 1);

    const asignaciones = slice.getComponent('RespuestasService').getState().seleccion;
    const counts = roster.countByCategoria(asignaciones);
    const assignedVis = list.filter((m) => asignaciones[m.id]).length;
    const pct = list.length ? Math.round((assignedVis / list.length) * 100) : 0;
    this.$progressLabel.textContent = `${assignedVis}/${list.length} asignados`;

    let html = '';

    if (!list.length) {
      html += `<div class="empty-state">No hay opciones que coincidan.</div>`;
      this.$dynamic.innerHTML = this._sanitize(html);
      return;
    }

    const member = list[this.carouselIndex];
    const sel = asignaciones[member.id] || null;

    html += `
      <div class="carousel-wrap">
        <button class="arrow-btn" data-act="prev" ${this.carouselIndex === 0 ? 'disabled' : ''}>‹</button>
        <div class="person-card">
          <div class="person-top">
            <div>
              <div class="person-id">Opción ${this.carouselIndex + 1} de ${list.length} · #${member.id}</div>
              <div class="person-name">${this._esc(member.nombre)}</div>
            </div>
            <div class="person-tags">
              ${settings.isSexoEnabled() && member.meta?.sexo ? `<span class="tag sexo-${this._esc(member.meta.sexo)}">${member.meta.sexo === 'M' ? 'Masculino' : member.meta.sexo === 'F' ? 'Femenino' : this._esc(member.meta.sexo)}</span>` : ''}
              ${settings.isEdadEnabled() && member.meta?.edad != null ? `<span class="tag">${member.meta.edad} años</span>` : ''}
              ${sel && settings.isLideresEnabled() && !slice.getComponent('PlantillaService').isLiderLocked(sel) && settings.getEffectiveLider(sel)?.member?.id === member.id ? '<span class="tag tag-lider">Responsable</span>' : ''}
            </div>
          </div>
          <div class="current-assign">Asignado a: <b>${this._esc(roster.getCategoriaById(sel)?.nombre || '—')}</b>
          ${sel && slice.getComponent('SettingsService').isLideresEnabled() && !slice.getComponent('PlantillaService').isLiderLocked(sel) ? `<button class="lider-toggle${slice.getComponent('SettingsService').getEffectiveLider(sel)?.member?.id === member.id ? ' is-lider' : ''}" data-lider-toggle="${member.id}" type="button" title="Marcar/quitar como responsable">👑</button>` : ''}
           </div>
          <div class="assign-summary" id="assignSummary"></div>
          <div class="team-pills">`;

    teams.forEach((t) => {
      const n = counts[t.id];
      // Already at/over capacity — still fully clickable (over-assigning is
      // allowed on purpose), just flagged so the organizer notices.
      const atCapacity = t.max != null && n >= t.max && sel !== t.id;
      html += `
        <button class="pill ${sel === t.id ? 'selected' : ''} ${atCapacity ? 'at-capacity' : ''}" data-team="${t.id}">
          ${this._esc(t.nombre)} <span class="cap">${n}/${t.max != null ? t.max : '–'}</span>
        </button>`;
    });
    html += `<button class="pill pill-clear" data-team="">✕ Sin asignar</button>`;

    html += `
          </div>
        </div>
        <button class="arrow-btn" data-act="next" ${this.carouselIndex === list.length - 1 ? 'disabled' : ''}>›</button>
      </div>
      <div class="progress-row">
        <div class="progress-track"><span style="width:${pct}%"></span></div>
        <span class="progress-label">${pct}% completado</span>
      </div>
      <div class="dots">`;

    list.forEach((m, i) => {
      const cls = ['dot'];
      if (asignaciones[m.id]) cls.push('done');
      if (i === this.carouselIndex) cls.push('active');
      html += `<span class="${cls.join(' ')}" data-idx="${i}" title="${this._esc(m.nombre)}"></span>`;
    });
    html += `</div>`;

    this.$dynamic.innerHTML = this._sanitize(html);
    this._bindInteractions(list, member);

    if (this._pendingAdvance) {
      const teamId = this._pendingAdvance;
      this._pendingAdvance = null;
      this._showAdvanceFeedback(member, teamId, list);
    }
  }

  _bindInteractions(list, member) {
    const prev = this.$root.querySelector('[data-act="prev"]');
    const next = this.$root.querySelector('[data-act="next"]');
    if (prev) prev.onclick = () => { if (this.carouselIndex > 0) { this.carouselIndex--; this.update(); } };
    if (next) next.onclick = () => { if (this.carouselIndex < list.length - 1) { this.carouselIndex++; this.update(); } };

    this.$root.querySelectorAll('.pill').forEach((btn) => {
      btn.onclick = () => {
        if (this._advancePending) return;
        const teamId = btn.dataset.team;
        const assignment = slice.getComponent('RespuestasService');
        if (teamId) {
          assignment.assignOpcion(member.id, teamId);
          this._pendingAdvance = teamId;
        } else {
          assignment.unassignOpcion(member.id);
        }
        this.update();
      };
    });

    this.$root.querySelectorAll('.dot').forEach((d) => {
      d.onclick = () => { this.carouselIndex = +d.dataset.idx; this.update(); };
    });

    const liderToggle = this.$root.querySelector('[data-lider-toggle]');
    if (liderToggle) {
      liderToggle.onclick = () => {
        const settings = slice.getComponent('SettingsService');
        const sel = slice.getComponent('RespuestasService').getState().seleccion[member.id];
        if (!sel) return;
        const current = settings.getEffectiveLider(sel);
        if (current?.member?.id === member.id) {
          settings.clearLider(sel);
        } else {
          settings.setLider(sel, String(member.id));
        }
        this.update();
      };
    }
  }

  _showAdvanceFeedback(member, teamId, list) {
    const roster = this._roster;
    const team = roster.getCategoriaById(teamId);
    const teamName = team?.nombre || teamId;
    this._advancePending = true;

    const pill = this.$root.querySelector(`.pill[data-team="${teamId}"]`);
    if (pill) {
      pill.classList.add('pill-just-assigned');
    }

    const summaryEl = this.$root.querySelector('.assign-summary');
    if (summaryEl) {
      summaryEl.textContent = `${member.nombre} → ${teamName}`;
      summaryEl.classList.add('visible');
    }

    this._advanceTimer = setTimeout(() => {
      this._advancePending = false;
      if (this.carouselIndex < list.length - 1) this.carouselIndex++;
      this.update();
    }, 500);
  }
}

customElements.define('slice-misrespuestasview', MisRespuestasView);
