import { test, expect } from '../../../playwright/harness/sliceFixtures.js';
import { seedAsignacion, injectPlantilla } from '../../../playwright/harness/seedHelpers.js';

const PEDRO_RESPUESTAS = {
  autor: 'Pedro',
  respuestas: {
    seleccion: { '3': 'transporte', '5': 'bienvenida', '7': 'anfitriones' },
    texto: { 'objetivos-generales': 'Mejorar coordinación', 'notas-adicionales': 'Gran evento' },
    voto: {},
    ranking: {},
  },
};

const MARIA_RESPUESTAS = {
  autor: 'Maria',
  respuestas: {
    seleccion: { '3': 'banda-en-vivo', '4': 'cafeteria', '6': 'transporte' },
    texto: { 'objetivos-generales': 'Enfoque en logística' },
    voto: {},
    ranking: {},
  },
};

function makeFile(data) {
  return {
    name: `${data.autor}.respuestas`,
    mimeType: 'application/octet-stream',
    buffer: Buffer.from(JSON.stringify(data)),
  };
}

test.describe('10. Importar Respuestas', () => {

  test.describe('10.1 ImportDrop', () => {

    test('10.1.1: ver ImportDrop en CompareView', async ({ app }) => {
      await seedAsignacion(app);
      await app.navigateTo('/comparar');
      await app.page.waitForTimeout(500);

      await expect(app.page.locator('#drop')).toBeVisible();
      expect(app.pageErrors).toEqual([]);
    });

    test('10.1.2: importar archivo de respuestas', async ({ app }) => {
      await seedAsignacion(app);
      await app.navigateTo('/comparar');
      await app.page.waitForTimeout(500);

      await app.page.locator('.import-drop__input').setInputFiles(makeFile(PEDRO_RESPUESTAS));
      await app.page.waitForTimeout(500);

      const names = await app.page.locator('.source-list .source-tag .source-tag__name').allTextContents();
      expect(names.join(' ')).toContain('Pedro');
      expect(app.pageErrors).toEqual([]);
    });

    test('10.1.3: mostrar drag feedback', async ({ app }) => {
      await seedAsignacion(app);
      await app.navigateTo('/comparar');
      await app.page.waitForTimeout(500);

      await app.page.locator('#drop').evaluate((el) => el.dispatchEvent(new DragEvent('dragenter')));
      await expect(app.page.locator('#drop')).toHaveClass(/drag/);

      await app.page.locator('#drop').evaluate((el) => el.dispatchEvent(new DragEvent('dragleave')));
      await expect(app.page.locator('#drop')).not.toHaveClass(/drag/);
      expect(app.pageErrors).toEqual([]);
    });

    test('10.1.4: importar múltiples archivos', async ({ app }) => {
      await seedAsignacion(app);
      await app.navigateTo('/comparar');
      await app.page.waitForTimeout(500);

      await app.page.locator('.import-drop__input').setInputFiles([
        makeFile(PEDRO_RESPUESTAS),
        makeFile(MARIA_RESPUESTAS),
      ]);
      await app.page.waitForTimeout(500);

      const sourceTags = app.page.locator('.source-list .source-tag');
      const names = await sourceTags.locator('.source-tag__name').allTextContents();
      const namesStr = names.join(' ');
      expect(namesStr).toContain('Pedro');
      expect(namesStr).toContain('Maria');
      expect(app.pageErrors).toEqual([]);
    });

    test('10.1.5: importar archivo inválido', async ({ app }) => {
      await seedAsignacion(app);
      await app.navigateTo('/comparar');
      await app.page.waitForTimeout(500);

      await app.page.locator('.import-drop__input').setInputFiles({
        name: 'invalid.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('not valid json'),
      });
      await app.page.waitForTimeout(750);

      const names = await app.page.locator('.source-list .source-tag .source-tag__name').allTextContents();
      expect(names.length).toBe(1);
      expect(names[0]).toContain('Yo');
      await expect(app.page.locator('.slice-toast--error')).toBeVisible({ timeout: 3000 });
    });

    test('10.1.6: ver source tags después de importar', async ({ app }) => {
      await seedAsignacion(app);
      await app.navigateTo('/comparar');
      await app.page.waitForTimeout(500);

      await app.page.locator('.import-drop__input').setInputFiles(makeFile(PEDRO_RESPUESTAS));
      await app.page.waitForTimeout(500);

      const sourceTag = app.page.locator('.source-list .source-tag .source-tag__name');
      const names = await sourceTag.allTextContents();
      expect(names.join(' ')).toContain('Pedro');
      await expect(app.page.locator('.source-list .source-tag .swatch').first()).toBeVisible();
      expect(app.pageErrors).toEqual([]);
    });

  });

  test.describe('10.2 Importar respuestas desde UserMenu', () => {

    test('10.2.1: importar mis respuestas con confirmación', async ({ app }) => {
      await seedAsignacion(app);
      await app.navigateTo('/plantilla');
      await app.page.waitForTimeout(500);

      await app.page.locator('.user-menu__trigger').click();
      await app.page.waitForTimeout(200);

      await app.page.locator('[data-el="importFile"]').setInputFiles(makeFile(PEDRO_RESPUESTAS));
      await app.page.waitForTimeout(500);

      const confirmDialog = app.page.locator('[slice-id="confirmActionDialog"]');
      await expect(confirmDialog).toBeVisible();
      await app.confirmDialog();
      await app.page.waitForTimeout(500);

      const respuestas = await app.getContext('respuestas');
      expect(respuestas.seleccion['3']).toBe('transporte');
      expect(app.pageErrors).toEqual([]);
    });

    test('10.2.2: cancelar importación de respuestas', async ({ app }) => {
      await seedAsignacion(app);
      await app.navigateTo('/plantilla');
      await app.page.waitForTimeout(500);

      const respuestasBefore = await app.getContext('respuestas');

      await app.page.locator('.user-menu__trigger').click();
      await app.page.waitForTimeout(200);

      await app.page.locator('[data-el="importFile"]').setInputFiles(makeFile(PEDRO_RESPUESTAS));
      await app.page.waitForTimeout(500);

      const confirmDialog = app.page.locator('[slice-id="confirmActionDialog"]');
      await expect(confirmDialog).toBeVisible();
      await app.cancelDialog();
      await app.page.waitForTimeout(300);

      const respuestasAfter = await app.getContext('respuestas');
      expect(respuestasAfter.seleccion).toEqual(respuestasBefore.seleccion);
      expect(app.pageErrors).toEqual([]);
    });

  });

});
