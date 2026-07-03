import domPurify from '../../../libs/DOMpurify/purify.es.mjs';

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
    return domPurify.sanitize(html == null ? '' : String(html));
  }
}
