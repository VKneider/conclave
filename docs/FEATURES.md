# Feature documentation

> **Post-Fase-3 additions** (the sections further down predate these in some
> naming; Categoría→Tema, seleccion→reparto throughout):
>
> - **Four modos per Tema** (`docs/DATA.md`): `reparto` (pool→temas, the old
>   assignment flow), `votacion` (pick one owned Opción), `ranking` (order owned
>   Opciones with ▲▼; compared by Borda aggregate), `texto_libre`. Mixable.
>   Votación/ranking share the inline owned-Opciones editor in `TemaRow` and the
>   kind-tab pattern in Responder/Comparar.
> - **Votación end-to-end.** Builder: choosing modo "Votación" on a `TemaRow`
>   reveals an inline editor for that Tema's own Opciones (add/list/remove,
>   `temaId`-owned). Respond: `RespuestasVotacionView` — one card per votación
>   Tema, its Opciones as radio-pills, one pick per Tema (`RespuestasService.
>   setVoto`). Compare: CompareView's "Votación" kind-tab shows a per-Tema vote
>   tally (bars + counts), suggests the majority, and lets the organizer pin a
>   final decision (★) via `ConsensoService.setResolutionVoto`.
> - **Atributos custom (Fase 3).** The Plantilla defines `atributos`
>   (`{key,label,type,opciones?}`); `OpcionRow` renders one field per attribute
>   dynamically; values live in `opcion.meta[key]`. sexo/edad are just the seed
>   defaults now. Shown generically via `PlantillaService.getOpcionAtributos`.
>   The old sexoEnabled/edadEnabled toggles + Hombres/Mujeres cards + M/F counts
>   are gone.
> - **Bulk ops in the builder.** Each Tema/Opción row has a select checkbox;
>   a "Borrar seleccionados (N)" bar + a per-section "🗑 Borrar todo" (via
>   `PlantillaService.removeTemas/removeOpciones/clearTemas/clearOpciones`).
> - **The global Opciones list is now "Pool de Asignación"** — shown only when
>   the Plantilla has ≥1 reparto Tema (`getOpcionesPool`); votación/ranking
>   temas own their Opciones inline.
> - **Preset gallery (Fase 5).** `src/data/presets.js` defines 6 starter
>   Plantillas (asignación, votación, Sí/No, ideas, ranking, mixta); the builder
>   shows them in a `<details>` gallery. Picking one loads it via
>   `prepareImport` + `loadFromData` (confirm-gated when the current Plantilla
>   isn't empty).
> - **Tabs** (`Visual/Tabs`, from the registry, reskinned): the shared segmented
>   control used by RespuestasView + CompareView's kind/mode tab rows —
>   `variant: 'primary'|'secondary'`. See GOTCHAS §26.

## Landing page stats

File: `src/Components/AppComponents/LandingView/LandingView.js`

The landing page shows:
- **Live stats row**: Opción count, Categoría count, respondidas count (computed from `PlantillaService` + `RespuestasService` on render).
- **Four quick-action cards**: Responder (`/mis-respuestas`), Comparar (`/comparar`), Dashboard (`/dashboard`), Plantilla (`/plantilla`).
- **"Cómo funciona"**: a static 3-step flow (Plantilla → Respuestas → Comparar) explaining the app's process once, generically.
- **"Para qué podés usarla"**: three use-case cards (asignación de equipos, ponentes/exposiciones, generación de ideas) — concrete examples of that same process, matching the Sticker Book hero-card treatment (bold outline, accent top-bar).

Watches `respuestas` and `plantilla` contexts directly — no custom event needed, unlike the old `roster:changed` era (see GOTCHAS.md §11).

## PlantillaBuilderView — CRUD for Categorías/Opciones

File: `src/Components/AppComponents/PlantillaBuilderView/PlantillaBuilderView.js`

Replaces the old CSV/JSON textarea generator (`HelpView`) entirely — this is the only place Categorías and Opciones are created/edited/deleted. No bulk text parsing exists anymore.

### Detalles
Plantilla-level settings that used to live in the retired `SettingsView`: just "Nombre de la Plantilla" now (`PlantillaService.getNombre()`/`setNombre()` — shown in `TopBar`'s subtitle and the landing hero). The "responsables" toggle moved into the Categorías section below (it only applies to modo Selección); the sexo/edad toggles live in Opciones.

### Categorías list
- Rows are `CategoriaRow` — real build-once Visual components, reused by stable `sliceId` (see GOTCHAS.md's list-rendering rules), not re-templated HTML strings. Fields: nombre, `modo` select (`seleccion` / `texto_libre`), and — only when `modo === 'seleccion'` — mín/máx/capacidad fields, an optional "responsable fijo" field, and a "participable" checkbox. Switching `modo` shows/hides those fields without rebuilding the row.
- A non-restrictive Todas/Selección/Texto libre filter groups the list by `modo` and sets a smart default for newly-added Categorías, without ever hiding what can be created — "Todas" always shows everything.
- "👑 Habilitar responsables de categoría" toggle (`SettingsService.setLideresEnabled()`) lives here, not in Detalles — it's meaningless for modo Texto libre Categorías.
- Editing any field calls `PlantillaService.updateCategoria(id, changes)` on `change` (blur/Enter) — never a raw object replace, always a patch.
- Adding is inline: a registry `Input` above the list (`"Nueva categoría… — escribí y presioná Enter"`) calls `PlantillaService.addCategoria({nombre})` on `Enter`, then clears and refocuses itself — several items can be typed back-to-back without a dialog per item.
- Deleting still goes through `confirm:request` (destructive, so it stays a dialog) — computes the impact first (`RespuestasService`'s current `seleccion`/`texto` entries pointing at this Categoría) and names the exact count before calling `PlantillaService.removeCategoria()`.

### Cuándo mezclar modos (Selección + Texto libre) en una misma Plantilla
The data model deliberately allows a single Plantilla to have both modo Selección and modo Texto libre Categorías at once — but that's only a good fit when **the same group of respondents answers both parts together, in one sitting** (e.g. "elegí a qué equipo te querés unir" + "¿alguna sugerencia para el cierre?", submitted as one Respuesta and compared together). It's a poor fit when the two parts serve genuinely different audiences or different organizational moments — e.g. assigning a small pool of ponentes to charlas (a scheduling decision made by a few organizers) mixed with collecting open feedback from the whole group (a broad survey) don't belong in the same Plantilla even though the data model permits it; use two separate Plantillas instead. The UI never enforces this — it's a judgment call for whoever designs the Plantilla, same as choosing good Categoría names.

### Opciones list
- Rows are `OpcionRow` — same real-component pattern as `CategoriaRow`. Fields: nombre, sexo, edad, rol fijo, and a "fijo" checkbox (excludes it from the general assignable pool — mirrors a locked/leader member). The remove button is hidden for `fijo` Opciones, same protection the old inline editor had.
- "Habilitar sexo" / "Habilitar edad" toggles (`SettingsService.setSexoEnabled()`/`setEdadEnabled()`, both default `true`) hide those two fields from `OpcionRow` — and from every downstream display (`DashboardView`'s Hombres/Mujeres cards and team-member modal, `PorCategoriaView`'s M/F counts and `OpcionChip`'s color dot, `MisRespuestasView`/`CompareCarousel`'s tags, `CompareView`'s comparison CSV export) — when they don't apply to the current Plantilla (e.g. assigning ponentes instead of people to teams). Turning a toggle off never deletes the underlying `meta.sexo`/`meta.edad` data — it reappears if re-enabled.
- Same inline "escribir + Enter" add row and patch-on-change / confirm-with-impact-count delete pattern as Categorías.

### Export / import / reset
- **"⬇ Exportar Plantilla"**: downloads the current Categorías + Opciones as the Plantilla envelope (see DATA.md) via `ExportService.downloadPlantilla()`.
- **"📂 Importar Plantilla"**: bulk-replaces Categorías/Opciones from a JSON file — same `PlantillaService.prepareImport()` validation (shape + `isSafeId`) and confirm-of-impact dialog as `CompareView`'s Plantilla import (see below), offered here too since starting a new Plantilla from someone else's shared file is a natural thing to do right where you'd otherwise build one from scratch.
- **"🔄 Restaurar ejemplo"**: resets to seed data (7 Categorías, 15 Opciones) with a confirmation dialog, via `PlantillaService.resetToSeed()`.

## RespuestasView — tab shell

File: `src/Components/AppComponents/RespuestasView/RespuestasView.js`

Composes three sub-views — `MisRespuestasView` (carousel), `PorCategoriaView` (drag-and-drop board), `RespuestasTextoView` (free-text answers) — all built unconditionally, behind a **two-level tab hierarchy** (same shape as `CompareView`'s kind/mode tabs, see its own FEATURES.md section): PRIMARY tabs "🎯 Selección" / "📝 Texto libre" (only shown when the Plantilla has both `PlantillaService.getOpciones().length > 0` and `getCategoriasTexto().length > 0` — genuinely different tasks, not alternative views of the same one), and SECONDARY tabs "Carrusel" / "Por categoría" nested inside Selección (real peer alternatives for the same assignment task). A flat 3-tab row (the previous shape) implied all three were interchangeable, which was misleading — Texto libre isn't reachable from the other two and doesn't answer the same question. Watches `plantilla` to keep the tabs/empty-state in sync if Categorías/Opciones change while this view is mounted. If neither Opciones nor texto_libre Categorías exist (fresh/empty Plantilla), `.av-empty` replaces the tabs+content entirely with a message and a "Ir a Plantilla" button, instead of showing empty tabs over blank content.

## Carousel assignment feedback (MisRespuestasView)

File: `src/Components/AppComponents/MisRespuestasView/MisRespuestasView.js`
CSS: `src/Components/AppComponents/MisRespuestasView/MisRespuestasView.css`

### Interaction flow
1. User clicks a Categoría pill.
2. `RespuestasService.assignOpcion(opcionId, categoriaId)` is called (always succeeds).
3. `_pendingAdvance` is set to the selected categoriaId, `update()` called.
4. `_paint()` renders the carousel with the current Opción (not yet advanced).
5. `_showAdvanceFeedback()` runs after binding:
   - The clicked pill gets `.pill-just-assigned`: green background, `pillAssignPop` bounce animation, `::after` checkmark appears with `checkBounce`.
   - `.assign-summary` text shows `"OpciónName → CategoríaName"` with `summarySlideIn` animation.
   - All pills are effectively blocked during the 500ms window (`_advancePending` check).
6. After 500ms: advance `carouselIndex++`, repaint the next Opción.

### Behavior notes
- **Over-capacity**: If the assignment pushes a Categoría over max, `RespuestasService.assignOpcion()` shows a warning toast ("«Categoría» quedó con exceso de personas") — but the feedback still shows as a green badge. The over-capacity warning is separate from the assignment confirmation.
- **Keyboard arrows**: Not blocked during the 500ms delay. If user presses → during feedback, the pending advance still fires but paint reflects the new index.
- **Unassign (✕ Sin asignar)**: No feedback badge, no delay, immediate repaint.

## PorCategoriaView drag-and-drop

File: `src/Components/AppComponents/PorCategoriaView/PorCategoriaView.js`

Uses official `DragDropService` for pointer-based drag-and-drop. Key design decisions:
- Dropzones (sidebar + Categoría squares) are built once in `_buildShell()` and never rebuilt — `makeDroppable()` called once per zone.
- Each `OpcionChip` registers itself as draggable inside its own `_registerDraggable()`.
- Repositioning an Opción on drop is `container.appendChild(existingChipNode)` (no destroy/rebuild).
- `getEffectiveLider()` can return `{ member: null }` when the UI-set leader points to a deleted Opción; `_layout()` guards against this with `lider && lider.member`.
- Over-capacity Categoría squares get a pulsing outline (2.4s, disabled under `prefers-reduced-motion`).

## RespuestasTextoView

File: `src/Components/AppComponents/RespuestasTextoView/RespuestasTextoView.js`

The modo `texto_libre` counterpart to the carousel/board — one card per Categoría, each with a single textarea. Saves on `change` (blur), calling `RespuestasService.setTexto(categoriaId, texto)`. `_syncValues()` reflects external changes (e.g. a session import) into the textareas without stealing focus from whichever one the user is actively typing in.

## CompareView

File: `src/Components/AppComponents/CompareView/CompareView.js`

Imported comparison sources live in the `respuestasImportadas` context (`RespuestasImportService`) — migrated from a plain instance field specifically because several sibling components (`CompareCarousel`, `FinalTally`, `TextCompareCards`) read and react to the same list (see GOTCHAS.md §11 and ARCHITECTURE.md). When Plantilla data changes, `RespuestasImportService.removeOrphaned()` cleans up stale references.

### Two import controls
- **Respuestas** (main `ImportDrop`, always visible): adds one or more people's exported Respuestas as comparison sources.
- **Plantilla** (collapsible `<details>` "Importar una Plantilla compartida"): a single-file bulk replace of Categorías/Opciones via `PlantillaService.prepareImport()` (shape + `isSafeId` validation, shared with `PlantillaBuilderView`'s own Plantilla import), gated behind a confirm dialog that names how many current Respuestas would be orphaned by the swap.

### Selección vs. Texto libre
When the active Plantilla mixes both modos, a "Selección"/"Texto libre" kind-tab pair appears above the existing table/carousel/team-view mode tabs. Selección keeps every pre-existing behavior (table/carousel/team views, per-Opción "Final" decision column, CSV export of the comparison, `FinalTally`). Texto libre delegates entirely to `TextCompareCards` — see its own section below. If the Plantilla only has one modo, the kind-tabs stay hidden and the view behaves as if the other modo doesn't exist.

Uses `roster.statusLabel(t, n)` for the final tally badge text in `_renderMemberView`/`_renderTeamView` (both still Selección-only).

## TextCompareCards — large-card comparison for texto_libre

File: `src/Components/DataDisplay/TextCompareCards/TextCompareCards.js`

The spec's "tercera vista": for a comparison to be useful for open-ended proposals (not just team assignment), everyone's free-text answer for one Categoría at a time is shown as a large, readable card — not a table cell. Navigation is by **Categoría** (prev/next, or none if there's only one), and within a Categoría every source's proposal renders as its own big card side by side, so "ver todas las ideas de los demás" (see everyone's ideas at once) actually holds. Each card has a "Marcar como elegida" button; the chosen one gets a visible "Elegida" tag and a success-colored border, driven by `ConsensoService.setResolutionTexto()`/`finalTextoFor()`.

## UserMenu & ConfirmActionModal

File: `src/Components/AppComponents/UserMenu/UserMenu.js`
Service: `src/Components/Service/ConfirmActionModal/ConfirmActionModal.js`

Built once from `TopBar` (always mounted, reachable from any route) — a popover triggered by an avatar button, replacing both the old standalone `SettingsView` route and `AppShell`'s footer. Contents: Tu nombre (autor), tema (`ThemeSwitcher`, `variant: 'menu-item'`), and every "mis Respuestas" action — Exportar, Importar (reemplaza `respuestas` wholesale via `RespuestasService.importMine()`, for picking up where you left off on another device), and Reiniciar. Doesn't edit the Plantilla at all (that's `PlantillaBuilderView`'s job) — removing the old inline-edit path in the retired `SettingsView` also removed a pre-existing bug where those edits mutated Categoría objects directly without persisting until something else saved.

All confirmation prompts use the custom `confirm:request` event instead of native `confirm()`/`prompt()`. See GOTCHAS.md §12 for the event API.

Usage:
```js
slice.events.emit('confirm:request', {
  title: '¿Reemplazar tus respuestas actuales?',
  message: 'Se sobrescribirán tus respuestas en este dispositivo.',
  confirmLabel: 'Importar',
  danger: true,
  onConfirm: () => { /* import */ },
});
```

For single-value prompts, add `inputLabel` — e.g. `UserMenu._exportMine()`'s fallback when `settings.autor` is empty:
```js
slice.events.emit('confirm:request', {
  title: '¿Cuál es tu nombre?',
  inputLabel: 'Tu nombre',
  inputPlaceholder: '¿Quién asigna?',
  confirmLabel: 'Exportar',
  onConfirm: (name) => { /* use trimmed name */ },
});
```

Adding a Categoría/Opción no longer uses this pattern — `PlantillaBuilderView`'s inline "escribir + Enter" row (see its own section above) replaced the one-at-a-time confirm-dialog prompt for that case, since it was slow for bulk entry. `confirm:request` is still used there for destructive actions (deleting a row) and for `PlantillaBuilderView`/`CompareView`'s "replace the whole Plantilla" import confirm.

## DashboardView

File: `src/Components/AppComponents/DashboardView/DashboardView.js`

Builds `StatusBadge` components lazily (via `first/rest` pattern, see GOTCHAS.md §5). Reads `respuestas` context on render. Watches `respuestas`, `settings`, and `plantilla` for reactive updates. Categoría cards (modo `seleccion`) show name, count bar, status badge, and leader name — same as before, just Categoría-generic now. A "Texto libre" section (only rendered when the Plantilla has ≥1 modo `texto_libre` Categoría) lists each one with a "Respondida"/"Pendiente" badge reflecting whether the current user has answered it yet.

A header line shows the Plantilla's actual name (`PlantillaService.getNombre()`) plus a live composition summary ("🎯 N de selección · 📝 M de texto libre") instead of a fixed "tipo" field — there is no single type to show since a Plantilla can freely mix modos (see FEATURES.md's "Cuándo mezclar modos" note above). The stat-grid's first card is a completion doughnut (`ChartService`, built once in `_buildShell()`, updated in place on every `_refresh()` — never rebuilt) showing Asignadas vs. Sin asignar, with the percentage overlaid as plain text since Chart.js has no built-in center-label support. The "Hombres"/"Mujeres" stat cards (and the team-member modal's gender dot) hide via `SettingsService.isSexoEnabled()`.

**Guard**: `getEffectiveLider(t.id)` can return `{ member: null }` — the `.lider` textContent uses `lider && lider.member` check to avoid crash.
