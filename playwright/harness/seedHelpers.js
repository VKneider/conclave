// Test helper: inject a custom Plantilla (plus empty respuestas) into
// localStorage, then reload the page. Use this in place of app.resetState()
// when a test needs a specific seed (e.g. the old "Asignación" seed with
// reparto temas + pool opciones) regardless of the app's default preset.

import { expect, waitForSliceReady } from './sliceFixtures.js';

const ASIGNACION_ATRIBUTOS = [
  { key: 'sexo', label: 'Sexo', type: 'lista', opciones: ['M', 'F'] },
  { key: 'edad', label: 'Edad', type: 'numero' },
];

const ASIGNACION_TEMAS = [
  { id: 'coordinacion-principal', nombre: 'Coordinación Principal', modo: 'reparto', orden: 1, min: null, max: null, participable: false, meta: { numero: 1, lider: 'Mateo Rivas' } },
  { id: 'coordinacion-apoyo', nombre: 'Coordinación de Apoyo', modo: 'reparto', orden: 2, min: null, max: null, participable: false, meta: { numero: 2, lider: 'Elena Duarte' } },
  { id: 'transporte', nombre: 'Transporte', modo: 'reparto', orden: 3, min: 4, max: 6, participable: true, meta: { numero: 3, lider: null } },
  { id: 'banda-en-vivo', nombre: 'Banda en Vivo', modo: 'reparto', orden: 4, min: 6, max: 10, participable: true, meta: { numero: 4, lider: null } },
  { id: 'bienvenida', nombre: 'Bienvenida', modo: 'reparto', orden: 5, min: 8, max: 12, participable: true, meta: { numero: 5, lider: null } },
  { id: 'cafeteria', nombre: 'Cafetería', modo: 'reparto', orden: 6, min: 4, max: 6, participable: true, meta: { numero: 6, lider: null } },
  { id: 'anfitriones', nombre: 'Anfitriones', modo: 'reparto', orden: 7, min: 2, max: 2, participable: true, meta: { numero: 12, lider: null } },
  { id: 'objetivos-generales', nombre: 'Objetivos generales del evento', modo: 'texto_libre', orden: 8, min: null, max: null, participable: true, meta: { numero: 13, lider: null } },
  { id: 'notas-adicionales', nombre: 'Notas adicionales', modo: 'texto_libre', orden: 9, min: null, max: null, participable: true, meta: { numero: 14, lider: null } },
];

const ASIGNACION_OPCIONES = [
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

export const SEED_ASIGNACION = {
  nombre: 'Mi Plantilla',
  atributos: ASIGNACION_ATRIBUTOS,
  temas: ASIGNACION_TEMAS,
  opciones: ASIGNACION_OPCIONES,
};

/**
 * Wipe localStorage, inject a Plantilla + empty respuestas, reload the app.
 * After calling this, navigate to the desired route with app.navigateTo().
 */
export async function injectPlantilla(app, plantilla, extraStorage = {}) {
  await app.page.evaluate(() => {
    Object.keys(localStorage)
      .filter((k) => k.startsWith('conclave-'))
      .forEach((k) => localStorage.removeItem(k));
  });
  await app.page.evaluate(({ pl, extra }) => {
    localStorage.setItem('conclave-plantilla-v1', JSON.stringify(pl));
    localStorage.setItem('conclave-respuestas-v1', JSON.stringify({ seleccion: {}, texto: {}, voto: {}, ranking: {} }));
    for (const [key, val] of Object.entries(extra)) {
      localStorage.setItem(key, JSON.stringify(val));
    }
  }, { pl: plantilla, extra: extraStorage });
  await app.page.reload();
  await waitForSliceReady(app.page);
  await app.page.waitForTimeout(200);
}

/**
 * Convenience: inject the old "Asignación de equipos" seed (7 reparto + 2
 * texto temas, 15 pool opciones, sexo+edad atributos), then reload.
 */
export async function seedAsignacion(app) {
  await injectPlantilla(app, SEED_ASIGNACION);
}
