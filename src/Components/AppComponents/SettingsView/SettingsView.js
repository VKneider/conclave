// Edits the `settings` context directly (autor + org name). Watches the
// context rather than only writing to it, so external changes (e.g. the
// AppShell's export-name prompt) stay reflected here too.
export default class SettingsView extends HTMLElement {
  constructor(props) {
    super();
    slice.attachTemplate(this);
    this.$root = this.querySelector('.settings-view');
    slice.controller.setComponentProps(this, props);
  }

  init() {
    this.$root.innerHTML = `
      <h2 class="view-title">Configuración</h2>
      <p class="view-sub">Tu identidad y el nombre de tu organización o evento — se guardan en este navegador y se incluyen en tus archivos exportados.</p>
      <div class="settings-form">
        <label class="settings-field">
          <span>Tu nombre</span>
          <input type="text" id="autorField" placeholder="¿Quién asigna?" autocomplete="off" />
        </label>
        <label class="settings-field">
          <span>Nombre de tu organización o evento</span>
          <input type="text" id="orgField" placeholder="p. ej. Retiro Juvenil 2026, Equipo de Voluntariado…" autocomplete="off" />
        </label>
        <p class="view-sub" style="margin:4px 0 0">Este nombre reemplaza el subtítulo genérico del encabezado.</p>
      </div>`;

    this.$autorField = this.$root.querySelector('#autorField');
    this.$orgField = this.$root.querySelector('#orgField');

    const settings = slice.getComponent('SettingsService');
    const state = settings.getState();
    this.$autorField.value = state.autor || '';
    this.$orgField.value = state.nombreOrganizacion || '';

    this.$autorField.oninput = () => settings.setAutor(this.$autorField.value);
    this.$orgField.oninput = () => settings.setNombreOrganizacion(this.$orgField.value);

    slice.context.watch('settings', this, (s) => {
      if (document.activeElement !== this.$autorField) this.$autorField.value = s.autor || '';
      if (document.activeElement !== this.$orgField) this.$orgField.value = s.nombreOrganizacion || '';
    });
  }
}

customElements.define('slice-settingsview', SettingsView);
