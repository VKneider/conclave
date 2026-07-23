# Iconos en Conclave

## Stack

**Lucide** (`lucide@^1.25.0`) — 1300+ icons, MIT license, stroke-based (2px), consistent `currentColor` inheritance.

## Dos formas de usar iconos

### 1. Inline SVG string (templates HTML, innerHTML)

Para strings HTML donde antes había un emoji, usás `IconProvider.svg()`:

```js
// En init() guardás la referencia
this._icons = slice.getComponent('IconProvider');

// En templates literales
this.$root.innerHTML = `
  <button>${this._icons.svg('target', 16)} Asignación</button>
  <span>${this._icons.svg('check', 14)} Guardado</span>
`;
```

- Devuelve un string `<svg>...</svg>` listo para `innerHTML`
- No necesita `slice.build()` — cero overhead de componente
- No pasa por DOMPurify (sanitize elimina SVGs). Usar `esc()` para datos de usuario

### 2. Componente Icon (props de componentes)

Para botones, inputs, etc. que reciben un icon como prop:

```js
await slice.build('Button', {
  value: 'Descargar archivo',
  icon: { name: 'download' },   // Button internamente hace slice.build('Icon', ...)
});
```

Internamente el Button construye un `<slice-icon>` con `name`, `size` y `color`.

## API

### `IconProvider.svg(name, size?, color?)`

| Parámetro | Tipo    | Default          | Descripción                           |
|-----------|---------|------------------|---------------------------------------|
| name      | string  | —                | Nombre del icono en Lucide            |
| size      | number  | `16`             | Tamaño en px (width y height)         |
| color     | string  | `'currentColor'` | Stroke color. Hereda del padre por defecto |

```js
this._icons.svg('check', 20)               // 20px, hereda color
this._icons.svg('alert-triangle', 24, '#e63950')  // Color explícito
```

### `slice.build('Icon', { name, size, color })`

| Prop    | Tipo   | Default          | Descripción                     |
|---------|--------|------------------|----------------------------------|
| name    | string | `'circle-help'`  | Nombre del icono en Lucide      |
| size    | string | `'small'`        | `'small'`(16) / `'medium'`(20) / `'large'`(24) o un string con px |
| color   | string | `'currentColor'` | Stroke color                     |

## Archivos clave

| Archivo | Rol |
|---------|-----|
| `src/Components/Visual/Icon/icons.js` | **Fuente de verdad.** Importa de Lucide, mantiene el `NODE_MAP` con nombre → icono. Exporta `getNode()` y `svg()` |
| `src/Components/Visual/Icon/Icon.js` | Componente web `<slice-icon>`. Usa `getNode()` de `icons.js` directo (sin service dependency) |
| `src/Components/Providers/IconProvider/IconProvider.js` | **Service singleton.** Envuelve `icons.js` para acceso centralizado. Se obtiene con `slice.getComponent('IconProvider')` |

## Agregar un icono nuevo

Solo hay que tocar **un archivo**: `src/Components/Visual/Icon/icons.js`

```js
// 1. Importar de lucide
import { ..., BarChart3, Heart } from 'lucide';

// 2. Agregar al NODE_MAP
const NODE_MAP = {
  ...
  'bar-chart': BarChart3,
  'heart': Heart,
};
```

`IconProvider` y el componente `Icon` lo ven automáticamente — delegan en `icons.js`.

## Temas (Light/Dark)

Los iconos heredan el color del texto padre mediante `currentColor`. Cuando el usuario cambia de tema:

```css
/* Light.css:  --font-primary-color: #1a1a2e; */
/* Dark.css:   --font-primary-color: #e8e4dc; */
```

El icono cambia solo porque su `stroke` es `currentColor`, que resuelve al `color` del contenedor, que a su vez viene de la variable CSS del tema activo.

Para un color NO heredado:
```js
this._icons.svg('check', 16, 'var(--success-color)')
```

## DOMPurify y SVGs

`HtmlService.sanitize()` (DOMPurify default) **elimina SVGs**. En componentes que usan `svg()` inline:

**❌ No funciona:**
```js
this.$root.innerHTML = this._html.sanitize(`...${this._icons.svg('target')}...`);
```

**✅ Correcto:** innerHTML directo con `esc()` para datos de usuario:
```js
this.$root.innerHTML = `...${this._icons.svg('target')}...${esc(userData)}...`;
```

## Convenciones de tamaño

| Contexto | Tamaño |
|----------|--------|
| Botones (junto al texto) | `16` |
| Iconos standalone (avatar, modo labels) | `14`–`16` |
| Cards de acción (landing) | `20` |
| Usecase/category icons | `24` |
| Toast / alertas | `16`–`24` |
