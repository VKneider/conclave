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
    this.$themeSlot = this.querySelector('[data-el="themeSlot"]');
    this.$exportBtn = this.querySelector('[data-el="exportBtn"]');
    this.$shareLinkBtn = this.querySelector('[data-el="shareLinkBtn"]');
    this.$importBtn = this.querySelector('[data-el="importBtn"]');
    this.$importFile = this.querySelector('[data-el="importFile"]');
    this.$resetBtn = this.querySelector('[data-el="resetBtn"]');

    this._open = false;
    this._onDocClick = (e) => {
      if (this._open && !this.$root.contains(e.target)) this._setOpen(false);
    };
    this._onKeydown = (e) => {
      if (this._open && e.key === 'Escape') this._setOpen(false);
    };

    this.$trigger.addEventListener('click', () => this._setOpen(!this._open));

    this.$exportBtn.addEventListener('click', () => this._exportMine());
    this.$shareLinkBtn.addEventListener('click', () => this._shareLink());
    this.$importBtn.addEventListener('click', () => this.$importFile.click());
    this.$importFile.addEventListener('change', (e) => this._handleImport(e));
    this.$resetBtn.addEventListener('click', () => this._confirmReset());

    slice.controller.setComponentProps(this, props);
  }

  async init() {
    document.addEventListener('click', this._onDocClick);
    document.addEventListener('keydown', this._onKeydown);

    this.$autorField = await slice.build('Input', { sliceId: 'user-menu-autor', placeholder: 'Tu nombre' });
    this.$autorFieldSlot.appendChild(this.$autorField);
    this.$autorField.addEventListener('input', () => slice.getComponent('SettingsService').setAutor(this.$autorField.value));

    const themeSwitcher = await slice.build('ThemeSwitcher', {
      sliceId: 'user-menu-theme-switcher',
      themes: ['Light', 'Dark'],
      variant: 'menu-item',
      label: 'Tema',
    });
    this.$themeSlot.appendChild(themeSwitcher);

    slice.context.watch('settings', this, (s) => this._syncAutor(s.autor));
    this._syncAutor(slice.getComponent('SettingsService').getState().autor);
  }

  beforeDestroy() {
    document.removeEventListener('click', this._onDocClick);
    document.removeEventListener('keydown', this._onKeydown);
  }

  _setOpen(open) {
    this._open = open;
    this.$panel.hidden = !open;
    this.$trigger.setAttribute('aria-expanded', String(open));
    this.$root.classList.toggle('is-open', open);
    if (open) this.$autorField?.querySelector('input')?.focus({ preventScroll: true });
  }

  _syncAutor(autor) {
    if (document.activeElement !== this.$autorField?.querySelector('input')) this.$autorField.value = autor || '';
    this.$avatar.textContent = autor?.trim() ? autor.trim()[0].toUpperCase() : '👤';
    this.$trigger.title = autor?.trim() ? autor.trim() : 'Tu cuenta';
  }

  _exportMine() {
    const settings = slice.getComponent('SettingsService');
    if (settings.getState().autor?.trim()) {
      slice.getComponent('RespuestasService').exportMine();
      this._setOpen(false);
      return;
    }
    slice.events.emit('confirm:request', {
      title: '¿Cuál es tu nombre?',
      message: 'Se incluye en el archivo exportado.',
      confirmLabel: 'Exportar',
      inputLabel: 'Tu nombre',
      inputPlaceholder: '¿Quién asigna?',
      onConfirm: (name) => {
        if (!name) return;
        settings.setAutor(name);
        slice.getComponent('RespuestasService').exportMine();
        this._setOpen(false);
      },
    });
  }

  _shareLink() {
    const settings = slice.getComponent('SettingsService');
    const autor = settings.getState().autor?.trim();

    const doShare = (name) => {
      const respuestas = slice.getComponent('RespuestasService').getState();
      const data = { tipo: 'respuestas', autor: name, respuestas };
      const compressed = slice.getComponent('CompressionService').compressToURI(data);
      const url = `${window.location.origin}${window.location.pathname}#respuestas=${compressed}`;
      navigator.clipboard.writeText(url).then(() => {
        slice.events.emit('toast:show', { message: 'Enlace copiado al portapapeles', type: 'success' });
        this._setOpen(false);
      }, () => {
        slice.events.emit('toast:show', { message: 'No se pudo copiar el enlace', type: 'error' });
      });
    };

    if (autor) { doShare(autor); return; }

    slice.events.emit('confirm:request', {
      title: '¿Cuál es tu nombre?',
      message: 'Se incluye en el enlace compartido.',
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
        slice.events.emit('toast:show', { message: 'Formato no reconocido — se espera un JSON de Respuestas.', type: 'error' });
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
