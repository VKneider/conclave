const VIEWS = [
  { key: 'carousel', label: 'Carrusel' },
  { key: 'board', label: 'Equipos' },
];

export default class AssignmentView extends HTMLElement {
  constructor(props) {
    super();
    slice.attachTemplate(this);
    this.$tabs = this.querySelector('.av-tabs');
    this.$carouselSlot = this.querySelector('[data-slot="carousel"]');
    this.$boardSlot = this.querySelector('[data-slot="board"]');
    this._activeView = 'carousel';
    slice.controller.setComponentProps(this, props);
  }

  async init() {
    this._buildTabs();

    this._carouselView = await slice.build('MyAssignmentView', { sliceId: 'assignment-carousel' });
    if (this._carouselView instanceof Node) this.$carouselSlot.appendChild(this._carouselView);

    this._boardView = await slice.build('ByTeamView', { sliceId: 'assignment-board' });
    if (this._boardView instanceof Node) this.$boardSlot.appendChild(this._boardView);

    this._showView(this._activeView);

    this.$tabs.addEventListener('click', (e) => {
      const btn = e.target.closest('.av-tab');
      if (!btn) return;
      this._showView(btn.dataset.view);
    });
  }

  update() {
    this._carouselView?.update();
    this._boardView?.update();
  }

  beforeDestroy() {
    slice.controller.destroyByContainer(this.$carouselSlot);
    slice.controller.destroyByContainer(this.$boardSlot);
  }

  _buildTabs() {
    const active = this._activeView;
    this.$tabs.innerHTML = VIEWS
      .map((v) => `<button class="av-tab${v.key === active ? ' active' : ''}" data-view="${v.key}">${v.label}</button>`)
      .join('');
  }

  _showView(key) {
    this._activeView = key;
    this.$tabs.querySelectorAll('.av-tab').forEach((el) => el.classList.toggle('active', el.dataset.view === key));
    this.$carouselSlot.hidden = key !== 'carousel';
    this.$boardSlot.hidden = key !== 'board';
    if (key === 'board') this._boardView?.update();
    if (key === 'carousel') this._carouselView?.update();
  }
}

customElements.define('slice-assignmentview', AssignmentView);
