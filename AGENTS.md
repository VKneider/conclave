# Conclave — Agent Notes

Project-specific knowledge for anyone (human or agent) picking up work on
this codebase. Read this before making structural changes. For *visual*
conventions (color, typography, borders, shadows, motion), see
[`DESIGN.md`](./DESIGN.md) instead — this file is architecture/engineering.

## What this project is

Conclave is a Slice.js (`slicejs-web-framework` v3.x) app for assigning
people ("miembros") to teams/roles ("equipos") for an event, comparing
several organizers' proposals, and settling on a final list. It's a from-
scratch rebuild + generalization of a vanilla-JS app at
`/datadrive/vkneider/vk/slc/servicios/` (a single retreat's hardcoded tool)
into a reusable, branded ("Conclave"), theme-aware app.

**If a behavior seems unspecified or ambiguous, `slc/servicios/app/app.js`
(795 lines, one file) is the behavioral ground truth this was ported from.**
Domain renames from that source: *servicio* → equipo (team), *servidor* →
miembro (member), member field `servicioExcel` → `rolFijo`.

The general Slice.js framework conventions (lifecycle, `attachTemplate`,
prop setters, routing, contexts, events, the CLI) are covered by the
project-level skill at
`/datadrive/vkneider/vk/slc/.claude/skills/slice-js-developer/SKILL.md` and
its `references/` — read that first for anything generic-framework-shaped.
What follows here is specific to *this* app and to real gotchas hit while
building it (some of which contradict what you'd naively expect from the
docs alone — verified by reading the installed framework's actual source).

## Architecture at a glance

- **App Shell + MultiRoute.** Every route in `src/routes.js` points to
  `AppShell`; `AppShell` builds its own internal `MultiRoute` mapping the
  same six paths to the six view components. `AppShell` itself persists
  across navigation (see "Router instance reuse" below) — it's where the
  topbar, tabs, and footer live.
- **Composition root:** `Components/AppServices/Providers/Providers.js`,
  built once via `slice.build('Providers', { singleton: true })` from
  `AppShell.init()`. It boots every singleton Service in order and is the
  one place new app-wide singletons get registered. Recover any of them
  anywhere via `slice.getComponent('ServiceName')`.
- **Services** (`Components/Service/`): `RosterService` (loads
  `/data/equipos.json` + `/data/miembros.json` once, no context — there's no
  in-app roster editing yet, so a static in-memory cache is enough),
  `AssignmentService` (owns the `assignment` context — the user's own
  picks), `ResolutionService` (owns the `resolutions` context — the
  Comparar "Final" decisions), `SettingsService` (owns the `settings`
  context — autor name + org/event name), `FileDownloadService` (generic
  Blob-download helper), `ConfirmActionModal` (Provider-Service owning one
  `Modal` instance app-wide, driven by a `confirm:request` event),
  `ToastProvider` + `DragDropService` (pulled from the official Slice.js
  component registry, not hand-built).
- **Views** (`Components/AppComponents/`): DashboardView, MyAssignmentView
  ("Mi asignación", the carousel), ByTeamView ("Por equipo", drag-and-drop),
  CompareView ("Comparar"), HelpView ("Ayuda"), SettingsView
  ("Configuración").
- **Contexts:** `assignment` (`{[memberId]: teamId}`), `resolutions`
  (`{[memberId]: teamId}`), `settings` (`{autor, nombreOrganizacion}`) — all
  three are `persist: true` (localStorage). There's deliberately no `roster`
  context (see RosterService above) and no context for CompareView's
  imported comparison sources (kept as a plain instance field — session-
  only by design, matching the original app).
- **Shared utils** (`src/utils/`, imported via absolute path — added to
  `publicFolders` in `sliceConfig.json`): `format.js` (`esc` for HTML-
  escaping user text), `sliceBuild.js` (`buildEach`, see gotcha below).

## Hard-won gotchas (verified against framework/CLI source, not just docs)

### 1. `slice get <Service>` doesn't always pull multi-file dependencies
`DragDropService.js` (installed via `slicejs-cli get DragDropService
--service`) imports a sibling `./dndGeometry.js` that the CLI never
downloaded — a registry/CLI gap, not user error. It had to be fetched by
hand from the same registry URL the CLI itself uses:
`https://raw.githubusercontent.com/VKneider/slice.js_visual_library/master/src/Components/<Category>/<Name>/<file>`.
**After `slice get`-ing any multi-file Service, grep its `import` statements
and confirm every sibling file actually landed on disk.**

### 2. The Router reuses instances by *component name*, not by path
`Router.handleRoute()` (framework source:
`Slice/Components/Structural/Router/Router.js`) keys its instance cache as
`route-${componentName}`. Since every entry in `routes.js` here points to
the same `component: 'AppShell'`, navigating between tabs reuses the SAME
`AppShell` instance and calls its `update()` (which we don't define — not
needed) rather than rebuilding it. This is *why* the App Shell + MultiRoute
pattern actually preserves state across tab switches — confirmed by reading
the real source, since the docs describe the pattern but not this
mechanism.

### 3. `router:change` can fire before `slice.router.activeRoute` updates
`Router.onRouteChange()` schedules the actual route-matching/handling work
in an **un-awaited `setTimeout(..., 10)`**, then a separate call path emits
`router:change` — in practice the event can be observed to fire before
`slice.router.activeRoute` reflects the new route. `AppShell._updateActiveTab()`
therefore reads `window.location.pathname` directly instead of
`slice.router.activeRoute.path` — `pushState`/`replaceState` land
synchronously *before* any of this async machinery runs, so
`window.location.pathname` is trustworthy the instant the event fires, even
though `activeRoute` might not be yet. If you ever need the matched route
object (not just the path) reactively, don't trust `activeRoute` inside a
`router:change` handler without verifying against the URL first.

### 4. Never call the public `update()` from `init()`
`slice.build()` sequence is: construct → await `init()` → *then* register
the instance with the controller. The framework's `update()` wrapper
(serialization, liveness checks) assumes a registered instance, so calling
`this.update()` from inside `init()` is calling it before that registration
exists. The pattern used in every view here: put the actual paint logic in
a private method (`_paint()` / `_refresh()` / `_layout()` — naming varies,
grep any view for the pattern), call that directly from `init()`, and have
the public `update()` (invoked by `MultiRoute` on cached revisit) delegate
to the same private method.

### 5. The bundle analyzer only sees `slice.build()` literals — `buildEach` hides components
The CLI's `DependencyAnalyzer` (Babel AST-based) only recognizes the exact
pattern `slice.build('ComponentName', ...)` and `import ... from '.../Components/...'`.
Calls like `buildEach('StatusBadge', ...)` (a utility wrapper) are invisible
to it, so components built through `buildEach` do NOT land in any production
bundle — they load as separate HTTP requests at runtime.

The fix used throughout the app: **inline the two-step pattern directly** so
the first `slice.build(...)` call is visible to the analyzer:
```js
const propsList = items.map(i => ({ sliceId: `comp-${i.id}`, ... }));
const [first, ...rest] = propsList;
const firstNode = await slice.build('MyComponent', first);
const restNodes = await Promise.all(rest.map(p => slice.build('MyComponent', p)));
```
This also avoids the race-condition described in the original gotcha: the
first call warms the template cache, so the parallel `Promise.all(...)` on
the rest only fires one XHR per type instead of N.

`src/utils/sliceBuild.js` still exports `buildEach()` as reference, but
don't use it — it hides components from the analyzer.

### 6. Cloning a live custom element re-runs its constructor
Not a Slice quirk — standard custom-element platform behavior. `DragDropService`
clones whatever DOM node you register as draggable, for the drag-ghost.
Cloning a *Slice-managed custom element* re-invokes its constructor (which
calls `slice.attachTemplate()` again), and the clone receives no props — so
any prop-driven content (e.g. `MemberChip`'s member name) silently comes back
empty on the ghost, while the static template markup (so, the chip's shape/
border) still renders fine. **Only drag/clone plain DOM elements, never the
custom element wrapper**, if the clone needs to preserve already-rendered
content. See `MemberChip.js`'s `_registerDraggable()` for the fix, and the
"Drag and drop" section of `DESIGN.md` for the fuller writeup (including why
`MemberChip.css` deliberately isn't tag-scoped, for the same root cause).

### 7. `innerHTML` replacement leaks nested Slice components
`el.innerHTML = newHtml` does not run `beforeDestroy()` on any Slice
components living inside `el` — they stay registered in
`slice.controller.activeComponents` forever. Two ways this is handled here:
either (a) never rebuild that region after the first paint — build once,
then only mutate cached DOM refs / call `slice.setComponentProps()` on
cached child instances (what `DashboardView`/`ByTeamView` do for their
`StatusBadge`/`MemberChip` children), or (b) call
`slice.controller.destroyByContainer(container)` before replacing markup
that contains built children. `CompareView`'s per-interaction full
re-template is safe WITHOUT either, because its table is plain HTML with
zero nested Slice components by design (a deliberate choice — see
`CompareView.js`'s top comment).

### 8. Theme names are matched case-sensitively against the filename
`ThemeManager` resolves a theme name to `/Themes/${name}.css` verbatim. Our
files are `Light.css`/`Dark.css`; the registry `ThemeSwitcher` component's
own default (`['LIGHT', 'DARK']`) would 404. Always pass the exact-case
`themes` prop when building it (see `AppShell.js`).

### 9. `singleton: true` is get-or-create, keyed by component name
Used throughout (`Providers`, every Service, `ConfirmActionModal`,
`ToastProvider`, `DragDropService`) — `slice.build('X', { singleton: true })`
is safe to call from multiple places; the first call builds it, later calls
just return the same instance. Recover it anywhere afterward with
`slice.getComponent('X')` rather than threading references through props.

### 10. A "Provider Service" should build its owned Visual lazily, not in `init()`
First cut of `ConfirmActionModal` built and `document.body.appendChild()`'d
its `Modal` instance inside `init()` — meaning a closed, invisible `<dialog>`
landed in the DOM the instant the app booted, before any confirmation was
ever requested. Surprising to find in devtools, and pure waste for sessions
that never trigger one. `ToastProvider` (the pattern this was modeled on)
never made that mistake — its `_getContainer()` only creates and appends the
toast container on the *first* `.show()` call. Fixed by moving
`ConfirmActionModal`'s Modal construction into a `_ensureModal()` helper,
called (and memoized) from `_open()` instead of from `init()`. **Any new
Provider Service should build its Visual on first use, not at boot** — check
against `ToastProvider`'s `_getContainer()` as the reference implementation
before copying the "eager `init()`" shape that snuck into the first draft
here.

### 11. A view needs a context watcher whenever it can be mutated from OUTSIDE itself
Early views only called their repaint method (`_paint()`/`_refresh()`/
`_layout()`) directly after their OWN mutation handlers, on the reasoning
that "MultiRoute calls `update()` on revisit, and only one view is visible
at a time, so cross-view reactivity isn't needed." **That reasoning breaks
for any mutation trigger that lives outside every view** — specifically the
footer's "Reiniciar mis asignaciones" button, which is part of `AppShell`
(always mounted) and reachable no matter which view is currently active.
Resetting from the footer while looking at the Dashboard left it showing
stale numbers until you navigated away and back, because nothing told
`DashboardView` its data had changed. Fixed by adding
`slice.context.watch('assignment', this, () => this._refresh())` (etc., per
view's own repaint method name) to every view that displays
`assignment`-derived data: `DashboardView`, `MyAssignmentView`, `ByTeamView`,
`CompareView` (which also watches `resolutions`, mutated by its own handlers
— see below).

This does mean a handler that BOTH mutates context AND already calls its own
repaint afterward now repaints twice (once from the watcher — confirmed
synchronous, see below — once from the explicit call). That's intentionally
left in, rather than removing the "now-redundant" explicit call: `_paint()`/
`_refresh()`/`_layout()` are all idempotent and cheap at this app's scale,
and depending on the watcher's timing to be *exactly* right for local state
that isn't itself part of the context (e.g. `MyAssignmentView.carouselIndex`,
which must be incremented before the repaint reflects it) is a subtler bug
to reintroduce than the cost of one extra synchronous re-render. **Verified
by reading `ContextManager.setState()` and `EventManager.emit()` source
directly: `setState()` → `emit('context:<name>', ...)` → every watcher
callback invoked in a plain synchronous `for` loop, no microtask/setTimeout
anywhere in that path** — so a watcher-triggered repaint mid-handler can
never cause a visible flicker (the browser doesn't paint until the current
task finishes), it's only ever a wasted (safe) extra call.

### 12. The event registry (`slice.events.register`) is opt-in and payload is documentation-only
Declared once, at the top of `Providers.init()` (before anything can
emit/subscribe), for both custom events in this app (`toast:show`,
`confirm:request`) — see that file. Two things worth knowing before you add
a third:
- `router:change` and `context:*` (the family `ContextManager.setState()`
  emits internally for every context, e.g. `context:assignment`) are
  **auto-declared** — `EventManager._seedFrameworkEvents()` seeds
  `router:change` on the first `register()` call, and `isDeclared()` treats
  any `context:`-prefixed name as declared unconditionally. Don't
  re-declare either.
- The `payload` shape you declare is **never runtime-validated against the
  actual `emit()` arguments** — it's read by the dev-tools event debugger
  (`alt+shift+e`) for tracing/documentation only. That's why declaring
  `onConfirm`/`onCancel` as `'function'` in `confirm:request`'s payload is
  safe even though a function obviously isn't a JSON-serializable type —
  nothing tries to serialize or type-check it.
- Once ANY `register()` call has happened, emitting or subscribing to an
  UNDECLARED event name logs a one-time dev warning (not an error — nothing
  breaks). If you add a new custom event, register it in `Providers.init()`
  alongside the existing two, or you'll see that warning the first time it
  fires.

### 13. The registry `Modal` component doesn't actually hide itself when closed
A real bug in the installed copy of `Modal.css` (from the official registry,
not something we introduced): `slice-modal .slice-modal` sets `display: flex`
**unconditionally**. The native `<dialog>` element is normally hidden when
closed via the UA stylesheet's `dialog:not([open]) { display: none }` — but
author CSS always wins over UA styles in the cascade, so that unconditional
`display: flex` silently overrode it. Result: after calling `.close()`, the
dialog didn't disappear — it kept rendering in normal document flow whatever
`display:flex` would produce, sitting at the very end of `<body>` (visually
"stuck below the page", since nothing else on the page pushes it back
above). This wasn't specific to `ConfirmActionModal`'s usage — it's latent in
the component itself. Patched directly in `src/Components/Visual/Modal/Modal.css`
by re-asserting `slice-modal .slice-modal:not([open]) { display: none; }`
ahead of the unconditional rule. **If `Modal` is ever re-synced from the
registry (`slice sync`), re-check this fix survived the overwrite.**

## Product decisions worth knowing (not obvious from the code alone)

- **Over-capacity assignment is allowed on purpose.** Assigning a member
  past a team's max no longer fails — `AssignmentService.assign()` always
  succeeds. The persistent "this needs resolving" signal is the `over`
  status badge (danger-colored, more urgent than `under`'s warning color),
  which is computed live from state and clears itself once the team's back
  at/under max. See the "Capacity alerts" section of `DESIGN.md` for the
  full reasoning and the UI details (pulsing square outline in "Por
  equipo", non-blocking warning-colored pills in "Mi asignación").
- **Confirmation dialogs (and single-value prompts) go through
  `ConfirmActionModal`, not native `confirm()`/`prompt()`.** Emit
  `slice.events.emit('confirm:request', { title, message, confirmLabel,
  cancelLabel, danger, onConfirm, onCancel })` from anywhere. Add
  `inputLabel` (+ optional `inputPlaceholder`/`inputValue`) to also collect
  one text value — `onConfirm` then receives it (trimmed) as its argument
  instead of being called with none. Don't call `confirm()`/`prompt()`/
  `alert()` directly anywhere in this app. Error notifications (not
  confirm/cancel decisions) go through the existing `toast:show` event
  instead (`type: 'error'`).
- **The "Tu nombre" field lives only in Configuración** (`SettingsView`),
  not in the topbar — it was there originally and was deliberately removed
  per user feedback. `AppShell._exportMine()` asks for it via
  `ConfirmActionModal`'s `inputLabel` (see above) when it's empty at export
  time, rather than a native `prompt()`.

## Data files

`src/data/equipos.json` / `src/data/miembros.json` — served statically
(`/data` is in `sliceConfig.json`'s `publicFolders`), fetched once by
`RosterService` via `FetchManager`. Regenerating them from the original
retreat's Excel source is explicitly out of scope for this app — that
pipeline (`scripts/extraer.py`) stays in `slc/servicios/`, untouched; these
two JSON files are just hand-edited or regenerated by whatever tooling an
organizer has, per the format documented in the app's own "Ayuda" view.

**These two files currently hold entirely fictional data (invented team
names/ids/leaders and invented member names), deliberately swapped in from
the original retreat's real data so this app can be published as a public
demo.** Structure (team count, `capacidad`/`min`/`max`/`asignable` per team,
member count, `sexo` distribution, `fijo` flags) is preserved exactly — only
every `nombre`/`lider`/`rolFijo` string was replaced. If you ever see a name
in this app that seems generic/made-up, that's intentional, not a bug to
"fix" back to something more specific.

## Running it

pnpm-based (`packageManager` pinned in `package.json`). `pnpm run dev`
(dev server, default port 3001), `pnpm run slice:doctor` (structural
diagnostics — run this after any component add/remove/rename),
`pnpm run component:create <Name> --category <Cat>` /
`component:delete ... --yes` / `component:list` (rescans and rewrites
`components.js` — run after any manual file moves).
