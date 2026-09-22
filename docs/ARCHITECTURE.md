# Architecture

> **Summary.** This block is the quick map; the sections below expand it. See
> `docs/DATA.md` (data model), `docs/COMPONENT-PATTERNS.md` (component/refresh
> contract + Core services), and `docs/legacy/REDESIGN.md` (how it got here).
>
> **Service folders** (`sliceConfig.json` → `paths.components`, all type Service):
> - **`Core`** (infra): `StoreService` (context wrapper — `ensure/get/set/watch`,
>   replaces `utils/context.js`), `HtmlService` (`esc` + `sanitize`, replaces
>   FormatService/SanitizeService + `utils/format.js`), `DomService`
>   (`reconcile`), `CompressionService` (`packForURI`/`unpackFromURI` + LZ
>   compress), `SoundService` (Web Audio API synth cues, `attachSFX` bridge,
>   rate-limited), `ChartService`, `FetchManager`, `FileDownloadService`,
>   `IndexedDbManager`, `LocalStorageManager`.
> - **`Domain`** (business): `PlantillaService`, `RespuestasService`,
>   `ConsensoService`, `SettingsService`, `RespuestasImportService`,
>   `ExportService`.
> - **`Providers`** (wiring + provider-services): `Providers`, `ToastProvider`,
>   `DragDropService`, `IconProvider`. The app modals
>   (`ConfirmActionModal`, `ExportRespuestasModal`, `SharePlantillaModal`,
>   `ShareConsensoModal`, `BienvenidaModal`) are `Visual/` and are built by
>   `Providers`.
> - There is no `utils/` folder. Visual = UI only; domain logic lives in a
>   Domain service. Every context-owning Domain service calls
>   `StoreService.ensure()` **once** in `init()`.
>
> **Contexts** now carry the four-modo model — see `docs/DATA.md` for shapes:
> `plantilla { nombre, bienvenida, atributos, temas, opciones, creadoPor,
> creadoEmail }`, `respuestas`/`decisionFinal`
> `{ seleccion, texto, voto, ranking }`, `respuestasImportadas`, `settings
> { autor, email, lideres, lideresEnabled, soundEnabled }`.
>
> **Views** (`AppComponents`): `LandingView`, `DashboardView`, `RespuestasView`
> (tab shell → `MisRespuestasView` carousel, `PorTemaView` board,
> `RespuestasVotacionView` "elegí una", `RespuestasTextoView`), `CompareView`,
> `PlantillaBuilderView`, `AppShell`, `TopBar`, `UserMenu`. Shared control:
> `Tabs` (Visual, segmented control, `variant` prop) — see GOTCHAS §26.

## App Shell + MultiRoute

Every route in `src/routes.js` points to `AppShell`; `AppShell` builds its own internal `MultiRoute` mapping the same six paths (`/`, `/dashboard`, `/mis-respuestas`, `/comparar`, `/resumen`, `/plantilla`) to their view components. `AppShell` itself persists across navigation (see GOTCHAS.md §2) — it's where the persistent `TopBar` (tabs + `UserMenu`) lives. There's no footer — every session-level action (exportar/importar/reiniciar mis Respuestas, tu nombre, tema) lives in `UserMenu` instead, reachable from any route.

## Composition root

`src/Components/Providers/Providers/Providers.js`, built once via `slice.build('Providers', { singleton: true })` from `AppShell.init()`. It boots every singleton Service in order and is the one place new app-wide singletons get registered. Recover any of them anywhere via `slice.getComponent('ServiceName')`.

### Boot order

```
AppShell.init() → slice.build('Providers')
  → Providers.init():
      1. slice.events.register() — declares toast:show, confirm:request
      2. StoreService — context persistence wrapper
      3. HtmlService — esc + sanitize (vendored DOMPurify)
4. DomService — reconcile (leak-safe list rendering)
       5. CompressionService — packForURI/unpackFromURI + LZ compress
       6. SoundService — Web Audio API, semantic synth cues, attachSFX bridge
       7. PlantillaService — ensures `plantilla` context, seed fallback
       8. FileDownloadService — stateless, download helper
       9. SettingsService — ensures `settings` context
      10. RespuestasService — ensures `respuestas` context
      11. ConsensoService — ensures `decisionFinal` context
      12. ExportService — stateless, download helpers
      13. RespuestasImportService — ensures `respuestasImportadas` context, normalizes against plantilla
      14. DragDropService — registered after the above
      15. ChartService — wraps vendored Chart.js
      16. IconProvider — lucide SVG icon resolver
      17. ToastProvider — lazy (builds container on first .show())
      18. ConfirmActionModal — lazy (builds <slice-modal> on first use)
      19. ExportRespuestasModal — lazy (builds <slice-modal> on first show())
      20. SharePlantillaModal — lazy (builds <slice-modal> on first show())
```

`PlantillaService` must finish before anything else reads tema/opción data — every other Service/view assumes it's already loaded.

## Services (`Components/Service/`)

| Service | Role |
|---|---|
| `PlantillaService` | Owns the `plantilla` context: `{ nombre, bienvenida, atributos, temas, opciones, importada, creadoPor, creadoEmail }`. Falls back to the bundled seed if localStorage is empty/invalid on first boot, after migrating older shapes (GOTCHAS §24). Full CRUD: `addTema`/`removeTema`/`removeTemas`/`clearTemas`/`updateTema`, the same for Opciones, `addAtributo`/`updateAtributo`/`removeAtributo`, plus bulk `loadFromData(...)` (Plantilla import/presets) and `resetToSeed()`. Ordering: `moveTema`/`reorderTemas` and `moveOpcion`/`reorderOpcionesPool`, both routed through `_renumber` so a Tema's `orden` is always its 1-based position. Query helpers: `getTemas()`, `getTemasParticipables()` (modo `reparto` + `participable`), `getTemasTexto()`/`getTemasVotacion()`/`getTemasRanking()`, `getOpciones()`, `getOpcionesPool()` (`temaId == null`), `getOpcionesDisponibles()`, `getOpcionesDeTema(id)`, `getAtributos()`/`getOpcionAtributos()`, `getAnswerProgress()` (across all four modos), `colorFor()` (hashed from the id, stable under reordering — GOTCHAS §22), `statusOf()`, `statusLabel()`, `countByTema()`, `isFull()`, `isLiderLocked()`, `getLiderName()`. Sharing: `getShareLink()`/`copyShareLink()`/`canShareByLink()`. Import trust boundary: `isSafeId()` + `prepareImport()`. `_cleanupOrphaned()` scrubs `respuestas`, `decisionFinal`, `settings.lideres`, and `respuestasImportadas` whenever a Tema/Opción is deleted. |
| `RespuestasService` | Owns the `respuestas` context: `{ seleccion: {[opcionId]: temaId}, texto: {[temaId]: string}, voto: {[temaId]: opcionId}, ranking: {[temaId]: opcionId[]} }` — one sub-map per modo. `seleccion` is indexed by Opción (many Opciones share a Tema, no array needed); the other three are indexed by Tema. `assignOpcion()`/`unassignOpcion()` for `reparto` (always succeeds — over-capacity is allowed on purpose), `setVoto()`/`clearVoto()` for `votacion`, `setRanking()`/`clearRanking()` for `ranking`, `setTexto()`/`clearTexto()` for `texto_libre`. Re-normalises itself against the Plantilla on boot and on every `plantilla` change. Sharing: `exportMine()`, `getShareLink()`/`copyShareLink()`/`sendShareLinkEmail()` (guarded by `canShareByLink()`), `importMine(data)` wholesale-replaces the context ("continue on another device", see DATA.md). |
| `ConsensoService` | Owns the `decisionFinal` context: `{ seleccion: {[opcionId]: temaId}, texto: {[temaId]: {autor, texto, esSintesis?, fuentes?}}, voto, ranking }` — same seleccion/texto split as `respuestas`, for the same reason. `hasResolution`/`finalFor`/`setResolution`/`suggestFinal`/`fillAllWithSuggestion`/`clearAll` for modo `reparto` (majority-vote suggestion with manual override), `finalVotoFor`/`setResolutionVoto` for `votacion` and `finalRankingFor`/`setResolutionRanking` for `ranking` (Borda-aggregated suggestion). `finalTextoFor`/`setResolutionTexto`/`clearResolutionTexto` for modo `texto_libre` (adopt one author's exact proposal as the chosen answer), plus `setSintesisTexto`/`hasSintesisTexto`/`descripcionTextoFinal` for the composed **síntesis** answer (see FEATURES.md §TextCompareCards). `exportFinal()` builds the combined final Respuestas JSON, preserving the whole texto entry (esSintesis + fuentes). |
| `SettingsService` | Owns the `settings` context (`{ autor, email, lideres, lideresEnabled, soundEnabled, bienvenidaOculta }`). `getEffectiveLider(temaId)` returns `{ member, locked }` where `locked: true` means the leader came from the Tema's `meta.lider` (Plantilla-authored, read-only) rather than the UI-set `lideres` map. `isSoundEnabled()`/`setSoundEnabled()` gate `SoundService`'s cues, and `isBienvenidaOculta()`/`ocultarBienvenida()` remember (per device, by message fingerprint) that the welcome banner was dismissed. The old `sexoEnabled`/`edadEnabled` toggles are gone — sexo/edad are ordinary custom `atributos` now. |
| `ExportService` | `downloadRespuestas(autor, respuestas)`, `downloadConsenso(...)`, `downloadPlantilla(plantilla)` and `downloadBackup(...)` — build the versioned JSON envelope (`{ app, version: 2, tipo, ... }`) and delegate the Blob download to `FileDownloadService`. The extension follows `tipo`: `.plantilla`, `.respuestas`, `.conclave`, `.conclave-backup` (all defined in `src/AppConfig.js`). |
| `RespuestasImportService` | Owns the `respuestasImportadas` context: `[{ autor, respuestas: { seleccion, texto } }]` — comparison sources imported in CompareView. Migrated to Context (from a plain in-memory array) because several components (`CompareCarousel`, `FinalTally`, `TextCompareCards`) read and react to this same list — see GOTCHAS.md §11. `import(data, filename)` normalizes/dedupes against the current Plantilla; `removeOrphaned()` cleans references when Temas/Opciones are deleted. |
| `ConfirmActionModal` | Provider-Service owning one `<slice-modal>` instance lazily. Driven by `confirm:request` event. |
| `ToastProvider` | Official Slice.js registry component. Lazy container. |
| `DragDropService` | Official Slice.js registry component + visual. Pointer-based drag-and-drop for `PorTemaView`. |
| `FileDownloadService` | Generic Blob download helper. |
| `ChartService` | Wraps the vendored Chart.js UMD bundle (`src/libs/chartjs/chart.umd.js`) — `create(canvas, config)`/`destroy(chart)`/`themeColor(varName)` (resolves a CSS custom property to a literal color string, since `<canvas>` can't read `var(--x)` directly). Consumers never import Chart.js themselves. First usage: `DashboardView`'s completion doughnut. |
| `SoundService` | Web Audio API synth engine — no external audio files. Provides semantic sound cues (`ui.tap`, `ui.nav`, `toast.*`, `modal.*`, `ui.celebrate`, etc.) each defined as frequency recipes with rate-limiting per cue and a global voice cap. `attachSFX(root)` installs a `pointerdown` listener that auto-plays the matching cue on any `data-sfx` attribute, `<button>`, or `<a href="/...">` element. Muting is delegated to `SettingsService.isSoundEnabled()`. AudioContext is lazily created + unlocked on first user gesture. |

| `IconProvider` | Thin wrapper over `src/Components/Visual/Icon/icons.js` which maps icon names to Lucide SVG components. Exposes `svg(name, size, color)` (returns SVG string) and `getNode(name)` (returns the Lucide icon function). Registered as a singleton Provider for any component that needs to render icons outside of `<slice-icon>`. |

| `CompressionService` | Stateless LZ-string compress/decompress + key mapping. `packForURI(data)` maps long keys to short ones (`nombre→n`, `temas→ts`, etc.) before compression to produce shorter URL hashes. `unpackFromURI(data)` reverses the map. Unknown keys pass through unchanged (backward compatible with pre-short-key URLs). |

`DataParserService` (CSV/TSV/JSON parsing for the old textarea-based roster editor) was deleted along with `HelpView` in the CRUD-builder rewrite — Temas/Opciones are edited through real forms now, no bulk text parsing.

## Views (`Components/AppComponents/`)

| View | Route | Key behavior |
|---|---|---|
| `LandingView` | `/` | Stats row (opciones/temas/respondidas counts), quick-action cards, "Cómo funciona" 3-step flow, and "Para qué podés usarla" use-case cards. |
| `DashboardView` | `/dashboard` | One section per modo the Plantilla uses: reparto Tema cards with bars + status badges, and Votación/Ranking/Texto libre lists with answered/pending badges. A completion doughnut over `getAnswerProgress()`. The shell rebuilds only when `_shapeKey()` changes. Header has a "📤 Compartir respuestas" button (`slice.build('Button')` → `ExportRespuestasModal`). Reads `respuestas`. Watches `respuestas` + `settings` + `plantilla`. |
| `RespuestasView` | `/mis-respuestas` | Tab shell composing `MisRespuestasView` (carousel), `PorTemaView` (drag-and-drop board), and `RespuestasTextoView` (free-text answers). Carrusel/Por tema only offered when the Plantilla has ≥1 Opción; Texto libre only when it has ≥1 Tema in modo `texto_libre`. If neither is true, shows an empty-state pointing to `/plantilla` instead of empty tabs. |
| `MisRespuestasView` | (sub-tab) | Carousel: one Opción at a time, pick a Tema pill. Auto-advances after 500ms with animated feedback (bounce + checkmark). Reads/writes `respuestas.seleccion`. |
| `PorTemaView` | (sub-tab) | Drag-and-drop `OpcionChip`s between sidebar and Tema squares. Reads/writes `respuestas.seleccion`. |
| `RespuestasTextoView` | (sub-tab) | One textarea per modo `texto_libre` Tema, saved on blur. Reads/writes `respuestas.texto`. |
| `CompareView` | `/comparar` | Imports Respuestas from other people (existing `ImportDrop`) and consenso from a URL hash. **It does NOT import Plantillas** — the only file-based Plantilla import is `PlantillaBuilderView`'s. Shows a "Selección"/"Texto libre" kind-tab pair when the Plantilla mixes both modos — Selección keeps the existing table/carousel/team views and the "Final" decision column; Texto libre delegates to `TextCompareCards`, which mounts the `SynthTextoModal` child (lazy modal for composing a síntesis, see FEATURES.md §TextCompareCards). |
| `PlantillaBuilderView` | `/plantilla` | Real CRUD for Temas and Opciones. Detalles section (nombre de la Plantilla, mensaje de bienvenida, líder toggle). Inline "escribir + Enter" add row per list (no modal). Per-row inline edit, modo toggle with conditional fields, per-action delete confirm naming the impact count. Single "📤 Compartir plantilla" button → `SharePlantillaModal`. Also hosts "📂 Importar Plantilla" (`prepareImport()` → `loadFromData()`; opens `BienvenidaModal` with `navigateOnStart: false` when the imported Plantilla carries a message). |

`SettingsView`/`/configuracion` no longer exist — identity (tu nombre), tema, and every "mis Respuestas" action (exportar/importar/reiniciar) moved to `UserMenu`, built once from `TopBar` and reachable from any route (see below).

## Contexts

All `{ persist: true }` (localStorage):

| Context | Key | Shape |
|---|---|---|
| `settings` | `conclave-settings-v3` | `{ autor, email, lideres, lideresEnabled }` |
| `plantilla` | `conclave-plantilla-v1` | `{ nombre, atributos, temas: Tema[], opciones: Opcion[] }` |
| `respuestas` | `conclave-respuestas-v1` | `{ seleccion: {[opcionId]: temaId}, texto: {[temaId]: string}, voto: {[temaId]: opcionId}, ranking: {[temaId]: opcionId[]} }` |
| `decisionFinal` | `conclave-decision-final-v1` | `{ seleccion, texto, voto, ranking }` (mirrors respuestas shape) — `texto[temaId]` is an object `{ autor, texto }` or, for a synthesis, `{ autor, texto, esSintesis: true, fuentes }` |
| `respuestasImportadas` | `conclave-respuestas-importadas-v1` | `[{ autor, respuestas: { seleccion, texto, voto, ranking } }]` |

Every piece of shared, cross-component state now lives in a real `slice.context` — `plantilla` and `respuestasImportadas` were migrated from ad-hoc in-memory caches + a custom `roster:changed` event to this pattern, per the framework's own guidance (`context-vs-events.md`: "several components read and react to this state" → Context). There is no custom app event left besides `toast:show` and `confirm:request` — reactivity is entirely `slice.context.watch()`.

## Data flow

### Plantilla replacement (PlantillaBuilderView / CompareView import → PlantillaService)

```
PlantillaBuilderView per-row edit → PlantillaService.updateTema/updateOpcion (patch, never a raw replace)
PlantillaBuilderView per-row delete → confirm:request (impact count) → PlantillaService.removeTema/removeOpcion
CompareView Plantilla import → confirm:request (impact count) → PlantillaService.loadFromData(temas, opciones)
  → slice.context.setState('plantilla', ...)
    → _cleanupOrphaned() (cleans respuestas, decisionFinal, settings.lideres, respuestasImportadas)
      → every view watching 'plantilla' repaints automatically (no event needed)
```

### Respuestas flow (MisRespuestasView carousel)

```
User clicks pill → RespuestasService.assignOpcion(opcionId, temaId)
  → _advancePending = true
  → update() → _render()
  → _showAdvanceFeedback():
      • pill gets .pill-just-assigned (green + scale bounce + ::after checkmark)
      • .assign-summary shows "Opción → Tema" (slide-in animation)
  → setTimeout(500ms):
      • _advancePending = false
      • carouselIndex++
      • update() → fresh paint of next Opción
```

### Texto libre flow (RespuestasTextoView → CompareView's TextCompareCards)

```
User types in a Tema's textarea, blurs → RespuestasService.setTexto(temaId, texto)
  → exported via ExportService.downloadRespuestas() alongside seleccion
Someone else's exported Respuestas JSON is imported in CompareView
  → RespuestasImportService.import() stores { seleccion, texto } per source
CompareView's "Texto libre" kind-tab → TextCompareCards renders one big card
per source for the active Tema → "Marcar como elegida" → ConsensoService.setResolutionTexto()
```

## Naming conventions

- **Repaint methods**: every view keeps its paint logic in a private `_render()` and the public `update()` (called by MultiRoute on a cached revisit) delegates to it. `init()` calls `_render()` directly, never the public `update()` — the framework's wrapper assumes a registered instance (GOTCHAS §4).
- **Context creation**: every context-owning Domain service calls `StoreService.ensure(name, initialState, storageKey)` **once** in its `init()`. There is no `utils/` folder — that helper used to live in `src/utils/context.js`.
- **esc()**: `HtmlService.esc(value)` — wrap any user-provided string before interpolating it into HTML. `sanitize(html)` is the final net before an `innerHTML` assignment, and `sanitizeRichText(html)` is the narrow allowlist for text somebody else authored.
