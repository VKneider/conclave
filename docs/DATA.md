# Data format & lifecycle

Reflects the post-Fase-3 model (Tema/Opción vocabulary, four modos, dynamic
atributos, voto/ranking). See `docs/legacy/REDESIGN.md` for the phased history and
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
  bienvenida: '<p>Hola equipo…</p>',  // optional message for whoever imports it
  importada: true,                    // ← LOCAL fact: it does not travel when sharing
  atributos: [ /* Atributo[] — custom per-Opción fields */ ],
  temas: [ /* Tema[] */ ],
  opciones: [ /* Opcion[] */ ],
  creadoPor: 'Ana', creadoEmail: 'ana@…',  // identity of whoever shared it
}
```

### `importada` — mine vs. someone else's

It is the **only** property of the `plantilla` context that does NOT travel
when sharing: it describes this copy on this device, not the Plantilla.
`loadFromData()` sets it to `false` (adopting data does not imply the data is
foreign — a preset goes through there too) and every import path calls
`marcarComoImportada()` right after. It IS included in the `.conclave-backup`,
which is the device's state.

Its only consumer today is the welcome banner (below). It is **never inferred
from `creadoPor`**: sharing by link does not force you to fill in a name, so
that field can arrive empty on a perfectly foreign Plantilla — inferring it
from there would hide the message from exactly the person meant to read it.

### `bienvenida` — the welcome message

Rich HTML (bold, italic, lists) the author writes once in
PlantillaBuilderView → *Detalles*, and that whoever imports the Plantilla sees
before answering: in `BienvenidaModal` at import time, and afterwards in
`RespuestasView`'s collapsible banner. It travels through all three sharing
paths (compressed link under the short key `bv`, the `.plantilla` file, and the
`.conclave-backup`).

Three rules that are not obvious:

- **It is sanitised with `HtmlService.sanitizeRichText()`, not `sanitize()`.**
  Someone else wrote it; `sanitize()`'s wide profile would let `<img>` through,
  and an `<img src="https://tracker/…">` in a shared Plantilla leaks the IP of
  whoever opens it while showing nothing. The allowlist is exactly what
  `EnhancedEditor` can produce: bold, italic, underline, lists, paragraphs and
  **links**.
  - A link is allowed where an image is not, because it only reaches its
    destination when the reader deliberately clicks it, and the destination is
    visible first. Every surviving `<a href>` is rewritten with
    `target="_blank" rel="noopener noreferrer nofollow"`, so the destination
    can never reach back into this tab through `window.opener` nor receive the
    referrer. `javascript:`/`data:` URLs are rejected by DOMPurify's default
    URI policy — and by the editor itself, before they are ever inserted.
- **Everything goes through `PlantillaService._sanitizeBienvenida()`**, which
  also **truncates by length** (`BIENVENIDA_HTML_MAX_LENGTH`).
  `BIENVENIDA_MAX_LENGTH` is only enforced by the editor, i.e. by the author on
  their own device: a hand-crafted file or hash never passes through it, and
  this is persisted to localStorage (blowing the quota breaks persistence for
  the whole context, not just this field).
- **The real limit when sharing by link is not the message's.** The 3800
  characters of `SHARE_URL_MAX_LENGTH` are consumed by the entire Plantilla.
  The builder's counter counts plain text; the one that actually warns you is
  `canShareByLink()` at share time.

#### Where it shows, and the two conditions that hide it

`BienvenidaModal` on import (link or file), and `RespuestasView`'s collapsible
banner to re-read it. The banner hides when:

1. **The Plantilla is your own** (`importada === false`) — the message was
   written by the person looking at it, addressed to other people; handing it
   back in the answering view is noise. They still see and edit it in the
   builder.
2. **It was dismissed by hand** (✕) — a preference of THAT device, stored in
   `settings.bienvenidaOculta` as the **fingerprint of the dismissed message**,
   not as a boolean: when another Plantilla arrives with another message the
   fingerprint stops matching and it shows again. With a boolean, dismissing
   once would silence every future message forever.

It is a device preference and deliberately not part of the Plantilla: if it
travelled inside the Plantilla, whoever shares it would decide for the whole
group.

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
