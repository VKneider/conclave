const ROUTES = [
  { path: '/', component: 'LandingView' },
  { path: '/dashboard', component: 'DashboardView' },
  { path: '/mis-respuestas', component: 'RespuestasView' },
  { path: '/comparar', component: 'CompareView' },
  { path: '/plantilla', component: 'PlantillaBuilderView' },
];

export default class AppShell extends HTMLElement {
  constructor(props) {
    super();
    slice.attachTemplate(this);
    this.$content = this.querySelector('.app-shell__content');
    slice.controller.setComponentProps(this, props);
  }

  async init() {
    // Boots every singleton service + context; every view depends on this
    // having completed (PlantillaService's load in particular) before it mounts.
    await slice.build('Providers', { singleton: true });

    const topBar = await slice.build('TopBar', { sliceId: 'app-topbar' });
    this.$content.before(topBar);

    // Content area — a MultiRoute swaps the matching view by URL. Every path
    // here must also exist in routes.js (the Router's source of truth).
    const content = await slice.build('MultiRoute', { sliceId: 'app-content', routes: ROUTES });
    this.$content.appendChild(content);
  }
}

customElements.define('slice-app-shell', AppShell);
