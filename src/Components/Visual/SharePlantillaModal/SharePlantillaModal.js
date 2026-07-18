import { APP_NAME, DATA_VERSION, EXT_PLANTILLA } from '../../Core/AppConfig/AppConfig.js';

export default class SharePlantillaModal extends HTMLElement {
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
      sliceId: 'sharePlantillaDialog',
      title: '📤 Compartir plantilla',
      dismissable: true,
    });
    this.$modal.classList.add('export-respuestas-modal');
    document.body.appendChild(this.$modal);

    this.$desc = document.createElement('p');
    this.$desc.className = 'export-modal__desc';
    this.$desc.textContent = 'Elige cómo quieres compartir tu plantilla con el grupo:';
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
      value: '⬇ Descargar archivo',
      variant: 'filled',
      onClick: () => { this._close(); this._exportPlantilla(); }
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
      value: '🔗 Copiar enlace',
      variant: 'outlined',
      onClick: () => { this._close(); slice.getComponent('PlantillaService').copyShareLink(); }
    });
    this.$copyBtn.classList.add('export-modal__action');

    this.$shareBtn = null;
    if (typeof navigator.share === 'function') {
      this.$shareBtn = await slice.build('Button', {
        value: '📱 Compartir',
        variant: 'filled',
        onClick: () => { this._close(); this._nativeShare(); }
      });
      this.$shareBtn.classList.add('export-modal__action');
      shareActions.appendChild(this.$shareBtn);
    }

    shareActions.appendChild(this.$copyBtn);
    this.$shareGroup.appendChild(shareActions);
    this.$modal.appendBody(this.$shareGroup);
  }

  _buildFilePayload() {
    const p = slice.getComponent('PlantillaService');
    const settings = slice.getComponent('SettingsService');
    return {
      app: APP_NAME,
      version: DATA_VERSION,
      fecha: new Date().toISOString(),
      tipo: 'plantilla',
      nombre: p.getNombre() || '',
      autor: settings.getState().autor || '',
      email: settings.getEmail(),
      atributos: p.getAtributos(),
      temas: p.getTemas(),
      opciones: p.getOpciones(),
    };
  }

  _exportPlantilla() {
    const p = slice.getComponent('PlantillaService');
    const settings = slice.getComponent('SettingsService');
    const data = {
      nombre: p.getNombre() || 'Plantilla sin nombre',
      autor: settings.getState().autor || '',
      email: settings.getEmail(),
      atributos: p.getAtributos(),
      temas: p.getTemas(),
      opciones: p.getOpciones(),
    };
    slice.getComponent('ExportService').downloadPlantilla(data);
    slice.events.emit('toast:show', { message: 'Plantilla exportada', type: 'success' });
  }

  _downloadFile() {
    this._close();
    this._exportPlantilla();
  }

  async _shareFile() {
    const payload = this._buildFilePayload();
    const nombre = payload.nombre || 'plantilla';
    const safe = nombre.replace(/[^a-z0-9]+/gi, '_').toLowerCase();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const file = new File([blob], `${safe}${EXT_PLANTILLA}`, { type: 'application/json' });
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
    const p = slice.getComponent('PlantillaService');

    const doShare = async () => {
      if (!p.canShareByLink()) {
        await this._shareFile();
        return;
      }
      const nombre = p.getNombre() || 'Plantilla';
      const url = p.getShareLink();
      try {
        await navigator.share({
          title: `Plantilla: ${nombre}`,
          text: `Comparto la plantilla "${nombre}" de Conclave`,
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
    const p = slice.getComponent('PlantillaService');
    const canLink = p.canShareByLink();
    this.$shareGroup.hidden = !canLink;
    if (canLink && this.$shareBtn) {
      this.$shareBtn.value = '📱 Compartir';
      this.$shareBtn.onClick = () => { this._close(); this._nativeShare(); };
    }
    this.$modal.open = true;
  }

  _close() {
    this.$modal.open = false;
  }
}

customElements.define('slice-shareplantillamodal', SharePlantillaModal);
