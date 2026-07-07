# Component & refresh patterns

**Read this before writing or refactoring any component.** It's the contract
every view/Visual in this codebase follows, derived from Slice's own
[Refreshing Component Data](https://slicejs.com) guidance and the framework
source. The rules exist to avoid throwing away DOM/focus/scroll and to avoid
the nested-component memory leak (GOTCHAS §7).

## Core services (infra) — always available via `slice.getComponent`

Built first in `Providers` (category `Core`). Cache the **instance** once in
`init()`; never grab a bound method (`this._x = getComponent('X').method` is an
anti-pattern — it detaches `this` and is fragile).

| Service | Use |
|---|---|
| `StoreService` | `ensure(name, initial, key)` / `get(name)` / `set(name, updater)` / `watch(name, cmp, cb, selector)` — the single wrapper over `slice.context`. Domain services call `ensure()` **once** in their `init()` (no per-method defensive ensure). Replaces the old `utils/context.js`. |
| `HtmlService` | `esc(value)` (encode a dynamic token) + `sanitize(html)` (final net before an innerHTML assignment). `this._html = slice.getComponent('HtmlService')`, then `el.innerHTML = this._html.sanitize(\`…${this._html.esc(x)}…\`)`. The innerHTML assignment stays **explicit in the view**. Replaces `utils/format.js` + the old FormatService/SanitizeService. |
| `DomService` | `reconcile(container, items, opts)` — the leak-safe, order-safe list renderer (see below). |

There is **no `utils/` folder** — logic lives in services, imported via
`getComponent`. Visual components hold UI only; domain computation goes in a
Domain service and is handed to the view as a ready-to-render value.

## Lifecycle of a view / container

```js
async init() {                       // runs ONCE per instance — the once-only boundary
  this._html = slice.getComponent('HtmlService');
  this._dom  = slice.getComponent('DomService');
  this.$list = this.querySelector('#list');        // cache refs
  this.$addBtn = await slice.build('Button', {…});  // build STATIC atomic children (once)
  this.$addSlot.appendChild(this.$addBtn);
  this._render();                    // FIRST paint — call the private method, NOT this.update() (GOTCHAS §4)
  slice.context.watch('plantilla', this, () => this._render(), (s) => s.temas); // selector narrows refresh
}

update() { this._render(); }         // cached-route revisit / parent / watcher → delegate to the same method
```

- The **static shell** is the component's `.html` (attached in the constructor).
  Building the always-present atomic components goes **directly in `init()`** —
  `init()` already guarantees once-only, so a separate `_buildShell()` is
  optional sugar, not required.
- The **dynamic repaint method is named `_render()`** in every component
  (unified — don't reintroduce `_paint`/`_layout`/`_refresh`). `init()`,
  `update()`, and every watcher call it.
- `update()` is **not** called on first build — `init()` does the first paint.

## Refreshing an instance — reach for the lightest mechanism

Ordered lightest → heaviest (Slice's own guidance). The heavier the mechanism,
the more you throw away.

| Situation | Mechanism |
|---|---|
| One independent prop changed | setter — `node.prop = v` |
| Several **independent** props | `slice.setComponentProps(node, {…})` (re-runs setters, doesn't clobber omitted, no defaults on a built component) |
| Props are **interdependent** (B depends on A), or the refresh needs **async / rebuilding children** | the child defines a coordinated `async update(props)`; the parent calls `await node.update(props)` |
| Pure text | `el.textContent = …` |
| A variable-length **list of child components** | `DomService.reconcile(...)` (prop-by-prop under the hood) |
| Plain HTML with **zero** nested Slice components | `el.innerHTML = this._html.sanitize(...)` — the **only** allowed innerHTML case |

**`innerHTML` is forbidden on any region that contains built Slice components**
— replacing it does not run their `beforeDestroy()`, so they leak (GOTCHAS §7).
The moment a region needs a `<Button>`/`<Input>`/row component, convert it to
build-once + reconcile.

`reconcile` is **prop-by-prop applied to a list** — it doesn't compete with
prop-by-prop, it uses it (in its "existing" branch). For a single fixed child,
use a setter directly; for a list, use reconcile.

## `DomService.reconcile(container, items, opts)`

```js
this._dom.reconcile(this.$list, temas, {
  keyOf:  (t) => `tema-${t.id}`,          // stable sliceId per item
  component: 'TemaRow',
  props:  (t) => ({ tema: t }),           // item → props bag
  // refresh: (node, p) => node.update(p),// optional: use the child's coordinated update() instead of setComponentProps
});
```

Guarantees:
- **existing** (by `sliceId`) → refreshed in place via `setComponentProps` (or
  the `refresh` override) — survivors keep focus/scroll/internal state.
- **new** → `slice.build(component, { sliceId, ...props })`.
- **gone** → `slice.controller.destroyComponent(sliceId)` (runs
  `beforeDestroy`, cleans the registry) — **never** `innerHTML = ''`.
- **order** → DOM sequence is forced to match `items` order; only out-of-place
  nodes are moved. Moving a node is **not** cloning, so it never re-runs the
  constructor / leaks (GOTCHAS §6). ⇒ **the `items` array is the single source
  of truth for display order** (newest-first, an `orden` field, a re-sort, drag
  — just reorder the array).

## Leaf vs container

- **Leaf/reusable Visual** (Button, StatusBadge, OpcionChip, TemaRow, Tabs,
  the row components): owns its own DOM; refreshed **prop-by-prop**. Never
  `innerHTML`-rebuilds itself.
- **Container view** (Dashboard, Compare, tab shells): builds the shell once,
  then updates via setters / `reconcile` / `textContent`. The container
  **never reaches into a child's internals — only sets its props.**

## Reskinning registry components

Installed via `slice get <Name>`. Reskin them in **their own `.css`** (they use
light DOM, so their internal classes are addressable), never override from a
consumer — see GOTCHAS §14. Add behavior via a real prop (e.g. `Tabs` got a
`variant` prop for the Sticker Book segmented-control look). `slice get`
regenerates/reorders `components.js` — re-verify the `Core`/`Domain`/`Providers`
categories survived (GOTCHAS §25).

## UI patterns (learned the hard way)

These are recurring, non-obvious UI patterns this codebase settled on. Full
rationale in the linked GOTCHAS.

### Plain-HTML `innerHTML` regions vs `reconcile`
- Use **`reconcile`** when the list items are **Slice components** (rows built
  with `slice.build`) — it's the only leak-safe way to add/refresh/destroy them.
- Use **`el.innerHTML = this._html.sanitize(...)`** when the region is **pure
  markup with zero nested Slice components** — it's the right, simpler tool for
  card grids, tag lists, tally bars, ordered lists, etc. (RespuestasVotacionView,
  RespuestasRankingView, CompareView's votación/ranking mounts, TextCompareCards,
  TemaRow's owned-opciones list all do this). Wire their buttons with **event
  delegation on the container** (the listener survives the innerHTML rebuild).
- The moment such a region needs a real `<Button>`/`<Input>`/row component,
  convert it to build-once + reconcile (GOTCHAS §7).

### Fullscreen / modal overlays (GOTCHAS §29)
The component template = `[ rebuilt region ] + [ sibling overlay ]`. Only the
region gets `innerHTML`; the overlay is cached once and toggled via `.hidden`
(so a repaint never wipes it). Toggle `document.body.style.overflow = 'hidden'`
while open; restore it on close AND in `beforeDestroy`. Close on the ✕ button,
backdrop click (`e.target === overlay`), and `Escape` (a `document` keydown
listener removed in `beforeDestroy`). For an editor overlay: debounced autosave
on `input`, forced save on close.

### Text inputs that submit on Enter (GOTCHAS §27)
Never make Enter the ONLY submit path — mobile virtual keyboards are unreliable.
Pair every "escribe y presiona Enter" input with a visible tap button wired to
the same handler; broaden the key check (`e.key === 'Enter' || e.keyCode === 13`,
with `preventDefault`); add `enterkeyhint="done"` to the native `<input>`.

### Dropdowns/popovers inside scroll areas (GOTCHAS §28)
The registry `Select`'s menu is `position: absolute`, so any ancestor with
`overflow: auto/hidden` clips it. Don't wrap Selects in a nested scroll region —
prefer letting the page scroll. (A `max-height + overflow` on a list that
contains Selects is the specific trap.)

### Reskinning registry components
`slice get <Name>` installs a component with its own look; reskin it in **its
own `.css`** (light DOM → internal classes are addressable), never override from
each consumer (GOTCHAS §14, §26). Add behavior via a real prop (e.g. `Tabs`'
`variant`). After any `slice get`/`sync`, re-verify `components.js` categories
survived (GOTCHAS §25).

### CarouselView — reusable navigation shell

File: `src/Components/Visual/CarouselView/CarouselView.js`

A Slice component (`slice-carouselview`) that wraps a list of pre-built
DOM/Slice nodes and manages which ones are visible, with arrow/dot/keyboard
navigation. The parent view builds its own cards and hands them off via the
`items` setter; CarouselView moves them into its internal stage via
`appendChild` (moves, never clones).

**View modes** (set via the `mode` property):
- `'single'` — one item at a time with ‹ › arrows, dot indicators, count text,
  and keyboard ← → navigation.
- `'columns'` — two items side by side; arrows advance by 1 (overlapping); dots
  and count reflect page pairs (`Math.floor(index/2) + 1 de Math.ceil(total/2)`).
- `'grid'` — all items in a responsive CSS grid (`auto-fit, minmax(360px, 1fr)`);
  nav bar hidden.

**Visibility** is controlled via `item.style.display` (not CSS class or `hidden`
attribute) to guarantee it overrides component-level `display` rules like
`slice-textocard { display: block }`.

**Arrows** (`$prev`/`$next`) have click listeners bound in the constructor.
**Keyboard** ← → is disabled when focus is inside a textarea, input, or
contenteditable element. **Dots** are re-bound on every render via event
delegation on `$dots`.

**Methods:**
- `items` (setter/getter) — array of DOM/Slice nodes to display.
- `mode` (setter/getter) — `'single'` | `'columns'` | `'grid'`.
- `prev()` / `next()` — navigate by one step.
- `goTo(i)` — jump to a specific index.
- `refresh()` — force a re-render.

**Usage:**
```js
const carousel = await slice.build('CarouselView', { mode: 'single' });
carousel.items = [card1, card2, card3];
container.appendChild(carousel);

carousel.mode = 'grid';   // switch view mode
```

The **mode toggle** (e.g. three buttons ▦ ▬ ▬▬) is provided by the parent view,
not built into CarouselView — the parent sets `carousel.mode` in its click
handler.
