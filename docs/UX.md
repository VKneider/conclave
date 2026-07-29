# UX & Visual Standards

**Source of truth:** `DESIGN.md` at the project root covers the full design philosophy. This file documents the interaction patterns, animation standards, and component-level UX decisions that agents need to follow when modifying views.

> **Post-redesign note.** Vocabulary is Tema/Opción now (this file predates the rename in spots — read "Categoría"→"Tema", "PorCategoriaView"→"PorTemaView", and ignore the sexo/edad tally which is gone, now generic `atributos`). Newer interaction patterns live in `docs/COMPONENT-PATTERNS.md` §UI patterns: **fullscreen overlays** (⛶ text editor/reader), **Enter-plus-tap-button add rows** (mobile), the shared **`Tabs`** segmented control (kind/mode tabs). All-Spanish UI copy is **neutral (tuteo)** — no voseo (`arma`/`elige`/`escribe`, not `armá`/`elegí`/`escribí`).

## Before reading this

Read `DESIGN.md` first — this file assumes you know the "Sticker Book" concept, typography (Fredoka display + Plus Jakarta Sans body), color tokens, and the hero-vs-dense element distinction.

---

## Interaction: lift & press

Every button-like element uses the same physical press interaction:

```css
.el { box-shadow: 3px 3px 0 var(--font-primary-color); transition: transform .08s, box-shadow .08s; }
.el:hover  { transform: translate(-1px, -1px); box-shadow: 4px 4px 0 var(--font-primary-color); }
.el:active { transform: translate(2px, 2px);  box-shadow: 1px 1px 0 var(--font-primary-color); }
```

Scale the offsets to match the element's shadow at rest (e.g., pills use 2px offset → hover: 3px, active: 0px).

## Animation standards

| Use case | Duration | Easing | Notes |
|---|---|---|---|
| Lift/press (hover→active) | 80ms | ease | Must feel instant. No delay on press. |
| Pill bounce (carousel assign) | 500ms | ease | `pillAssignPop` keyframes: scale 1 → 1.14 → 0.96 → 1. |
| Checkmark appear (carousel) | 500ms | ease | `checkBounce` keyframes: scale 0 → 1.4 → 0.8 → 1. Plays on `.pill-just-assigned::after`. |
| Summary slide-in (carousel) | 300ms | ease | `summarySlideIn`: translateY(-6px) + opacity 0 → translateY(0) + opacity 1. |
| Context watcher repaint | 0ms | — | Synchronous, no animation. Views repaint instantly on context change. |
| Drag ghost (PorCategoriaView) | real-time | — | Pointer follows finger. No easing — direct 1:1. |
| Pulsing outline (over-capacity) | 2.4s | ease-in-out | `.ps-square.is-over` in PorCategoriaView. Disabled under `prefers-reduced-motion`. |

### CSS animation patterns used

All animations are CSS `@keyframes` — no JS-driven animation (no `requestAnimationFrame`, no Web Animations API).

```css
@keyframes pillAssignPop {
  0%   { transform: scale(1); }
  30%  { transform: scale(1.14); }
  65%  { transform: scale(0.96); }
  100% { transform: scale(1); }
}

@keyframes checkBounce {
  0%   { opacity: 0; transform: translateY(-50%) scale(0); }
  45%  { opacity: 1; transform: translateY(-50%) scale(1.4); }
  70%  { transform: translateY(-50%) scale(0.8); }
  100% { opacity: 1; transform: translateY(-50%) scale(1); }
}

@keyframes summarySlideIn {
  from { opacity: 0; transform: translateY(-6px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

### reduced-motion

Every animation must be disabled under `prefers-reduced-motion`. The pulse on `.is-over` already does this via the `@media` query. For class-toggled animations (`.pill-just-assigned`, `.visible` on summary), you can use a global rule in `sliceStyles.css`:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

## Carousel assignment feedback (MisRespuestasView)

### Flow

1. User clicks a team pill → `_advancePending = true`, `update()` called.
2. `_paint()` renders the carousel with the current member (not yet advanced).
3. After binding, `_showAdvanceFeedback()` runs:
   - **Pill**: gets `.pill-just-assigned` — turns green (`var(--success-color)`), `pillAssignPop` bounce animation plays, `::after` checkmark appears with `checkBounce`.
   - **Summary**: `.assign-summary` text set to `"MemberName → TeamName"`, `.visible` class added → `summarySlideIn` plays.
   - **Duration**: 500ms timeout.
4. After 500ms: `_advancePending = false`, `carouselIndex++`, `update()` repaints the next member.

### Guard

- During the 500ms window, `_advancePending` is `true`. Pill click handlers check this at the top and return early. Arrow buttons and dot navigation are not blocked (user can still navigate manually).
- Keyboard arrows (← →) are NOT blocked — if the user presses right during the delay, the pending advance fires but the new paint will reflect the new index.

### CSS

```css
slice-misrespuestasview .pill-just-assigned {
  background: var(--success-color) !important; color: white !important;
  border-color: var(--success-color) !important; pointer-events: none;
  position: relative; padding-right: 38px !important;
  animation: pillAssignPop .5s ease;
}
slice-misrespuestasview .pill-just-assigned::after {
  content: '✓'; position: absolute; right: 14px; top: 50%;
  transform: translateY(-50%); font-size: 17px; font-weight: 700; line-height: 1;
  animation: checkBounce .5s ease;
}
slice-misrespuestasview .assign-summary {
  font-size: 14px; font-weight: 600; color: var(--success-color);
  margin-top: 8px; min-height: 22px; opacity: 0;
}
slice-misrespuestasview .assign-summary.visible {
  opacity: 1; animation: summarySlideIn .3s ease forwards;
}
```

## PlantillaBuilderView CRUD rows

Replaced the old CSV/JSON textarea + bulk diff-bar preview entirely — Categorías
and Opciones are now edited as individual `.pb-row` rows, each with its own
inline fields and an immediate per-action confirm (see DESIGN.md §CRUD forms
for the visual rule). No bulk "preview before save" step exists anymore:
editing a field commits on `change` (blur/Enter), and deleting a row goes
straight to a `confirm:request` naming the exact impact count (`"Se
limpiarán N respuestas que apuntaban a ella"`) — the same information the old
diff bar used to summarize in aggregate, just computed per single deletion
instead of per bulk save.

```css
slice-plantillabuilderview .pb-row {
  border: 1.5px solid var(--border-color); border-radius: 10px; padding: 10px 12px;
  transition: border-color .12s, box-shadow .12s;
}
slice-plantillabuilderview .pb-row:hover,
slice-plantillabuilderview .pb-row:focus-within {
  border-color: var(--font-primary-color);
  box-shadow: 2px 2px 0 var(--font-primary-color);
}
```

## Large text-comparison cards (TextCompareCards)

The `modo: 'texto_libre'` counterpart to `CompareCarousel` — see DESIGN.md
§Large comparison cards for the "why hero treatment here" rationale. One big
card per author for the active Categoría, `17px` line-height-1.6 body text,
`5px 5px 0` shadow. Navigation is by Categoría (prev/next), not by author —
all authors' proposals for the current question are visible at once, since
"ver todas las ideas de los demás" (see everyone's ideas at once) is the
literal point of this view, unlike the one-Opción-at-a-time carousel.

## Status badges

Badges are solid-filled pills (`.badge` in `sliceStyles.css`), not soft tints. The `--success-color` / `--warning-color` / `--danger-color` tokens fill the background directly. See DESIGN.md §Badges.

## Capacity alerts

- Over-capacity assignment is allowed (never blocked).
- The persistent signal: `status: 'over'` → danger-colored badge.
- PorCategoriaView: pulsing outline (2.4s) on `.is-over` squares.
- MisRespuestasView: warning-colored border on `.at-capacity` pills (not grayed out — must stay clickable).
- A one-time toast fires when a push goes over capacity ("«Team» quedó con exceso de personas"). The toast is an immediate heads-up; the badge is the source of truth.

## Drag and drop (PorCategoriaView)

See DESIGN.md §Drag and drop: DragDropService for the full API description. Key points:

- Only plain DOM elements should be registered as draggable, not the `<slice-opcionchip>` custom element wrapper (clone re-runs constructor, loses props).
- `OpcionChip.css` is deliberately NOT tag-scoped (`.opcion-chip` rules are under `slice-porcategoriaview`, not under `slice-opcionchip`) because the drag ghost is a bare clone appended to `<body>`.

## Iconography

Icons are **Lucide SVG icons** (not emoji) via `src/Components/Visual/Icon/icons.js`. The `IconProvider` wraps the map for any component that needs icons outside `<slice-icon>`. Every view that uses `<slice-icon>` specifies:

- `name`: a Lucide icon key (e.g. `"target"`, `"vote"`, `"trophy"`, `"pen"`, `"check"`, `"trash-2"`, `"share-2"`, `"users"`, `"volume-2"`, `"folder-open"`, `"hard-drive"`).
- `size` (default 16): pixel dimension.
- `color` (optional): CSS color value — used to give icons semantic meaning (e.g. target→`primary-color`, vote→`secondary-color`, trophy→`warning-color`, pen→`success-color`, trash→`danger-color`).

### Semantic color mapping

| Icon context | Color token | Examples |
|---|---|---|
| Modo Asignación (reparto) | `--primary-color` (tomato) | `target` in DashboardView modo cards |
| Modo Votación | `--secondary-color` (turquoise) | `vote` in modo tabs |
| Modo Ranking | `--warning-color` (amber) | `trophy` in modo tabs & cards |
| Modo Texto libre | `--success-color` (green) | `pen` in modo tabs & cards |
| Danger actions | `--danger-color` (red) | `trash-2` on delete buttons |
| Secondary actions | `--font-secondary-color` (muted) | `hard-drive` on backup, `eye-off` on unassign |

Use semantic colors consistently — never hardcode a raw hue for an icon in a new view.

Icon names are passed through `slice.build('Icon', { name, size, color })` or `<slice-icon name="..." size="..." color="...">`. The `Button` component also accepts `icon: { name, color }` in its props — colors propagate to the inner `<slice-icon>` automatically.

A few icons still get the old "sticker" treatment: rotated 4–6 degrees inside a bordered solid-color square (`.brand-mark`, `.help-ico`).

## Sound effects

`SoundService` (Core service) provides semantic audio feedback using the **Web Audio API** — zero external audio files. Built once from `Providers.init()` and recovered anywhere as `slice.getComponent('SoundService')`.

### Architecture

- **Recipes**: each sound cue is a set of oscillator steps (`{ f, d, type?, g?, at?, to? }`) defined in `SoundService.RECIPES`. Steps are played on `OscillatorNode` with a `GainNode` envelope (attack 6ms, instant release). No shared state — each `play()` call creates fresh nodes.
- **Rate limiting**: per-cue `MIN_INTERVAL` (e.g. `ui.tap` 45ms, `ui.nav` 80ms, default 120ms) prevents overlapping the same cue. A global voice cap (`MAX_VOICES = 8`) prevents stacking too many concurrent sounds.
- **Autoplay policy**: `AudioContext` is created lazily in `unlock()`, called from the first `pointerdown` gesture via `attachSFX`. Until unlocked, `play()` silently returns `false`.
- **Mute**: delegated to `SettingsService.soundEnabled` (persisted in `settings` context). Toggle available in `UserMenu` via `Switch` component with `volume-2` icon.

### Available cues

| Cue | Trigger | Sound |
|---|---|---|
| `ui.tap` | Any `<button>` or `role="button"` (auto-detected) | Short triangle 520Hz, 35ms |
| `ui.toggle` | Checkbox / Switch clicks | Two-tone 440→660Hz, 50ms |
| `ui.nav` | `<a href="/...">` link clicks (auto-detected) | Low sine 380Hz, 60ms |
| `modal.open` | Modal opening | Slide-up sine 300→520Hz, 120ms |
| `modal.close` | Modal closing | Slide-down sine 520→280Hz, 110ms |
| `toast.info` | Info toast notification | Sine 660Hz, 100ms |
| `toast.success` | Success toast | C5→E5→G5 arpeggio (triangle), 160ms tail |
| `toast.warning` | Warning toast | Square 494Hz double-pulse, 130ms |
| `toast.error` | Error toast | Descending triangle 320→200Hz, 220ms |
| `ui.blocked` | Blocked/invalid action | Low square 160Hz, 90ms |
| `ui.celebrate` | Download/share/copy success | C5→E5→G5→C6 arpeggio (triangle), 320ms tail |

### `attachSFX` bridge

Called once from `Providers.init()`:

```js
slice.getComponent('SoundService').attachSFX();
```

Installs a `pointerdown` listener on `document` that auto-detects:
1. Elements with `data-sfx` attribute → plays the cue name in the attribute.
2. `<button>` / `role="button"` elements → plays `ui.tap`.
3. `<a href="/...">` links → plays `ui.nav`.

Manual trigger: `slice.getComponent('SoundService').play('ui.celebrate')`.

`ui.celebrate` is wired to the share/download actions in `SharePlantillaModal`, `ExportRespuestasModal`, and `ShareConsensoModal` — plays after the action completes, not on click.

### `prefers-reduced-motion`

Sound has no explicit `prefers-reduced-motion` query. The browser's autoplay policy already gates sound from playing before user interaction. The mute toggle (`soundEnabled: false`) silences all cues.
