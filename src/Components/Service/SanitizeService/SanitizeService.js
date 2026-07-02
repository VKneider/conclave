import domPurify from '../../../libs/DOMpurify/purify.es.mjs';

// Encapsulates DOMPurify behind a Service (getComponent), matching the
// project convention: components/util code is never imported directly from
// a view — vendored library imports stay relative and live inside a Service
// wrapper. Sanitizes a fully-assembled HTML string right before it's
// assigned to innerHTML — a safety net on top of FormatService.esc()
// (which already encodes individual dynamic tokens), so a forgotten esc()
// call on some future interpolation still can't execute a script tag or an
// on*/javascript: handler. Plantilla/Respuestas JSON imported from someone
// else's device is the untrusted input this defends against.
export default class SanitizeService {
  sanitize(html) {
    return domPurify.sanitize(html == null ? '' : String(html));
  }
}
