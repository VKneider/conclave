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

    this.$content = this.querySelector('.app-shell__content');
    this.$saveStatus = this.querySelector('.save-status');
    this.$btnExport = this.querySelector('.btn-export');
    this.$btnReset = this.querySelector('.btn-reset');

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

    const topBar = await slice.build('TopBar', { sliceId: 'app-topbar' });
    this.$content.before(topBar);

    this.events = slice.events.bind(this);
    slice.context.watch('assignment', this, () => this._flashSave());
    slice.context.watch('resolutions', this, () => this._flashSave());

    // Content area — a MultiRoute swaps the matching view by URL. Every path
    // here must also exist in routes.js (the Router's source of truth).
    const content = await slice.build('MultiRoute', { sliceId: 'app-content', routes: ROUTES });
    this.$content.appendChild(content);
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
