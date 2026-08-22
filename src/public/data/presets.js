// @ts-nocheck
import { SEED_TEMAS, SEED_OPCIONES, DEFAULT_ATRIBUTOS } from './seedData.js';

// Starter Plantillas shown in PlantillaBuilderView's gallery. Each `plantilla`
// is a full { nombre, bienvenida, atributos, temas, opciones } payload — loaded
// via PlantillaService.prepareImport() + loadFromData() (same path as importing
// a shared Plantilla, so ids are validated). Tema/Opción ids are safe slugs /
// numbers (see PlantillaService.isSafeId).
//
// `bienvenida` es el mensaje que ve quien importa la Plantilla para responder.
// Acá cumple doble función: da contexto en el preset y, sobre todo, le enseña
// al autor que el campo existe y qué se espera escribir en él — de otro modo
// es una caja vacía en "Detalles" que casi nadie descubre. Sólo puede usar las
// etiquetas que deja pasar HtmlService.sanitizeRichText() (negrita, cursiva,
// listas y párrafos): cualquier otra se descarta al importar.
const tema = (id, nombre, modo, { orden = 1, numero = 1 } = {}) => ({
  id, nombre, modo, orden, min: null, max: null,
  participable: modo === 'reparto', meta: { lider: null, numero },
});
const opc = (id, nombre, temaId = null) => ({ id, nombre, temaId, meta: { fijo: false, rolFijo: null } });

const PRESETS = [
  {
    id: 'asignacion', icon: 'target', nombre: 'Asignación de equipos',
    descripcion: 'Repartí un grupo de personas entre equipos con cupos mín/máx. El caso clásico, con atributos de ejemplo (sexo, edad).',
    plantilla: {
      nombre: 'Asignación de equipos', atributos: DEFAULT_ATRIBUTOS, temas: SEED_TEMAS, opciones: SEED_OPCIONES,
      bienvenida: '<p>Hola: vamos a armar los equipos entre todos.</p><p>Indica a qué equipo llevarías a cada persona. Dos cosas a tener en cuenta:</p><ul><li>Cada persona va a <strong>un solo</strong> equipo.</li><li>Los cupos mínimos y máximos son una guía, no un límite rígido.</li></ul><p>Cuando termines, comparte tus respuestas para poder compararlas.</p>',
    },
  },
  {
    id: 'votacion', icon: 'vote', nombre: 'Votación / decisión',
    descripcion: 'Una pregunta con varias opciones; cada quien elige una y gana la mayoría.',
    plantilla: {
      nombre: 'Decisión grupal', atributos: [],
      bienvenida: '<p>Tenemos que decidir esto entre todos.</p><p>Elige <strong>una sola</strong> opción, la que te parezca mejor. No hace falta que la justifiques: después comparamos los votos y vemos dónde hay mayoría.</p>',
      temas: [tema('decision', '¿Qué opción elegimos?', 'votacion')],
      opciones: [opc(1, 'Inversión en marketing', 'decision'), opc(2, 'Nueva funcionalidad', 'decision'), opc(3, 'Mejora técnica', 'decision'), opc(4, 'Contratación', 'decision')],
    },
  },
  {
    id: 'sino', icon: 'check-square', nombre: 'Sí / No / Abstención',
    descripcion: 'Una decisión con tres posturas: a favor, en contra o neutro.',
    plantilla: {
      nombre: 'Sí, No o Abstención', atributos: [],
      bienvenida: '<p>Ponemos la propuesta a votación.</p><p>Tres posturas posibles: <strong>Sí</strong> si estás a favor, <strong>No</strong> si estás en contra, y <strong>Abstención</strong> si prefieres no tomar posición.</p><p>Abstenerse es una respuesta válida — vale más que no responder.</p>',
      temas: [tema('propuesta', '¿Aprobamos la propuesta?', 'votacion')],
      opciones: [opc(1, 'Sí', 'propuesta'), opc(2, 'No', 'propuesta'), opc(3, 'Abstención', 'propuesta')],
    },
  },
  {
    id: 'ideas', icon: 'lightbulb', nombre: 'Lluvia de ideas',
    descripcion: 'Preguntas abiertas; cada persona escribe su propuesta y se comparan en cards grandes.',
    plantilla: {
      nombre: 'Lluvia de ideas', atributos: [],
      bienvenida: '<p>Queremos juntar ideas, todavía sin filtrar ni decidir nada.</p><p>Responde con lo que se te ocurra: no hay respuestas incorrectas y no hace falta que estén pulidas. Si una pregunta no te dice nada, puedes dejarla en blanco.</p><p>Después leemos todas las propuestas lado a lado.</p>',
      temas: [
        tema('idea-1', '¿Qué propondrías para mejorar?', 'texto_libre', { numero: 1, orden: 1 }),
        tema('idea-2', '¿Qué NO deberíamos hacer?', 'texto_libre', { numero: 2, orden: 2 }),
        tema('idea-3', '¿Qué aprendimos esta semana?', 'texto_libre', { numero: 3, orden: 3 }),
      ],
      opciones: [],
    },
  },
  {
    id: 'ranking', icon: 'trophy', nombre: 'Priorización / ranking',
    descripcion: 'Ordená un conjunto de opciones por prioridad; se agregan los órdenes de todos (Borda).',
    plantilla: {
      nombre: 'Priorización', atributos: [],
      bienvenida: '<p>Necesitamos ponernos de acuerdo en el orden, no en qué se hace.</p><p>Ordena la lista completa <strong>de mayor a menor prioridad</strong>, según lo que harías tú primero. Todo entra en el orden, incluso lo que te parezca menos urgente.</p><p>Los órdenes de todos se combinan en un ranking de consenso.</p>',
      temas: [tema('prioridad', 'Ordená por prioridad', 'ranking')],
      opciones: [
        opc(1, 'Refactor de auth', 'prioridad'), opc(2, 'Nueva landing', 'prioridad'),
        opc(3, 'Bug del checkout', 'prioridad'), opc(4, 'Tests automáticos', 'prioridad'),
        opc(5, 'Documentación', 'prioridad'), opc(6, 'Deuda técnica', 'prioridad'),
      ],
    },
  },
  {
    id: 'mixta', icon: 'puzzle', nombre: 'Reunión (mixta)',
    descripcion: 'Combina modos: una votación, un ranking y una pregunta abierta en la misma Plantilla.',
    plantilla: {
      nombre: 'Reunión de equipo', atributos: [],
      bienvenida: '<p>Para llegar a la reunión con la mitad del trabajo hecho.</p><p>Hay tres cosas para responder, cada una de un tipo distinto:</p><ul><li>Votar una <strong>fecha</strong>.</li><li>Ordenar los <strong>temas del backlog</strong> por prioridad.</li><li>Sumar cualquier tema que falte, en texto libre.</li></ul><p>Son cinco minutos y nos ahorran discutir logística en vivo.</p>',
      temas: [
        tema('fecha', '¿Qué fecha para la próxima reunión?', 'votacion', { numero: 1, orden: 1 }),
        tema('prioridades', 'Ordená los temas del backlog', 'ranking', { numero: 2, orden: 2 }),
        tema('libre', '¿Algo más para sumar?', 'texto_libre', { numero: 3, orden: 3 }),
      ],
      opciones: [
        opc(1, 'Lunes 3', 'fecha'), opc(2, 'Miércoles 5', 'fecha'), opc(3, 'Viernes 7', 'fecha'), opc(4, 'Martes 11', 'fecha'),
        opc(5, 'Refactor de auth', 'prioridades'), opc(6, 'Nueva landing', 'prioridades'),
        opc(7, 'Bug del checkout', 'prioridades'), opc(8, 'Tests automáticos', 'prioridades'),
      ],
    },
  },
  {
    id: 'retro', icon: 'refresh-ccw', nombre: 'Retrospectiva + plan de acción',
    descripcion: 'Espacio de escucha para revisar el período y definir próximos pasos, solo con preguntas abiertas.',
    plantilla: {
      nombre: 'Revisión del período', atributos: [],
      bienvenida: '<p>Este es un espacio de escucha para cerrar el período.</p><p>Responde con calma y con ejemplos concretos donde puedas: sirve más «se nos cayó el deploy dos veces» que «hubo problemas técnicos».</p><p>La idea no es buscar culpables, sino ver qué cambiamos para el próximo período. Todo lo que escribas lo vamos a leer entre todos.</p>',
      temas: [
        tema('periodo-ideas', '¿Qué ideas, metas o proyectos proponen para el próximo período?', 'texto_libre', { numero: 1, orden: 1 }),
        tema('periodo-pendiente', '¿Qué se había planificado en la última reunión pero quedó sin hacer?', 'texto_libre', { numero: 2, orden: 2 }),
        tema('periodo-mejora', '¿Qué no funcionó como esperaban o se podría mejorar?', 'texto_libre', { numero: 3, orden: 3 }),
        tema('periodo-logros', '¿Qué logros concretos tuvimos en estos últimos 3 meses?', 'texto_libre', { numero: 4, orden: 4 }),
      ],
      opciones: [],
    },
  },
];

export { PRESETS };
