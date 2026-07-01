const SEED_TEAMS = [
  { id: 'coordinacion-principal', numero: 1, nombre: 'Coordinación Principal', lider: 'Mateo Rivas', capacidad: 1, min: null, max: null, asignable: false },
  { id: 'coordinacion-apoyo', numero: 2, nombre: 'Coordinación de Apoyo', lider: 'Elena Duarte', capacidad: 1, min: null, max: null, asignable: false },
  { id: 'transporte', numero: 3, nombre: 'Transporte', lider: null, capacidad: 6, min: 4, max: 6, asignable: true },
  { id: 'banda-en-vivo', numero: 4, nombre: 'Banda en Vivo', lider: null, capacidad: 10, min: 6, max: 10, asignable: true },
  { id: 'bienvenida', numero: 5, nombre: 'Bienvenida', lider: null, capacidad: 12, min: 8, max: 12, asignable: true },
  { id: 'cafeteria', numero: 6, nombre: 'Cafetería', lider: null, capacidad: 6, min: 4, max: 6, asignable: true },
  { id: 'anfitriones', numero: 12, nombre: 'Anfitriones', lider: null, capacidad: 2, min: 2, max: 2, asignable: true },
];

const SEED_MEMBERS = [
  { id: 1, nombre: 'Mateo Rivas', sexo: 'M', edad: 23, fijo: true, rolFijo: 'Coordinación Principal' },
  { id: 2, nombre: 'Elena Duarte', sexo: 'F', edad: 22, fijo: true, rolFijo: 'Coordinación de Apoyo' },
  { id: 3, nombre: 'Andrés Bracamonte', sexo: 'M', edad: null, fijo: false, rolFijo: null },
  { id: 4, nombre: 'Elena Rivas', sexo: 'F', edad: null, fijo: false, rolFijo: null },
  { id: 5, nombre: 'Diego Peralta', sexo: 'M', edad: null, fijo: false, rolFijo: null },
  { id: 6, nombre: 'Valentina Vidal', sexo: 'F', edad: null, fijo: false, rolFijo: null },
  { id: 7, nombre: 'Nicolás Ibáñez', sexo: 'M', edad: null, fijo: false, rolFijo: null },
  { id: 8, nombre: 'Camila Bracamonte', sexo: 'F', edad: null, fijo: false, rolFijo: null },
  { id: 9, nombre: 'Emilio Salcedo', sexo: 'M', edad: null, fijo: false, rolFijo: null },
  { id: 10, nombre: 'Sofía Peralta', sexo: 'F', edad: null, fijo: false, rolFijo: null },
  { id: 11, nombre: 'Joaquín Rosales', sexo: 'M', edad: null, fijo: false, rolFijo: null },
  { id: 12, nombre: 'Isabella Ferrer', sexo: 'F', edad: null, fijo: false, rolFijo: null },
  { id: 13, nombre: 'Tomás Medina', sexo: 'M', edad: null, fijo: false, rolFijo: null },
  { id: 14, nombre: 'Lucía Ávalos', sexo: 'F', edad: null, fijo: false, rolFijo: null },
  { id: 15, nombre: 'Santiago Rivas', sexo: 'M', edad: null, fijo: false, rolFijo: null },
];

export { SEED_TEAMS, SEED_MEMBERS };
