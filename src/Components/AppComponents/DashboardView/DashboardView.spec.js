import { test, expect, waitForSliceReady } from '../../../../playwright/harness/sliceFixtures.js';
import { seedAsignacion } from '../../../../playwright/harness/seedHelpers.js';

const VOTACION_PLANTILLA = {
   nombre: 'Votación Test',
   atributos: [],
   temas: [
      { id: 'v1', nombre: '¿Qué opción elegimos?', modo: 'votacion', orden: 1, min: null, max: null, participable: false, meta: {} },
   ],
   opciones: [
      { id: 101, nombre: 'Opción A', temaId: 'v1', meta: {} },
      { id: 102, nombre: 'Opción B', temaId: 'v1', meta: {} },
   ],
};

const RANKING_PLANTILLA = {
   nombre: 'Ranking Test',
   atributos: [],
   temas: [
      { id: 'r1', nombre: 'Ordená los temas', modo: 'ranking', orden: 1, min: null, max: null, participable: false, meta: {} },
   ],
   opciones: [
      { id: 201, nombre: 'Opción 1', temaId: 'r1', meta: {} },
      { id: 202, nombre: 'Opción 2', temaId: 'r1', meta: {} },
      { id: 203, nombre: 'Opción 3', temaId: 'r1', meta: {} },
   ],
};

const TEXTO_PLANTILLA = {
   nombre: 'Texto Test',
   atributos: [],
   temas: [
      { id: 't1', nombre: '¿Qué opinás?', modo: 'texto_libre', orden: 1, min: null, max: null, participable: false, meta: {} },
      { id: 't2', nombre: '¿Qué mejorarías?', modo: 'texto_libre', orden: 2, min: null, max: null, participable: false, meta: {} },
   ],
   opciones: [],
};

test.describe('12. Dashboard', () => {

   test.describe('12.1 Vista general', () => {

      test('12.1.1: muestra stats correctos con seed data', async ({ app }) => {
         await seedAsignacion(app);
         await app.navigateTo('/dashboard');
         await expect(app.page.locator('.dashboard-view')).toBeVisible({ timeout: 5000 });

         // Seed: 9 temas (5 participables reparto + 2 no participables + 2 texto_libre)
         await expect(app.page.locator('[data-el="totalTemas"]')).toHaveText('9');
         // Progress total = opciones disponibles (13) + texto temas (2) = 15
         await expect(app.page.locator('[data-el="answered"]')).toContainText('0 / 15');

         // Make some assignments
         await app.navigateTo('/mis-respuestas');
         await app.page.waitForTimeout(300);
         const kindTab = app.page.locator('button.slice_tab_button[data-tab-id="seleccion"]');
         if (await kindTab.count()) {
            const isActive = await kindTab.evaluate((el) => el.classList.contains('active'));
            if (!isActive) await kindTab.click();
         }
         await app.page.waitForTimeout(300);

         // Assign 3 opciones
         const pills = app.page.locator('.pill[data-tema]');
         const available = await pills.count();
         if (available > 0) {
            await pills.first().click();
            await app.page.waitForTimeout(400);
         }
         if (available > 1) {
            await app.page.locator('.pill[data-tema]').first().click();
            await app.page.waitForTimeout(400);
         }
         if (available > 2) {
            await app.page.locator('.pill[data-tema]').first().click();
            await app.page.waitForTimeout(400);
         }

         // Go back to dashboard
         await app.navigateTo('/dashboard');
         await app.page.waitForTimeout(300);

         // Now answered should be > 0
         const answeredText = await app.page.locator('[data-el="answered"]').textContent();
         expect(answeredText).toMatch(/\d+\s*\/\s*15/);
         const answeredNum = parseInt(answeredText.match(/(\d+)\s*\//)?.[1] || '0');
         expect(answeredNum).toBeGreaterThanOrEqual(1);

         expect(app.pageErrors).toEqual([]);
      });

      test('12.1.2: muestra doughnut de progreso y porcentaje', async ({ app }) => {
         await seedAsignacion(app);
         await app.navigateTo('/dashboard');
         await expect(app.page.locator('.dashboard-view')).toBeVisible({ timeout: 5000 });

         await expect(app.page.locator('[data-el="completionCanvas"]')).toBeVisible();
         await expect(app.page.locator('[data-el="completionPct"]')).toHaveText('0%');

         expect(app.pageErrors).toEqual([]);
      });

      test('12.1.3: muestra nombre de plantilla en header', async ({ app }) => {
         await seedAsignacion(app);
         await app.navigateTo('/dashboard');
         await expect(app.page.locator('.dashboard-view')).toBeVisible({ timeout: 5000 });

         await expect(app.page.locator('[data-el="plantillaName"]')).toBeVisible();
         const name = await app.page.locator('[data-el="plantillaName"]').textContent();
         expect(name).toContain('Mi Plantilla');

         expect(app.pageErrors).toEqual([]);
      });

      test('12.1.4: click en tema card abre modal con opciones', async ({ app }) => {
         await seedAsignacion(app);
         await app.navigateTo('/dashboard');
         await expect(app.page.locator('.dashboard-view')).toBeVisible({ timeout: 5000 });

         // Make an assignment first so modal has content
         await app.navigateTo('/mis-respuestas');
         const kindTab = app.page.locator('button.slice_tab_button[data-tab-id="seleccion"]');
         if (await kindTab.count()) {
            const isActive = await kindTab.evaluate((el) => el.classList.contains('active'));
            if (!isActive) await kindTab.click();
         }
         await app.page.waitForTimeout(300);
         const pills = app.page.locator('.pill[data-tema]');
         if (await pills.count() > 0) {
            await pills.first().click();
            await app.page.waitForTimeout(400);
         }

         await app.navigateTo('/dashboard');
         await app.page.waitForTimeout(300);

         // Click a tema card
         const temaCard = app.page.locator('.tema-card').first();
         await expect(temaCard).toBeVisible();
         await temaCard.click();
         await app.page.waitForTimeout(500);

         // Modal should be open with assigned opciones
         const modal = app.page.locator('[slice-id="temaOpcionesModal"]');
         await expect(modal).toBeVisible();
         await expect(modal.locator('.tema-opcion-item')).toHaveCount(1);

         // Close modal
         await modal.locator('.slice-modal__close').click();
         await app.page.waitForTimeout(300);
         await expect(modal).not.toBeVisible();

         expect(app.pageErrors).toEqual([]);
      });
   });

   test.describe('12.2 Secciones por modo', () => {

      test('12.2.1: sección Asignación visible con seed data', async ({ app }) => {
         await seedAsignacion(app);
         await app.navigateTo('/dashboard');
         await expect(app.page.locator('.dashboard-view')).toBeVisible({ timeout: 5000 });

         await expect(app.page.locator('.tema-grid')).toBeVisible();
         const cards = app.page.locator('.tema-card');
         const count = await cards.count();
         expect(count).toBe(5); // Only participable reparto temas

         // Rango/problema cards should be visible for reparto
         await expect(app.page.locator('[data-el="cardRango"]')).toBeVisible();
         await expect(app.page.locator('[data-el="cardProblema"]')).toBeVisible();

         expect(app.pageErrors).toEqual([]);
      });

      test('12.2.2: sección Votación visible', async ({ app }) => {
         await app.page.evaluate(() => {
            Object.keys(localStorage)
               .filter((k) => k.startsWith('conclave-'))
               .forEach((k) => localStorage.removeItem(k));
         });
         await app.page.evaluate((data) => {
            localStorage.setItem('conclave-plantilla-v1', JSON.stringify(data));
            localStorage.setItem('conclave-respuestas-v1', JSON.stringify({ seleccion: {}, texto: {}, voto: {}, ranking: {} }));
         }, VOTACION_PLANTILLA);
         await app.page.reload();
         await waitForSliceReady(app.page);
         await app.page.waitForTimeout(500);

         await app.navigateTo('/dashboard');
         await expect(app.page.locator('.dashboard-view')).toBeVisible({ timeout: 5000 });

         // Votación section title visible
         await expect(app.page.locator('.dash-section-title').filter({ hasText: 'Votación' })).toBeVisible();
         await expect(app.page.locator('.texto-row')).toHaveCount(1);

         // No reparto → rango/problema cards hidden
         await expect(app.page.locator('[data-el="cardRango"]')).toBeHidden();
         await expect(app.page.locator('[data-el="cardProblema"]')).toBeHidden();

         expect(app.pageErrors).toEqual([]);
      });

      test('12.2.3: sección Ranking visible', async ({ app }) => {
         await app.page.evaluate(() => {
            Object.keys(localStorage)
               .filter((k) => k.startsWith('conclave-'))
               .forEach((k) => localStorage.removeItem(k));
         });
         await app.page.evaluate((data) => {
            localStorage.setItem('conclave-plantilla-v1', JSON.stringify(data));
            localStorage.setItem('conclave-respuestas-v1', JSON.stringify({ seleccion: {}, texto: {}, voto: {}, ranking: {} }));
         }, RANKING_PLANTILLA);
         await app.page.reload();
         await waitForSliceReady(app.page);
         await app.page.waitForTimeout(500);

         await app.navigateTo('/dashboard');
         await expect(app.page.locator('.dashboard-view')).toBeVisible({ timeout: 5000 });

         await expect(app.page.locator('.dash-section-title').filter({ hasText: 'Ranking' })).toBeVisible();
         await expect(app.page.locator('.texto-row')).toHaveCount(1);

         // No reparto → rango/problema cards hidden
         await expect(app.page.locator('[data-el="cardRango"]')).toBeHidden();
         await expect(app.page.locator('[data-el="cardProblema"]')).toBeHidden();

         expect(app.pageErrors).toEqual([]);
      });

      test('12.2.4: sección Texto libre visible', async ({ app }) => {
         await app.page.evaluate(() => {
            Object.keys(localStorage)
               .filter((k) => k.startsWith('conclave-'))
               .forEach((k) => localStorage.removeItem(k));
         });
         await app.page.evaluate((data) => {
            localStorage.setItem('conclave-plantilla-v1', JSON.stringify(data));
            localStorage.setItem('conclave-respuestas-v1', JSON.stringify({ seleccion: {}, texto: {}, voto: {}, ranking: {} }));
         }, TEXTO_PLANTILLA);
         await app.page.reload();
         await waitForSliceReady(app.page);
         await app.page.waitForTimeout(500);

         await app.navigateTo('/dashboard');
         await expect(app.page.locator('.dashboard-view')).toBeVisible({ timeout: 5000 });

         await expect(app.page.locator('.dash-section-title').filter({ hasText: 'Texto libre' })).toBeVisible();
         await expect(app.page.locator('.texto-row')).toHaveCount(2);

         expect(app.pageErrors).toEqual([]);
      });
   });
});
