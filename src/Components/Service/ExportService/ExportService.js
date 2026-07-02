export default class ExportService {
  downloadRespuestas(autor, respuestas) {
    const safe = (autor || 'anonimo').replace(/[^a-z0-9]+/gi, '_').toLowerCase();
    this._download(`respuestas_${safe}`, { tipo: 'respuestas', autor: autor || 'Anónimo', respuestas });
  }

  downloadRespuestasFinal(autor, respuestas) {
    const label = autor ? `${autor} — lista final` : 'Consenso — lista final';
    const safe = (autor || 'consenso').replace(/[^a-z0-9]+/gi, '_').toLowerCase();
    this._download(`respuestas_final_${safe}`, { tipo: 'respuestas-final', autor: label, respuestas });
  }

  // Not called yet in Fase A — PlantillaBuilderView (Fase B) wires up
  // "Exportar Plantilla" to this.
  downloadPlantilla(plantilla) {
    const nombre = plantilla?.nombre || 'plantilla';
    const safe = nombre.replace(/[^a-z0-9]+/gi, '_').toLowerCase();
    this._download(`plantilla_${safe}`, {
      tipo: 'plantilla',
      nombre,
      autor: plantilla?.autor || '',
      categorias: plantilla?.categorias || [],
      opciones: plantilla?.opciones || [],
    });
  }

  _download(filename, extra) {
    const payload = {
      app: 'conclave',
      version: 2,
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
