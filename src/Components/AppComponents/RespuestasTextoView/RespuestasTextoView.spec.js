import { test, expect, waitForSliceReady } from '../../../../playwright/harness/sliceFixtures.js';

const TEXTO_PLANTILLA = {
   nombre: 'Texto Libre Test',
   atributos: [],
   temas: [
      { id: 'p1', nombre: '¿Qué opinás del proyecto?', modo: 'texto_libre', orden: 1, min: null, max: null, participable: false, meta: {} },
      { id: 'p2', nombre: '¿Qué mejorarías?', modo: 'texto_libre', orden: 2, min: null, max: null, participable: false, meta: {} },
   ],
   opciones: [],
};

test.describe('6. Llenar Respuestas — Texto libre', () => {

   test.describe('6.1 Escribir respuestas', () => {

      async function setupTexto(app) {
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
         }, TEXTO_PLANTILLA);
         await app.page.reload();
         await waitForSliceReady(app.page);
         await app.page.waitForTimeout(500);
         await app.navigateTo('/mis-respuestas');
         await expect(app.page.locator('slice-respuestastextoview')).toBeVisible({ timeout: 5000 });
      }

      test('6.1.1: escribe respuesta de texto y se guarda', async ({ app }) => {
         await setupTexto(app);

         const editor = app.page.locator('slice-textocard slice-enhancededitor [data-tiptap]').first();
         await expect(editor).toBeVisible();

         const text = 'Esta es mi respuesta de prueba';
         await editor.click();
         await editor.fill(text);

         // Click title to trigger blur → save
         await app.page.locator('slice-textocard .rt-title').first().click();
         await app.page.waitForTimeout(600);

         const respuestas = await app.getContext('respuestas');
         const temaId = await app.page.locator('slice-textocard').first().evaluate((el) => el.temaId);
         expect(respuestas.texto[temaId]).toBeTruthy();
         expect(respuestas.texto[temaId]).toContain(text);
         expect(app.pageErrors).toEqual([]);
      });

      test('6.1.2: modifica respuesta existente', async ({ app }) => {
         await setupTexto(app);

         const editor = app.page.locator('slice-textocard slice-enhancededitor [data-tiptap]').first();
         await expect(editor).toBeVisible();

         const temaId = await app.page.locator('slice-textocard').first().evaluate((el) => el.temaId);

         // Write initial
         await editor.click();
         await editor.fill('Primera versión');
         await app.page.locator('slice-textocard .rt-title').first().click();
         await app.page.waitForTimeout(600);

         let respuestas = await app.getContext('respuestas');
         expect(respuestas.texto[temaId]).toContain('Primera versión');

         // Modify
         await editor.click();
         await editor.fill('Versión modificada');
         await app.page.locator('slice-textocard .rt-title').first().click();
         await app.page.waitForTimeout(600);

         respuestas = await app.getContext('respuestas');
         expect(respuestas.texto[temaId]).toContain('Versión modificada');
         expect(respuestas.texto[temaId]).not.toContain('Primera versión');
         expect(app.pageErrors).toEqual([]);
      });

      test('6.1.3: modo "Una por una" (single) muestra navegación', async ({ app }) => {
         await setupTexto(app);

         const singleBtn = app.page.locator('[data-rtmode="single"]');
         await expect(singleBtn).toBeVisible();

         // Default is single — nav arrows exist with correct disabled state
         const prevBtn = app.page.locator('.cv-arrow[data-cvdir="prev"]');
         const nextBtn = app.page.locator('.cv-arrow[data-cvdir="next"]');
         await expect(prevBtn).toBeVisible();
         await expect(nextBtn).toBeVisible();
         await expect(prevBtn).toBeDisabled();
         await expect(nextBtn).toBeEnabled();

         // Click next → navigate forward
         await nextBtn.click();
         await app.page.waitForTimeout(300);
         await expect(prevBtn).toBeEnabled();
         await expect(nextBtn).toBeDisabled();

         // Click prev → navigate back
         await prevBtn.click();
         await app.page.waitForTimeout(300);
         await expect(prevBtn).toBeDisabled();
         await expect(nextBtn).toBeEnabled();

         expect(app.pageErrors).toEqual([]);
      });

      test('6.1.4: modo "Dos columnas" se activa', async ({ app }) => {
         await setupTexto(app);

         const columnsBtn = app.page.locator('[data-rtmode="columns"]');
         await expect(columnsBtn).toBeVisible();
         await columnsBtn.click();
         await app.page.waitForTimeout(300);

         await expect(columnsBtn).toHaveClass(/active/);
         expect(app.pageErrors).toEqual([]);
      });

      test('6.1.5: modo "Ver todas" (grid) se activa', async ({ app }) => {
         await setupTexto(app);

         const gridBtn = app.page.locator('[data-rtmode="grid"]');
         await expect(gridBtn).toBeVisible();
         await gridBtn.click();
         await app.page.waitForTimeout(300);

         await expect(gridBtn).toHaveClass(/active/);
         expect(app.pageErrors).toEqual([]);
      });

      test('6.1.6: abre fullscreen del editor', async ({ app }) => {
         await setupTexto(app);

         // Click expand button on first card
         await app.page.locator('.rt-expand').first().click();
         await app.page.waitForTimeout(300);

         // Fullscreen overlay visible
         await expect(app.page.locator('.rt-fs')).toBeVisible();
         await expect(app.page.locator('.rt-fs__editor-slot slice-enhancededitor')).toBeVisible();
         expect(app.pageErrors).toEqual([]);
      });

      test('6.1.7: cierra fullscreen con botón ✕', async ({ app }) => {
         await setupTexto(app);

         // Open
         await app.page.locator('.rt-expand').first().click();
         await app.page.waitForTimeout(300);
         await expect(app.page.locator('.rt-fs')).toBeVisible();

         // Close with ✕ Cerrar
         await app.page.locator('.rt-fs__close-slot .slice_button').click();
         await app.page.waitForTimeout(300);

         await expect(app.page.locator('.rt-fs')).not.toBeVisible();
         expect(app.pageErrors).toEqual([]);
      });

      test('6.1.8: escribe en fullscreen y se guarda al cerrar', async ({ app }) => {
         await setupTexto(app);

         const fsTemaId = await app.page.locator('slice-textocard').first().evaluate((el) => el.temaId);

         // Open fullscreen on first card
         await app.page.locator('.rt-expand').first().click();
         await app.page.waitForTimeout(300);

         // Type in fullscreen editor
         const fsEditor = app.page.locator('.rt-fs__editor-slot slice-enhancededitor [data-tiptap]');
         await expect(fsEditor).toBeVisible();
         await fsEditor.click();
         await fsEditor.fill('Respuesta desde fullscreen');

         // Close → should save
         await app.page.locator('.rt-fs__close-slot .slice_button').click();
         await app.page.waitForTimeout(300);

         const respuestas = await app.getContext('respuestas');
         expect(respuestas.texto[fsTemaId]).toContain('Respuesta desde fullscreen');
         expect(app.pageErrors).toEqual([]);
      });
   });
});
