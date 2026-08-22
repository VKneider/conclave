# Data format & lifecycle

Reflects the post-Fase-3 model (Tema/Opción vocabulary, four modos, dynamic
atributos, voto/ranking). See `REDESIGN.md` for the phased history and
`docs/COMPONENT-PATTERNS.md` for how components read/write this state.

## Storage (all `slice.context`, `persist: true` → localStorage)

| Key | Owner | Content |
|---|---|---|
| `conclave-settings-v3` | `SettingsService` | `{ autor, email, lideres, lideresEnabled, soundEnabled, bienvenidaOculta }` |
| `conclave-plantilla-v1` | `PlantillaService` | `{ nombre, bienvenida, importada, atributos, temas, opciones, creadoPor, creadoEmail }` |
| `conclave-respuestas-v1` | `RespuestasService` | `{ seleccion, texto, voto, ranking }` |
| `conclave-decision-final-v1` | `ConsensoService` | `{ seleccion, texto, voto, ranking }` |
| `conclave-respuestas-importadas-v1` | `RespuestasImportService` | `[{ autor, respuestas: { seleccion, texto, voto, ranking } }]` |

All data is browser-only; there is no data server (`api/` is a static/SPA
fallback only).

## The Plantilla (`plantilla` context)

```js
{
  nombre: 'Retiro 2026',
  bienvenida: '<p>Hola equipo…</p>',  // mensaje opcional para quien la importa
  importada: true,                    // ← hecho LOCAL: no viaja al compartir
  atributos: [ /* Atributo[] — custom per-Opción fields */ ],
  temas: [ /* Tema[] */ ],
  opciones: [ /* Opcion[] */ ],
  creadoPor: 'Ana', creadoEmail: 'ana@…',  // identidad de quien la compartió
}
```

### `importada` — propia vs. de otra persona

Es la **única** propiedad del contexto `plantilla` que NO viaja al compartir:
describe esta copia en este dispositivo, no la Plantilla. `loadFromData()` la
pone en `false` (adoptar datos no implica que sean ajenos — un preset también
pasa por ahí) y cada camino de import llama a `marcarComoImportada()` justo
después. Sí va en el `.conclave-backup`, que es el estado del dispositivo.

Su único consumidor hoy es el banner de bienvenida (ver abajo). **No se deduce
de `creadoPor`**: compartir por enlace no obliga a poner el nombre, así que ese
campo puede llegar vacío en una Plantilla perfectamente ajena — deducirlo de ahí
escondería el mensaje justo a quien tenía que leerlo.

### `bienvenida` — el mensaje de bienvenida

HTML enriquecido (negrita, cursiva, listas) que el autor escribe una vez en
PlantillaBuilderView → *Detalles*, y que ve quien importa la Plantilla para
responder: en `BienvenidaModal` al momento de importar, y después en el banner
plegable de `RespuestasView`. Viaja en las tres vías de compartir (enlace
comprimido con la clave corta `bv`, archivo `.plantilla`, y `.conclave-backup`).

Tres reglas que no son obvias:

- **Se sanea con `HtmlService.sanitizeRichText()`, no con `sanitize()`.** Lo
  escribió otra persona; el perfil ancho de `sanitize()` dejaría pasar
  `<img>`/`<a href>`, y un `<img src="https://tracker/…">` en una Plantilla
  compartida filtra la IP de quien la abre sin mostrar nada.
- **Todo pasa por `PlantillaService._sanitizeBienvenida()`**, que además
  **corta por longitud** (`BIENVENIDA_HTML_MAX_LENGTH`). `BIENVENIDA_MAX_LENGTH`
  sólo lo aplica el editor, o sea el autor en su dispositivo: un archivo o un
  hash fabricado a mano no pasa por ahí, y esto se persiste en localStorage
  (pasarse de cuota rompe la persistencia de todo el contexto, no sólo el campo).
- **El tope real de compartir por enlace no es el del mensaje.** Los 3800
  caracteres de `SHARE_URL_MAX_LENGTH` los consume la Plantilla entera. El
  contador del builder cuenta texto plano; quien avisa de verdad es
  `canShareByLink()` al momento de compartir.

#### Dónde se ve, y las dos condiciones que lo esconden

`BienvenidaModal` al importar (enlace o archivo) y el banner plegable de
`RespuestasView` para releerlo. El banner se esconde si:

1. **La Plantilla es propia** (`importada === false`) — el mensaje lo escribió
   quien está mirando, dirigido a otros; devolvérselo en la vista de responder
   es ruido. Lo sigue viendo y editando en el builder.
2. **Se ocultó a mano** (✕) — preferencia de ESE dispositivo, guardada en
   `settings.bienvenidaOculta` como la **huella del mensaje ocultado**, no como
   un booleano: cuando llega otra Plantilla con otro mensaje la huella deja de
   coincidir y vuelve a mostrarse. Con un booleano, ocultar una vez silenciaría
   todos los mensajes futuros para siempre.

Es una preferencia del dispositivo y no de la Plantilla a propósito: si viajara
dentro de la Plantilla, quien la comparte decidiría por todo el grupo.

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

### `decisionFinal.texto[temaId]` entries — adoptado vs. síntesis

Unlike the other three modos, a `texto_libre` final is **not** a scalar id/string —
it's an object. Two mutually exclusive kinds (both set by `ConsensoService`):

```js
// 1) Adoptado — one person's exact proposal becomes the answer:
texto[temaId] = { autor: 'Ana', texto: '<p>…proposal…</p>' }

// 2) Síntesis — a composed answer built in CompareView's "Redactar respuesta final"
//    modal (TextCompareCards) from several sources, marked with esSintesis:true
//    + the fuentes (autores) it was composed from:
texto[temaId] = {
  autor: 'Síntesis del equipo',
  texto: '<p>…combined…</p>',
  esSintesis: true,
  fuentes: ['Ana', 'Beto'],
}
```

Retrocompatible — old `{ autor, texto }` entries have no `esSintesis` and keep
working everywhere; no migration needed. Distinguish with
`ConsensoService.hasSintesisTexto(temaId)`; the display label is built by
`descripcionTextoFinal(entry)` (→ "Síntesis del equipo" + " · de A, B" when
`fuentes` present). `_normalizeRespuestas` (used by the `#consenso=` share-link
import and `exportFinal` file import) preserves the whole entry object, so
`esSintesis`/`fuentes` survive the short-key hash roundtrip.

## The exportable JSON types

Extensions are defined in `src/AppConfig.js`:

| Type | `tipo` | Extension |
|---|---|---|
| Plantilla | `'plantilla'` | `.plantilla` |
| Respuestas | `'respuestas'` / `'respuestas-final'` | `.respuestas` |
| Consenso | `'consenso'` | `.conclave` |
| Backup | `'backup'` | `.conclave-backup` |

Imports also accept legacy `.json` files (backward compatible).

- **Plantilla** (`tipo: 'plantilla'`): the shared setup — `{ nombre, autor,
  email, bienvenida, atributos, temas, opciones }`. `autor` and `email` come from
  `SettingsService` (the creator's identity at share/export time). Built by
  `ExportService.downloadPlantilla`, imported via `PlantillaService.prepareImport`
  → `loadFromData(temas, opciones, nombre, atributos, creadoPor, creadoEmail,
  bienvenida)` (validates shape + `isSafeId`, sanitizes `bienvenida`, computes
  orphan impact, confirm-gated). Omitting an optional trailing argument **keeps**
  the current value; passing `''` clears it. When importing via URL hash,
  `AppShell._tryImportPlantilla()` displays the creator info in the dialog.
- **Backup** (`tipo: 'backup'`): everything at once — the Plantilla (including
  `bienvenida`), the user's own respuestas, the imported ones, `decisionFinal`
  and the notes. Written by `ExportService.downloadBackup`, restored from
  `ResumenFinalView`. It is the only import path that does **not** go through
  `prepareImport`; it relies on `loadFromData` sanitizing `bienvenida` itself.
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
  `temaId:null`, adopt `DEFAULT_ATRIBUTOS`, default `bienvenida`/`creadoPor`/
  `creadoEmail` to `''`. IDs never change, so respuestas/decisionFinal/settings
  need no migration. voto/ranking default in getters (GOTCHAS §20), no
  migration needed there.
  - `bienvenida` defaults to **empty, never to the seed preset's message**.
    A returning user has their own Plantilla; seeding it with a preset's
    welcome text would put words in their mouth in something they share.
    New users do get the preset's message (it ships in `SEED_STATE`), which is
    what makes the field discoverable at all.

## Seed

`src/data/seedData.js` exports `SEED_TEMAS` (7, modo `reparto`), `SEED_OPCIONES`
(15, pool), `DEFAULT_ATRIBUTOS` (sexo/edad). Fallback the first time the app
runs or when localStorage is empty/invalid. All fictional (public demo).
