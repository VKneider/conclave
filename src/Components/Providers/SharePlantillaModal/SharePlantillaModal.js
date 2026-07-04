// Modal with three sharing options for a Plantilla: download JSON,
// copy share link, send via email. Built lazily on first show().
export default class SharePlantillaModal {
  async init() {
    this._modalPromise = null;
  }

  async _ensureModal() {
    if (!this._modalPromise) this._modalPromise = this._buildModal();
    await this._modalPromise;
  }

  async _buildModal() {
    this.$modal = await slice.build('Modal', {
      sliceId: 'share-plantilla-dialog',
      title: '📤 Compartir plantilla',
      dismissable: true,
    });
    this.$modal.classList.add('export-respuestas-modal');
    document.body.appendChild(this.$modal);

    this.$desc = document.createElement('p');
    this.$desc.className = 'export-modal__desc';
    this.$desc.textContent = 'Elige cómo quieres compartir tu plantilla con el grupo:';
    this.$modal.appendBody(this.$desc);

    const actions = document.createElement('div');
    actions.className = 'export-modal__actions';

    this.$downloadBtn = document.createElement('button');
    this.$downloadBtn.type = 'button';
    this.$downloadBtn.className = 'btn btn-primary export-modal__action';
    this.$downloadBtn.innerHTML = '⬇ Descargar JSON';
    this.$downloadBtn.onclick = () => { this._close(); this._exportPlantilla(); };

    this.$copyBtn = document.createElement('button');
    this.$copyBtn.type = 'button';
    this.$copyBtn.className = 'btn export-modal__action';
    this.$copyBtn.innerHTML = '🔗 Copiar enlace';
    this.$copyBtn.onclick = () => { this._close(); slice.getComponent('PlantillaService').copyShareLink(); };

    this.$emailBtn = document.createElement('button');
    this.$emailBtn.type = 'button';
    this.$emailBtn.className = 'btn export-modal__action';
    this.$emailBtn.innerHTML = '✉️ Enviar por correo';
    this.$emailBtn.onclick = () => { this._close(); this._sendEmail(); };

    actions.appendChild(this.$downloadBtn);
    actions.appendChild(this.$copyBtn);
    actions.appendChild(this.$emailBtn);
    this.$modal.appendBody(actions);
  }

  _exportPlantilla() {
    const p = slice.getComponent('PlantillaService');
    const data = {
      nombre: p.getNombre() || 'Plantilla sin nombre',
      atributos: p.getAtributos(),
      temas: p.getTemas(),
      opciones: p.getOpciones(),
    };
    slice.getComponent('ExportService').downloadPlantilla(data);
    slice.events.emit('toast:show', { message: 'Plantilla exportada', type: 'success' });
  }

  _sendEmail() {
    const p = slice.getComponent('PlantillaService');
    const nombre = p.getNombre() || 'Plantilla';
    const url = p.getShareLink();
    const to = slice.getComponent('SettingsService').getEmail();
    const subject = encodeURIComponent(`Plantilla: ${nombre}`);
    const body = encodeURIComponent(
      `Hola,\n\nComparto la plantilla "${nombre}" para que la revises:\n${url}\n\nSaludos`
    );
    window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
  }

  async show() {
    await this._ensureModal();
    this.$modal.open = true;
  }

  _close() {
    this.$modal.open = false;
  }
}
