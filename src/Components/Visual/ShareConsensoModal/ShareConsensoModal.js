import { APP_NAME, DATA_VERSION, EXT_CONSENSO, MIME_OCTET } from '../../../AppConfig.js';


export default class ShareConsensoModal extends HTMLElement {
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
      sliceId: 'shareConsensoDialog',
      title: 'Compartir resumen final',
      dismissable: true,
    });
    this.$modal.classList.add('export-respuestas-modal');
    document.body.appendChild(this.$modal);

    this.$desc = document.createElement('p');
    this.$desc.className = 'export-modal__desc';
    this.$desc.textContent = 'Elige c\u00F3mo quieres compartir las decisiones finales con el grupo:';
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
      value: `Descargar archivo (${EXT_CONSENSO})`,
      icon: { name: 'download' },
      variant: 'filled',
      onClick: () => { this._close(); this._downloadFile(); slice.getComponent('SoundService').play('ui.celebrate'); }
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
      icon: { name: 'link' },
      variant: 'outlined',
      onClick: () => { this._close(); slice.getComponent('ConsensoService').copyShareLink(); slice.getComponent('SoundService').play('ui.celebrate'); }
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

    shareActions.appendChild(this.$copyBtn);
    this.$shareGroup.appendChild(shareActions);
    this.$modal.appendBody(this.$shareGroup);
  }

  _buildFilePayload() {
    const cs = slice.getComponent('ConsensoService');
    const settings = slice.getComponent('SettingsService');
    const notas = cs._loadNotes();
    const payload = {
      app: APP_NAME,
      version: DATA_VERSION,
      fecha: new Date().toISOString(),
      tipo: 'consenso',
      autor: settings.getState().autor || '',
      email: settings.getEmail(),
      respuestas: cs.getState(),
    };
    if (notas && typeof notas === 'object' && Object.keys(notas).length) {
      payload.notas = notas;
    }
    return payload;
  }

  _downloadFile() {
    this._close();
    slice.getComponent('ConsensoService').downloadConsensoFile();
  }

  async _shareFile() {
    const payload = this._buildFilePayload();
    const autor = payload.autor || 'consenso';
    const safe = autor.replace(/[^a-z0-9]+/gi, '_').toLowerCase();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: MIME_OCTET });
    const file = new File([blob], `${safe}${EXT_CONSENSO}`, { type: MIME_OCTET });
    try {
      await navigator.share({ files: [file] });
    } catch (err) {
      if (err.name === 'AbortError') return;
      if (err.name === 'NotAllowedError' || err.name === 'TypeError') {
        this._downloadFile();
        return;
      }
      slice.events.emit('toast:show', {
        message: 'No se pudo compartir. Se descarg\u00F3 el archivo.',
        type: 'warning',
      });
      this._downloadFile();
    }
  }

  _nativeShare() {
    const cs = slice.getComponent('ConsensoService');

    const doShare = async () => {
      if (!cs.canShareByLink()) {
        await this._shareFile();
        return;
      }
      const url = cs.getShareLink();
      const plantilla = slice.getComponent('PlantillaService');
      const plantillaNombre = plantilla.getNombre() || 'Conclave';
      try {
        await navigator.share({
          title: `Resumen final — ${plantillaNombre}`,
          text: `Decisiones finales para "${plantillaNombre}"`,
          url,
        });
      } catch (err) {
        if (err.name !== 'AbortError') this._shareFile();
      }
    };

    doShare();
  }

  async show() {
    await this._ensureModal();
    const cs = slice.getComponent('ConsensoService');
    const canLink = cs.canShareByLink();
    this.$shareGroup.hidden = !canLink;
    if (canLink && this.$shareBtn) {
      this.$shareBtn.value = 'Compartir';
      this.$shareBtn.icon = { name: 'share-2' };
      this.$shareBtn.onClick = () => { this._close(); this._nativeShare(); };
    }
    this.$modal.open = true;
  }

  _close() {
    this.$modal.open = false;
  }
}

customElements.define('slice-shareconsensomodal', ShareConsensoModal);
