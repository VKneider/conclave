import { test, expect } from '../../../playwright/harness/sliceFixtures.js';
import { seedAsignacion } from '../../../playwright/harness/seedHelpers.js';
import LZString from 'lz-string';

const SIMPLE_PLANTILLA = {
  nombre: 'Plantilla Simple',
  temas: [
    { id: 't1', nombre: 'Feedback General', modo: 'texto_libre', orden: 0, participable: true },
    { id: 't2', nombre: 'Prioridades', modo: 'texto_libre', orden: 1, participable: true },
  ],
  opciones: [],
  atributos: [],
};

function makeFile(data) {
  return {
    name: `${data.nombre || 'plantilla'}.plantilla`,
    mimeType: 'application/octet-stream',
    buffer: Buffer.from(JSON.stringify(data)),
  };
}

function packForURI(data) {
  const FULL_TO_SHORT = {
    tipo: 't', nombre: 'n', email: 'e',
    temas: 'ts', opciones: 'os', atributos: 'at',
    respuestas: 'rs', autor: 'a',
    seleccion: 'sl', texto: 'tx', voto: 'vt', ranking: 'rk',
    modo: 'm', orden: 'o', participable: 'p', meta: 'mt', temaId: 'ti',
    key: 'k', label: 'l', type: 'tp',
  };
  function mapKeys(obj) {
    if (Array.isArray(obj)) return obj.map(mapKeys);
    if (obj && typeof obj === 'object') {
      return Object.fromEntries(
        Object.entries(obj).map(([k, v]) => [FULL_TO_SHORT[k] || k, mapKeys(v)])
      );
    }
    return obj;
  }
  return mapKeys(data);
}

function makePlantillaHash(data) {
  const packed = packForURI(data);
  const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(packed));
  return `#plantilla=${compressed}`;
}

test.describe('11. Importar Plantilla', () => {

  test.describe('11.1 Importar desde PlantillaBuilderView', () => {

    test('11.1.1: importar archivo de plantilla y confirmar', async ({ app }) => {
      await seedAsignacion(app);
      await app.navigateTo('/plantilla');
      await app.page.waitForTimeout(500);

      await app.page.evaluate(() => {
        const rs = window.slice.getComponent('RespuestasService');
        rs.assignOpcion('3', 'transporte');
        rs.setTexto('objetivos-generales', 'test');
      });
      await app.page.waitForTimeout(200);

      await app.page.locator('#importPlantillaFile').setInputFiles(makeFile(SIMPLE_PLANTILLA));
      await app.page.waitForTimeout(1500);

      await app.page.waitForSelector('[slice-id="confirmActionDialog"]', { state: 'attached', timeout: 5000 });
      await app.confirmDialog();
      await app.page.waitForTimeout(500);

      const nombreFinal = (await app.getContext('plantilla'))?.nombre;
      expect(nombreFinal).toBe('Plantilla Simple');
      expect(app.pageErrors).toEqual([]);
    });

    test('11.1.2: importar plantilla cancelando', async ({ app }) => {
      await seedAsignacion(app);
      await app.navigateTo('/plantilla');
      await app.page.waitForTimeout(500);

      const plantillaBefore = await app.getContext('plantilla');

      await app.page.evaluate(() => {
        const rs = window.slice.getComponent('RespuestasService');
        rs.assignOpcion('5', 'bienvenida');
        rs.setTexto('objetivos-generales', 'test');
      });
      await app.page.waitForTimeout(200);

      await app.page.locator('#importPlantillaFile').setInputFiles(makeFile(SIMPLE_PLANTILLA));
      await app.page.waitForTimeout(1500);

      await app.page.waitForSelector('[slice-id="confirmActionDialog"]', { state: 'attached', timeout: 5000 });
      await app.cancelDialog();
      await app.page.waitForTimeout(300);

      const plantillaAfter = await app.getContext('plantilla');
      expect(plantillaAfter?.nombre).toBe(plantillaBefore?.nombre);
      expect(app.pageErrors).toEqual([]);
    });

    test('11.1.3: importar plantilla inválida', async ({ app }) => {
      await seedAsignacion(app);
      await app.navigateTo('/plantilla');
      await app.page.waitForTimeout(500);

      await app.page.locator('#importPlantillaFile').setInputFiles({
        name: 'invalid.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('not valid json'),
      });
      await app.page.waitForTimeout(1000);

      await expect(app.page.locator('.slice-toast--error')).toBeVisible({ timeout: 3000 });
      expect(app.pageErrors).toEqual([]);
    });

  });

  test.describe('11.2 Importar desde CompareView / URL', () => {

    test('11.2.1: ver seccion de import por URL en CompareView', async ({ app }) => {
      await seedAsignacion(app);
      await app.navigateTo('/comparar');
      await app.page.waitForTimeout(500);

      const details = app.page.locator('.cmp-url-import');
      await expect(details).toBeVisible();
      await details.locator('summary').click();
      await app.page.waitForTimeout(200);
      await expect(details.locator('.cmp-url-import__input')).toBeVisible();
      await expect(details.locator('.cmp-url-import__btn')).toBeVisible();
      expect(app.pageErrors).toEqual([]);
    });

    test('11.2.2: importar plantilla desde URL con hash', async ({ app }) => {
      const plantillaData = {
        tipo: 'plantilla', nombre: 'Importada por URL', autor: 'Test',
        temas: [{ id: 'x1', nombre: 'Tema URL', modo: 'texto_libre', orden: 0, participable: true }],
        opciones: [], atributos: [],
      };

      const hash = makePlantillaHash(plantillaData);
      await app.page.goto('/' + hash);
      await app.page.waitForFunction(
        () => window.slice?.context?.getState?.('plantilla')?.nombre === 'Importada por URL',
        { timeout: 12000 }
      );

      const plantilla = await app.getContext('plantilla');
      expect(plantilla.nombre).toBe('Importada por URL');
      expect(app.pageErrors).toEqual([]);
    });

  });

});
