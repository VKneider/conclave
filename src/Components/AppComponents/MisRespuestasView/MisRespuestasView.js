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
    this._html = slice.getComponent('HtmlService');
    // Bound once; guarded by isConnected + no-input-focused so it's inert
    // while this cached view isn't the one currently on screen.
    document.addEventListener('keydown', this._onKeydown);

    // Built once in the static toolbar (outside .mrv-dynamic, which _render()
    // rebuilds wholesale on every change) — no more focus/cursor-position
    // restore hack after each keystroke.
    this.$searchInput = await slice.build('Input', { sliceId: 'mrvSearch', placeholder: 'Buscar…' });
    this.$searchSlot.appendChild(this.$searchInput);
    this.$searchInput.addEventListener('input', () => {
      this.searchQuery = this.$searchInput.value;
      this.carouselIndex = 0;
      this.update();
    });

    // First paint: paint directly. The instance isn't registered with the
    // controller until init() resolves, so the framework-wrapped update()
    // isn't safe to call yet — that's reserved for later refreshes.
    await this._render();
    // Catches a mutation made while THIS view is on screen but the trigger
    // lives outside it (the footer's "Reiniciar" button) — MultiRoute's
    // update()-on-revisit alone only covers navigating back to this view.
    slice.context.watch('respuestas', this, () => this._render());
    slice.context.watch('plantilla', this, () => this._render());
    slice.context.watch('settings', this, () => this._render());
  }

  beforeDestroy() {
    document.removeEventListener('keydown', this._onKeydown);
    clearTimeout(this._advanceTimer);
  }

  _onKeydown(e) {
    if (!this.isConnected) return;
    if (this.closest('[hidden]')) return;
    if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
    const list = this._visibleOpciones();
    if (e.key === 'ArrowLeft' && this.carouselIndex > 0) {
      this.carouselIndex--;
      this.update();
    } else if (e.key === 'ArrowRight' && this.carouselIndex < list.length - 1) {
      this.carouselIndex++;
      this.update();
    }
  }

  _visibleOpciones() {
    let list = this._roster.getOpcionesDisponibles();
    const q = this.searchQuery.trim().toLowerCase();
    if (q) list = list.filter((m) => m.nombre.toLowerCase().includes(q));
    return list;
  }

  // Refresh entrypoint for everything AFTER the first paint — called by
  // MultiRoute on revisit, and by every local mutation handler below. The
  // framework serializes/coalesces calls, so no manual guards needed here.
  async update() {
    await this._render();
  }

  async _render() {
    const roster = this._roster;
    const settings = slice.getComponent('SettingsService');
    const temas = roster.getTemasParticipables();
    const list = this._visibleOpciones();
    if (this.carouselIndex >= list.length) this.carouselIndex = Math.max(0, list.length - 1);

    const asignaciones = slice.getComponent('RespuestasService').getState().seleccion;
    const counts = roster.countByTema(asignaciones);
    const assignedVis = list.filter((m) => asignaciones[m.id]).length;
    const pct = list.length ? Math.round((assignedVis / list.length) * 100) : 0;
    this.$progressLabel.textContent = `${assignedVis}/${list.length} asignados`;

    let html = '';

    if (!list.length) {
      html += `<div class="empty-state">No hay opciones que coincidan.</div>`;
      this.$dynamic.innerHTML = this._html.sanitize(html);
      return;
    }

    const opcion = list[this.carouselIndex];
    const sel = asignaciones[opcion.id] || null;

    html += `
      <div class="carousel-wrap">
        <button class="arrow-btn" data-act="prev" ${this.carouselIndex === 0 ? 'disabled' : ''}>‹</button>
        <div class="person-card">
          <div class="person-top">
            <div>
              <div class="person-id">Opción ${this.carouselIndex + 1} de ${list.length} · #${opcion.id}</div>
              <div class="person-name">${this._html.esc(opcion.nombre)}</div>
            </div>
            <div class="person-tags">
              ${roster.getOpcionAtributos(opcion).map((a) => `<span class="tag">${this._html.esc(a.label)}: ${this._html.esc(a.display)}</span>`).join('')}
              ${sel && settings.isLideresEnabled() && !slice.getComponent('PlantillaService').isLiderLocked(sel) && settings.getEffectiveLider(sel)?.opcion?.id === opcion.id ? '<span class="tag tag-lider">Responsable</span>' : ''}
            </div>
          </div>
          <div class="current-assign">Asignado a: <b>${this._html.esc(roster.getTemaById(sel)?.nombre || '—')}</b>
          ${sel && slice.getComponent('SettingsService').isLideresEnabled() && !slice.getComponent('PlantillaService').isLiderLocked(sel) ? `<button class="lider-toggle${slice.getComponent('SettingsService').getEffectiveLider(sel)?.opcion?.id === opcion.id ? ' is-lider' : ''}" data-lider-toggle="${opcion.id}" type="button" title="Marcar/quitar como responsable">👑</button>` : ''}
           </div>
          <div class="assign-summary" id="assignSummary"></div>
          <div class="tema-pills">`;

    temas.forEach((t) => {
      const n = counts[t.id];
      // Already at/over capacity — still fully clickable (over-assigning is
      // allowed on purpose), just flagged so the organizer notices.
      const atCapacity = t.max != null && n >= t.max && sel !== t.id;
      html += `
        <button class="pill ${sel === t.id ? 'selected' : ''} ${atCapacity ? 'at-capacity' : ''}" data-tema="${t.id}">
          ${this._html.esc(t.nombre)} <span class="cap">${n}/${t.max != null ? t.max : '–'}</span>
        </button>`;
    });
    html += `<button class="pill pill-clear" data-tema="">✕ Sin asignar</button>`;

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
      html += `<span class="${cls.join(' ')}" data-idx="${i}" title="${this._html.esc(m.nombre)}"></span>`;
    });
    html += `</div>`;

    this.$dynamic.innerHTML = this._html.sanitize(html);
    this._bindInteractions(list, opcion);

    if (this._pendingAdvance) {
      const temaId = this._pendingAdvance;
      this._pendingAdvance = null;
      this._showAdvanceFeedback(opcion, temaId, list);
    }
  }

  _bindInteractions(list, opcion) {
    const prev = this.$root.querySelector('[data-act="prev"]');
    const next = this.$root.querySelector('[data-act="next"]');
    if (prev) prev.onclick = () => { if (this.carouselIndex > 0) { this.carouselIndex--; this.update(); } };
    if (next) next.onclick = () => { if (this.carouselIndex < list.length - 1) { this.carouselIndex++; this.update(); } };

    this.$root.querySelectorAll('.pill').forEach((btn) => {
      btn.onclick = () => {
        if (this._advancePending) return;
        const temaId = btn.dataset.tema;
        const assignment = slice.getComponent('RespuestasService');
        if (temaId) {
          assignment.assignOpcion(opcion.id, temaId);
          this._pendingAdvance = temaId;
        } else {
          assignment.unassignOpcion(opcion.id);
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
        const sel = slice.getComponent('RespuestasService').getState().seleccion[opcion.id];
        if (!sel) return;
        const current = settings.getEffectiveLider(sel);
        if (current?.opcion?.id === opcion.id) {
          settings.clearLider(sel);
        } else {
          settings.setLider(sel, String(opcion.id));
        }
        this.update();
      };
    }
  }

  _showAdvanceFeedback(opcion, temaId, list) {
    const roster = this._roster;
    const tema = roster.getTemaById(temaId);
    const temaName = tema?.nombre || temaId;
    this._advancePending = true;

    const pill = this.$root.querySelector(`.pill[data-tema="${temaId}"]`);
    if (pill) {
      pill.classList.add('pill-just-assigned');
    }

    const summaryEl = this.$root.querySelector('.assign-summary');
    if (summaryEl) {
      summaryEl.textContent = `${opcion.nombre} → ${temaName}`;
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
