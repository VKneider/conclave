import { esc } from '/utils/format.js';

const EXAMPLE_TEAMS_CSV = [
  'id,nombre,min,max,capacidad,lider,asignable',
  'transporte,Transporte,4,6,6,,true',
  'banda-en-vivo,Banda en Vivo,6,10,10,,true',
  'bienvenida,Bienvenida,8,12,12,,true',
  'cafeteria,Cafetería,4,6,6,,true',
  'anfitriones,Anfitriones,2,2,2,,true',
].join('\n');

const EXAMPLE_MEMBERS_CSV = [
  'id,nombre,sexo,edad,rolFijo,fijo',
  '1,Juan Pérez,M,25,,false',
  '2,María García,F,30,,false',
  '3,Carlos López,M,28,,false',
  '4,Ana Martínez,F,24,,false',
  '5,Luis Rodríguez,M,32,,false',
].join('\n');

export default class HelpView extends HTMLElement {
  constructor(props) {
    super();
    slice.attachTemplate(this);
    this.$root = this.querySelector('.help-view');
    slice.controller.setComponentProps(this, props);
  }

  init() {
    this._roster = slice.getComponent('RosterService');
    this._parser = slice.getComponent('DataParserService');
    this._format = 'csv';
    this._render();
  }

  update() {
    this._render();
  }

  _render() {
    const teams = this._roster.getTeams();
    const members = this._roster.getMembers();
    const teamsCSV = esc(this._serializeTeamsCSV(teams));
    const membersCSV = esc(this._serializeMembersCSV(members));

    this.$root.innerHTML = `
      <h2 class="view-title">Generar datos</h2>
      <p class="view-sub">Carga o edita tus equipos y miembros. Cada elemento tiene un <b>ID fijo</b> que no cambia aunque modifiques su nombre u otros campos. Las asignaciones apuntan al ID, no al nombre.</p>

      <div class="gen-tabs">
        <button class="gen-tab${this._format === 'csv' ? ' active' : ''}" data-fmt="csv">CSV</button>
        <button class="gen-tab${this._format === 'json' ? ' active' : ''}" data-fmt="json">JSON</button>
      </div>

      <div class="gen-grid">
        <div class="gen-section">
          <div class="gen-section-head">
            <h3>Equipos</h3>
            <span class="gen-badge">${teams.length}</span>
          </div>
          <p class="gen-hint">id, nombre, min, max, capacidad, lider, asignable</p>
          <textarea class="gen-textarea" id="teamsInput" rows="10" spellcheck="false">${teamsCSV}</textarea>
          <div class="gen-actions">
            <button class="btn btn-sm" id="teamsExample">⬇ Cargar ejemplo</button>
          </div>
        </div>

        <div class="gen-section">
          <div class="gen-section-head">
            <h3>Miembros</h3>
            <span class="gen-badge">${members.length}</span>
          </div>
          <p class="gen-hint">id, nombre, sexo, edad, rolFijo, fijo</p>
          <textarea class="gen-textarea" id="membersInput" rows="10" spellcheck="false">${membersCSV}</textarea>
          <div class="gen-actions">
            <button class="btn btn-sm" id="membersExample">⬇ Cargar ejemplo</button>
          </div>
        </div>
      </div>

      <div class="gen-preview" id="previewArea" hidden>
        <h3>Previsualización</h3>
        <div id="previewContent"></div>
      </div>

      <div class="gen-errors" id="errorArea" hidden>
        <h3>Errores de validación</h3>
        <div id="errorContent"></div>
      </div>

      <div class="gen-main-actions">
        <button class="btn btn-primary" id="saveBtn">💾 Guardar datos</button>
        <button class="btn" id="exportBtn">⬇ Exportar JSON</button>
        <button class="btn btn-danger" id="resetBtn">🔄 Restaurar ejemplo</button>
      </div>

      <details class="help-reduced" open>
        <summary><strong>📖 Cómo usar los IDs fijos</strong></summary>
        <div class="help-inner">
          <p>Cada equipo y miembro tiene un <b>ID único</b> que funciona como su «documento de identidad» dentro de la app. Las asignaciones apuntan a este ID, no al nombre ni a otros campos.</p>
          <ul class="help-strategies">
            <li><b>Sustituir una persona:</b> Cambia su nombre y datos en el CSV, pero <b>conserva el mismo ID</b>. Todas las asignaciones que apuntaban a esa persona se mantienen.</li>
            <li><b>Eliminar:</b> Borra la fila del CSV. Al guardar, la app limpia automáticamente las asignaciones y resoluciones que referenciaban ese ID.</li>
            <li><b>Añadir:</b> Agrega una fila nueva. Si no pones ID, se asigna uno automáticamente (slug del nombre en equipos, número correlativo en miembros).</li>
            <li><b>Renombrar un equipo:</b> Cambia el nombre pero deja el ID intacto. Las asignaciones al equipo se preservan.</li>
          </ul>
          <p><b>CSV:</b> La primera columna es el <code>id</code>. Si lo omites, se autogenera. Los textos con comas pueden ir entre comillas <code>"</code>.</p>
          <p><b>JSON:</b> Pasa arrays de objetos con campo <code>id</code>. Si falta, se autogenera igual que en CSV.</p>
          <p class="help-note">💾 Los datos se guardan en <b>localStorage</b>. Para respaldarlos, usa <b>Exportar JSON</b>.</p>
        </div>
      </details>
    `;

    this.$root.querySelectorAll('.gen-tab').forEach((tab) => {
      tab.addEventListener('click', () => { this._format = tab.dataset.fmt; this._render(); });
    });
    this.$root.querySelector('#teamsExample').addEventListener('click', () => this._fillExample());
    this.$root.querySelector('#membersExample').addEventListener('click', () => this._fillExample());
    this.$root.querySelector('#saveBtn').addEventListener('click', () => this._parseAndSave());
    this.$root.querySelector('#exportBtn').addEventListener('click', () => this._exportJSON());
    this.$root.querySelector('#resetBtn').addEventListener('click', () => this._confirmReset());
  }

  _fillExample() {
    this.$root.querySelector('#teamsInput').value = EXAMPLE_TEAMS_CSV;
    this.$root.querySelector('#membersInput').value = EXAMPLE_MEMBERS_CSV;
    this._showToast('Ejemplo cargado — datos consistentes entre equipos y miembros', 'info');
  }

  _serializeTeamsCSV(teams) {
    const header = 'id,nombre,min,max,capacidad,lider,asignable';
    const rows = teams.map((t) => {
      const id = t.id || this._parser._slug(t.nombre);
      const name = t.nombre.includes(',') ? `"${t.nombre}"` : t.nombre;
      const lider = t.lider || '';
      return [id, name, t.min ?? '', t.max ?? '', t.capacidad ?? '', lider, String(t.asignable ?? true)].join(',');
    });
    return [header, ...rows].join('\n');
  }

  _serializeMembersCSV(members) {
    const header = 'id,nombre,sexo,edad,rolFijo,fijo';
    const rows = members.map((m) => {
      const name = m.nombre.includes(',') ? `"${m.nombre}"` : m.nombre;
      const rol = m.rolFijo || '';
      return [m.id, name, m.sexo || '', m.edad ?? '', rol, String(!!m.fijo)].join(',');
    });
    return [header, ...rows].join('\n');
  }

  _computeDiff(oldTeams, oldMembers, newTeams, newMembers) {
    const oldTeamMap = new Map(oldTeams.map((t) => [t.id, t]));
    const newTeamMap = new Map(newTeams.map((t) => [t.id, t]));
    const oldMemberMap = new Map(oldMembers.map((m) => [String(m.id), m]));
    const newMemberMap = new Map(newMembers.map((m) => [String(m.id), m]));

    const teamsAdded = newTeams.filter((t) => !oldTeamMap.has(t.id));
    const teamsRemoved = oldTeams.filter((t) => !newTeamMap.has(t.id));
    const teamsModified = newTeams.filter((t) => {
      const o = oldTeamMap.get(t.id);
      if (!o) return false;
      return o.nombre !== t.nombre || Number(o.min) !== Number(t.min) || Number(o.max) !== Number(t.max)
        || Number(o.capacidad) !== Number(t.capacidad) || o.lider !== t.lider || Boolean(o.asignable) !== Boolean(t.asignable);
    });

    const membersAdded = newMembers.filter((m) => !oldMemberMap.has(String(m.id)));
    const membersRemoved = oldMembers.filter((m) => !newMemberMap.has(String(m.id)));
    const membersModified = newMembers.filter((m) => {
      const o = oldMemberMap.get(String(m.id));
      if (!o) return false;
      return o.nombre !== m.nombre || o.sexo !== m.sexo || Number(o.edad) !== Number(m.edad)
        || o.rolFijo !== m.rolFijo || Boolean(o.fijo) !== Boolean(m.fijo);
    });

    return { teamsAdded, teamsRemoved, teamsModified, membersAdded, membersRemoved, membersModified };
  }

  _hasConflicts(diff) {
    const asgn = slice.getComponent('AssignmentService').getState();
    const removedMemberIds = new Set(diff.membersRemoved.map((m) => String(m.id)));
    const removedTeamIds = new Set(diff.teamsRemoved.map((t) => t.id));
    return Object.entries(asgn).some(([mid, tid]) => removedMemberIds.has(mid) || removedTeamIds.has(tid));
  }

  _countOrphaned(diff) {
    const asgn = slice.getComponent('AssignmentService').getState();
    const removedMemberIds = new Set(diff.membersRemoved.map((m) => String(m.id)));
    const removedTeamIds = new Set(diff.teamsRemoved.map((t) => t.id));
    return Object.entries(asgn).filter(([mid, tid]) => removedMemberIds.has(mid) || removedTeamIds.has(tid)).length;
  }

  _parseAndSave() {
    const teamsRaw = this.$root.querySelector('#teamsInput').value;
    const membersRaw = this.$root.querySelector('#membersInput').value;
    const parser = this._parser;

    const teamsResult = parser.parseTeams(teamsRaw, this._format);
    const membersResult = parser.parseMembers(membersRaw, this._format);

    const errors = [
      ...teamsResult.errors.map((e) => ({ source: 'equipos', message: e })),
      ...membersResult.errors.map((e) => ({ source: 'miembros', message: e })),
    ];
    const valErrors = [
      ...parser.validateTeams(teamsResult.teams).map((e) => ({ source: 'equipos', message: `[${e.field}] ${e.message}` })),
      ...parser.validateMembers(membersResult.members).map((e) => ({ source: 'miembros', message: `[${e.field}] ${e.message}` })),
    ];
    const allErrors = [...errors, ...valErrors];

    const oldTeams = this._roster.getTeams();
    const oldMembers = this._roster.getMembers();
    const diff = this._computeDiff(oldTeams, oldMembers, teamsResult.teams, membersResult.members);
    const hasChanges = diff.teamsAdded.length || diff.teamsRemoved.length || diff.teamsModified.length
      || diff.membersAdded.length || diff.membersRemoved.length || diff.membersModified.length;

    const previewEl = this.$root.querySelector('#previewArea');
    const previewContent = this.$root.querySelector('#previewContent');
    previewEl.hidden = false;

    let diffHTML = '';
    if (hasChanges) {
      const parts = [];
      if (diff.teamsAdded.length) parts.push(`<span class="diff-add">+${diff.teamsAdded.length} equipos</span>`);
      if (diff.teamsRemoved.length) parts.push(`<span class="diff-remove">−${diff.teamsRemoved.length} equipos</span>`);
      if (diff.teamsModified.length) parts.push(`<span class="diff-modify">~${diff.teamsModified.length} equipos</span>`);
      if (diff.membersAdded.length) parts.push(`<span class="diff-add">+${diff.membersAdded.length} miembros</span>`);
      if (diff.membersRemoved.length) parts.push(`<span class="diff-remove">−${diff.membersRemoved.length} miembros</span>`);
      if (diff.membersModified.length) parts.push(`<span class="diff-modify">~${diff.membersModified.length} miembros</span>`);
      diffHTML = `<div class="diff-bar">${parts.join(' ')}</div>`;
    }

    previewContent.innerHTML = `
      ${diffHTML}
      <div class="preview-summary">
        <span class="preview-ok">✅ ${teamsResult.teams.length} equipos</span>
        <span class="preview-ok">✅ ${membersResult.members.length} miembros</span>
      </div>
      <div class="preview-tables">
        <div>
          <div class="preview-label">Equipos (${teamsResult.teams.length})</div>
          <table class="preview-table">
            <tr>${['ID', 'Nombre', 'Min', 'Max', 'Cap', 'Líder', 'Asign.'].map((h) => `<th>${h}</th>`).join('')}</tr>
            ${teamsResult.teams.slice(0, 10).map((t) => `<tr>
              <td class="td-id">${esc(t.id)}</td>
              <td>${esc(t.nombre)}</td>
              <td>${t.min ?? '—'}</td>
              <td>${t.max ?? '—'}</td>
              <td>${t.capacidad ?? '—'}</td>
              <td>${esc(t.lider || '') || '—'}</td>
              <td>${t.asignable ? '✅' : '❌'}</td>
            </tr>`).join('')}
            ${teamsResult.teams.length > 10 ? `<tr><td colspan="7" class="preview-more">… y ${teamsResult.teams.length - 10} más</td></tr>` : ''}
          </table>
        </div>
        <div>
          <div class="preview-label">Miembros (${membersResult.members.length})</div>
          <table class="preview-table">
            <tr>${['ID', 'Nombre', 'Sexo', 'Edad', 'Rol fijo', 'Fijo'].map((h) => `<th>${h}</th>`).join('')}</tr>
            ${membersResult.members.slice(0, 10).map((m) => `<tr>
              <td class="td-id">${m.id}</td>
              <td>${esc(m.nombre)}</td>
              <td>${m.sexo || '—'}</td>
              <td>${m.edad ?? '—'}</td>
              <td>${esc(m.rolFijo || '') || '—'}</td>
              <td>${m.fijo ? '✅' : '—'}</td>
            </tr>`).join('')}
            ${membersResult.members.length > 10 ? `<tr><td colspan="6" class="preview-more">… y ${membersResult.members.length - 10} más</td></tr>` : ''}
          </table>
        </div>
      </div>`;

    const errorEl = this.$root.querySelector('#errorArea');
    const errorContent = this.$root.querySelector('#errorContent');
    if (allErrors.length) {
      errorEl.hidden = false;
      errorContent.innerHTML = `<ul>${allErrors.map((e) => `<li><strong>${e.source}:</strong> ${esc(e.message)}</li>`).join('')}</ul>`;
    } else {
      errorEl.hidden = true;
    }

    if (!errors.length) {
      if (!hasChanges) {
        this._showToast('No hay cambios para guardar', 'info');
        return;
      }

      if (this._hasConflicts(diff)) {
        const orphanedCount = this._countOrphaned(diff);
        const rmMembers = diff.membersRemoved.length;
        const rmTeams = diff.teamsRemoved.length;
        const parts = [];
        if (rmMembers) parts.push(`${rmMembers} miembro${rmMembers !== 1 ? 's' : ''}`);
        if (rmTeams) parts.push(`${rmTeams} equipo${rmTeams !== 1 ? 's' : ''}`);
        const what = parts.join(' y ');

        slice.events.emit('confirm:request', {
          title: '¿Guardar datos?',
          message: `Se eliminarán ${what} que tienen ${orphanedCount} asignación${orphanedCount !== 1 ? 'es' : ''} activa${orphanedCount !== 1 ? 's' : ''}. Las asignaciones huérfanas se limpiarán automáticamente.`,
          confirmLabel: 'Guardar de todas formas',
          danger: true,
          onConfirm: () => {
            this._doSave(teamsResult.teams, membersResult.members);
          },
        });
      } else {
        this._doSave(teamsResult.teams, membersResult.members);
      }
    } else {
      this._showToast('Hay errores de formato — revisa la previsualización', 'error');
    }
  }

  _doSave(teams, members) {
    this._roster.loadFromData(teams, members);
    this._showToast('Datos guardados correctamente', 'success');
    this._render();
  }

  _exportJSON() {
    const teams = this._roster.getTeams();
    const members = this._roster.getMembers();
    const payload = { equipos: teams, miembros: members, exportado: new Date().toISOString() };
    slice.getComponent('FileDownloadService').download(
      'conclave-datos.json',
      JSON.stringify(payload, null, 2),
      'application/json'
    );
  }

  _confirmReset() {
    slice.events.emit('confirm:request', {
      title: '¿Restaurar datos de ejemplo?',
      message: 'Se perderán todos tus equipos y miembros actuales. Las asignaciones a equipos o miembros eliminados se limpiarán automáticamente.',
      confirmLabel: 'Restaurar',
      danger: true,
      onConfirm: () => {
        this._roster.resetToSeed();
        this._showToast('Datos de ejemplo restaurados', 'success');
        this._render();
      },
    });
  }

  _showToast(message, type) {
    slice.events.emit('toast:show', { message, type });
  }
}

customElements.define('slice-helpview', HelpView);
