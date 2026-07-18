import { test, expect } from '../../../../playwright/harness/sliceFixtures.js';

test.describe('PlantillaBuilderView', () => {

   test('smoke: app boots and navigates to /plantilla', async ({ app }) => {
      await app.resetState();
      await app.navigateTo('/plantilla');

      await expect(app.page.locator('.view-title')).toHaveText('Plantilla');
      expect(app.pageErrors).toEqual([]);
   });

   test.describe('1.1 CRUD temas', () => {

      test('1.1.1: agrega tema "Logística" modo reparto', async ({ app }) => {
         await app.resetState();
         await app.navigateTo('/plantilla');
         await expect(app.page.locator('#catList > *')).not.toHaveCount(0);

         await app.fillInput('#addCatSlot input', 'Logística');
         await app.clickAndWait('#addCatBtn');

         const plantilla = await app.getContext('plantilla');
         const added = plantilla.temas.find((t) => t.nombre === 'Logística');
         expect(added).toBeTruthy();
         expect(added.modo).toBe('reparto');
         expect(app.pageErrors).toEqual([]);
      });

      test('1.1.2: agrega tema luego cambia a modo votación', async ({ app }) => {
         await app.resetState();
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
         await app.resetState();
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
         await app.resetState();
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
         await app.resetState();
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
         await app.resetState();
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
         await app.resetState();
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
         await app.resetState();
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
         await app.resetState();
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

      test('1.2.2: elimina opción inline de tema votación', async ({ app }) => {
         await app.resetState();
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
         await app.resetState();
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
         await app.resetState();
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
         await app.resetState();
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
         await app.resetState();
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
   });

   test.describe('1.4 Atributos personalizados', () => {

      test('1.4.1: agrega atributo tipo texto', async ({ app }) => {
         await app.resetState();
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
         await app.resetState();
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
         await app.resetState();
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
         await app.resetState();
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
         await app.resetState();
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
   });

   test.describe('1.6 Nombre de plantilla', () => {

      test('1.6.1: cambia nombre de plantilla', async ({ app }) => {
         await app.resetState();
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
         await app.resetState();
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
         await app.resetState();
         await app.navigateTo('/plantilla');
         await expect(app.page.locator('#catList > *')).not.toHaveCount(0);

         // Click "Texto libre" filter
         await app.page.locator('.pb-filter-btn[data-filter="texto_libre"]').click();
         await app.page.waitForTimeout(300);

         const visibleTemas = await app.page.locator('#catList slice-temarow:not([hidden])').count();
         expect(visibleTemas).toBe(2);
         expect(app.pageErrors).toEqual([]);
      });
   });
});
