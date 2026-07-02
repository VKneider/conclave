# Conclave — Agent Notes

Project-specific knowledge for anyone (human or agent) picking up work on this codebase.

## What this is

Conclave is a Slice.js (`slicejs-web-framework` v3.x) app for structured group decision-making: a leader builds a shared **Plantilla** (Categorías + Opciones — teams and members, exposiciones and ponentes, or open-ended discussion topics), each person fills in their own **Respuestas** independently, then everyone imports each other's Respuestas to compare and settle on a final answer. The original single use case (assign people to teams) still works exactly as before — it's now one instance of a more general Categoría (modo `seleccion`) / Opción model that also covers speaker assignment and free-text idea generation (modo `texto_libre`). Frontend-only — all data lives in localStorage + bundled seed data; there is no server-side data layer and no plan to add one (`api/` is a static/SPA-fallback server only).

## Documentation — read the right file for your task

### Must-read (always read these first)

| File | What it covers |
|---|---|
| `docs/GOTCHAS.md` | 13 framework pitfalls discovered by reading Slice.js source. **Read before any structural change.** |
| `DESIGN.md` | Visual language: "Sticker Book" concept, typography, color tokens, hero-vs-dense, motion, drag-and-drop. **Read before any CSS change.** |

### Task-specific docs

| Task | Read |
|---|---|
| Adding/modifying a service | `docs/ARCHITECTURE.md` §Services, §Boot order, §Data flow |
| Adding/modifying a view | `docs/ARCHITECTURE.md` §Views, §Data flow |
| Changing data format (Plantilla/Respuestas JSON, IDs) | `docs/DATA.md` |
| Modifying carousel or assignment flow | `docs/FEATURES.md` §Carousel feedback + `docs/UX.md` §Animation |
| Modifying PlantillaBuilderView (Categoría/Opción CRUD) | `docs/FEATURES.md` §PlantillaBuilderView + `docs/DATA.md` §Editing Categorías/Opciones |
| Working on PorCategoriaView drag-and-drop | `docs/FEATURES.md` §PorCategoriaView + `DESIGN.md` §Drag and drop |
| Changing how data is saved/loaded | `docs/DATA.md` §Storage + §Data flow on replacement |
| Modifying CompareView | `docs/FEATURES.md` §CompareView |
| Adding animations or visual feedback | `docs/UX.md` §Animation standards |
| Adding a new event or modal | `docs/GOTCHAS.md` §12 (event registry) + §10 (lazy Modal) |
| Changing theme / color tokens | `DESIGN.md` §Color, `src/Themes/Light.css`, `src/Themes/Dark.css` |
| Vercel deployment | See `docs/ARCHITECTURE.md` or AGENTS.md §Running it |

## Product decisions (not obvious from the code)

- **Over-capacity assignment is allowed on purpose.** `RespuestasService.assignOpcion()` always succeeds. The persistent signal is the `over`/danger badge, computed live from state. See `DESIGN.md` §Capacity alerts.
- **Confirmation dialogs use the `confirm:request` event**, never native `confirm()`/`prompt()`/`alert()`. Error notifications use `toast:show` with `type: 'error'`.
- **The "Tu nombre" field lives in the topbar's `UserMenu`** (SettingsView is retired). `UserMenu._exportMine()` also prompts for it via `ConfirmActionModal`'s `inputLabel` when empty at export time.
- **All seed data is fictional** (Categoría/Opción names were replaced for public demo). Structure is preserved exactly from the original retreat data. Generic names are intentional, not bugs.
- **Plantilla data lives entirely in the browser.** There is no server-side storage for Categorías/Opciones and no plan to add any — sharing a Plantilla is exporting/importing its JSON file, same as Respuestas.

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
