const ROUTES = [
  { path: '/', component: 'LandingView' },
  { path: '/dashboard', component: 'DashboardView' },
  { path: '/mis-respuestas', component: 'RespuestasView' },
  { path: '/comparar', component: 'CompareView' },
  { path: '/resumen', component: 'ResumenFinalView' },
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

    const topBar = await slice.build('TopBar', { sliceId: 'appTopbar' });
    this.$content.before(topBar);

    // Content area — a MultiRoute swaps the matching view by URL. Every path
    // here must also exist in routes.js (the Router's source of truth).
    const content = await slice.build('MultiRoute', { sliceId: 'appContent', routes: ROUTES });
    this.$content.appendChild(content);
    // If the hash import already called navigate() before the MultiRoute
    // existed (e.g. impact=0), the Router couldn't find it yet. Re-render
    // now so inner navigation catches up with the current URL.
    await content.renderIfCurrentRoute();

    const bubble = await slice.build('ProfileBubble', { sliceId: 'appProfileBubble' });
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
    } else if (hash.startsWith('#consenso=')) {
      await this._tryImportConsenso(hash, compressor);
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

    const proceed = async () => {
      try {
        roster.loadFromData(prepared.temas, prepared.opciones, prepared.nombre, prepared.atributos, autor, email);
        slice.events.emit('toast:show', { message: 'Plantilla importada desde el enlace', type: 'success' });
        await slice.router.navigate('/mis-respuestas');
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
      // Navigate via pushState+renderIfCurrentRoute (below) instead of
      // slice.router.navigate() to avoid a race between the router's 10ms
      // debounce and this init() building its children (TopBar/MultiRoute).
      roster.loadFromData(prepared.temas, prepared.opciones, prepared.nombre, prepared.atributos, autor, email);
      slice.events.emit('toast:show', { message: 'Plantilla importada desde el enlace', type: 'success' });
      history.pushState(null, '', '/mis-respuestas');
    }
  }

  async _tryImportConsenso(hash, compressor) {
    const compressed = hash.slice('#consenso='.length);
    if (!compressed) return;

    let data;
    try {
      data = compressor.decompressFromURI(compressed);
      data = compressor.unpackFromURI(data);
    } catch (e) {
      console.warn('[AppShell] Error al descomprimir consenso del hash:', e);
      return;
    }
    if (!data || !data.respuestas) return;

    const html = slice.getComponent('HtmlService');
    const consenso = slice.getComponent('ConsensoService');
    const autor = data.autor || 'Alguien';
    const email = data.email || '';

    const proceed = async () => {
      const result = consenso.importState(data);
      const msg = result.ok
        ? `Decisiones de consenso importadas (${result.recognized} reconocidas${result.ignored ? `, ${result.ignored} ignoradas` : ''})`
        : 'El enlace no contenía decisiones de consenso válidas.';
      slice.events.emit('toast:show', { message: msg, type: result.ok ? 'success' : 'warning' });
      await slice.router.navigate('/resumen');
    };

    history.replaceState(null, '', window.location.pathname + window.location.search);

    const autorLine = autor ? `${html.esc(autor)}${email ? ` (${html.esc(email)})` : ''}` : 'Alguien';
    slice.events.emit('confirm:request', {
      title: `¿Importar consenso de «${autorLine}»?`,
      message: 'Se reemplazarán las decisiones finales actuales (asignaciones, votos, rankings y textos) por las del enlace.',
      confirmLabel: 'Importar',
      danger: true,
      onConfirm: proceed,
    });
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

    const proceed = async () => {
      slice.getComponent('RespuestasImportService').import(data, autor);
      slice.events.emit('toast:show', {
        message: `Respuestas de «${html.esc(autor)}» agregadas para comparar`,
        type: 'success',
      });
      // Navigate to CompareView after import so the user sees the result.
      await slice.router.navigate('/comparar');
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
