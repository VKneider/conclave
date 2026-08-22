import { test, expect } from '../../../../playwright/harness/sliceFixtures.js';

const TEMA_ID = 't1';
const SOURCES = [
  { autor: 'Ana', autorLabel: 'Ana', color: '#e57373', texto: { t1: '<p>Propuesta A</p>' } },
  { autor: 'Beto', autorLabel: 'Beto', color: '#64b5f6', texto: { t1: '<p>Propuesta B</p>' } },
];

test.describe('SynthTextoModal', () => {
  async function openModal(page, cfg = {}) {
    const { temaId, sources, final } = {
      temaId: TEMA_ID,
      sources: SOURCES,
      final: null,
      ...cfg,
    };
    await page.evaluate(({ temaId, sources, final }) => {
      window.__stm = { saves: [], clears: [] };
      window.__sliceMounted.show({
        temaId,
        temaNombre: 'Objetivo',
        sources,
        final,
        onSave: (...args) => window.__stm.saves.push(args),
        onClear: (...args) => window.__stm.clears.push(args),
      });
    }, { temaId, sources, final });
    await page.waitForSelector('.stm-modal', { state: 'visible' });
    await page.waitForTimeout(100);
  }

  test('smoke: builds and opens via show() without errors', async ({ mount, page }) => {
    const c = await mount('SynthTextoModal');
    await openModal(page);

    await expect(page.locator('.stm-modal')).toBeVisible();
    await expect(page.locator('.stm__sources-title')).toHaveText('Respuestas para combinar');
    expect(c.pageErrors()).toEqual([]);
  });

  test('sources render with Insertar buttons for the given tema', async ({ mount, page }) => {
    const c = await mount('SynthTextoModal');
    await openModal(page);

    const names = page.locator('.stm__source-name');
    await expect(names).toHaveCount(2);
    await expect(names.nth(0)).toHaveText('Ana');
    await expect(names.nth(1)).toHaveText('Beto');
    await expect(page.locator('.stm__insert')).toHaveCount(2);
    expect(c.pageErrors()).toEqual([]);
  });

  test('sources without text for the tema are filtered out', async ({ mount, page }) => {
    const c = await mount('SynthTextoModal');
    const mixed = [
      ...SOURCES,
      { autor: 'Caro', autorLabel: 'Caro', color: '#81c784', texto: { t2: '<p>Otra tema</p>' } },
    ];
    await openModal(page, { sources: mixed });

    await expect(page.locator('.stm__source-name')).toHaveCount(2);
    expect(c.pageErrors()).toEqual([]);
  });

  test('empty sources shows the empty-state message', async ({ mount, page }) => {
    const c = await mount('SynthTextoModal');
    await openModal(page, { sources: [] });

    await expect(page.locator('.stm__sources .empty-state')).toBeVisible();
    await expect(page.locator('.stm__sources .empty-state')).toContainText('No hay respuestas');
    expect(c.pageErrors()).toEqual([]);
  });

  test('Insertar appends the source to the editor and flips the button to "Insertada"', async ({ mount, page }) => {
    const c = await mount('SynthTextoModal');
    await openModal(page);

    await page.locator('.stm__insert').nth(0).click();
    await page.waitForTimeout(100);

    const editor = page.locator('.stm__editor [contenteditable]');
    expect(await editor.textContent()).toContain('Propuesta A');
    await expect(page.locator('.stm__insert').nth(0)).toBeDisabled();
    await expect(page.locator('.stm__insert').nth(0)).toContainText('Insertada');
    expect(c.pageErrors()).toEqual([]);
  });

  test('Guardar with empty editor emits a warning toast and does not call onSave', async ({ mount, page }) => {
    const c = await mount('SynthTextoModal');
    await page.evaluate(() => {
      window.__toasts = [];
      window.slice.events.subscribe('toast:show', (d) => window.__toasts.push(d));
    });
    await openModal(page);

    await page.locator('.stm-modal .slice_button').filter({ hasText: 'Guardar' }).click();
    await page.waitForTimeout(200);

    const toasts = await page.evaluate(() => window.__toasts);
    expect(toasts.some((t) => t.type === 'warning' && /Escribí un texto/i.test(t.message))).toBe(true);
    const saved = await page.evaluate(() => window.__stm.saves);
    expect(saved).toEqual([]);
    await expect(page.locator('.stm-modal')).toBeVisible();
    expect(c.pageErrors()).toEqual([]);
  });

  test('Guardar calls onSave with (temaId, html, fuentes) and closes the modal', async ({ mount, page }) => {
    const c = await mount('SynthTextoModal');
    await openModal(page);

    await page.locator('.stm__insert').nth(0).click();
    await page.waitForTimeout(100);
    await page.locator('.stm__insert:not([disabled])').nth(0).click();
    await page.waitForTimeout(100);
    await page.locator('.stm-modal .slice_button').filter({ hasText: 'Guardar' }).click();
    await page.waitForTimeout(200);

    const saved = await page.evaluate(() => window.__stm.saves);
    expect(saved.length).toBe(1);
    const [temaId, html, fuentes] = saved[0];
    expect(temaId).toBe(TEMA_ID);
    expect(html).toContain('Propuesta A');
    expect(html).toContain('Propuesta B');
    expect(fuentes).toEqual(['Ana', 'Beto']);
    await expect(page.locator('.stm-modal')).not.toBeVisible();
    expect(c.pageErrors()).toEqual([]);
  });

  test('final with esSintesis pre-fills the editor and pre-marks inserted sources', async ({ mount, page }) => {
    const c = await mount('SynthTextoModal');
    await openModal(page, {
      final: {
        autor: 'Síntesis del equipo',
        texto: '<p>Borrador</p>',
        esSintesis: true,
        fuentes: ['Beto'],
      },
    });

    await expect(page.locator('.stm__editor [contenteditable]')).toContainText('Borrador');
    await expect(page.locator('.stm__insert').nth(1)).toBeDisabled();
    await expect(page.locator('.stm__insert').nth(1)).toContainText('Insertada');
    await expect(page.locator('.stm__insert').nth(0)).not.toBeDisabled();
    expect(c.pageErrors()).toEqual([]);
  });

  test('Quitar calls onClear with the temaId and closes the modal', async ({ mount, page }) => {
    const c = await mount('SynthTextoModal');
    await openModal(page);

    await page.locator('.stm-modal .slice_button').filter({ hasText: 'Quitar' }).click();
    await page.waitForTimeout(200);

    // El harness guarda la lista de ARGUMENTOS de cada llamada, así que una
    // sola llamada con un argumento es [[temaId]] — mismo desempaquetado que
    // usa el test de "Guardar" más arriba.
    const cleared = await page.evaluate(() => window.__stm.clears);
    expect(cleared.length).toBe(1);
    expect(cleared[0]).toEqual([TEMA_ID]);
    await expect(page.locator('.stm-modal')).not.toBeVisible();
    expect(c.pageErrors()).toEqual([]);
  });

  test('Cerrar closes the modal without firing any callback', async ({ mount, page }) => {
    const c = await mount('SynthTextoModal');
    await openModal(page);

    await page.locator('.stm-modal .slice_button').filter({ hasText: 'Cerrar' }).click();
    await page.waitForTimeout(200);

    const saved = await page.evaluate(() => window.__stm.saves);
    const cleared = await page.evaluate(() => window.__stm.clears);
    expect(saved).toEqual([]);
    expect(cleared).toEqual([]);
    await expect(page.locator('.stm-modal')).not.toBeVisible();
    expect(c.pageErrors()).toEqual([]);
  });
});
