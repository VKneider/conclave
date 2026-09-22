# Icons in Conclave

## Stack

**Lucide** (`lucide@^1.25.0`) — 1300+ icons, MIT license, stroke-based (2px),
consistent `currentColor` inheritance.

## Two ways to use an icon

### 1. Inline SVG string (HTML templates, innerHTML)

For HTML strings where an emoji used to be, use `IconProvider.svg()`:

```js
// Cache the reference in init()
this._icons = slice.getComponent('IconProvider');

// In template literals
this.$root.innerHTML = this._html.sanitize(`
  <button>${this._icons.svg('target', 16)} Asignación</button>
  <span>${this._icons.svg('check', 14)} Guardado</span>
`);
```

- Returns a `<svg>...</svg>` string ready for `innerHTML`.
- No `slice.build()` needed — zero component overhead.
- **It survives `HtmlService.sanitize()`** — see the section below.

### 2. The Icon component (component props)

For buttons, inputs, etc. that take an icon as a prop:

```js
await slice.build('Button', {
  value: 'Descargar archivo',
  icon: { name: 'download' },   // Button internally does slice.build('Icon', ...)
});
```

Internally `Button` builds a `<slice-icon>` with `name`, `size` and `color`.

## API

### `IconProvider.svg(name, size?, color?)`

| Parameter | Type    | Default          | Description                              |
|-----------|---------|------------------|------------------------------------------|
| name      | string  | —                | The icon's Lucide name                   |
| size      | number  | `16`             | Size in px (width and height)            |
| color     | string  | `'currentColor'` | Stroke colour. Inherits from the parent by default |

```js
this._icons.svg('check', 20)                      // 20px, inherits the colour
this._icons.svg('alert-triangle', 24, '#e63950')  // explicit colour
```

**An unknown name returns `''` silently** — no console warning, no throw. A
button with `icon: { name: 'trash' }` simply renders without an icon (the real
name is `trash-2`). See GOTCHAS §41.

### `slice.build('Icon', { name, size, color })`

| Prop    | Type   | Default          | Description                       |
|---------|--------|------------------|-----------------------------------|
| name    | string | `'circle-help'`  | The icon's Lucide name            |
| size    | string | `'small'`        | `'small'`(16) / `'medium'`(20) / `'large'`(24), or a px string |
| color   | string | `'currentColor'` | Stroke colour                     |

## Key files

| File | Role |
|------|------|
| `src/Components/Visual/Icon/icons.js` | **Source of truth.** Imports from Lucide, keeps the `NODE_MAP` of name → icon. Exports `getNode()` and `svg()`. |
| `src/Components/Visual/Icon/Icon.js` | The `<slice-icon>` web component. Uses `getNode()` from `icons.js` directly (no service dependency). |
| `src/Components/Providers/IconProvider/IconProvider.js` | **Singleton service.** Wraps `icons.js` for centralised access. Recover it with `slice.getComponent('IconProvider')`. |

## Adding a new icon

Only **one file** needs touching: `src/Components/Visual/Icon/icons.js`

```js
// 1. Import from lucide
import { ..., BarChart3, Heart } from 'lucide';

// 2. Add it to NODE_MAP
const NODE_MAP = {
  ...
  'bar-chart': BarChart3,
  'heart': Heart,
};
```

`IconProvider` and the `Icon` component pick it up automatically — both
delegate to `icons.js`.

> **Careful with that import:** the `lucide` import on line 1 is the one
> GOTCHAS §36 is about — the bundler strips ESM imports when both modules land
> in the same bundle. Re-read that section before changing it.

## Themes (Light/Dark)

Icons inherit the parent text colour through `currentColor`. When the user
switches theme:

```css
/* Light.css:  --font-primary-color: #1a1a2e; */
/* Dark.css:   --font-primary-color: #e8e4dc; */
```

The icon follows on its own because its `stroke` is `currentColor`, which
resolves to the container's `color`, which comes from the active theme's CSS
variable.

For a colour that should NOT be inherited:

```js
this._icons.svg('check', 16, 'var(--success-color)')
```

## DOMPurify and SVGs

**`HtmlService.sanitize()` keeps SVGs** — it passes DOMPurify an explicit
allowlist for them:

```js
ADD_TAGS: ['svg', 'path', 'circle', 'line', 'polyline', 'polygon', 'rect', 'g', 'defs', 'use'],
ADD_ATTR: ['d', 'cx', 'cy', 'r', 'x', 'y', 'width', 'height', 'viewBox', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'xmlns'],
```

So icon markup goes through `sanitize()` like everything else. **Never skip
`sanitize()` to preserve an icon** — that was a real (and wrong) instruction in
an earlier version of this file, and it would drop the one net that protects an
`innerHTML` assignment from Plantilla/Respuestas JSON authored on someone
else's device.

```js
// ✅ Correct: sanitize, with esc() around any user-provided token
this.$root.innerHTML = this._html.sanitize(
  `...${this._icons.svg('target')}...${this._html.esc(userData)}...`
);
```

`sanitizeRichText()` is the *other* profile — a narrow allowlist for text
somebody else wrote (the Plantilla's welcome message). It deliberately strips
SVG, `<img>` and `<a href>`; see `docs/DATA.md` §bienvenida.

## Size conventions

| Context | Size |
|---------|------|
| Buttons (next to the label) | `16` |
| Standalone icons (avatar, modo labels) | `14`–`16` |
| Action cards (landing) | `20` |
| Use-case / category icons | `24` |
| Toast / alerts | `16`–`24` |
