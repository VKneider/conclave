import { test, expect } from '../../../../playwright/harness/sliceFixtures.js';
import { seedAsignacion } from '../../../../playwright/harness/seedHelpers.js';

test.describe('2.2 Landing page', () => {

  test('2.2.2: click card "Responder" navega a /mis-respuestas', async ({ app }) => {
    await seedAsignacion(app);
    // seedAsignacion reloads to / — the landing page is at /
    await app.page.waitForTimeout(300);

    await app.page.locator('a.la-card[href="/mis-respuestas"]').click();
    await app.page.waitForTimeout(500);

    const path = await app.page.evaluate(() => window.location.pathname);
    expect(path).toBe('/mis-respuestas');
    expect(app.pageErrors).toEqual([]);
  });

  test('2.2.3: click card "Comparar" navega a /comparar', async ({ app }) => {
    await seedAsignacion(app);
    await app.page.waitForTimeout(300);

    await app.page.locator('a.la-card[href="/comparar"]').click();
    await app.page.waitForTimeout(500);

    const path = await app.page.evaluate(() => window.location.pathname);
    expect(path).toBe('/comparar');
    expect(app.pageErrors).toEqual([]);
  });

});
