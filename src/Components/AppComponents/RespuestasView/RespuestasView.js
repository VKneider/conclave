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
// (Asignación / Votación / Texto libre, variant 'primary') show ALL kinds,
// marking completion with ✅ and showing a notice for kinds without temas.
// SECONDARY mode tabs (Carrusel / Por tema, variant 'secondary') are nested
// peer views of the SAME Asignación task.
export default class RespuestasView extends HTMLElement {
  constructor(props) {
    super();
    slice.attachTemplate(this);
    this.$emptySlot = this.querySelector('[data-el="emptySlot"]');
    this.$kindTabs = this.querySelector('.av-kind-tabs');
    this.$modeTabs = this.querySelector('.av-mode-tabs');
    this.$kindNotice = this.querySelector('[data-el="kindNotice"]');
    this.$kindNoticeText = this.querySelector('[data-el="kindNoticeText"]');
    this.$slots = this.querySelector('.av-slots');
    this.$carouselSlot = this.querySelector('[data-slot="carousel"]');
    this.$boardSlot = this.querySelector('[data-slot="board"]');
    this.$votacionSlot = this.querySelector('[data-slot="votacion"]');
    this.$rankingSlot = this.querySelector('[data-slot="ranking"]');
    this.$textoSlot = this.querySelector('[data-slot="texto"]');
    this.$progress = this.querySelector('[data-el="progress"]');
    this.$progressBar = this.querySelector('[data-el="progressBar"]');
    this.$progressLabel = this.querySelector('[data-el="progressLabel"]');
    this.$nextSection = this.querySelector('[data-el="nextSection"]');
    this.$nextText = this.querySelector('[data-el="nextText"]');
    this.$nextBtnSlot = this.querySelector('[data-el="nextBtnSlot"]');
    this.$exportSlot = this.querySelector('[data-el="exportSlot"]');
    this._activeKind = 'seleccion';
    this._activeMode = 'carousel';
    this._kindAvail = { seleccion: false, votacion: false, ranking: false, texto: false };
    this._kindComplete = { seleccion: false, votacion: false, ranking: false, texto: false };
    this._slotPromptEl = null;

    slice.controller.setComponentProps(this, props);
  }

  async init() {
    this._plantilla = slice.getComponent('PlantillaService');

    this._emptyCmp = await slice.build('EmptyState', {
      icon: '\uD83D\uDCC2',
      title: 'Todav\u00EDa no hay nada que responder',
      description: 'Tu Plantilla todav\u00EDa no tiene nada para responder \u2014 ni Opciones para asignar, ni Temas de votaci\u00F3n o texto libre. Ve a Plantilla para armarla.',
      buttonLabel: '\uD83D\uDCD0 Ir a Plantilla',
      buttonRoute: '/plantilla',
    });
    if (this._emptyCmp instanceof Node) this.$emptySlot.appendChild(this._emptyCmp);

    this._kindTabsCmp = await slice.build('Tabs', {
      sliceId: 'avKindTabs',
      variant: 'primary',
      items: KIND_TABS,
      activeTab: this._activeKind,
      onChange: (id) => { this._activeKind = id; this._render(); },
    });
    if (this._kindTabsCmp instanceof Node) this.$kindTabs.appendChild(this._kindTabsCmp);

    this._modeTabsCmp = await slice.build('Tabs', {
      sliceId: 'avModeTabs',
      variant: 'secondary',
      items: MODE_TABS,
      activeTab: this._activeMode,
      onChange: (id) => { this._activeMode = id; this._applyVisibility(); },
    });
    if (this._modeTabsCmp instanceof Node) this.$modeTabs.appendChild(this._modeTabsCmp);

    this._carouselView = await slice.build('MisRespuestasView', { sliceId: 'respuestasCarousel' });
    if (this._carouselView instanceof Node) this.$carouselSlot.appendChild(this._carouselView);

    this._boardView = await slice.build('PorTemaView', { sliceId: 'respuestasBoard' });
    if (this._boardView instanceof Node) this.$boardSlot.appendChild(this._boardView);

    this._votacionView = await slice.build('RespuestasVotacionView', { sliceId: 'respuestasVotacion' });
    if (this._votacionView instanceof Node) this.$votacionSlot.appendChild(this._votacionView);

    this._rankingView = await slice.build('RespuestasRankingView', { sliceId: 'respuestasRanking' });
    if (this._rankingView instanceof Node) this.$rankingSlot.appendChild(this._rankingView);

    this._textoView = await slice.build('RespuestasTextoView', { sliceId: 'respuestasTexto' });
    if (this._textoView instanceof Node) this.$textoSlot.appendChild(this._textoView);

    this._exportBtn = await slice.build('Button', {
      sliceId: 'avExportBtn',
      value: '📤 Compartir respuestas',
      variant: 'filled',
      onClick: () => this._openExportModal(),
    });
    if (this._exportBtn instanceof Node) this.$exportSlot.appendChild(this._exportBtn);

    this._nextBtnCmp = await slice.build('Button', {
      sliceId: 'avNextBtn',
      variant: 'filled',
      value: '',
    });
    if (this._nextBtnCmp instanceof Node) this.$nextBtnSlot.appendChild(this._nextBtnCmp);
    this._nextBtnCmp.$button.disabled = true;

    this._render();

    slice.context.watch('plantilla', this, () => this._render());
    // The progress line reflects answers across every modo — keep it live as
    // the user responds (the sub-views own their own respuestas repaints).
    slice.context.watch('respuestas', this, () => this._updateProgress());
  }

  _computeKindProgress() {
    const p = this._plantilla.getAnswerProgress();
    return {
      seleccion: { total: p.reparto.total, answered: p.reparto.answered, complete: p.reparto.total > 0 && p.reparto.answered === p.reparto.total },
      votacion: { total: p.votacion.total, answered: p.votacion.answered, complete: p.votacion.total > 0 && p.votacion.answered === p.votacion.total },
      ranking: { total: p.ranking.total, answered: p.ranking.answered, complete: p.ranking.total > 0 && p.ranking.answered === p.ranking.total },
      texto: { total: p.texto.total, answered: p.texto.answered, complete: p.texto.total > 0 && p.texto.answered === p.texto.total },
    };
  }

  _updateTabItems() {
    const items = (this._availableKinds || KIND_TABS).map((k) => ({
      id: k.id,
      label: this._kindComplete[k.id] ? `✅ ${k.label}` : k.label,
    }));
    this._kindTabsCmp.items = items;
  }

  _updateProgress() {
    const kindProgress = this._computeKindProgress();
    for (const k of ['seleccion', 'votacion', 'ranking', 'texto']) {
      this._kindComplete[k] = kindProgress[k].complete;
    }

    const p = {
      total: kindProgress.seleccion.total + kindProgress.votacion.total + kindProgress.ranking.total + kindProgress.texto.total,
      answered: kindProgress.seleccion.answered + kindProgress.votacion.answered + kindProgress.ranking.answered + kindProgress.texto.answered,
    };

    this._updateTabItems();

    if (p.total === 0) { this.$progress.hidden = true; this.$nextSection.hidden = true; return; }
    this.$progress.hidden = false;
    const pct = Math.round((p.answered / p.total) * 100);
    this.$progressBar.style.width = `${pct}%`;
    this.$progressLabel.textContent = `Respondiste ${p.answered} de ${p.total} (${pct}%)`;
    this._updateNextSection(p, kindProgress);
  }

  _updateNextSection(progress, kindProgress) {
    const kinds = this._availableKinds;
    if (!kinds || kinds.length < 2 || !progress) { this.$nextSection.hidden = true; this._removeSlotPrompt(); return; }

    const kindMap = { seleccion: 'reparto', votacion: 'votacion', ranking: 'ranking', texto: 'texto' };
    const pk = kindMap[this._activeKind];
    const kp = pk ? kindProgress[pk] : null;
    const isComplete = kp && kp.total > 0 && kp.answered === kp.total;

    if (!isComplete) { this.$nextSection.hidden = true; this._removeSlotPrompt(); return; }

    const currentIdx = kinds.findIndex((k) => k.id === this._activeKind);
    if (currentIdx < 0 || currentIdx >= kinds.length - 1) {
      this.$nextSection.hidden = false;
      this.$nextText.textContent = '¡Todas las secciones están completas! 🎉';
      this._nextBtnCmp.value = 'Todo listo';
      this._nextBtnCmp.$button.disabled = false;
      this._nextBtnCmp.onClick = () => this._openExportModal();
      return;
    }

    const next = kinds[currentIdx + 1];
    this.$nextSection.hidden = false;
    this._nextBtnCmp.$button.disabled = false;
    this._nextBtnCmp.value = `Ir a ${next.label} →`;
    this._nextBtnCmp.onClick = () => {
      this._activeKind = next.id;
      this._render();
    };
    this.$nextText.textContent = '';

    // Show inline prompt inside the active slot
    this._showSlotPrompt(next);
  }

  async _showSlotPrompt(next) {
    this._removeSlotPrompt();

    if (this._activeKind !== 'seleccion' || this._activeMode !== 'carousel') return;

    const prompt = document.createElement('div');
    prompt.className = 'av-slot-prompt';

    const text = document.createElement('span');
    text.className = 'av-slot-prompt__text';
    text.textContent = '✅ ¡Sección completa! Pasá a la siguiente →';
    prompt.appendChild(text);

    const btn = await slice.build('Button', {
      value: `Ir a ${next.label} →`,
      variant: 'filled',
      onClick: () => {
        this._activeKind = next.id;
        this._render();
      },
    });
    if (btn instanceof Node) prompt.appendChild(btn);

    this.$carouselSlot.appendChild(prompt);
    this._slotPromptEl = prompt;
  }

  _removeSlotPrompt() {
    if (this._slotPromptEl) {
      this._slotPromptEl.remove();
      this._slotPromptEl = null;
    }
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
    slice.controller.destroyByContainer(this.$emptySlot);
  }

  _render() {
    const hasReparto = this._plantilla.getTemasParticipables().length > 0 && this._plantilla.getOpcionesPool().length > 0;
    const hasVotacion = this._plantilla.getTemasVotacion().length > 0;
    const hasRanking = this._plantilla.getTemasRanking().length > 0;
    const hasTexto = this._plantilla.getTemasTexto().length > 0;
    this._kindAvail = { seleccion: hasReparto, votacion: hasVotacion, ranking: hasRanking, texto: hasTexto };
    const availArr = KIND_TABS.filter((k) => this._kindAvail[k.id]);
    this._availableKinds = availArr;

    // Show kind tabs only when there are multiple kinds to choose from
    if (!availArr.length) {
      this.$emptySlot.hidden = false;
      this.$kindTabs.hidden = true;
      this.$modeTabs.hidden = true;
      this.$slots.hidden = true;
      this.$kindNotice.hidden = true;
      this.$progress.hidden = true;
      this.$nextSection.hidden = true;
      return;
    }
    this.$emptySlot.hidden = true;
    this.$slots.hidden = false;

    this._updateProgress();

    // If the active kind is not available, fall back to first available
    if (!this._kindAvail[this._activeKind]) {
      this._activeKind = availArr[0].id;
    }

    if (availArr.length > 1) {
      this.$kindTabs.hidden = false;
    } else {
      this.$kindTabs.hidden = true;
    }

    this._kindTabsCmp.activeTab = this._activeKind;

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
    const showVotacion = this._activeKind === 'votacion' && this._kindAvail.votacion;
    const showRanking = this._activeKind === 'ranking' && this._kindAvail.ranking;
    const showTexto = this._activeKind === 'texto' && this._kindAvail.texto;
    this.$carouselSlot.hidden = !showCarousel;
    this.$boardSlot.hidden = !showBoard;
    this.$votacionSlot.hidden = !showVotacion;
    this.$rankingSlot.hidden = !showRanking;
    this.$textoSlot.hidden = !showTexto;

    // Show notice when kind has no temas to answer
    if (!this._kindAvail[this._activeKind]) {
      const labels = { seleccion: 'Asignación', votacion: 'Votación', ranking: 'Ranking', texto: 'Texto libre' };
      this.$kindNotice.hidden = false;
      this.$kindNoticeText.textContent = `No hay temas de ${labels[this._activeKind] || this._activeKind} en esta plantilla.`;
    } else {
      this.$kindNotice.hidden = true;
    }

    if (showCarousel) this._carouselView?.update();
    if (showBoard) this._boardView?.update();
    if (showVotacion) this._votacionView?.update();
    if (showRanking) this._rankingView?.update();
    if (showTexto) this._textoView?.update();
  }

  _openExportModal() {
    const modal = slice.getComponent('exportRespuestasModal');
    if (modal?.show) modal.show();
  }
}

customElements.define('slice-respuestasview', RespuestasView);
