const KIND_TABS = [
  { id: 'seleccion', label: '🎯 Asignación' },
  { id: 'votacion', label: '🗳️ Votación' },
  { id: 'ranking', label: '🏆 Ranking' },
  { id: 'texto', label: '📝 Texto libre' },
];
const MODE_TABS = [
  { id: 'carousel', label: 'Carrusel' },
  { id: 'board', label: 'Por tema' },
];

// Multi-modo tab shell (see docs/COMPONENT-PATTERNS.md). PRIMARY kind tabs
// (Asignación / Votación / Texto libre, variant 'primary') appear only when the
// Plantilla actually offers more than one — they're genuinely different tasks.
// SECONDARY mode tabs (Carrusel / Por tema, variant 'secondary') are nested
// peer views of the SAME Asignación task. The view owns content visibility;
// each Tabs owns its own active state via onChange.
export default class RespuestasView extends HTMLElement {
  constructor(props) {
    super();
    slice.attachTemplate(this);
    this.$empty = this.querySelector('.av-empty');
    this.$goPlantilla = this.querySelector('[data-el="goPlantilla"]');
    this.$kindTabs = this.querySelector('.av-kind-tabs');
    this.$modeTabs = this.querySelector('.av-mode-tabs');
    this.$slots = this.querySelector('.av-slots');
    this.$carouselSlot = this.querySelector('[data-slot="carousel"]');
    this.$boardSlot = this.querySelector('[data-slot="board"]');
    this.$votacionSlot = this.querySelector('[data-slot="votacion"]');
    this.$rankingSlot = this.querySelector('[data-slot="ranking"]');
    this.$textoSlot = this.querySelector('[data-slot="texto"]');
    this.$progress = this.querySelector('[data-el="progress"]');
    this.$progressBar = this.querySelector('[data-el="progressBar"]');
    this.$progressLabel = this.querySelector('[data-el="progressLabel"]');
    this._activeKind = 'seleccion';
    this._activeMode = 'carousel';
    this._kindKey = '';

    this.$goPlantilla.addEventListener('click', () => slice.router.navigate('/plantilla'));

    slice.controller.setComponentProps(this, props);
  }

  async init() {
    this._plantilla = slice.getComponent('PlantillaService');

    this._kindTabsCmp = await slice.build('Tabs', {
      sliceId: 'av-kind-tabs',
      variant: 'primary',
      items: KIND_TABS,
      activeTab: this._activeKind,
      onChange: (id) => { this._activeKind = id; this._render(); },
    });
    if (this._kindTabsCmp instanceof Node) this.$kindTabs.appendChild(this._kindTabsCmp);

    this._modeTabsCmp = await slice.build('Tabs', {
      sliceId: 'av-mode-tabs',
      variant: 'secondary',
      items: MODE_TABS,
      activeTab: this._activeMode,
      onChange: (id) => { this._activeMode = id; this._applyVisibility(); },
    });
    if (this._modeTabsCmp instanceof Node) this.$modeTabs.appendChild(this._modeTabsCmp);

    this._carouselView = await slice.build('MisRespuestasView', { sliceId: 'respuestas-carousel' });
    if (this._carouselView instanceof Node) this.$carouselSlot.appendChild(this._carouselView);

    this._boardView = await slice.build('PorTemaView', { sliceId: 'respuestas-board' });
    if (this._boardView instanceof Node) this.$boardSlot.appendChild(this._boardView);

    this._votacionView = await slice.build('RespuestasVotacionView', { sliceId: 'respuestas-votacion' });
    if (this._votacionView instanceof Node) this.$votacionSlot.appendChild(this._votacionView);

    this._rankingView = await slice.build('RespuestasRankingView', { sliceId: 'respuestas-ranking' });
    if (this._rankingView instanceof Node) this.$rankingSlot.appendChild(this._rankingView);

    this._textoView = await slice.build('RespuestasTextoView', { sliceId: 'respuestas-texto' });
    if (this._textoView instanceof Node) this.$textoSlot.appendChild(this._textoView);

    this._render();

    slice.context.watch('plantilla', this, () => this._render());
    // The progress line reflects answers across every modo — keep it live as
    // the user responds (the sub-views own their own respuestas repaints).
    slice.context.watch('respuestas', this, () => this._updateProgress());
  }

  _updateProgress() {
    const p = this._plantilla.getAnswerProgress();
    if (p.total === 0) { this.$progress.hidden = true; return; }
    this.$progress.hidden = false;
    const pct = Math.round((p.answered / p.total) * 100);
    this.$progressBar.style.width = `${pct}%`;
    this.$progressLabel.textContent = `Respondiste ${p.answered} de ${p.total} (${pct}%)`;
  }

  update() {
    this._carouselView?.update();
    this._boardView?.update();
    this._votacionView?.update();
    this._rankingView?.update();
    this._textoView?.update();
  }

  beforeDestroy() {
    slice.controller.destroyByContainer(this.$carouselSlot);
    slice.controller.destroyByContainer(this.$boardSlot);
    slice.controller.destroyByContainer(this.$votacionSlot);
    slice.controller.destroyByContainer(this.$rankingSlot);
    slice.controller.destroyByContainer(this.$textoSlot);
    slice.controller.destroyByContainer(this.$kindTabs);
    slice.controller.destroyByContainer(this.$modeTabs);
  }

  _render() {
    // Availability by what each kind can actually answer:
    //  • Asignación (reparto) needs pool Opciones (votación-owned ones don't count).
    //  • Votación / Texto libre need at least one Tema of that modo.
    const hasReparto = this._plantilla.getTemasParticipables().length > 0 && this._plantilla.getOpcionesPool().length > 0;
    const hasVotacion = this._plantilla.getTemasVotacion().length > 0;
    const hasRanking = this._plantilla.getTemasRanking().length > 0;
    const hasTexto = this._plantilla.getTemasTexto().length > 0;

    const available = KIND_TABS.filter((k) =>
      (k.id === 'seleccion' && hasReparto)
      || (k.id === 'votacion' && hasVotacion)
      || (k.id === 'ranking' && hasRanking)
      || (k.id === 'texto' && hasTexto));

    if (!available.length) {
      this.$empty.hidden = false;
      this.$kindTabs.hidden = true;
      this.$modeTabs.hidden = true;
      this.$slots.hidden = true;
      this.$progress.hidden = true;
      return;
    }
    this.$empty.hidden = true;
    this.$slots.hidden = false;
    this._updateProgress();

    if (!available.some((k) => k.id === this._activeKind)) this._activeKind = available[0].id;

    if (available.length > 1) {
      this.$kindTabs.hidden = false;
      const key = available.map((k) => k.id).join(',');
      if (key !== this._kindKey) { this._kindTabsCmp.items = available; this._kindKey = key; }
      this._kindTabsCmp.activeTab = this._activeKind;
    } else {
      this.$kindTabs.hidden = true;
    }

    if (this._activeKind === 'seleccion') {
      if (!['carousel', 'board'].includes(this._activeMode)) this._activeMode = 'carousel';
      this.$modeTabs.hidden = false;
      this._modeTabsCmp.activeTab = this._activeMode;
    } else {
      this.$modeTabs.hidden = true;
    }

    this._applyVisibility();
  }

  _applyVisibility() {
    const showCarousel = this._activeKind === 'seleccion' && this._activeMode === 'carousel';
    const showBoard = this._activeKind === 'seleccion' && this._activeMode === 'board';
    const showVotacion = this._activeKind === 'votacion';
    const showRanking = this._activeKind === 'ranking';
    const showTexto = this._activeKind === 'texto';
    this.$carouselSlot.hidden = !showCarousel;
    this.$boardSlot.hidden = !showBoard;
    this.$votacionSlot.hidden = !showVotacion;
    this.$rankingSlot.hidden = !showRanking;
    this.$textoSlot.hidden = !showTexto;
    if (showCarousel) this._carouselView?.update();
    if (showBoard) this._boardView?.update();
    if (showVotacion) this._votacionView?.update();
    if (showRanking) this._rankingView?.update();
    if (showTexto) this._textoView?.update();
  }
}

customElements.define('slice-respuestasview', RespuestasView);
