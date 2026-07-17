export default class ExportRespuestasModal extends HTMLElement {
  constructor(props) {
    super();
    slice.attachTemplate(this);
    this._modalPromise = null;
    slice.controller.setComponentProps(this, props || {});
  }

  async _ensureModal() {
    if (!this._modalPromise) this._modalPromise = this._buildModal();
    await this._modalPromise;
  }

  async _buildModal() {
    this.$modal = await slice.build('Modal', {
      sliceId: 'export-respuestas-dialog',
      title: '📤 Compartir respuestas',
      dismissable: true,
    });
    this.$modal.classList.add('export-respuestas-modal');
    document.body.appendChild(this.$modal);

    this.$desc = document.createElement('p');
    this.$desc.className = 'export-modal__desc';
    this.$desc.textContent = 'Elige cómo quieres compartir tus respuestas con el grupo:';
    this.$modal.appendBody(this.$desc);

    const actions = document.createElement('div');
    actions.className = 'export-modal__actions';

    this.$downloadBtn = await slice.build('Button', {
      value: '⬇ Descargar archivo de respuestas',
      variant: 'filled',
      onClick: () => { this._close(); slice.getComponent('RespuestasService').exportMineWithPrompt(); }
    });
    this.$downloadBtn.classList.add('export-modal__action');

    this.$printBtn = await slice.build('Button', {
      value: '🖨 Imprimir',
      variant: 'outlined',
      onClick: () => { this._close(); slice.getComponent('RespuestasService').exportPrint(); }
    });
    this.$printBtn.classList.add('export-modal__action');

    this.$copyBtn = await slice.build('Button', {
      value: '🔗 Copiar enlace',
      variant: 'outlined',
      onClick: () => { this._close(); slice.getComponent('RespuestasService').copyShareLink(); }
    });
    this.$copyBtn.classList.add('export-modal__action');

    this.$emailBtn = await slice.build('Button', {
      value: '✉️ Enviar por correo',
      variant: 'outlined',
      onClick: () => { this._close(); slice.getComponent('RespuestasService').sendShareLinkEmail(); }
    });
    this.$emailBtn.classList.add('export-modal__action');

    actions.appendChild(this.$downloadBtn);
    actions.appendChild(this.$printBtn);
    actions.appendChild(this.$copyBtn);
    actions.appendChild(this.$emailBtn);

    if (typeof navigator.share === 'function') {
      this.$shareBtn = await slice.build('Button', {
        value: '📱 Compartir',
        variant: 'filled',
        onClick: () => { this._close(); this._nativeShare(); }
      });
      this.$shareBtn.classList.add('export-modal__action');
      actions.appendChild(this.$shareBtn);
    }

    this.$modal.appendBody(actions);
  }

  _setLinkActionsEnabled(enabled, maxLen) {
    const hint = `Deshabilitado: el enlace supera el límite recomendado (${maxLen} caracteres). Usa archivo.`;
    const copyBtn = this.$copyBtn?.querySelector('button');
    const emailBtn = this.$emailBtn?.querySelector('button');
    const shareBtn = this.$shareBtn?.querySelector('button');

    if (copyBtn) {
      copyBtn.disabled = !enabled;
      if (!enabled) copyBtn.title = hint;
      else copyBtn.removeAttribute('title');
    }
    if (emailBtn) {
      emailBtn.disabled = !enabled;
      if (!enabled) emailBtn.title = hint;
      else emailBtn.removeAttribute('title');
    }
    if (shareBtn) {
      shareBtn.disabled = !enabled;
      if (!enabled) shareBtn.title = hint;
      else shareBtn.removeAttribute('title');
    }
  }

  _nativeShare() {
    const rs = slice.getComponent('RespuestasService');
    const settings = slice.getComponent('SettingsService');
    const autor = settings.getState().autor?.trim();

    const doShare = (name) => {
      if (!rs.canShareByLink(name)) {
        slice.events.emit('toast:show', {
          message: 'Las respuestas son demasiado largas para compartir por enlace. Exporta archivo.',
          type: 'warning'
        });
        return;
      }
      const url = rs.getShareLink(name);
      const plantilla = slice.getComponent('PlantillaService');
      const plantillaNombre = plantilla.getNombre() || 'Conclave';
      navigator.share({
        title: `Mis respuestas — ${plantillaNombre}`,
        text: `${name} ha compartido sus respuestas para "${plantillaNombre}"`,
        url,
      }).catch(() => {});
    };

    if (autor) { doShare(autor); return; }

    slice.events.emit('confirm:request', {
      title: '¿Cuál es tu nombre?',
      message: 'Se incluye al compartir tus respuestas.',
      confirmLabel: 'Compartir',
      inputLabel: 'Tu nombre',
      inputPlaceholder: '¿Quién responde?',
      onConfirm: (name) => {
        if (!name) return;
        settings.setAutor(name);
        doShare(name);
      },
    });
  }

  async show() {
    await this._ensureModal();
    const rs = slice.getComponent('RespuestasService');
    const settings = slice.getComponent('SettingsService');
    const autor = settings.getState().autor?.trim() || '';
    this._setLinkActionsEnabled(rs.canShareByLink(autor), rs.getShareUrlMaxLength());
    this.$modal.open = true;
  }

  _close() {
    this.$modal.open = false;
  }
}

customElements.define('slice-exportrespuestasmodal', ExportRespuestasModal);
