# Conclave — Agent Notes

Project-specific knowledge for anyone (human or agent) picking up work on this codebase.

## What this is

Conclave is a Slice.js (`slicejs-web-framework` v3.x) app for assigning people ("miembros") to teams/roles ("equipos") for an event, comparing several organizers' proposals, and settling on a final list. Frontend-only — all data lives in localStorage + bundled seed data.

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
| Changing data format (CSV, JSON, IDs) | `docs/DATA.md` |
| Modifying carousel or assignment flow | `docs/FEATURES.md` §Carousel feedback + `docs/UX.md` §Animation |
| Modifying HelpView | `docs/FEATURES.md` §HelpView + `docs/DATA.md` §CSV format |
| Working on ByTeamView drag-and-drop | `docs/FEATURES.md` §ByTeamView + `DESIGN.md` §Drag and drop |
| Changing how data is saved/loaded | `docs/DATA.md` §Storage + §Data flow on replacement |
| Modifying CompareView | `docs/FEATURES.md` §CompareView |
| Adding animations or visual feedback | `docs/UX.md` §Animation standards |
| Adding a new event or modal | `docs/GOTCHAS.md` §12 (event registry) + §10 (lazy Modal) |
| Changing theme / color tokens | `DESIGN.md` §Color, `src/Themes/Light.css`, `src/Themes/Dark.css` |
| Vercel deployment | See `docs/ARCHITECTURE.md` or AGENTS.md §Running it |

## Product decisions (not obvious from the code)

- **Over-capacity assignment is allowed on purpose.** `AssignmentService.assign()` always succeeds. The persistent signal is the `over`/danger badge, computed live from state. See `DESIGN.md` §Capacity alerts.
- **Confirmation dialogs use the `confirm:request` event**, never native `confirm()`/`prompt()`/`alert()`. Error notifications use `toast:show` with `type: 'error'`.
- **The "Tu nombre" field lives only in SettingsView**, not the topbar. `AppShell._exportMine()` prompts for it via `ConfirmActionModal`'s `inputLabel` when empty at export time.
- **All data is fictional** (team names, member names were replaced for public demo). Structure is preserved exactly from the original retreat data. Generic names are intentional, not bugs.

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
