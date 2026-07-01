const TABS = [
  { path: '/', label: 'Dashboard' },
  { path: '/mi-asignacion', label: 'Mi asignación' },
  { path: '/por-equipo', label: 'Por equipo' },
  { path: '/comparar', label: 'Comparar' },
  { path: '/ayuda', label: 'Ayuda' },
  { path: '/configuracion', label: 'Configuración' },
];

const ROUTES = [
  { path: '/', component: 'DashboardView' },
  { path: '/mi-asignacion', component: 'MyAssignmentView' },
  { path: '/por-equipo', component: 'ByTeamView' },
  { path: '/comparar', component: 'CompareView' },
  { path: '/ayuda', component: 'HelpView' },
  { path: '/configuracion', component: 'SettingsView' },
];

export default class AppShell extends HTMLElement {
  constructor(props) {
    super();
    slice.attachTemplate(this);

    this.$sub = this.querySelector('.brand-sub');
    this.$themeSlot = this.querySelector('.theme-switcher-slot');
    this.$tabs = this.querySelector('.tabs');
    this.$content = this.querySelector('.app-shell__content');
    this.$saveStatus = this.querySelector('.save-status');
    this.$btnExport = this.querySelector('.btn-export');
    this.$btnReset = this.querySelector('.btn-reset');

    this._renderTabs();

    this.$tabs.addEventListener('click', (e) => {
      const a = e.target.closest('.tab');
      if (!a) return;
      e.preventDefault();
      slice.router.navigate(a.dataset.path).then(() => this._updateActiveTab());
    });

    this.$btnExport.addEventListener('click', () => this._exportMine());
    this.$btnReset.addEventListener('click', () => {
      slice.events.emit('confirm:request', {
        title: '¿Reiniciar tus asignaciones?',
        message: 'Se borran todas TUS asignaciones. No afecta los JSON ya exportados.',
        confirmLabel: 'Reiniciar',
        danger: true,
        onConfirm: () => slice.getComponent('AssignmentService').reset(),
      });
    });

    slice.controller.setComponentProps(this, props);
  }

  async init() {
    // Boots every singleton service + context; every view depends on this
    // having completed (RosterService's fetch in particular) before it mounts.
    await slice.build('Providers', { singleton: true });

    const settings = slice.getComponent('SettingsService');
    this._renderBrandSub(settings.getState().nombreOrganizacion);

    // Theme file names are exact-case ("Light"/"Dark" match Themes/Light.css,
    // Themes/Dark.css) — the component's own default ('LIGHT'/'DARK') would
    // 404, since the framework fetches /Themes/${name}.css case-sensitively.
    const themeSwitcher = await slice.build('ThemeSwitcher', {
      sliceId: 'app-theme-switcher',
      themes: ['Light', 'Dark'],
      variant: 'button',
      label: 'Tema',
    });
    this.$themeSlot.appendChild(themeSwitcher);

    this.events = slice.events.bind(this);
    slice.context.watch('settings', this, (s) => this._renderBrandSub(s.nombreOrganizacion));
    slice.context.watch('assignment', this, () => this._flashSave());
    slice.context.watch('resolutions', this, () => this._flashSave());

    // The framework's router:change event can fire slightly before
    // slice.router.activeRoute is updated (its internal handling is
    // deferred a tick), so _updateActiveTab reads window.location.pathname
    // instead — pushState already lands before this event fires either way.
    this.events.subscribe('router:change', () => this._updateActiveTab());
    window.addEventListener('popstate', () => this._updateActiveTab());
    this._updateActiveTab();

    // Content area — a MultiRoute swaps the matching view by URL. Every path
    // here must also exist in routes.js (the Router's source of truth).
    const content = await slice.build('MultiRoute', { sliceId: 'app-content', routes: ROUTES });
    this.$content.appendChild(content);
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
    this.$sub.textContent = name || 'Configura el nombre de tu organización en Configuración';
  }

  _flashSave() {
    if (!this.$saveStatus) return;
    this.$saveStatus.textContent = '✓ Guardado';
    clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => {
      this.$saveStatus.textContent = 'Guardado automáticamente';
    }, 1200);
  }

  _exportMine() {
    const settings = slice.getComponent('SettingsService');
    if (settings.getState().autor?.trim()) {
      slice.getComponent('AssignmentService').exportMine();
      return;
    }
    slice.events.emit('confirm:request', {
      title: '¿Cuál es tu nombre?',
      message: 'Se incluye en el archivo exportado — también puedes configurarlo luego en Configuración.',
      confirmLabel: 'Exportar',
      inputLabel: 'Tu nombre',
      inputPlaceholder: '¿Quién asigna?',
      onConfirm: (name) => {
        if (!name) return;
        settings.setAutor(name);
        slice.getComponent('AssignmentService').exportMine();
      },
    });
  }
}

customElements.define('slice-app-shell', AppShell);
