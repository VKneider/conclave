import { test, expect } from '../../../../playwright/harness/sliceFixtures.js';

// The five contracts that were broken before (see the component's header):
// formatting-preserving truncation, a keyboard-reachable toolbar, paste
// sanitised in the editor, a real setSelectionRange, and links.

const setHtml = (c, html) => c.component.evaluate((el, v) => { el.value = v; }, html);
const getValue = (c) => c.component.evaluate((el) => el.value);
const btn = (c, cmd) => c.locator(`.tp-btn[data-md-cmd="${cmd}"]`);

test.describe('EnhancedEditor', () => {

   test('smoke: builds with its toolbar and editable area', async ({ mount, page }) => {
      const c = await mount('EnhancedEditor', { placeholder: 'Escribe…' });
      await expect(c.locator('.tp-content')).toHaveAttribute('contenteditable', 'true');
      await expect(c.locator('[data-md-toolbar]')).toHaveAttribute('role', 'toolbar');
      // Every toolbar control must be a real button that cannot submit a form.
      const types = await c.locator('.tp-btn').evaluateAll((els) => els.map((e) => e.getAttribute('type')));
      expect(types.every((t) => t === 'button')).toBe(true);
      expect(c.pageErrors()).toEqual([]);
   });

   test('maxLength truncation keeps the formatting before the cut', async ({ mount, page }) => {
      const c = await mount('EnhancedEditor', { maxLength: 60 });
      await c.component.evaluate((el) => {
         const mount_ = el.querySelector('[data-tiptap]');
         mount_.innerHTML = '<p><strong>Titulo</strong></p><ul><li>uno</li><li>dos</li></ul><p>' + 'x'.repeat(200) + '</p>';
         mount_.dispatchEvent(new Event('input', { bubbles: true }));
      });
      await page.waitForTimeout(150);

      const value = await getValue(c);
      // It used to do `textContent = text.slice(0, max)`, which flattened all
      // of this into one plain-text node.
      expect(value).toMatch(/<strong>/i);
      expect(value).toMatch(/<ul>/i);
      expect(await c.component.evaluate((el) => el.textLength)).toBe(60);
      expect(c.pageErrors()).toEqual([]);
   });

   test('the toolbar works from the keyboard (Enter and Space on a focused button)', async ({ mount, page }) => {
      const c = await mount('EnhancedEditor');

      await setHtml(c, '<p>abc</p>');
      await c.locator('.tp-content').click();
      await page.keyboard.press('Control+a');
      await btn(c, 'bold').focus();
      await page.keyboard.press('Enter');
      await page.waitForTimeout(120);
      expect(await getValue(c)).toMatch(/<b>|<strong>/i);

      await setHtml(c, '<p>abc</p>');
      await c.locator('.tp-content').click();
      await page.keyboard.press('Control+a');
      await btn(c, 'underline').focus();
      await page.keyboard.press(' ');
      await page.waitForTimeout(120);
      expect(await getValue(c)).toMatch(/<u>/i);
      expect(c.pageErrors()).toEqual([]);
   });

   test('paste is sanitised inside the editor, not only on save', async ({ mount, page }) => {
      const c = await mount('EnhancedEditor');
      await c.locator('.tp-content').click();
      await page.evaluate(() => {
         const mount_ = document.querySelector('[data-test-root] slice-enhancededitor [data-tiptap]');
         const dt = new DataTransfer();
         dt.setData('text/html', '<h1 style="color:red">T</h1><p><b>negrita</b> <img src="https://tracker.test/p.gif"> <a href="javascript:alert(1)">x</a></p>');
         dt.setData('text/plain', 'T negrita x');
         mount_.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: dt }));
      });
      await page.waitForTimeout(200);

      const html = await c.locator('[data-tiptap]').innerHTML();
      expect(html).toMatch(/<b>|<strong>/i);   // real formatting survives
      expect(html).not.toMatch(/<img/i);        // tracking pixel never renders
      expect(html).not.toMatch(/javascript:/i); // nor a script URL
      expect(html).not.toMatch(/style=/i);      // nor foreign styling
      expect(c.pageErrors()).toEqual([]);
   });

   test('setSelectionRange honours its arguments (plain-text offsets)', async ({ mount, page }) => {
      const c = await mount('EnhancedEditor');
      await setHtml(c, '<p>0123456789</p>');
      await c.component.evaluate((el) => el.setSelectionRange(3, 7));
      const selected = await page.evaluate(() => {
         const s = window.getSelection();
         return s && s.rangeCount ? s.toString() : null;
      });
      // It used to ignore both arguments and merely focus the field.
      expect(selected).toBe('3456');
      expect(c.pageErrors()).toEqual([]);
   });

   test('a bare domain becomes an https link, and the result survives sanitising', async ({ app }) => {
      // Through the real builder: the link flow needs ConfirmActionModal, which
      // Providers owns.
      await app.navigateTo('/plantilla');
      const editor = app.page.locator('slice-enhancededitor').first();
      await editor.scrollIntoViewIfNeeded();
      await editor.evaluate((el) => { el.value = '<p>mi sitio</p>'; });
      await editor.locator('.tp-content').click();
      await app.page.keyboard.press('Control+a');
      await editor.locator('.tp-btn[data-md-cmd="link"]').click();

      const dialog = app.page.locator('[slice-id="confirmActionDialog"]');
      await dialog.locator('input').first().fill('example.com');
      await dialog.locator('.slice-modal__footer .slice_button').last().click();
      await app.page.waitForTimeout(300);

      const value = await editor.evaluate((el) => el.value);
      expect(value).toContain('href="https://example.com/"');

      const sanitised = await app.page.evaluate(
         (h) => window.slice.getComponent('HtmlService').sanitizeRichText(h), value,
      );
      expect(sanitised).toContain('href="https://example.com/"');
      // Hardened on the way out, so a shared Plantilla cannot reach this tab.
      expect(sanitised).toContain('rel="noopener noreferrer nofollow"');
      expect(sanitised).toContain('target="_blank"');
      expect(app.pageErrors).toEqual([]);
   });

   test('a javascript: URL is refused before it is ever inserted', async ({ app }) => {
      await app.navigateTo('/plantilla');
      const editor = app.page.locator('slice-enhancededitor').first();
      await editor.scrollIntoViewIfNeeded();
      await editor.evaluate((el) => { el.value = '<p>peligro</p>'; });
      await editor.locator('.tp-content').click();
      await app.page.keyboard.press('Control+a');
      await editor.locator('.tp-btn[data-md-cmd="link"]').click();

      const dialog = app.page.locator('[slice-id="confirmActionDialog"]');
      await dialog.locator('input').first().fill('javascript:alert(1)');
      await dialog.locator('.slice-modal__footer .slice_button').last().click();
      await app.page.waitForTimeout(300);

      const value = await editor.evaluate((el) => el.value);
      expect(value).not.toMatch(/javascript:/i);
      expect(value).not.toMatch(/<a /i);
      expect(app.pageErrors).toEqual([]);
   });
});
