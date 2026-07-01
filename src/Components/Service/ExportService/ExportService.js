export default class ExportService {
  downloadAsignaciones(autor, asignaciones) {
    const safe = (autor || 'anonimo').replace(/[^a-z0-9]+/gi, '_').toLowerCase();
    this._download(`asignaciones_${safe}`, { autor: autor || 'Anónimo', asignaciones });
  }

  downloadFinalList(autor, asignaciones) {
    const label = autor ? `${autor} — lista final` : 'Consenso — lista final';
    const safe = (autor || 'consenso').replace(/[^a-z0-9]+/gi, '_').toLowerCase();
    this._download(`lista_final_equipos_${safe}`, { tipo: 'lista-final', autor: label, asignaciones });
  }

  _download(filename, extra) {
    const payload = {
      app: 'conclave',
      version: 1,
      fecha: new Date().toISOString(),
      ...extra,
    };
    slice.getComponent('FileDownloadService').download(
      `${filename}.json`,
      JSON.stringify(payload, null, 2),
      'application/json'
    );
  }
}
