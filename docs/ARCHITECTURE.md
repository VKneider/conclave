# Architecture

> **Post-Fase-3 update.** The sections below predate the redesign in some
> details; this block is the current source of truth for structure. See
> `docs/DATA.md` (data model), `docs/COMPONENT-PATTERNS.md` (component/refresh
> contract + Core services), and `REDESIGN.md` (phased history).
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
>   `ConfirmActionModal`, `ExportRespuestasModal`, `SharePlantillaModal`,
>   `DragDropService`, `IconProvider`.
> - There is no `utils/` folder. Visual = UI only; domain logic lives in a
>   Domain service. Every context-owning Domain service calls
>   `StoreService.ensure()` **once** in `init()`.
>
> **Contexts** now carry the four-modo model — see `docs/DATA.md` for shapes:
> `plantilla { nombre, atributos, temas, opciones }`, `respuestas`/`decisionFinal`
> `{ seleccion, texto, voto, ranking }`, `respuestasImportadas`, `settings
> { autor, email, lideres, lideresEnabled, soundEnabled }`.
>
> **Views** (`AppComponents`): `LandingView`, `DashboardView`, `RespuestasView`
> (tab shell → `MisRespuestasView` carousel, `PorTemaView` board,
> `RespuestasVotacionView` "elegí una", `RespuestasTextoView`), `CompareView`,
> `PlantillaBuilderView`, `AppShell`, `TopBar`, `UserMenu`. Shared control:
> `Tabs` (Visual, segmented control, `variant` prop) — see GOTCHAS §26.

## App Shell + MultiRoute

Every route in `src/routes.js` points to `AppShell`; `AppShell` builds its own internal `MultiRoute` mapping the same five paths to the five view components. `AppShell` itself persists across navigation (see GOTCHAS.md §2) — it's where the persistent `TopBar` (tabs + `UserMenu`) lives. There's no footer — every session-level action (exportar/importar/reiniciar mis Respuestas, tu nombre, tema) lives in `UserMenu` instead, reachable from any route.

## Composition root

`Components/AppServices/Providers/Providers.js`, built once via `slice.build('Providers', { singleton: true })` from `AppShell.init()`. It boots every singleton Service in order and is the one place new app-wide singletons get registered. Recover any of them anywhere via `slice.getComponent('ServiceName')`.

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

`PlantillaService` must finish before anything else reads categoría/opción data — every other Service/view assumes it's already loaded.

## Services (`Components/Service/`)

| Service | Role |
|---|---|
| `PlantillaService` | Owns the `plantilla` context: `{ categorias, opciones }`. Falls back to bundled `seedData.js` if localStorage is empty/invalid on first boot. Full CRUD: `addCategoria`/`removeCategoria`/`updateCategoria`, `addOpcion`/`removeOpcion`/`updateOpcion`, plus bulk `loadFromData(categorias, opciones)` (used by Plantilla import) and `resetToSeed()`. Query helpers: `getCategorias()`, `getCategoriasParticipables()` (modo `seleccion` + `participable`), `getCategoriasTexto()` (modo `texto_libre`), `getOpciones()`, `getOpcionesDisponibles()`, `getCategoriaById()`, `getOpcionById()`, `colorFor()`, `statusOf()`, `statusLabel()`, `countByCategoria()`, `isFull()`, `isLiderLocked()`, `getLiderName()`. `_cleanupOrphaned()` scrubs `respuestas`, `decisionFinal`, `settings.lideres`, and `respuestasImportadas` whenever a Categoría/Opción is deleted. |
| `RespuestasService` | Owns the `respuestas` context: `{ seleccion: {[opcionId]: categoriaId}, texto: {[categoriaId]: string} }`. `seleccion` is indexed by Opción (many Opciones can share a Categoría, no array needed); `texto` is indexed by Categoría (one free-text answer per question). `assignOpcion()`/`unassignOpcion()` for modo `seleccion` (always succeeds — over-capacity allowed). `setTexto()`/`clearTexto()` for modo `texto_libre`. `exportMine()` delegates to `ExportService`. `importMine(data)` wholesale-replaces the context ("continue on another device", see DATA.md). |
| `ConsensoService` | Owns the `decisionFinal` context: `{ seleccion: {[opcionId]: categoriaId}, texto: {[categoriaId]: {autor, texto, esSintesis?, fuentes?}}, voto, ranking }` — same seleccion/texto split as `respuestas`, for the same reason. `hasResolution`/`finalFor`/`setResolution`/`fillAllWithSuggestion`/`clearAll` for modo `seleccion` (majority-vote suggestion with manual override, unchanged logic from before the rename). `finalTextoFor`/`setResolutionTexto`/`clearResolutionTexto` for modo `texto_libre` (adopt one author's exact proposal as the chosen answer), plus `setSintesisTexto`/`hasSintesisTexto`/`descripcionTextoFinal` for the composed **síntesis** answer (see FEATURES.md §TextCompareCards). `exportFinal()` builds the combined final Respuestas JSON, preserving the whole texto entry (esSintesis + fuentes). |
| `SettingsService` | Owns `settings` context (`{autor, lideres, lideresEnabled, sexoEnabled, edadEnabled}`). `getEffectiveLider(categoriaId)` returns `{ member, locked }` where `locked: true` means the leader came from the Categoría's `meta.lider` (Plantilla-authored, read-only) rather than the UI-set `lideres` map. `isSexoEnabled()`/`isEdadEnabled()` (both default `true`) gate whether `OpcionRow` and every downstream display show those two Opción fields — see FEATURES.md's Opciones list section. |
| `ExportService` | `downloadRespuestas(autor, respuestas)`, `downloadRespuestasFinal(autor, respuestas)`, and `downloadPlantilla(plantilla)` — build the versioned JSON envelope (`{ app, version: 2, tipo, ... }`) and delegate Blob download to `FileDownloadService`. The file extension depends on `tipo`: `.plantilla` for plantillas, `.respuestas` for respuestas (defined in `Core/AppConfig`). |
| `RespuestasImportService` | Owns the `respuestasImportadas` context: `[{ autor, respuestas: { seleccion, texto } }]` — comparison sources imported in CompareView. Migrated to Context (from a plain in-memory array) because several components (`CompareCarousel`, `FinalTally`, `TextCompareCards`) read and react to this same list — see GOTCHAS.md §11. `import(data, filename)` normalizes/dedupes against the current Plantilla; `removeOrphaned()` cleans references when Categorías/Opciones are deleted. |
| `ConfirmActionModal` | Provider-Service owning one `<slice-modal>` instance lazily. Driven by `confirm:request` event. |
| `ToastProvider` | Official Slice.js registry component. Lazy container. |
| `DragDropService` | Official Slice.js registry component + visual. Pointer-based drag-and-drop for `PorCategoriaView`. |
| `FileDownloadService` | Generic Blob download helper. |
| `ChartService` | Wraps the vendored Chart.js UMD bundle (`src/libs/chartjs/chart.umd.js`) — `create(canvas, config)`/`destroy(chart)`/`themeColor(varName)` (resolves a CSS custom property to a literal color string, since `<canvas>` can't read `var(--x)` directly). Consumers never import Chart.js themselves. First usage: `DashboardView`'s completion doughnut. |
| `SoundService` | Web Audio API synth engine — no external audio files. Provides semantic sound cues (`ui.tap`, `ui.nav`, `toast.*`, `modal.*`, `ui.celebrate`, etc.) each defined as frequency recipes with rate-limiting per cue and a global voice cap. `attachSFX(root)` installs a `pointerdown` listener that auto-plays the matching cue on any `data-sfx` attribute, `<button>`, or `<a href="/...">` element. Muting is delegated to `SettingsService.isSoundEnabled()`. AudioContext is lazily created + unlocked on first user gesture. |

| `IconProvider` | Thin wrapper over `src/Components/Visual/Icon/icons.js` which maps icon names to Lucide SVG components. Exposes `svg(name, size, color)` (returns SVG string) and `getNode(name)` (returns the Lucide icon function). Registered as a singleton Provider for any component that needs to render icons outside of `<slice-icon>`. |

| `CompressionService` | Stateless LZ-string compress/decompress + key mapping. `packForURI(data)` maps long keys to short ones (`nombre→n`, `temas→ts`, etc.) before compression to produce shorter URL hashes. `unpackFromURI(data)` reverses the map. Unknown keys pass through unchanged (backward compatible with pre-short-key URLs). |

`DataParserService` (CSV/TSV/JSON parsing for the old textarea-based roster editor) was deleted along with `HelpView` in the CRUD-builder rewrite — Categorías/Opciones are edited through real forms now, no bulk text parsing.

## Views (`Components/AppComponents/`)

| View | Route | Key behavior |
|---|---|---|
| `LandingView` | `/` | Stats row (opciones/categorías/respondidas counts), quick-action cards, "Cómo funciona" 3-step flow, and "Para qué podés usarla" use-case cards. |
| `DashboardView` | `/dashboard` | Categoría cards (modo `seleccion`) with bars + status badges, plus a "Texto libre" section showing per-Categoría answered/pending badges (modo `texto_libre`). Header has a "📤 Compartir respuestas" button (`slice.build('Button')` → `ExportRespuestasModal`). Reads `respuestas`. Watches `respuestas` + `settings` + `plantilla`. |
| `RespuestasView` | `/mis-respuestas` | Tab shell composing `MisRespuestasView` (carousel), `PorCategoriaView` (drag-and-drop board), and `RespuestasTextoView` (free-text answers). Carrusel/Por categoría only offered when the Plantilla has ≥1 Opción; Texto libre only when it has ≥1 Categoría in modo `texto_libre`. If neither is true, shows an empty-state pointing to `/plantilla` instead of empty tabs. |
| `MisRespuestasView` | (sub-tab) | Carousel: one Opción at a time, pick a Categoría pill. Auto-advances after 500ms with animated feedback (bounce + checkmark). Reads/writes `respuestas.seleccion`. |
| `PorCategoriaView` | (sub-tab) | Drag-and-drop `OpcionChip`s between sidebar and Categoría squares. Reads/writes `respuestas.seleccion`. |
| `RespuestasTextoView` | (sub-tab) | One textarea per modo `texto_libre` Categoría, saved on blur. Reads/writes `respuestas.texto`. |
| `CompareView` | `/comparar` | Imports Respuestas from other people (existing `ImportDrop`) plus an optional Plantilla import (collapsible, bulk-replaces Categorías/Opciones with a confirm-of-impact dialog, via `PlantillaService.prepareImport()`). Shows a "Selección"/"Texto libre" kind-tab pair when the Plantilla mixes both modos — Selección keeps the existing table/carousel/team views and the "Final" decision column; Texto libre delegates to `TextCompareCards`. |
| `PlantillaBuilderView` | `/plantilla` | Real CRUD for Temas and Opciones. Detalles section (nombre de la Plantilla, líder toggle). Inline "escribir + Enter" add row per list (no modal). Per-row inline edit, modo toggle with conditional fields, per-action delete confirm naming the impact count. Single "📤 Compartir plantilla" button → `SharePlantillaModal`. Also hosts "📂 Importar Plantilla" (same `prepareImport()` path as CompareView's). |

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
PlantillaBuilderView per-row edit → PlantillaService.updateCategoria/updateOpcion (patch, never a raw replace)
PlantillaBuilderView per-row delete → confirm:request (impact count) → PlantillaService.removeCategoria/removeOpcion
CompareView Plantilla import → confirm:request (impact count) → PlantillaService.loadFromData(categorias, opciones)
  → slice.context.setState('plantilla', ...)
    → _cleanupOrphaned() (cleans respuestas, decisionFinal, settings.lideres, respuestasImportadas)
      → every view watching 'plantilla' repaints automatically (no event needed)
```

### Respuestas flow (MisRespuestasView carousel)

```
User clicks pill → RespuestasService.assignOpcion(opcionId, categoriaId)
  → _advancePending = true
  → update() → _paint()
  → _showAdvanceFeedback():
      • pill gets .pill-just-assigned (green + scale bounce + ::after checkmark)
      • .assign-summary shows "Opción → Categoría" (slide-in animation)
  → setTimeout(500ms):
      • _advancePending = false
      • carouselIndex++
      • update() → fresh paint of next Opción
```

### Texto libre flow (RespuestasTextoView → CompareView's TextCompareCards)

```
User types in a Categoría's textarea, blurs → RespuestasService.setTexto(categoriaId, texto)
  → exported via ExportService.downloadRespuestas() alongside seleccion
Someone else's exported Respuestas JSON is imported in CompareView
  → RespuestasImportService.import() stores { seleccion, texto } per source
CompareView's "Texto libre" kind-tab → TextCompareCards renders one big card
per source for the active Categoría → "Marcar como elegida" → ConsensoService.setResolutionTexto()
```

## Naming conventions

- **Repaint methods**: Every view uses a private repaint method. Names vary (`_paint()`, `_refresh()`, `_layout()`, `_render()`) — grep the view for which it uses. The public `update()` (called by MultiRoute on revisit) always delegates to the private method.
- **ensureContext()**: Shared utility at `src/utils/context.js` — used by every context-owning Service instead of duplicating a `_ensureContext()` method (`PlantillaService`, `RespuestasService`, `ConsensoService`, `SettingsService`, `RespuestasImportService`).
- **esc()**: HTML-escaping utility at `src/utils/format.js` — wrap any user-provided string in it.
