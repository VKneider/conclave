const SEED_CATEGORIAS = [
  { id: 'coordinacion-principal', nombre: 'Coordinación Principal', modo: 'seleccion', orden: 1, capacidad: 1, min: null, max: null, participable: false, meta: { numero: 1, lider: 'Mateo Rivas' } },
  { id: 'coordinacion-apoyo', nombre: 'Coordinación de Apoyo', modo: 'seleccion', orden: 2, capacidad: 1, min: null, max: null, participable: false, meta: { numero: 2, lider: 'Elena Duarte' } },
  { id: 'transporte', nombre: 'Transporte', modo: 'seleccion', orden: 3, capacidad: 6, min: 4, max: 6, participable: true, meta: { numero: 3, lider: null } },
  { id: 'banda-en-vivo', nombre: 'Banda en Vivo', modo: 'seleccion', orden: 4, capacidad: 10, min: 6, max: 10, participable: true, meta: { numero: 4, lider: null } },
  { id: 'bienvenida', nombre: 'Bienvenida', modo: 'seleccion', orden: 5, capacidad: 12, min: 8, max: 12, participable: true, meta: { numero: 5, lider: null } },
  { id: 'cafeteria', nombre: 'Cafetería', modo: 'seleccion', orden: 6, capacidad: 6, min: 4, max: 6, participable: true, meta: { numero: 6, lider: null } },
  { id: 'anfitriones', nombre: 'Anfitriones', modo: 'seleccion', orden: 7, capacidad: 2, min: 2, max: 2, participable: true, meta: { numero: 12, lider: null } },
];

const SEED_OPCIONES = [
  { id: 1, nombre: 'Mateo Rivas', meta: { sexo: 'M', edad: 23, fijo: true, rolFijo: 'Coordinación Principal' } },
  { id: 2, nombre: 'Elena Duarte', meta: { sexo: 'F', edad: 22, fijo: true, rolFijo: 'Coordinación de Apoyo' } },
  { id: 3, nombre: 'Andrés Bracamonte', meta: { sexo: 'M', edad: null, fijo: false, rolFijo: null } },
  { id: 4, nombre: 'Elena Rivas', meta: { sexo: 'F', edad: null, fijo: false, rolFijo: null } },
  { id: 5, nombre: 'Diego Peralta', meta: { sexo: 'M', edad: null, fijo: false, rolFijo: null } },
  { id: 6, nombre: 'Valentina Vidal', meta: { sexo: 'F', edad: null, fijo: false, rolFijo: null } },
  { id: 7, nombre: 'Nicolás Ibáñez', meta: { sexo: 'M', edad: null, fijo: false, rolFijo: null } },
  { id: 8, nombre: 'Camila Bracamonte', meta: { sexo: 'F', edad: null, fijo: false, rolFijo: null } },
  { id: 9, nombre: 'Emilio Salcedo', meta: { sexo: 'M', edad: null, fijo: false, rolFijo: null } },
  { id: 10, nombre: 'Sofía Peralta', meta: { sexo: 'F', edad: null, fijo: false, rolFijo: null } },
  { id: 11, nombre: 'Joaquín Rosales', meta: { sexo: 'M', edad: null, fijo: false, rolFijo: null } },
  { id: 12, nombre: 'Isabella Ferrer', meta: { sexo: 'F', edad: null, fijo: false, rolFijo: null } },
  { id: 13, nombre: 'Tomás Medina', meta: { sexo: 'M', edad: null, fijo: false, rolFijo: null } },
  { id: 14, nombre: 'Lucía Ávalos', meta: { sexo: 'F', edad: null, fijo: false, rolFijo: null } },
  { id: 15, nombre: 'Santiago Rivas', meta: { sexo: 'M', edad: null, fijo: false, rolFijo: null } },
];

export { SEED_CATEGORIAS, SEED_OPCIONES };
