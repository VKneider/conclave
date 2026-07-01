// ── Composition root ──────────────────────────────────────────────────
// Boots every singleton in order, then steps back. After init(), recover
// any service by name:  slice.getComponent('AssignmentService').assign(...)
//
// ── Services without context ─────────────────────────────────────────
//   RosterService       In-memory cache (localStorage + seed fallback)
//   DataParserService   CSV/TSV/JSON parser for teams & members
//   FileDownloadService Stateless Blob download helper
//   ExportService       JSON envelope builder for exports
//   ImportService       In-memory cache + localStorage (imported JSON sources)
//   DragDropService     Pointer-event DnD (registry component)
//
// ── Context catalog (all persist: true → localStorage) ────────────────
//   settings      { autor, nombreOrganizacion, lideres, lideresEnabled }
//                 Created by  SettingsService     Watched by  AppShell,
//                 DashboardView, ByTeamView, SettingsView, TopBar
//   assignment    { [memberId]: teamId }
//                 Created by  AssignmentService   Watched by  AppShell,
//                 DashboardView, MyAssignmentView, ByTeamView, CompareView
//   resolutions   { [memberId]: teamId }
//                 Created by  ResolutionService   Watched by  AppShell,
//                 CompareView
//
// ── Event catalog ─────────────────────────────────────────────────────
//   toast:show          → Providers →  ToastProvider.show()
//   roster:changed      → DashboardView._refresh, MyAssignmentView._paint,
//                         ByTeamView._layout, CompareView._paint,
//                         SettingsView._rebuildDataLists
//   confirm:request     → ConfirmActionModal._open()
//   router:change       → auto-declared by framework (not listed here)
//   context:*           → auto-declared by framework (not listed here)
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
    slice.events.register('toast', {
      show: {
        description: 'Show a toast notification',
        payload: { message: 'string', type: 'string', duration: 'number' },
      },
    });
    slice.events.register('roster', {
      changed: {
        description: 'Roster data was replaced or edited — views should repaint.',
        payload: {},
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

    // RosterService must finish loading before any view reads team/member
    // data — it reads from localStorage or falls back to bundled seed.
    await slice.build('RosterService', { singleton: true });

    await slice.build('DataParserService', { singleton: true });
    await slice.build('FileDownloadService', { singleton: true });
    await slice.build('SettingsService', { singleton: true });
    await slice.build('AssignmentService', { singleton: true });
    await slice.build('ResolutionService', { singleton: true });
    await slice.build('ExportService', { singleton: true });
    await slice.build('ImportService', { singleton: true });
    await slice.build('DragDropService', { singleton: true });

    const toasts = await slice.build('ToastProvider', { singleton: true });
    toasts.setPosition('bottom-right');
    slice.events.subscribe('toast:show', (payload = {}) => {
      toasts.show(payload.message, { type: payload.type, duration: payload.duration });
    });

    // Owns one Modal instance for the whole app; any component can request
    // a confirmation by emitting 'confirm:request' — see ConfirmActionModal.js.
    await slice.build('ConfirmActionModal', { singleton: true });

    this._ready = true;
    return this;
  }
}
