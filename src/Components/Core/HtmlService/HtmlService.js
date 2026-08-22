import domPurify from 'dompurify';

// Safe-HTML helpers for views — the fusion of the old FormatService (esc) and
// SanitizeService (DOMPurify) into one core service, so a view caches ONE
// instance instead of two, with no `.bind` and no double getComponent:
//
//   this._html = slice.getComponent('HtmlService');           // once, in init()
//   this.$root.innerHTML = this._html.sanitize(`...${this._html.esc(x)}...`);
//
// The innerHTML assignment stays EXPLICIT in the view (no hidden setHtml) —
// this service only provides the pure functions:
//   • esc()      encodes individual dynamic tokens as they're interpolated.
//   • sanitize() is the final net right before an innerHTML assignment, on top
//     of esc(), against Plantilla/Respuestas JSON imported from other devices.
export default class HtmlService {
  esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, (c) => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  }

  sanitize(html) {
    return domPurify.sanitize(html == null ? '' : String(html), {
      ADD_TAGS: ['svg', 'path', 'circle', 'line', 'polyline', 'polygon', 'rect', 'g', 'defs', 'use'],
      ADD_ATTR: ['d', 'cx', 'cy', 'r', 'x', 'y', 'width', 'height', 'viewBox', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'xmlns'],
    });
  }

  // Texto enriquecido escrito por OTRA persona (hoy: el mensaje de bienvenida
  // de una Plantilla importada). sanitize() sirve para HTML que armamos
  // nosotros y por eso admite el perfil ancho de DOMPurify más SVG — ahí
  // sobreviven <img>, <a href>, <table>… Para contenido ajeno eso es
  // demasiado: un <img src="https://tracker/..."> en un mensaje compartido
  // filtra la IP y el User-Agent de quien lo abre, sin que haya nada que
  // mostrar. Esta lista es exactamente lo que produce EnhancedEditor
  // (negrita, cursiva, listas, párrafos) y nada más; sin atributos, así que
  // tampoco pasan `style` ni `href`.
  sanitizeRichText(html) {
    return domPurify.sanitize(html == null ? '' : String(html), {
      ALLOWED_TAGS: ['b', 'strong', 'i', 'em', 'u', 'p', 'br', 'ul', 'ol', 'li', 'div', 'span'],
      ALLOWED_ATTR: [],
    });
  }
}
