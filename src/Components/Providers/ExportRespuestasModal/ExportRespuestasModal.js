// Modal with three export/sharing options for respuestas: download JSON,
// copy share link, send via email. Built lazily on first show(), owns
// one Modal instance appended to <body> (same pattern as ConfirmActionModal).
export default class ExportRespuestasModal {
  async init() {
    this._modalPromise = null;
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
      value: '\u2B07 Descargar archivo de respuestas',
      variant: 'filled',
      onClick: () => { this._close(); slice.getComponent('RespuestasService').exportMineWithPrompt(); }
    });
    this.$downloadBtn.classList.add('export-modal__action');

    this.$printBtn = await slice.build('Button', {
      value: '\uD83D\uDDA8 Imprimir',
      variant: 'outlined',
      onClick: () => { this._close(); slice.getComponent('RespuestasService').exportPrint(); }
    });
    this.$printBtn.classList.add('export-modal__action');

    this.$copyBtn = await slice.build('Button', {
      value: '\uD83D\uDD17 Copiar enlace',
      variant: 'outlined',
      onClick: () => { this._close(); slice.getComponent('RespuestasService').copyShareLink(); }
    });
    this.$copyBtn.classList.add('export-modal__action');

    this.$emailBtn = await slice.build('Button', {
      value: '\u2709\uFE0F Enviar por correo',
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
        value: '\uD83D\uDCF1 Compartir',
        variant: 'filled',
        onClick: () => { this._close(); this._nativeShare(); }
      });
      this.$shareBtn.classList.add('export-modal__action');
      actions.appendChild(this.$shareBtn);
    }

    this.$modal.appendBody(actions);
  }

  _nativeShare() {
    const rs = slice.getComponent('RespuestasService');
    const settings = slice.getComponent('SettingsService');
    const autor = settings.getState().autor?.trim();

    const doShare = (name) => {
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
    this.$modal.open = true;
  }

  _close() {
    this.$modal.open = false;
  }
}
