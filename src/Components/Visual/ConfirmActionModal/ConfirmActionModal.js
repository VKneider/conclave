export default class ConfirmActionModal extends HTMLElement {
  constructor(props) {
    super();
    slice.attachTemplate(this);
    this._resolved = false;
    slice.controller.setComponentProps(this, props || {});
  }

  init() {
    slice.events.subscribe('confirm:request', (payload) => this._open(payload));
  }

  async _ensureModal() {
    if (!this._modalPromise) this._modalPromise = this._buildModal();
    await this._modalPromise;
  }

  async _buildModal() {
    this.$modal = await slice.build('Modal', {
      sliceId: 'confirmActionDialog',
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

  async _ensureInput(inputType) {
    if (!this._inputPromise) this._inputPromise = this._buildInput(inputType);
    await this._inputPromise;
  }

  async _buildInput(inputType) {
    this.$inputLabel = document.createElement('label');
    this.$inputLabel.className = 'confirm-modal__field';
    this.$inputSpan = document.createElement('span');
    this.$inputLabel.appendChild(this.$inputSpan);
    this.$modal.appendBody(this.$inputLabel);
    const inputOpts = { sliceId: 'confirmActionInput' };
    if (inputType === 'email') {
      inputOpts.type = 'email';
    }
    this.$input = await slice.build('Input', inputOpts);
    this.$input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        this._resolve(true);
      }
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
    inputType = 'text',
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
      const btn = this.$confirmBtn.querySelector('.slice_button');
      if (btn) {
        btn.style.backgroundColor = '';
        btn.style.borderColor = '';
        btn.style.color = '';
      }
    }

    if (this._hasInput) {
      await this._ensureInput(inputType);
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
    if (confirmed && this._hasInput && this.$input && this.$input.validateValue() === false) {
      return;
    }
    this._resolved = true;
    const callback = confirmed ? this._onConfirm : this._onCancel;
    const arg = confirmed && this._hasInput ? this.$input.value.trim() : undefined;
    this.$modal.open = false;
    callback?.(arg);
  }

  _handleClose() {
    if (!this._resolved) this._onCancel?.();
    this._resolved = false;
  }
}

customElements.define('slice-confirmactionmodal', ConfirmActionModal);
