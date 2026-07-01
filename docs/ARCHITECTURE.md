# Architecture

## App Shell + MultiRoute

Every route in `src/routes.js` points to `AppShell`; `AppShell` builds its own internal `MultiRoute` mapping the same six paths to the six view components. `AppShell` itself persists across navigation (see GOTCHAS.md §2) — it's where the topbar, tabs, and footer live.

## Composition root

`Components/AppServices/Providers/Providers.js`, built once via `slice.build('Providers', { singleton: true })` from `AppShell.init()`. It boots every singleton Service in order and is the one place new app-wide singletons get registered. Recover any of them anywhere via `slice.getComponent('ServiceName')`.

### Boot order

```
AppShell.init() → slice.build('Providers')
  → Providers.init():
      1. slice.events.register() — declares toast:show, confirm:request
      2. RosterService — loads localStorage → seed fallback
      3. AssignmentService — ensures assignment context
      4. ResolutionService — ensures resolutions context
      5. SettingsService — ensures settings context
      6. DataParserService — stateless, parse methods only
      7. ExportService — stateless, download helpers
      8. ConfirmActionModal — lazy (builds <slice-modal> on first use)
      9. ToastProvider — lazy (builds container on first .show())
     10. DragDropService — registered after the above
```

## Services (`Components/Service/`)

| Service | Role |
|---|---|
| `RosterService` | Owns teams + members in-memory. Loads from localStorage keys `conclave-teams-v1` / `conclave-members-v1`; falls back to bundled `seedData.js`. Provides query methods (`getTeams()`, `getMembers()`, `getTeamById()`, `getMemberById()`, `statusOf()`, `statusLabel()`, `countByTeam()`, `isFull()`, `isLiderLocked()`, `getLiderName()`). `loadFromData()` replaces both datasets and runs `_cleanupOrphaned()`. Emits `roster:changed`. |
| `AssignmentService` | Owns `assignment` context (`{[memberId]: teamId}`). `assign()` always succeeds (over-capacity allowed). `exportMine()` delegates to ExportService. |
| `ResolutionService` | Owns `resolutions` context (`{[memberId]: teamId}`). The "Final" decisions in CompareView. |
| `SettingsService` | Owns `settings` context (`{autor, nombreOrganizacion, lideres, lideresEnabled}`). `getEffectiveLider(teamId)` returns `{ member, source }` where source is `'rostro'` (from CSV lider column) or `'ui'` (from the carousel crown toggle). |
| `DataParserService` | Stateless singleton. `parseTeams()` / `parseMembers()` accept raw text + format (`csv`, `tsv`, `json`), return `{ teams/members, errors }`. `validateTeams()` / `validateMembers()` return field-level errors. |
| `ExportService` | `downloadAsignaciones(autor, asignaciones)` and `downloadFinalList(autor, resoluciones)` — builds JSON envelope with `{ app, version, fecha, autor, asignaciones }` and delegates Blob download to `FileDownloadService`. |
| `ImportService` | Manages imported comparison sources (CompareView). `addSource(name, data)`, `removeOrphaned(removedMemberIds, removedTeamIds)` — cleans references when roster data is replaced. |
| `ConfirmActionModal` | Provider-Service owning one `<slice-modal>` instance lazily. Driven by `confirm:request` event. |
| `ToastProvider` | Official Slice.js registry component. Lazy container. |
| `DragDropService` | Official Slice.js registry component + visual. Pointer-based drag-and-drop for ByTeamView. |
| `FileDownloadService` | Generic Blob download helper. |

## Views (`Components/AppComponents/`)

| View | Route | Key behavior |
|---|---|---|
| `LandingView` | `/` | Stats row (members/teams/assigned counts) + four quick-action cards. |
| `DashboardView` | `/dashboard` | Team cards with bars + status badges. Reads `assignment` context. Watches `assignment` + `roster:changed`. |
| `MyAssignmentView` | `/mi-asignacion` | Carousel: one member at a time, pick a team pill. Auto-advances after 500ms with animated feedback (bounce + checkmark). Reads/writes `assignment`. Watches `assignment` + `roster:changed`. |
| `ByTeamView` | `/por-equipo` | Drag-and-drop member chips between sidebar and team squares. Reads `assignment`. |
| `CompareView` | `/comparar` | Table comparing multiple imported sources + "Final" column. Reads `resolutions`. |
| `HelpView` | `/ayuda` | CSV/JSON data generator. Two textareas (teams + members), diff preview, ConfirmActionModal on destructive save. |
| `SettingsView` | `/configuracion` | Autor name + organization name. |

## Contexts

All three are `{ persist: true }` (localStorage):

| Context | Key | Shape |
|---|---|---|
| `assignment` | `conclave-assignment-v1` | `{ [memberId]: teamId }` |
| `resolutions` | `conclave-resolutions-v1` | `{ [memberId]: teamId }` |
| `settings` | `conclave-settings-v1` | `{ autor, nombreOrganizacion, lideres, lideresEnabled }` |

There's deliberately no `roster` context — RosterService is a plain in-memory cache (its own `_saveToStorage()` writes to `conclave-teams-v1` / `conclave-members-v1` directly). CompareView's imported sources are also not context — they live as a plain instance field on ImportService (session-only by design).

## Data flow

### Roster replacement (HelpView → RosterService)

```
HelpView textareas → DataParserService.parseTeams/Members
  → computeDiff() (old vs new)
  → if conflicts → ConfirmActionModal
  → RosterService.loadFromData(teams, members)
    → _rebuild() (re-indexes by ID, assigns colors)
    → _cleanupOrphaned() (cleans assignment, resolutions, settings.lideres, ImportService)
    → _saveToStorage() (writes localStorage)
    → emit('roster:changed')
      → DashboardView, MyAssignmentView, ByTeamView, CompareView repaint
```

### Assignment flow (MyAssignmentView carousel)

```
User clicks pill → AssignmentService.assign(memberId, teamId)
  → _advancePending = true
  → update() → _paint()
  → _showAdvanceFeedback():
      • pill gets .pill-just-assigned (green + scale bounce + ::after checkmark)
      • .assign-summary shows "Member → Team" (slide-in animation)
  → setTimeout(500ms):
      • _advancePending = false
      • carouselIndex++
      • update() → fresh paint of next member
```

## Naming conventions

- **Repaint methods**: Every view uses a private repaint method. Names vary (`_paint()`, `_refresh()`, `_layout()`, `_render()`) — grep the view for which it uses. The public `update()` (called by MultiRoute on revisit) always delegates to the private method.
- **ensureContext()**: Shared utility at `src/utils/context.js` — used by AssignmentService, ResolutionService, SettingsService instead of three identical `_ensureContext()` methods.
- **esc()**: HTML-escaping utility at `src/utils/format.js` — wrap any user-provided string in it.
