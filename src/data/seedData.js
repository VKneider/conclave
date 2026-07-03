const SEED_TEMAS = [
  { id: 'coordinacion-principal', nombre: 'Coordinación Principal', modo: 'reparto', orden: 1, capacidad: 1, min: null, max: null, participable: false, meta: { numero: 1, lider: 'Mateo Rivas' } },
  { id: 'coordinacion-apoyo', nombre: 'Coordinación de Apoyo', modo: 'reparto', orden: 2, capacidad: 1, min: null, max: null, participable: false, meta: { numero: 2, lider: 'Elena Duarte' } },
  { id: 'transporte', nombre: 'Transporte', modo: 'reparto', orden: 3, capacidad: 6, min: 4, max: 6, participable: true, meta: { numero: 3, lider: null } },
  { id: 'banda-en-vivo', nombre: 'Banda en Vivo', modo: 'reparto', orden: 4, capacidad: 10, min: 6, max: 10, participable: true, meta: { numero: 4, lider: null } },
  { id: 'bienvenida', nombre: 'Bienvenida', modo: 'reparto', orden: 5, capacidad: 12, min: 8, max: 12, participable: true, meta: { numero: 5, lider: null } },
  { id: 'cafeteria', nombre: 'Cafetería', modo: 'reparto', orden: 6, capacidad: 6, min: 4, max: 6, participable: true, meta: { numero: 6, lider: null } },
  { id: 'anfitriones', nombre: 'Anfitriones', modo: 'reparto', orden: 7, capacidad: 2, min: 2, max: 2, participable: true, meta: { numero: 12, lider: null } },
];

const SEED_OPCIONES = [
  { id: 1, temaId: null, nombre: 'Mateo Rivas', meta: { sexo: 'M', edad: 23, fijo: true, rolFijo: 'Coordinación Principal' } },
  { id: 2, temaId: null, nombre: 'Elena Duarte', meta: { sexo: 'F', edad: 22, fijo: true, rolFijo: 'Coordinación de Apoyo' } },
  { id: 3, temaId: null, nombre: 'Andrés Bracamonte', meta: { sexo: 'M', edad: null, fijo: false, rolFijo: null } },
  { id: 4, temaId: null, nombre: 'Elena Rivas', meta: { sexo: 'F', edad: null, fijo: false, rolFijo: null } },
  { id: 5, temaId: null, nombre: 'Diego Peralta', meta: { sexo: 'M', edad: null, fijo: false, rolFijo: null } },
  { id: 6, temaId: null, nombre: 'Valentina Vidal', meta: { sexo: 'F', edad: null, fijo: false, rolFijo: null } },
  { id: 7, temaId: null, nombre: 'Nicolás Ibáñez', meta: { sexo: 'M', edad: null, fijo: false, rolFijo: null } },
  { id: 8, temaId: null, nombre: 'Camila Bracamonte', meta: { sexo: 'F', edad: null, fijo: false, rolFijo: null } },
  { id: 9, temaId: null, nombre: 'Emilio Salcedo', meta: { sexo: 'M', edad: null, fijo: false, rolFijo: null } },
  { id: 10, temaId: null, nombre: 'Sofía Peralta', meta: { sexo: 'F', edad: null, fijo: false, rolFijo: null } },
  { id: 11, temaId: null, nombre: 'Joaquín Rosales', meta: { sexo: 'M', edad: null, fijo: false, rolFijo: null } },
  { id: 12, temaId: null, nombre: 'Isabella Ferrer', meta: { sexo: 'F', edad: null, fijo: false, rolFijo: null } },
  { id: 13, temaId: null, nombre: 'Tomás Medina', meta: { sexo: 'M', edad: null, fijo: false, rolFijo: null } },
  { id: 14, temaId: null, nombre: 'Lucía Ávalos', meta: { sexo: 'F', edad: null, fijo: false, rolFijo: null } },
  { id: 15, temaId: null, nombre: 'Santiago Rivas', meta: { sexo: 'M', edad: null, fijo: false, rolFijo: null } },
];

// Custom Opción attributes for the seed ("Asignación") Plantilla. sexo/edad
// are no longer hardcoded fields — they're just the default example atributos
// (Fase 3). A leader can rename/remove them or add their own per Plantilla.
const DEFAULT_ATRIBUTOS = [
  { key: 'sexo', label: 'Sexo', type: 'lista', opciones: ['M', 'F'] },
  { key: 'edad', label: 'Edad', type: 'numero' },
];

export { SEED_TEMAS, SEED_OPCIONES, DEFAULT_ATRIBUTOS };
