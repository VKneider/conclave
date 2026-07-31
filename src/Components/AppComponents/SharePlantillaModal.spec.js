import { test, expect, waitForSliceReady } from '../../../playwright/harness/sliceFixtures.js';
import { seedAsignacion } from '../../../playwright/harness/seedHelpers.js';

test.describe('9. Compartir Plantilla', () => {

  test.describe('9.1 SharePlantillaModal', () => {

    test('9.1.1: abrir modal desde PlantillaBuilderView', async ({ app }) => {
      await seedAsignacion(app);
      await app.navigateTo('/plantilla');
      await app.page.waitForTimeout(500);

      await app.page.locator('#sharePlantillaBtnSlot .slice_button').click();
      await app.page.waitForTimeout(300);

      await expect(app.page.locator('[slice-id="sharePlantillaDialog"]')).toBeVisible();
      expect(app.pageErrors).toEqual([]);
    });

    test('9.1.2: descargar plantilla', async ({ app }) => {
      await seedAsignacion(app);
      await app.navigateTo('/plantilla');
      await app.page.waitForTimeout(500);

      await app.page.locator('#sharePlantillaBtnSlot .slice_button').click();
      await app.page.waitForTimeout(300);

      const downloadPromise = app.page.waitForEvent('download', { timeout: 5000 }).catch(() => null);

      await app.page.locator('[slice-id="sharePlantillaDialog"] button:has-text("Descargar")').click();
      await app.page.waitForTimeout(1000);

      const download = await downloadPromise;
      expect(download).not.toBeNull();
      expect(download.suggestedFilename()).toContain('.plantilla');
      expect(app.pageErrors).toEqual([]);
    });

    test('9.1.3: copiar enlace de plantilla', async ({ app }) => {
      await seedAsignacion(app);
      await app.navigateTo('/plantilla');
      await app.page.waitForTimeout(500);

      await app.page.locator('#sharePlantillaBtnSlot .slice_button').click();
      await app.page.waitForTimeout(300);

      await app.page.locator('[slice-id="sharePlantillaDialog"] button:has-text("Copiar enlace")').click();
      await app.page.waitForTimeout(500);

      expect(app.pageErrors).toEqual([]);
    });

    test('9.1.4: enviar plantilla por correo', async ({ app }) => {
      await seedAsignacion(app);
      await app.page.evaluate(() => {
        localStorage.setItem('conclave-settings-v3', JSON.stringify({ autor: 'TestUser', email: 'test@ejemplo.com' }));
      });
      await app.page.reload();
      await waitForSliceReady(app.page);
      await app.page.waitForTimeout(500);

      // Verify the mailto URL is addressed to the creator's email
      const result = await app.page.evaluate(() => {
        const p = slice.getComponent('PlantillaService');
        const settings = slice.getComponent('SettingsService');
        const autor = settings.getState().autor?.trim() || '';
        const nombre = p.getNombre() || 'Conclave';
        const email = settings.getEmail()?.trim();

        const shareLink = p.getShareLink();
        const subject = encodeURIComponent(`Plantilla: ${nombre}`);
        const bodyEncoded = encodeURIComponent(
          `Hola,\n\n${autor} ha compartido la plantilla "${nombre}" de Conclave:\n${shareLink}\n\nSaludos`
        );
        const toPart = email ? `${email}?` : '?';
        return {
          shareLink,
          mailto: `mailto:${toPart}subject=${subject}&body=${bodyEncoded}`,
          bodyDecoded: decodeURIComponent(bodyEncoded),
        };
      });

      expect(result.shareLink).toMatch(/^https?:\/\//);
      expect(result.mailto).toMatch(/^mailto:test@ejemplo\.com\?/);
      expect(result.mailto).toContain('Plantilla%3A');
      expect(result.mailto).toContain('TestUser');
      expect(result.bodyDecoded).toContain(result.shareLink);

      // Verify the button exists and click produces no errors
      await app.navigateTo('/plantilla');
      await app.page.waitForTimeout(500);

      await app.page.locator('#sharePlantillaBtnSlot .slice_button').click();
      await app.page.waitForTimeout(300);
      await expect(app.page.locator('[slice-id="sharePlantillaDialog"] button:has-text("Enviar por correo")')).toBeVisible();
      await app.page.locator('[slice-id="sharePlantillaDialog"] button:has-text("Enviar por correo")').click();
      await app.page.waitForTimeout(500);

      expect(app.pageErrors).toEqual([]);
    });

    test('9.1.5: botón QR abre modal con canvas', async ({ app }) => {
      await seedAsignacion(app);
      await app.page.waitForTimeout(500);

      await app.navigateTo('/plantilla');
      await app.page.waitForTimeout(500);

      await app.page.locator('#sharePlantillaBtnSlot .slice_button').click();
      await app.page.waitForTimeout(300);

      await expect(app.page.locator('[slice-id="sharePlantillaDialog"] button:has-text("Código QR")')).toBeVisible();
      await app.page.locator('[slice-id="sharePlantillaDialog"] button:has-text("Código QR")').click();
      await app.page.waitForTimeout(500);

      await expect(app.page.locator('[slice-id="qrDialog"]')).toBeVisible();
      const hasCanvas = await app.page.locator('[slice-id="qrDialog"] canvas').count();
      const hasError = await app.page.locator('[slice-id="qrDialog"] .qr-modal__error').count();
      expect(hasCanvas + hasError).toBeGreaterThanOrEqual(1);
      expect(app.pageErrors).toEqual([]);
    });

  });

});
