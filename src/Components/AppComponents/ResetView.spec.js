import { test, expect } from '../../../playwright/harness/sliceFixtures.js';
import { seedAsignacion } from '../../../playwright/harness/seedHelpers.js';

test.describe('16. Reset / Reiniciar', () => {

   test.describe('16.1 Reiniciar respuestas', () => {

      test('16.1.1: reiniciar mis respuestas', async ({ app }) => {
         await seedAsignacion(app);
         await app.navigateTo('/mis-respuestas');

         // Make an assignment so there's data to reset
         const kindTab = app.page.locator('button.slice_tab_button[data-tab-id="seleccion"]');
         if (await kindTab.count()) {
            const isActive = await kindTab.evaluate((el) => el.classList.contains('active'));
            if (!isActive) await kindTab.click();
         }
         await app.page.waitForTimeout(300);

         const opcName = await app.page.locator('.person-name').textContent();
         const plantilla = await app.getContext('plantilla');
         const opc = plantilla.opciones.find((o) => o.nombre === opcName);
         expect(opc).toBeTruthy();

         await app.page.locator('.pill[data-tema="anfitriones"]').click();
         await app.page.waitForTimeout(400);

         let respuestas = await app.getContext('respuestas');
         expect(Object.keys(respuestas.seleccion).length).toBeGreaterThan(0);

         // Open UserMenu and click reset
         await app.page.locator('.user-menu__trigger').click();
         await app.page.waitForTimeout(300);
         await app.page.locator('.user-menu__panel').locator('.slice_button_value', { hasText: 'Reiniciar' }).click();
         await app.page.waitForTimeout(300);
         await app.confirmDialog();

         // Verify respuestas cleared
         respuestas = await app.getContext('respuestas');
         expect(Object.keys(respuestas.seleccion).length).toBe(0);
         expect(Object.keys(respuestas.texto).length).toBe(0);
         expect(Object.keys(respuestas.voto || {}).length).toBe(0);
         expect(Object.keys(respuestas.ranking || {}).length).toBe(0);
         expect(app.pageErrors).toEqual([]);
      });

      test('16.1.2: cancelar reinicio', async ({ app }) => {
         await seedAsignacion(app);
         await app.navigateTo('/mis-respuestas');

         // Make an assignment
         const kindTab = app.page.locator('button.slice_tab_button[data-tab-id="seleccion"]');
         if (await kindTab.count()) {
            const isActive = await kindTab.evaluate((el) => el.classList.contains('active'));
            if (!isActive) await kindTab.click();
         }
         await app.page.waitForTimeout(300);

         const opcName = await app.page.locator('.person-name').textContent();
         const plantilla = await app.getContext('plantilla');
         const opc = plantilla.opciones.find((o) => o.nombre === opcName);
         expect(opc).toBeTruthy();

         await app.page.locator('.pill[data-tema="anfitriones"]').click();
         await app.page.waitForTimeout(400);

         let respuestas = await app.getContext('respuestas');
         const beforeCount = Object.keys(respuestas.seleccion).length;
         expect(beforeCount).toBeGreaterThan(0);

         // Open UserMenu and click reset, then cancel
         await app.page.locator('.user-menu__trigger').click();
         await app.page.waitForTimeout(300);
         await app.page.locator('.user-menu__panel').locator('.slice_button_value', { hasText: 'Reiniciar' }).click();
         await app.page.waitForTimeout(300);
         await app.cancelDialog();

         // Verify respuestas unchanged
         respuestas = await app.getContext('respuestas');
         expect(Object.keys(respuestas.seleccion).length).toBe(beforeCount);
         expect(app.pageErrors).toEqual([]);
      });
   });

   test.describe('16.2 Restaurar ejemplo (seed)', () => {

      test('16.2.1: restaurar plantilla seed', async ({ app }) => {
         await app.resetState();
         await app.navigateTo('/plantilla');
         await expect(app.page.locator('#catList > *')).not.toHaveCount(0);

         // Open the presets <details> to reveal the grid
         await app.page.locator('.pb-presets summary').click();
         await app.page.waitForTimeout(200);

         // Click the "Asignación" preset (bundled seed data)
         await app.page.locator('[data-preset="asignacion"]').click();
         await app.page.waitForTimeout(300);
         await app.confirmDialog();

         // Verify seed data loaded: 9 temas, 15 opciones
         const plantilla = await app.getContext('plantilla');
         expect(plantilla.temas.length).toBe(9);
         expect(plantilla.opciones.length).toBe(15);
         expect(app.pageErrors).toEqual([]);
      });

      test('16.2.2: cancelar restauración', async ({ app }) => {
         await app.resetState();
         await app.navigateTo('/plantilla');
         await expect(app.page.locator('#catList > *')).not.toHaveCount(0);

         // Capture the current state before attempting restore
         const plantillaBefore = await app.getContext('plantilla');
         const temasBefore = plantillaBefore.temas.length;
         const opcBefore = plantillaBefore.opciones.length;

         // Open presets, click preset, then cancel
         await app.page.locator('.pb-presets summary').click();
         await app.page.waitForTimeout(200);
         await app.page.locator('[data-preset="asignacion"]').click();
         await app.page.waitForTimeout(300);
         await app.cancelDialog();

         // Verify plantilla unchanged
         const plantillaAfter = await app.getContext('plantilla');
         expect(plantillaAfter.temas.length).toBe(temasBefore);
         expect(plantillaAfter.opciones.length).toBe(opcBefore);
         expect(app.pageErrors).toEqual([]);
      });
   });
});
