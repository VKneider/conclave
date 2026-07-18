import { EXT_PLANTILLA, EXT_RESPUESTAS, APP_NAME, DATA_VERSION } from '../../Core/AppConfig/AppConfig.js';

export default class ExportService {
  _sanitize(name) {
    return name.normalize('NFKD').replace(/[^\w]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '').toLowerCase();
  }

  downloadRespuestas(autor, respuestas) {
    const safe = this._sanitize(autor || 'anonimo');
    this._download(safe, { tipo: 'respuestas', autor: autor || 'Anónimo', respuestas });
  }

  downloadRespuestasFinal(autor, respuestas) {
    const label = autor ? `${autor} — lista final` : 'Consenso — lista final';
    const safe = this._sanitize(autor || 'consenso');
    this._download(`${safe}_final`, { tipo: 'respuestas-final', autor: label, respuestas });
  }

  downloadPlantilla(plantilla) {
    const nombre = plantilla?.nombre || 'plantilla';
    const safe = this._sanitize(nombre);
    this._download(safe, {
      tipo: 'plantilla',
      nombre,
      autor: plantilla?.autor || '',
      email: plantilla?.email || '',
      atributos: plantilla?.atributos || [],
      temas: plantilla?.temas || [],
      opciones: plantilla?.opciones || [],
    });
  }

  _download(filename, extra) {
    const ext = extra.tipo === 'plantilla' ? EXT_PLANTILLA : EXT_RESPUESTAS;
    const payload = {
      app: APP_NAME,
      version: DATA_VERSION,
      fecha: new Date().toISOString(),
      ...extra,
    };
    slice.getComponent('FileDownloadService').download(
      `${filename}${ext}`,
      JSON.stringify(payload, null, 2),
      'application/json'
    );
  }
}
