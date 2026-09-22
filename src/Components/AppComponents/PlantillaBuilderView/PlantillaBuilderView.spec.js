import { test, expect } from '../../../../playwright/harness/sliceFixtures.js';
import { seedAsignacion } from '../../../../playwright/harness/seedHelpers.js';

test.describe('PlantillaBuilderView', () => {

   test('smoke: app boots and navigates to /plantilla', async ({ app }) => {
      await seedAsignacion(app);
      await app.navigateTo('/plantilla');

      await expect(app.page.locator('.view-title')).toHaveText('Plantilla');
      expect(app.pageErrors).toEqual([]);
   });

   test.describe('1.1 CRUD temas', () => {

      test('1.1.1: agrega tema "Logística" modo texto libre (default)', async ({ app }) => {
         await seedAsignacion(app);
         await app.navigateTo('/plantilla');
         await expect(app.page.locator('#catList > *')).not.toHaveCount(0);

         await app.fillInput('#addCatSlot textarea', 'Logística');
         await app.clickAndWait('#addCatBtnSlot .slice_button');

         const plantilla = await app.getContext('plantilla');
         const added = plantilla.temas.find((t) => t.nombre === 'Logística');
         expect(added).toBeTruthy();
         expect(added.modo).toBe('texto_libre');
         expect(app.pageErrors).toEqual([]);
      });

      test('1.1.2: agrega tema luego cambia a modo votación', async ({ app }) => {
         await seedAsignacion(app);
         await app.navigateTo('/plantilla');
         await expect(app.page.locator('#catList > *')).not.toHaveCount(0);

         await app.fillInput('#addCatSlot textarea', 'Elegir fecha');
         await app.clickAndWait('#addCatBtnSlot .slice_button');

         // New tema is appended at the END of the list
         const addedRow = app.page.locator('#catList slice-temarow').last();
         await addedRow.locator('.cat-row__modo-slot slice-select').waitFor({ state: 'attached', timeout: 5000 });
         await app.page.waitForTimeout(500);

         await app.selectOption(addedRow.locator('.cat-row__modo-slot .slice_select_container'), 'Votación');
         await app.page.waitForTimeout(300);

         const plantilla = await app.getContext('plantilla');
         const added = plantilla.temas.find((t) => t.nombre === 'Elegir fecha');
         expect(added).toBeTruthy();
         expect(added.modo).toBe('votacion');
         expect(app.pageErrors).toEqual([]);
      });

      test('1.1.3: agrega tema luego cambia a modo ranking', async ({ app }) => {
         await seedAsignacion(app);
         await app.navigateTo('/plantilla');
         await expect(app.page.locator('#catList > *')).not.toHaveCount(0);

         await app.fillInput('#addCatSlot textarea', 'Priorizar ideas');
         await app.clickAndWait('#addCatBtnSlot .slice_button');

         const addedRow = app.page.locator('#catList slice-temarow').last();
         await addedRow.locator('.cat-row__modo-slot slice-select').waitFor({ state: 'attached', timeout: 5000 });
         await app.page.waitForTimeout(500);

         await app.selectOption(addedRow.locator('.cat-row__modo-slot .slice_select_container'), 'Ranking');
         await app.page.waitForTimeout(300);

         const plantilla = await app.getContext('plantilla');
         const added = plantilla.temas.find((t) => t.nombre === 'Priorizar ideas');
         expect(added).toBeTruthy();
         expect(added.modo).toBe('ranking');
         expect(app.pageErrors).toEqual([]);
      });

      test('1.1.4: agrega tema modo texto libre con filtro', async ({ app }) => {
         await seedAsignacion(app);
         await app.navigateTo('/plantilla');
         await expect(app.page.locator('#catList > *')).not.toHaveCount(0);

         // "Texto libre" filter IS present because seed has 2 texto_libre temas
         await app.page.locator('.pb-filter-btn[data-filter="texto_libre"]').click();
         await app.page.waitForTimeout(200);

         await app.fillInput('#addCatSlot textarea', 'Sugerencias libres');
         await app.clickAndWait('#addCatBtnSlot .slice_button');

         const plantilla = await app.getContext('plantilla');
         const added = plantilla.temas.find((t) => t.nombre === 'Sugerencias libres');
         expect(added).toBeTruthy();
         expect(added.modo).toBe('texto_libre');
         expect(app.pageErrors).toEqual([]);
      });

      test('1.1.5: edita nombre de tema existente', async ({ app }) => {
         await seedAsignacion(app);
         await app.navigateTo('/plantilla');
         await expect(app.page.locator('#catList > *')).not.toHaveCount(0);

         const firstRow = app.page.locator('#catList slice-temarow').first();
         const nameInput = firstRow.locator('.cat-row__name-slot textarea');
         await nameInput.click();
         await nameInput.fill('Coordinación Modificada');
         await nameInput.evaluate((el) => el.dispatchEvent(new Event('change', { bubbles: true })));
         await app.page.waitForTimeout(200);

         const plantilla = await app.getContext('plantilla');
         const edited = plantilla.temas.find((t) => t.id === 'coordinacion-principal');
         expect(edited.nombre).toBe('Coordinación Modificada');
         expect(app.pageErrors).toEqual([]);
      });

      test('1.1.5c: Escape descarta la edición del nombre', async ({ app }) => {
         await seedAsignacion(app);
         await app.navigateTo('/plantilla');
         await expect(app.page.locator('#catList > *')).not.toHaveCount(0);

         const field = app.page.locator('#catList slice-temarow').first().locator('.cat-row__name-slot textarea');
         const original = (await app.getContext('plantilla')).temas[0].nombre;

         await field.click();
         await field.fill('Algo que no quiero guardar');
         await field.press('Escape');
         await app.page.waitForTimeout(250);

         expect(await field.inputValue()).toBe(original);
         expect((await app.getContext('plantilla')).temas[0].nombre).toBe(original);
         expect(app.pageErrors).toEqual([]);
      });

      test('1.1.5b: el nombre es un textarea que envuelve; Enter guarda y no inserta salto', async ({ app }) => {
         await seedAsignacion(app);
         await app.navigateTo('/plantilla');
         await expect(app.page.locator('#catList > *')).not.toHaveCount(0);

         const row = app.page.locator('#catList slice-temarow').first();
         const field = row.locator('.cat-row__name-slot textarea');
         const oneLine = (await field.boundingBox()).height;

         const long = '¿Qué propuestas concretas tenemos para mejorar la comunicación entre los equipos durante el próximo trimestre y cómo las medimos?';
         await field.click();
         await field.fill(long);
         await app.page.waitForTimeout(150);
         // autoGrow: the field is taller now, so the whole question is visible.
         expect((await field.boundingBox()).height).toBeGreaterThan(oneLine + 10);

         await field.press('Enter');
         await app.page.waitForTimeout(250);
         const plantilla = await app.getContext('plantilla');
         expect(plantilla.temas.find((t) => t.id === 'coordinacion-principal').nombre).toBe(long);
         expect(await field.inputValue()).not.toContain('\n');
         expect(app.pageErrors).toEqual([]);
      });

      test('1.1.6: cambia modo de reparto a votación', async ({ app }) => {
         await seedAsignacion(app);
         await app.navigateTo('/plantilla');
         await expect(app.page.locator('#catList > *')).not.toHaveCount(0);

         // First tema is reparto → change to votacion
         const firstRow = app.page.locator('#catList slice-temarow').first();
         const modoSelector = '.cat-row__modo-slot .slice_select_container';
         const firstContainer = firstRow.locator(modoSelector);
         await app.selectOption(firstContainer, 'Votación');
         await app.page.waitForTimeout(300);

         const plantilla = await app.getContext('plantilla');
         const edited = plantilla.temas.find((t) => t.id === 'coordinacion-principal');
         expect(edited.modo).toBe('votacion');
         expect(app.pageErrors).toEqual([]);
      });

      test('1.1.7: borra tema con confirmación', async ({ app }) => {
         await seedAsignacion(app);
         await app.navigateTo('/plantilla');
         await expect(app.page.locator('#catList > *')).not.toHaveCount(0);

         const initialCount = await app.page.locator('#catList > *').count();

         await app.page.locator('#catList slice-temarow').first().locator('.cat-row__remove').click();
         await app.confirmDialog();

         const rows = app.page.locator('#catList > *');
         await expect(rows).toHaveCount(initialCount - 1);
         expect(app.pageErrors).toEqual([]);
      });

      test('1.1.8: cancela borrado de tema', async ({ app }) => {
         await seedAsignacion(app);
         await app.navigateTo('/plantilla');
         await expect(app.page.locator('#catList > *')).not.toHaveCount(0);

         const initialCount = await app.page.locator('#catList > *').count();

         await app.page.locator('#catList slice-temarow').first().locator('.cat-row__remove').click();
         await app.cancelDialog();

         const rows = app.page.locator('#catList > *');
         await expect(rows).toHaveCount(initialCount);
         expect(app.pageErrors).toEqual([]);
      });

      test('1.1.9: agregar con el campo vacío avisa y no crea nada', async ({ app }) => {
         await seedAsignacion(app);
         await app.navigateTo('/plantilla');
         await expect(app.page.locator('#catList > *')).not.toHaveCount(0);
         const before = (await app.getContext('plantilla')).temas.length;

         await app.clickAndWait('#addCatBtnSlot .slice_button');

         const error = app.page.locator('#addCatError');
         await expect(error).toBeVisible();
         await expect(error).toContainText('Escribe');
         // The field itself flags it too (registry Textarea's triggerError).
         await expect(app.page.locator('#addCatSlot .slice_textarea')).toHaveClass(/required/);
         expect((await app.getContext('plantilla')).temas.length).toBe(before);

         // Typing clears the message.
         await app.page.locator('#addCatSlot textarea').fill('a');
         await expect(error).toBeHidden();
         expect(app.pageErrors).toEqual([]);
      });

      test('1.1.10: el tema nuevo queda al FINAL y numerado como último', async ({ app }) => {
         await seedAsignacion(app);
         await app.navigateTo('/plantilla');
         await expect(app.page.locator('#catList > *')).not.toHaveCount(0);
         const before = (await app.getContext('plantilla')).temas.length;

         await app.fillInput('#addCatSlot textarea', '¿Qué cerramos hoy?');
         await app.clickAndWait('#addCatBtnSlot .slice_button');

         const temas = (await app.getContext('plantilla')).temas;
         expect(temas.length).toBe(before + 1);
         expect(temas[temas.length - 1].nombre).toBe('¿Qué cerramos hoy?');
         expect(temas[temas.length - 1].orden).toBe(before + 1);

         const lastRow = app.page.locator('#catList slice-temarow').last();
         await expect(lastRow).toHaveAttribute('data-tema-id', temas[temas.length - 1].id);
         await expect(lastRow.locator('.cat-row__order')).toHaveText(String(before + 1));
         expect(app.pageErrors).toEqual([]);
      });

      test('1.1.11: al borrar, la numeración se recompone (1..n sin huecos)', async ({ app }) => {
         await seedAsignacion(app);
         await app.navigateTo('/plantilla');
         await expect(app.page.locator('#catList > *')).not.toHaveCount(0);

         // Remove the 2nd tema — everything after it must shift down by one.
         await app.page.locator('#catList slice-temarow').nth(1).locator('.cat-row__remove').click();
         await app.confirmDialog();
         await app.page.waitForTimeout(300);

         const temas = (await app.getContext('plantilla')).temas;
         expect(temas.map((t) => t.orden)).toEqual(temas.map((_, i) => i + 1));

         const labels = await app.page.locator('#catList slice-temarow .cat-row__order').allTextContents();
         expect(labels.map((s) => s.trim())).toEqual(temas.map((_, i) => String(i + 1)));
         expect(app.pageErrors).toEqual([]);
      });

      test('1.1.12: el modo elegido en la fila de alta se aplica al tema nuevo', async ({ app }) => {
         await seedAsignacion(app);
         await app.navigateTo('/plantilla');
         await expect(app.page.locator('#catList > *')).not.toHaveCount(0);

         await app.selectOption('#addCatModoSlot .slice_select_container', 'Votación');
         await app.fillInput('#addCatSlot textarea', '¿Qué fecha elegimos?');
         await app.clickAndWait('#addCatBtnSlot .slice_button');

         const plantilla = await app.getContext('plantilla');
         const added = plantilla.temas.find((t) => t.nombre === '¿Qué fecha elegimos?');
         expect(added).toBeTruthy();
         expect(added.modo).toBe('votacion');

         // Adding a second one keeps the chosen modo (batch entry of a kind).
         await app.fillInput('#addCatSlot textarea', '¿Y el lugar?');
         await app.clickAndWait('#addCatBtnSlot .slice_button');
         const again = (await app.getContext('plantilla')).temas.find((t) => t.nombre === '¿Y el lugar?');
         expect(again.modo).toBe('votacion');
         expect(app.pageErrors).toEqual([]);
      });
   });

   test.describe('1.2 Opciones por tema (inline)', () => {

      test('1.2.1: agrega opción inline a tema votación', async ({ app }) => {
         await seedAsignacion(app);
         await app.navigateTo('/plantilla');
         await expect(app.page.locator('#catList > *')).not.toHaveCount(0);

         // Add a tema then change its modo to votacion
         await app.fillInput('#addCatSlot textarea', '¿Dónde cenamos?');
         await app.clickAndWait('#addCatBtnSlot .slice_button');

         const temaRow = app.page.locator('#catList slice-temarow').last();
         await temaRow.locator('.cat-row__modo-slot slice-select').waitFor({ state: 'attached', timeout: 5000 });
         await app.page.waitForTimeout(500);
         await app.selectOption(temaRow.locator('.cat-row__modo-slot .slice_select_container'), 'Votación');
         await app.page.waitForTimeout(300);

         // Expand details
         await temaRow.locator('.cat-row__toggle').click();
         await app.page.waitForTimeout(200);

         // Add inline opcion
         const opcAddInput = temaRow.locator('.cat-row__opc-add');
         await opcAddInput.fill('Restaurante A');
          await temaRow.locator('.cat-row__opc-add-btn-slot .slice_button').click();
         await app.page.waitForTimeout(300);

         const plantilla = await app.getContext('plantilla');
         const tema = plantilla.temas.find((t) => t.nombre === '¿Dónde cenamos?');
         const inlineOpciones = plantilla.opciones.filter((o) => o.temaId === tema.id);
         expect(inlineOpciones.some((o) => o.nombre === 'Restaurante A')).toBe(true);
         expect(app.pageErrors).toEqual([]);
      });

      test('1.2.3: edita nombre de opción inline', async ({ app }) => {
         await seedAsignacion(app);
         await app.navigateTo('/plantilla');
         await expect(app.page.locator('#catList > *')).not.toHaveCount(0);

         await app.fillInput('#addCatSlot textarea', '¿Dónde cenamos?');
         await app.clickAndWait('#addCatBtnSlot .slice_button');

         const temaRow = app.page.locator('#catList slice-temarow').last();
         await temaRow.locator('.cat-row__modo-slot slice-select').waitFor({ state: 'attached', timeout: 5000 });
         await app.page.waitForTimeout(500);
         await app.selectOption(temaRow.locator('.cat-row__modo-slot .slice_select_container'), 'Votación');
         await app.page.waitForTimeout(300);

         await temaRow.locator('.cat-row__toggle').click();
         await app.page.waitForTimeout(200);

         await temaRow.locator('.cat-row__opc-add').fill('Restaurante A');
          await temaRow.locator('.cat-row__opc-add-btn-slot .slice_button').click();
         await app.page.waitForTimeout(300);

         // Update via service, verify UI reflects change
         await app.page.evaluate(() => {
            const ps = window.slice.getComponent('PlantillaService');
            const todos = ps.getOpciones();
            const inline = todos.find((o) => o.nombre === 'Restaurante A');
            ps.updateOpcion(inline.id, { nombre: 'Restaurante B' });
         });
         await app.page.waitForTimeout(300);

         const opcName = await temaRow.locator('.cat-row__opc-item .cat-row__opc-name').textContent();
         expect(opcName.trim()).toBe('Restaurante B');
         expect(app.pageErrors).toEqual([]);
      });

      test('1.2.2: elimina opción inline de tema votación', async ({ app }) => {
         await seedAsignacion(app);
         await app.navigateTo('/plantilla');
         await expect(app.page.locator('#catList > *')).not.toHaveCount(0);

         // Create votacion tema with opcion inline
         await app.fillInput('#addCatSlot textarea', '¿Dónde cenamos?');
         await app.clickAndWait('#addCatBtnSlot .slice_button');

         const temaRow = app.page.locator('#catList slice-temarow').last();
         await temaRow.locator('.cat-row__modo-slot slice-select').waitFor({ state: 'attached', timeout: 5000 });
         await app.page.waitForTimeout(500);
         await app.selectOption(temaRow.locator('.cat-row__modo-slot .slice_select_container'), 'Votación');
         await app.page.waitForTimeout(300);

         await temaRow.locator('.cat-row__toggle').click();
         await app.page.waitForTimeout(200);

         await temaRow.locator('.cat-row__opc-add').fill('Restaurante A');
          await temaRow.locator('.cat-row__opc-add-btn-slot .slice_button').click();
         await app.page.waitForTimeout(300);

         // Remove it
         await temaRow.locator('.cat-row__opc-item .cat-row__opc-remove').click();
         await app.page.waitForTimeout(300);

         const plantilla = await app.getContext('plantilla');
         const tema = plantilla.temas.find((t) => t.nombre === '¿Dónde cenamos?');
         const inlineOpciones = plantilla.opciones.filter((o) => o.temaId === tema.id);
         expect(inlineOpciones.length).toBe(0);
         expect(app.pageErrors).toEqual([]);
      });
   });

   test.describe('1.3 CRUD opciones pool (reparto)', () => {

      test('1.3.1: agrega opción "Juan Pérez" al pool', async ({ app }) => {
         await seedAsignacion(app);
         await app.navigateTo('/plantilla');
         await expect(app.page.locator('#catList > *')).not.toHaveCount(0);

         await app.fillInput('#addOpcSlot input', 'Juan Pérez');
         await app.clickAndWait('#addOpcBtnSlot .slice_button');

         const plantilla = await app.getContext('plantilla');
         const added = plantilla.opciones.find((o) => o.nombre === 'Juan Pérez');
         expect(added).toBeTruthy();
         expect(added.temaId).toBeNull();
         // Appended (same convention as temas): last in the pool and in the list.
         expect(plantilla.opciones[plantilla.opciones.length - 1].id).toBe(added.id);
         await expect(app.page.locator('#opcList slice-opcionrow').last()).toHaveAttribute('data-opc-id', String(added.id));
         expect(app.pageErrors).toEqual([]);
      });

      test('1.3.2: edita nombre de opción existente', async ({ app }) => {
         await seedAsignacion(app);
         await app.navigateTo('/plantilla');
         await expect(app.page.locator('#opcList > *')).not.toHaveCount(0);

         const firstRow = app.page.locator('#opcList slice-opcionrow').first();
         const nameInput = firstRow.locator('.opc-row__name-slot input');
         await nameInput.click();
         await nameInput.fill('Mateo El Grande');
         await nameInput.evaluate((el) => el.dispatchEvent(new Event('change', { bubbles: true })));
         await app.page.waitForTimeout(200);

         const plantilla = await app.getContext('plantilla');
         const edited = plantilla.opciones.find((o) => o.id === 1);
         expect(edited.nombre).toBe('Mateo El Grande');
         expect(app.pageErrors).toEqual([]);
      });

      test('1.3.3: marca opción como "fijo"', async ({ app }) => {
         await seedAsignacion(app);
         await app.navigateTo('/plantilla');
         await expect(app.page.locator('#opcList > *')).not.toHaveCount(0);

         // Expand first opcion row's details
         const firstRow = app.page.locator('#opcList slice-opcionrow').first();
         await firstRow.locator('.opc-row__toggle').click();
         await app.page.waitForTimeout(200);

         // Check the "Fija" checkbox
         const fijoCheckbox = firstRow.locator('.opc-row__fijo-slot input[type="checkbox"]');
         await fijoCheckbox.check();
         await app.page.waitForTimeout(200);

         const plantilla = await app.getContext('plantilla');
         const opcion = plantilla.opciones.find((o) => o.id === 1);
         expect(opcion.meta.fijo).toBe(true);
         expect(app.pageErrors).toEqual([]);
      });

      test('1.3.4: borra opción con confirmación', async ({ app }) => {
         await seedAsignacion(app);
         await app.navigateTo('/plantilla');
         await expect(app.page.locator('#opcList > *')).not.toHaveCount(0);

         const initialCount = await app.page.locator('#opcList > *').count();

         // Skip first two (fijo=true, remove hidden), target third (id:3, Andrés, fijo:false)
         const targetRow = app.page.locator('#opcList slice-opcionrow').nth(2);
         await targetRow.locator('.opc-row__remove').click();
         await app.confirmDialog();

         const rows = app.page.locator('#opcList > *');
         await expect(rows).toHaveCount(initialCount - 1);
         expect(app.pageErrors).toEqual([]);
      });

      test('1.3.5: bulk delete opciones', async ({ app }) => {
         await seedAsignacion(app);
         await app.navigateTo('/plantilla');
         await expect(app.page.locator('#opcList > *')).not.toHaveCount(0);

         const initialCount = await app.page.locator('#opcList > *').count();
         expect(initialCount).toBeGreaterThanOrEqual(2);

         await app.page.locator('#opcList slice-opcionrow').nth(2).locator('.opc-row__select').check();
         await app.page.locator('#opcList slice-opcionrow').nth(3).locator('.opc-row__select').check();
         await app.page.waitForTimeout(200);

         await app.page.locator('#opcBulkDeleteSlot .slice_button').click();
         await app.confirmDialog();

         const newCount = await app.page.locator('#opcList > *').count();
         expect(newCount).toBe(initialCount - 2);
         expect(app.pageErrors).toEqual([]);
      });

      test('1.3.6: borrar todas las opciones', async ({ app }) => {
         await seedAsignacion(app);
         await app.navigateTo('/plantilla');
         await expect(app.page.locator('#opcList > *')).not.toHaveCount(0);

         await app.page.locator('#opcClearAllSlot .slice_button').click();
         await app.confirmDialog();

         await expect(app.page.locator('#opcList > *')).toHaveCount(0);
         expect(app.pageErrors).toEqual([]);
      });

      test('1.3.7: ▲/▼ reordenan el pool (y sólo el pool) — el carrusel sigue ese orden', async ({ app }) => {
         await seedAsignacion(app);
         await app.navigateTo('/plantilla');
         await expect(app.page.locator('#opcList > *')).not.toHaveCount(0);
         const poolIds = async () => (await app.getContext('plantilla')).opciones.filter((o) => o.temaId == null).map((o) => String(o.id));
         const before = await poolIds();

         // An owned opción (votación) shares the array: it must keep its slot.
         await app.page.evaluate(() => {
            const ps = window.slice.getComponent('PlantillaService');
            const t = ps.addTema({ nombre: '¿Fecha?', modo: 'votacion' });
            ps.addOpcion({ nombre: 'Viernes', temaId: t.id });
         });
         await app.page.waitForTimeout(300);
         const ownedBefore = (await app.getContext('plantilla')).opciones.findIndex((o) => o.nombre === 'Viernes');

         const rows = app.page.locator('#opcList slice-opcionrow');
         await rows.nth(2).locator('.opc-row__move-up').click();
         await app.page.waitForTimeout(300);
         let after = await poolIds();
         expect(after[1]).toBe(before[2]);
         expect(after[2]).toBe(before[1]);
         await expect(rows.nth(1)).toHaveAttribute('data-opc-id', before[2]);

         await rows.nth(0).locator('.opc-row__move-up').click();   // boundary: no-op
         await app.page.waitForTimeout(200);
         expect(await poolIds()).toEqual(after);

         await rows.nth(1).locator('.opc-row__move-down').click();
         await app.page.waitForTimeout(300);
         after = await poolIds();
         expect(after).toEqual(before);
         const plantilla = await app.getContext('plantilla');
         expect(plantilla.opciones.findIndex((o) => o.nombre === 'Viernes')).toBe(ownedBefore);
         expect(app.pageErrors).toEqual([]);
      });

      test('1.3.8: drag and drop reordena el pool', async ({ app }) => {
         await seedAsignacion(app);
         await app.navigateTo('/plantilla');
         await expect(app.page.locator('#opcList > *')).not.toHaveCount(0);
         await app.page.locator('slice-loading').waitFor({ state: 'detached', timeout: 10000 });
         const poolIds = async () => (await app.getContext('plantilla')).opciones.filter((o) => o.temaId == null).map((o) => String(o.id));
         const before = await poolIds();

         const ok = await app.page.evaluate(() => {
            const rows = document.querySelectorAll('#opcList slice-opcionrow');
            const fromRow = rows[0], toRow = rows[2];
            const fromPageY = fromRow.getBoundingClientRect().top + window.scrollY;
            const toPageY = toRow.getBoundingClientRect().top + window.scrollY;
            window.scrollTo(0, (fromPageY + toPageY) / 2 - window.innerHeight / 2);
            const f = fromRow.getBoundingClientRect(), t = toRow.getBoundingClientRect();
            const sx = f.left + 6, sy = f.top + 6;
            fromRow.dispatchEvent(new PointerEvent('pointerdown', { clientX: sx, clientY: sy, bubbles: true, cancelable: true }));
            if (!window.slice.getComponent('DragDropService')._activeSortable) return false;
            const targetY = t.top + t.height / 2 + 5;
            for (let i = 1; i <= 8; i++) document.dispatchEvent(new PointerEvent('pointermove', { clientX: sx, clientY: sy + (targetY - sy) * i / 8, bubbles: true, cancelable: true }));
            document.dispatchEvent(new PointerEvent('pointerup', { clientX: sx, clientY: targetY, bubbles: true, cancelable: true }));
            return true;
         });
         expect(ok).toBe(true);
         await app.page.waitForTimeout(400);

         const after = await poolIds();
         expect(after[0]).toBe(before[1]);
         expect(after[1]).toBe(before[2]);
         expect(after[2]).toBe(before[0]);
         expect(app.pageErrors).toEqual([]);
      });
   });

   test.describe('1.4 Atributos personalizados', () => {

      test('1.4.1: agrega atributo tipo texto', async ({ app }) => {
         await seedAsignacion(app);
         await app.navigateTo('/plantilla');
         await expect(app.page.locator('#catList > *')).not.toHaveCount(0);

         await app.fillInput('#atribAddLabelSlot input', 'Rol');
         // Type defaults to "texto"
         await app.clickAndWait('#atribAddBtnSlot .slice_button');

         const plantilla = await app.getContext('plantilla');
         const added = plantilla.atributos.find((a) => a.label === 'Rol');
         expect(added).toBeTruthy();
         expect(added.type).toBe('texto');
         expect(app.pageErrors).toEqual([]);
      });

      test('1.4.2: agrega atributo tipo lista', async ({ app }) => {
         await seedAsignacion(app);
         await app.navigateTo('/plantilla');
         await expect(app.page.locator('#catList > *')).not.toHaveCount(0);

         await app.fillInput('#atribAddLabelSlot input', 'Equipo');
         await app.selectOption('#atribAddTypeSlot .slice_select_container', 'Lista');
         await app.page.waitForTimeout(100);
         await app.clickAndWait('#atribAddBtnSlot .slice_button');

         const plantilla = await app.getContext('plantilla');
         const added = plantilla.atributos.find((a) => a.label === 'Equipo');
         expect(added).toBeTruthy();
         expect(added.type).toBe('lista');
         expect(app.pageErrors).toEqual([]);
      });

      test('1.4.3: elimina atributo existente', async ({ app }) => {
         await seedAsignacion(app);
         await app.navigateTo('/plantilla');
         await expect(app.page.locator('#catList > *')).not.toHaveCount(0);

         // Seed has 2 atributos: sexo, edad
         await expect(app.page.locator('#atribList slice-atributorow')).toHaveCount(2);

         // Remove the first one — confirm-gated now (it drops whatever every
         // Opción stored under that key).
         await app.page.locator('#atribList slice-atributorow').first().locator('.atr-row__remove').click();
         await app.confirmDialog();
         await app.page.waitForTimeout(300);

         const plantilla = await app.getContext('plantilla');
         // Should have 1 left — default seed had sexo + edad
         expect(plantilla.atributos.length).toBe(1);
         await expect(app.page.locator('#atribList slice-atributorow')).toHaveCount(1);
         expect(app.pageErrors).toEqual([]);
      });

      test('1.4.4: edita la etiqueta de un atributo y las opciones de uno tipo lista', async ({ app }) => {
         await seedAsignacion(app);
         await app.navigateTo('/plantilla');
         await expect(app.page.locator('#atribList slice-atributorow')).not.toHaveCount(0);

         // Seed's first atributo is `sexo`, type lista (M/F).
         const row = app.page.locator('#atribList slice-atributorow').first();
         const label = row.locator('.atr-row__label-slot input');
         const opts = row.locator('.atr-row__opts-slot input');
         await expect(opts).toBeVisible();

         await label.click();
         await label.fill('Género');
         await label.evaluate((el) => el.dispatchEvent(new Event('change', { bubbles: true })));
         await app.page.waitForTimeout(250);

         await opts.click();
         await opts.fill('M, F, X');
         await opts.evaluate((el) => el.dispatchEvent(new Event('change', { bubbles: true })));
         await app.page.waitForTimeout(250);

         const atributo = (await app.getContext('plantilla')).atributos.find((a) => a.key === 'sexo');
         expect(atributo.label).toBe('Género');
         expect(atributo.opciones).toEqual(['M', 'F', 'X']);
         expect(app.pageErrors).toEqual([]);
      });

      test('1.4.5: agregar un atributo sin nombre avisa y no crea nada', async ({ app }) => {
         await seedAsignacion(app);
         await app.navigateTo('/plantilla');
         await expect(app.page.locator('#atribList slice-atributorow')).not.toHaveCount(0);
         const before = (await app.getContext('plantilla')).atributos.length;

         await app.clickAndWait('#atribAddBtnSlot .slice_button');

         await expect(app.page.locator('#atribAddError')).toBeVisible();
         expect((await app.getContext('plantilla')).atributos.length).toBe(before);
         expect(app.pageErrors).toEqual([]);
      });
   });

   test.describe('1.5 Presets', () => {

      test('1.5.1: carga preset "Asignación" (confirma reemplazo)', async ({ app }) => {
         await seedAsignacion(app);
         await app.navigateTo('/plantilla');
         await expect(app.page.locator('#catList > *')).not.toHaveCount(0);

         // Open the presets <details> to reveal the grid
         await app.page.locator('.pb-presets summary').click();
         await app.page.waitForTimeout(200);

         // Click the preset — seed data exists, so confirm dialog appears
         await app.page.locator('[data-preset="asignacion"]').click();
         await app.page.waitForTimeout(300);
         await app.confirmDialog();

         const plantilla = await app.getContext('plantilla');
         expect(plantilla.temas.length).toBeGreaterThan(0);
         expect(plantilla.opciones.length).toBeGreaterThan(0);
         expect(app.pageErrors).toEqual([]);
      });

      test('1.5.2: carga preset "Votación / decisión" (confirma reemplazo)', async ({ app }) => {
         await seedAsignacion(app);
         await app.navigateTo('/plantilla');
         await expect(app.page.locator('#catList > *')).not.toHaveCount(0);

         await app.page.locator('.pb-presets summary').click();
         await app.page.waitForTimeout(200);

         await app.page.locator('[data-preset="votacion"]').click();
         await app.page.waitForTimeout(300);
         await app.confirmDialog();

         const plantilla = await app.getContext('plantilla');
         expect(plantilla.temas.length).toBe(1);
         expect(plantilla.temas[0].modo).toBe('votacion');
         expect(plantilla.opciones.length).toBe(4);
         expect(app.pageErrors).toEqual([]);
      });

      test('1.5.3: carga preset "Sí / No / Abstención"', async ({ app }) => {
         await seedAsignacion(app);
         await app.navigateTo('/plantilla');
         await expect(app.page.locator('#catList > *')).not.toHaveCount(0);

         await app.page.locator('.pb-presets summary').click();
         await app.page.waitForTimeout(200);

         await app.page.locator('[data-preset="sino"]').click();
         await app.page.waitForTimeout(300);
         await app.confirmDialog();

         const plantilla = await app.getContext('plantilla');
         expect(plantilla.temas.length).toBe(1);
         expect(plantilla.temas[0].modo).toBe('votacion');
         const inline = plantilla.opciones.filter((o) => o.temaId === plantilla.temas[0].id);
         expect(inline.length).toBe(3);
         expect(inline.map((o) => o.nombre)).toEqual(expect.arrayContaining(['Sí', 'No', 'Abstención']));
         expect(app.pageErrors).toEqual([]);
      });

      test('1.5.4: carga preset "Lluvia de ideas"', async ({ app }) => {
         await seedAsignacion(app);
         await app.navigateTo('/plantilla');
         await expect(app.page.locator('#catList > *')).not.toHaveCount(0);

         await app.page.locator('.pb-presets summary').click();
         await app.page.waitForTimeout(200);

         await app.page.locator('[data-preset="ideas"]').click();
         await app.page.waitForTimeout(300);
         await app.confirmDialog();

         const plantilla = await app.getContext('plantilla');
         expect(plantilla.temas.length).toBe(3);
         expect(plantilla.temas.every((t) => t.modo === 'texto_libre')).toBe(true);
         expect(plantilla.opciones.length).toBe(0);
         expect(app.pageErrors).toEqual([]);
      });

      test('1.5.5: carga preset "Priorización / ranking"', async ({ app }) => {
         await seedAsignacion(app);
         await app.navigateTo('/plantilla');
         await expect(app.page.locator('#catList > *')).not.toHaveCount(0);

         await app.page.locator('.pb-presets summary').click();
         await app.page.waitForTimeout(200);

         await app.page.locator('[data-preset="ranking"]').click();
         await app.page.waitForTimeout(300);
         await app.confirmDialog();

         const plantilla = await app.getContext('plantilla');
         expect(plantilla.temas.length).toBe(1);
         expect(plantilla.temas[0].modo).toBe('ranking');
         const inline = plantilla.opciones.filter((o) => o.temaId === plantilla.temas[0].id);
         expect(inline.length).toBe(6);
         expect(app.pageErrors).toEqual([]);
      });

      test('1.5.6: carga preset "Reunión (mixta)"', async ({ app }) => {
         await seedAsignacion(app);
         await app.navigateTo('/plantilla');
         await expect(app.page.locator('#catList > *')).not.toHaveCount(0);

         await app.page.locator('.pb-presets summary').click();
         await app.page.waitForTimeout(200);

         await app.page.locator('[data-preset="mixta"]').click();
         await app.page.waitForTimeout(300);
         await app.confirmDialog();

         const plantilla = await app.getContext('plantilla');
         expect(plantilla.temas.length).toBe(3);
         const modos = plantilla.temas.map((t) => t.modo);
         expect(modos).toContain('votacion');
         expect(modos).toContain('ranking');
         expect(modos).toContain('texto_libre');
         expect(app.pageErrors).toEqual([]);
      });

      test('1.5.7: cancela carga de preset con datos existentes', async ({ app }) => {
         await seedAsignacion(app);
         await app.navigateTo('/plantilla');
         await expect(app.page.locator('#catList > *')).not.toHaveCount(0);

         const temasBefore = (await app.getContext('plantilla')).temas.length;

         await app.page.locator('.pb-presets summary').click();
         await app.page.waitForTimeout(200);

         await app.page.locator('[data-preset="asignacion"]').click();
         await app.page.waitForTimeout(300);
         await app.cancelDialog();

         const temasAfter = (await app.getContext('plantilla')).temas.length;
         expect(temasAfter).toBe(temasBefore);
         expect(app.pageErrors).toEqual([]);
      });
   });

   test.describe('1.6 Nombre de plantilla', () => {

      test('1.6.2: nombre por defecto en seed', async ({ app }) => {
         await seedAsignacion(app);
         await app.navigateTo('/plantilla');
         await expect(app.page.locator('#catList > *')).not.toHaveCount(0);

         const nombre = (await app.getContext('plantilla')).nombre;
         expect(nombre).toBe('Mi Plantilla');
         expect(app.pageErrors).toEqual([]);
      });

      test('1.6.1: cambia nombre de plantilla', async ({ app }) => {
         await seedAsignacion(app);
         await app.navigateTo('/plantilla');
         await expect(app.page.locator('#catList > *')).not.toHaveCount(0);

         // The nombre input is built into #plantillaNombreSlot
         const nombreInput = app.page.locator('#plantillaNombreSlot input');
         await nombreInput.click();
         await nombreInput.fill('Mi plantilla personalizada');
         await nombreInput.evaluate((el) => el.dispatchEvent(new Event('change', { bubbles: true })));
         await app.page.waitForTimeout(200);

         const plantilla = await app.getContext('plantilla');
         expect(plantilla.nombre).toBe('Mi plantilla personalizada');
         expect(app.pageErrors).toEqual([]);
      });
   });

   test.describe('1.7 Filtros de temas', () => {

      test('1.7.1: filtra por modo "Asignación"', async ({ app }) => {
         await seedAsignacion(app);
         await app.navigateTo('/plantilla');
         await expect(app.page.locator('#catList > *')).not.toHaveCount(0);

         // Seed has 7 reparto + 2 texto_libre = 9 temas
         const allTemas = await app.page.locator('#catList slice-temarow').count();
         expect(allTemas).toBe(9);

         // Click the "Asignación" filter
         await app.page.locator('.pb-filter-btn[data-filter="reparto"]').click();
         await app.page.waitForTimeout(300);

         // 7 reparto temas should be visible
         const visibleTemas = await app.page.locator('#catList slice-temarow:not([hidden])').count();
         expect(visibleTemas).toBe(7);
         expect(app.pageErrors).toEqual([]);
      });

      test('1.7.2: filtra por modo "Texto libre"', async ({ app }) => {
         await seedAsignacion(app);
         await app.navigateTo('/plantilla');
         await expect(app.page.locator('#catList > *')).not.toHaveCount(0);

         await app.page.locator('.pb-filter-btn[data-filter="texto_libre"]').click();
         await app.page.waitForTimeout(300);

         const visibleTemas = await app.page.locator('#catList slice-temarow:not([hidden])').count();
         expect(visibleTemas).toBe(2);
         expect(app.pageErrors).toEqual([]);
      });

      test('1.7.3: vuelve a "Todas" después de filtrar', async ({ app }) => {
         await seedAsignacion(app);
         await app.navigateTo('/plantilla');
         await expect(app.page.locator('#catList > *')).not.toHaveCount(0);

         const allTemas = await app.page.locator('#catList slice-temarow:not([hidden])').count();
         expect(allTemas).toBe(9);

         await app.page.locator('.pb-filter-btn[data-filter="reparto"]').click();
         await app.page.waitForTimeout(300);
         let visible = await app.page.locator('#catList slice-temarow:not([hidden])').count();
         expect(visible).toBe(7);

         await app.page.locator('.pb-filter-btn[data-filter="all"]').click();
         await app.page.waitForTimeout(300);
         visible = await app.page.locator('#catList slice-temarow:not([hidden])').count();
         expect(visible).toBe(9);
         expect(app.pageErrors).toEqual([]);
      });

      test('1.7.4: filtro sin resultados muestra mensaje vacío', async ({ app }) => {
         await seedAsignacion(app);
         await app.navigateTo('/plantilla');
         await expect(app.page.locator('#catList > *')).not.toHaveCount(0);

         // Seed has 7 reparto + 2 texto_libre, no votacion temas
         // Filter for votacion — should show empty state
         await app.page.locator('.pb-filter-btn[data-filter="votacion"]').click();
         await app.page.waitForTimeout(300);

         await expect(app.page.locator('#catFilterEmpty')).toBeVisible();
         await expect(app.page.locator('#catFilterEmpty')).toContainText('No hay temas');
         expect(app.pageErrors).toEqual([]);
      });

   });

   test.describe('1.8 Reordenar temas', () => {
      async function getTemaIds(app) {
         const p = await app.getContext('plantilla');
         return p.temas.map((t) => t.id);
      }

      test('1.8.1: ▼ mueve primer tema al segundo lugar', async ({ app }) => {
         await seedAsignacion(app);
         await app.navigateTo('/plantilla');
         await expect(app.page.locator('#catList > *')).not.toHaveCount(0);

         const idsBefore = await getTemaIds(app);

         await app.page.locator('#catList slice-temarow').first().locator('.cat-row__move-down').click();
         await app.page.waitForTimeout(300);

         const idsAfter = await getTemaIds(app);
         expect(idsAfter[0]).toBe(idsBefore[1]);
         expect(idsAfter[1]).toBe(idsBefore[0]);
         expect(idsAfter.slice(2)).toEqual(idsBefore.slice(2));
         expect(app.pageErrors).toEqual([]);
      });

      test('1.8.2: ▲ mueve segundo tema al primer lugar', async ({ app }) => {
         await seedAsignacion(app);
         await app.navigateTo('/plantilla');
         await expect(app.page.locator('#catList > *')).not.toHaveCount(0);

         const idsBefore = await getTemaIds(app);

         await app.page.locator('#catList slice-temarow').nth(1).locator('.cat-row__move-up').click();
         await app.page.waitForTimeout(300);

         const idsAfter = await getTemaIds(app);
         expect(idsAfter[0]).toBe(idsBefore[1]);
         expect(idsAfter[1]).toBe(idsBefore[0]);
         expect(app.pageErrors).toEqual([]);
      });

      test('1.8.3: ▲ en primer tema es no-op (boundary)', async ({ app }) => {
         await seedAsignacion(app);
         await app.navigateTo('/plantilla');
         await expect(app.page.locator('#catList > *')).not.toHaveCount(0);

         const idsBefore = await getTemaIds(app);

         await app.page.locator('#catList slice-temarow').first().locator('.cat-row__move-up').click();
         await app.page.waitForTimeout(300);

         expect(await getTemaIds(app)).toEqual(idsBefore);
         expect(app.pageErrors).toEqual([]);
      });

      test('1.8.4: ▼ en último tema es no-op (boundary)', async ({ app }) => {
         await seedAsignacion(app);
         await app.navigateTo('/plantilla');
         await expect(app.page.locator('#catList > *')).not.toHaveCount(0);

         const idsBefore = await getTemaIds(app);
         const count = await app.page.locator('#catList slice-temarow').count();

         await app.page.locator('#catList slice-temarow').nth(count - 1).locator('.cat-row__move-down').click();
         await app.page.waitForTimeout(300);

         expect(await getTemaIds(app)).toEqual(idsBefore);
         expect(app.pageErrors).toEqual([]);
      });

      test('1.8.4b: con un filtro activo, ▲/▼ mueven respecto al vecino VISIBLE', async ({ app }) => {
         await seedAsignacion(app);
         await app.navigateTo('/plantilla');
         await expect(app.page.locator('#catList > *')).not.toHaveCount(0);
         const idsBefore = await getTemaIds(app);
         const rows = app.page.locator('#catList slice-temarow');

         // Seed: 7 reparto temas then 2 texto_libre. Under "Asignación", the last
         // reparto tema has no visible neighbour below → ▼ is a no-op (it used to
         // swap with a hidden texto tema and only its number changed).
         await app.page.locator('.pb-filter-btn[data-filter="reparto"]').click();
         await app.page.waitForTimeout(200);
         await rows.nth(6).locator('.cat-row__move-down').click();
         await app.page.waitForTimeout(300);
         expect(await getTemaIds(app)).toEqual(idsBefore);

         // Put one texto tema in the middle of the reparto ones, then under
         // "Texto libre" press ▲ on the other: it must jump over the four hidden
         // reparto rows and land right above its visible sibling.
         await app.page.evaluate(() => window.slice.getComponent('PlantillaService').reorderTemas(7, 3));
         await app.page.waitForTimeout(300);
         await app.page.locator('.pb-filter-btn[data-filter="texto_libre"]').click();
         await app.page.waitForTimeout(200);
         await rows.nth(8).locator('.cat-row__move-up').click();
         await app.page.waitForTimeout(300);
         const after = await getTemaIds(app);
         expect(after[3]).toBe('notas-adicionales');
         expect(after[4]).toBe('objetivos-generales');
         expect((await app.getContext('plantilla')).temas.map((t) => t.orden)).toEqual(after.map((_, i) => i + 1));
         expect(app.pageErrors).toEqual([]);
      });

      async function simulateDrag(app, fromIndex, toIndex) {
         // Scroll + drag in a single evaluate so rects are captured right
         // before pointerdown, with no interleaved autoScroll.
         const ok = await app.page.evaluate(({ fromIdx, toIdx }) => {
            const rows = document.querySelectorAll('#catList slice-temarow');
            const fromRow = rows[fromIdx];
            const toRow = rows[toIdx];
            if (!fromRow || !toRow) return false;

            // Scroll so the midpoint of the drag path is centred in the
            // viewport, keeping the pointer away from scroll edges.
            const fromPageY = fromRow.getBoundingClientRect().top + window.scrollY;
            const toPageY = toRow.getBoundingClientRect().top + window.scrollY;
            window.scrollTo(0, (fromPageY + toPageY) / 2 - window.innerHeight / 2);

            const fRect = fromRow.getBoundingClientRect();
            const tRect = toRow.getBoundingClientRect();

            // Grab point: .cat-row padding area (non-interactive)
            const sx = fRect.left + 6;
            const sy = fRect.top + 6;

            // Target just past the midpoint of the target row.
            const direction = Math.sign(toIdx - fromIdx);
            const dy = (tRect.top + tRect.height / 2 + direction * 5) - (fRect.top + 6);

            fromRow.dispatchEvent(new PointerEvent('pointerdown', {
               clientX: sx, clientY: sy, bubbles: true, cancelable: true,
            }));

            if (!window.slice?.getComponent?.('DragDropService')?._activeSortable) return false;

            const targetY = sy + dy;
            const steps = 8;
            for (let i = 1; i <= steps; i++) {
               document.dispatchEvent(new PointerEvent('pointermove', {
                  clientX: sx, clientY: sy + (targetY - sy) * i / steps,
                  bubbles: true, cancelable: true,
               }));
            }
            document.dispatchEvent(new PointerEvent('pointerup', {
               bubbles: true, cancelable: true,
            }));
            return true;
         }, { fromIdx: fromIndex, toIdx: toIndex });

         if (!ok) throw new Error('simulateDrag failed');
         await app.page.waitForTimeout(500);
      }

      test('1.8.5: mueve primer tema al tercer lugar con drag and drop', async ({ app }) => {
         await seedAsignacion(app);
         await app.navigateTo('/plantilla');
         await expect(app.page.locator('#catList > *')).not.toHaveCount(0);
         // Wait for loading overlay to disappear — it blocks pointer events
         await app.page.waitForFunction(() => {
            const el = document.elementFromPoint(100, 100);
            return !el?.closest?.('.full-screen');
         }, { timeout: 8000 }).catch(() => {});
         await app.page.waitForTimeout(200);

         const idsBefore = await getTemaIds(app);

         await simulateDrag(app, 0, 2);

         const idsAfter = await getTemaIds(app);
         expect(idsAfter[0]).toBe(idsBefore[1]);
         expect(idsAfter[1]).toBe(idsBefore[2]);
         expect(idsAfter[2]).toBe(idsBefore[0]);
         expect(app.pageErrors).toEqual([]);
      });

      test('1.8.6: mueve último tema al segundo lugar con drag and drop', async ({ app }) => {
         await seedAsignacion(app);
         await app.navigateTo('/plantilla');
         await expect(app.page.locator('#catList > *')).not.toHaveCount(0);
         await app.page.waitForFunction(() => {
            const el = document.elementFromPoint(100, 100);
            return !el?.closest?.('.full-screen');
         }, { timeout: 8000 }).catch(() => {});
         await app.page.waitForTimeout(200);

         const idsBefore = await getTemaIds(app);
         const count = await app.page.locator('#catList slice-temarow').count();

         // Ensure the last row is actually visible before dragging
         const lastRow = app.page.locator('#catList slice-temarow').last();
         await expect(lastRow).toBeVisible({ timeout: 5000 });

         await simulateDrag(app, count - 1, 1);

         const idsAfter = await getTemaIds(app);
         expect(idsAfter[1]).toBe(idsBefore[count - 1]);
         expect(app.pageErrors).toEqual([]);
      });
   });
 });
