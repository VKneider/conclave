import QRCode from 'qrcode';
import { APP_NAME, DATA_VERSION, EXT_RESPUESTAS, MIME_OCTET } from '../../Core/AppConfig/AppConfig.js';


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
      sliceId: 'exportRespuestasDialog',
      title: 'Compartir respuestas',
      dismissable: true,
    });
    this.$modal.classList.add('export-respuestas-modal');
    document.body.appendChild(this.$modal);

    this.$desc = document.createElement('p');
    this.$desc.className = 'export-modal__desc';
    this.$desc.textContent = 'Elige cómo quieres compartir tus respuestas con el grupo:';
    this.$modal.appendBody(this.$desc);

    // ── Download section ────────────────────────────────────────
    this.$downloadGroup = document.createElement('div');
    this.$downloadGroup.className = 'export-modal__group';

    const downloadTitle = document.createElement('h4');
    downloadTitle.className = 'export-modal__group-title';
    downloadTitle.textContent = 'Descargar';
    this.$downloadGroup.appendChild(downloadTitle);

    const downloadActions = document.createElement('div');
    downloadActions.className = 'export-modal__actions';

    this.$downloadBtn = await slice.build('Button', {
      value: 'Descargar archivo',
      variant: 'filled',
      icon: { name: 'download' },
      onClick: () => { this._close(); slice.getComponent('RespuestasService').exportMineWithPrompt(); slice.getComponent('SoundService').play('ui.celebrate'); }
    });
    this.$downloadBtn.classList.add('export-modal__action');

    downloadActions.appendChild(this.$downloadBtn);
    this.$downloadGroup.appendChild(downloadActions);
    this.$modal.appendBody(this.$downloadGroup);

    // ── Share section ───────────────────────────────────────────
    this.$shareGroup = document.createElement('div');
    this.$shareGroup.className = 'export-modal__group';

    const shareTitle = document.createElement('h4');
    shareTitle.className = 'export-modal__group-title';
    shareTitle.textContent = 'Compartir';
    this.$shareGroup.appendChild(shareTitle);

    const shareActions = document.createElement('div');
    shareActions.className = 'export-modal__actions';

    this.$copyBtn = await slice.build('Button', {
      value: 'Copiar enlace',
      variant: 'outlined',
      icon: { name: 'link' },
      onClick: () => { this._close(); slice.getComponent('RespuestasService').copyShareLink(); slice.getComponent('SoundService').play('ui.celebrate'); }
    });
    this.$copyBtn.classList.add('export-modal__action');

    this.$shareBtn = null;
    if (typeof navigator.share === 'function') {
      this.$shareBtn = await slice.build('Button', {
        value: 'Compartir',
        icon: { name: 'share-2' },
        variant: 'filled',
        onClick: () => { this._close(); this._nativeShare(); slice.getComponent('SoundService').play('ui.celebrate'); }
      });
      this.$shareBtn.classList.add('export-modal__action');
      shareActions.appendChild(this.$shareBtn);
    }

    this.$emailBtn = await slice.build('Button', {
      value: 'Enviar por correo',
      variant: 'outlined',
      icon: { name: 'mail' },
      onClick: () => { this._close(); slice.getComponent('RespuestasService').sendShareLinkEmail(); slice.getComponent('SoundService').play('ui.celebrate'); }
    });
    this.$emailBtn.classList.add('export-modal__action');

    this.$qrBtn = await slice.build('Button', {
      value: 'Código QR',
      variant: 'outlined',
      icon: { name: 'qr-code' },
      onClick: () => { this._close(); this._showQR(); slice.getComponent('SoundService').play('ui.celebrate'); }
    });
    this.$qrBtn.classList.add('export-modal__action');

    shareActions.appendChild(this.$emailBtn);
    shareActions.appendChild(this.$qrBtn);
    shareActions.appendChild(this.$copyBtn);
    this.$shareGroup.appendChild(shareActions);
    this.$modal.appendBody(this.$shareGroup);
  }

  _buildFilePayload() {
    const rs = slice.getComponent('RespuestasService');
    const settings = slice.getComponent('SettingsService');
    const autor = settings.getState().autor?.trim() || '';
    const email = settings.getEmail();
    const extra = rs._buildSharePayload(autor);
    return {
      app: APP_NAME,
      version: DATA_VERSION,
      fecha: new Date().toISOString(),
      tipo: extra.tipo,
      autor: extra.autor,
      email: extra.email || email,
      respuestas: extra.respuestas,
    };
  }

  _downloadFile() {
    this._close();
    slice.getComponent('RespuestasService').exportMineWithPrompt();
  }

  async _shareFile() {
    const payload = this._buildFilePayload();
    const autor = payload.autor || 'respuestas';
    const safe = autor.replace(/[^a-z0-9]+/gi, '_').toLowerCase();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: MIME_OCTET });
    const file = new File([blob], `${safe}${EXT_RESPUESTAS}`, { type: MIME_OCTET });
    try {
      await navigator.share({ files: [file] });
    } catch (err) {
      if (err.name === 'AbortError') return;
      if (err.name === 'NotAllowedError' || err.name === 'TypeError') {
        this._downloadFile();
        return;
      }
      slice.events.emit('toast:show', {
        message: 'No se pudo compartir. Se descargó el archivo.',
        type: 'warning',
      });
      this._downloadFile();
    }
  }

  _nativeShare() {
    const rs = slice.getComponent('RespuestasService');
    const settings = slice.getComponent('SettingsService');
    const autor = settings.getState().autor?.trim();

    const doShare = async (name) => {
      if (!rs.canShareByLink(name)) {
        await this._shareFile();
        return;
      }
      const url = rs.getShareLink(name);
      const plantilla = slice.getComponent('PlantillaService');
      const plantillaNombre = plantilla.getNombre() || 'Conclave';
      try {
        await navigator.share({
          title: `Mis respuestas — ${plantillaNombre}`,
          text: `${name} ha compartido sus respuestas para "${plantillaNombre}"`,
          url,
        });
      } catch (err) {
        if (err.name !== 'AbortError') this._shareFile();
      }
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
    const canLink = rs.canShareByLink(autor);
    this.$shareGroup.hidden = !canLink;
    if (canLink && this.$shareBtn) {
      this.$shareBtn.value = 'Compartir';
      this.$shareBtn.icon = { name: 'share-2' };
      this.$shareBtn.onClick = () => { this._close(); this._nativeShare(); };
    }
    this.$modal.open = true;
  }

  async _ensureQRModal() {
    if (!this._qrModalPromise) this._qrModalPromise = this._buildQRModal();
    await this._qrModalPromise;
  }

  async _buildQRModal() {
    this.$qrModal = await slice.build('Modal', {
      sliceId: 'qrDialog',
      title: 'Código QR',
      dismissable: true,
    });
    this.$qrModal.classList.add('qr-modal');
    document.body.appendChild(this.$qrModal);

    this.$qrBody = document.createElement('div');
    this.$qrBody.className = 'qr-modal__body';
    this.$qrModal.appendBody(this.$qrBody);

    const closeBtn = await slice.build('Button', {
      value: 'Cerrar',
      variant: 'filled',
      onClick: () => { this.$qrModal.open = false; }
    });
    this.$qrModal.appendFooter(closeBtn);
  }

  async _showQR() {
    await this._ensureQRModal();
    this.$qrBody.innerHTML = '';

    const autor = slice.getComponent('SettingsService').getState().autor?.trim() || '';
    const url = slice.getComponent('RespuestasService').getShareLink(autor);

    try {
      const canvas = document.createElement('canvas');
      await QRCode.toCanvas(canvas, url, { errorCorrectionLevel: 'M', width: 300, margin: 2 });
      canvas.style.display = 'block';
      canvas.style.margin = '0 auto';
      this.$qrBody.appendChild(canvas);
    } catch {
      this.$qrBody.innerHTML = `
        <div class="qr-modal__error">
          <span class="qr-modal__error-icon">${slice.getComponent('IconProvider').svg('alert-triangle', 24, 'var(--warning-color)')}</span>
          <p>El enlace es demasiado largo para generar un código QR.</p>
          <p class="qr-modal__error-hint">Prueba compartiendo por correo o descargando el archivo.</p>
        </div>`;
    }

    this.$qrModal.open = true;
  }

  _close() {
    this.$modal.open = false;
  }
}

customElements.define('slice-exportrespuestasmodal', ExportRespuestasModal);
