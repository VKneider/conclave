import { test, expect } from '../../../../playwright/harness/sliceFixtures.js';

const VOTACION_PLANTILLA = {
   nombre: 'Votación Test',
   atributos: [],
   temas: [
      { id: 'decision', nombre: '¿Qué opción elegimos?', modo: 'votacion', orden: 1, min: null, max: null, participable: false, meta: {} },
      { id: 'propuesta', nombre: '¿Aprobamos la propuesta?', modo: 'votacion', orden: 2, min: null, max: null, participable: false, meta: {} },
   ],
   opciones: [
      { id: 101, nombre: 'Opción A', temaId: 'decision', meta: {} },
      { id: 102, nombre: 'Opción B', temaId: 'decision', meta: {} },
      { id: 103, nombre: 'Opción C', temaId: 'decision', meta: {} },
      { id: 201, nombre: 'Sí', temaId: 'propuesta', meta: {} },
      { id: 202, nombre: 'No', temaId: 'propuesta', meta: {} },
      { id: 203, nombre: 'Abstención', temaId: 'propuesta', meta: {} },
   ],
};

test.describe('4. Llenar Respuestas — Votación', () => {

   test.describe('4.1 Votar', () => {

      async function setupVotacion(app) {
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
         }, VOTACION_PLANTILLA);
         await app.page.reload();
         await app.page.waitForFunction(() => !!(window.slice && typeof window.slice.build === 'function'));
         await app.page.waitForTimeout(500);
         await app.navigateTo('/mis-respuestas');
         await expect(app.page.locator('.vv-list')).toBeVisible({ timeout: 5000 });
      }

      test('4.1.1: vota por una opción', async ({ app }) => {
         await setupVotacion(app);
         await app.page.locator('.vv-opc[data-vote]').first().click();
         await app.page.waitForTimeout(300);

         await expect(app.page.locator('.vv-opc--chosen')).toHaveCount(1);
         await expect(app.page.locator('.vv-opc--chosen').first()).toHaveAttribute('aria-pressed', 'true');

         const card = app.page.locator('.vv-card').first();
         await expect(card).toHaveClass(/vv-card--answered/);
         await expect(card.locator('.vv-card__status')).toHaveText('✓ Elegida');

         const respuestas = await app.getContext('respuestas');
         const chosenTemaId = await app.page.locator('.vv-opc--chosen').first().getAttribute('data-tema-id');
         const chosenOpcId = await app.page.locator('.vv-opc--chosen').first().getAttribute('data-opcion-id');
         expect(String(respuestas.voto[chosenTemaId])).toBe(chosenOpcId);
         expect(app.pageErrors).toEqual([]);
      });

      test('4.1.2: cambia voto', async ({ app }) => {
         await setupVotacion(app);

         const card = app.page.locator('.vv-card').first();
         const opts = card.locator('.vv-opc[data-vote]');
         const firstId = await opts.nth(0).getAttribute('data-opcion-id');

         await opts.nth(0).click();
         await app.page.waitForTimeout(200);
         await expect(opts.nth(0)).toHaveClass(/vv-opc--chosen/);

         await opts.nth(1).click();
         await app.page.waitForTimeout(200);

         await expect(opts.nth(0)).not.toHaveClass(/vv-opc--chosen/);
         await expect(opts.nth(1)).toHaveClass(/vv-opc--chosen/);

         const respuestas = await app.getContext('respuestas');
         const temaId = await opts.nth(1).getAttribute('data-tema-id');
         const secondId = await opts.nth(1).getAttribute('data-opcion-id');
         expect(String(respuestas.voto[temaId])).toBe(secondId);
         expect(String(respuestas.voto[temaId])).not.toBe(firstId);
         expect(app.pageErrors).toEqual([]);
      });

      test('4.1.3: vota en múltiples temas', async ({ app }) => {
         await setupVotacion(app);

         const cards = app.page.locator('.vv-card');
         const cardCount = await cards.count();
         expect(cardCount).toBeGreaterThanOrEqual(2);

         await cards.nth(0).locator('.vv-opc[data-vote]').first().click();
         await app.page.waitForTimeout(200);

         await cards.nth(1).locator('.vv-opc[data-vote]').first().click();
         await app.page.waitForTimeout(200);

         await expect(cards.nth(0)).toHaveClass(/vv-card--answered/);
         await expect(cards.nth(1)).toHaveClass(/vv-card--answered/);

         const respuestas = await app.getContext('respuestas');
         expect(Object.keys(respuestas.voto).length).toBe(2);
         expect(app.pageErrors).toEqual([]);
      });

      test('4.1.4: completa todas las votaciones', async ({ app }) => {
         await setupVotacion(app);

         const cards = app.page.locator('.vv-card');
         const cardCount = await cards.count();

         for (let i = 0; i < cardCount; i++) {
            await cards.nth(i).locator('.vv-opc[data-vote]').first().click();
            await app.page.waitForTimeout(200);
         }

         for (let i = 0; i < cardCount; i++) {
            await expect(cards.nth(i)).toHaveClass(/vv-card--answered/);
         }

         const respuestas = await app.getContext('respuestas');
         expect(Object.keys(respuestas.voto).length).toBe(cardCount);
         expect(app.pageErrors).toEqual([]);
      });
   });
});
