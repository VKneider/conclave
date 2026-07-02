const KIND_TABS = [
  { key: 'seleccion', label: '🎯 Selección' },
  { key: 'texto', label: '📝 Texto libre' },
];
const MODE_TABS = [
  { key: 'carousel', label: 'Carrusel' },
  { key: 'board', label: 'Por categoría' },
];

// Two-level tab hierarchy, same shape as CompareView's kind/mode tabs: the
// PRIMARY choice is Selección vs Texto libre (only shown when the Plantilla
// mixes both — genuinely different tasks, not alternative views of the same
// one). Carrusel/Por categoría are the SECONDARY choice, nested inside
// Selección — real peer alternatives for the same assignment task. Flattening
// all three into one tab row (the previous shape) implied Texto libre was a
// third interchangeable "view", but it's reachable no other way and isn't
// answering the same question, so a flat row is a lie the UI told.
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
    this.$textoSlot = this.querySelector('[data-slot="texto"]');
    this._activeKind = 'seleccion';
    this._activeMode = 'carousel';

    this.$goPlantilla.addEventListener('click', () => slice.router.navigate('/plantilla'));

    this.$kindTabs.addEventListener('click', (e) => {
      const btn = e.target.closest('.av-kind-tab');
      if (!btn) return;
      this._activeKind = btn.dataset.kind;
      this._render();
    });
    this.$modeTabs.addEventListener('click', (e) => {
      const btn = e.target.closest('.av-mode-tab');
      if (!btn) return;
      this._activeMode = btn.dataset.mode;
      this._applyVisibility();
      this.$modeTabs.querySelectorAll('.av-mode-tab').forEach((el) => el.classList.toggle('active', el.dataset.mode === this._activeMode));
    });

    slice.controller.setComponentProps(this, props);
  }

  async init() {
    this._plantilla = slice.getComponent('PlantillaService');

    this._carouselView = await slice.build('MisRespuestasView', { sliceId: 'respuestas-carousel' });
    if (this._carouselView instanceof Node) this.$carouselSlot.appendChild(this._carouselView);

    this._boardView = await slice.build('PorCategoriaView', { sliceId: 'respuestas-board' });
    if (this._boardView instanceof Node) this.$boardSlot.appendChild(this._boardView);

    this._textoView = await slice.build('RespuestasTextoView', { sliceId: 'respuestas-texto' });
    if (this._textoView instanceof Node) this.$textoSlot.appendChild(this._textoView);

    this._render();

    // A Categoría can gain/lose Opciones or switch modo (PlantillaBuilderView's
    // CRUD) after this view already mounted — keep the tabs/empty-state in sync.
    slice.context.watch('plantilla', this, () => this._render());
  }

  update() {
    this._carouselView?.update();
    this._boardView?.update();
    this._textoView?.update();
  }

  beforeDestroy() {
    slice.controller.destroyByContainer(this.$carouselSlot);
    slice.controller.destroyByContainer(this.$boardSlot);
    slice.controller.destroyByContainer(this.$textoSlot);
  }

  _render() {
    const hasOpciones = this._plantilla.getOpciones().length > 0;
    const hasTexto = this._plantilla.getCategoriasTexto().length > 0;

    if (!hasOpciones && !hasTexto) {
      this.$empty.hidden = false;
      this.$kindTabs.hidden = true;
      this.$modeTabs.hidden = true;
      this.$slots.hidden = true;
      return;
    }
    this.$empty.hidden = true;
    this.$slots.hidden = false;

    if (hasOpciones && hasTexto) {
      if (!['seleccion', 'texto'].includes(this._activeKind)) this._activeKind = 'seleccion';
      this.$kindTabs.hidden = false;
      this.$kindTabs.innerHTML = KIND_TABS
        .map((k) => `<button class="av-kind-tab${k.key === this._activeKind ? ' active' : ''}" data-kind="${k.key}">${k.label}</button>`)
        .join('');
    } else {
      this.$kindTabs.hidden = true;
      this._activeKind = hasOpciones ? 'seleccion' : 'texto';
    }

    if (this._activeKind === 'seleccion' && hasOpciones) {
      if (!['carousel', 'board'].includes(this._activeMode)) this._activeMode = 'carousel';
      this.$modeTabs.hidden = false;
      this.$modeTabs.innerHTML = MODE_TABS
        .map((m) => `<button class="av-mode-tab${m.key === this._activeMode ? ' active' : ''}" data-mode="${m.key}">${m.label}</button>`)
        .join('');
    } else {
      this.$modeTabs.hidden = true;
    }

    this._applyVisibility();
  }

  _applyVisibility() {
    const showCarousel = this._activeKind === 'seleccion' && this._activeMode === 'carousel';
    const showBoard = this._activeKind === 'seleccion' && this._activeMode === 'board';
    const showTexto = this._activeKind === 'texto';
    this.$carouselSlot.hidden = !showCarousel;
    this.$boardSlot.hidden = !showBoard;
    this.$textoSlot.hidden = !showTexto;
    if (showBoard) this._boardView?.update();
    if (showCarousel) this._carouselView?.update();
    if (showTexto) this._textoView?.update();
  }
}

customElements.define('slice-respuestasview', RespuestasView);
