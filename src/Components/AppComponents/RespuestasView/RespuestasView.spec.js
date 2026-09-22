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

   // The builder can reorder / rename temas while these cached views exist.
   // Temas and pool must read in the SAME order everywhere, live — no
   // reload, no tab switch.
   test.describe('3.3 Orden sincronizado con la Plantilla', () => {

      const participableIds = (plantilla) => plantilla.temas.filter((t) => t.participable && t.modo === 'reparto').map((t) => t.id);

      test('3.3.1: carrusel — las pills siguen el orden de la Plantilla al reordenar', async ({ app }) => {
         await seedAsignacion(app);
         await app.navigateTo('/mis-respuestas');
         await expect(app.page.locator('[data-slot="carousel"]')).toBeVisible();

         const before = participableIds(await app.getContext('plantilla'));
         const pills = () => app.page.locator('.tema-pills .pill[data-tema]:not(.pill-clear)');
         expect(await pills().evaluateAll((els) => els.map((e) => e.dataset.tema))).toEqual(before);

         await app.page.evaluate((id) => window.slice.getComponent('PlantillaService').moveTema(id, 1), before[0]);
         await app.page.waitForTimeout(300);

         const after = participableIds(await app.getContext('plantilla'));
         expect(after[1]).toBe(before[0]);
         expect(await pills().evaluateAll((els) => els.map((e) => e.dataset.tema))).toEqual(after);
         expect(app.pageErrors).toEqual([]);
      });

      test('3.3.2: tablero Por tema — los cuadros se reordenan y renombran en vivo', async ({ app }) => {
         await seedAsignacion(app);
         await app.navigateTo('/mis-respuestas');
         await expect(app.page.locator('[data-slot="carousel"]')).toBeVisible();
         // The board is built alongside the carousel (secondary tab), so its
         // squares exist even while hidden.
         const squares = () => app.page.locator('slice-portemaview .ps-square[data-drop]');
         await expect(squares()).not.toHaveCount(0);

         const before = participableIds(await app.getContext('plantilla'));
         expect(await squares().evaluateAll((els) => els.map((e) => e.dataset.drop))).toEqual(before);

         // Move the last tema to the front and rename another one — same id
         // set, so the shell must NOT be rebuilt, only patched in place.
         const last = before[before.length - 1];
         await app.page.evaluate(([id, steps, renameId]) => {
            const ps = window.slice.getComponent('PlantillaService');
            for (let i = 0; i < steps; i++) ps.moveTema(id, -1);
            ps.updateTema(renameId, { nombre: 'Equipo renombrado', max: 42 });
         }, [last, before.length - 1, before[0]]);
         await app.page.waitForTimeout(400);

         const after = participableIds(await app.getContext('plantilla'));
         expect(after[0]).toBe(last);
         expect(await squares().evaluateAll((els) => els.map((e) => e.dataset.drop))).toEqual(after);
         await expect(app.page.locator(`slice-portemaview [data-el="name-${before[0]}"]`)).toHaveText('Equipo renombrado');
         await expect(app.page.locator(`slice-portemaview [data-el="max-${before[0]}"]`)).toHaveText('/42');
         expect(app.pageErrors).toEqual([]);
      });

      test('3.3.3: texto libre — las tarjetas siguen el orden de la Plantilla al reordenar', async ({ app }) => {
         await seedAsignacion(app);
         await app.navigateTo('/mis-respuestas');
         await expect(app.page.locator('[data-slot="carousel"]')).toBeVisible();

         const textoIds = (pl) => pl.temas.filter((t) => t.modo === 'texto_libre').map((t) => t.id);
         const before = textoIds(await app.getContext('plantilla'));
         expect(before.length).toBeGreaterThan(1);
         const titles = () => app.page.locator('slice-respuestastextoview slice-textocard .rt-title');
         const nameOf = (pl, id) => pl.temas.find((t) => t.id === id).nombre;
         let pl = await app.getContext('plantilla');
         expect(await titles().allTextContents()).toEqual(before.map((id) => nameOf(pl, id)));

         await app.page.evaluate((id) => window.slice.getComponent('PlantillaService').moveTema(id, -1), before[before.length - 1]);
         await app.page.waitForTimeout(400);

         pl = await app.getContext('plantilla');
         const after = textoIds(pl);
         expect(after).not.toEqual(before);
         expect(await titles().allTextContents()).toEqual(after.map((id) => nameOf(pl, id)));
         expect(app.pageErrors).toEqual([]);
      });
   });
});
