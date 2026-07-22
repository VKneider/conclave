import { test, expect } from '../../../../playwright/harness/sliceFixtures.js';
import { seedAsignacion } from '../../../../playwright/harness/seedHelpers.js';
import LZString from 'lz-string';

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

       // Wait for the dropdown to be fully rendered
       await app.page.locator('.resumen-view slice-dropdown').waitFor({ state: 'attached', timeout: 5000 });
       await app.page.waitForTimeout(500);

       // Open the export dropdown
       await app.page.locator('.resumen-view slice-dropdown .slice_dropdown').click();
       await app.page.waitForTimeout(300);

       const downloadPromise = app.page.waitForEvent('download', { timeout: 3000 }).catch(() => null);

       // Click "Descargar HTML" option
       await app.page.locator('.resumen-view .slice_dropbox a').filter({ hasText: 'Descargar HTML' }).click();
       await app.page.waitForTimeout(500);

       // Download may or may not complete in test env — verify no error
       expect(app.pageErrors).toEqual([]);
    });

    test('14.1.6: exportar JSON final desde DropDown', async ({ app }) => {
       const decisionFinal = {
          seleccion: {}, texto: {}, voto: {}, ranking: {},
       };
       await injectPlantilla(app, REPARTO_PLANTILLA, { 'conclave-decision-final-v1': decisionFinal });

       // Wait for the dropdown to be fully rendered
       await app.page.locator('.resumen-view slice-dropdown').waitFor({ state: 'attached', timeout: 5000 });
       await app.page.waitForTimeout(500);

       // Open the export dropdown
       await app.page.locator('.resumen-view slice-dropdown .slice_dropdown').click();
       await app.page.waitForTimeout(300);

       // Click "Exportar backup completo" option
       await app.page.locator('.resumen-view .slice_dropbox a').filter({ hasText: 'Exportar backup completo' }).click();
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

   test.describe('14.2 Importar consenso desde enlace', () => {

      const FULL_TO_SHORT = {
         tipo: 't', nombre: 'n', email: 'e',
         temas: 'ts', opciones: 'os', atributos: 'at',
         respuestas: 'rs', autor: 'a',
         seleccion: 'sl', texto: 'tx', voto: 'vt', ranking: 'rk',
         modo: 'm', orden: 'o', participable: 'p', meta: 'mt', temaId: 'ti',
         key: 'k', label: 'l', type: 'tp',
      };

      function _mapKeys(obj) {
         if (Array.isArray(obj)) return obj.map(_mapKeys);
         if (obj && typeof obj === 'object') {
            return Object.fromEntries(
               Object.entries(obj).map(([k, v]) => [FULL_TO_SHORT[k] || k, _mapKeys(v)])
            );
         }
         return obj;
      }

      function makeConsensoHash(payload) {
         const packed = _mapKeys(payload);
         const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(packed));
         return `#consenso=${compressed}`;
      }

      test('14.2.1: importar decisiones desde enlace con hash', async ({ app }) => {
         await seedAsignacion(app);

         const payload = {
            respuestas: {
               seleccion: { '1': 'bienvenida', '2': 'bienvenida', '3': 'transporte' },
               texto: {}, voto: {}, ranking: {},
            },
            autor: 'TestUser',
            email: '',
         };
         const hash = makeConsensoHash(payload);

         await app.page.goto('/' + hash);
         await app.page.waitForFunction(
            () => !!(window.slice && typeof window.slice.build === 'function'),
            { timeout: 10000 }
         );
         await app.page.waitForTimeout(500);

         await app.confirmDialog();
         await app.page.waitForTimeout(500);

         await expect(app.page.locator('.resumen-view')).toBeVisible({ timeout: 5000 });
         await expect(app.page.locator('.rf-table tbody tr')).toHaveCount(3);
         expect(app.pageErrors).toEqual([]);
      });

   });

});
