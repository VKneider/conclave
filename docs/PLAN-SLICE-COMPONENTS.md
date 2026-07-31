# Plan: migrar HTML crudo a componentes Visuales Slice

Reemplaza los `<button>` / `<select>` / `<input>` nativos de las **vistas de acción** por componentes del registro (`slice.build('Button'/'Select'/...)`), reskineados al Sticker Book. Marketing/estático y micro-controles por-item NO se migran (ver "Lo que NO se migra").

> Ejecutar en orden de fases. Verificar al final de cada fase (`slice:types`, `slice:doctor`, `lint`, build + revisión visual) antes de pasar a la siguiente.

## 0. Precondición verificada

Los componentes del registro ya están reskineados a Sticker Book en su propio `.css` (Button, Input, Select, Switch, Checkbox, Tabs, Modal, EmptyState, ThemeSwitcher, DropDown). `StatusBadge` usa las clases globales `.badge` (intencional). No hay que tocar skins.

## 1. Cambios al componente `Button` (nuevas capacidades)

El Button del registro hoy solo tiene `variant: filled|outlined|ghost|soft`, sin tamaño e icono fijo a 20px. Para cubrir `.btn-sm` y `.btn-danger` se agregan:

1. **`variant: 'danger'`** — en `Visual/Button/Button.js`:
    - `static props.variant.allowedValues` → añadir `'danger'`.
    - `set variant` (`const allowed = [...])` → añadir `'danger'`.
    - `Button.css`: `.slice_button--danger { background: var(--danger-color); color: var(--danger-contrast); border-color: var(--font-primary-color); }` (hover/active heredan de `.slice_button:hover/:active` — tinta + sombra dura, igual que `.btn-danger`).
2. **`size: 'md' | 'sm'`** — nueva prop (default `'md'`), setter que agrega la clase `slice_button--sm`. `Button.css`: `.slice_button--sm { padding: 6px 12px; font-size: 12px; border-radius: 8px; box-shadow: 2px 2px 0 var(--font-primary-color); }` (mismas medidas que `.btn-sm`).
3. **`icon` respeta `size`** — en `Button.js`: `update()` usa `size: this._icon.size || '20'`, y `set icon` re-aplica `this.$icon.size` si viene. Así un botón puede pedir `icon: { name: 'x', size: '14' }`.

## 2. Patrón de montaje (obligatorio)

Convención única para todos los reemplazos:

- **En el `.html`** quedan **slots persistentes** (`<span class="x-slot"></span>` / div con `id`) en el punto donde va el control.
- **En `init()`** se construyen los hijos estáticos con `slice.build(...)` y se montan con `this.$slot.appendChild(component)`. **NUNCA `replaceWith`** (el slot es el mount point fijo) y **nunca innerHTML** para montar.
- Los handlers se pasan como prop `onClick` del componente en `init()` (los refs/`onclick` que hoy viven en el constructor se mueven ahí, porque el componente solo existe post-`init`).
- El **primer paint** sigue siendo `this._render()` llamado desde `init()` (GOTCHAS §4); `update()` delega a `_render()`.
- Un botón cuyo estado cambia (activo/label con conteo) se actualiza **por setter** (`btn.variant = ...`, `btn.value = ...`) — no se reconstruye.
- Para ocultar un botón se togglea `hidden` en su **contenedor**, no en el componente.
- Regla dura: **nunca meter componentes Slice en una región que se re-renderiza con innerHTML**. Si el control vive en una región dinámica, se extrae la región a slot build-once, o se queda nativo con delegación (ver §Lo que NO se migra).

## 3. Migración por archivo

### Fase 1 — `PlantillaBuilderView` (9 botones + 1 select) ✅ HECHA

Los 9 botones están en el `.html` estático; convertir a Button y montar en `init()`. Quitar del `init()` los `.innerHTML` de iconos (hoy líneas ~165-169) → los iconos van por prop.

> Notas de implementación: el `.html` dejó slots `<span id="…Slot">`; los `onClick` se pasaron como prop en `init()`; el `<select>` nativo `#atribAddType` se reemplazó por un `Select` de registro (`visibleProp:'text'`) cuyo getter `value` en single-select devuelve el objeto de la opción (leer `chosen.value`, no `[0]?.value`). El spec e2e se actualizó a los nuevos selectores (`#addCatBtnSlot .slice_button`, `#atribAddTypeSlot .slice_select_container`, etc.). CSS local de `.pb-clear-all`/`.pb-bulk-delete` reducido a `margin-left:auto` (color/medidas ahora vienen del Button: `variant:'danger'`, `size:'sm'`, `customColor:{text:'var(--danger-color)'}`).

| Elemento actual                                  | Componente | Props                                                                                                                                                                                                                                                      |
| ------------------------------------------------ | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `#sharePlantillaBtn` (btn-primary)               | Button     | `variant:'filled'`, `icon:{name:'share-2'}`, `onClick: () => slice.getComponent('sharePlantillaModal').show()`                                                                                                                                             |
| `#importPlantillaBtn` (btn-ghost)                | Button     | `variant:'ghost'`, `icon:{name:'upload'}`, `onClick: () => this.$importFile.click()`                                                                                                                                                                       |
| `#catClearAll` / `#opcClearAll` (btn-ghost)      | Button     | `variant:'ghost'`, `icon:{name:'trash-2',color:'var(--danger-color)'}`, `onClick: () => this._confirmClear('temas'/'opciones')`                                                                                                                            |
| `#catBulkDelete` / `#opcBulkDelete` (btn-danger) | Button     | `variant:'danger'`, `onClick: () => this._confirmBulkDelete('temas'/'opciones')`                                                                                                                                                                           |
| `#addCatBtn` / `#addOpcBtn` (btn-primary)        | Button     | `variant:'filled'`, `icon:{name:'plus'}`, pasarlo a `_bindAddInput(addCatInput, this.$addCatBtn, ...)`                                                                                                                                                     |
| `#atribAddBtn` (btn-ghost)                       | Button     | `variant:'ghost'`, `onClick: () => this._addAtributo()`                                                                                                                                                                                                    |
| `#atribAddType` (select nativo)                  | Select     | `options:[{text:'Texto',value:'texto'},{text:'Número',value:'numero'},{text:'Lista',value:'lista'},{text:'Sí/No',value:'siNo'}]`, `visibleProp:'text'`, default `[{text:'Texto',value:'texto'}]`; leer `this.$atribType.value[0]?.value` en `_addAtributo` |

Queda nativo: `<input type="file">` de import, `#atribAddLabel` (campo inline), las pills de filtro `.pb-filter-btn`, las cards de preset `.pb-preset`, y el `<summary>` del gallery.

### Fase 2 — `ConfirmActionModal` (limpieza del hack danger) ✅ HECHA

Hoy `_open()` usa `customColor: { background:'var(--danger-color)', text:'var(--danger-contrast)' }` para el botón danger y resetea manualmente los estilos inline cuando no. Simplificar: `danger ? this.$confirmBtn.variant = 'danger' : this.$confirmBtn.variant = 'filled'`. Elimina el reset manual y el uso de `customColor` de este modal. *(Hecho: el toggle por variante dejó de ensuciar estilos inline residuales.)*

### Fase 3 — `RespuestasTextoView` (1 botón) ✅ HECHA

| Elemento                                 | Componente | Props                                                                |
| ---------------------------------------- | ---------- | -------------------------------------------------------------------- |
| `#rt-fs__close` ("✕ Cerrar", fullscreen) | Button     | `variant:'outlined'`, `size:'sm'`, `icon:{name:'x',size:'14'}`, `onClick: () => this._closeFs()` |

> Nota: se usó `outlined` + radio píldora (override `.rt-fs__close-slot .slice_button { border-radius:999px }`) para conservar el look del botón original (píldora con borde+sombra), no `ghost` como decía el plan.

Quedan nativos: los 3 `.rt-mode-btn` (segmented control con glifos ▦▬▬▬, toggle de modo).

### Fase 4 — `CompareView` (toolbar de la tabla) — complejidad alta ✅ HECHA

El `.cmp-dynamic` se re-renderiza entero por innerHTML en cada interacción. Estrategia: **extraer la toolbar (`res-bar` + `.cmp-filters`) a slots build-once** por encima de `.cmp-dynamic` y dejar la **tabla como innerHTML puro** (sin componentes Slice adentro).

- Los botones se construyen una vez en `init()` y su estado se actualiza por setter desde `_renderOpcionView` (labels con conteos, variante activa).
- Los handlers se mueven de `_bindTableInteractions`/`_bindTemaInteractions` a los `onClick`.

| Elemento (hoy en innerHTML)                                 | Componente | Props                                                                                            |
| ----------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------ |
| `#btnFillSug` "Autocompletar…" (btn-sm)                     | Button     | `size:'sm'`, `onClick` → confirm + `fillAllWithSuggestion(rows)`                                 |
| `#btnClearRes` "Vaciar decisiones" (btn-sm)                 | Button     | `size:'sm'`, `variant:'danger'`, `onClick` → confirm + `clearAll()`                              |
| `#btnExportFinal` (btn-sm btn-primary)                      | Button     | `size:'sm'`, `variant:'filled'`, `onClick: () => resolution.exportFinal(rows)`                   |
| `#btnTemaView` / `#btnOpcionView` (btn-sm)                  | Button     | `size:'sm'`, `onClick` → cambia `cmpView` + `_render()`                                          |
| `#btnExportCmp` "Exportar comparación…" (btn-sm)            | Button     | `size:'sm'`, `onClick: () => this._exportComparisonCSV(all, rows)`                               |
| 4 pills de filtro `[data-f]` (btn-sm, activa = btn-primary) | Button     | `size:'sm'`, `variant` toggle `filled`/`outlined` según `cmpFilter`, label con conteo por setter |

Quedan nativos (por-fila / por-tabla dentro de la región innerHTML): `#svcFilter` (select Tema), los `final-select` de cada fila, `#svcFilterClear` (linkish), star/pick/clear de votación/ranking (`data-vt-*`, `data-rk-*`), tabla, stat-cards. La región sigue siendo markup puro → innerHTML + delegación válida.

> Notas de implementación: toolbar persistente (`#cmpResBar` + `#cmpFilters`) en `.html` fuera de `.cmp-dynamic`; los botones viven en slots `<span class="cmp-tb-btn">`. El `#svcFilter` nativo se movió al toolbar persistente y `_populateSvcFilter()` lo rebuild con guard `_svcFilterKey` (solo si cambian los ids de Tema). Visibilidad de la toolbar por `_setTableToolbarHidden()` (toglea `hidden` en los slots; `[hidden]{display:none}` necesario porque el `display:inline-block` de slice-button pisa el atributo). `_renderOpcionView`/`_renderTemaView` guardan `_lastAll`/`_lastRows`/`_lastTema` y llaman `_syncTableToolbarOpcion(rows)`/`_syncTableToolbarTema()`. La toolbar se muestra siempre que hay filas (con o sin decisiones).

> Esta fase es la de mayor riesgo (vista principal, muchos estados). Hacerla al final, de a un botón por vez, revisando visualmente.

### Fase 5 — `CompareCarousel` (toolbar) — complejidad media ✅ HECHA

Mismo patrón: extraer los 4 `.cc-filter-btn` + `#ccTemaFilter` a slots build-once; flechas `.cc-arrow` y dots quedan raw (por-item en la región re-renderizada).

| Elemento                      | Componente | Props                                                                                          |
| ----------------------------- | ---------- | ---------------------------------------------------------------------------------------------- |
| 4 `.cc-filter-btn`            | Button     | `size:'sm'`, `variant` toggle `filled`/`outlined` según `_filter`, `onClick` → `_filter = ...` |
| `#ccTemaFilter` (select Tema) | Select     | opciones dinámicas por setter, `visibleProp:'text'`, `onChange` → `_temaFilter`                |

Quedan nativos: `.cc-arrow` (‹ ›), `.cc-dot`, `cc-final-select` por fila, stat-cards.

> Notas de implementación: slot `#ccFiltersSlot` en `.html` fuera de `.cc-dynamic`; `init()` construye 4 pills + Select `ccTemaFilter` (default `{text:'Todos los temas',value:''}`). `_render()` actualiza labels/variantes por setter y rebuilds las opciones del select solo si cambian los ids (`_lastTemaIds`), preservando el valor aplicado (`_lastTemaApplied`) para no resetear la selección. CSS: pills compactas pill-shape sin sombra + `.cc-filters[hidden]{display:none}`.

### Fase 6 (opcional) — Botones de fila ✅ HECHA

- `TemaRow.html`: `#cat-row__opc-add-btn` (btn-primary "Agregar" de votación) → Button `variant:'filled'`, `size:'sm'`, `icon:{name:'plus',size:'14'}`, conectado al `addOpc`. *(Hecho: slot `.cat-row__opc-add-btn-slot` + Button `sliceId:'trOpcAdd'` en `init()`, `onClick: () => this._addOpc()`; el closure inline se convirtió en método `_addOpc()`.)*
- Los micro-controles ghost de filas (`toggle`/`remove`/`move-up`/`move-down` en TemaRow/OpcionRow/CategoriaRow) quedan como están (icono+texto pequeños, muchos por lista). Si se migran, migrar TODOS a la vez para no mezclar look.

## 4. Lo que NO se migra (y por qué)

| Elemento                                                                                                                                                                                                                               | Razón                                                                                                                                              |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `LandingView` (CTAs, usecase cards)                                                                                                                                                                                                    | Marketing/estático; regiones innerHTML puro + delegación `data-href` (COMPONENT-PATTERNS §UI patterns).                                            |
| Flechas/pills/micro-botones en listas re-renderizadas (`MisRespuestasView` ‹›/pills/lider-toggle; `RespuestasRankingView` ▲▼; `CompareCarousel` flechas/dots; `TextCompareCards` `tcc-pick`/`tcc-read`; `CompareView` star/clear/pick) | Controles por-item dentro de regiones innerHTML puro con delegación de eventos; convertirlos exige reconciliar cada fila. Documentado como válido. |
| `<input type="file">` (PlantillaBuilderView, ResumenFinalView, UserMenu)                                                                                                                                                               | No hay componente de registro equivalente.                                                                                                         |
| `<textarea>` (CompareNotesModal, CompareView import por URL)                                                                                                                                                                           | Ídem.                                                                                                                                              |
| `TopBar` hamburger, `UserMenu` avatar trigger                                                                                                                                                                                          | Triggers con forma propia (3 líneas / círculo-avatar), no son sticker buttons.                                                                     |
| `TopBar` `.tabs` nav                                                                                                                                                                                                                   | Chrome de rutas con estilo propio; el `Navbar` del registro no encaja 1:1. Opcional a futuro.                                                      |
| Selects por-fila de tablas (`final-select`, `cc-final-select`, `svcFilter`)                                                                                                                                                            | Viven dentro de la tabla innerHTML; un Select de registro por fila requiere reconciliar la tabla.                                                  |
| Cards/markup de display (stat-cards, tablas, badges, presets)                                                                                                                                                                          | Markup puro — innerHTML sanitizado es la herramienta correcta.                                                                                     |

## 5. Regla de decisión (para añadir a `docs/COMPONENT-PATTERNS.md`)

> **Control Slice** = `slice.build('Button'|'Select'|'Input'|'Checkbox'|'Switch'|'Tabs'|'Modal'|...)`. Usarlo cuando el control es **estático (mount-once en `init()`)** o vive en una región manejada por `reconcile`. **Nativo** se permite solo para: (a) control por-item dentro de una región de markup puro con delegación de eventos; (b) trigger con forma propia (hamburger, avatar, glifos); (c) `<input type="file">` / `<textarea>` sin equivalente; (d) cards/links. Un control Slice nunca se monta ni se destruye dentro de un `innerHTML`.

## 6. Verificación (por fase y al final)

1. `pnpm run slice:types` — regenera `slice-build.generated.d.ts` (nuevas props de Button: `size`, etc.).
2. `pnpm run slice:doctor`.
3. `pnpm run lint` (espera 0 errores).
4. `pnpm run build`.
5. Revisión visual manual (`pnpm run dev`, puerto 3001) por vista: hover/press (sombra dura), foco, densidades y layouts flex que alojan `slice-button`/`slice-select` (los componentes son `inline-block`/`block` — revisar gaps y `gap` de las filas).
6. Si alguna fase cambia medidas/iconos, comparar contra la captura anterior antes de mergear.
