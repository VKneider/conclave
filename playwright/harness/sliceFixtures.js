import { test as base, expect } from '@playwright/test';

const DEFAULT_THEME = 'LIGHT';

/**
 * Wait until the Slice runtime has finished booting.
 *
 * `window.slice` and `slice.build` are assigned early in Slice.js init(), long
 * before it finishes — waiting on those returns while themes, components and
 * the router are still being fetched. Reloading or seeding at that point aborts
 * the in-flight requests, init() throws on the aborted fetch, and the runtime
 * ends up half-built (`Failed to fetch`, no slice.router, routes that never
 * render). `slice.router` is the last thing init() assigns, so it is the only
 * one of the three that actually means "ready".
 *
 * @param {import('@playwright/test').Page} page
 */
export async function waitForSliceReady(page) {
   // `window.slice.router` sólo dice que el FRAMEWORK arrancó, no la app.
   await page.waitForFunction(() => !!window.slice?.router);

   // AppShell.init() sigue en vuelo un rato más: construye Providers, TopBar y
   // el MultiRoute, y recién ahí monta la vista. Volver antes de eso hacía que
   // el test navegara a mitad del init, que es justo la carrera de GOTCHAS §35
   // (el Router no encuentra el AppShell todavía registrado, crea un segundo, y
   // los hijos con sliceId fijo revientan con "same slice id already
   // registered"). Como depende de tiempos, fallaba de forma intermitente y con
   // un conjunto distinto de tests en cada corrida.
   //
   // Se espera a que el MultiRoute tenga una vista REAL montada: `slice-loading`
   // no cuenta, porque es lo que muestra mientras todavía está resolviendo.
   await page.waitForFunction(() => {
      // La ruta /__test no usa AppShell: le basta con su raíz de montaje.
      if (document.querySelector('[data-test-root]')) return true;
      const mr = document.querySelector('slice-multi-route');
      return !!mr && !!mr.querySelector(':scope > *:not(slice-loading)');
   });
}

// ── Existing: mount a single component in the /__test harness ────────

export const test = base.extend({
   mount: async ({ page }, use) => {
      const consoleMessages = [];
      const pageErrors = [];
      page.on('console', (msg) => consoleMessages.push({ type: msg.type(), text: msg.text() }));
      page.on('pageerror', (err) => pageErrors.push(err.message));

      await page.goto('/__test');
      await waitForSliceReady(page);
      await page.waitForSelector('[data-test-root]', { state: 'attached' });

      async function mount(name, props = {}, opts = {}) {
         const { spies = [], theme = DEFAULT_THEME } = opts;

         if (theme) {
            await page.evaluate((t) => window.slice.setTheme(t), theme);
         }

         const built = await page.evaluate(
            async ({ name, serializableProps, spies }) => {
               const root = document.querySelector('[data-test-root]');
               root.innerHTML = '';
               window.__sliceTestEvents = {};

               const finalProps = JSON.parse(JSON.stringify(serializableProps));
               for (const spyName of spies) {
                  window.__sliceTestEvents[spyName] = [];
                  finalProps[spyName] = (...args) => {
                     const safe = args.map((a) => {
                        try { return JSON.parse(JSON.stringify(a)); }
                        catch { return String(a); }
                     });
                     window.__sliceTestEvents[spyName].push(safe);
                  };
               }

               const node = await window.slice.build(name, finalProps);
               if (!node) return false;
               root.appendChild(node);
               window.__sliceMounted = node;
               return true;
            },
            { name, serializableProps: props, spies }
         );

         if (!built) {
            throw new Error(
               `slice.build('${name}', ...) returned null. ` +
                  `Check the component is registered in src/Components/components.js and has no build error (see console output).`
            );
         }

         const root = page.locator('[data-test-root]');
         return {
            component: root.locator(':scope > *').first(),
            root,
            locator: (selector) => root.locator(selector),
            events: (handlerName) =>
               page.evaluate((n) => (window.__sliceTestEvents?.[n] || []).length, handlerName),
            eventArgs: (handlerName) =>
               page.evaluate((n) => window.__sliceTestEvents?.[n] || [], handlerName),
            warnings: () => consoleMessages.filter((m) => m.type === 'warning').map((m) => m.text),
            deprecationWarnings: () =>
               consoleMessages
                  .filter((m) => m.type === 'warning' && /\[Slice\].*deprecated/i.test(m.text))
                  .map((m) => m.text),
            consoleMessages: () => [...consoleMessages],
            pageErrors: () => [...pageErrors],
         };
      }

      await use(mount);
   },

   mountHtml: async ({ page }, use) => {
      const consoleMessages = [];
      const pageErrors = [];
      page.on('console', (msg) => consoleMessages.push({ type: msg.type(), text: msg.text() }));
      page.on('pageerror', (err) => pageErrors.push(err.message));

      await page.goto('/__test');
      await waitForSliceReady(page);
      await page.waitForSelector('[data-test-root]', { state: 'attached' });

      async function mountHtml(html = '', opts = {}) {
         const { theme = DEFAULT_THEME, services = [] } = opts;

         if (theme) {
            await page.evaluate((t) => window.slice.setTheme(t), theme);
         }

         await page.evaluate(
            async ({ html, services }) => {
               const root = document.querySelector('[data-test-root]');
               root.innerHTML = html;
               window.__sliceServices = {};
               for (const name of services) {
                  window.__sliceServices[name] = await window.slice.build(name, { singleton: true });
               }
            },
            { html, services }
         );

         const root = page.locator('[data-test-root]');
         return {
            page,
            root,
            locator: (selector) => root.locator(selector),
            consoleMessages: () => [...consoleMessages],
            pageErrors: () => [...pageErrors],
         };
      }

      await use(mountHtml);
   },

   // ── NEW: app fixture for full E2E flows ───────────────────────────
   // Navigates to the real app (not /__test), provides helpers for
   // interacting with slice contexts, modals, inputs, and navigation.
   app: async ({ page }, use) => {
      const consoleMessages = [];
      const pageErrors = [];
      page.on('console', (msg) => consoleMessages.push({ type: msg.type(), text: msg.text() }));
      page.on('pageerror', (err) => pageErrors.push(err.message));

      // Boot: navigate to root and wait for the app (not just the framework)
      await page.goto('/');
      await waitForSliceReady(page);
      await page.waitForTimeout(150);

      /**
       * Clear all conclave-prefixed localStorage keys and reload the app.
       * After reload the app boots fresh with seed data.
       */
      async function resetState() {
         await page.evaluate(() => {
            Object.keys(localStorage)
               .filter((k) => k.startsWith('conclave-'))
               .forEach((k) => localStorage.removeItem(k));
         });
         await page.reload();
         await waitForSliceReady(page);
         await page.waitForTimeout(200);
      }

      /**
       * Navigate to a route via pushState + popstate (avoids full reload).
       */
      async function navigateTo(path) {
         await page.evaluate((p) => {
            history.pushState(null, '', p);
            window.dispatchEvent(new PopStateEvent('popstate'));
         }, path);
         await page.waitForTimeout(300);
      }

      /**
       * Read a slice context value (e.g. 'plantilla', 'respuestas', 'settings').
       * Returns null if the context doesn't exist.
       */
      async function getContext(name) {
         return page.evaluate((n) => {
            const ctx = window.slice?.context;
            return ctx?.has?.(n) ? ctx.getState(n) : null;
         }, name);
      }

      /**
       * Overwrite a slice context value (useful for test setup).
       */
      async function setContext(name, value) {
         await page.evaluate(
            ({ n, v }) => {
               const ctx = window.slice?.context;
               if (ctx?.has?.(n)) {
                  ctx.setState(n, v);
               }
            },
            { n: name, v: value }
         );
         await page.waitForTimeout(50);
      }

      /**
       * Fill a native input element (identified by CSS selector) and trigger blur.
       */
      async function fillInput(selector, text) {
         const loc = page.locator(selector);
         await loc.click();
         await loc.fill(text);
         await loc.evaluate((el) => el.dispatchEvent(new Event('blur', { bubbles: true })));
         await page.waitForTimeout(80);
      }

      /**
       * Click an element and wait for Slice async rendering.
       */
      async function clickAndWait(selector) {
         await page.locator(selector).click();
         await page.waitForTimeout(300);
      }

      /**
       * Confirm the currently active confirm:request dialog.
       * Waits for the modal to appear, then clicks the confirm button.
       */
      async function confirmDialog() {
         await page.waitForSelector('[slice-id="confirmActionDialog"]', {
            state: 'attached',
            timeout: 5000,
         });
         await page.waitForTimeout(150);
         // The confirm button is the LAST slice_button in the footer
         await page
            .locator('[slice-id="confirmActionDialog"] .slice-modal__footer .slice_button')
            .last()
            .click();
         await page.waitForTimeout(150);
      }

      /**
       * Select an option from a Slice Select component by its visible label text.
       * Clicks the container to open, then clicks the matching option.
       */
      async function selectOption(selectSelector, optionText) {
         const loc = typeof selectSelector === 'string' ? page.locator(selectSelector) : selectSelector;
         await loc.click();
         await page.waitForTimeout(200);
         const dropdownLoc = typeof selectSelector === 'string' ? page.locator(selectSelector).locator('..') : selectSelector.locator('..');
         const option = dropdownLoc.locator('.slice_select_menu div[role="option"]').filter({ hasText: optionText });
         await option.click();
         await page.waitForTimeout(200);
      }

      /**
       * Cancel the currently active confirm:request dialog.
       */
      async function cancelDialog() {
         await page.waitForSelector('[slice-id="confirmActionDialog"]', {
            state: 'attached',
            timeout: 5000,
         });
         await page.waitForTimeout(150);
         // The cancel button is the FIRST slice_button in the footer
         await page
            .locator('[slice-id="confirmActionDialog"] .slice-modal__footer .slice_button')
            .first()
            .click();
         await page.waitForTimeout(150);
      }

      await use({
         page,
         resetState,
         navigateTo,
         getContext,
         setContext,
         fillInput,
         clickAndWait,
         selectOption,
         confirmDialog,
         cancelDialog,
         consoleMessages,
         pageErrors,
      });
   },
});

export { expect };
