import { test, expect } from '../../../playwright/harness/sliceFixtures.js';
import { injectPlantilla, SEED_ASIGNACION } from '../../../playwright/harness/seedHelpers.js';

// Mensaje de bienvenida de la Plantilla: lo escribe el autor en el builder,
// viaja dentro de la Plantilla, y quien la importa lo ve en BienvenidaModal y
// en el banner de RespuestasView.
//
// El bloque 12.4 es el que más importa: el mensaje es HTML que escribió OTRA
// persona, así que la app lo pasa por HtmlService.sanitizeRichText() en vez
// del sanitize() genérico. Sin eso, un <img> en una Plantilla compartida
// filtra la IP de quien la abre sin mostrar nada.

const MENSAJE = '<p>Hola equipo, respondan antes del <strong>viernes</strong>.</p><ul><li>Primero</li><li>Segundo</li></ul>';

// `importada: true` = la Plantilla llegó de otra persona. Es la condición que
// separa "mensaje que tengo que leer" de "mi propio mensaje para otros".
const conBienvenida = (bienvenida, extra = {}) => ({
  ...SEED_ASIGNACION, bienvenida, importada: true, creadoPor: 'Ana', creadoEmail: 'ana@ejemplo.com', ...extra,
});

const getBienvenida = (page) => page.evaluate(() => slice.getComponent('PlantillaService').getBienvenida());

// Navega PRIMERO y recarga en el sitio (injectPlantilla conserva la URL).
//
// El orden importa: inyectar-y-recargar en `/` y navegar después provoca a
// veces que la vista se construya dos veces, y la segunda muere con "same
// slice id already registered" porque RespuestasView usa sliceIds fijos para
// sus hijos (avViewHeader, avKindTabs…). Es un fallo preexistente de esta app
// —también hace fallar specs en master— pero acá además envenenaba los tests:
// un "el banner no aparece" pasa igual de bien cuando la vista entera no montó.
// Por eso el helper afirma explícitamente que la vista está montada.
async function montar(app, ruta, plantilla) {
  await app.navigateTo(ruta);
  await injectPlantilla(app, plantilla);
  await app.page.waitForTimeout(300);
}

const esperarVista = (app, tag) => expect(app.page.locator(tag)).toBeVisible();

test.describe('12. Mensaje de bienvenida', () => {

  test.describe('12.1 Editor en PlantillaBuilderView', () => {

    test('12.1.1: escribir el mensaje lo guarda en el contexto', async ({ app }) => {
      await montar(app, '/plantilla', conBienvenida(''));
      await esperarVista(app, 'slice-plantillabuilderview');

      const editor = app.page.locator('#bienvenidaSlot slice-enhancededitor [contenteditable]');
      await expect(editor).toBeVisible();
      await editor.click();
      await editor.fill('Nos vemos el viernes');
      // El guardado va con debounce mientras se escribe y se fuerza al salir.
      await app.page.locator('#plantillaNombreSlot input').click();
      await app.page.waitForTimeout(600);

      expect(await getBienvenida(app.page)).toContain('Nos vemos el viernes');
      expect(app.pageErrors).toEqual([]);
    });

    test('12.1.2: el mensaje guardado se muestra al volver a la vista', async ({ app }) => {
      await montar(app, '/plantilla', conBienvenida(MENSAJE));
      await esperarVista(app, 'slice-plantillabuilderview');

      const editor = app.page.locator('#bienvenidaSlot slice-enhancededitor [contenteditable]');
      await expect(editor).toContainText('respondan antes del viernes');
      // El contador cuenta TEXTO PLANO, no el HTML.
      await expect(app.page.locator('#bienvenidaCount')).toContainText('/');
      expect(app.pageErrors).toEqual([]);
    });

  });

  test.describe('12.1b Vista previa', () => {

    test('12.1b.1: muestra el mensaje en el mismo modal que verá quien importe', async ({ app }) => {
      await montar(app, '/plantilla', conBienvenida(MENSAJE));
      await esperarVista(app, 'slice-plantillabuilderview');

      await app.page.locator('#bienvenidaPreviewSlot .slice_button').click();
      await app.page.waitForTimeout(400);

      const dialog = app.page.locator('[slice-id="bienvenidaDialog"]');
      await expect(dialog).toBeVisible();
      await expect(dialog).toContainText('respondan antes del viernes');
      // El cuerpo es idéntico al real; sólo cambian el título y el pie. Es una
      // previsualización, no el flujo de import, así que no debe ofrecer el CTA
      // que saca al autor de la vista que está editando.
      await expect(dialog).toContainText('Vista previa del mensaje');
      await expect(dialog).not.toContainText('Empezar a responder');
      expect(app.pageErrors).toEqual([]);
    });

    test('12.1b.2: refleja lo recién escrito, sin esperar al debounce', async ({ app }) => {
      await montar(app, '/plantilla', conBienvenida(''));
      await esperarVista(app, 'slice-plantillabuilderview');

      const editor = app.page.locator('#bienvenidaSlot slice-enhancededitor [contenteditable]');
      await editor.click();
      await editor.fill('Recién escrito');
      // Sin esperar los 400 ms del debounce: el botón fuerza el guardado.
      await app.page.locator('#bienvenidaPreviewSlot .slice_button').click();
      await app.page.waitForTimeout(400);

      await expect(app.page.locator('[slice-id="bienvenidaDialog"]')).toContainText('Recién escrito');
      expect(app.pageErrors).toEqual([]);
    });

    test('12.1b.3: sin mensaje avisa en vez de abrir un modal vacío', async ({ app }) => {
      await montar(app, '/plantilla', conBienvenida(''));
      await esperarVista(app, 'slice-plantillabuilderview');

      await app.page.locator('#bienvenidaPreviewSlot .slice_button').click();
      await app.page.waitForTimeout(400);

      await expect(app.page.locator('[slice-id="bienvenidaDialog"]')).toBeHidden();
      expect(app.pageErrors).toEqual([]);
    });
  });

  test.describe('12.2 Banner en RespuestasView', () => {

    test('12.2.0: en una Plantilla propia el banner no aparece, aunque tenga mensaje', async ({ app }) => {
      // El autor escribió el mensaje para OTROS: devolvérselo acá es ruido.
      // Lo sigue viendo y editando en el builder, que es donde corresponde.
      await montar(app, '/mis-respuestas', { ...SEED_ASIGNACION, bienvenida: MENSAJE, importada: false });
      await esperarVista(app, 'slice-respuestasview');

      await expect(app.page.locator('.av-bienvenida')).toBeHidden();
      expect(app.pageErrors).toEqual([]);
    });

    test('12.2.3: se puede ocultar, y sigue oculto al volver', async ({ app }) => {
      await montar(app, '/mis-respuestas', conBienvenida(MENSAJE));
      await esperarVista(app, 'slice-respuestasview');

      await expect(app.page.locator('.av-bienvenida')).toBeVisible();
      await app.page.locator('.av-bienvenida__dismiss').click();
      await app.page.waitForTimeout(300);
      await expect(app.page.locator('.av-bienvenida')).toBeHidden();

      // Persiste: no es un ocultado en memoria que vuelva al navegar.
      await app.navigateTo('/plantilla');
      await app.navigateTo('/mis-respuestas');
      await app.page.waitForTimeout(500);
      await expect(app.page.locator('.av-bienvenida')).toBeHidden();
      expect(app.pageErrors).toEqual([]);
    });

    test('12.2.4: ocultar un mensaje no silencia el siguiente', async ({ app }) => {
      // Por eso se guarda la huella del mensaje y no un booleano: si no, la
      // primera vez que alguien oculta uno, no vuelve a ver ninguno nunca más.
      await montar(app, '/mis-respuestas', conBienvenida(MENSAJE));
      await esperarVista(app, 'slice-respuestasview');
      await app.page.locator('.av-bienvenida__dismiss').click();
      await app.page.waitForTimeout(300);
      await expect(app.page.locator('.av-bienvenida')).toBeHidden();

      // Llega OTRA Plantilla, con otro mensaje: el ocultado anterior no aplica.
      await app.page.evaluate(() => {
        const p = slice.getComponent('PlantillaService');
        p.setBienvenida('<p>Este es un mensaje totalmente distinto</p>');
        p.marcarComoImportada();
      });
      await app.page.waitForTimeout(300);

      await expect(app.page.locator('.av-bienvenida')).toBeVisible();
      expect(app.pageErrors).toEqual([]);
    });

    test('12.2.1: sin mensaje, el banner no aparece', async ({ app }) => {
      await montar(app, '/mis-respuestas', conBienvenida(''));
      await esperarVista(app, 'slice-respuestasview');

      await expect(app.page.locator('.av-bienvenida')).toBeHidden();
      expect(app.pageErrors).toEqual([]);
    });

    test('12.2.2: con mensaje, el banner se muestra plegado y se despliega', async ({ app }) => {
      await montar(app, '/mis-respuestas', conBienvenida(MENSAJE));
      await esperarVista(app, 'slice-respuestasview');

      const banner = app.page.locator('.av-bienvenida');
      await expect(banner).toBeVisible();
      // Lleva el nombre de quien la creó, para que se lea como un mensaje de
      // una persona y no como un aviso del sistema.
      await expect(app.page.locator('.av-bienvenida__title')).toContainText('Ana');
      await expect(app.page.locator('.av-bienvenida__body')).toBeHidden();

      await app.page.locator('.av-bienvenida__toggle').click();
      await app.page.waitForTimeout(200);

      await expect(app.page.locator('.av-bienvenida__body')).toBeVisible();
      await expect(app.page.locator('.av-bienvenida__body')).toContainText('respondan antes del viernes');
      expect(app.pageErrors).toEqual([]);
    });
  });

  test.describe('12.3 Persistencia y migración', () => {

    test('12.3.1: una Plantilla vieja sin el campo migra a mensaje vacío', async ({ app }) => {
      // Forma anterior a la feature: sin la clave `bienvenida`.
      await montar(app, '/plantilla', { ...SEED_ASIGNACION });
      await esperarVista(app, 'slice-plantillabuilderview');

      expect(await getBienvenida(app.page)).toBe('');
      await expect(app.page.locator('.av-bienvenida')).toBeHidden();
      expect(app.pageErrors).toEqual([]);
    });
  });

  test.describe('12.4 Saneado del HTML importado', () => {

    test('12.4.1: descarta <img> y <a> de un mensaje ajeno', async ({ app }) => {
      await montar(app, '/plantilla', conBienvenida(''));
      await esperarVista(app, 'slice-plantillabuilderview');

      const limpio = await app.page.evaluate(() => slice.getComponent('HtmlService')
        .sanitizeRichText('<p>Hola <strong>equipo</strong></p><img src="https://rastreador.example/pixel.gif"><a href="https://malo.example">click</a>'));

      // Sobrevive el formato real del editor...
      expect(limpio).toContain('<strong>equipo</strong>');
      // ...y se cae todo lo que puede filtrar datos o llevarse a otro sitio.
      expect(limpio).not.toContain('<img');
      expect(limpio).not.toContain('rastreador.example');
      expect(limpio).not.toContain('href');
      expect(app.pageErrors).toEqual([]);
    });

    test('12.4.2: importar una Plantilla con <img> no lo persiste', async ({ app }) => {
      await montar(app, '/plantilla', conBienvenida(''));
      await esperarVista(app, 'slice-plantillabuilderview');

      await app.page.evaluate(() => {
        const p = slice.getComponent('PlantillaService');
        const prep = p.prepareImport({
          nombre: 'Ajena', temas: [], opciones: [], atributos: [],
          bienvenida: '<p>Hola</p><img src="https://rastreador.example/pixel.gif">',
        });
        p.loadFromData(prep.temas, prep.opciones, prep.nombre, prep.atributos, 'Ana', '', prep.bienvenida);
      });
      await app.page.waitForTimeout(300);

      const guardado = await getBienvenida(app.page);
      expect(guardado).toContain('Hola');
      expect(guardado).not.toContain('<img');
      expect(app.pageErrors).toEqual([]);
    });
  });
});
