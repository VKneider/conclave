// Drag-and-drop board. Chips and dropzones are built ONCE in _buildShell();
// every subsequent refresh only re-parents existing chip nodes into the
// right container (cheap, no rebuild) and updates counts/badges via cached
// refs / setComponentProps — never destroys and recreates them.
export default class PorTemaView extends HTMLElement {
  constructor(props) {
    super();
    slice.attachTemplate(this);
    this.$root = this.querySelector('.por-tema-view');
    this.searchQuery = '';
    slice.controller.setComponentProps(this, props);
  }

  async init() {
    this._roster = slice.getComponent('PlantillaService');
    this._dnd = slice.getComponent('DragDropService');
    this._html = slice.getComponent('HtmlService');
    this._icons = slice.getComponent('IconProvider');
    await this._buildShell();
    this._render();
    // Catches a mutation made while THIS view is on screen but the trigger
    // lives outside it (the footer's "Reiniciar" button) — MultiRoute's
    // update()-on-revisit alone only covers navigating back to this view.
    slice.context.watch('respuestas', this, () => this.update());
    slice.context.watch('settings', this, () => this.update());
    slice.context.watch('plantilla', this, () => this.update());
  }

  // Called by MultiRoute on cached revisit — the shell/chips/dropzones
  // already exist, only positions/counts need refreshing.
  async update() {
    const currentIds = new Set(this._roster.getTemasParticipables().map((t) => t.id));
    const builtIds = new Set(Object.keys(this._teamEls || {}));
    const needsRebuild = [...currentIds].some((id) => !builtIds.has(id)) || currentIds.size !== builtIds.size;
    if (needsRebuild) {
      this._dropzones?.forEach((z) => this._dnd.detach(z));
      slice.controller.destroyByContainer(this.$root);
      this._teamEls = {};
      this._unassignedEls = {};
      this._badges = {};
      this._chips = {};
      this._dropzones = [];
      this.$root.innerHTML = '';
      await this._buildShell();
    } else {
      await this._ensureChips();
    }
    this._render();
  }

  beforeDestroy() {
    this._dropzones?.forEach((z) => this._dnd.detach(z));
    // Chips/badges were built with slice.build after init(), so the
    // parent-destroy cascade won't find them — clean up explicitly.
    slice.controller.destroyByContainer(this.$root);
  }

  async _buildShell() {
    const roster = this._roster;
    const ic = (n, s, c) => this._icons.svg(n, s, c);
    const temas = roster.getTemasParticipables();

    let html = `
      <p class="view-sub">Arrastra una Opción desde la barra lateral hacia un Tema. Puedes pasar el máximo si hace falta — el Tema queda marcado hasta que muevas o quites a alguien. ${ic('target', 14)}</p>
      <div class="ps-layout">
        <aside class="ps-sidebar dropzone ps-unassigned" data-drop="">
          <div class="sidebar-head">
            <h3>${ic('users', 16)} Sin asignar <span class="badge-slot" data-badge="unassigned"></span></h3>
            <span class="sidebar-hint">Arrastra a un tema · suelta aquí para quitar</span>
            <div class="sidebar-search-slot"></div>
          </div>
          <div class="sidebar-chips" data-chips="unassigned"></div>
          <div class="ps-empty" data-empty="unassigned" hidden></div>
        </aside>
        <div class="ps-main"><div class="ps-grid">`;

    temas.forEach((t) => {
      const col = roster.colorFor(t.id);
      html += `
        <div class="ps-square dropzone" data-drop="${t.id}" style="--svc:${col}">
          <div class="lider-drop" data-lider="${t.id}">
            <span class="lider-drop__icon">${ic('crown', 14, 'var(--warning-color)')}</span>
            <span class="lider-drop__name" data-lider-name="${t.id}"></span>
          </div>
          <div class="ps-sq-head">
            <h3><span class="color-dot" style="background:${col}"></span>${this._html.esc(t.nombre)}</h3>
            <span class="ps-count"><span data-el="n-${t.id}"></span><small>/${t.max != null ? t.max : '–'}</small></span>
          </div>
          <div class="ps-sq-meta">
            <span class="badge-slot" data-badge="${t.id}"></span>
            Mín ${t.min ?? '–'}
            <span class="full-tag" data-fulltag="${t.id}" hidden>LLENO</span>
          </div>
          <div class="bar"><span data-el="bar-${t.id}" style="background:${col}"></span></div>
          <div class="ps-people" data-chips="${t.id}"></div>
          <div class="ps-empty" data-empty="${t.id}" hidden>Arrastra personas aquí.</div>
        </div>`;
    });

    html += `</div></div></div>`;
    this.$root.innerHTML = this._html.sanitize(html);

    this._teamEls = {};
    temas.forEach((t) => {
      this._teamEls[t.id] = {
        chips: this.$root.querySelector(`[data-chips="${t.id}"]`),
        empty: this.$root.querySelector(`[data-empty="${t.id}"]`),
        n: this.$root.querySelector(`[data-el="n-${t.id}"]`),
        bar: this.$root.querySelector(`[data-el="bar-${t.id}"]`),
        fullTag: this.$root.querySelector(`[data-fulltag="${t.id}"]`),
        square: this.$root.querySelector(`.ps-square[data-drop="${t.id}"]`),
        liderDrop: this.$root.querySelector(`[data-lider="${t.id}"]`),
        liderName: this.$root.querySelector(`[data-lider-name="${t.id}"]`),
      };
    });
    this._unassignedEls = {
      chips: this.$root.querySelector('[data-chips="unassigned"]'),
      empty: this.$root.querySelector('[data-empty="unassigned"]'),
    };

    this.$searchInput = await slice.build('Input', { sliceId: 'pcvSearch', placeholder: 'Buscar…' });
    this.$root.querySelector('.sidebar-search-slot').appendChild(this.$searchInput);
    this.$searchInput.addEventListener('input', () => {
      this.searchQuery = this.$searchInput.value;
      this._render();
    });

    const badgeKeys = ['unassigned', ...temas.map((t) => t.id)];
    const badgeProps = badgeKeys.map((key) => ({ sliceId: `byteamBadge${key}`, status: 'empty', label: '' }));
    const [firstBadge, ...restBadges] = badgeProps;
    const firstBadgeNode = await slice.build('StatusBadge', firstBadge);
    const restBadgeNodes = await Promise.all(restBadges.map((p) => slice.build('StatusBadge', p)));
    const badgeNodes = [firstBadgeNode, ...restBadgeNodes];
    this._badges = {};
    badgeKeys.forEach((key, i) => {
      this.$root.querySelector(`[data-badge="${key}"]`).appendChild(badgeNodes[i]);
      if (key === 'unassigned') this._unassignedBadge = badgeNodes[i];
      else this._badges[key] = badgeNodes[i];
    });

    const opciones = roster.getOpcionesDisponibles();
    const chipProps = opciones.map((m) => ({ sliceId: `byteamChip${m.id}`, opcion: m, draggable: true }));
    const [firstChip, ...restChips] = chipProps;
    const firstChipNode = await slice.build('OpcionChip', firstChip);
    const restChipNodes = await Promise.all(restChips.map((p) => slice.build('OpcionChip', p)));
    const chipNodes = [firstChipNode, ...restChipNodes];
    this._chips = {};
    opciones.forEach((m, i) => { this._chips[m.id] = chipNodes[i]; });

    // Dropzone DOM nodes are stable now — register once, never re-attach.
    this._dropzones = Array.from(this.$root.querySelectorAll('.dropzone'));
    this._dropzones.forEach((zone) => {
      this._dnd.makeDroppable(zone, {
        accept: () => true,
        onDragEnter: (node, event) => {
          zone.classList.add('drag-over');
          const lz = zone.querySelector('[data-lider]');
          if (lz && lz.contains(event?.target)) lz.classList.add('drag-over');
        },
        onDragLeave: (node, event) => {
          zone.classList.remove('drag-over');
          const lz = zone.querySelector('[data-lider]');
          if (lz) lz.classList.remove('drag-over');
        },
        onDrop: (node, event, data) => {
          zone.classList.remove('drag-over');
          const liderZone = zone.querySelector('[data-lider]');
          if (liderZone) liderZone.classList.remove('drag-over');
          const isLiderDrop = liderZone && liderZone.contains(event.target);
          this._handleDrop(zone.dataset.drop, data?.opcionId, isLiderDrop);
        },
      });
    });
  }

  // Builds chips for any opciones added since _buildShell() (PlantillaBuilderView
  // can add opciones after this view mounted). Idempotent — does nothing if all
  // current opciones already have a chip.
  async _ensureChips() {
    const roster = this._roster;
    const opciones = roster.getOpcionesDisponibles();
    const missing = opciones.filter((m) => !this._chips[m.id]);
    if (missing.length === 0) return;
    const build = (m) => slice.build('OpcionChip', { sliceId: `byteamChip${m.id}`, opcion: m, draggable: true });
    const [first, ...rest] = missing;
    const firstChip = await build(first);
    const restChips = await Promise.all(rest.map(build));
    missing.forEach((m, i) => { this._chips[m.id] = i === 0 ? firstChip : restChips[i - 1]; });
  }

  // Re-parents each opcion's existing chip into its current zone and
  // refreshes counts/badges. No component is ever destroyed or rebuilt here.
  _render() {
    if (!this._teamEls) return;
    const roster = this._roster;
    const temas = roster.getTemasParticipables();
    const asignaciones = slice.getComponent('RespuestasService').getState().seleccion;
    const counts = roster.countByTema(asignaciones);
    const opciones = roster.getOpcionesDisponibles();
    const settings = slice.getComponent('SettingsService');

    const grouped = {};
    temas.forEach((t) => { grouped[t.id] = []; });
    const unassigned = [];
    opciones.forEach((m) => {
      const tid = asignaciones[m.id];
      if (tid && grouped[tid]) grouped[tid].push(m);
      else unassigned.push(m);
    });

    // The badge always reflects the TRUE unassigned count — search only
    // affects which chips are visible/draggable from the sidebar, not the
    // count organizers track their progress against.
    const query = this.searchQuery.trim().toLowerCase();
    const visibleUnassigned = query
      ? unassigned.filter((m) => m.nombre.toLowerCase().includes(query))
      : unassigned;
    // Non-matching chips are simply not appended anywhere (not hidden) —
    // they're shared singleton nodes re-parented by every _render() call,
    // so "not placed in the sidebar right now" already makes them invisible
    // and undraggable, same idea as an assigned chip living in a tema square.
    visibleUnassigned.forEach((m) => {
      const chip = this._chips[m.id];
      if (chip) this._unassignedEls.chips.appendChild(chip);
    });
    const noMatches = unassigned.length > 0 && visibleUnassigned.length === 0;
    this._unassignedEls.empty.hidden = !(unassigned.length === 0 || noMatches);
    this._unassignedEls.empty.innerHTML = unassigned.length === 0 ? `¡Todos asignados! ${this._icons.svg('party-popper', 16, 'var(--secondary-color)')}` : 'No hay coincidencias.';
    slice.setComponentProps(this._unassignedBadge, { status: 'empty', label: String(unassigned.length) });

    temas.forEach((t) => {
      const people = grouped[t.id];
      const els = this._teamEls[t.id];
      if (!els) return;
      people.forEach((m) => {
        const chip = this._chips[m.id];
        if (chip) els.chips.appendChild(chip);
      });
      els.empty.hidden = people.length > 0;

      const n = counts[t.id];
      const st = roster.statusOf(t, n);
      const atOrOverCapacity = t.max != null && n >= t.max;
      const isOver = st === 'over';
      const denom = t.max || Math.max(n, 1);
      const pct = Math.min(100, Math.round((n / denom) * 100));
      const label = roster.statusLabel(t, n);

      els.n.textContent = n;
      els.bar.style.width = `${pct}%`;
      els.fullTag.hidden = !atOrOverCapacity;
      els.fullTag.textContent = isOver ? 'Exceso' : 'Lleno';
      // "over" is the persistent, visible alert the organizer resolves by
      // moving/removing people — not a block. "full" (exactly at max) is
      // just informational.
      els.square.classList.toggle('is-full', atOrOverCapacity && !isOver);
      els.square.classList.toggle('is-over', isOver);
      slice.setComponentProps(this._badges[t.id], { status: st, label });

      const lideresEnabled = settings.isLideresEnabled();
      const liderLocked = roster.isLiderLocked(t.id);
      els.liderDrop.hidden = !lideresEnabled || liderLocked;
      if (lideresEnabled && !liderLocked) {
        const lider = settings.getEffectiveLider(t.id);
        if (lider && lider.opcion) {
          els.liderName.textContent = lider.opcion.nombre;
          els.liderDrop.classList.add('has-lider');
        } else {
          els.liderName.textContent = '';
          els.liderDrop.classList.remove('has-lider');
        }
      } else if (liderLocked) {
        els.liderName.textContent = '';
        els.liderDrop.classList.remove('has-lider');
      }
    });
  }

  _handleDrop(destTemaId, opcionId, asLider) {
    if (!opcionId) return;
    const sound = slice.getComponent('SoundService');
    const assignment = slice.getComponent('RespuestasService');
    const settings = slice.getComponent('SettingsService');
    if (destTemaId) {
      if (asLider) {
        assignment.assignOpcion(opcionId, destTemaId);
        settings.setLider(destTemaId, String(opcionId));
      } else {
        if (assignment.getState().seleccion[opcionId] === destTemaId) return;
        assignment.assignOpcion(opcionId, destTemaId);
      }
    } else {
      assignment.unassignOpcion(opcionId);
    }
    sound.play('ui.tap');
    this._render();
    const roster = this._roster;
    const asignaciones = assignment.getState().seleccion;
    const unassigned = roster.getOpcionesDisponibles().filter((m) => !asignaciones[m.id]).length;
    if (unassigned === 0) sound.play('ui.celebrate');
  }
}

customElements.define('slice-portemaview', PorTemaView);
