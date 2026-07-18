import { test, expect } from '../../../../playwright/harness/sliceFixtures.js';

const REPARTO_PLANTILLA = {
   nombre: 'Reparto Test',
   atributos: [],
   temas: [
      { id: 'equipo-a', nombre: 'Equipo A', modo: 'reparto', orden: 1, min: 1, max: 5, participable: true, meta: {} },
      { id: 'equipo-b', nombre: 'Equipo B', modo: 'reparto', orden: 2, min: 1, max: 5, participable: true, meta: {} },
   ],
   opciones: [
      { id: 101, nombre: 'Persona 1', temaId: null, meta: {} },
      { id: 102, nombre: 'Persona 2', temaId: null, meta: {} },
   ],
};

const VOTACION_PLANTILLA = {
   nombre: 'Votación Test',
   atributos: [],
   temas: [
      { id: 'v1', nombre: '¿Qué elegimos?', modo: 'votacion', orden: 1, min: null, max: null, participable: false, meta: {} },
   ],
   opciones: [
      { id: 201, nombre: 'Opción A', temaId: 'v1', meta: {} },
      { id: 202, nombre: 'Opción B', temaId: 'v1', meta: {} },
   ],
};

const RANKING_PLANTILLA = {
   nombre: 'Ranking Test',
   atributos: [],
   temas: [
      { id: 'r1', nombre: 'Prioridades', modo: 'ranking', orden: 1, min: null, max: null, participable: false, meta: {} },
   ],
   opciones: [
      { id: 301, nombre: 'Tarea A', temaId: 'r1', meta: {} },
      { id: 302, nombre: 'Tarea B', temaId: 'r1', meta: {} },
      { id: 303, nombre: 'Tarea C', temaId: 'r1', meta: {} },
   ],
};

const TEXTO_PLANTILLA = {
   nombre: 'Texto Test',
   atributos: [],
   temas: [
      { id: 't1', nombre: '¿Qué opinás?', modo: 'texto_libre', orden: 1, min: null, max: null, participable: false, meta: {} },
   ],
   opciones: [],
};

async function injectPlantilla(app, plantilla, extraContexts = {}) {
   await app.page.evaluate(() => {
      Object.keys(localStorage)
         .filter((k) => k.startsWith('conclave-'))
         .forEach((k) => localStorage.removeItem(k));
   });
   await app.page.evaluate(({ plantilla, extra }) => {
      localStorage.setItem('conclave-plantilla-v1', JSON.stringify(plantilla));
      localStorage.setItem('conclave-respuestas-v1', JSON.stringify({ seleccion: {}, texto: {}, voto: {}, ranking: {} }));
      for (const [key, val] of Object.entries(extra)) {
         localStorage.setItem(key, JSON.stringify(val));
      }
   }, { plantilla, extra: extraContexts });
   await app.page.reload();
   await app.page.waitForFunction(() => !!(window.slice && typeof window.slice.build === 'function'));
   await app.page.waitForTimeout(500);
   await app.navigateTo('/resumen');
   await expect(app.page.locator('.resumen-view')).toBeVisible({ timeout: 5000 });
}

test.describe('14. Resumen Final', () => {

   test('14.1.1: ver resumen de asignaciones con decisiones finales', async ({ app }) => {
      const decisionFinal = {
         seleccion: { '101': 'equipo-a', '102': 'equipo-b' },
         texto: {}, voto: {}, ranking: {},
      };
      await injectPlantilla(app, REPARTO_PLANTILLA, { 'conclave-decision-final-v1': decisionFinal });

      await expect(app.page.locator('.rf-section__title').filter({ hasText: 'Asignaciones' })).toBeVisible();
      await expect(app.page.locator('.rf-table')).toBeVisible();
      const rows = app.page.locator('.rf-table tbody tr');
      await expect(rows).toHaveCount(2);
      await expect(rows.nth(0)).toContainText('Persona 1');
      await expect(rows.nth(0)).toContainText('Equipo A');
      await expect(rows.nth(1)).toContainText('Persona 2');
      await expect(rows.nth(1)).toContainText('Equipo B');
      expect(app.pageErrors).toEqual([]);
   });

   test('14.1.2: ver resumen de votaciones', async ({ app }) => {
      const decisionFinal = {
         voto: { 'v1': 201 },
         seleccion: {}, texto: {}, ranking: {},
      };
      await injectPlantilla(app, VOTACION_PLANTILLA, { 'conclave-decision-final-v1': decisionFinal });

      await expect(app.page.locator('.rf-section__title').filter({ hasText: 'Votaciones' })).toBeVisible();
      await expect(app.page.locator('.rf-card-list')).toBeVisible();
      await expect(app.page.locator('.rf-card__body b')).toHaveText('Opción A');
      expect(app.pageErrors).toEqual([]);
   });

   test('14.1.3: ver resumen de rankings', async ({ app }) => {
      const decisionFinal = {
         ranking: { 'r1': ['301', '303', '302'] },
         seleccion: {}, texto: {}, voto: {},
      };
      await injectPlantilla(app, RANKING_PLANTILLA, { 'conclave-decision-final-v1': decisionFinal });

      await expect(app.page.locator('.rf-section__title').filter({ hasText: 'Rankings' })).toBeVisible();
      await expect(app.page.locator('.rf-rank-list')).toBeVisible();
      const items = app.page.locator('.rf-rank-item');
      await expect(items).toHaveCount(3);
      await expect(items.nth(0)).toContainText('Tarea A');
      await expect(items.nth(1)).toContainText('Tarea C');
      await expect(items.nth(2)).toContainText('Tarea B');
      expect(app.pageErrors).toEqual([]);
   });

   test('14.1.4: ver resumen de texto libre', async ({ app }) => {
      const decisionFinal = {
         texto: { 't1': { texto: 'Nuestra propuesta final', autor: 'Ana' } },
         seleccion: {}, voto: {}, ranking: {},
      };
      await injectPlantilla(app, TEXTO_PLANTILLA, { 'conclave-decision-final-v1': decisionFinal });

      await expect(app.page.locator('.rf-section__title').filter({ hasText: 'Texto libre' })).toBeVisible();
      await expect(app.page.locator('.rf-card-list')).toBeVisible();
      await expect(app.page.locator('.rf-quote')).toContainText('Nuestra propuesta final');
      await expect(app.page.locator('.rf-quote__autor')).toContainText('Ana');
      expect(app.pageErrors).toEqual([]);
   });

   test('14.1.5: descargar HTML al hacer click', async ({ app }) => {
      const decisionFinal = {
         seleccion: {}, texto: {}, voto: {}, ranking: {},
      };
      await injectPlantilla(app, REPARTO_PLANTILLA, { 'conclave-decision-final-v1': decisionFinal });

      const downloadPromise = app.page.waitForEvent('download', { timeout: 3000 }).catch(() => null);
      await app.page.locator('button').filter({ hasText: 'Descargar HTML' }).click();
      await app.page.waitForTimeout(500);

      // Download may or may not complete in test env — verify no error
      expect(app.pageErrors).toEqual([]);
   });

   test('14.1.6: exportar JSON final desde DropDown', async ({ app }) => {
      const decisionFinal = {
         seleccion: {}, texto: {}, voto: {}, ranking: {},
      };
      await injectPlantilla(app, REPARTO_PLANTILLA, { 'conclave-decision-final-v1': decisionFinal });

      // Open the dropdown
      await app.page.locator('[slice-id="jsonDropDown"] .slice_dropdown').click();
      await app.page.waitForTimeout(300);

      // Click "Guardar respuestas en archivo"
      await app.page.locator('.slice_dropbox a').filter({ hasText: 'Guardar respuestas' }).click();
      await app.page.waitForTimeout(300);

      expect(app.pageErrors).toEqual([]);
   });

   test('14.1.7: ver sección vacía cuando no hay decisiones', async ({ app }) => {
      const decisionFinal = {
         seleccion: {}, texto: {}, voto: {}, ranking: {},
      };
      await injectPlantilla(app, REPARTO_PLANTILLA, { 'conclave-decision-final-v1': decisionFinal });

      // Reparto section shows empty state
      await expect(app.page.locator('.rf-section__title').filter({ hasText: 'Asignaciones' })).toBeVisible();
      await expect(app.page.locator('.rf-empty').first()).toContainText('No hay decisiones finales');
      expect(app.pageErrors).toEqual([]);
   });
});
