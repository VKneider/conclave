// Compact "yo" hub in the topbar — identity (tu nombre), theme, and every
// "mis Respuestas" action (exportar/importar/reiniciar). Replaces both the
// old standalone SettingsView route and AppShell's footer: none of this is
// Plantilla configuration (that lives in PlantillaBuilderView) or specific
// to any one view, so it belongs in an always-reachable menu instead.
export default class UserMenu extends HTMLElement {
  constructor(props) {
    super();
    slice.attachTemplate(this);
    this.$root = this.querySelector('.user-menu');
    this.$trigger = this.querySelector('.user-menu__trigger');
    this.$avatar = this.querySelector('[data-el="avatar"]');
    this.$panel = this.querySelector('[data-el="panel"]');
    this.$autorFieldSlot = this.querySelector('[data-el="autorFieldSlot"]');
    this.$emailFieldSlot = this.querySelector('[data-el="emailFieldSlot"]');
    this.$themeSlot = this.querySelector('[data-el="themeSlot"]');
    this.$shareBtnSlot = this.querySelector('[data-el="shareBtnSlot"]');
    this.$importBtnSlot = this.querySelector('[data-el="importBtnSlot"]');
    this.$importFile = this.querySelector('[data-el="importFile"]');
    this.$resetBtnSlot = this.querySelector('[data-el="resetBtnSlot"]');

    this._open = false;
    this._onDocClick = (e) => {
      if (this._open && !this.$root.contains(e.target)) this._setOpen(false);
    };
    this._onKeydown = (e) => {
      if (this._open && e.key === 'Escape') this._setOpen(false);
    };

    this.$trigger.addEventListener('click', () => this._setOpen(!this._open));

    this.$importFile.addEventListener('change', (e) => this._handleImport(e));

    slice.controller.setComponentProps(this, props);
  }

  async init() {
    document.addEventListener('click', this._onDocClick);
    document.addEventListener('keydown', this._onKeydown);

    this._children = [];

    this.$autorField = await slice.build('Input', { placeholder: 'Tu nombre' });
    if (this.$autorField instanceof Node) { this.$autorFieldSlot.appendChild(this.$autorField); this._children.push(this.$autorField); }
    if (this.$autorField?.addEventListener) this.$autorField.addEventListener('input', () => slice.getComponent('SettingsService').setAutor(this.$autorField.value));

    this.$emailField = await slice.build('Input', { placeholder: 'Tu correo electrónico', type: 'email' });
    if (this.$emailField instanceof Node) { this.$emailFieldSlot.appendChild(this.$emailField); this._children.push(this.$emailField); }
    if (this.$emailField?.addEventListener) this.$emailField.addEventListener('input', () => slice.getComponent('SettingsService').setEmail(this.$emailField.value));

    const themeSwitcher = await slice.build('ThemeSwitcher', {
      themes: ['Light', 'Dark'],
      variant: 'menu-item',
      label: 'Tema',
    });
    if (themeSwitcher instanceof Node) { this.$themeSlot.appendChild(themeSwitcher); this._children.push(themeSwitcher); }

    this.$shareBtn = await slice.build('Button', {
      value: '\uD83D\uDCE4 Compartir respuestas',
      variant: 'ghost',
      onClick: () => {
        const modal = slice.getComponent('exportRespuestasModal');
        if (modal?.show) modal.show();
        this._setOpen(false);
      }
    });
    if (this.$shareBtn instanceof Node) { this._children.push(this.$shareBtn); }

    this.$importBtn = await slice.build('Button', {
      value: '\uD83D\uDCC2 Importar mis Respuestas',
      variant: 'ghost',
      onClick: () => this.$importFile.click()
    });
    if (this.$importBtn instanceof Node) { this._children.push(this.$importBtn); }

    this.$resetBtn = await slice.build('Button', {
      value: '\uD83D\uDDD1 Reiniciar mis Respuestas',
      variant: 'ghost',
      onClick: () => this._confirmReset()
    });
    if (this.$resetBtn instanceof Node) { this._children.push(this.$resetBtn); }

    if (this.$shareBtn instanceof Node && this.$shareBtnSlot?.parentNode) this.$shareBtnSlot.replaceWith(this.$shareBtn);
    if (this.$importBtn instanceof Node && this.$importBtnSlot?.parentNode) this.$importBtnSlot.replaceWith(this.$importBtn);
    if (this.$resetBtn instanceof Node && this.$resetBtnSlot?.parentNode) this.$resetBtnSlot.replaceWith(this.$resetBtn);

    slice.context.watch('settings', this, (s) => { this._syncAutor(s.autor); this._syncEmail(s.email); });
    const settings = slice.getComponent('SettingsService');
    this._syncAutor(settings.getState().autor);
    this._syncEmail(settings.getState().email);
  }

  beforeDestroy() {
    document.removeEventListener('click', this._onDocClick);
    document.removeEventListener('keydown', this._onKeydown);
    this._children?.forEach((c) => { try { slice.controller.destroyComponent(c); } catch (e) { /* already destroyed */ } });
  }

  _setOpen(open) {
    this._open = open;
    this.$panel.hidden = !open;
    this.$trigger.setAttribute('aria-expanded', String(open));
    this.$root.classList.toggle('is-open', open);
  }

  _syncAutor(autor) {
    if (document.activeElement !== this.$autorField?.querySelector('input')) this.$autorField.value = autor || '';
    this.$avatar.textContent = autor?.trim() ? autor.trim()[0].toUpperCase() : '👤';
    this.$trigger.title = autor?.trim() ? autor.trim() : 'Tu cuenta';
  }

  _syncEmail(email) {
    if (document.activeElement !== this.$emailField?.querySelector('input')) this.$emailField.value = email || '';
  }

  _handleImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      let data;
      try {
        data = JSON.parse(ev.target.result);
      } catch (err) {
        slice.events.emit('toast:show', { message: 'Error al leer el archivo: ' + err.message, type: 'error' });
        return;
      }
      if (!data?.respuestas) {
        slice.events.emit('toast:show', { message: 'Formato no reconocido — se espera un archivo de respuestas.', type: 'error' });
        return;
      }
      slice.events.emit('confirm:request', {
        title: '¿Reemplazar tus respuestas actuales?',
        message: `Se sobrescribirán tus respuestas en este dispositivo con las de "${data.autor || file.name}". Esta acción no se puede deshacer.`,
        confirmLabel: 'Importar',
        danger: true,
        onConfirm: () => {
          slice.getComponent('RespuestasService').importMine(data);
          slice.events.emit('toast:show', { message: 'Respuestas importadas — continuás donde quedaste', type: 'success' });
          this._setOpen(false);
        },
      });
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  _confirmReset() {
    slice.events.emit('confirm:request', {
      title: '¿Reiniciar tus Respuestas?',
      message: 'Se borran todas TUS respuestas en este dispositivo. No afecta los JSON ya exportados.',
      confirmLabel: 'Reiniciar',
      danger: true,
      onConfirm: () => {
        slice.getComponent('RespuestasService').reset();
        slice.events.emit('toast:show', { message: 'Tus respuestas se reiniciaron', type: 'success' });
        this._setOpen(false);
      },
    });
  }
}

customElements.define('slice-usermenu', UserMenu);
