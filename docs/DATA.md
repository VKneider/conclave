# Data format & lifecycle

Reflects the post-Fase-3 model (Tema/Opción vocabulary, four modos, dynamic
atributos, voto/ranking). See `REDESIGN.md` for the phased history and
`docs/COMPONENT-PATTERNS.md` for how components read/write this state.

## Storage (all `slice.context`, `persist: true` → localStorage)

| Key | Owner | Content |
|---|---|---|
| `conclave-settings-v3` | `SettingsService` | `{ autor, email, lideres, lideresEnabled }` |
| `conclave-plantilla-v1` | `PlantillaService` | `{ nombre, atributos, temas, opciones }` |
| `conclave-respuestas-v1` | `RespuestasService` | `{ seleccion, texto, voto, ranking }` |
| `conclave-decision-final-v1` | `ConsensoService` | `{ seleccion, texto, voto, ranking }` |
| `conclave-respuestas-importadas-v1` | `RespuestasImportService` | `[{ autor, respuestas: { seleccion, texto, voto, ranking } }]` |

All data is browser-only; there is no data server (`api/` is a static/SPA
fallback only).

## The Plantilla (`plantilla` context)

```js
{
  nombre: 'Retiro 2026',
  atributos: [ /* Atributo[] — custom per-Opción fields */ ],
  temas: [ /* Tema[] */ ],
  opciones: [ /* Opcion[] */ ],
}
```

### Tema (ex "Categoría"/"Equipo")
A decision axis. Its **`modo`** decides how it's answered:

```js
{
  id: 'transporte',        // stable slug — the join key, never changes on rename
  nombre: 'Transporte',
  modo: 'reparto',         // 'reparto' | 'votacion' | 'ranking' | 'texto_libre'
  orden: 3,
  capacidad: 6, min: 4, max: 6,   // only meaningful for modo 'reparto'
  participable: true,             // reparto: accepts pool assignments
  meta: { lider: null, numero: 3 },
}
```

- **`reparto`** (ex `seleccion`; UI label "Asignación") — the shared global
  Opción **pool** is distributed into these temas (assign people to teams). Has
  capacidad/min/max. Answered in `respuestas.seleccion`.
- **`votacion`** — the Tema **owns** its Opciones (`opcion.temaId === tema.id`);
  each responder picks exactly one. Answered in `respuestas.voto`.
- **`ranking`** — the Tema owns its Opciones; each responder orders them (▲▼).
  Answered in `respuestas.ranking`. Compared via Borda aggregation.
- **`texto_libre`** — a free-text question, no Opciones. Answered in
  `respuestas.texto`.

A single Plantilla can mix modos freely.

### Opción (ex "Miembro")
```js
{
  id: 3,               // stable numeric id, the join key
  nombre: 'Andrés',
  temaId: null,        // null = reparto pool; non-null = owned by that votacion/ranking Tema
  meta: {              // custom attribute values keyed by Atributo.key, + pool flags
    sexo: 'M', edad: 23,      // ← just example atributos now, not hardcoded fields
    fijo: false, rolFijo: null,
  },
}
```

- **Pool Opciones** (`temaId: null`) — candidates for reparto. `getOpcionesPool()`
  / `getOpcionesDisponibles()` (pool minus `fijo`).
- **Tema-owned Opciones** (`temaId` set) — the choices of a votacion/ranking
  Tema. `getOpcionesDeTema(temaId)`.

### Atributo (dynamic custom Opción field — Fase 3)
```js
{ key: 'rol', label: 'Rol', type: 'texto'|'numero'|'lista'|'siNo', opciones?: ['A','B'] }
```
Values live in `opcion.meta[key]`. edad/sexo are **not** special anymore — they
are the default example atributos of the seed ("Asignación") Plantilla
(`DEFAULT_ATRIBUTOS` in `seedData.js`). `PlantillaService.getOpcionAtributos(opcion)`
returns `[{key,label,display}]` for generic tag rendering;
`formatAtributo(atributo, value)` formats one value.

## Respuestas (`respuestas` context) — one person's own answers

```js
{
  seleccion: { [opcionId]: temaId },   // reparto: which tema each pool Opción goes to
  texto:     { [temaId]: string },     // texto_libre: one answer per tema
  voto:      { [temaId]: opcionId },   // votacion: one chosen Opción per tema
  ranking:   { [temaId]: opcionId[] }, // ranking: ordered Opción ids per tema
}
```

`decisionFinal` (ConsensoService) mirrors this shape — the reconciled "final"
decision made in Comparar. `respuestasImportadas` holds other people's
Respuestas as comparison sources; `RespuestasImportService._normalizeRespuestas`
filters all four modos against the current Plantilla on import/boot.

## The two exportable JSON types

Extensions are defined in `src/Components/Core/AppConfig/AppConfig.js`:

| Type | `tipo` | Extension |
|---|---|---|
| Plantilla | `'plantilla'` | `.plantilla` |
| Respuestas | `'respuestas'` / `'respuestas-final'` | `.respuestas` |

Imports also accept legacy `.json` files (backward compatible).

- **Plantilla** (`tipo: 'plantilla'`): the shared setup — `{ nombre, autor,
  email, atributos, temas, opciones }`. `autor` and `email` come from
  `SettingsService` (the creator's identity at share/export time). Built by
  `ExportService.downloadPlantilla`, imported via `PlantillaService.prepareImport`
  → `loadFromData(temas, opciones, nombre, atributos)` (validates shape +
  `isSafeId`, computes orphan impact, confirm-gated). When importing via URL
  hash, `AppShell._tryImportPlantilla()` displays the creator info in the dialog.
- **Respuestas** (`tipo: 'respuestas'` / `'respuestas-final'`): one person's
  answers — `{ respuestas: { seleccion, texto, voto, ranking } }`. Also carries
  `autor` and `email` from `SettingsService`. Exported per person or as the
  reconciled final (`ConsensoService.exportFinal`).

## Fixed-ID strategy & cleanup

Every Tema/Opción `id` is the stable join key referenced by `respuestas`,
`decisionFinal`, `settings.lideres`, and `respuestasImportadas`. Renaming
changes `nombre`, never `id`. Deleting routes through
`PlantillaService._cleanupOrphaned(removedTemaIds, removedOpcionIds)`, which
scrubs orphaned entries from **all four modos** in `respuestas` +
`decisionFinal`, from `settings.lideres`, and from `respuestasImportadas`.
Removing a votacion/ranking Tema **cascades** to its owned Opciones.

## Bulk & migration

- Bulk CRUD: `removeTemas(ids)` / `removeOpciones(ids)` / `clearTemas()` /
  `clearOpciones()` (all cascade + cleanup) — powers the builder's multi-select
  delete + "Borrar todo".
- **Migration** runs once per session in `PlantillaService._ensure()` →
  `_migrate()`, **before** the empty/invalid reseed check (GOTCHAS §24), for
  returning users: `categorias→temas`, `modo seleccion→reparto`, add
  `temaId:null`, adopt `DEFAULT_ATRIBUTOS`. IDs never change, so respuestas/
  decisionFinal/settings need no migration. voto/ranking default in getters
  (GOTCHAS §20), no migration needed there.

## Seed

`src/data/seedData.js` exports `SEED_TEMAS` (7, modo `reparto`), `SEED_OPCIONES`
(15, pool), `DEFAULT_ATRIBUTOS` (sexo/edad). Fallback the first time the app
runs or when localStorage is empty/invalid. All fictional (public demo).
