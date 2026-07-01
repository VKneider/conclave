// A single reusable confirmation dialog, owning one Modal instance appended
// to <body> — the Provider-Service pattern (same shape as ToastProvider):
// the singleton service owns the Visual, so "one app-wide modal" doesn't
// mean re-building a Modal per call site.
//
// The Modal itself is built LAZILY, on the first actual confirm:request —
// same as ToastProvider's _getContainer(), which only touches the DOM on
// its first .show(). Building it eagerly in init() would insert a (closed,
// invisible) <dialog> into <body> the instant the app boots, before any
// user action ever asks for a confirmation — surprising to find in devtools
// and pure waste for the common case where a session never needs it.
//
// Driven entirely by events, so ANY component can ask for a confirmation
// without holding a reference to this instance or to the Modal itself:
//
//   slice.events.emit('confirm:request', {
//     title: '¿Reiniciar tus asignaciones?',
//     message: 'No afecta los JSON ya exportados.',
//     confirmLabel: 'Reiniciar',
//     danger: true,
//     onConfirm: () => assignmentService.reset(),
//   });
//
// Pass inputLabel to also collect a single text value — onConfirm then
// receives it (trimmed) as its argument instead of being called with none:
//
//   slice.events.emit('confirm:request', {
//     title: '¿Cuál es tu nombre?',
//     confirmLabel: 'Exportar',
//     inputLabel: 'Tu nombre',
//     inputPlaceholder: '¿Quién asigna?',
//     onConfirm: (name) => settingsService.setAutor(name),
//   });
//
// onConfirm/onCancel are plain callbacks in the event payload — fine since
// events are an in-memory, synchronous pub/sub, not persisted state (unlike
// slice.context, which must stay serializable).
export default class ConfirmActionModal {
  init() {
    this._resolved = false;
    slice.events.subscribe('confirm:request', (payload) => this._open(payload));
  }

  async _ensureModal() {
    if (this.$modal) return;

    this.$modal = await slice.build('Modal', {
      sliceId: 'confirm-action-dialog',
      dismissable: true,
      onClose: () => this._handleClose(),
    });
    this.$modal.classList.add('confirm-modal');
    document.body.appendChild(this.$modal);

    this.$message = document.createElement('p');
    this.$message.className = 'confirm-modal__message';
    this.$modal.appendBody(this.$message);

    this.$inputLabel = document.createElement('label');
    this.$inputLabel.className = 'confirm-modal__field';
    this.$inputSpan = document.createElement('span');
    this.$input = document.createElement('input');
    this.$input.type = 'text';
    this.$input.autocomplete = 'off';
    this.$input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this._resolve(true);
    });
    this.$inputLabel.append(this.$inputSpan, this.$input);
    this.$modal.appendBody(this.$inputLabel);

    this.$cancelBtn = document.createElement('button');
    this.$cancelBtn.type = 'button';
    this.$cancelBtn.className = 'btn btn-ghost';
    this.$cancelBtn.onclick = () => this._resolve(false);

    this.$confirmBtn = document.createElement('button');
    this.$confirmBtn.type = 'button';
    this.$confirmBtn.onclick = () => this._resolve(true);

    this.$modal.appendFooter(this.$cancelBtn);
    this.$modal.appendFooter(this.$confirmBtn);
  }

  async _open({
    title = '¿Confirmas esta acción?',
    message = '',
    confirmLabel = 'Confirmar',
    cancelLabel = 'Cancelar',
    danger = false,
    inputLabel = null,
    inputPlaceholder = '',
    inputValue = '',
    onConfirm,
    onCancel,
  } = {}) {
    await this._ensureModal();

    this._onConfirm = onConfirm;
    this._onCancel = onCancel;
    this._resolved = false;
    this._hasInput = !!inputLabel;

    this.$modal.title = title;
    this.$message.textContent = message;
    this.$message.hidden = !message;
    this.$cancelBtn.textContent = cancelLabel;
    this.$confirmBtn.textContent = confirmLabel;
    this.$confirmBtn.className = danger ? 'btn btn-danger' : 'btn btn-primary';

    this.$inputLabel.hidden = !this._hasInput;
    if (this._hasInput) {
      this.$inputSpan.textContent = inputLabel;
      this.$input.placeholder = inputPlaceholder;
      this.$input.value = inputValue;
    }

    this.$modal.open = true;
    if (this._hasInput) {
      // The dialog steals focus to itself on showModal(); grab the input
      // right after, once it's actually visible.
      requestAnimationFrame(() => this.$input.focus());
    }
  }

  _resolve(confirmed) {
    this._resolved = true;
    const callback = confirmed ? this._onConfirm : this._onCancel;
    const arg = confirmed && this._hasInput ? this.$input.value.trim() : undefined;
    this.$modal.open = false;
    callback?.(arg);
  }

  // The native <dialog> also closes via Escape or a backdrop click — treat
  // that as an implicit cancel, unless a button already resolved it (Modal's
  // onClose fires on every close path, including close() called by _resolve).
  _handleClose() {
    if (!this._resolved) this._onCancel?.();
    this._resolved = false;
  }
}
