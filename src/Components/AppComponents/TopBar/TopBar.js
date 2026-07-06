const TABS = [
  { path: '/dashboard', label: 'Dashboard' },
  { path: '/mis-respuestas', label: 'Mis respuestas' },
  { path: '/comparar', label: 'Comparar' },
  { path: '/resumen', label: 'Resumen' },
  { path: '/plantilla', label: 'Plantilla' },
];

export default class TopBar extends HTMLElement {
  constructor(props) {
    super();
    slice.attachTemplate(this);

    this.$topbar = this.querySelector('.topbar');
    this.$sub = this.querySelector('.brand-sub');
    this.$userMenuSlot = this.querySelector('.user-menu-slot');
    this.$tabs = this.querySelector('.tabs');
    this.$hamburger = this.querySelector('.hamburger');
    this.$brand = this.querySelector('.brand');

    this.$brand.addEventListener('click', (e) => {
      if (e.target.closest('a')) return;
      slice.router.navigate('/');
    });

    this._renderTabs();

    this.$hamburger.addEventListener('click', () => {
      this.$topbar.classList.toggle('open');
    });

    this.$tabs.addEventListener('click', (e) => {
      const a = e.target.closest('.tab');
      if (!a) return;
      e.preventDefault();
      this.$topbar.classList.remove('open');
      slice.router.navigate(a.dataset.path).then(() => this._updateActiveTab());
    });

    slice.controller.setComponentProps(this, props);
  }

  async init() {
    const userMenu = await slice.build('UserMenu', { sliceId: 'app-user-menu' });
    this.$userMenuSlot.appendChild(userMenu);

    this.events = slice.events.bind(this);
    slice.context.watch('plantilla', this, (p) => this._renderBrandSub(p.nombre));

    this.events.subscribe('router:change', () => this._updateActiveTab());
    window.addEventListener('popstate', () => this._updateActiveTab());
    this._updateActiveTab();
  }

  _renderTabs() {
    this.$tabs.innerHTML = TABS
      .map((t) => `<a href="${t.path}" class="tab" data-path="${t.path}">${t.label}</a>`)
      .join('');
  }

  _updateActiveTab() {
    const path = window.location.pathname || '/';
    this.$tabs.querySelectorAll('.tab').forEach((el) => {
      el.classList.toggle('active', el.dataset.path === path);
    });
  }

  _renderBrandSub(name) {
    this.$sub.textContent = name || 'Configura el nombre de tu Plantilla en Plantilla';
  }
}

customElements.define("slice-topbar", TopBar);
