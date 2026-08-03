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
- **"📤 Compartir plantilla"**: opens `SharePlantillaModal` with three options: download `.plantilla` file (via `ExportService.downloadPlantilla()` with `autor` + `email`), copy compressed link (via `PlantillaService.copyShareLink()`), or send email (`mailto:` with the link).
- **"📂 Importar Plantilla"**: bulk-replaces Categorías/Opciones from a JSON file — same `PlantillaService.prepareImport()` validation (shape + `isSafeId`) and confirm-of-impact dialog as `CompareView`'s Plantilla import (see below), offered here too since starting a new Plantilla from someone else's shared file is a natural thing to do right where you'd otherwise build one from scratch.
- **"🔄 Restaurar ejemplo"**: resets to seed data (7 Categorías, 15 Opciones) with a confirmation dialog, via `PlantillaService.resetToSeed()`.

## RespuestasView — tab shell

File: `src/Components/AppComponents/RespuestasView/RespuestasView.js`

Composes five sub-views — `MisRespuestasView` (carousel), `PorTemaView` (drag-and-drop board), `RespuestasVotacionView` (votación pick-one), `RespuestasRankingView` (ranking order), `RespuestasTextoView` (free-text answers) — all built unconditionally, behind a **two-level tab hierarchy** (same shape as `CompareView`'s kind/mode tabs, see its own FEATURES.md section). PRIMARY kind tabs "🎯 Asignación" / "🗳️ Votación" / "🏆 Ranking" / "📝 Texto libre" (only shown when the Plantilla has more than one available kind), and SECONDARY mode tabs "Carrusel" / "Por tema" nested inside Asignación (peer alternatives for the same assignment task). A "📤 Compartir respuestas" button (`slice.build('Button', ...)` → `ExportRespuestasModal`) sits in the header alongside the title.

Next-section indicator: when the current kind tab is fully answered, a success-bordered banner appears with a button to jump to the next unfinished kind tab. When all sections are complete, shows "¡Todas las secciones están completas! 🎉" with a disabled button. Uses the `Button` component (with `onClick` set dynamically and `.disabled` toggled via `$button.disabled` — see GOTCHAS §30 about clearing `onClick`).

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

The modo `texto_libre` counterpart to the carousel/board. Uses `CarouselView`
(see below) to display one `TextoCard` per Tema with three view modes:

- **Una por una** (`'single'` — default): one editor at a time with ‹ › arrows.
- **Dos columnas** (`'columns'`): two editors side by side with arrows.
- **Ver todas** (`'grid'`): all editors in a responsive grid (the old behavior).

Each `TextoCard` has an `EnhancedEditor` (Quill) and saves on blur via
`RespuestasService.setTexto(temaId, texto)`. A mode toggle (▦ ▬ ▬▬) sits in the
header, hidden when there's only one Tema. `_syncValues()` reflects external
changes (e.g. a session import) without stealing focus from the active editor.
A fullscreen overlay (`rt-fs`) provides a distraction-free editor for any card,
opened via the "⛶" expand button.

## CarouselView — reusable item carousel

File: `src/Components/Visual/CarouselView/CarouselView.js`

A generic Slice component that wraps a list of pre-built DOM/Slice nodes and
manages navigation and visibility. Used by `RespuestasTextoView` for its
text-editor layout modes; designed to be reused by any view that needs to
display items one-by-one or in a grid (see `COMPONENT-PATTERNS.md` §CarouselView
for the full API and integration guide).

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

### Respuesta final: adoptado simple vs. síntesis

A `texto_libre` Tema can end with **either** of two kinds of final answer (they coexist — see DATA.md §`decisionFinal.texto` entries):

1. **Adoptado simple** — "Marcar como elegida" on a card adopts that person's exact proposal (`{ autor, texto }`, `esSintesis: false`).
2. **Síntesis** — the "Redactar respuesta final" button (top-right of each Tema section) opens the `SynthTextoModal` component (see its own section below) with a list of every source's proposal for that Tema plus an `EnhancedEditor`. The leader clicks "Insertar" on one or more sources to compose a combined answer (the button flips to disabled "Insertada" per source), edits freely, and saves via "Guardar como respuesta final" → `setSintesisTexto(temaId, html, fuentes)`.

   The synthesized entry is stored as `{ autor: 'Síntesis del equipo', texto, esSintesis: true, fuentes: [...] }` in the same `decisionFinal.texto[temaId]`. Re-opening the modal later (button label becomes "Editar respuesta final") pre-fills the editor with the saved HTML and re-marks the already-inserted sources; "Quitar" on the banner clears the final (`clearResolutionTexto`). The banner shows "**Final**: Síntesis del equipo · de A, B" with the `--synth` variant class (`.tcc-final-banner--synth`).

### SynthTextoModal — "Redactar respuesta final"

File: `src/Components/Visual/SynthTextoModal/SynthTextoModal.js`

The síntesis modal extracted into its own Visual component (pattern `CompareNotesModal`: lazy-built once via `_ensureModal` + `_modalPromise`, mounted on `document.body`). Pure UI — it has **no domain knowledge**: `TextCompareCards` builds it once in `init()` and opens it with `show({ temaId, temaNombre, sources, final, onSave, onClear })`. It renders the sources list (HTML plano re-renderizado al abrir), the `EnhancedEditor` (real Slice component, mounted in a body slot — never inside `innerHTML`), and the Quitar/Cerrar/Guardar footer. On save/clear it fires the callbacks, and `TextCompareCards` applies them to `ConsensoService.setSintesisTexto` / `clearResolutionTexto` and re-renders.

### Where the síntesis flows through

- **CompareView "Exportar lista final"** (`ConsensoService.exportFinal`) writes the whole entry (not a flattened string) into the exported JSON's `respuestas.texto[temaId]`.
- **ResumenFinalView** renders the synthesized answer via `descripcionTextoFinal(entry)` — the resumen card, the "Descargar HTML"/"Imprimir" exports (`_buildTexto`), and the "backup" JSON export all carry `esSintesis` + `fuentes` unchanged.
- **Share link** (`#consenso=`) — `importState` → `_normalizeRespuestas` keeps the entry whole; unknown keys pass through `CompressionService.unpackFromURI`, so a synthesized final survives the short-key hash roundtrip.

E2E coverage lives in `CompareView.spec.js` (13.4.4–13.4.7: crear/exportar/editar/quitar) and `ResumenFinalView.spec.js` (14.1.8–14.1.10, 14.2.2: HTML, backup JSON, resumen render, import por hash).

## Export/Share Modals

### ExportRespuestasModal

File: `src/Components/Providers/ExportRespuestasModal/ExportRespuestasModal.js`

A lazy-built modal (Provider, singleton) with three sharing options for the current user's respuestas:

1. **⬇ Descargar respuestas** — calls `RespuestasService.exportMineWithPrompt()` (prompts for name if missing). The downloaded file has extension `.respuestas`.
2. **🔗 Copiar enlace** — calls `RespuestasService.copyShareLink()` (generates compressed URL with `CompressionService.packForURI` + `compressToURI`, copies to clipboard).
3. **✉️ Enviar por correo** — calls `RespuestasService.sendShareLinkEmail()` (opens `mailto:` with the link, `to` left empty for the user to fill).

Opened from `UserMenu`'s "📤 Compartir respuestas" button, `RespuestasView`'s header button, and `DashboardView`'s header button — all three open the same modal instance.

### SharePlantillaModal

File: `src/Components/Providers/SharePlantillaModal/SharePlantillaModal.js`

Same pattern for Plantilla sharing:

1. **⬇ Descargar plantilla** — builds the Plantilla envelope (`{ nombre, autor, email, atributos, temas, opciones }`) and calls `ExportService.downloadPlantilla()`. The downloaded file has extension `.plantilla`.
2. **🔗 Copiar enlace** — calls `PlantillaService.copyShareLink()` (generates compressed URL with `packForURI`, copies to clipboard). The packed data includes `autor` + `email` from `SettingsService` so the recipient knows who created it.
3. **✉️ Enviar por correo** — opens `mailto:` with the link and the sharer's name, `to` left empty.

Opened from `PlantillaBuilderView`'s "📤 Compartir plantilla" button.

### Creator identity in shared links

Both Plantilla share links and Plantilla JSON downloads carry the creator's identity (`autor` = `SettingsService.autor`, `email` = `SettingsService.email`). When someone opens a shared Plantilla link, `AppShell._tryImportPlantilla()` shows "Creada por Nombre (email@...)" in the import confirmation dialog. Same for respuestas share links — the creator's name and email appear in the import prompt.

## UserMenu & ConfirmActionModal

File: `src/Components/AppComponents/UserMenu/UserMenu.js`
Service: `src/Components/Service/ConfirmActionModal/ConfirmActionModal.js`

Built once from `TopBar` (always mounted, reachable from any route) — a popover triggered by an avatar button, replacing both the old standalone `SettingsView` route and `AppShell`'s footer. Contents: Tu nombre (autor), tu correo electrónico (`Input type="email"`), tema (`ThemeSwitcher`, `variant: 'menu-item'`), and every "mis Respuestas" action — Compartir (opens `ExportRespuestasModal`), Importar (reemplaza `respuestas` wholesale via `RespuestasService.importMine()`, for picking up where you left off on another device), and Reiniciar. The email field is persisted to `SettingsService.email` and synced via `slice.context.watch('settings')` — doesn't overwrite while the user is actively typing (`document.activeElement` check). Doesn't edit the Plantilla at all (that's `PlantillaBuilderView`'s job) — removing the old inline-edit path in the retired `SettingsView` also removed a pre-existing bug where those edits mutated Categoría objects directly without persisting until something else saved.

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

The header also contains a "📤 Compartir respuestas" button (`slice.build('Button', ...)`) that opens `ExportRespuestasModal` — same entry point as UserMenu and RespuestasView. Built in `_buildShell()` and rebuilt on shell changes (via `_rebuild()` → `destroyByContainer` cleans it up).
