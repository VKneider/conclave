import { EXT_PLANTILLA, EXT_RESPUESTAS, EXT_CONSENSO, EXT_BACKUP, APP_NAME, DATA_VERSION, MIME_OCTET } from '../../Core/AppConfig/AppConfig.js';

export default class ExportService {
  _sanitize(name) {
    return name.normalize('NFKD').replace(/[^\w]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '').toLowerCase();
  }

  downloadRespuestas(autor, respuestas) {
    const safe = this._sanitize(autor || 'anonimo');
    this._download(safe, { tipo: 'respuestas', autor: autor || 'Anónimo', respuestas });
  }

  downloadConsenso(autor, respuestas, notas) {
    const label = autor ? `${autor} — lista final` : 'Consenso — lista final';
    const safe = this._sanitize(autor || 'consenso');
    const extra = { tipo: 'consenso', autor: label, respuestas };
    if (notas && typeof notas === 'object' && Object.keys(notas).length) {
      extra.notas = notas;
    }
    this._download(`${safe}_final`, extra);
  }

  downloadBackup() {
    const roster = slice.getComponent('PlantillaService');
    const respuestasService = slice.getComponent('RespuestasService');
    const consenso = slice.getComponent('ConsensoService');
    const imports = slice.getComponent('RespuestasImportService');

    const plantilla = roster.getState();
    const respuestas = respuestasService.getState();
    const respuestasImportadas = imports.getSources();
    const decisionFinal = consenso.getState();
    const notas = consenso._loadNotes();

    const plantillaNombre = plantilla.nombre || 'backup';
    const safe = this._sanitize(plantillaNombre);
    this._download(`${safe}_backup`, {
      tipo: 'backup',
      plantilla: {
        nombre: plantilla.nombre,
        atributos: plantilla.atributos,
        temas: plantilla.temas,
        opciones: plantilla.opciones,
        creadoPor: plantilla.creadoPor || '',
        creadoEmail: plantilla.creadoEmail || '',
      },
      respuestas,
      respuestasImportadas,
      decisionFinal,
      notas,
    });
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
    const ext = extra.tipo === 'plantilla' ? EXT_PLANTILLA : extra.tipo === 'consenso' ? EXT_CONSENSO : extra.tipo === 'backup' ? EXT_BACKUP : EXT_RESPUESTAS;
    const payload = {
      app: APP_NAME,
      version: DATA_VERSION,
      fecha: new Date().toISOString(),
      ...extra,
    };
    slice.getComponent('FileDownloadService').download(
      `${filename}${ext}`,
      JSON.stringify(payload, null, 2),
      MIME_OCTET
    );
  }
}
