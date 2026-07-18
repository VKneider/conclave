import { test, expect } from '../../../../playwright/harness/sliceFixtures.js';

const RANKING_PLANTILLA = {
   nombre: 'Ranking Test',
   atributos: [],
   temas: [
      { id: 'prioridades', nombre: 'Ordená los temas del backlog', modo: 'ranking', orden: 1, min: null, max: null, participable: false, meta: {} },
   ],
   opciones: [
      { id: 10, nombre: 'Refactor de auth', temaId: 'prioridades', meta: {} },
      { id: 20, nombre: 'Nueva landing', temaId: 'prioridades', meta: {} },
      { id: 30, nombre: 'Bug del checkout', temaId: 'prioridades', meta: {} },
      { id: 40, nombre: 'Tests automáticos', temaId: 'prioridades', meta: {} },
   ],
};

test.describe('5. Llenar Respuestas — Ranking', () => {

   test.describe('5.1 Ordenar ranking', () => {

      async function setupRanking(app) {
         await app.page.evaluate(() => {
            Object.keys(localStorage)
               .filter((k) => k.startsWith('conclave-'))
               .forEach((k) => localStorage.removeItem(k));
         });
         await app.page.evaluate((data) => {
            localStorage.setItem('conclave-plantilla-v1', JSON.stringify({
               nombre: data.nombre,
               atributos: data.atributos,
               temas: data.temas,
               opciones: data.opciones,
            }));
            localStorage.setItem('conclave-respuestas-v1', JSON.stringify({ seleccion: {}, texto: {}, voto: {}, ranking: {} }));
         }, RANKING_PLANTILLA);
         await app.page.reload();
         await app.page.waitForFunction(() => !!(window.slice && typeof window.slice.build === 'function'));
         await app.page.waitForTimeout(500);
         await app.navigateTo('/mis-respuestas');
         await expect(app.page.locator('.rk-list')).toBeVisible({ timeout: 5000 });
      }

      test('5.1.1: mueve opción arriba en ranking', async ({ app }) => {
         await setupRanking(app);

         const items = app.page.locator('.rk-item');
         await expect(items).toHaveCount(4);

         // Click ▲ on second item (Nueva landing, opcionId=20) to move it up
         await app.page.locator('.rk-move[data-rank-move="up"][data-opcion-id="20"]').click();
         await app.page.waitForTimeout(200);

         // Now Nueva landing should be first
         await expect(items.nth(0).locator('.rk-name')).toHaveText('Nueva landing');
         await expect(items.nth(1).locator('.rk-name')).toHaveText('Refactor de auth');

         const respuestas = await app.getContext('respuestas');
         expect(respuestas.ranking.prioridades).toEqual(['20', '10', '30', '40']);
         expect(app.pageErrors).toEqual([]);
      });

      test('5.1.2: mueve opción abajo en ranking', async ({ app }) => {
         await setupRanking(app);

         const items = app.page.locator('.rk-item');
         await expect(items).toHaveCount(4);

         // Click ▼ on first item (Refactor de auth, opcionId=10) to move it down
         await app.page.locator('.rk-move[data-rank-move="down"][data-opcion-id="10"]').click();
         await app.page.waitForTimeout(200);

         await expect(items.nth(0).locator('.rk-name')).toHaveText('Nueva landing');
         await expect(items.nth(1).locator('.rk-name')).toHaveText('Refactor de auth');

         const respuestas = await app.getContext('respuestas');
         expect(respuestas.ranking.prioridades).toEqual(['20', '10', '30', '40']);
         expect(app.pageErrors).toEqual([]);
      });

      test('5.1.3: ordena completamente un ranking', async ({ app }) => {
         await setupRanking(app);

         // Move Tests automáticos (40) all the way to the top (3 ▲ clicks)
         for (let i = 0; i < 3; i++) {
            await app.page.locator('.rk-move[data-rank-move="up"][data-opcion-id="40"]').click();
            await app.page.waitForTimeout(100);
         }

         // Move Bug del checkout (30) up 2 positions
         for (let i = 0; i < 2; i++) {
            await app.page.locator('.rk-move[data-rank-move="up"][data-opcion-id="30"]').click();
            await app.page.waitForTimeout(100);
         }

         // Move Nueva landing (20) up 1 position
         await app.page.locator('.rk-move[data-rank-move="up"][data-opcion-id="20"]').click();
         await app.page.waitForTimeout(100);

         // Verify DOM order: 40, 30, 20, 10
         const items = app.page.locator('.rk-item');
         await expect(items.nth(0).locator('.rk-name')).toHaveText('Tests automáticos');
         await expect(items.nth(1).locator('.rk-name')).toHaveText('Bug del checkout');
         await expect(items.nth(2).locator('.rk-name')).toHaveText('Nueva landing');
         await expect(items.nth(3).locator('.rk-name')).toHaveText('Refactor de auth');

         await expect(app.page.locator('.rk-card__status')).toHaveText('✓ Ordenada');

         const respuestas = await app.getContext('respuestas');
         expect(respuestas.ranking.prioridades).toEqual(['40', '30', '20', '10']);
         expect(app.pageErrors).toEqual([]);
      });

      test('5.1.4: reordena después de completado', async ({ app }) => {
         await setupRanking(app);

         // Move Nueva landing (20) up once → establishes a ranking
         await app.page.locator('.rk-move[data-rank-move="up"][data-opcion-id="20"]').click();
         await app.page.waitForTimeout(200);
         await expect(app.page.locator('.rk-card__status')).toHaveText('✓ Ordenada');

         // Move Bug del checkout (30) up once → reorders again
         await app.page.locator('.rk-move[data-rank-move="up"][data-opcion-id="30"]').click();
         await app.page.waitForTimeout(200);

         await expect(app.page.locator('.rk-card__status')).toHaveText('✓ Ordenada');

         const respuestas = await app.getContext('respuestas');
         expect(respuestas.ranking.prioridades).toEqual(['20', '30', '10', '40']);
         expect(app.pageErrors).toEqual([]);
      });
   });
});
