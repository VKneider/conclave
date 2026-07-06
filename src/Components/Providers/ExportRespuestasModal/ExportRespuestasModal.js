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

    this.$downloadBtn = document.createElement('button');
    this.$downloadBtn.type = 'button';
    this.$downloadBtn.className = 'btn btn-primary export-modal__action';
    this.$downloadBtn.innerHTML = '⬇ Descargar JSON';
    this.$downloadBtn.onclick = () => { this._close(); slice.getComponent('RespuestasService').exportMineWithPrompt(); };

    this.$copyBtn = document.createElement('button');
    this.$copyBtn.type = 'button';
    this.$copyBtn.className = 'btn export-modal__action';
    this.$copyBtn.innerHTML = '🔗 Copiar enlace';
    this.$copyBtn.onclick = () => { this._close(); slice.getComponent('RespuestasService').copyShareLink(); };

    this.$emailBtn = document.createElement('button');
    this.$emailBtn.type = 'button';
    this.$emailBtn.className = 'btn export-modal__action';
    this.$emailBtn.innerHTML = '✉️ Enviar por correo';
    this.$emailBtn.onclick = () => { this._close(); slice.getComponent('RespuestasService').sendShareLinkEmail(); };

    actions.appendChild(this.$downloadBtn);
    actions.appendChild(this.$copyBtn);
    actions.appendChild(this.$emailBtn);

    if (typeof navigator.share === 'function') {
      this.$shareBtn = document.createElement('button');
      this.$shareBtn.type = 'button';
      this.$shareBtn.className = 'btn btn-primary export-modal__action';
      this.$shareBtn.innerHTML = '📱 Compartir';
      this.$shareBtn.onclick = () => { this._close(); this._nativeShare(); };
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
