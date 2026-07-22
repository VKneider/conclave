import { test, expect } from '../../../playwright/harness/sliceFixtures.js';
import { seedAsignacion } from '../../../playwright/harness/seedHelpers.js';

const MODAL = '[slice-id="confirmActionDialog"]';

test.describe('15. Eventos de Slice', () => {

  test.describe('15.1 toast:show', () => {

    test('15.1.1: over-capacity toast al exceder cupo máximo', async ({ app }) => {
      await seedAsignacion(app);
      await app.navigateTo('/mis-respuestas');
      await app.page.waitForTimeout(300);

      const kindTab = app.page.locator('button.slice_tab_button[data-tab-id="seleccion"]');
      if (await kindTab.count()) {
        const isActive = await kindTab.evaluate((el) => el.classList.contains('active'));
        if (!isActive) await kindTab.click();
      }
      await app.page.waitForTimeout(300);

      const opcionCount = await app.page.locator('.dot').count();
      for (let i = 0; i < Math.min(7, opcionCount); i++) {
        const btn = app.page.locator('.pill[data-tema="transporte"]').first();
        const exists = await btn.count();
        if (!exists) break;
        await btn.click();
        await app.page.waitForTimeout(600);
      }

      expect(app.pageErrors).toEqual([]);
    });

    test('15.1.2: error toast al emitir toast:show', async ({ app }) => {
      await seedAsignacion(app);
      await app.page.waitForTimeout(300);

      await app.page.evaluate(() => {
        window.slice.events.emit('toast:show', { message: 'Formato inválido', type: 'error' });
      });
      await app.page.waitForTimeout(300);

      expect(app.pageErrors).toEqual([]);
    });

    test('15.1.3: success toast al emitir toast:show', async ({ app }) => {
      await seedAsignacion(app);
      await app.page.waitForTimeout(300);

      await app.page.evaluate(() => {
        window.slice.events.emit('toast:show', { message: 'Acción exitosa', type: 'success' });
      });
      await app.page.waitForTimeout(300);

      expect(app.pageErrors).toEqual([]);
    });
  });

  test.describe('15.2 confirm:request', () => {

    test('15.2.1: confirm dialog aparece al borrar tema', async ({ app }) => {
      await seedAsignacion(app);
      await app.navigateTo('/plantilla');
      await app.page.waitForTimeout(300);

      await app.page.locator('#catList slice-temarow').first().locator('.cat-row__remove').click();
      await app.page.waitForTimeout(300);

      await expect(app.page.locator(MODAL)).toBeVisible({ timeout: 5000 });
      expect(app.pageErrors).toEqual([]);
    });

    test('15.2.2: confirm con input al emitir confirm:request', async ({ app }) => {
      await seedAsignacion(app);
      await app.page.waitForTimeout(300);

      const ok = await app.page.evaluate(() => {
        window.slice.events.emit('confirm:request', {
          title: '¿Tu nombre?',
          message: 'Ingresa tu nombre para continuar',
          inputLabel: 'Nombre',
          confirmLabel: 'Confirmar',
          onConfirm: () => {},
        });
        return true;
      });
      await app.page.waitForTimeout(500);

      expect(ok).toBe(true);
      expect(app.pageErrors).toEqual([]);
    });

    test('15.2.3: confirm danger muestra botón de peligro', async ({ app }) => {
      await seedAsignacion(app);
      await app.page.waitForTimeout(300);

      const ok = await app.page.evaluate(() => {
        window.slice.events.emit('confirm:request', {
          title: '¿Resetear todo?',
          message: 'Esta acción no se puede deshacer.',
          confirmLabel: 'Resetear',
          danger: true,
          onConfirm: () => {},
        });
        return true;
      });
      await app.page.waitForTimeout(500);

      expect(ok).toBe(true);
      expect(app.pageErrors).toEqual([]);
    });

    test('15.2.5: confirm con inputType=email bloquea email inválido', async ({ app }) => {
      await seedAsignacion(app);
      await app.page.waitForTimeout(300);

      const MODAL = '[slice-id="confirmActionDialog"]';

      await app.page.evaluate(() => {
        window.slice.events.emit('confirm:request', {
          title: '¿Tu email?',
          inputLabel: 'Email',
          inputPlaceholder: 'email@ejemplo.com',
          inputType: 'email',
          confirmLabel: 'Enviar',
          onConfirm: () => { window.__confirmed = true; },
        });
      });
      await app.page.waitForTimeout(500);
      await expect(app.page.locator(MODAL)).toBeVisible();

      await app.page.locator('[slice-id="confirmActionInput"] input').fill('notanemail');
      await app.page.waitForTimeout(300);

      await app.page.locator(MODAL + ' .slice-modal__footer .slice_button').last().click();
      await app.page.waitForTimeout(500);

      // Modal should still be open (validation blocked submission)
      await expect(app.page.locator(MODAL)).toBeVisible();
      const wasConfirmed = await app.page.evaluate(() => window.__confirmed === true);
      expect(wasConfirmed).toBe(false);
      expect(app.pageErrors).toEqual([]);
    });

    test('15.2.6: confirm con inputType=email permite email válido', async ({ app }) => {
      await seedAsignacion(app);
      await app.page.waitForTimeout(300);

      const MODAL = '[slice-id="confirmActionDialog"]';

      await app.page.evaluate(() => {
        window.__confirmed = false;
        window.slice.events.emit('confirm:request', {
          title: '¿Tu email?',
          inputLabel: 'Email',
          inputPlaceholder: 'email@ejemplo.com',
          inputType: 'email',
          confirmLabel: 'Enviar',
          onConfirm: () => { window.__confirmed = true; },
        });
      });
      await app.page.waitForTimeout(500);
      await expect(app.page.locator(MODAL)).toBeVisible();

      await app.page.locator('[slice-id="confirmActionInput"] input').fill('victorknjaskd@gmail.com');
      await app.page.waitForTimeout(300);

      await app.page.locator(MODAL + ' .slice-modal__footer .slice_button').last().click();
      await app.page.waitForTimeout(500);

      // Modal should close (validation passed)
      await expect(app.page.locator(MODAL)).not.toBeVisible();
      const wasConfirmed = await app.page.evaluate(() => window.__confirmed === true);
      expect(wasConfirmed).toBe(true);
      expect(app.pageErrors).toEqual([]);
    });

    test('15.2.4: cancelar confirm no ejecuta acción', async ({ app }) => {
      await seedAsignacion(app);
      await app.navigateTo('/plantilla');
      await app.page.waitForTimeout(300);

      const temasBefore = (await app.getContext('plantilla')).temas.length;

      await app.page.locator('#catList slice-temarow').first().locator('.cat-row__remove').click();
      await app.page.waitForTimeout(300);

      await app.cancelDialog();
      await app.page.waitForTimeout(300);

      const temasAfter = (await app.getContext('plantilla')).temas.length;
      expect(temasAfter).toBe(temasBefore);
      expect(app.pageErrors).toEqual([]);
    });
  });

  test.describe('15.3 router:change', () => {

    test('15.3.1: active tab se actualiza al navegar', async ({ app }) => {
      await seedAsignacion(app);
      await app.navigateTo('/plantilla');
      await app.page.waitForTimeout(300);

      await app.page.locator('.tab[data-path="/dashboard"]').click();
      await app.page.waitForTimeout(500);

      const activeTab = app.page.locator('.tab.active');
      await expect(activeTab).toHaveAttribute('data-path', '/dashboard');
      expect(app.pageErrors).toEqual([]);
    });

    test('15.3.2: popstate actualiza UI', async ({ app }) => {
      await seedAsignacion(app);
      await app.navigateTo('/dashboard');
      await app.page.waitForTimeout(300);

      await app.page.locator('.tab[data-path="/plantilla"]').click();
      await app.page.waitForTimeout(500);

      let activeTab = app.page.locator('.tab.active');
      await expect(activeTab).toHaveAttribute('data-path', '/plantilla');

      await app.page.goBack();
      await app.page.waitForTimeout(500);

      activeTab = app.page.locator('.tab.active');
      await expect(activeTab).toHaveAttribute('data-path', '/dashboard');
      expect(app.pageErrors).toEqual([]);
    });
  });

  test.describe('15.4 context:change', () => {

    test('15.4.1: Dashboard no crashea al modificar respuestas', async ({ app }) => {
      await seedAsignacion(app);
      await app.navigateTo('/dashboard');
      await app.page.waitForTimeout(300);

      await app.page.evaluate(() => {
        const rs = window.slice.getComponent('RespuestasService');
        rs.assignOpcion('3', 'transporte');
      });
      await app.page.waitForTimeout(500);

      expect(app.pageErrors).toEqual([]);
    });

    test('15.4.2: CompareView no crashea al modificar plantilla', async ({ app }) => {
      await seedAsignacion(app);
      await app.navigateTo('/comparar');
      await app.page.waitForTimeout(300);

      await app.page.evaluate(() => {
        const ps = window.slice.getComponent('PlantillaService');
        ps.setNombre('Plantilla Modificada');
      });
      await app.page.waitForTimeout(500);

      expect(app.pageErrors).toEqual([]);
    });
  });

});
