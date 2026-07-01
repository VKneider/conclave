import { esc } from '/utils/format.js';

// One-person-at-a-time carousel. carouselIndex/searchQuery are instance
// fields (not context) — MultiRoute caches this instance, so they survive
// tab switches, matching the source app's closure-scoped behavior.
export default class MyAssignmentView extends HTMLElement {
  constructor(props) {
    super();
    slice.attachTemplate(this);
    this.$root = this.querySelector('.my-assignment-view');
    this.carouselIndex = 0;
    this.searchQuery = '';
    this._onKeydown = this._onKeydown.bind(this);
    slice.controller.setComponentProps(this, props);
  }

  async init() {
    this._roster = slice.getComponent('RosterService');
    // Bound once; guarded by isConnected + no-input-focused so it's inert
    // while this cached view isn't the one currently on screen.
    document.addEventListener('keydown', this._onKeydown);
    // First paint: paint directly. The instance isn't registered with the
    // controller until init() resolves, so the framework-wrapped update()
    // isn't safe to call yet — that's reserved for later refreshes.
    await this._paint();
    // Catches a mutation made while THIS view is on screen but the trigger
    // lives outside it (the footer's "Reiniciar" button) — MultiRoute's
    // update()-on-revisit alone only covers navigating back to this view.
    slice.context.watch('assignment', this, () => this._paint());
  }

  beforeDestroy() {
    document.removeEventListener('keydown', this._onKeydown);
  }

  _onKeydown(e) {
    if (!this.isConnected) return;
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
    let list = this._roster.getAssignableMembers();
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
    const teams = roster.getAssignableTeams();
    const list = this._visibleMembers();
    if (this.carouselIndex >= list.length) this.carouselIndex = Math.max(0, list.length - 1);

    const asignaciones = slice.getComponent('AssignmentService').getState();
    const counts = roster.countByTeam(asignaciones);
    const assignedVis = list.filter((m) => asignaciones[m.id]).length;
    const pct = list.length ? Math.round((assignedVis / list.length) * 100) : 0;

    let html = `
      <h2 class="view-title">Mi asignación</h2>
      <p class="view-sub">Usa las flechas ‹ › o el teclado (← →). Elige un equipo y avanza al siguiente miembro.</p>
      <div class="assign-toolbar">
        <input class="mini-input" id="buscar" placeholder="Buscar miembro…" value="${esc(this.searchQuery)}" style="width:220px" />
        <span class="spacer"></span>
        <span class="progress-label">${assignedVis}/${list.length} asignados</span>
      </div>`;

    if (!list.length) {
      html += `<div class="empty-state">No hay miembros que coincidan.</div>`;
      this.$root.innerHTML = html;
      this._bindToolbar();
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
              <div class="person-id">Miembro ${this.carouselIndex + 1} de ${list.length} · #${member.id}</div>
              <div class="person-name">${esc(member.nombre)}</div>
            </div>
            <div class="person-tags">
              ${member.sexo ? `<span class="tag sexo-${esc(member.sexo)}">${member.sexo === 'M' ? 'Masculino' : member.sexo === 'F' ? 'Femenino' : esc(member.sexo)}</span>` : ''}
              ${member.edad != null ? `<span class="tag">${member.edad} años</span>` : ''}
            </div>
          </div>
          <div class="current-assign">Asignado a: <b>${esc(roster.getTeamById(sel)?.nombre || '—')}</b></div>
          <div class="team-pills">`;

    teams.forEach((t) => {
      const n = counts[t.id];
      // Already at/over capacity — still fully clickable (over-assigning is
      // allowed on purpose), just flagged so the organizer notices.
      const atCapacity = t.max != null && n >= t.max && sel !== t.id;
      html += `
        <button class="pill ${sel === t.id ? 'selected' : ''} ${atCapacity ? 'at-capacity' : ''}" data-team="${t.id}">
          ${esc(t.nombre)} <span class="cap">${n}/${t.max != null ? t.max : '–'}</span>
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
      html += `<span class="${cls.join(' ')}" data-idx="${i}" title="${esc(m.nombre)}"></span>`;
    });
    html += `</div>`;

    this.$root.innerHTML = html;
    this._bindToolbar();
    this._bindInteractions(list, member);
  }

  _bindToolbar() {
    const input = this.$root.querySelector('#buscar');
    if (!input) return;
    input.oninput = () => {
      this.searchQuery = input.value;
      this.carouselIndex = 0;
      this.update().then(() => {
        const x = this.$root.querySelector('#buscar');
        if (x) { x.focus(); x.setSelectionRange(x.value.length, x.value.length); }
      });
    };
  }

  _bindInteractions(list, member) {
    const prev = this.$root.querySelector('[data-act="prev"]');
    const next = this.$root.querySelector('[data-act="next"]');
    if (prev) prev.onclick = () => { if (this.carouselIndex > 0) { this.carouselIndex--; this.update(); } };
    if (next) next.onclick = () => { if (this.carouselIndex < list.length - 1) { this.carouselIndex++; this.update(); } };

    this.$root.querySelectorAll('.pill').forEach((btn) => {
      btn.onclick = () => {
        const teamId = btn.dataset.team;
        const assignment = slice.getComponent('AssignmentService');
        if (teamId) {
          assignment.assign(member.id, teamId);
          if (this.carouselIndex < list.length - 1) this.carouselIndex++;
        } else {
          assignment.unassign(member.id);
        }
        this.update();
      };
    });

    this.$root.querySelectorAll('.dot').forEach((d) => {
      d.onclick = () => { this.carouselIndex = +d.dataset.idx; this.update(); };
    });
  }
}

customElements.define('slice-myassignmentview', MyAssignmentView);
