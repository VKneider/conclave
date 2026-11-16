import { test, expect } from '@playwright/test';
import { waitForSliceReady } from '../../../../playwright/harness/sliceFixtures.js';

test.describe('Tour de la app', () => {
  test('no arranca solo: la landing queda limpia', async ({ page }) => {
    await page.goto('/');
    await waitForSliceReady(page);
    await expect(page.locator('slice-tour-overlay')).toHaveCount(0);
  });

  test('el tour rápido se abre desde UserMenu', async ({ page }) => {
    await page.goto('/');
    await waitForSliceReady(page);

    await page.locator('.user-menu__trigger').click();
    await page.getByRole('button', { name: 'Tour rápido' }).click();

    await expect(page.locator('.slice-tour-overlay__title')).toHaveText('Todo el flujo, siempre a mano');
    await expect(page.locator('.slice-tour-overlay__progress')).toHaveText('Paso 1 de 5');

    await page.keyboard.press('Escape');
    await expect(page.locator('slice-tour-overlay')).toHaveCount(0);
  });

  test('el tour completo pide el clic en cada pestaña y explica cada vista', async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto('/');
    await waitForSliceReady(page);

    const title = page.locator('.slice-tour-overlay__title');
    const overlay = page.locator('slice-tour-overlay');
    const card = page.locator('.slice-tour-overlay__card');
    const path = () => page.evaluate(() => window.location.pathname);
    const settle = async () => {
      await expect(card).toHaveAttribute('aria-busy', 'false');
      await page.waitForTimeout(80);
    };
    const next = async () => {
      await settle();
      await page.locator('.slice-tour-overlay__next button').click();
    };
    const clickTab = async (route) => {
      await settle();
      await page.locator(`.topbar .tab[data-path="${route}"]`).click();
    };

    await page.locator('.user-menu__trigger').click();
    await page.getByRole('button', { name: 'Tour completo' }).click();

    await expect(title).toHaveText('Un recorrido por Conclave');
    await next();
    await expect(title).toHaveText('Vamos a la Plantilla');
    await clickTab('/plantilla');
    await expect(title).toHaveText('Así se agrega un tema');
    expect(await path()).toBe('/plantilla');

    await next();
    await expect(title).toHaveText('Comparte cuando esté lista');
    await next();
    await expect(title).toHaveText('Ahora te toca responder');
    await clickTab('/mis-respuestas');
    await expect(title).toHaveText('Responde tema por tema');
    expect(await path()).toBe('/mis-respuestas');

    await next();
    await expect(title).toHaveText('Comparte tus respuestas');
    await next();
    await expect(title).toHaveText('Reúne lo de todos');
    await clickTab('/comparar');
    await expect(title).toHaveText('Importa las respuestas');
    expect(await path()).toBe('/comparar');

    await next();
    await expect(title).toHaveText('Compara y decide');
    await next();
    await expect(title).toHaveText('Cierra la decisión');
    await clickTab('/resumen');
    await expect(title).toHaveText('La minuta y el consenso');
    expect(await path()).toBe('/resumen');

    await next();
    await expect(title).toHaveText('Mira el avance');
    await clickTab('/dashboard');
    await expect(title).toHaveText('Progreso y pendientes');
    expect(await path()).toBe('/dashboard');

    await next();
    await expect(title).toHaveText('Tu espacio');
    await next();
    await expect(overlay).toHaveCount(0);
  });

  test('el capítulo de respuestas se abre desde la vista', async ({ page }) => {
    await page.goto('/mis-respuestas');
    await waitForSliceReady(page);

    await page.getByRole('button', { name: 'Cómo funciona' }).click();
    await expect(page.locator('.slice-tour-overlay__title')).toHaveText('Responder, paso a paso');
    await expect(page.locator('.slice-tour-overlay__progress')).toHaveText('Paso 1 de 3');

    await page.keyboard.press('Escape');
    await expect(page.locator('slice-tour-overlay')).toHaveCount(0);
  });

  test('el modal de bienvenida abre el tour completo', async ({ page }) => {
    await page.goto('/');
    await waitForSliceReady(page);

    await page.evaluate(async () => {
      window.slice.getComponent('PlantillaService').setBienvenida('<p>Hola equipo</p>');
      await window.slice.getComponent('bienvenidaModal').show();
    });

    await page.getByRole('button', { name: 'Ver tour' }).click();
    await expect(page.locator('.slice-tour-overlay__title')).toHaveText('Un recorrido por Conclave');
    await expect(page.locator('.slice-tour-overlay__progress')).toHaveText('Paso 1 de 15');

    await page.keyboard.press('Escape');
    await expect(page.locator('slice-tour-overlay')).toHaveCount(0);
  });
});
