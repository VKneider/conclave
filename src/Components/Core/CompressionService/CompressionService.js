import LZString from '../../../libs/lz-string/lz-string.js';

export default class CompressionService {
  compressToURI(data) {
    const json = typeof data === 'string' ? data : JSON.stringify(data);
    return LZString.compressToEncodedURIComponent(json);
  }

  decompressFromURI(encoded) {
    const json = LZString.decompressFromEncodedURIComponent(encoded);
    if (!json) return null;
    return JSON.parse(json);
  }
}
