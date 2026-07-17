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

    const actions = document.createElement('div');
    actions.className = 'export-modal__actions';

    this.$downloadBtn = await slice.build('Button', {
      value: '⬇ Descargar archivo de plantilla',
      variant: 'filled',
      onClick: () => { this._close(); this._exportPlantilla(); }
    });
    this.$downloadBtn.classList.add('export-modal__action');

    this.$printBtn = await slice.build('Button', {
      value: '🖨 Imprimir',
      variant: 'outlined',
      onClick: () => { this._close(); this._printPlantilla(); }
    });
    this.$printBtn.classList.add('export-modal__action');

    this.$copyBtn = await slice.build('Button', {
      value: '🔗 Copiar enlace',
      variant: 'outlined',
      onClick: () => { this._close(); slice.getComponent('PlantillaService').copyShareLink(); }
    });
    this.$copyBtn.classList.add('export-modal__action');

    this.$emailBtn = await slice.build('Button', {
      value: '✉️ Enviar por correo',
      variant: 'outlined',
      onClick: () => { this._close(); this._sendEmail(); }
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
    const p = slice.getComponent('PlantillaService');
    if (!p.canShareByLink()) {
      slice.events.emit('toast:show', {
        message: 'La plantilla es demasiado grande para compartir por enlace. Exporta archivo.',
        type: 'warning'
      });
      return;
    }
    const nombre = p.getNombre() || 'Plantilla';
    const url = p.getShareLink();
    navigator.share({
      title: `Plantilla: ${nombre}`,
      text: `Comparto la plantilla "${nombre}" de Conclave`,
      url,
    }).catch(() => {});
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

  _printPlantilla() {
    const p = slice.getComponent('PlantillaService');
    const h = slice.getComponent('HtmlService');
    const nombre = p.getNombre() || 'Plantilla sin nombre';
    const temas = p.getTemas();
    const opciones = p.getOpciones();

    var lines = ['<h2>Temas</h2>'];
    if (temas.length) {
      var temaRows = temas.map(function (t) {
        var modoLabel = t.modo === 'reparto' ? 'Asignación' : t.modo === 'votacion' ? 'Votación' : t.modo === 'ranking' ? 'Ranking' : 'Texto libre';
        return '<tr><td>' + h.esc(t.nombre) + '</td><td>' + modoLabel + '</td></tr>';
      }).join('');
      lines.push('<table><thead><tr><th>Tema</th><th>Modo</th></tr></thead><tbody>' + temaRows + '</tbody></table>');
    } else {
      lines.push('<p class="empty">Sin temas</p>');
    }

    lines.push('<h2>Opciones</h2>');
    if (opciones.length) {
      var opRows = opciones.map(function (op) {
        var tema = op.temaId ? temas.find(function (t) { return t.id === op.temaId; }) : null;
        var temaNombre = tema ? h.esc(tema.nombre) : 'Pool general';
        return '<tr><td>' + h.esc(op.nombre) + '</td><td>' + temaNombre + '</td></tr>';
      }).join('');
      lines.push('<table><thead><tr><th>Opción</th><th>Tema</th></tr></thead><tbody>' + opRows + '</tbody></table>');
    } else {
      lines.push('<p class="empty">Sin opciones</p>');
    }

    var bodyHtml = lines.join('\n');
    var html = '<!DOCTYPE html>\n<html lang="es">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width,initial-scale=1.0">\n<title>' + h.esc(nombre) + ' — Conclave</title>\n<style>\n*,*::before,*::after{box-sizing:border-box}\nbody{font-family:\'Segoe UI\',system-ui,-apple-system,sans-serif;max-width:800px;margin:0 auto;padding:40px 24px;color:#1a1a1a;background:#fff;line-height:1.6}\nh1{font-size:24px;margin:0 0 2px}\n.meta{color:#666;font-size:14px;margin:0 0 32px}\nh2{font-size:18px;font-weight:700;margin:28px 0 12px;padding-bottom:6px;border-bottom:2px solid #e85d4a}\ntable{width:100%;border-collapse:collapse;margin-bottom:20px;font-size:14px}\nth,td{text-align:left;padding:8px 12px;border-bottom:1px solid #e0e0e0}\nth{font-weight:700;text-transform:uppercase;font-size:11px;color:#888;letter-spacing:.04em}\n.empty{color:#aaa;font-style:italic}\n@media print{body{margin:0;padding:16px}h2{break-after:avoid}}\n</style>\n</head>\n<body>\n<h1>' + h.esc(nombre) + '</h1>\n<p class="meta">Plantilla generada por Conclave</p>\n' + bodyHtml + '\n</body>\n</html>';

    var iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:0';
    document.body.appendChild(iframe);
    var doc = iframe.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();
    setTimeout(function () {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      setTimeout(function () { document.body.removeChild(iframe); }, 500);
    }, 200);
  }

  _sendEmail() {
    const p = slice.getComponent('PlantillaService');
    if (!p.canShareByLink()) {
      slice.events.emit('toast:show', {
        message: 'La plantilla es demasiado grande para compartir por enlace. Exporta archivo.',
        type: 'warning'
      });
      return;
    }
    const nombre = p.getNombre() || 'Plantilla';
    const url = p.getShareLink();
    const settings = slice.getComponent('SettingsService');
    const autor = settings.getState().autor || 'Alguien';
    const creadoEmail = p.getCreadoEmail();
    const to = creadoEmail ? encodeURIComponent(creadoEmail) : '';
    const subject = encodeURIComponent(`Plantilla: ${nombre}`);
    const body = encodeURIComponent(
      `${autor} ha compartido la plantilla "${nombre}" para que la revises:\n${url}\n\nSaludos`
    );
    window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
  }

  async show() {
    await this._ensureModal();
    const p = slice.getComponent('PlantillaService');
    this._setLinkActionsEnabled(p.canShareByLink(), p.getShareUrlMaxLength());
    this.$modal.open = true;
  }

  _close() {
    this.$modal.open = false;
  }
}

customElements.define('slice-shareplantillamodal', SharePlantillaModal);
