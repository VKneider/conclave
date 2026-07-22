import { test, expect } from '../../../playwright/harness/sliceFixtures.js';
import { seedAsignacion, injectPlantilla } from '../../../playwright/harness/seedHelpers.js';

const VOTACION_PLANTILLA = {
  nombre: 'Test Votacion',
  atributos: [],
  temas: [{ id: 'v1', nombre: 'Votacion Test', modo: 'votacion', orden: 0, participable: true }],
  opciones: [
    { id: 1, temaId: 'v1', nombre: 'Opcion A' },
    { id: 2, temaId: 'v1', nombre: 'Opcion B' },
  ],
};

const RANKING_PLANTILLA = {
  nombre: 'Test Ranking',
  atributos: [],
  temas: [{ id: 'r1', nombre: 'Ranking Test', modo: 'ranking', orden: 0, participable: true }],
  opciones: [
    { id: 10, temaId: 'r1', nombre: 'Item 1' },
    { id: 11, temaId: 'r1', nombre: 'Item 2' },
    { id: 12, temaId: 'r1', nombre: 'Item 3' },
  ],
};

async function reloadAndWait(app) {
  await app.page.reload();
  await app.page.waitForFunction(
    () => !!(window.slice && typeof window.slice.build === 'function'),
    { timeout: 10000 }
  );
  await app.page.waitForFunction(() => {
    try { return !!window.slice.getComponent('PlantillaService'); }
    catch { return false; }
  }, { timeout: 8000 });
  await app.page.waitForTimeout(200);
}

test.describe('7. Persistencia al recargar', () => {

  test('7.1.1: persistir plantilla', async ({ app }) => {
    await seedAsignacion(app);
    await app.page.waitForFunction(() => {
      try { return !!window.slice.getComponent('PlantillaService'); }
      catch { return false; }
    }, { timeout: 8000 });

    await app.page.evaluate(() => {
      const ps = window.slice.getComponent('PlantillaService');
      ps.setNombre('Nombre Persistido');
    });
    await app.page.waitForTimeout(300);

    await reloadAndWait(app);

    const plantilla = await app.getContext('plantilla');
    expect(plantilla.nombre).toBe('Nombre Persistido');
    expect(app.pageErrors).toEqual([]);
  });

  test('7.1.2: persistir respuestas asignacion', async ({ app }) => {
    await seedAsignacion(app);
    await app.page.waitForFunction(() => {
      try { return !!window.slice.getComponent('RespuestasService'); }
      catch { return false; }
    }, { timeout: 8000 });

    await app.page.evaluate(() => {
      const rs = window.slice.getComponent('RespuestasService');
      rs.assignOpcion('3', 'transporte');
      rs.assignOpcion('7', 'anfitriones');
    });
    await app.page.waitForTimeout(300);

    await reloadAndWait(app);

    const respuestas = await app.getContext('respuestas');
    expect(respuestas.seleccion['3']).toBe('transporte');
    expect(respuestas.seleccion['7']).toBe('anfitriones');
    expect(app.pageErrors).toEqual([]);
  });

  test('7.1.3: persistir respuestas votacion', async ({ app }) => {
    await injectPlantilla(app, VOTACION_PLANTILLA);
    await app.page.waitForFunction(() => {
      try { return !!window.slice.getComponent('RespuestasService'); }
      catch { return false; }
    }, { timeout: 8000 });

    await app.page.evaluate(() => {
      const rs = window.slice.getComponent('RespuestasService');
      rs.setVoto('v1', 1);
    });
    await app.page.waitForTimeout(300);

    await reloadAndWait(app);

    const respuestas = await app.getContext('respuestas');
    expect(respuestas.voto['v1']).toBe(1);
    expect(app.pageErrors).toEqual([]);
  });

  test('7.1.4: persistir respuestas ranking', async ({ app }) => {
    await injectPlantilla(app, RANKING_PLANTILLA);
    await app.page.waitForFunction(() => {
      try { return !!window.slice.getComponent('RespuestasService'); }
      catch { return false; }
    }, { timeout: 8000 });

    await app.page.evaluate(() => {
      const rs = window.slice.getComponent('RespuestasService');
      rs.setRanking('r1', [10, 11, 12]);
    });
    await app.page.waitForTimeout(300);

    await reloadAndWait(app);

    const respuestas = await app.getContext('respuestas');
    expect(respuestas.ranking['r1']).toEqual([10, 11, 12]);
    expect(app.pageErrors).toEqual([]);
  });

  test('7.1.5: persistir respuestas texto', async ({ app }) => {
    await seedAsignacion(app);
    await app.page.waitForFunction(() => {
      try { return !!window.slice.getComponent('RespuestasService'); }
      catch { return false; }
    }, { timeout: 8000 });

    await app.page.evaluate(() => {
      const rs = window.slice.getComponent('RespuestasService');
      rs.setTexto('objetivos-generales', 'Texto persistido');
    });
    await app.page.waitForTimeout(300);

    await reloadAndWait(app);

    const respuestas = await app.getContext('respuestas');
    expect(respuestas.texto['objetivos-generales']).toBe('Texto persistido');
    expect(app.pageErrors).toEqual([]);
  });

  test('7.1.6: persistir settings', async ({ app }) => {
    await app.page.waitForFunction(() => {
      try { return !!window.slice.getComponent('SettingsService'); }
      catch { return false; }
    }, { timeout: 8000 });

    await app.page.evaluate(() => {
      const ss = window.slice.getComponent('SettingsService');
      ss.setAutor('Test User');
      ss.setEmail('test@example.com');
    });
    await app.page.waitForTimeout(300);

    await reloadAndWait(app);

    const settings = await app.getContext('settings');
    expect(settings.autor).toBe('Test User');
    expect(settings.email).toBe('test@example.com');
    expect(app.pageErrors).toEqual([]);
  });

  test('7.1.7: persistir decisiones finales', async ({ app }) => {
    await seedAsignacion(app);
    await app.page.waitForFunction(() => {
      try { return !!window.slice.getComponent('ConsensoService'); }
      catch { return false; }
    }, { timeout: 8000 });

    await app.page.evaluate(() => {
      const cs = window.slice.getComponent('ConsensoService');
      const state = cs.getState();
      state.seleccion['3'] = 'transporte';
      state.texto['objetivos-generales'] = 'Decision final texto';
      window.slice.context.setState('decisionFinal', state);
    });
    await app.page.waitForTimeout(300);

    await reloadAndWait(app);

    const df = await app.getContext('decisionFinal');
    expect(df.seleccion['3']).toBe('transporte');
    expect(df.texto['objetivos-generales']).toBe('Decision final texto');
    expect(app.pageErrors).toEqual([]);
  });

  test('7.1.8: persistir respuestas importadas', async ({ app }) => {
    await seedAsignacion(app);
    await app.page.waitForFunction(() => {
      try { return !!window.slice.getComponent('RespuestasImportService'); }
      catch { return false; }
    }, { timeout: 8000 });

    await app.page.evaluate(() => {
      const ris = window.slice.getComponent('RespuestasImportService');
      ris.import({ respuestas: { seleccion: { '3': 'transporte' }, texto: {}, voto: {}, ranking: {} }, autor: 'Pedro' }, 'Pedro');
    });
    await app.page.waitForTimeout(300);

    await reloadAndWait(app);

    const sources = await app.getContext('respuestasImportadas');
    expect(Array.isArray(sources)).toBe(true);
    expect(sources.length).toBe(1);
    expect(sources[0].autor).toBe('Pedro');
    expect(app.pageErrors).toEqual([]);
  });

});
