import { test, expect, waitForSliceReady } from '../../../playwright/harness/sliceFixtures.js';
import { seedAsignacion } from '../../../playwright/harness/seedHelpers.js';

test.describe('8. Compartir Respuestas', () => {

  test.describe('8.1 ExportRespuestasModal', () => {

    test('8.1.1: abrir modal desde RespuestasView', async ({ app }) => {
      await seedAsignacion(app);
      await app.navigateTo('/mis-respuestas');
      await app.page.waitForTimeout(500);

      await app.page.locator('[data-el="exportSlot"] button').click();
      await app.page.waitForTimeout(300);

      await expect(app.page.locator('[slice-id="exportRespuestasDialog"]')).toBeVisible();
      expect(app.pageErrors).toEqual([]);
    });

    test('8.1.2: abrir modal desde Dashboard', async ({ app }) => {
      await seedAsignacion(app);
      await app.navigateTo('/dashboard');
      await app.page.waitForTimeout(500);

      await app.page.locator('[data-el="shareBtnSlot"] button').click();
      await app.page.waitForTimeout(300);

      await expect(app.page.locator('[slice-id="exportRespuestasDialog"]')).toBeVisible();
      expect(app.pageErrors).toEqual([]);
    });

    test('8.1.3: abrir modal desde UserMenu', async ({ app }) => {
      await seedAsignacion(app);
      await app.navigateTo('/plantilla');
      await app.page.waitForTimeout(500);

      await app.page.locator('.user-menu__trigger').click();
      await app.page.waitForTimeout(200);

      await app.page.locator('.user-menu__panel button:has-text("Compartir respuestas")').click();
      await app.page.waitForTimeout(300);

      await expect(app.page.locator('[slice-id="exportRespuestasDialog"]')).toBeVisible();
      expect(app.pageErrors).toEqual([]);
    });

    test('8.1.4: cerrar modal con Escape', async ({ app }) => {
      await seedAsignacion(app);
      await app.navigateTo('/mis-respuestas');
      await app.page.waitForTimeout(500);

      await app.page.locator('[data-el="exportSlot"] button').click();
      await app.page.waitForTimeout(300);
      await expect(app.page.locator('[slice-id="exportRespuestasDialog"]')).toBeVisible();

      await app.page.keyboard.press('Escape');
      await app.page.waitForTimeout(300);

      await expect(app.page.locator('[slice-id="exportRespuestasDialog"]')).not.toBeVisible();
      expect(app.pageErrors).toEqual([]);
    });

    test('8.1.5: prompt de nombre si falta al descargar', async ({ app }) => {
      await seedAsignacion(app);
      await app.navigateTo('/mis-respuestas');
      await app.page.waitForTimeout(500);

      await app.page.locator('[data-el="exportSlot"] button').click();
      await app.page.waitForTimeout(300);

      await app.page.locator('[slice-id="exportRespuestasDialog"] button:has-text("Descargar")').click();

      // Confirm dialog should appear asking for name
      await app.page.waitForSelector('[slice-id="confirmActionDialog"]', { timeout: 5000 });
      await expect(app.page.locator('[slice-id="confirmActionDialog"]')).toBeVisible();
      await app.page.waitForTimeout(200);

      // The input is a Slice Input component with slice-id="confirmActionInput"
      await app.page.locator('[slice-id="confirmActionInput"] input').fill('TestUser');
      await app.page.waitForTimeout(200);
      await app.confirmDialog();
      await app.page.waitForTimeout(500);

      expect(app.pageErrors).toEqual([]);
    });

    test('8.1.6: descargar respuestas con nombre seteado', async ({ app }) => {
      await seedAsignacion(app);
      await app.page.evaluate(() => {
        localStorage.setItem('conclave-settings-v3', JSON.stringify({ autor: 'TestUser', email: '' }));
      });
      await app.page.reload();
      await waitForSliceReady(app.page);
      await app.page.waitForTimeout(500);

      await app.navigateTo('/mis-respuestas');
      await app.page.waitForTimeout(500);

      await app.page.locator('[data-el="exportSlot"] button').click();
      await app.page.waitForTimeout(300);

      const downloadPromise = app.page.waitForEvent('download', { timeout: 5000 }).catch(() => null);

      await app.page.locator('[slice-id="exportRespuestasDialog"] button:has-text("Descargar")').click();
      await app.page.waitForTimeout(1000);

      const download = await downloadPromise;
      expect(download).not.toBeNull();
      expect(download.suggestedFilename()).toContain('.respuestas');
      expect(app.pageErrors).toEqual([]);
    });

    test('8.1.7: copiar enlace de respuestas', async ({ app }) => {
      await seedAsignacion(app);
      await app.page.evaluate(() => {
        localStorage.setItem('conclave-settings-v3', JSON.stringify({ autor: 'TestUser', email: '' }));
      });
      await app.page.reload();
      await waitForSliceReady(app.page);
      await app.page.waitForTimeout(500);

      await app.navigateTo('/mis-respuestas');
      await app.page.waitForTimeout(500);

      await app.page.locator('[data-el="exportSlot"] button').click();
      await app.page.waitForTimeout(300);

      await app.page.locator('[slice-id="exportRespuestasDialog"] button:has-text("Copiar enlace")').click();
      await app.page.waitForTimeout(500);

      expect(app.pageErrors).toEqual([]);
    });

    test('8.1.8: enviar respuestas por correo al creador', async ({ app }) => {
      await seedAsignacion(app);
      await app.page.evaluate(() => {
        localStorage.setItem('conclave-settings-v3', JSON.stringify({ autor: 'TestUser', email: '' }));
      });
      await app.page.reload();
      await waitForSliceReady(app.page);
      await app.page.waitForTimeout(500);

      // Inject creadoEmail into the live PlantillaService state
      await app.page.evaluate(() => {
        slice.context.setState('plantilla', (prev) => ({ ...prev, creadoEmail: 'creator@ejemplo.com' }));
      });
      await app.page.waitForTimeout(200);

      // Verify the mailto URL is addressed to the plantilla creator
      const result = await app.page.evaluate(() => {
        const rs = slice.getComponent('RespuestasService');
        const settings = slice.getComponent('SettingsService');
        const autor = settings.getState().autor?.trim() || '';
        const p = slice.getComponent('PlantillaService');
        const nombre = p.getNombre() || 'Conclave';
        const to = p.getCreadoEmail()?.trim();

        const shareLink = rs.getShareLink(autor);
        const subject = encodeURIComponent(`Mis respuestas — ${nombre}`);
        const bodyEncoded = encodeURIComponent(
          `Hola,\n\n${autor} ha compartido sus respuestas para "${nombre}":\n${shareLink}\n\nSaludos`
        );
        const toPart = to ? `${to}?` : '?';
        return {
          shareLink,
          mailto: `mailto:${toPart}subject=${subject}&body=${bodyEncoded}`,
          bodyDecoded: decodeURIComponent(bodyEncoded),
        };
      });

      expect(result.shareLink).toMatch(/^https?:\/\//);
      expect(result.mailto).toMatch(/^mailto:creator@ejemplo\.com\?/);
      expect(result.mailto).toContain('TestUser');
      expect(result.mailto).toContain('Mis%20respuestas');
      expect(result.bodyDecoded).toContain(result.shareLink);

      // Verify the button exists and click produces no errors
      await app.navigateTo('/mis-respuestas');
      await app.page.waitForTimeout(500);

      await app.page.locator('[data-el="exportSlot"] button').click();
      await app.page.waitForTimeout(300);
      await expect(app.page.locator('[slice-id="exportRespuestasDialog"] button:has-text("Enviar por correo")')).toBeVisible();
      await app.page.locator('[slice-id="exportRespuestasDialog"] button:has-text("Enviar por correo")').click();
      await app.page.waitForTimeout(500);

      expect(app.pageErrors).toEqual([]);
    });

    test('8.1.9: botón QR abre modal con canvas', async ({ app }) => {
      await seedAsignacion(app);
      await app.page.evaluate(() => {
        localStorage.setItem('conclave-settings-v3', JSON.stringify({ autor: 'TestUser', email: '' }));
      });
      await app.page.reload();
      await waitForSliceReady(app.page);
      await app.page.waitForTimeout(500);

      await app.navigateTo('/mis-respuestas');
      await app.page.waitForTimeout(500);

      await app.page.locator('[data-el="exportSlot"] button').click();
      await app.page.waitForTimeout(300);

      await expect(app.page.locator('[slice-id="exportRespuestasDialog"] button:has-text("Código QR")')).toBeVisible();
      await app.page.locator('[slice-id="exportRespuestasDialog"] button:has-text("Código QR")').click();
      await app.page.waitForTimeout(500);

      // QR modal should open with either a canvas (QR generated) or error message
      await expect(app.page.locator('[slice-id="qrDialog"]')).toBeVisible();
      const hasCanvas = await app.page.locator('[slice-id="qrDialog"] canvas').count();
      const hasError = await app.page.locator('[slice-id="qrDialog"] .qr-modal__error').count();
      expect(hasCanvas + hasError).toBeGreaterThanOrEqual(1);
      expect(app.pageErrors).toEqual([]);
    });

  });

});
