# Data format & lifecycle

## Storage

All data persists in `localStorage`, and only there — there is no server-side persistence and no plan to add one for Plantilla data specifically (it's authored entirely in-browser via `PlantillaBuilderView`; sharing it means exporting/importing the JSON file by hand, same as Respuestas). `api/` is a static/SPA-fallback server only, not a data API.

| Key | Content | Owner |
|---|---|---|
| `conclave-settings-v3` | `{autor, lideres, lideresEnabled, sexoEnabled, edadEnabled}` | `settings` context (persist: true) |
| `conclave-plantilla-v1` | `{categorias: Categoria[], opciones: Opcion[]}` | `plantilla` context (persist: true) |
| `conclave-respuestas-v1` | `{seleccion: {[opcionId]: categoriaId}, texto: {[categoriaId]: string}}` | `respuestas` context (persist: true) |
| `conclave-decision-final-v1` | `{seleccion: {[opcionId]: categoriaId}, texto: {[categoriaId]: {autor, texto}}}` | `decisionFinal` context (persist: true) |
| `conclave-respuestas-importadas-v1` | `[{autor, respuestas: {seleccion, texto}}]` | `respuestasImportadas` context (persist: true) |

## The two JSON types

Conclave distinguishes two kinds of exportable/importable JSON throughout the app and codebase:

- **Plantilla** ("SETUP"): the shared structure a leader defines and distributes — Categorías + Opciones. One Plantilla, shared by everyone in the group.
- **Respuestas** ("DATA"): one person's own answers against a Plantilla — their team assignments and/or free-text proposals. Each person has their own.

### Plantilla envelope

```json
{
  "app": "conclave",
  "version": 2,
  "tipo": "plantilla",
  "nombre": "Retiro Juvenil 2026",
  "autor": "Mateo Rivas",
  "fecha": "2026-01-01T00:00:00.000Z",
  "categorias": [ /* Categoria[] */ ],
  "opciones": [ /* Opcion[] */ ]
}
```

Built by `ExportService.downloadPlantilla()`, downloaded from `PlantillaBuilderView`. Imported from `CompareView`'s collapsible "Importar una Plantilla compartida" section — a bulk replace via `PlantillaService.loadFromData()`, gated behind a confirm dialog naming how many current Respuestas would be orphaned.

### Respuestas envelope

```json
{
  "app": "conclave",
  "version": 2,
  "tipo": "respuestas",
  "autor": "Elena Duarte",
  "fecha": "2026-01-01T00:00:00.000Z",
  "respuestas": {
    "seleccion": { "3": "transporte", "4": "bienvenida" },
    "texto": { "cierre-actividad": "Propongo una fogata con..." }
  }
}
```

`tipo` is `"respuestas"` for a personal export (`ExportService.downloadRespuestas()`, from `RespuestasService.exportMine()`) or `"respuestas-final"` for the reconciled list (`ExportService.downloadRespuestasFinal()`, from `ConsensoService.exportFinal()`). Imported two different ways depending on intent:

- **As a comparison source** (CompareView's main `ImportDrop`) → `RespuestasImportService.import()` ADDS it to the list of sources being compared, doesn't touch your own respuestas.
- **As your own session** (`UserMenu`'s "Importar mis Respuestas") → `RespuestasService.importMine()` REPLACES your own `respuestas` context wholesale — for continuing on a different device.

## Categoría / Opción shapes

Categoría generalizes what used to be "Equipo" (team) — the decision axis (a team, an exposición slot, a discussion topic):

```js
{
  id: 'transporte',            // stable slug, the join key
  nombre: 'Transporte',
  modo: 'seleccion',           // 'seleccion' | 'texto_libre'
  orden: 3,                    // display order
  capacidad: 6, min: 4, max: 6,// only meaningful when modo === 'seleccion'
  participable: true,          // generalizes the old `asignable` flag
  meta: { lider: null, numero: 3 }, // modo:'seleccion'-specific extras
}
```

Opción generalizes what used to be "Miembro" (member) — the item placed inside a modo `seleccion` Categoría (a person, a speaker):

```js
{
  id: 3,                       // stable numeric id, the join key
  nombre: 'Andrés Bracamonte',
  meta: { sexo: 'M', edad: null, fijo: false, rolFijo: null },
}
```

`modo` is set **per Categoría**, not per Plantilla — one Plantilla can mix "assign these Opciones to these Categorías" (modo `seleccion`) with "what's your idea for X" (modo `texto_libre`) in a single shared session. Opciones only apply to modo `seleccion` Categorías; modo `texto_libre` Categorías are answered directly as free text, no Opción pool involved.

## Seed data

`src/data/seedData.js` exports `SEED_CATEGORIAS` (7, all modo `seleccion`) and `SEED_OPCIONES` (15). Used as fallback the first time the app runs, or if `conclave-plantilla-v1` is missing/empty/invalid. All fictional (invented names, not real retreat data) — deliberate, for public demo purposes. `src/data/equipos.json` / `miembros.json` are unrelated legacy reference files, not read by any code path.

## Fixed ID strategy

Every Categoría/Opción `id` is the stable identifier that `respuestas`, `decisionFinal`, `settings.lideres`, and `respuestasImportadas` all reference.

- **Substituting a person/categoría**: Edit its fields in `PlantillaBuilderView` but keep the same `id`. All references survive.
- **Deleting**: `PlantillaService.removeCategoria()`/`removeOpcion()` (or a bulk Plantilla import via `loadFromData()`) runs `_cleanupOrphaned()`, which scrubs orphaned entries from every one of those four places automatically. `PlantillaBuilderView`'s delete confirm names the exact impact count first.
- **Adding**: `addCategoria()`/`addOpcion()` auto-generate an id if none is given (slug from nombre for Categorías, incremental number for Opciones).
- **Renaming**: Change `nombre`, keep `id`. References are preserved.

## Data flow on replacement

See ARCHITECTURE.md §Data flow for the full diagram. Key cleanup steps inside `PlantillaService._cleanupOrphaned()`:

1. `respuestas.seleccion` and `respuestas.texto` — entries referencing a removed Opción/Categoría are dropped.
2. Same for `decisionFinal.seleccion` and `decisionFinal.texto`.
3. `settings.lideres` — leader assignments pointing to a deleted Categoría/Opción are dropped.
4. `respuestasImportadas` — `RespuestasImportService.removeOrphaned()` filters every imported source's `seleccion` and `texto` the same way, and drops a source entirely only if BOTH end up empty.

## Editing Categorías/Opciones (PlantillaBuilderView)

There is no bulk CSV/JSON paste-and-parse step anymore — `PlantillaBuilderView` at `/plantilla` is real CRUD: a form-backed row per Categoría/Opción, edited inline (commits on blur/`change`), added via a name-only `confirm:request` prompt, removed via a confirm naming the exact impact count. A Categoría's `modo` is a toggle in its row that shows/hides the capacidad/min/max fields. "Exportar Plantilla" downloads the current state as the envelope above.
