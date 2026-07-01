// Composition root. Its only job: boot every singleton in the right order,
// then step back. After init(), recover any of them by name:
//   slice.getComponent('AssignmentService').assign(memberId, teamId)
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
    // data, so it's awaited first and on its own.
    await slice.build('RosterService', { singleton: true });

    await slice.build('FileDownloadService', { singleton: true });
    await slice.build('SettingsService', { singleton: true });
    await slice.build('AssignmentService', { singleton: true });
    await slice.build('ResolutionService', { singleton: true });
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
