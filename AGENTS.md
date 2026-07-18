# Conclave — Agent Notes

Project-specific knowledge for anyone (human or agent) picking up work on this codebase.

## What this is

Conclave is a Slice.js (`slicejs-web-framework` v3.x) app for structured group decision-making / brainstorming: a leader builds a shared **Plantilla** (**Temas** + **Opciones**), each person fills in their own **Respuestas** independently, then everyone imports each other's Respuestas to compare and settle on a final answer. Frontend-only — all data lives in localStorage + bundled seed data; there is no server-side data layer and no plan to add one (`api/` is a static/SPA-fallback server only).

### Vocabulary (post-rename — see REDESIGN.md)

- **Tema** (ex "Categoría"/"Equipo"): a decision axis. Its **`modo`** determines how it's answered:
  - `reparto` (ex `seleccion`; UI label "Asignación") — a shared global pool of **Opciones** is distributed into reparto Temas (assign people to teams). Opciones have `temaId: null` (pool). Has capacidad/min/max.
  - `texto_libre` — each person writes a free-text answer; no Opciones.
  - `votacion` — the Tema owns its own Opciones (`temaId` = that Tema); each person picks one. *(Response UI: Fase 2.)*
  - `ranking` — the Tema owns its Opciones; each person orders/scores them. *(Fase 4.)*
  - A single Plantilla can mix modos freely.
- **Opción** (ex "Miembro"): an item — a pool member (reparto) or a Tema-owned choice (votacion/ranking). Carries per-Plantilla custom **`atributos`** values in `meta` (edad/sexo are no longer hardcoded — Fase 3).
- Do not reintroduce the legacy words `categoria`, `equipo`/`team`, `miembro`/`member` in code — the vocabulary is `tema`/`opcion` throughout.

> **Redesign record:** `REDESIGN.md` (repo root) documents the **completed** phased rework (Fases 0–6: architecture refactor → data model → votación → atributos → ranking → template gallery → landing/UI polish) and every product/architecture decision behind it. Read it before touching the data model, the builder, or the component/refresh conventions — it explains *why* things are the way they are.

## Documentation — read the right file for your task

### Must-read (always read these first)

| File | What it covers |
|---|---|
| `docs/GOTCHAS.md` | 29 framework/app pitfalls discovered by reading Slice.js source and by hitting them. **Read before any structural change.** (§1–22 framework internals; §23 Express 5 sendFile; §24 migrate-before-reseed; §25 `slice get` regenerates registry; §26 reskin registry; §27 mobile Enter key; §28 dropdown clipped by scroll; §29 fullscreen overlays.) |
| `docs/COMPONENT-PATTERNS.md` | The component/refresh contract every component follows: lifecycle (`init`/`update`/`_render`), the refresh hierarchy (setter → setComponentProps → `update(props)` → `reconcile` → innerHTML-last-resort), Core services (`StoreService`/`HtmlService`/`DomService`), `reconcile`. **Read before writing/refactoring any component.** |
| `DESIGN.md` | Visual language: "Sticker Book" concept, typography, color tokens, hero-vs-dense, motion, drag-and-drop. **Read before any CSS change.** |
| `REDESIGN.md` (root) | The phased redesign in progress + its product/architecture decisions. |

### Task-specific docs

| Task | Read |
|---|---|
| Writing/refactoring ANY component (refresh, lists, lifecycle) | `docs/COMPONENT-PATTERNS.md` **first** |
| Adding/modifying a service | `docs/COMPONENT-PATTERNS.md` §Core services + `docs/ARCHITECTURE.md` §Services, §Boot order, §Data flow |
| Adding/modifying a view | `docs/COMPONENT-PATTERNS.md` + `docs/ARCHITECTURE.md` §Views, §Data flow |
| Changing data format (Plantilla/Respuestas JSON, modos, IDs, atributos) | `docs/DATA.md` + `REDESIGN.md` §Modelo de datos |
| Modifying carousel or assignment (reparto) flow | `docs/FEATURES.md` §Carousel feedback + `docs/UX.md` §Animation |
| Modifying PlantillaBuilderView (Tema/Opción CRUD, bulk ops) | `docs/FEATURES.md` §PlantillaBuilderView + `docs/DATA.md` |
| Working on PorTemaView drag-and-drop | `docs/FEATURES.md` §PorTemaView + `DESIGN.md` §Drag and drop |
| Adding a shared UI control (tabs, etc.) | `docs/COMPONENT-PATTERNS.md` §Reskinning registry components + GOTCHAS §26 |
| An input that submits on Enter (add row, etc.) | `docs/COMPONENT-PATTERNS.md` §Text inputs + GOTCHAS §27 (pair Enter with a tap button — mobile) |
| A fullscreen / modal overlay | `docs/COMPONENT-PATTERNS.md` §Fullscreen overlays + GOTCHAS §29 |
| A dropdown / Select / popover inside a scrollable area | GOTCHAS §28 (absolute menu clipped by `overflow` ancestor) |
| Anything touch/mobile-facing | GOTCHAS §27 (Enter unreliable), §29 (overlay body-scroll lock) |
| Changing how data is saved/loaded/migrated | `docs/DATA.md` §Storage + GOTCHAS §20, §24 |
| Modifying CompareView | `docs/FEATURES.md` §CompareView |
| Adding animations or visual feedback | `docs/UX.md` §Animation standards |
| Adding a new event or modal | `docs/GOTCHAS.md` §12 (event registry) + §10 (lazy Modal) |
| Changing theme / color tokens | `DESIGN.md` §Color, `src/Themes/Light.css`, `src/Themes/Dark.css` |
| Vercel deployment / server 500s | AGENTS.md §Running it + GOTCHAS §23 (Express 5 sendFile) |

### Service folder layout (`sliceConfig.json` → `paths.components`)

- **`Core`** — infrastructure, no domain knowledge: `StoreService`, `HtmlService`, `DomService`, `FileDownloadService`, `FetchManager`, `LocalStorageManager`, `IndexedDbManager`, `ChartService`, `CompressionService`.
- **`Domain`** — business logic: `PlantillaService`, `RespuestasService`, `ConsensoService`, `SettingsService`, `RespuestasImportService`, `ExportService`.
- **`Providers`** — wiring + provider-services that own a Visual: `Providers` (composition root), `ToastProvider`, `ConfirmActionModal`, `ExportRespuestasModal`, `SharePlantillaModal`, `DragDropService`.
- Visual UI stays in `Visual` / `AppComponents` / `DataDisplay`. There is **no `utils/` folder** — shared helpers are Core services. **Visual = UI only; domain logic lives in a Domain service.**

## Product decisions (not obvious from the code)

- **Over-capacity assignment is allowed on purpose.** `RespuestasService.assignOpcion()` always succeeds. The persistent signal is the `over`/danger badge, computed live from state. See `DESIGN.md` §Capacity alerts.
- **Confirmation dialogs use the `confirm:request` event**, never native `confirm()`/`prompt()`/`alert()`. Error notifications use `toast:show` with `type: 'error'`.
- **The "Tu nombre" field lives in the topbar's `UserMenu`** (SettingsView is retired). Prompts for it via `ConfirmActionModal`'s `inputLabel` when empty at export time.
- **Email is a user-level preference** (`SettingsService.email`, stored per-device), not per-Plantilla. Used to identify the creator in shared Plantilla/respuestas links.
- **Export/Share modals are lazy-built singletons.** `ExportRespuestasModal` and `SharePlantillaModal` build their `<slice-modal>` on first `show()` call, never in `init()`. A promise guard (`_modalPromise`) prevents races on concurrent calls. Both are registered as Providers (category required for `singleton: true`).
- **The share button in UserMenu, RespuestasView, and DashboardView all open the same `ExportRespuestasModal`** — single entry point for all respuestas sharing actions.
- **Plantilla share links carry creator identity.** `PlantillaService.getShareLink()` packs `autor` + `email` from `SettingsService` into the URL. On import, `AppShell._tryImportPlantilla()` shows "Creada por Nombre (email@...)" in the confirmation dialog.
- **Short keys in share URLs.** `CompressionService.packForURI()` maps long keys (e.g. `nombre→n`, `temas→ts`) before LZ compression, producing shorter hashes. `unpackFromURI()` reverses it, passing unknown keys through unchanged (backward compatible with old full-key URLs).
- **`mailto:` share links leave the `to` field empty** — the user fills in the recipient manually. The body includes the sharer's name and the link.
- **All seed data is fictional** (Categoría/Opción names were replaced for public demo). Structure is preserved exactly from the original retreat data. Generic names are intentional, not bugs.
- **Plantilla data lives entirely in the browser.** There is no server-side storage for Categorías/Opciones and no plan to add any — sharing a Plantilla is exporting/importing its file (`.plantilla`), same as Respuestas (`.respuestas`). The extensions are defined in `Core/AppConfig/AppConfig.js`. Legacy `.json` files are still accepted on import.

## Running it

pnpm-based (`packageManager` pinned in `package.json`):

```bash
pnpm run dev              # dev server (default port 3001)
pnpm run slice:doctor     # structural diagnostics after add/remove/rename
pnpm run build            # production build
pnpm run component:create <Name> --category <Cat>
pnpm run component:delete <Name> --yes
pnpm run component:list   # rescans and rewrites components.js
```

## Vercel deployment

**`api/index.js`** is a custom Express server (workaround for `createSliceServer()` not bundling `Slice.js` via Vercel's `fs.readFileSync` path). See `api/index.js` comments for revert instructions when the framework is fixed.

### How it works

1. Post-build: `node scripts/copy-slice.js` copies `Slice.js` from `node_modules` to `dist/Slice/Slice.js`.
2. `includeFiles: "dist/**"` in `vercel.json` includes it in the function bundle.
3. Custom `api/index.js` serves it at `/Slice/Slice.js`.
4. `pnpm remove express` once reverted (no longer a direct consumer).
