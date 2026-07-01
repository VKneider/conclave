# Framework gotchas & project pitfalls

**Must-read before making any structural changes.** These are real bugs and non-obvious behaviors discovered by reading the Slice.js framework source (not just the docs).

---

### 1. `slice get <Service>` doesn't always pull multi-file dependencies

`DragDropService.js` (installed via `slicejs-cli get DragDropService --service`) imports a sibling `./dndGeometry.js` that the CLI never downloaded — a registry/CLI gap, not user error. It had to be fetched by hand from the same registry URL the CLI itself uses:
`https://raw.githubusercontent.com/VKneider/slice.js_visual_library/master/src/Components/<Category>/<Name>/<file>`.
**After `slice get`-ing any multi-file Service, grep its `import` statements and confirm every sibling file actually landed on disk.**

### 2. The Router reuses instances by *component name*, not by path

`Router.handleRoute()` (framework source: `Slice/Components/Structural/Router/Router.js`) keys its instance cache as `route-${componentName}`. Since every entry in `routes.js` here points to the same `component: 'AppShell'`, navigating between tabs reuses the SAME `AppShell` instance and calls its `update()` (which we don't define — not needed) rather than rebuilding it. This is *why* the App Shell + MultiRoute pattern actually preserves state across tab switches — confirmed by reading the real source, since the docs describe the pattern but not this mechanism.

### 3. `router:change` can fire before `slice.router.activeRoute` updates

`Router.onRouteChange()` schedules the actual route-matching/handling work in an **un-awaited `setTimeout(..., 10)`**, then a separate call path emits `router:change` — in practice the event can be observed to fire before `slice.router.activeRoute` reflects the new route. `AppShell._updateActiveTab()` therefore reads `window.location.pathname` directly instead of `slice.router.activeRoute.path` — `pushState`/`replaceState` land synchronously *before* any of this async machinery runs, so `window.location.pathname` is trustworthy the instant the event fires, even though `activeRoute` might not be yet. If you ever need the matched route object (not just the path) reactively, don't trust `activeRoute` inside a `router:change` handler without verifying against the URL first.

### 4. Never call the public `update()` from `init()`

`slice.build()` sequence is: construct → await `init()` → *then* register the instance with the controller. The framework's `update()` wrapper (serialization, liveness checks) assumes a registered instance, so calling `this.update()` from inside `init()` is calling it before that registration exists. The pattern used in every view here: put the actual paint logic in a private method (`_paint()` / `_refresh()` / `_layout()` — naming varies, grep any view for the pattern), call that directly from `init()`, and have the public `update()` (invoked by `MultiRoute` on cached revisit) delegate to the same private method.

### 5. The bundle analyzer only sees `slice.build()` literals — `buildEach` hides components

The CLI's `DependencyAnalyzer` (Babel AST-based) only recognizes the exact pattern `slice.build('ComponentName', ...)` and `import ... from '.../Components/...'`. Calls like `buildEach('StatusBadge', ...)` (a utility wrapper) are invisible to it, so components built through `buildEach` do NOT land in any production bundle — they load as separate HTTP requests at runtime.

The fix used throughout the app: **inline the two-step pattern directly** so the first `slice.build(...)` call is visible to the analyzer:
```js
const propsList = items.map(i => ({ sliceId: `comp-${i.id}`, ... }));
const [first, ...rest] = propsList;
const firstNode = await slice.build('MyComponent', first);
const restNodes = await Promise.all(rest.map(p => slice.build('MyComponent', p)));
```
This also avoids the race-condition described in the original gotcha: the first call warms the template cache, so the parallel `Promise.all(...)` on the rest only fires one XHR per type instead of N.

`src/utils/sliceBuild.js` still exports `buildEach()` as reference, but don't use it — it hides components from the analyzer.

### 6. Cloning a live custom element re-runs its constructor

Not a Slice quirk — standard custom-element platform behavior. `DragDropService` clones whatever DOM node you register as draggable, for the drag-ghost. Cloning a *Slice-managed custom element* re-invokes its constructor (which calls `slice.attachTemplate()` again), and the clone receives no props — so any prop-driven content (e.g. `MemberChip`'s member name) silently comes back empty on the ghost, while the static template markup (so, the chip's shape/border) still renders fine. **Only drag/clone plain DOM elements, never the custom element wrapper**, if the clone needs to preserve already-rendered content. See `MemberChip.js`'s `_registerDraggable()` for the fix, and the "Drag and drop" section of `DESIGN.md` for the fuller writeup (including why `MemberChip.css` deliberately isn't tag-scoped, for the same root cause).

### 7. `innerHTML` replacement leaks nested Slice components

`el.innerHTML = newHtml` does not run `beforeDestroy()` on any Slice components living inside `el` — they stay registered in `slice.controller.activeComponents` forever. Two ways this is handled here:
- (a) Never rebuild that region after the first paint — build once, then only mutate cached DOM refs / call `slice.setComponentProps()` on cached child instances (what `DashboardView`/`ByTeamView` do for their `StatusBadge`/`MemberChip` children).
- (b) Call `slice.controller.destroyByContainer(container)` before replacing markup that contains built children.

`CompareView`'s per-interaction full re-template is safe WITHOUT either, because its table is plain HTML with zero nested Slice components by design (a deliberate choice).

### 8. Theme names are matched case-sensitively against the filename

`ThemeManager` resolves a theme name to `/Themes/${name}.css` verbatim. Our files are `Light.css`/`Dark.css`; the registry `ThemeSwitcher` component's own default (`['LIGHT', 'DARK']`) would 404. Always pass the exact-case `themes` prop when building it (see `AppShell.js`).

### 9. `singleton: true` is get-or-create, keyed by component name

Used throughout (`Providers`, every Service, `ConfirmActionModal`, `ToastProvider`, `DragDropService`) — `slice.build('X', { singleton: true })` is safe to call from multiple places; the first call builds it, later calls just return the same instance. Recover it anywhere afterward with `slice.getComponent('X')` rather than threading references through props.

### 10. A "Provider Service" should build its owned Visual lazily, not in `init()`

First cut of `ConfirmActionModal` built and `document.body.appendChild()`'d its `Modal` instance inside `init()` — meaning a closed, invisible `<dialog>` landed in the DOM the instant the app booted, before any confirmation was ever requested. Surprising to find in devtools, and pure waste for sessions that never trigger one. `ToastProvider` (the pattern this was modeled on) never made that mistake — its `_getContainer()` only creates and appends the toast container on the *first* `.show()` call. Fixed by moving `ConfirmActionModal`'s Modal construction into a `_ensureModal()` helper, called (and memoized) from `_open()` instead of from `init()`. **Any new Provider Service should build its Visual on first use, not at boot** — check against `ToastProvider`'s `_getContainer()` as the reference implementation before copying the "eager `init()`" shape.

### 11. A view needs a context watcher whenever it can be mutated from OUTSIDE itself

Early views only called their repaint method directly after their OWN mutation handlers, on the reasoning that "MultiRoute calls `update()` on revisit, and only one view is visible at a time, so cross-view reactivity isn't needed." **That reasoning breaks for any mutation trigger that lives outside every view** — specifically the footer's "Reiniciar mis asignaciones" button, which is part of `AppShell` (always mounted) and reachable no matter which view is currently active. Resetting from the footer while looking at the Dashboard left it showing stale numbers until you navigated away and back, because nothing told `DashboardView` its data had changed. Fixed by adding `slice.context.watch('assignment', this, () => this._refresh())` (etc., per view's own repaint method name) to every view that displays `assignment`-derived data: `DashboardView`, `MyAssignmentView`, `ByTeamView`, `CompareView` (which also watches `resolutions`).

This does mean a handler that BOTH mutates context AND already calls its own repaint afterward now repaints twice (once from the watcher — confirmed synchronous — once from the explicit call). That's intentionally left in: repaint methods are idempotent and cheap at this app's scale, and depending on the watcher's timing to be *exactly* right for local state that isn't itself part of the context (e.g. `MyAssignmentView.carouselIndex`) is a subtler bug to reintroduce. **Verified by reading `ContextManager.setState()` and `EventManager.emit()` source directly: `setState()` → `emit('context:<name>', ...)` → every watcher callback invoked in a plain synchronous `for` loop, no microtask/setTimeout anywhere in that path** — so a watcher-triggered repaint mid-handler can never cause a visible flicker (the browser doesn't paint until the current task finishes), it's only ever a wasted (safe) extra call.

### 12. The event registry (`slice.events.register`) is opt-in and payload is documentation-only

Declared once, at the top of `Providers.init()` (before anything can emit/subscribe), for both custom events in this app (`toast:show`, `confirm:request`) — see that file. Three things worth knowing before you add a third:
- `router:change` and `context:*` (the family `ContextManager.setState()` emits internally for every context, e.g. `context:assignment`) are **auto-declared** — `EventManager._seedFrameworkEvents()` seeds `router:change` on the first `register()` call, and `isDeclared()` treats any `context:`-prefixed name as declared unconditionally. Don't re-declare either.
- The `payload` shape you declare is **never runtime-validated against the actual `emit()` arguments** — it's read by the dev-tools event debugger (`alt+shift+e`) for tracing/documentation only. That's why declaring `onConfirm`/`onCancel` as `'function'` in `confirm:request`'s payload is safe even though a function obviously isn't a JSON-serializable type — nothing tries to serialize or type-check it.
- Once ANY `register()` call has happened, emitting or subscribing to an UNDECLARED event name logs a one-time dev warning (not an error — nothing breaks). If you add a new custom event, register it in `Providers.init()` alongside the existing two, or you'll see that warning the first time it fires.

### 13. The registry `Modal` component doesn't actually hide itself when closed

A real bug in the installed copy of `Modal.css` (from the official registry, not something we introduced): `slice-modal .slice-modal` sets `display: flex` **unconditionally**. The native `<dialog>` element is normally hidden when closed via the UA stylesheet's `dialog:not([open]) { display: none }` — but author CSS always wins over UA styles in the cascade, so that unconditional `display: flex` silently overrode it. Result: after calling `.close()`, the dialog didn't disappear — it kept rendering in normal document flow whatever `display:flex` would produce, sitting at the very end of `<body>` (visually "stuck below the page", since nothing else on the page pushes it back above). This wasn't specific to `ConfirmActionModal`'s usage — it's latent in the component itself. Patched directly in `src/Components/Visual/Modal/Modal.css` by re-asserting `slice-modal .slice-modal:not([open]) { display: none; }` ahead of the unconditional rule. **If `Modal` is ever re-synced from the registry (`slice sync`), re-check this fix survived the overwrite.**
