// ── Composition root ──────────────────────────────────────────────────
// Boots every singleton in order, then steps back. After init(), recover
// any service by name:  slice.getComponent('RespuestasService').assignOpcion(...)
//
// ── Core services (built first, before any domain service) ────────────
//   StoreService        Thin wrapper over slice.context — ensure/get/set/watch.
//                        Domain services call ensure() once from their init().
//   HtmlService         esc() + sanitize() (vendored DOMPurify, src/libs/DOMpurify).
//                        Views cache the instance once (no .bind); the innerHTML
//                        assignment stays explicit in the view.
//   DomService          reconcile() — leak-safe, order-safe list rendering.
//
// ── Services without context ─────────────────────────────────────────
//   FileDownloadService Stateless Blob download helper
//   ExportService       JSON envelope builder for exports
//   DragDropService     Pointer-event DnD (registry component)
//   ChartService        Wraps vendored Chart.js (src/libs/chartjs) — create/destroy
//                        canvas charts without any consumer importing the lib directly
//
// ── Context catalog (all persist: true → localStorage) ────────────────
//   settings              { autor, lideres, lideresEnabled }
//                         Created by  SettingsService         Watched by  AppShell,
//                         DashboardView, PorTemaView, UserMenu, TopBar
//   plantilla              { nombre, bienvenida, temas, opciones }
//                         Created by  PlantillaService         Watched by  AppShell,
//                         DashboardView, MisRespuestasView, PorTemaView, RespuestasView,
//                         RespuestasTextoView, CompareView, CompareCarousel, TextCompareCards,
//                         PlantillaBuilderView, LandingView, TopBar
//   respuestas             { seleccion: {[opcionId]: temaId}, texto: {[temaId]: string} }
//                         Created by  RespuestasService         Watched by  AppShell,
//                         DashboardView, MisRespuestasView, PorTemaView, RespuestasTextoView,
//                         CompareView, LandingView
//   decisionFinal          { seleccion: {[opcionId]: temaId}, texto: {[temaId]: {autor, texto}} }
//                         Created by  ConsensoService           Watched by  AppShell,
//                         CompareView, CompareCarousel, TextCompareCards
//   respuestasImportadas   [{ autor, respuestas: { seleccion, texto } }]
//                         Created by  RespuestasImportService   Watched by  CompareView,
//                         CompareCarousel, FinalTally, TextCompareCards
//
import { TOAST_DURATION } from '../../../AppConfig.js';

// ── Event catalog ─────────────────────────────────────────────────────
//   toast:show          → Providers →  ToastProvider.show()
//   confirm:request      → ConfirmActionModal._open()
//   router:change        → auto-declared by framework (not listed here)
//   context:*            → auto-declared by framework (not listed here)
// ──────────────────────────────────────────────────────────────────────
export default class Providers {
  constructor() {
    this._ready = false;
  }

  async init() {
    if (this._ready) return this;

    // Declares the app's whole custom-event catalog up front, before
    // anything can emit/subscribe — the registry only warns on undeclared
    // events once ITS FIRST call happens, so registering late would still
    // flag whatever fired earlier. router:change and context:* are seeded
    // by the framework itself, no need to declare them here.
    slice.events.register('tema', {
      move: {
        description: 'A TemaRow requested to move a tema up or down in the builder list',
        payload: { temaId: 'string', direction: 'number' },
      },
    });
    slice.events.register('toast', {
      show: {
        description: 'Show a toast notification',
        payload: { message: 'string', type: 'string' },
      },
    });
    slice.events.register('confirm', {
      request: {
        description: 'Open the app-wide confirm/cancel dialog (ConfirmActionModal). '
          + 'Set inputLabel to also collect a single text value — onConfirm then '
          + 'receives it (trimmed) as its argument.',
        payload: {
          title: 'string', message: 'string', confirmLabel: 'string', cancelLabel: 'string',
          danger: 'boolean', inputLabel: 'string', inputPlaceholder: 'string', inputValue: 'string',
          onConfirm: 'function', onCancel: 'function',
        },
      },
    });

    // Core services first — infrastructure every other service/view depends
    // on. StoreService owns context persistence (domain services call its
    // ensure() from their init()); HtmlService/DomService are recovered by
    // views. None of them read domain data, so they're safe to build before
    // PlantillaService.
    await slice.build('StoreService', { singleton: true });
    await slice.build('HtmlService', { singleton: true });
    await slice.build('DomService', { singleton: true });
    await slice.build('CompressionService', { singleton: true });
    await slice.build('SoundService', { singleton: true });

    // PlantillaService must finish loading before any view reads
    // tema/opción data — it reads from localStorage (the `plantilla`
    // context) or falls back to the bundled seed.
    await slice.build('PlantillaService', { singleton: true });

    await slice.build('FileDownloadService', { singleton: true });
    await slice.build('SettingsService', { singleton: true });
    await slice.build('RespuestasService', { singleton: true });
    await slice.build('ConsensoService', { singleton: true });
    await slice.build('ExportService', { singleton: true });
    await slice.build('RespuestasImportService', { singleton: true });
    await slice.build('DragDropService', { singleton: true });
    await slice.build('ChartService', { singleton: true });
    await slice.build('IconProvider', { singleton: true });

    const toasts = await slice.build('ToastProvider', { singleton: true });
    toasts.setPosition('bottom-right');
    slice.events.subscribe('toast:show', (payload = { message: '', type: 'info' }) => {
      toasts.show(payload.message, { type: payload.type, duration: TOAST_DURATION });
      const sound = slice.getComponent('SoundService');
      if (payload.type === 'success') sound.play('toast.success');
      else if (payload.type === 'error') sound.play('toast.error');
      else if (payload.type === 'warning') sound.play('toast.warning');
      else if (payload.type === 'info') sound.play('toast.info');
    });

    // Unlock AudioContext + bridge declarativo data-sfx.
    slice.getComponent('SoundService').attachSFX();

    // App-wide visual modals built once here and reused via slice.getComponent.
    this.$confirmModal = await slice.build('ConfirmActionModal', { sliceId: 'confirmActionModal' });
    this.$exportRespuestasModal = await slice.build('ExportRespuestasModal', { sliceId: 'exportRespuestasModal' });
    this.$sharePlantillaModal = await slice.build('SharePlantillaModal', { sliceId: 'sharePlantillaModal' });
    this.$shareConsensoModal = await slice.build('ShareConsensoModal', { sliceId: 'shareConsensoModal' });
    this.$bienvenidaModal = await slice.build('BienvenidaModal', { sliceId: 'bienvenidaModal' });
    document.body.appendChild(this.$confirmModal);
    document.body.appendChild(this.$exportRespuestasModal);
    document.body.appendChild(this.$sharePlantillaModal);
    document.body.appendChild(this.$shareConsensoModal);
    document.body.appendChild(this.$bienvenidaModal);

    this._ready = true;
    return this;
  }
}
