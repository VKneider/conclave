import { esc } from '/utils/format.js';

export default class SettingsView extends HTMLElement {
  constructor(props) {
    super();
    slice.attachTemplate(this);
    this.$root = this.querySelector('.settings-view');
    slice.controller.setComponentProps(this, props);
  }

  init() {
    const settings = slice.getComponent('SettingsService');
    const roster = slice.getComponent('RosterService');
    const state = settings.getState();

    const teamsHtml = roster.getTeams().map((t) => `
      <div class="data-team" data-team-id="${esc(t.id)}">
        <div class="data-team__head">${esc(t.nombre)} <span class="data-team__id">${esc(t.id)}</span></div>
        <div class="data-team__fields">
          <label>Nombre <input class="dt-name" value="${esc(t.nombre)}" /></label>
          <label>Mín <input class="dt-min" type="number" value="${t.min ?? ''}" /></label>
          <label>Máx <input class="dt-max" type="number" value="${t.max ?? ''}" /></label>
          <label>Cap <input class="dt-cap" type="number" value="${t.capacidad ?? ''}" /></label>
        </div>
      </div>`).join('');

    const membersHtml = roster.getMembers().map((m) => `
      <div class="data-member" data-member-id="${m.id}">
        <span class="data-member__name">${esc(m.nombre)}</span>
        <span class="data-member__meta">${m.fijo ? '🔒 Fijo' : ''} ${m.rolFijo ? esc(m.rolFijo) : ''}</span>
        ${m.fijo ? '' : '<button class="btn btn-ghost data-member__remove" type="button" style="flex:none;width:28px;height:28px;padding:0;font-size:12px;border-radius:50%">✕</button>'}
      </div>`).join('');

    this.$root.innerHTML = `
      <h2 class="view-title">Configuración</h2>

      <div class="section-card">
        <h3 class="section-card__title">Identidad</h3>
        <p class="view-sub">Tu nombre y el de tu organización o evento.</p>
        <label class="settings-field">
          <span>Tu nombre</span>
          <input type="text" id="autorField" placeholder="¿Quién asigna?" autocomplete="off" />
        </label>
        <label class="settings-field" style="margin-top:12px">
          <span>Nombre de tu organización o evento</span>
          <input type="text" id="orgField" placeholder="p. ej. Retiro Juvenil 2026…" autocomplete="off" />
        </label>
      </div>

      <div class="section-card">
        <h3 class="section-card__title">Líderes de equipo</h3>
        <label class="toggle-row">
          <input type="checkbox" id="lideresToggle" ${state.lideresEnabled ? 'checked' : ''} />
          <span>Habilitar líderes de equipo</span>
        </label>
      </div>

      <div class="section-card">
        <h3 class="section-card__title">Datos</h3>
        <p class="view-sub">Importá o exportá los archivos JSON de equipos y miembros, o editá los datos directamente.</p>

        <div class="data-actions">
          <button class="btn btn-ghost" id="importBtn">📂 Importar JSON</button>
          <button class="btn btn-ghost" id="exportAllBtn">⬇ Exportar todo</button>
        </div>
        <input type="file" id="importFile" accept=".json" hidden />

        <h4 style="margin:18px 0 6px;font-size:13px;">Equipos</h4>
        <div class="data-list data-teams">${teamsHtml}</div>

        <h4 style="margin:18px 0 6px;font-size:13px;">Miembros</h4>
        <div class="data-list data-members">${membersHtml}</div>

        <div class="data-actions" style="margin-top:10px">
          <button class="btn btn-ghost" id="addMemberBtn">+ Añadir miembro</button>
          <button class="btn btn-ghost" id="saveRosterBtn">💾 Guardar cambios</button>
        </div>
      </div>`;

    // ─── Identity ───
    this.$autorField = this.$root.querySelector('#autorField');
    this.$orgField = this.$root.querySelector('#orgField');
    this.$autorField.value = state.autor || '';
    this.$orgField.value = state.nombreOrganizacion || '';
    this.$autorField.oninput = () => settings.setAutor(this.$autorField.value);
    this.$orgField.oninput = () => settings.setNombreOrganizacion(this.$orgField.value);

    // ─── Lideres toggle ───
    this.$lideresToggle = this.$root.querySelector('#lideresToggle');
    this.$lideresToggle.onchange = () => settings.setLideresEnabled(this.$lideresToggle.checked);

    // ─── Import ───
    this.$root.querySelector('#importBtn').onclick = () => this.$root.querySelector('#importFile').click();
    this.$root.querySelector('#importFile').onchange = (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target.result);
          if (data.equipos && data.miembros) {
            roster.loadFromData(data.equipos, data.miembros);
          } else if (Array.isArray(data)) {
            roster.loadFromData(data, roster.getMembers());
          } else {
            slice.events.emit('toast:show', { message: 'Formato no reconocido. Usá { equipos: [...], miembros: [...] }', type: 'error' });
            return;
          }
          slice.events.emit('toast:show', { message: 'Datos importados correctamente', type: 'success' });
          this._rebuildDataLists();
        } catch (err) {
          slice.events.emit('toast:show', { message: 'Error al leer el archivo: ' + err.message, type: 'error' });
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    };

    // ─── Export ───
    this.$root.querySelector('#exportAllBtn').onclick = () => {
      const payload = { equipos: roster.getTeams(), miembros: roster.getMembers() };
      slice.getComponent('FileDownloadService').download('datos_completos.json', JSON.stringify(payload, null, 2), 'application/json');
    };

    // ─── Team inline edits ───
    this.$root.querySelectorAll('.data-team').forEach((el) => {
      const teamId = el.dataset.teamId;
      el.querySelector('.dt-name').onchange = (e) => {
        roster.getTeamById(teamId).nombre = e.target.value.trim();
      };
      el.querySelector('.dt-min').onchange = (e) => {
        roster.getTeamById(teamId).min = e.target.value === '' ? null : Number(e.target.value);
      };
      el.querySelector('.dt-max').onchange = (e) => {
        roster.getTeamById(teamId).max = e.target.value === '' ? null : Number(e.target.value);
      };
      el.querySelector('.dt-cap').onchange = (e) => {
        roster.getTeamById(teamId).capacidad = e.target.value === '' ? null : Number(e.target.value);
      };
    });

    // ─── Add member ───
    this.$root.querySelector('#addMemberBtn').onclick = () => {
      slice.events.emit('confirm:request', {
        title: 'Nuevo miembro',
        message: 'Ingresá el nombre del miembro.',
        confirmLabel: 'Añadir',
        inputLabel: 'Nombre',
        inputPlaceholder: 'Nombre y Apellido',
        onConfirm: (name) => {
          if (!name) return;
          roster.addMember({ nombre: name.trim() });
          this._rebuildDataLists();
        },
      });
    };

    // ─── Save roster ───
    this.$root.querySelector('#saveRosterBtn').onclick = () => {
      slice.events.emit('roster:changed');
      slice.events.emit('toast:show', { message: 'Cambios guardados', type: 'success' });
    };

    // ─── Reactivity ───
    slice.context.watch('settings', this, (s) => {
      if (document.activeElement !== this.$autorField) this.$autorField.value = s.autor || '';
      if (document.activeElement !== this.$orgField) this.$orgField.value = s.nombreOrganizacion || '';
      if (document.activeElement !== this.$lideresToggle) this.$lideresToggle.checked = s.lideresEnabled === true;
    });
    slice.events.subscribe('roster:changed', () => this._rebuildDataLists());
  }

  _rebuildDataLists() {
    const roster = slice.getComponent('RosterService');
    const teamsEl = this.$root.querySelector('.data-teams');
    const membersEl = this.$root.querySelector('.data-members');

    teamsEl.innerHTML = roster.getTeams().map((t) => `
      <div class="data-team" data-team-id="${esc(t.id)}">
        <div class="data-team__head">${esc(t.nombre)} <span class="data-team__id">${esc(t.id)}</span></div>
        <div class="data-team__fields">
          <label>Nombre <input class="dt-name" value="${esc(t.nombre)}" /></label>
          <label>Mín <input class="dt-min" type="number" value="${t.min ?? ''}" /></label>
          <label>Máx <input class="dt-max" type="number" value="${t.max ?? ''}" /></label>
          <label>Cap <input class="dt-cap" type="number" value="${t.capacidad ?? ''}" /></label>
        </div>
      </div>`).join('');

    membersEl.innerHTML = roster.getMembers().map((m) => `
      <div class="data-member" data-member-id="${m.id}">
        <span class="data-member__name">${esc(m.nombre)}</span>
        <span class="data-member__meta">${m.fijo ? '🔒 Fijo' : ''} ${m.rolFijo ? esc(m.rolFijo) : ''}</span>
        ${m.fijo ? '' : '<button class="btn btn-ghost data-member__remove" type="button" style="flex:none;width:28px;height:28px;padding:0;font-size:12px;border-radius:50%">✕</button>'}
      </div>`).join('');

    this._rebindTeamEdits();
    this._rebindMemberRemoves();
  }

  _rebindTeamEdits() {
    this.$root.querySelectorAll('.data-team').forEach((el) => {
      const teamId = el.dataset.teamId;
      el.querySelector('.dt-name').onchange = (e) => {
        slice.getComponent('RosterService').getTeamById(teamId).nombre = e.target.value.trim();
      };
      el.querySelector('.dt-min').onchange = (e) => {
        slice.getComponent('RosterService').getTeamById(teamId).min = e.target.value === '' ? null : Number(e.target.value);
      };
      el.querySelector('.dt-max').onchange = (e) => {
        slice.getComponent('RosterService').getTeamById(teamId).max = e.target.value === '' ? null : Number(e.target.value);
      };
      el.querySelector('.dt-cap').onchange = (e) => {
        slice.getComponent('RosterService').getTeamById(teamId).capacidad = e.target.value === '' ? null : Number(e.target.value);
      };
    });
  }

  _rebindMemberRemoves() {
    this.$root.querySelectorAll('.data-member .data-member__remove').forEach((btn) => {
      btn.onclick = () => {
        const id = btn.closest('.data-member').dataset.memberId;
        slice.getComponent('RosterService').removeMember(id);
        this._rebuildDataLists();
      };
    });
  }
}

customElements.define('slice-settingsview', SettingsView);
