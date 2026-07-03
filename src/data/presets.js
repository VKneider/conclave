import { SEED_TEMAS, SEED_OPCIONES, DEFAULT_ATRIBUTOS } from './seedData.js';

// Starter Plantillas shown in PlantillaBuilderView's gallery. Each `plantilla`
// is a full { nombre, atributos, temas, opciones } payload — loaded via
// PlantillaService.prepareImport() + loadFromData() (same path as importing a
// shared Plantilla, so ids are validated). Tema/Opción ids are safe slugs /
// numbers (see PlantillaService.isSafeId).
const tema = (id, nombre, modo, { orden = 1, numero = 1 } = {}) => ({
  id, nombre, modo, orden, capacidad: null, min: null, max: null,
  participable: modo === 'reparto', meta: { lider: null, numero },
});
const opc = (id, nombre, temaId = null) => ({ id, nombre, temaId, meta: { fijo: false, rolFijo: null } });

const PRESETS = [
  {
    id: 'asignacion', icon: '🎯', nombre: 'Asignación de equipos',
    descripcion: 'Repartí un grupo de personas entre equipos con cupos mín/máx. El caso clásico, con atributos de ejemplo (sexo, edad).',
    plantilla: { nombre: 'Asignación de equipos', atributos: DEFAULT_ATRIBUTOS, temas: SEED_TEMAS, opciones: SEED_OPCIONES },
  },
  {
    id: 'votacion', icon: '🗳️', nombre: 'Votación / decisión',
    descripcion: 'Una pregunta con varias opciones; cada quien elige una y gana la mayoría.',
    plantilla: {
      nombre: 'Decisión grupal', atributos: [],
      temas: [tema('decision', '¿Qué opción elegimos?', 'votacion')],
      opciones: [opc(1, 'Opción A', 'decision'), opc(2, 'Opción B', 'decision'), opc(3, 'Opción C', 'decision')],
    },
  },
  {
    id: 'sino', icon: '✅', nombre: 'Sí / No',
    descripcion: 'Una decisión binaria: aprobamos o no. La votación más simple.',
    plantilla: {
      nombre: 'Sí o No', atributos: [],
      temas: [tema('propuesta', '¿Aprobamos la propuesta?', 'votacion')],
      opciones: [opc(1, 'Sí', 'propuesta'), opc(2, 'No', 'propuesta')],
    },
  },
  {
    id: 'ideas', icon: '💡', nombre: 'Lluvia de ideas',
    descripcion: 'Preguntas abiertas; cada persona escribe su propuesta y se comparan en cards grandes.',
    plantilla: {
      nombre: 'Lluvia de ideas', atributos: [],
      temas: [
        tema('idea-1', '¿Qué propondrías para mejorar?', 'texto_libre', { numero: 1, orden: 1 }),
        tema('idea-2', '¿Qué NO deberíamos hacer?', 'texto_libre', { numero: 2, orden: 2 }),
      ],
      opciones: [],
    },
  },
  {
    id: 'ranking', icon: '🏆', nombre: 'Priorización / ranking',
    descripcion: 'Ordená un conjunto de opciones por prioridad; se agregan los órdenes de todos (Borda).',
    plantilla: {
      nombre: 'Priorización', atributos: [],
      temas: [tema('prioridad', 'Ordená por prioridad', 'ranking')],
      opciones: [opc(1, 'Iniciativa A', 'prioridad'), opc(2, 'Iniciativa B', 'prioridad'), opc(3, 'Iniciativa C', 'prioridad'), opc(4, 'Iniciativa D', 'prioridad')],
    },
  },
  {
    id: 'mixta', icon: '🧩', nombre: 'Reunión (mixta)',
    descripcion: 'Combina modos: una votación, un ranking y una pregunta abierta en la misma Plantilla.',
    plantilla: {
      nombre: 'Reunión de equipo', atributos: [],
      temas: [
        tema('fecha', '¿Qué fecha para la próxima reunión?', 'votacion', { numero: 1, orden: 1 }),
        tema('prioridades', 'Ordená los temas del backlog', 'ranking', { numero: 2, orden: 2 }),
        tema('libre', '¿Algo más para sumar?', 'texto_libre', { numero: 3, orden: 3 }),
      ],
      opciones: [
        opc(1, 'Lunes 3', 'fecha'), opc(2, 'Miércoles 5', 'fecha'), opc(3, 'Viernes 7', 'fecha'),
        opc(4, 'Refactor de auth', 'prioridades'), opc(5, 'Nueva landing', 'prioridades'), opc(6, 'Bug del checkout', 'prioridades'),
      ],
    },
  },
];

export { PRESETS };
