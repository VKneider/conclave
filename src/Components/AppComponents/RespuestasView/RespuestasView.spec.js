import { test, expect } from '../../../../playwright/harness/sliceFixtures.js';
import { seedAsignacion } from '../../../../playwright/harness/seedHelpers.js';

test.describe('3. Llenar Respuestas — Asignación (carrusel)', () => {

   test.describe('3.1 Flujo de asignación', () => {

      async function getVisibleOpcId(app) {
         const name = await app.page.locator('.person-name').textContent();
         const plantilla = await app.getContext('plantilla');
         const opc = plantilla.opciones.find((o) => o.nombre === name);
         return opc ? String(opc.id) : null;
      }

      test('3.1.1: asigna opción a un tema', async ({ app }) => {
         await seedAsignacion(app);
         await app.navigateTo('/mis-respuestas');
         await expect(app.page.locator('[data-slot="carousel"]')).toBeVisible();

         // Ensure we're on the "Asignación" kind tab
         const kindTab = app.page.locator('button.slice_tab_button[data-tab-id="seleccion"]');
         if (await kindTab.count()) {
            const isActive = await kindTab.evaluate((el) => el.classList.contains('active'));
            if (!isActive) await kindTab.click();
         }
         await app.page.waitForTimeout(300);

         const opcId = await getVisibleOpcId(app);
         expect(opcId).toBeTruthy();

         // Click "Anfitriones" pill
         await app.page.locator('.pill[data-tema="anfitriones"]').click();
         await app.page.waitForTimeout(400);

         // Verify assignment via context
         const respuestas = await app.getContext('respuestas');
         expect(respuestas.seleccion[opcId]).toBe('anfitriones');
         expect(app.pageErrors).toEqual([]);
      });

      test('3.1.2: desasigna opción', async ({ app }) => {
         await seedAsignacion(app);
         await app.navigateTo('/mis-respuestas');
         await expect(app.page.locator('[data-slot="carousel"]')).toBeVisible();

         const kindTab = app.page.locator('button.slice_tab_button[data-tab-id="seleccion"]');
         if (await kindTab.count()) {
            const isActive = await kindTab.evaluate((el) => el.classList.contains('active'));
            if (!isActive) await kindTab.click();
         }
         await app.page.waitForTimeout(300);

         const opcId = await getVisibleOpcId(app);
         expect(opcId).toBeTruthy();

         // First assign
         await app.page.locator('.pill[data-tema="anfitriones"]').click();
         await app.page.waitForTimeout(400);

         // Carousel auto-advances — navigate back to the same opcion
         await app.page.locator('.arrow-btn[data-act="prev"]').click();
         await app.page.waitForTimeout(300);

         // Then unassign via "Sin asignar" pill
         await app.page.locator('.pill.pill-clear').click();
         await app.page.waitForTimeout(400);

         const respuestas = await app.getContext('respuestas');
         expect(respuestas.seleccion[opcId]).toBeUndefined();
         expect(app.pageErrors).toEqual([]);
      });

      test('3.1.7: feedback visual pill-just-assigned al asignar', async ({ app }) => {
         await seedAsignacion(app);
         await app.navigateTo('/mis-respuestas');
         await expect(app.page.locator('[data-slot="carousel"]')).toBeVisible();

         const kindTab = app.page.locator('button.slice_tab_button[data-tab-id="seleccion"]');
         if (await kindTab.count()) {
            const isActive = await kindTab.evaluate((el) => el.classList.contains('active'));
            if (!isActive) await kindTab.click();
         }
         await app.page.waitForTimeout(300);

         await app.page.locator('.pill[data-tema="transporte"]').first().click();
         // Check immediately (pill-just-assigned class is added then removed after 500ms)
         await app.page.waitForTimeout(100);
         const assignedPill = app.page.locator('.pill-just-assigned');
         await expect(assignedPill).toHaveCount(1);
         expect(app.pageErrors).toEqual([]);
      });

      test('3.1.8: pill at-capacity se ve diferente al llenar cupo', async ({ app }) => {
         await seedAsignacion(app);
         await app.navigateTo('/mis-respuestas');
         await expect(app.page.locator('[data-slot="carousel"]')).toBeVisible();

         const kindTab = app.page.locator('button.slice_tab_button[data-tab-id="seleccion"]');
         if (await kindTab.count()) {
            const isActive = await kindTab.evaluate((el) => el.classList.contains('active'));
            if (!isActive) await kindTab.click();
         }
         await app.page.waitForTimeout(300);

         // Transporte has max:6 — assign 6 opciones to fill it
         // Each assignment auto-advances, so we need to assign 6 times
         const transportePills = () => app.page.locator('.pill[data-tema="transporte"]');
         const opcionCount = await app.page.locator('.dot').count();

         for (let i = 0; i < Math.min(6, opcionCount); i++) {
            const transportBtn = transportePills().first();
            const isDisabled = await transportBtn.evaluate((el) => el.disabled);
            if (isDisabled) break;
            await transportBtn.click();
            await app.page.waitForTimeout(600);
         }

         // Now check if the transporte pills show at-capacity
         // The first visible pill for transporte should have at-capacity
         const hasCapacity = await transportePills().first().evaluate((el) =>
            el.classList.contains('at-capacity')
         );
         expect(hasCapacity).toBe(true);
         expect(app.pageErrors).toEqual([]);
      });

      test('3.1.10: completar toda la asignación', async ({ app }) => {
         await seedAsignacion(app);
         await app.navigateTo('/mis-respuestas');
         await expect(app.page.locator('[data-slot="carousel"]')).toBeVisible();

         const kindTab = app.page.locator('button.slice_tab_button[data-tab-id="seleccion"]');
         if (await kindTab.count()) {
            const isActive = await kindTab.evaluate((el) => el.classList.contains('active'));
            if (!isActive) await kindTab.click();
         }
         await app.page.waitForTimeout(300);

         const opcionCount = await app.page.locator('.dot').count();
         expect(opcionCount).toBeGreaterThan(0);

         // Assign all available opciones to some tema
         for (let i = 0; i < opcionCount; i++) {
            const btn = app.page.locator('.pill[data-tema="bienvenida"]').first();
            const isDisabled = await btn.evaluate((el) => el.disabled);
            if (isDisabled) break;
            await btn.click();
            await app.page.waitForTimeout(600);
         }

         // All dots should be done
         const doneDots = app.page.locator('.dot.done');
         const doneCount = await doneDots.count();
         expect(doneCount).toBe(opcionCount);
         expect(app.pageErrors).toEqual([]);
      });

      test('3.1.6: re-asigna opción ya asignada', async ({ app }) => {
         await seedAsignacion(app);
         await app.navigateTo('/mis-respuestas');
         await expect(app.page.locator('[data-slot="carousel"]')).toBeVisible();

         const kindTab = app.page.locator('button.slice_tab_button[data-tab-id="seleccion"]');
         if (await kindTab.count()) {
            const isActive = await kindTab.evaluate((el) => el.classList.contains('active'));
            if (!isActive) await kindTab.click();
         }
         await app.page.waitForTimeout(300);

         const opcId = await getVisibleOpcId(app);
         expect(opcId).toBeTruthy();

         // Assign to first tema
         await app.page.locator('.pill[data-tema="transporte"]').first().click();
         await app.page.waitForTimeout(300);

         // Carousel auto-advances — go back
         await app.page.locator('.arrow-btn[data-act="prev"]').click();
         await app.page.waitForTimeout(300);

         // Re-assign to another tema on the SAME opcion
         await app.page.locator('.pill[data-tema="bienvenida"]').first().click();
         await app.page.waitForTimeout(400);

         const respuestas = await app.getContext('respuestas');
         expect(respuestas.seleccion[opcId]).toBe('bienvenida');
         expect(app.pageErrors).toEqual([]);
      });

      test('3.1.3: navega con flechas ‹ ›', async ({ app }) => {
         await seedAsignacion(app);
         await app.navigateTo('/mis-respuestas');
         await expect(app.page.locator('[data-slot="carousel"]')).toBeVisible();

         const kindTab = app.page.locator('button.slice_tab_button[data-tab-id="seleccion"]');
         if (await kindTab.count()) {
            const isActive = await kindTab.evaluate((el) => el.classList.contains('active'));
            if (!isActive) await kindTab.click();
         }
         await app.page.waitForTimeout(300);

         // Get initial person name
         const initialName = await app.page.locator('.person-name').textContent();

         // Click next arrow
         await app.page.locator('.arrow-btn[data-act="next"]').click();
         await app.page.waitForTimeout(300);

         const nextName = await app.page.locator('.person-name').textContent();
         expect(nextName).not.toBe(initialName);

         // Click prev arrow
         await app.page.locator('.arrow-btn[data-act="prev"]').click();
         await app.page.waitForTimeout(300);

         const backName = await app.page.locator('.person-name').textContent();
         expect(backName).toBe(initialName);
         expect(app.pageErrors).toEqual([]);
      });

      test('3.1.4: navega con dots', async ({ app }) => {
         await seedAsignacion(app);
         await app.navigateTo('/mis-respuestas');
         await expect(app.page.locator('[data-slot="carousel"]')).toBeVisible();

         const kindTab = app.page.locator('button.slice_tab_button[data-tab-id="seleccion"]');
         if (await kindTab.count()) {
            const isActive = await kindTab.evaluate((el) => el.classList.contains('active'));
            if (!isActive) await kindTab.click();
         }
         await app.page.waitForTimeout(300);

         // Click the third dot (index 2)
         await app.page.locator('.dot[data-idx="2"]').click();
         await app.page.waitForTimeout(300);

         // The third dot should be active
         await expect(app.page.locator('.dot[data-idx="2"]')).toHaveClass(/active/);
         expect(app.pageErrors).toEqual([]);
      });

      test('3.1.5: navega con teclado ← →', async ({ app }) => {
         await seedAsignacion(app);
         await app.navigateTo('/mis-respuestas');
         await expect(app.page.locator('[data-slot="carousel"]')).toBeVisible();

         const kindTab = app.page.locator('button.slice_tab_button[data-tab-id="seleccion"]');
         if (await kindTab.count()) {
            const isActive = await kindTab.evaluate((el) => el.classList.contains('active'));
            if (!isActive) await kindTab.click();
         }
         await app.page.waitForTimeout(300);

         const initialName = await app.page.locator('.person-name').textContent();

         // Press ArrowRight (which is → key)
         await app.page.keyboard.press('ArrowRight');
         await app.page.waitForTimeout(300);

         const nextName = await app.page.locator('.person-name').textContent();
         expect(nextName).not.toBe(initialName);

         // Press ArrowLeft
         await app.page.keyboard.press('ArrowLeft');
         await app.page.waitForTimeout(300);

         const backName = await app.page.locator('.person-name').textContent();
         expect(backName).toBe(initialName);
         expect(app.pageErrors).toEqual([]);
      });

      test('3.1.9: dots de progreso se actualizan al asignar', async ({ app }) => {
         await seedAsignacion(app);
         await app.navigateTo('/mis-respuestas');
         await expect(app.page.locator('[data-slot="carousel"]')).toBeVisible();

         const kindTab = app.page.locator('button.slice_tab_button[data-tab-id="seleccion"]');
         if (await kindTab.count()) {
            const isActive = await kindTab.evaluate((el) => el.classList.contains('active'));
            if (!isActive) await kindTab.click();
         }
         await app.page.waitForTimeout(300);

         const initialDone = await app.page.locator('.dot.done').count();

         await app.page.locator('.pill[data-tema="transporte"]').first().click();
         await app.page.waitForTimeout(600);

         const newDone = await app.page.locator('.dot.done').count();
         expect(newDone).toBe(initialDone + 1);
         expect(app.pageErrors).toEqual([]);
      });
   });

   test.describe('3.2 Búsqueda', () => {

      test('3.2.1: buscar opción por nombre filtra', async ({ app }) => {
         await seedAsignacion(app);
         await app.navigateTo('/mis-respuestas');
         await expect(app.page.locator('[data-slot="carousel"]')).toBeVisible();

         const kindTab = app.page.locator('button.slice_tab_button[data-tab-id="seleccion"]');
         if (await kindTab.count()) {
            const isActive = await kindTab.evaluate((el) => el.classList.contains('active'));
            if (!isActive) await kindTab.click();
         }
         await app.page.waitForTimeout(300);

         const initialDotCount = await app.page.locator('.dot').count();

         // Search for a specific name
         const searchInput = app.page.locator('.mrv-search-slot input');
         await searchInput.click();
         await searchInput.fill('Mateo');
         await searchInput.evaluate((el) => el.dispatchEvent(new Event('input', { bubbles: true })));
         await app.page.waitForTimeout(300);

         const filteredDotCount = await app.page.locator('.dot').count();
         expect(filteredDotCount).toBeLessThan(initialDotCount);
         expect(app.pageErrors).toEqual([]);
      });

      test('3.2.2: limpiar búsqueda restaura todas', async ({ app }) => {
         await seedAsignacion(app);
         await app.navigateTo('/mis-respuestas');
         await expect(app.page.locator('[data-slot="carousel"]')).toBeVisible();

         const kindTab = app.page.locator('button.slice_tab_button[data-tab-id="seleccion"]');
         if (await kindTab.count()) {
            const isActive = await kindTab.evaluate((el) => el.classList.contains('active'));
            if (!isActive) await kindTab.click();
         }
         await app.page.waitForTimeout(300);

         const initialDotCount = await app.page.locator('.dot').count();

         // Search
         const searchInput = app.page.locator('.mrv-search-slot input');
         await searchInput.click();
         await searchInput.fill('Mateo');
         await searchInput.evaluate((el) => el.dispatchEvent(new Event('input', { bubbles: true })));
         await app.page.waitForTimeout(300);

         // Clear search
         await searchInput.click();
         await searchInput.fill('');
         await searchInput.evaluate((el) => el.dispatchEvent(new Event('input', { bubbles: true })));
         await app.page.waitForTimeout(300);

         const restoredCount = await app.page.locator('.dot').count();
         expect(restoredCount).toBe(initialDotCount);
         expect(app.pageErrors).toEqual([]);
      });
   });
});
