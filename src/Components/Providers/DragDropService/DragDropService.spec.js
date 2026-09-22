import { test, expect } from '../../../../playwright/harness/sliceFixtures.js';
import { seedAsignacion } from '../../../../playwright/harness/seedHelpers.js';

// Touch behaviour of the vendored DragDropService (see its header comment).
// Playwright's touchscreen can only tap, so the gesture is driven with
// synthetic PointerEvents (pointerType: 'touch') and TouchEvents, which is
// exactly the input the service reacts to. The board ("Por tema") is the real
// consumer: OpcionChip draggables + square droppables.

async function openBoard(app) {
   await seedAsignacion(app);
   await app.navigateTo('/mis-respuestas');
   await expect(app.page.locator('[data-slot="carousel"]')).toBeVisible();
   await app.page.locator('button.slice_tab_button[data-tab-id="board"]').click();
   await app.page.waitForTimeout(300);
   await expect(app.page.locator('slice-portemaview .ps-square[data-drop]').first()).toBeVisible();
}

// Dispatches on the element under (x, y) so bubbling matches a real pointer.
async function pointer(app, type, x, y, extra = {}) {
   await app.page.evaluate(([type, x, y, extra]) => {
      const target = document.elementFromPoint(x, y) || document.body;
      target.dispatchEvent(new PointerEvent(type, {
         bubbles: true, cancelable: true, composed: true,
         pointerId: 7, pointerType: 'touch', isPrimary: true, button: 0, buttons: type === 'pointerup' ? 0 : 1,
         clientX: x, clientY: y, ...extra,
      }));
   }, [type, x, y, extra]);
}

// Returns whether the touchmove was preventDefault()ed by the service.
async function touchMove(app, x, y) {
   return app.page.evaluate(([x, y]) => {
      const target = document.elementFromPoint(x, y) || document.body;
      const touch = new Touch({ identifier: 7, target, clientX: x, clientY: y });
      const ev = new TouchEvent('touchmove', { bubbles: true, cancelable: true, touches: [touch], targetTouches: [touch], changedTouches: [touch] });
      return !target.dispatchEvent(ev);
   }, [x, y]);
}

// Viewport coordinates of the element's centre — scrolled into view first,
// since elementFromPoint() only sees what's on screen.
async function center(locator) {
   await locator.scrollIntoViewIfNeeded();
   const b = await locator.boundingBox();
   return { x: Math.round(b.x + b.width / 2), y: Math.round(b.y + b.height / 2) };
}

// Synthetic events don't wait for actionability like Playwright's actions do,
// so the startup Loading overlay (which would swallow elementFromPoint) has
// to be gone before dispatching.
async function openBuilder(app) {
   await seedAsignacion(app);
   await app.navigateTo('/plantilla');
   const rows = app.page.locator('#catList slice-temarow');
   await expect(rows).not.toHaveCount(0);
   await app.page.locator('slice-loading').waitFor({ state: 'detached', timeout: 10000 });
   return rows;
}

const dndState = (app) => app.page.evaluate(() => {
   const d = window.slice.getComponent('DragDropService');
   return { drag: !!d._activeDrag, touch: !!d._touch, ghost: !!document.querySelector('.dnd-ghost') };
});

test.describe('DragDropService — táctil', () => {

   test('un deslizamiento rápido (scroll) no arranca el arrastre y pointercancel deja el servicio limpio', async ({ app }) => {
      await openBoard(app);
      const chip = app.page.locator('slice-portemaview [data-chips="unassigned"] .opcion-chip').first();
      const c = await center(chip);

      await pointer(app, 'pointerdown', c.x, c.y);
      expect(await dndState(app)).toEqual({ drag: false, touch: true, ghost: false });
      // Finger moves right away (beyond the slop) → this is a scroll.
      await pointer(app, 'pointermove', c.x, c.y + 40);
      expect(await dndState(app)).toEqual({ drag: false, touch: false, ghost: false });
      // The browser then takes the gesture.
      await pointer(app, 'pointercancel', c.x, c.y + 40);
      expect(await dndState(app)).toEqual({ drag: false, touch: false, ghost: false });

      // Not stuck: a later gesture still works.
      await pointer(app, 'pointerdown', c.x, c.y);
      await app.page.waitForTimeout(350);
      expect(await dndState(app)).toEqual({ drag: true, touch: true, ghost: true });
      await pointer(app, 'pointerup', c.x, c.y);
      expect(await dndState(app)).toEqual({ drag: false, touch: false, ghost: false });
      expect(app.pageErrors).toEqual([]);
   });

   test('mantener el dedo arma el arrastre, bloquea el scroll y suelta en un tema', async ({ app }) => {
      await openBoard(app);
      const chipEl = app.page.locator('slice-portemaview [data-chips="unassigned"] slice-opcionchip').first();
      const chip = chipEl.locator('.opcion-chip');
      const opcionId = await chipEl.evaluate((el) => String(el.opcion.id));
      const square = app.page.locator('slice-portemaview .ps-square[data-drop="anfitriones"]');
      const c = await center(chip);
      const s = await center(square);

      await pointer(app, 'pointerdown', c.x, c.y);
      // Before the hold elapses the page may scroll: touchmove is NOT blocked.
      expect(await touchMove(app, c.x, c.y)).toBe(false);
      await app.page.waitForTimeout(350);
      // Armed: ghost under the finger, and touchmove is now blocked.
      expect(await dndState(app)).toEqual({ drag: true, touch: true, ghost: true });
      expect(await touchMove(app, c.x + 2, c.y + 2)).toBe(true);

      await pointer(app, 'pointermove', s.x, s.y);
      await expect(square).toHaveClass(/drag-over/);
      await pointer(app, 'pointerup', s.x, s.y);
      await app.page.waitForTimeout(300);

      const respuestas = await app.getContext('respuestas');
      expect(respuestas.seleccion[opcionId]).toBe('anfitriones');
      expect(await dndState(app)).toEqual({ drag: false, touch: false, ghost: false });
      expect(app.pageErrors).toEqual([]);
   });

   test('pointercancel a mitad de arrastre: sin drop, sin fantasma, hover limpio', async ({ app }) => {
      await openBoard(app);
      const chipEl = app.page.locator('slice-portemaview [data-chips="unassigned"] slice-opcionchip').first();
      const opcionId = await chipEl.evaluate((el) => String(el.opcion.id));
      const square = app.page.locator('slice-portemaview .ps-square[data-drop="anfitriones"]');
      const c = await center(chipEl.locator('.opcion-chip'));
      const s = await center(square);

      await pointer(app, 'pointerdown', c.x, c.y);
      await app.page.waitForTimeout(350);
      await pointer(app, 'pointermove', s.x, s.y);
      await expect(square).toHaveClass(/drag-over/);

      await pointer(app, 'pointercancel', s.x, s.y);
      await app.page.waitForTimeout(200);
      await expect(square).not.toHaveClass(/drag-over/);
      expect(await dndState(app)).toEqual({ drag: false, touch: false, ghost: false });
      expect((await app.getContext('respuestas')).seleccion[opcionId]).toBeUndefined();
      expect(app.pageErrors).toEqual([]);
   });

   test('en teléfono el auto-scroll pasa de la barra lateral a la página hasta alcanzar un cuadro', async ({ app }) => {
      // Stacked layout: the sidebar is a nested scroll container and the
      // squares sit below the fold — the drop is only reachable if, once the
      // sidebar is exhausted, the PAGE scrolls under the held finger.
      await app.page.setViewportSize({ width: 412, height: 800 });
      await openBoard(app);
      const chipEl = app.page.locator('slice-portemaview [data-chips="unassigned"] slice-opcionchip').first();
      const opcionId = await chipEl.evaluate((el) => String(el.opcion.id));
      const c = await center(chipEl.locator('.opcion-chip'));
      const scrollY0 = await app.page.evaluate(() => window.scrollY);

      await pointer(app, 'pointerdown', c.x, c.y);
      await app.page.waitForTimeout(350);
      expect(await dndState(app)).toEqual({ drag: true, touch: true, ghost: true });

      // Hold the finger at the bottom edge; the rAF loop does the rest.
      const edgeY = 800 - 16;
      await pointer(app, 'pointermove', c.x, edgeY);
      await expect.poll(() => app.page.evaluate(() => window.scrollY), { timeout: 5000 }).toBeGreaterThan(scrollY0 + 40);
      await expect.poll(async () => {
         await pointer(app, 'pointermove', c.x, edgeY);   // re-hit-test at the new scroll position
         return app.page.evaluate(() => document.querySelector('slice-portemaview .ps-square.drag-over')?.dataset.drop || null);
      }, { timeout: 5000 }).not.toBeNull();
      const target = await app.page.evaluate(() => document.querySelector('slice-portemaview .ps-square.drag-over').dataset.drop);

      await pointer(app, 'pointerup', c.x, edgeY);
      await app.page.waitForTimeout(300);
      expect((await app.getContext('respuestas')).seleccion[opcionId]).toBe(target);
      expect(await dndState(app)).toEqual({ drag: false, touch: false, ghost: false });
      expect(app.pageErrors).toEqual([]);
   });

   test('sortable táctil: arma tras la espera y pointercancel devuelve la fila a su sitio', async ({ app }) => {
      const rows = await openBuilder(app);
      const idsBefore = await rows.evaluateAll((els) => els.map((e) => e.dataset.temaId));

      // Press on the row's hint text (not on a control) so the sort is eligible.
      const hint = rows.nth(1).locator('.cat-row__hint');
      const c = await center(hint);
      await pointer(app, 'pointerdown', c.x, c.y);
      // Not armed yet: nothing hidden, no placeholder.
      expect(await app.page.locator('#catList .dnd-sortable-ph').count()).toBe(0);
      await app.page.waitForTimeout(350);
      expect(await app.page.locator('#catList .dnd-sortable-ph').count()).toBe(1);
      expect(await app.page.locator('.dnd-ghost').count()).toBe(1);

      // Drag two rows down, then the browser interrupts.
      const target = await center(rows.nth(3));
      await pointer(app, 'pointermove', target.x, target.y + 10);
      await pointer(app, 'pointercancel', target.x, target.y + 10);
      await app.page.waitForTimeout(200);

      expect(await app.page.locator('#catList .dnd-sortable-ph').count()).toBe(0);
      expect(await app.page.locator('.dnd-ghost').count()).toBe(0);
      await expect(rows.nth(1)).toBeVisible();
      expect(await rows.evaluateAll((els) => els.map((e) => e.dataset.temaId))).toEqual(idsBefore);
      expect((await app.getContext('plantilla')).temas.map((t) => t.id)).toEqual(idsBefore);
      expect(app.pageErrors).toEqual([]);
   });

   test('sortable táctil: un drop real reordena la Plantilla', async ({ app }) => {
      const rows = await openBuilder(app);
      const idsBefore = await rows.evaluateAll((els) => els.map((e) => e.dataset.temaId));

      const c = await center(rows.nth(0).locator('.cat-row__hint'));
      await pointer(app, 'pointerdown', c.x, c.y);
      await app.page.waitForTimeout(350);
      const target = await center(rows.nth(2));
      await pointer(app, 'pointermove', target.x, target.y + 10);
      await pointer(app, 'pointerup', target.x, target.y + 10);
      await app.page.waitForTimeout(400);

      const temas = (await app.getContext('plantilla')).temas;
      expect(temas.map((t) => t.id)).not.toEqual(idsBefore);
      expect(temas[0].id).toBe(idsBefore[1]);
      expect(temas.map((t) => t.orden)).toEqual(temas.map((_, i) => i + 1));
      expect(app.pageErrors).toEqual([]);
   });
});
