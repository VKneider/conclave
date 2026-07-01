# Feature documentation

## Landing page stats

File: `src/Components/AppComponents/LandingView/LandingView.js`

The landing page shows:
- **Live stats row**: member count, team count, assigned count (computed from RosterService + AssignmentService on render).
- **Four quick-action cards**: Asignar (/mi-asignacion), Comparar (/comparar), Dashboard (/dashboard), Configurar (/configuracion).

All stats update when `roster:changed` is emitted (via event subscription). No context watcher needed — the landing page is rebuilt from scratch on each visit.

## HelpView data generator

File: `src/Components/AppComponents/HelpView/HelpView.js`

The Ayuda view is the primary data management tool. It provides:

### Textareas
- Two side-by-side textareas (teams + members), pre-filled with current data serialized as CSV.
- Format toggle (CSV / JSON) at the top.
- Each textarea has an independent "Cargar ejemplo" button that fills BOTH textareas with a consistent 5-team + 5-member dataset.

### Preview (live on parse)
Clicking "💾 Guardar datos" parses both textareas and shows:
1. **Diff bar**: `+2 equipos −1 miembro ~0 modificados` with color-coded spans (green/red/amber).
2. **Count summary**: `✅ 5 equipos ✅ 8 miembros`.
3. **Preview tables**: First 10 rows of each dataset with ID, name, and key fields.
4. **Validation errors**: If data is valid, shows errors list; if parse errors exist, saving is blocked.

### ConfirmActionModal on destructive save
If the new data removes members or teams that have active assignments, a confirmation dialog appears before saving. The message specifies what will be removed and how many assignments will be orphaned. Saving deletes the rows and automatically cleans up orphaned references via `RosterService._cleanupOrphaned()`.

### Save flow
```
Click "Guardar datos"
  → DataParserService.parseTeams() / parseMembers()
  → validateTeams() / validateMembers()
  → computeDiff() (old vs new data)
  → show preview (tables + diff bar + errors)
  → if hasChanges:
      → if hasConflicts (assignments on removed items):
          → ConfirmActionModal: "¿Guardar datos?" (danger)
            → onConfirm → RosterService.loadFromData() → toast + rerender
            → onCancel → nothing
      → else:
          → RosterService.loadFromData() directly
  → if noChanges:
      → toast "No hay cambios para guardar"
  → if parseErrors:
      → show errors, block save
```

### Other actions
- **"⬇ Exportar JSON"**: Downloads current data as JSON via FileDownloadService.
- **"🔄 Restaurar ejemplo"**: Resets to seed data (7 teams, 15 members) with confirmation dialog.

## Carousel assignment feedback (MyAssignmentView)

File: `src/Components/AppComponents/MyAssignmentView/MyAssignmentView.js`  
CSS: `src/Components/AppComponents/MyAssignmentView/MyAssignmentView.css`

### Interaction flow
1. User clicks a team pill.
2. `AssignmentService.assign()` is called (always succeeds).
3. `_pendingAdvance` is set to the selected teamId, `update()` called.
4. `_paint()` renders the carousel with the current member (not yet advanced).
5. `_showAdvanceFeedback()` runs after binding:
   - The clicked pill gets `.pill-just-assigned`: green background, `pillAssignPop` bounce animation, `::after` checkmark appears with `checkBounce`.
   - `.assign-summary` text shows `"MemberName → TeamName"` with `summarySlideIn` animation.
   - All pills are effectively blocked during the 500ms window (`_advancePending` check).
6. After 500ms: advance `carouselIndex++`, repaint the next member.

### Behavior notes
- **Over-capacity**: If the assignment pushes a team over max, `AssignmentService.assign()` shows a warning toast ("«Team» quedó con exceso de personas") — but the feedback still shows as a green badge. The over-capacity warning is separate from the assignment confirmation.
- **Keyboard arrows**: Not blocked during the 500ms delay. If user presses → during feedback, the pending advance still fires but paint reflects the new index.
- **Unassign (✕ Sin asignar)**: No feedback badge, no delay, immediate repaint.

## ByTeamView drag-and-drop

File: `src/Components/AppComponents/ByTeamView/ByTeamView.js`

Uses official `DragDropService` for pointer-based drag-and-drop. Key design decisions:
- Dropzones (sidebar + team squares) are built once in `_buildShell()` and never rebuilt — `makeDroppable()` called once per zone.
- Each `MemberChip` registers itself as draggable inside its own `_registerDraggable()`.
- Member repositioning on drop is `container.appendChild(existingChipNode)` (no destroy/rebuild).
- `getEffectiveLider()` can return `{ member: null }` when the UI-set leader points to a deleted member; `_layout()` guards against this with `lider && lider.member`.
- Over-capacity team squares get a pulsing outline (2.4s, disabled under `prefers-reduced-motion`).

## CompareView

File: `src/Components/AppComponents/CompareView/CompareView.js`

Imported comparison sources are kept as a plain instance field on `ImportService` — session-only by design, matching the original vanilla-JS app. When roster data is replaced, `ImportService.removeOrphaned()` cleans up references to deleted members/teams.

Uses `roster.statusLabel(t, n)` for the final tally badge text in both `_renderMemberView` and `_renderTeamView`.

## SettingsView & ConfirmActionModal

File: `src/Components/AppComponents/SettingsView/SettingsView.js`
Service: `src/Components/Service/ConfirmActionModal/ConfirmActionModal.js`

All confirmation prompts use the custom `confirm:request` event instead of native `confirm()`/`prompt()`. See GOTCHAS.md §12 for the event API.

Usage:
```js
slice.events.emit('confirm:request', {
  title: '¿Guardar datos?',
  message: 'Se eliminarán 2 miembros que tienen 3 asignaciones activas.',
  confirmLabel: 'Guardar de todas formas',
  danger: true,
  onConfirm: () => { /* save */ },
  onCancel: () => { /* optional */ },
});
```

For single-value prompts (e.g. "Tu nombre" at export time), add `inputLabel`:
```js
slice.events.emit('confirm:request', {
  title: 'Tu nombre',
  inputLabel: 'Nombre',
  inputPlaceholder: 'Escribe tu nombre…',
  inputValue: '',
  confirmLabel: 'Exportar',
  onConfirm: (name) => { /* use trimmed name */ },
});
```

## DashboardView

File: `src/Components/AppComponents/DashboardView/DashboardView.js`

Builds `StatusBadge` components lazily (via `first/rest` pattern, see GOTCHAS.md §5). Reads `assignment` context on render. Watches `assignment` and `roster:changed` for reactive updates. Team cards show name, member count bar, status badge, and leader name.

**Guard**: `getEffectiveLider(t.id)` can return `{ member: null }` — the `.lider` textContent uses `lider && lider.member` check to avoid crash.
