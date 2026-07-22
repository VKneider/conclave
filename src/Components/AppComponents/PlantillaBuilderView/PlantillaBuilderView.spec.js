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

         await app.fillInput('#addCatSlot input', 'Logística');
         await app.clickAndWait('#addCatBtn');

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

         await app.fillInput('#addCatSlot input', 'Elegir fecha');
         await app.clickAndWait('#addCatBtn');

         // New tema is inserted at the TOP of the list (by orden)
         const addedRow = app.page.locator('#catList slice-temarow').first();
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

         await app.fillInput('#addCatSlot input', 'Priorizar ideas');
         await app.clickAndWait('#addCatBtn');

         const addedRow = app.page.locator('#catList slice-temarow').first();
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

         await app.fillInput('#addCatSlot input', 'Sugerencias libres');
         await app.clickAndWait('#addCatBtn');

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
         const nameInput = firstRow.locator('.cat-row__name-slot input');
         await nameInput.click();
         await nameInput.fill('Coordinación Modificada');
         await nameInput.evaluate((el) => el.dispatchEvent(new Event('change', { bubbles: true })));
         await app.page.waitForTimeout(200);

         const plantilla = await app.getContext('plantilla');
         const edited = plantilla.temas.find((t) => t.id === 'coordinacion-principal');
         expect(edited.nombre).toBe('Coordinación Modificada');
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
   });

   test.describe('1.2 Opciones por tema (inline)', () => {

      test('1.2.1: agrega opción inline a tema votación', async ({ app }) => {
         await seedAsignacion(app);
         await app.navigateTo('/plantilla');
         await expect(app.page.locator('#catList > *')).not.toHaveCount(0);

         // Add a tema then change its modo to votacion
         await app.fillInput('#addCatSlot input', '¿Dónde cenamos?');
         await app.clickAndWait('#addCatBtn');

         const temaRow = app.page.locator('#catList slice-temarow').first();
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
         await temaRow.locator('.cat-row__opc-add-btn').click();
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

         await app.fillInput('#addCatSlot input', '¿Dónde cenamos?');
         await app.clickAndWait('#addCatBtn');

         const temaRow = app.page.locator('#catList slice-temarow').first();
         await temaRow.locator('.cat-row__modo-slot slice-select').waitFor({ state: 'attached', timeout: 5000 });
         await app.page.waitForTimeout(500);
         await app.selectOption(temaRow.locator('.cat-row__modo-slot .slice_select_container'), 'Votación');
         await app.page.waitForTimeout(300);

         await temaRow.locator('.cat-row__toggle').click();
         await app.page.waitForTimeout(200);

         await temaRow.locator('.cat-row__opc-add').fill('Restaurante A');
         await temaRow.locator('.cat-row__opc-add-btn').click();
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
         await app.fillInput('#addCatSlot input', '¿Dónde cenamos?');
         await app.clickAndWait('#addCatBtn');

         const temaRow = app.page.locator('#catList slice-temarow').first();
         await temaRow.locator('.cat-row__modo-slot slice-select').waitFor({ state: 'attached', timeout: 5000 });
         await app.page.waitForTimeout(500);
         await app.selectOption(temaRow.locator('.cat-row__modo-slot .slice_select_container'), 'Votación');
         await app.page.waitForTimeout(300);

         await temaRow.locator('.cat-row__toggle').click();
         await app.page.waitForTimeout(200);

         await temaRow.locator('.cat-row__opc-add').fill('Restaurante A');
         await temaRow.locator('.cat-row__opc-add-btn').click();
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
         await app.clickAndWait('#addOpcBtn');

         const plantilla = await app.getContext('plantilla');
         const added = plantilla.opciones.find((o) => o.nombre === 'Juan Pérez');
         expect(added).toBeTruthy();
         expect(added.temaId).toBeNull();
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

         await app.page.locator('#opcBulkDelete').click();
         await app.confirmDialog();

         const newCount = await app.page.locator('#opcList > *').count();
         expect(newCount).toBe(initialCount - 2);
         expect(app.pageErrors).toEqual([]);
      });

      test('1.3.6: borrar todas las opciones', async ({ app }) => {
         await seedAsignacion(app);
         await app.navigateTo('/plantilla');
         await expect(app.page.locator('#opcList > *')).not.toHaveCount(0);

         await app.page.locator('#opcClearAll').click();
         await app.confirmDialog();

         await expect(app.page.locator('#opcList > *')).toHaveCount(0);
         expect(app.pageErrors).toEqual([]);
      });
   });

   test.describe('1.4 Atributos personalizados', () => {

      test('1.4.1: agrega atributo tipo texto', async ({ app }) => {
         await seedAsignacion(app);
         await app.navigateTo('/plantilla');
         await expect(app.page.locator('#catList > *')).not.toHaveCount(0);

         await app.fillInput('#atribAddLabel', 'Rol');
         // Type defaults to "texto"
         await app.clickAndWait('#atribAddBtn');

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

         await app.fillInput('#atribAddLabel', 'Equipo');
         await app.page.selectOption('#atribAddType', 'lista');
         await app.page.waitForTimeout(100);
         await app.clickAndWait('#atribAddBtn');

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

         // Remove the first one
         await app.page.locator('[data-atrib-remove]').first().click();
         await app.page.waitForTimeout(300);

         const plantilla = await app.getContext('plantilla');
         // Should have 1 left — default seed had sexo + edad
         expect(plantilla.atributos.length).toBe(1);
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
