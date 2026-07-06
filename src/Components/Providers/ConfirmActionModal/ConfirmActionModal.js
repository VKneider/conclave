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
//     onConfirm: () => respuestasService.reset(),
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

  // Guarded by an in-flight PROMISE, not a `this.$modal` truthiness check —
  // two confirm:request events arriving before the first build resolves
  // would otherwise both pass a flag check and both call slice.build with
  // the same fixed sliceId, and the second throws ("already registered").
  // Assigning the promise is synchronous (no await between the check and
  // the assignment), so this is race-safe even though _buildModal itself
  // awaits internally.
  async _ensureModal() {
    if (!this._modalPromise) this._modalPromise = this._buildModal();
    await this._modalPromise;
  }

  async _buildModal() {
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

    this.$cancelBtn = await slice.build('Button', {
      value: 'Cancelar',
      variant: 'ghost',
      onClick: () => this._resolve(false)
    });

    this.$confirmBtn = await slice.build('Button', {
      value: 'Confirmar',
      variant: 'filled',
      onClick: () => this._resolve(true)
    });

    this.$modal.appendFooter(this.$cancelBtn);
    this.$modal.appendFooter(this.$confirmBtn);
  }

  // Same in-flight-promise guard as _ensureModal, and for the same reason —
  // built lazily on the first confirm:request that actually asks for input.
  async _ensureInput() {
    if (!this._inputPromise) this._inputPromise = this._buildInput();
    await this._inputPromise;
  }

  async _buildInput() {
    this.$inputLabel = document.createElement('label');
    this.$inputLabel.className = 'confirm-modal__field';
    this.$inputSpan = document.createElement('span');
    this.$inputLabel.appendChild(this.$inputSpan);
    this.$modal.appendBody(this.$inputLabel);
    this.$input = await slice.build('Input', { sliceId: 'confirm-action-input' });
    this.$input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this._resolve(true);
    });
    this.$inputLabel.appendChild(this.$input);
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
    this.$cancelBtn.value = cancelLabel;
    this.$confirmBtn.value = confirmLabel;
    if (danger) {
      this.$confirmBtn.variant = 'filled';
      this.$confirmBtn.customColor = { background: 'var(--danger-color)', text: 'var(--danger-contrast)' };
    } else {
      this.$confirmBtn.variant = 'filled';
      this.$confirmBtn.customColor = { background: '', text: '' };
      var btn = this.$confirmBtn.querySelector('.slice_button');
      if (btn) {
        btn.style.backgroundColor = '';
        btn.style.borderColor = '';
        btn.style.color = '';
      }
    }

    if (this._hasInput) {
      await this._ensureInput();
      this.$inputLabel.hidden = false;
      this.$inputSpan.textContent = inputLabel;
      this.$input.placeholder = inputPlaceholder;
      this.$input.value = inputValue;
    } else if (this.$inputLabel) {
      this.$inputLabel.hidden = true;
    }

    this.$modal.open = true;
    if (this._hasInput) {
      requestAnimationFrame(() => this.$input.querySelector('input').focus());
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
