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

  // Rich text written by SOMEBODY ELSE (today: the welcome message of an
  // imported Plantilla). sanitize() is for HTML we build ourselves and so
  // takes DOMPurify's wide profile plus SVG — <img>, <table>… survive there.
  // For foreign content that is too much: an <img src="https://tracker/...">
  // in a shared message leaks the IP and User-Agent of whoever opens it,
  // with nothing to show for it.
  //
  // This list is exactly what EnhancedEditor can produce (bold, italic,
  // underline, lists, paragraphs, links) and nothing else. `style` still
  // never passes.
  //
  // LINKS: `<a href>` is allowed, unlike <img>, because it only reaches the
  // destination when the reader deliberately clicks it, and the destination
  // is visible in the status bar first. DOMPurify's default URI policy
  // already rejects `javascript:`/`data:`; on top of that the hook below
  // forces every link to open in a new tab with `rel="noopener noreferrer
  // nofollow"`, so a shared Plantilla can never reach back into this tab
  // through `window.opener` nor pass the referrer along.
  sanitizeRichText(html) {
    HtmlService._ensureLinkHook();
    return domPurify.sanitize(html == null ? '' : String(html), {
      ALLOWED_TAGS: ['b', 'strong', 'i', 'em', 'u', 'p', 'br', 'ul', 'ol', 'li', 'div', 'span', 'a'],
      ALLOWED_ATTR: ['href', 'target', 'rel'],
    });
  }

  // Registered once per page on the shared DOMPurify instance. It also covers
  // sanitize(), which is what we want: any anchor this app renders gets the
  // same hardening.
  static _linkHookAdded = false;

  static _ensureLinkHook() {
    if (HtmlService._linkHookAdded) return;
    HtmlService._linkHookAdded = true;
    domPurify.addHook('afterSanitizeAttributes', (node) => {
      if (node.tagName !== 'A' || !node.hasAttribute('href')) return;
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener noreferrer nofollow');
    });
  }
}
