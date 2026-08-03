import { readFileSync } from 'node:fs';
import { test, expect } from '../../../../playwright/harness/sliceFixtures.js';
import { injectPlantilla } from '../../../../playwright/harness/seedHelpers.js';

// ── Seed data for CompareView ──────────────────────────────────────

const COMPARE_PLANTILLA = {
  nombre: 'Demo Compare',
  temas: [
    { id: 'frontend', nombre: 'Frontend', modo: 'reparto', orden: 1, min: 1, max: 3, participable: true },
    { id: 'backend', nombre: 'Backend', modo: 'reparto', orden: 2, min: 1, max: 3, participable: true },
    { id: 'framework', nombre: 'Framework', modo: 'votacion', orden: 3, participable: true },
    { id: 'prioridad', nombre: 'Prioridad', modo: 'ranking', orden: 4, participable: true },
    { id: 'sugerencias', nombre: 'Sugerencias', modo: 'texto_libre', orden: 5, participable: true },
    { id: 'feedback', nombre: 'Feedback', modo: 'texto_libre', orden: 6, participable: true },
  ],
  opciones: [
    { id: 'p1', temaId: null, nombre: 'Ana' },
    { id: 'p2', temaId: null, nombre: 'Bob' },
    { id: 'p3', temaId: null, nombre: 'Carlos' },
    { id: 'p4', temaId: null, nombre: 'Diana' },
    { id: 'p5', temaId: null, nombre: 'Elena' },
    { id: 'v1', temaId: 'framework', nombre: 'React' },
    { id: 'v2', temaId: 'framework', nombre: 'Vue' },
    { id: 'v3', temaId: 'framework', nombre: 'Svelte' },
    { id: 'r1', temaId: 'prioridad', nombre: 'Alta' },
    { id: 'r2', temaId: 'prioridad', nombre: 'Media' },
    { id: 'r3', temaId: 'prioridad', nombre: 'Baja' },
  ],
  atributos: [],
};

const YO_RESPUESTAS = {
  seleccion: { p1: 'frontend', p2: 'frontend', p3: 'backend', p4: 'backend', p5: 'backend' },
  voto: { framework: 'v1' },
  ranking: { prioridad: ['r1', 'r2', 'r3'] },
  texto: { sugerencias: 'Mejorar testing', feedback: 'Buen ambiente' },
};

const IMPORTED_SOURCES = [
  {
    autor: 'Elena',
    respuestas: {
      seleccion: { p1: 'frontend', p2: 'backend', p3: 'backend', p4: 'frontend', p5: 'frontend' },
      voto: { framework: 'v2' },
      ranking: { prioridad: ['r2', 'r1', 'r3'] },
      texto: { sugerencias: 'Mejorar documentación', feedback: 'Equipo grande' },
    },
  },
  {
    autor: 'Frank',
    respuestas: {
      seleccion: { p1: 'backend', p2: 'frontend', p3: 'backend', p4: 'frontend', p5: 'frontend' },
      voto: { framework: 'v1' },
      ranking: { prioridad: ['r1', 'r3', 'r2'] },
      texto: { sugerencias: 'Mejorar performance', feedback: 'Buena comunicación' },
    },
  },
];

async function seedCompareData(app) {
  await injectPlantilla(app, COMPARE_PLANTILLA, {
    'conclave-respuestas-v1': YO_RESPUESTAS,
    'conclave-respuestas-importadas-v1': IMPORTED_SOURCES,
  });
}

// ── Tests ──────────────────────────────────────────────────────────

test.describe('13. CompareView', () => {

  test.describe('13.1 Tablas de comparación', () => {

    test('13.1.1: ver tabla de asignación con fuentes importadas', async ({ app }) => {
      await seedCompareData(app);
      await app.navigateTo('/comparar');
      await app.page.waitForTimeout(500);

      // Three sources visible (Yo + Elena + Frank)
      const sourceTags = app.page.locator('.source-list .source-tag');
      await expect(sourceTags).toHaveCount(3);

      // Table shows pool opciones as rows
      const rows = app.page.locator('.cmp-table tbody tr');
      await expect(rows).toHaveCount(5);

      // Status tags indicate agree/disagree
      const statusCells = app.page.locator('.cmp-table .tag-status');
      await expect(statusCells.first()).toBeVisible();

      expect(app.pageErrors).toEqual([]);
    });

    test('13.1.2: cambiar a modo carrusel', async ({ app }) => {
      await seedCompareData(app);
      await app.navigateTo('/comparar');
      await app.page.waitForTimeout(500);

      await app.page.locator('.cmp-mode-tabs button[data-tab-id="carousel"]').click();
      await app.page.waitForTimeout(300);

      await expect(app.page.locator('.cmp-carousel-mount')).not.toBeHidden();
      await expect(app.page.locator('.cmp-table-wrap')).toBeHidden();
      expect(app.pageErrors).toEqual([]);
    });

    test('13.1.3: cambiar a vista por tema', async ({ app }) => {
      await seedCompareData(app);
      await app.navigateTo('/comparar');
      await app.page.waitForTimeout(500);

      await app.page.locator('[slice-id="cmpBtnTemaView"] .slice_button').click();
      await app.page.waitForTimeout(300);

      // Tema view uses .tema-table class
      const temaTable = app.page.locator('.cmp-table.tema-table');
      await expect(temaTable).toBeVisible();
      expect(app.pageErrors).toEqual([]);
    });

    test('13.1.4: filtrar por coincidencia (solo diferencias)', async ({ app }) => {
      await seedCompareData(app);
      await app.navigateTo('/comparar');
      await app.page.waitForTimeout(500);

      // Some rows disagree (different assignments)
      const disagreeBtn = app.page.locator('[slice-id="cmpBtnFilterDisagree"] .slice_button');
      await expect(disagreeBtn).toBeVisible();
      await disagreeBtn.click();
      await app.page.waitForTimeout(300);

      // Only disagree rows shown
      const rows = app.page.locator('.cmp-table tbody tr');
      const count = await rows.count();
      expect(count).toBeGreaterThan(0);
      expect(count).toBeLessThan(5);
      expect(app.pageErrors).toEqual([]);
    });

    test('13.1.5: filtrar por tema', async ({ app }) => {
      await seedCompareData(app);
      await app.navigateTo('/comparar');
      await app.page.waitForTimeout(500);

      await app.selectOption('#cmpSvcFilterSlot .slice_select_container', 'Frontend');
      await app.page.waitForTimeout(300);

      // Filtered to opciones proposed for Frontend
      const rows = app.page.locator('.cmp-table tbody tr');
      const count = await rows.count();
      expect(count).toBeGreaterThan(0);
      expect(app.pageErrors).toEqual([]);
    });

    test('13.1.6: remover fuente importada', async ({ app }) => {
      await seedCompareData(app);
      await app.navigateTo('/comparar');
      await app.page.waitForTimeout(500);

      // Click remove button on Elena's source tag
      await app.page.locator('[data-rm="Elena"]').click();
      await app.page.waitForTimeout(300);

      // Only 2 sources left
      const sourceTags = app.page.locator('.source-list .source-tag');
      await expect(sourceTags).toHaveCount(2);
      expect(app.pageErrors).toEqual([]);
    });

    test('13.1.7: setear decisión final individual', async ({ app }) => {
      await seedCompareData(app);
      await app.navigateTo('/comparar');
      await app.page.waitForTimeout(500);

      // Find a disagree row and set its final select
      const finalSelect = app.page.locator('.final-select[data-opcion="p1"]');
      await expect(finalSelect).toBeVisible();
      await finalSelect.selectOption('frontend');
      await app.page.waitForTimeout(300);

      // Verify decision persisted in context
      const decisionFinal = await app.getContext('decisionFinal');
      expect(decisionFinal.seleccion.p1).toBe('frontend');
      expect(app.pageErrors).toEqual([]);
    });

    test('13.1.8: autocompletar sugerencias', async ({ app }) => {
      await seedCompareData(app);
      await app.navigateTo('/comparar');
      await app.page.waitForTimeout(500);

      await app.page.locator('[slice-id="cmpBtnFillSug"] .slice_button').click();
      await app.page.waitForTimeout(200);

      // Confirm dialog appears
      await app.confirmDialog();
      await app.page.waitForTimeout(300);

      // Decisions should be filled
      const decisionFinal = await app.getContext('decisionFinal');
      const decidedCount = Object.keys(decisionFinal.seleccion).length;
      expect(decidedCount).toBeGreaterThan(0);
      expect(app.pageErrors).toEqual([]);
    });

    test('13.1.9: limpiar todas las decisiones', async ({ app }) => {
      await seedCompareData(app);
      await app.navigateTo('/comparar');
      await app.page.waitForTimeout(500);

      // First set a decision
      await app.page.locator('.final-select[data-opcion="p1"]').selectOption('frontend');
      await app.page.waitForTimeout(300);

      // Clear all
      await app.page.locator('[slice-id="cmpBtnClearRes"] .slice_button').click();
      await app.page.waitForTimeout(200);
      await app.confirmDialog();
      await app.page.waitForTimeout(300);

      const decisionFinal = await app.getContext('decisionFinal');
      expect(Object.keys(decisionFinal.seleccion).length).toBe(0);
      expect(app.pageErrors).toEqual([]);
    });

    test('13.1.10: exportar comparación como CSV', async ({ app }) => {
      await seedCompareData(app);
      await app.navigateTo('/comparar');
      await app.page.waitForTimeout(500);

      const downloadPromise = app.page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
      await app.page.locator('[slice-id="cmpBtnExportCmp"] .slice_button').click();
      await app.page.waitForTimeout(500);

      const download = await downloadPromise;
      expect(download).not.toBeNull();
      expect(download.suggestedFilename()).toContain('.csv');
    });

  });

  test.describe('13.2 Comparación de votación', () => {

    test('13.2.1: ver tally de votos', async ({ app }) => {
      await seedCompareData(app);
      await app.navigateTo('/comparar');
      await app.page.waitForTimeout(500);

      // Switch to Votacion tab
      await app.page.locator('.cmp-kind-tabs button[data-tab-id="votacion"]').click();
      await app.page.waitForTimeout(300);

      // Votacion cards visible with tally
      const vtCard = app.page.locator('.cmp-vt-card');
      await expect(vtCard).toBeVisible();

      // React has 2 votes (Yo + Frank), Vue has 1 (Elena)
      const votes = app.page.locator('.cmp-vt-count');
      const voteTexts = await votes.allTextContents();
      expect(voteTexts).toContain('2');
      expect(voteTexts).toContain('1');
      expect(app.pageErrors).toEqual([]);
    });

    test('13.2.2: fijar decisión final en votación', async ({ app }) => {
      await seedCompareData(app);
      await app.navigateTo('/comparar');
      await app.page.waitForTimeout(500);

      await app.page.locator('.cmp-kind-tabs button[data-tab-id="votacion"]').click();
      await app.page.waitForTimeout(300);

      // Click star to pick React (v1) as final
      const star = app.page.locator('[data-vt-pick][data-opcion="v1"]');
      await expect(star).toBeVisible();
      await star.click();
      await app.page.waitForTimeout(300);

      // Star should be filled now
      await expect(star).toHaveText('★');

      // Decision persisted
      const decisionFinal = await app.getContext('decisionFinal');
      expect(decisionFinal.voto.framework).toBe('v1');
      expect(app.pageErrors).toEqual([]);
    });

  });

  test.describe('13.3 Comparación de ranking', () => {

    test('13.3.1: ver agregación Borda', async ({ app }) => {
      await seedCompareData(app);
      await app.navigateTo('/comparar');
      await app.page.waitForTimeout(500);

      await app.page.locator('.cmp-kind-tabs button[data-tab-id="ranking"]').click();
      await app.page.waitForTimeout(300);

      // Ranking card visible with Borda points
      const rkCard = app.page.locator('.cmp-rk-card');
      await expect(rkCard).toBeVisible();

      // Alta (r1) should have most points (ranked 1st by 2 people)
      const points = app.page.locator('.cmp-rk-pts');
      await expect(points.first()).toBeVisible();
      expect(app.pageErrors).toEqual([]);
    });

    test('13.3.2: adoptar orden como final', async ({ app }) => {
      await seedCompareData(app);
      await app.navigateTo('/comparar');
      await app.page.waitForTimeout(500);

      await app.page.locator('.cmp-kind-tabs button[data-tab-id="ranking"]').click();
      await app.page.waitForTimeout(300);

      // Click "Adoptar" button
      const adoptBtn = app.page.locator('[data-rk-adopt]');
      await expect(adoptBtn).toBeVisible();
      await adoptBtn.click();
      await app.page.waitForTimeout(300);

      // Adopted order should match Borda: Alta > Media > Baja (or similar)
      const decisionFinal = await app.getContext('decisionFinal');
      expect(decisionFinal.ranking.prioridad).toBeDefined();
      expect(decisionFinal.ranking.prioridad.length).toBe(3);
      expect(app.pageErrors).toEqual([]);
    });

  });

  test.describe('13.4 Comparación de texto libre', () => {

    test('13.4.1: ver TextCompareCards', async ({ app }) => {
      await seedCompareData(app);
      await app.navigateTo('/comparar');
      await app.page.waitForTimeout(500);

      await app.page.locator('.cmp-kind-tabs button[data-tab-id="texto"]').click();
      await app.page.waitForTimeout(300);

      // Text cards visible for each source
      const cards = app.page.locator('.tcc-card');
      await expect(cards).not.toHaveCount(0);

      // Each tema shows 3 source cards
      const cardCount = await cards.count();
      expect(cardCount).toBe(6); // 3 sources × 2 temas
      expect(app.pageErrors).toEqual([]);
    });

    test('13.4.2: marcar respuesta como elegida', async ({ app }) => {
      await seedCompareData(app);
      await app.navigateTo('/comparar');
      await app.page.waitForTimeout(500);

      await app.page.locator('.cmp-kind-tabs button[data-tab-id="texto"]').click();
      await app.page.waitForTimeout(300);

      // Click "Marcar como elegida" on Yo's card
      const pickBtn = app.page.locator('.tcc-pick').first();
      await expect(pickBtn).toBeVisible();
      await pickBtn.click();
      await app.page.waitForTimeout(300);

      // Card gets "Elegida" tag
      const finalTag = app.page.locator('.tcc-final-tag');
      await expect(finalTag).toBeVisible();

      // Decision persisted
      const decisionFinal = await app.getContext('decisionFinal');
      expect(decisionFinal.texto.sugerencias).toBeDefined();
      expect(app.pageErrors).toEqual([]);
    });

    test('13.4.3: navegar entre temas texto', async ({ app }) => {
      await seedCompareData(app);
      await app.navigateTo('/comparar');
      await app.page.waitForTimeout(500);

      await app.page.locator('.cmp-kind-tabs button[data-tab-id="texto"]').click();
      await app.page.waitForTimeout(300);

      // First tema title visible
      const firstTitle = app.page.locator('.tcc-section-title').first();
      const firstTitleText = await firstTitle.textContent();

      // Navigate forward via CarouselView arrow
      const nextArrow = app.page.locator('[data-act="next"]');
      if (await nextArrow.count() > 0) {
        await nextArrow.click();
        await app.page.waitForTimeout(300);

        // Second tema title should differ
        const secondTitle = app.page.locator('.tcc-section-title').first();
        const secondTitleText = await secondTitle.textContent();
        expect(secondTitleText).not.toBe(firstTitleText);
      }

      expect(app.pageErrors).toEqual([]);
    });

    test('13.4.4: redactar síntesis de texto libre', async ({ app }) => {
      await seedCompareData(app);
      await app.navigateTo('/comparar');
      await app.page.waitForTimeout(500);

      await app.page.locator('.cmp-kind-tabs button[data-tab-id="texto"]').click();
      await app.page.waitForTimeout(300);

      // Open the synthesis modal from the first tema section
      const synthBtn = app.page.locator('.tcc-synth-open').first();
      await expect(synthBtn).toBeVisible();
      await synthBtn.click();
      await app.page.waitForTimeout(400);

      // Modal + sources list appear
      const modal = app.page.locator('.stm-modal');
      await expect(modal).toBeVisible();
      const insertBtns = app.page.locator('.stm__insert');
      const insertCount = await insertBtns.count();
      expect(insertCount).toBeGreaterThan(0);

      // Insert the first two sources into the editor
      await insertBtns.nth(0).click();
      await app.page.waitForTimeout(200);
      if (insertCount > 1) {
        const secondInsert = app.page.locator('.stm__insert:not([disabled])').first();
        await secondInsert.click();
        await app.page.waitForTimeout(200);
      }

      // Editor has content now
      const editor = app.page.locator('.stm__editor [contenteditable]');
      const editorText = (await editor.textContent()) || '';
      expect(editorText.trim().length).toBeGreaterThan(0);

      // Save as final answer
      await app.page.locator('.stm-modal .slice_button').filter({ hasText: 'Guardar' }).click();
      await app.page.waitForTimeout(400);

      // Persisted with esSintesis + fuentes
      const decisionFinal = await app.getContext('decisionFinal');
      const entry = decisionFinal.texto.sugerencias;
      expect(entry).toBeDefined();
      expect(entry.esSintesis).toBe(true);
      expect(Array.isArray(entry.fuentes)).toBe(true);
      expect(entry.fuentes.length).toBeGreaterThan(0);

      // Banner shows the synthesis label
      const synthBanner = app.page.locator('.tcc-final-banner--synth').first();
      await expect(synthBanner).toBeVisible();
      expect(await synthBanner.textContent()).toContain('Síntesis');
      expect(app.pageErrors).toEqual([]);
    });

    test('13.4.5: exportar lista final incluye la síntesis como decisión final', async ({ app }) => {
      await seedCompareData(app);
      await app.navigateTo('/comparar');
      await app.page.waitForTimeout(500);

      // Open the synthesis modal from the first tema section
      await app.page.locator('.cmp-kind-tabs button[data-tab-id="texto"]').click();
      await app.page.waitForTimeout(300);

      const synthBtn = app.page.locator('.tcc-synth-open').first();
      await expect(synthBtn).toBeVisible();
      await synthBtn.click();
      await app.page.waitForTimeout(400);

      // Insert the first two sources into the editor and save
      const insertBtns = app.page.locator('.stm__insert');
      const insertCount = await insertBtns.count();
      expect(insertCount).toBeGreaterThan(0);
      await insertBtns.nth(0).click();
      await app.page.waitForTimeout(200);
      if (insertCount > 1) {
        const secondInsert = app.page.locator('.stm__insert:not([disabled])').first();
        await secondInsert.click();
        await app.page.waitForTimeout(200);
      }
      await app.page.locator('.stm-modal .slice_button').filter({ hasText: 'Guardar' }).click();
      await app.page.waitForTimeout(400);

      // Switch back to the reparto table to reach the export bar
      await app.page.locator('.cmp-kind-tabs button[data-tab-id="seleccion"]').click();
      await app.page.waitForTimeout(300);

      const downloadPromise = app.page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
      await app.page.locator('[slice-id="cmpBtnExportFinal"] .slice_button').click();
      await app.page.waitForTimeout(500);

      const download = await downloadPromise;
      expect(download).not.toBeNull();
      expect(download.suggestedFilename()).toContain('.conclave');

      // The exported JSON must carry the synthesis entry (not a flattened string)
      const path = await download.path();
      const json = JSON.parse(readFileSync(path, 'utf-8'));
      const entry = json.respuestas?.texto?.sugerencias;
      expect(entry).toBeDefined();
      expect(entry.esSintesis).toBe(true);
      expect(Array.isArray(entry.fuentes)).toBe(true);
      expect(entry.fuentes.length).toBeGreaterThan(0);
      expect(app.pageErrors).toEqual([]);
    });

    test('13.4.6: editar una síntesis existente', async ({ app }) => {
      await seedCompareData(app);
      await app.navigateTo('/comparar');
      await app.page.waitForTimeout(500);

      await app.page.locator('.cmp-kind-tabs button[data-tab-id="texto"]').click();
      await app.page.waitForTimeout(300);

      // Create the synthesis first
      await app.page.locator('.tcc-synth-open').first().click();
      await app.page.waitForTimeout(400);
      const insertBtns = app.page.locator('.stm__insert');
      const insertCount = await insertBtns.count();
      expect(insertCount).toBeGreaterThan(0);
      await insertBtns.nth(0).click();
      await app.page.waitForTimeout(200);
      if (insertCount > 1) {
        await app.page.locator('.stm__insert:not([disabled])').first().click();
        await app.page.waitForTimeout(200);
      }
      await app.page.locator('.stm-modal .slice_button').filter({ hasText: 'Guardar' }).click();
      await app.page.waitForTimeout(400);

      // The header button now says "Editar", re-open the modal
      const synthBtn = app.page.locator('.tcc-synth-open').first();
      expect(await synthBtn.textContent()).toContain('Editar');
      await synthBtn.click();
      await app.page.waitForTimeout(400);

      // Editor prefilled with the previously inserted content
      const editor = app.page.locator('.stm__editor [contenteditable]');
      const editorText = (await editor.textContent()) || '';
      expect(editorText.trim().length).toBeGreaterThan(0);

      // The already-inserted sources are marked as "Insertada" (disabled)
      const inserted = app.page.locator('.stm__insert[disabled]');
      expect(await inserted.count()).toBeGreaterThan(0);
      expect(await inserted.first().textContent()).toContain('Insertada');

      // Insert one more source and save again
      const remaining = app.page.locator('.stm__insert:not([disabled])').first();
      if (await app.page.locator('.stm__insert:not([disabled])').count() > 0) {
        await remaining.click();
        await app.page.waitForTimeout(200);
      }
      await app.page.locator('.stm-modal .slice_button').filter({ hasText: 'Guardar' }).click();
      await app.page.waitForTimeout(400);

      // Updated entry: still a synthesis with a non-empty fuentes set
      const decisionFinal = await app.getContext('decisionFinal');
      const entry = decisionFinal.texto.sugerencias;
      expect(entry).toBeDefined();
      expect(entry.esSintesis).toBe(true);
      expect(entry.fuentes.length).toBeGreaterThan(0);
      expect(app.pageErrors).toEqual([]);
    });

    test('13.4.7: quitar la síntesis como respuesta final', async ({ app }) => {
      await seedCompareData(app);
      await app.navigateTo('/comparar');
      await app.page.waitForTimeout(500);

      await app.page.locator('.cmp-kind-tabs button[data-tab-id="texto"]').click();
      await app.page.waitForTimeout(300);

      // Create the synthesis first
      await app.page.locator('.tcc-synth-open').first().click();
      await app.page.waitForTimeout(400);
      const insertBtns = app.page.locator('.stm__insert');
      expect(await insertBtns.count()).toBeGreaterThan(0);
      await insertBtns.nth(0).click();
      await app.page.waitForTimeout(200);
      await app.page.locator('.stm-modal .slice_button').filter({ hasText: 'Guardar' }).click();
      await app.page.waitForTimeout(400);

      // Banner is visible
      await expect(app.page.locator('.tcc-final-banner--synth').first()).toBeVisible();

      // Remove the final decision
      await app.page.locator('.tcc-final-banner [data-tccact="clear-final"]').first().click();
      await app.page.waitForTimeout(400);

      // Banner gone + context cleared
      await expect(app.page.locator('.tcc-final-banner').first()).toBeHidden();
      const decisionFinal = await app.getContext('decisionFinal');
      expect(decisionFinal.texto.sugerencias).toBeUndefined();
      expect(app.pageErrors).toEqual([]);
    });

  });

});
