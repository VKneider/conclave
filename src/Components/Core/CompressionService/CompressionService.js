import LZString from 'lz-string';

const FULL_TO_SHORT = {
  tipo: 't', nombre: 'n', email: 'e',
  temas: 'ts', opciones: 'os', atributos: 'at',
  respuestas: 'rs', autor: 'a',
  seleccion: 'sl', texto: 'tx', voto: 'vt', ranking: 'rk',
  modo: 'm', orden: 'o', participable: 'p', meta: 'mt', temaId: 'ti',
  key: 'k', label: 'l', type: 'tp',
};

const SHORT_TO_FULL = {};
for (const [k, v] of Object.entries(FULL_TO_SHORT)) SHORT_TO_FULL[v] = k;

function _mapKeys(obj, map) {
  if (Array.isArray(obj)) return obj.map((item) => _mapKeys(item, map));
  if (!obj || typeof obj !== 'object') return obj;
  const result = {};
  for (const [k, v] of Object.entries(obj)) {
    result[map[k] || k] = _mapKeys(v, map);
  }
  return result;
}

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

  packForURI(data) {
    return _mapKeys(data, FULL_TO_SHORT);
  }

  unpackFromURI(data) {
    return _mapKeys(data, SHORT_TO_FULL);
  }
}
