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

    // ── URL hash import ─────────────────────────────────────────────
    // If the page was opened with #plantilla=<compressed> or
    // #respuestas=<compressed>, decompress and offer to import. Must run
    // after Providers (services exist) but before the shell renders (so
    // the imported data is ready for all views).
    await this._tryImportFromHash();

    const topBar = await slice.build('TopBar', { sliceId: 'app-topbar' });
    this.$content.before(topBar);

    // Content area — a MultiRoute swaps the matching view by URL. Every path
    // here must also exist in routes.js (the Router's source of truth).
    const content = await slice.build('MultiRoute', { sliceId: 'app-content', routes: ROUTES });
    this.$content.appendChild(content);

    const bubble = await slice.build('ProfileBubble', { sliceId: 'app-profile-bubble' });
    document.body.appendChild(bubble);
  }
  // Checks for #plantilla=<lz-compressed> or #respuestas=<lz-compressed>
  // in the URL hash. If found, decompresses, validates, and prompts the
  // user to import.
  async _tryImportFromHash() {
    const hash = window.location.hash;
    if (!hash || !hash.includes('=')) return;

    const compressor = slice.getComponent('CompressionService');

    if (hash.startsWith('#plantilla=')) {
      await this._tryImportPlantilla(hash, compressor);
    } else if (hash.startsWith('#respuestas=')) {
      await this._tryImportRespuestas(hash, compressor);
    }
  }

  async _tryImportPlantilla(hash, compressor) {
    const compressed = hash.slice('#plantilla='.length);
    if (!compressed) return;

    let data;
    try {
      data = compressor.decompressFromURI(compressed);
      data = compressor.unpackFromURI(data);
    } catch (e) {
      console.warn('[AppShell] Error al descomprimir plantilla del hash:', e);
      return;
    }
    if (!data) return;

    const roster = slice.getComponent('PlantillaService');
    const html = slice.getComponent('HtmlService');
    let prepared;
    try {
      prepared = roster.prepareImport(data);
    } catch (err) {
      console.warn('[AppShell] Plantilla del hash inválida:', err.message);
      return;
    }

    const autor = data.autor || '';
    const email = data.email || '';

    const proceed = () => {
      try {
        roster.loadFromData(prepared.temas, prepared.opciones, prepared.nombre, prepared.atributos);
        slice.events.emit('toast:show', { message: 'Plantilla importada desde el enlace', type: 'success' });
        slice.router.navigate('/mis-respuestas');
      } catch (err) {
        slice.events.emit('toast:show', { message: err.message, type: 'error' });
      }
    };

    // Hash already consumed — clean it so a page refresh doesn't re-import.
    history.replaceState(null, '', window.location.pathname + window.location.search);

    const autorLine = autor ? `Creada por ${html.esc(autor)}${email ? ` (${html.esc(email)})` : ''}. ` : '';
    if (prepared.impact) {
      slice.events.emit('confirm:request', {
        title: '¿Importar la Plantilla desde el enlace?',
        message: `${autorLine}Se reemplazarán tus Temas y Opciones por los de «${html.esc(data.nombre || 'sin nombre')}». Se limpiarán ${prepared.impact} respuesta${prepared.impact !== 1 ? 's' : ''} que ya no aplicarían. Esta acción no se puede deshacer.`,
        confirmLabel: 'Importar',
        danger: true,
        onConfirm: proceed,
      });
    } else {
      proceed();
    }
  }

  async _tryImportRespuestas(hash, compressor) {
    const compressed = hash.slice('#respuestas='.length);
    if (!compressed) return;

    let data;
    try {
      data = compressor.decompressFromURI(compressed);
      data = compressor.unpackFromURI(data);
    } catch (e) {
      console.warn('[AppShell] Error al descomprimir respuestas del hash:', e);
      return;
    }
    if (!data || !data.respuestas) return;

    const html = slice.getComponent('HtmlService');
    const autor = data.autor || 'Alguien';
    const email = data.email || '';

    const proceed = () => {
      slice.getComponent('RespuestasImportService').import(data, autor);
      slice.events.emit('toast:show', {
        message: `Respuestas de «${html.esc(autor)}» agregadas para comparar`,
        type: 'success',
      });
      // Navigate to CompareView after import so the user sees the result.
      slice.router.navigate('/comparar');
    };

    // Hash already consumed — clean it so a page refresh doesn't re-import.
    history.replaceState(null, '', window.location.pathname + window.location.search);

    const autorLine = autor ? `${html.esc(autor)}${email ? ` (${html.esc(email)})` : ''}` : 'Alguien';
    slice.events.emit('confirm:request', {
      title: `¿Agregar respuestas de «${autorLine}»?`,
      message: 'Se agregarán a tu lista de comparación. Podés quitarlas después desde la vista Comparar.',
      confirmLabel: 'Agregar',
      onConfirm: proceed,
    });
  }
}

customElements.define('slice-app-shell', AppShell);
