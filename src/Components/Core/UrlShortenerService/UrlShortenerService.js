import { SHARE_URL_MAX_LENGTH, URL_SHORTENER_ENDPOINT, URL_SHORTENER_PUBLIC_ORIGIN } from '../../../AppConfig.js';

const SHORT_PATH_PATTERN = /^\/([a-zA-Z0-9]{4,32})$/;

function normalizeEndpoint(value) {
  if (typeof value !== 'string' || !value.trim()) return '';

  try {
    const parsed = new URL(value.trim());
    if (!['http:', 'https:'].includes(parsed.protocol)) return '';
    return parsed.origin;
  } catch (_) {
    return '';
  }
}

// Optional integration with the generic Go Worker. An empty endpoint preserves
// the self-contained hash links for local/staging builds.
export default class UrlShortenerService {
  init() {
    this._endpoint = normalizeEndpoint(URL_SHORTENER_ENDPOINT);
    this._publicOrigin = normalizeEndpoint(URL_SHORTENER_PUBLIC_ORIGIN) || this._endpoint;
  }

  isEnabled() {
    return Boolean(this._endpoint);
  }

  async shorten(target, preview = null) {
    if (!this.isEnabled()) return null;

    try {
      const response = await fetch(`${this._endpoint}/api/v1/links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          destination: target,
          ...(preview ? { preview } : {}),
        }),
      });
      if (!response.ok) throw new Error(`Worker respondió ${response.status}`);

      const payload = await response.json();
      const shortUrl = typeof payload?.url === 'string' ? new URL(payload.url) : null;
      if (!shortUrl || shortUrl.origin !== this._publicOrigin || !SHORT_PATH_PATTERN.test(shortUrl.pathname)) {
        throw new Error('El Worker devolvió un enlace inválido');
      }
      return shortUrl.href;
    } catch (error) {
      console.warn('[UrlShortenerService] No se pudo acortar el enlace:', error.message);
      return null;
    }
  }

  // Returns the short URL when available. If the Worker is disabled or
  // temporarily unreachable, use the existing self-contained URL as a
  // transparent fallback, unless it is too long for a direct share.
  async getShareUrl(target, maxLength = SHARE_URL_MAX_LENGTH, preview = null) {
    const shortUrl = await this.shorten(target, preview);
    if (shortUrl) return shortUrl;
    return target.length <= maxLength ? target : null;
  }

  async resolve(sharedUrl) {
    if (!this.isEnabled()) return null;

    let parsed;
    try {
      parsed = new URL(sharedUrl);
    } catch (_) {
      return null;
    }

    const match = parsed.pathname.match(SHORT_PATH_PATTERN);
    if (parsed.origin !== this._publicOrigin || !match) return null;
    const [, code] = match;

    try {
      const response = await fetch(`${this._endpoint}/api/v1/links/${encodeURIComponent(code)}`, {
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) return null;
      const payload = await response.json();
      return typeof payload?.destination === 'string' ? payload.destination : null;
    } catch (error) {
      console.warn('[UrlShortenerService] No se pudo resolver el enlace:', error.message);
      return null;
    }
  }
}
