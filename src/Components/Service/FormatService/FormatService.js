// Stateless formatting helpers shared across views. Exists as a Service
// (recovered via slice.getComponent) instead of a plain util module imported
// by absolute path — Slice components must not import each other directly,
// and cross-file JS imports need to be relative for the bundler to trace
// them; routing shared helpers through a Service sidesteps both.
export default class FormatService {
  esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, (c) => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  }
}
