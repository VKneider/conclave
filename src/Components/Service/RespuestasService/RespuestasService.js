import { ensureContext } from '../../../utils/context.js';
import { TEXTO_MAX_LENGTH } from '../../Core/AppConfig/AppConfig.js';

// Owns the `respuestas` context: { seleccion: {[opcionId]: categoriaId}, texto: {} }
// — the user's own working answers. `seleccion` covers modo `seleccion`
// categorías (indexed by Opción — exactly the old flat `assignment` shape,
// just renamed: many Opciones can point at the same Categoría with no array
// needed). `texto` will hold modo `texto_libre` answers indexed by
// Categoría starting Fase C — kept as an empty object here so the shape is
// stable from day one. Persisted to localStorage by the context
// (persist: true). User identity (autor) and org branding live in
// `settings` (SettingsService), not here.
const CONTEXT = 'respuestas';
const STORAGE_KEY = 'conclave-respuestas-v1';
const INITIAL_STATE = { seleccion: {}, texto: {} };

export default class RespuestasService {
  init() {
    ensureContext(CONTEXT, INITIAL_STATE, STORAGE_KEY);
  }

  getState() {
    ensureContext(CONTEXT, INITIAL_STATE, STORAGE_KEY);
    return slice.context.getState(CONTEXT);
  }

  // Assigning past a categoría's max is ALLOWED on purpose: it's easier for
  // organizers to move or remove excess people afterward than to leave
  // opciones unassigned while they hunt for room. The categoría's "over"
  // status (PlantillaService.statusOf) becomes a persistent badge wherever
  // it's shown (Dashboard, Por categoría, Comparar's final tally) — that's
  // the durable, always-visible alert; this toast is just an immediate
  // heads-up.
  assignOpcion(opcionId, categoriaId) {
    ensureContext(CONTEXT, INITIAL_STATE, STORAGE_KEY);
    const plantilla = slice.getComponent('PlantillaService');
    const categoria = plantilla.getCategoriaById(categoriaId);
    const wasFull = plantilla.isFull(categoriaId, this.getState().seleccion, opcionId);
    slice.context.setState(CONTEXT, (prev) => ({ ...prev, seleccion: { ...prev.seleccion, [opcionId]: categoriaId } }));
    if (wasFull) {
      slice.events.emit('toast:show', { message: `«${categoria?.nombre || categoriaId}» quedó con exceso de personas`, type: 'warning' });
    }
  }

  unassignOpcion(opcionId) {
    ensureContext(CONTEXT, INITIAL_STATE, STORAGE_KEY);
    slice.context.setState(CONTEXT, (prev) => {
      const seleccion = { ...prev.seleccion };
      delete seleccion[opcionId];
      return { ...prev, seleccion };
    });
  }

  getCategoriaForOpcion(opcionId) {
    return this.getState().seleccion[opcionId] || null;
  }

  reset() {
    ensureContext(CONTEXT, INITIAL_STATE, STORAGE_KEY);
    slice.context.setState(CONTEXT, () => ({ seleccion: {}, texto: {} }));
  }

  // The caller (a view) is responsible for prompting for a name first (via
  // SettingsService.setAutor) when settings.autor is empty, before calling this.
  exportMine() {
    const respuestas = this.getState();
    const autor = slice.getComponent('SettingsService').getState().autor;
    slice.getComponent('ExportService').downloadRespuestas(autor, respuestas);
  }

  setTexto(categoriaId, texto) {
    ensureContext(CONTEXT, INITIAL_STATE, STORAGE_KEY);
    const truncated = texto && texto.length > TEXTO_MAX_LENGTH ? texto.slice(0, TEXTO_MAX_LENGTH) : texto;
    slice.context.setState(CONTEXT, (prev) => ({ ...prev, texto: { ...prev.texto, [categoriaId]: truncated } }));
  }

  clearTexto(categoriaId) {
    ensureContext(CONTEXT, INITIAL_STATE, STORAGE_KEY);
    slice.context.setState(CONTEXT, (prev) => {
      const texto = { ...prev.texto };
      delete texto[categoriaId];
      return { ...prev, texto };
    });
  }

  // "Continue on another device" — wholesale replace of the working
  // respuestas (unlike RespuestasImportService.import, which ADDS a
  // comparison source; this REPLACES your own session). Also adopts the
  // file's autor into settings if you haven't set one yet, since the whole
  // point is picking up where you left off on a different device.
  importMine(data) {
    ensureContext(CONTEXT, INITIAL_STATE, STORAGE_KEY);
    const seleccion = data?.respuestas?.seleccion && typeof data.respuestas.seleccion === 'object' ? data.respuestas.seleccion : {};
    const texto = data?.respuestas?.texto && typeof data.respuestas.texto === 'object' ? data.respuestas.texto : {};
    slice.context.setState(CONTEXT, () => ({ seleccion, texto }));
    if (data?.autor) {
      const settings = slice.getComponent('SettingsService');
      if (!settings.getState().autor) settings.setAutor(data.autor);
    }
  }
}
