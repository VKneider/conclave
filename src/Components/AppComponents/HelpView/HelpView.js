import { esc } from '/utils/format.js';

// Static content view — nothing here changes after boot, so no update() is
// needed (init() does the only paint this component will ever do).
export default class HelpView extends HTMLElement {
  constructor(props) {
    super();
    slice.attachTemplate(this);
    this.$root = this.querySelector('.help-view');
    slice.controller.setComponentProps(this, props);
  }

  init() {
    const roster = slice.getComponent('RosterService');
    const nMembers = roster.getAssignableMembers().length;
    const nTeams = roster.getAssignableTeams().length;

    const ejMiembro = roster.getAssignableMembers()[0] || roster.getMembers()[0];
    const ejMiembroJSON = JSON.stringify(
      { id: ejMiembro.id, nombre: ejMiembro.nombre, sexo: ejMiembro.sexo, edad: ejMiembro.edad, rolFijo: ejMiembro.rolFijo, fijo: ejMiembro.fijo },
      null, 2
    );
    const ejEquipo = roster.getAssignableTeams()[0] || roster.getTeams()[0];
    const ejEquipoJSON = JSON.stringify(
      { id: ejEquipo.id, numero: ejEquipo.numero, nombre: ejEquipo.nombre, lider: ejEquipo.lider, capacidad: ejEquipo.capacidad, min: ejEquipo.min, max: ejEquipo.max, asignable: ejEquipo.asignable },
      null, 2
    );

    this.$root.innerHTML = `
      <h2 class="view-title">Cómo funciona Conclave</h2>
      <p class="view-sub">Una guía rápida para asignar miembros a equipos y comparar propuestas entre varias personas.</p>

      <div class="help-card">
        <h3>¿Qué hace?</h3>
        <p>Te ayuda a repartir <b>${nMembers} miembros</b> entre <b>${nTeams} equipos</b>, respetando el mínimo y máximo de cada uno. Cada persona arma su propia propuesta en su navegador, la <b>exporta a un JSON</b>, y luego se pueden <b>importar varias y compararlas</b> para ver en qué coinciden y en qué difieren.</p>
        <p class="help-note">💾 Tu trabajo se guarda solo en <b>este navegador</b> (localStorage). Para respaldarlo o compartirlo, usa <b>Exportar mis resultados</b>.</p>
      </div>

      <h3 class="help-h">Las vistas</h3>
      <div class="help-cards">
        <div class="help-card"><div class="help-ico" style="--c:var(--primary-color)">📊</div><h4>Dashboard</h4><p>Resumen general: cuántos miembros hay asignados y qué equipos están en rango o fuera de su mínimo/máximo.</p></div>
        <div class="help-card"><div class="help-ico" style="--c:var(--secondary-color)">🎯</div><h4>Mi asignación</h4><p>Carrusel de miembros uno por uno. Usa las flechas <span class="kbd">‹</span> <span class="kbd">›</span> o el teclado <span class="kbd">←</span> <span class="kbd">→</span> y elige un equipo. Al elegir, avanza solo.</p></div>
        <div class="help-card"><div class="help-ico" style="--c:var(--success-color)">🧩</div><h4>Por equipo</h4><p>Barra lateral con los <b>sin asignar</b> y un grid de equipos. <b>Arrastra</b> personas a un equipo (o de vuelta a la barra). Pasar el máximo está permitido — el equipo queda marcado hasta que lo resuelvas.</p></div>
        <div class="help-card"><div class="help-ico" style="--c:var(--warning-color)">🔀</div><h4>Comparar</h4><p>Importa los JSON de varias personas y mira una tabla miembro × persona: <b>coincide</b>, <b>difiere</b> o <b>faltan votos</b>, con % de acuerdo. En la columna <b>Final</b> defines el equipo definitivo de cada uno (se sugiere la mayoría) y exportas la <b>lista final</b>.</p></div>
        <div class="help-card"><div class="help-ico" style="--c:var(--danger-color)">⚙️</div><h4>Configuración</h4><p>Define tu nombre y el nombre de tu organización o evento — se muestran en el encabezado y en tus archivos exportados.</p></div>
      </div>

      <h3 class="help-h">Flujo recomendado (varias personas)</h3>
      <div class="help-card">
        <ol class="help-steps">
          <li>Ve a <b>Configuración</b> y escribe tu nombre y el de tu organización.</li>
          <li>Ve a <b>Mi asignación</b> y recorre todos los miembros eligiendo un equipo para cada uno.</li>
          <li>Afina con <b>Por equipo</b> arrastrando personas hasta cuadrar los mínimos y máximos.</li>
          <li>Pulsa <b>⬇ Exportar mis resultados</b> y comparte tu archivo <code>.json</code>.</li>
          <li>Una persona reúne todos los JSON, va a <b>Comparar</b>, los arrastra y revisa diferencias.</li>
        </ol>
      </div>

      <h3 class="help-h">Reglas</h3>
      <div class="help-card">
        <ul class="help-list">
          <li>Cada miembro recibe <b>un solo equipo</b>.</li>
          <li>Puedes asignar a un equipo <b>por encima de su máximo</b> si hace falta — queda marcado con una alerta visible hasta que muevas o quites a alguien. Es más fácil resolver un exceso que dejar personas sin asignar.</li>
          <li>Los miembros marcados como <b>fijos</b> (roles predefinidos que no participan en la asignación) <b>no</b> aparecen en las vistas de asignación.</li>
          <li>El color del semáforo: <span class="badge ok">En rango</span> <span class="badge under">Falta</span> <span class="badge over">Sobra</span> <span class="badge empty">Vacío</span>.</li>
        </ul>
      </div>

      <h3 class="help-h">Usar tus propios equipos y miembros</h3>
      <div class="help-card">
        <p>Los datos viven en dos archivos JSON dentro de <code>src/data/</code>: <code>equipos.json</code> y <code>miembros.json</code>. Edítalos directamente con este formato:</p>
        <div class="code-grid">
          <div><div class="code-label">src/data/miembros.json — un objeto por persona</div><pre class="code">${esc(ejMiembroJSON)}</pre></div>
          <div><div class="code-label">src/data/equipos.json — un objeto por equipo</div><pre class="code">${esc(ejEquipoJSON)}</pre></div>
        </div>
        <ul class="help-list">
          <li><code>asignable: false</code> en un equipo lo deja fuera de la asignación.</li>
          <li><code>fijo: true</code> en un miembro lo excluye de la asignación.</li>
          <li><code>min</code> / <code>max</code> definen el rango deseado; <code>max</code> es el tope que la app no deja superar.</li>
        </ul>
        <p class="help-note">⚠️ Al cambiar los datos, conviene pulsar <b>Reiniciar mis asignaciones</b> (abajo) para empezar limpio, ya que las asignaciones guardadas referencian ids antiguos.</p>
      </div>

      <div class="help-card help-cta">
        <span>¿Listo para empezar?</span>
        <button class="btn btn-primary" id="ayudaGo">🎯 Ir a Mi asignación</button>
      </div>`;

    const go = this.$root.querySelector('#ayudaGo');
    if (go) go.onclick = () => slice.router.navigate('/mi-asignacion');
  }
}

customElements.define('slice-helpview', HelpView);
