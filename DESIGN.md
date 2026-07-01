# Conclave — Design Philosophy

This is the reference for Conclave's visual language. Read it before touching
any CSS. When in doubt, match what's already here rather than inventing a new
pattern.

## Concept: "Sticker Book"

Conclave organizes people into teams for events — it should feel warm, hand-made,
a little playful. Think of a sticker book or a name-badge table at a fun
community event, not a corporate SaaS dashboard. The two guiding rules:

1. **No gradients, anywhere.** Flat, confident color only. Gradients (especially
   soft purple-to-blue ones) are the single most recognizable "AI generated"
   tell — if you're about to write `linear-gradient` or `radial-gradient` in
   this codebase, stop and use a solid color instead.
2. **Bold ink outlines + hard offset shadows, used *selectively*.** The
   signature look is a chunky border in ink color plus a flat, non-blurred
   drop shadow (`4px 4px 0 var(--font-primary-color)`, not `0 8px 24px
   rgba(...)`). This reads as a paper cutout / sticker, not a glass card. But
   see "Hero vs. dense elements" below — this treatment does **not** belong on
   every element.

## Typography

- **Display** (`var(--font-display)`, Fredoka): all headings (`h1`–`h4`,
  `.view-title`), stat numbers, person names. Rounded and friendly — this is
  the personality font.
- **Body** (`var(--font-body)`, Plus Jakarta Sans): everything else — body
  text, buttons, inputs, labels.
- Both are loaded once via Google Fonts in `src/Styles/sliceStyles.css`.
- Never fall back to Inter, Roboto, Arial, or system-ui as a *primary* choice
  — they're the generic-AI default and actively work against this concept.

## Color

Tokens live in `src/Themes/Light.css` and `src/Themes/Dark.css`, following the
framework's `--xxx-color` / `--xxx-background-color` nomenclature (not
redefined per-component). Both themes must be updated together — never add a
color that only exists in one.

| Token | Role |
|---|---|
| `--primary-color` | Tomato coral. Primary actions, active tab, primary buttons. |
| `--secondary-color` | Turquoise. The coral's foil — secondary accents, one of the four stat-card top bars. |
| `--success-color` / `--warning-color` / `--danger-color` | Status semantics: `ok`→success, `under` (below minimum, a normal mid-assignment state)→warning, `over` (past maximum — allowed, needs resolving)→**danger**, the most urgent of the three. See "Capacity alerts" below for why `over` outranks `under`. Also used as **solid fills** for badges (see below), not tints. |
| `--font-primary-color` / `--font-secondary-color` | Body text / muted text. In light mode this is near-black ink; **in dark mode it's a pale off-white** — remember this before using it as a border color (see "Hero vs. dense elements"). |
| `--panel-background-color` / `--panel-alt-background-color` | Card / elevated surface backgrounds. |
| `--border-color` | Soft, low-contrast hairline — for dense/repeated UI, not for "hero" outlines. |
| `--male-color` / `--female-color` | Fixed semantic colors for the member gender tally in "Por equipo" — not part of the brand palette, kept distinct on purpose. |
| `--card-border-radius` | `18px`. The chunky, playful corner radius used on cards. |
| `--box-shadow-primary` | The hard offset "sticker" shadow. |

Per-team colors (the distinct hue assigned to each team/role) are generated
separately in `RosterService.colorFor()` from a fixed 12-color palette — that
palette is orthogonal to the theme tokens above and doesn't need to match them.

## Shape & borders — hero vs. dense elements

This is the rule that's easiest to get wrong: **the bold ink outline is a
hero treatment, not a default.** Apply `border: 2–2.5px solid
var(--font-primary-color)` (or the equivalent hard shadow) to things that
appear a **handful of times per screen** — cards, buttons, badges, the
sidebar/team-square containers. Do **not** apply it to things that repeat
**dozens of times** (member chips, table cells, list rows) — 85 chips each
with a bold ink border reads as noise, not personality, and in dark mode
`--font-primary-color` is a *pale* color, so a "bold ink border" on every
small repeated element shows up as a wall of white flecks rather than a subtle
accent.

The resolved pattern (see `MemberChip.css`):
- **Resting state** of a small/repeated element: thin `var(--border-color)`.
- **Interactive state** (hover, active, dragging) — that's where the bold ink
  border / hard shadow shows up, as feedback rather than baseline decoration.

Large, few-in-number containers (the "Sin asignar" sidebar, a big empty-state
panel) should generally use `var(--border-color)`, not
`var(--font-primary-color)`, for the same reason — reserve the loud ink border
for things that are meant to visually anchor the page (team squares, stat
cards, the person card in "Mi asignación").

## Shadows

Never use a soft blurred `box-shadow` (`0 8px 24px rgba(...)`) on the sticker
elements — it reads as a generic SaaS "floating card" glow. Use a hard,
non-blurred offset instead: `Npx Npx 0 <color>`. This is what
`--box-shadow-primary` is defined as, in both themes.

## Motion: the "press" interaction

Buttons and pills don't just darken on hover — they **lift and press**, since
that's what makes a flat-shadow design feel physical:

```css
.btn { box-shadow: 3px 3px 0 var(--font-primary-color); transition: transform .08s, box-shadow .08s; }
.btn:hover  { transform: translate(-1px, -1px); box-shadow: 4px 4px 0 var(--font-primary-color); }
.btn:active { transform: translate(2px, 2px);  box-shadow: 1px 1px 0 var(--font-primary-color); }
```

Reuse this exact pattern (scaled to the element's shadow offset) for any new
button-like element instead of inventing a different hover treatment.

## Badges

Status badges (`.badge` in `sliceStyles.css`, reused by `StatusBadge` and
`CompareView`'s table) are **solid-filled pills** — `background:
var(--success-color); color: var(--success-contrast)` — not soft tinted
backgrounds. This is a deliberate "candy label" look; don't revert to
`color-mix(... 14%, transparent)` tints for badges specifically (tints are
still fine for things like drag-over/hover backgrounds elsewhere).

## Capacity alerts: over-assignment is allowed on purpose

Product rule: organizers are allowed to assign a member to a team that's
already at its maximum. It's easier to move or remove the excess person
afterward than to leave someone unassigned while hunting for room elsewhere.
`AssignmentService.assign()` never blocks — there is no "team is full,
rejected" path anymore.

What replaces the block is a **persistent, always-visible alert**, not a
toast: `RosterService.statusOf(team, count)` already returns `'over'` when a
team exceeds its max, and that status feeds the `over`/`danger`-colored badge
everywhere a team's status is shown — Dashboard's team cards, "Por equipo"'s
squares, and Comparar's final tally. Because it's computed live from state
(not a dismissible notification), it simply disappears once the team is back
at/under its max — nothing to acknowledge or clear by hand.

"Por equipo" additionally gives the over-capacity square a **pulsing outline**
(`.ps-square.is-over`, see `ByTeamView.css`) since that's the view where
organizers actively resolve conflicts — the pulse is slow (2.4s) and disabled
under `prefers-reduced-motion`. Team pills in "Mi asignación" that are already
at capacity get a warning-colored border instead of being grayed out /
`cursor: not-allowed` — they must stay visibly *clickable*, since blocking the
click is exactly the behavior this feature removed. A one-time toast
("«Equipo» quedó con exceso de personas") still fires at the moment an
assignment pushes a team over, as an immediate heads-up on top of the
persistent badge — but the badge, not the toast, is the source of truth for
"is this still unresolved."

## Iconography

No custom SVG icon system — emoji, used sparingly and functionally (🏷️ brand
mark, 👥 people, ⬇ export, ‹ › carousel arrows). A few get a small "sticker"
treatment: rotated a few degrees inside a bordered, solid-color square
(`.brand-mark`, `.help-ico`). Don't over-rotate — 4–6 degrees reads as
playful; more reads as broken.

## Drag and drop: DragDropService

**Yes, it's used, and yes, it was worth it.** "Por equipo" is the one view
with real drag-and-drop (dragging a `MemberChip` between the "Sin asignar"
sidebar and team squares), and it's built entirely on the official
`DragDropService` Visual/Service pair from the Slice.js component registry
(`slicejs-cli get DragDropService`) rather than hand-rolled HTML5 drag events.

**Why it was worth pulling in instead of native `draggable="true"` +
`dragstart`/`dragover`/`drop`:**
- **Pointer-based, not HTML5 DnD** — works with touch out of the box. Native
  HTML5 drag-and-drop has famously inconsistent (often absent) mobile/touch
  support; `DragDropService` is built on Pointer Events, so the same code
  drags on a phone or a laptop trackpad.
- **Ghost element for free** — `makeDraggable(node, { ghost: true })` clones
  the node and follows the pointer automatically; we didn't write any
  ghost-positioning math ourselves.
- **Auto-scroll near viewport edges** — dragging a chip toward the bottom of
  a long "Sin asignar" list scrolls the container for you. Not something
  we'd have bothered hand-rolling for an internal tool.
- **Declarative hover state** — `makeDroppable(zone, { onDragEnter,
  onDragLeave, onDrop })` gives clean hooks for the `.drag-over` highlight,
  instead of manually tracking "which zone is the pointer currently over"
  across `dragenter`/`dragleave` bubbling quirks.

**How we use the API** (see `ByTeamView.js`): dropzones are the sidebar
(`.ps-sidebar`) and every team square (`.ps-square`) — their DOM nodes are
built once in `_buildShell()` and never rebuilt, so `makeDroppable()` is
called exactly once per zone and never re-registered. Each `MemberChip`
registers itself as draggable (`makeDraggable`, with `{ memberId }` as the
drop payload) inside its own `_registerDraggable()` — the chip, not the view,
owns its own drag registration. Moving a chip between zones on drop is a
plain `container.appendChild(existingChipNode)` — no destroy/rebuild, see the
lifecycle notes in `ByTeamView.js` itself for why.

**The one gotcha it cost us**, because `DragDropService` clones the dragged
DOM node for the drag-ghost:

1. The ghost is a clone of the **plain `.member-chip` span**, not the
   `<slice-memberchip>` custom element — cloning a custom element re-runs its
   constructor (re-attaching a blank template with no props), which silently
   empties the ghost's text. Only clone plain elements you want a drag ghost
   of, never the custom element wrapper itself.
2. Because the ghost is a bare clone appended straight to `<body>`, it's
   **outside any `<slice-memberchip>` ancestor** — so `MemberChip.css`'s
   `.member-chip` rules are deliberately **not** scoped under the
   `slice-memberchip` tag prefix (unlike every other component's CSS, which
   does use that convention). If you add a new draggable component, either
   follow this same unscoped pattern or accept that its drag ghost will
   render unstyled.

Net assessment: one non-obvious gotcha (now documented, one-time cost) versus
not having to write pointer tracking, ghost rendering, auto-scroll, or
touch-vs-mouse handling by hand. Worth it.

## File map

- `src/Themes/Light.css`, `src/Themes/Dark.css` — color tokens + font family
  variables. Always edit both together.
- `src/Styles/sliceStyles.css` — Google Fonts import, base typography, and
  every **shared** utility class (`.btn*`, `.stat-card`, `.bar`, `.badge`,
  `.color-dot`, `.mini-input`, `.empty-state`, `.view-title`/`.view-sub`).
  Reach for a shared class here before writing a per-component duplicate.
- `src/Components/**/*.css` — per-view/per-component styling, scoped under
  that component's custom-element tag (e.g. `slice-dashboardview .team-card`)
  except `MemberChip.css` (see the gotcha above).
