import { EXT_PLANTILLA, EXT_RESPUESTAS } from '../../Core/AppConfig/AppConfig.js';
import { ensureContext } from '../../../utils/context.js';

const CONTEXT = 'respuestasImportadas';
const STORAGE_KEY = 'conclave-respuestas-importadas-v1';

// Validates and persists imported comparison sources — read and repainted
// by CompareView/CompareCarousel/FinalTally (and TextCompareCards, Fase C).
// Several components read and react to this same list, so per
// context-vs-events.md it belongs in Context (a deliberate upgrade over the
// old ImportService's plain in-memory array + manual localStorage sync).
export default class RespuestasImportService {
  init() {
    ensureContext(CONTEXT, [], STORAGE_KEY);
    this._normalizeAgainstPlantilla();
  }

  // Drops entries that reference opciones/categorías that no longer exist
  // in the current Plantilla (equivalent to the old ImportService._load()
  // filtering against RosterService on every boot).
  _normalizeAgainstPlantilla() {
    const plantilla = slice.getComponent('PlantillaService');
    const next = this.getSources().map((src) => {
      const seleccion = Object.fromEntries(
        Object.entries(src.respuestas?.seleccion || {}).filter(([opcionId, categoriaId]) =>
          plantilla.getOpcionById(opcionId) && plantilla.getCategoriaById(categoriaId)
        )
      );
      const texto = Object.fromEntries(
        Object.entries(src.respuestas?.texto || {}).filter(([categoriaId]) => plantilla.getCategoriaById(categoriaId))
      );
      return { ...src, respuestas: { seleccion, texto } };
    }).filter((src) => Object.keys(src.respuestas.seleccion).length > 0 || Object.keys(src.respuestas.texto).length > 0);
    slice.context.setState(CONTEXT, () => next);
  }

  getSources() {
    ensureContext(CONTEXT, [], STORAGE_KEY);
    return slice.context.getState(CONTEXT);
  }

  isDuplicate(data) {
    const autor = data?.autor || '';
    const seleccion = data?.respuestas?.seleccion || {};
    return this.getSources().some(
      (s) => s.autor === autor && JSON.stringify(s.respuestas.seleccion) === JSON.stringify(seleccion)
    );
  }

  import(data, filename) {
    const plantilla = slice.getComponent('PlantillaService');
    const extPattern = new RegExp(`\\.(json|${EXT_PLANTILLA.slice(1)}|${EXT_RESPUESTAS.slice(1)})$`, 'i');
    const autorBase = data?.autor ? String(data.autor) : filename.replace(extPattern, '');
    const seleccionRaw = data?.respuestas?.seleccion || {};
    const norm = {};
    let recognized = 0;
    let opcionIgnored = 0;
    let categoriaIgnored = 0;
    Object.keys(seleccionRaw).forEach((k) => {
      const categoriaId = seleccionRaw[k];
      if (!categoriaId) { categoriaIgnored++; return; }
      if (!plantilla.getOpcionById(k)) { opcionIgnored++; return; }
      if (!plantilla.getCategoriaById(categoriaId)) { categoriaIgnored++; return; }
      norm[k] = categoriaId;
      recognized++;
    });
    const texto = data?.respuestas?.texto && typeof data.respuestas.texto === 'object' ? data.respuestas.texto : {};

    const sources = this.getSources();
    let autor = autorBase;
    let n = 2;
    while (sources.some((s) => s.autor === autor)) autor = `${autorBase} (${n++})`;

    slice.context.setState(CONTEXT, (prev) => [...prev, { autor, respuestas: { seleccion: norm, texto } }]);
    return { recognized, opcionIgnored, categoriaIgnored };
  }

  remove(autor) {
    slice.context.setState(CONTEXT, (prev) => prev.filter((s) => s.autor !== autor));
  }

  removeOrphaned(removedOpcionIds, removedCategoriaIds) {
    const oSet = new Set((removedOpcionIds || []).map(String));
    const cSet = new Set(removedCategoriaIds || []);
    let changed = false;
    const next = this.getSources().map((src) => {
      const filteredSeleccion = {};
      let srcChanged = false;
      Object.entries(src.respuestas?.seleccion || {}).forEach(([opcionId, categoriaId]) => {
        if (oSet.has(String(opcionId)) || cSet.has(categoriaId)) { srcChanged = true; return; }
        filteredSeleccion[opcionId] = categoriaId;
      });
      const filteredTexto = {};
      Object.entries(src.respuestas?.texto || {}).forEach(([categoriaId, texto]) => {
        if (cSet.has(categoriaId)) { srcChanged = true; return; }
        filteredTexto[categoriaId] = texto;
      });
      if (!srcChanged) return src;
      changed = true;
      return { ...src, respuestas: { seleccion: filteredSeleccion, texto: filteredTexto } };
    }).filter((src) => Object.keys(src.respuestas.seleccion || {}).length > 0 || Object.keys(src.respuestas.texto || {}).length > 0);
    if (changed) slice.context.setState(CONTEXT, () => next);
    return changed;
  }
}
