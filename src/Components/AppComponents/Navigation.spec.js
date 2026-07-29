import { test, expect, waitForSliceReady } from '../../../playwright/harness/sliceFixtures.js';

test.describe('2. Navegación', () => {

   test.describe('2.1 Tabs de navegación', () => {

      test('2.1.1: tab Dashboard navega y queda activo', async ({ app }) => {
         await app.resetState();
         await app.page.locator('a.tab[data-path="/dashboard"]').click();
         await app.page.waitForTimeout(300);
         expect(app.page.url()).toContain('/dashboard');
         await expect(app.page.locator('a.tab[data-path="/dashboard"]')).toHaveClass(/active/);
         expect(app.pageErrors).toEqual([]);
      });

      test('2.1.2: tab Mis respuestas navega y queda activo', async ({ app }) => {
         await app.resetState();
         await app.page.locator('a.tab[data-path="/mis-respuestas"]').click();
         await app.page.waitForTimeout(300);
         expect(app.page.url()).toContain('/mis-respuestas');
         await expect(app.page.locator('a.tab[data-path="/mis-respuestas"]')).toHaveClass(/active/);
         expect(app.pageErrors).toEqual([]);
      });

      test('2.1.3: tab Comparar navega y queda activo', async ({ app }) => {
         await app.resetState();
         await app.page.locator('a.tab[data-path="/comparar"]').click();
         await app.page.waitForTimeout(300);
         expect(app.page.url()).toContain('/comparar');
         await expect(app.page.locator('a.tab[data-path="/comparar"]')).toHaveClass(/active/);
         expect(app.pageErrors).toEqual([]);
      });

      test('2.1.4: tab Resumen navega y queda activo', async ({ app }) => {
         await app.resetState();
         await app.page.locator('a.tab[data-path="/resumen"]').click();
         await app.page.waitForTimeout(300);
         expect(app.page.url()).toContain('/resumen');
         await expect(app.page.locator('a.tab[data-path="/resumen"]')).toHaveClass(/active/);
         expect(app.pageErrors).toEqual([]);
      });

      test('2.1.5: tab Plantilla navega y queda activo', async ({ app }) => {
         await app.resetState();
         await app.page.locator('a.tab[data-path="/plantilla"]').click();
         await app.page.waitForTimeout(300);
         expect(app.page.url()).toContain('/plantilla');
         await expect(app.page.locator('a.tab[data-path="/plantilla"]')).toHaveClass(/active/);
         expect(app.pageErrors).toEqual([]);
      });

      test('2.1.6: navegación back/forward mantiene tab activo', async ({ app }) => {
         await app.resetState();

         await app.page.locator('a.tab[data-path="/dashboard"]').click();
         await app.page.waitForTimeout(300);

         await app.page.locator('a.tab[data-path="/mis-respuestas"]').click();
         await app.page.waitForTimeout(300);

         // Go back to /dashboard
         await app.page.goBack();
         await app.page.waitForTimeout(300);
         expect(app.page.url()).toContain('/dashboard');
         await expect(app.page.locator('a.tab[data-path="/dashboard"]')).toHaveClass(/active/);

         // Go forward to /mis-respuestas
         await app.page.goForward();
         await app.page.waitForTimeout(300);
         expect(app.page.url()).toContain('/mis-respuestas');
         await expect(app.page.locator('a.tab[data-path="/mis-respuestas"]')).toHaveClass(/active/);

         expect(app.pageErrors).toEqual([]);
      });

      test('2.1.7: click brand vuelve a landing', async ({ app }) => {
         await app.resetState();

         // Navigate to a sub-page first
         await app.page.locator('a.tab[data-path="/dashboard"]').click();
         await app.page.waitForTimeout(300);

         // Click brand
         await app.page.locator('.topbar .brand').click();
         await app.page.waitForTimeout(300);
         expect(app.page.url()).not.toContain('/dashboard');
         await expect(app.page.locator('.landing-view')).toBeVisible();
         expect(app.pageErrors).toEqual([]);
      });
   });

   test.describe('2.2 Landing page', () => {

      test('2.2.1: landing muestra stats con seed data', async ({ app }) => {
         await app.resetState();
         // Navigate to landing (/) — the app fixture starts at /
         await expect(app.page.locator('.landing-view')).toBeVisible();
         // .lp-name should show the plantilla name
         await expect(app.page.locator('.lp-name')).toBeVisible();
         // Badges section should be visible (seed has temas)
         await expect(app.page.locator('.lp-badges')).toBeVisible();
         expect(app.pageErrors).toEqual([]);
      });

      test('2.2.2: CTA "Responder" navega a mis-respuestas', async ({ app }) => {
         await app.resetState();
         await expect(app.page.locator('.landing-view')).toBeVisible();

         await app.page.locator('button.landing-cta[data-href="/mis-respuestas"]').click();
         await app.page.waitForTimeout(300);
         expect(app.page.url()).toContain('/mis-respuestas');
         expect(app.pageErrors).toEqual([]);
      });

      test('2.2.3: CTA "Editar plantilla" navega a /plantilla', async ({ app }) => {
         await app.resetState();
         await expect(app.page.locator('.landing-view')).toBeVisible();

         await app.page.locator('button.landing-cta[data-href="/plantilla"]').click();
         await app.page.waitForTimeout(300);
         expect(app.page.url()).toContain('/plantilla');
         expect(app.pageErrors).toEqual([]);
      });

      test('2.2.4: card Dashboard navega a /dashboard', async ({ app }) => {
         await app.resetState();
         await expect(app.page.locator('.landing-view')).toBeVisible();

         await app.page.locator('button.la-card[data-href="/dashboard"]').click();
         await app.page.waitForTimeout(300);
         expect(app.page.url()).toContain('/dashboard');
         expect(app.pageErrors).toEqual([]);
      });

      test('2.2.5: card Plantilla navega a /plantilla', async ({ app }) => {
         await app.resetState();
         await expect(app.page.locator('.landing-view')).toBeVisible();

         await app.page.locator('button.la-card[data-href="/plantilla"]').click();
         await app.page.waitForTimeout(300);
         expect(app.page.url()).toContain('/plantilla');
         expect(app.pageErrors).toEqual([]);
      });
   });

   test.describe('2.3 UserMenu', () => {

      test('2.3.1: abrir UserMenu muestra panel', async ({ app }) => {
         await app.resetState();
         // Click the trigger
         await app.page.locator('.user-menu__trigger').click();
         await app.page.waitForTimeout(300);
         // Panel should be visible (not hidden)
         const panel = app.page.locator('.user-menu__panel');
         await expect(panel).not.toBeHidden();
         expect(app.pageErrors).toEqual([]);
      });

      test('2.3.2: cerrar UserMenu click fuera', async ({ app }) => {
         await app.resetState();
         await app.page.locator('.user-menu__trigger').click();
         await app.page.waitForTimeout(200);

         // Click outside — the main content area
         await app.page.locator('.app-shell__content').click({ position: { x: 10, y: 10 } });
         await app.page.waitForTimeout(300);
         const panel = app.page.locator('.user-menu__panel');
         await expect(panel).toBeHidden();
         expect(app.pageErrors).toEqual([]);
      });

      test('2.3.3: cerrar UserMenu con Escape', async ({ app }) => {
         await app.resetState();
         await app.page.locator('.user-menu__trigger').click();
         await app.page.waitForTimeout(200);

         await app.page.keyboard.press('Escape');
         await app.page.waitForTimeout(300);
         const panel = app.page.locator('.user-menu__panel');
         await expect(panel).toBeHidden();
         expect(app.pageErrors).toEqual([]);
      });

      test('2.3.4: setear nombre de usuario persiste', async ({ app }) => {
         await app.resetState();
         await app.page.locator('.user-menu__trigger').click();
         await app.page.waitForTimeout(200);

         // Name input is inside [data-el="autorFieldSlot"]
         const nameInput = app.page.locator('[data-el="autorFieldSlot"] input');
         await nameInput.click();
         await nameInput.fill('Test User');
         await nameInput.evaluate((el) => el.dispatchEvent(new Event('change', { bubbles: true })));
         await app.page.waitForTimeout(200);

         // Reload and check persistence
         await app.page.reload();
         await waitForSliceReady(app.page);
         await app.page.waitForTimeout(200);
         await app.page.locator('.user-menu__trigger').click();
         await app.page.waitForTimeout(200);

         const nameValue = await app.page.locator('[data-el="autorFieldSlot"] input').inputValue();
         expect(nameValue).toBe('Test User');
         expect(app.pageErrors).toEqual([]);
      });

      test('2.3.5: setear email de usuario persiste', async ({ app }) => {
         await app.resetState();
         await app.page.locator('.user-menu__trigger').click();
         await app.page.waitForTimeout(200);

         const emailInput = app.page.locator('[data-el="emailFieldSlot"] input');
         await emailInput.click();
         await emailInput.fill('test@example.com');
         await emailInput.evaluate((el) => el.dispatchEvent(new Event('change', { bubbles: true })));
         await app.page.waitForTimeout(200);

         await app.page.reload();
         await waitForSliceReady(app.page);
         await app.page.waitForTimeout(200);
         await app.page.locator('.user-menu__trigger').click();
         await app.page.waitForTimeout(200);

         const emailValue = await app.page.locator('[data-el="emailFieldSlot"] input').inputValue();
         expect(emailValue).toBe('test@example.com');
         expect(app.pageErrors).toEqual([]);
      });

      test('2.3.6: toggle tema cambia nombre visible', async ({ app }) => {
         await app.resetState();
         const initialTheme = await app.page.evaluate(() => window.slice?.theme);
         await expect(initialTheme).toBeTruthy();

         // Open menu
         await app.page.locator('.user-menu__trigger').click();
         await app.page.waitForTimeout(200);

         // Click the theme switcher
         await app.page.locator('.theme-switcher').click();
         await app.page.waitForTimeout(300);

         const newTheme = await app.page.evaluate(() => window.slice?.theme);
         expect(newTheme).not.toBe(initialTheme);
         expect(app.pageErrors).toEqual([]);
      });
   });
});
