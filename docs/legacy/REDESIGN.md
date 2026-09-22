# Redesign — Conclave como app de decisiones/ideas genérica

Objetivo: pasar de "asignar personas a equipos" (caso único, vocabulario
generalizado a medias) a una app de **toma de decisiones / lluvia de ideas**
genérica, con **tipos de Tema mezclables**, **atributos custom dinámicos**,
**galería de plantillas**, y un **refactor de arquitectura** (lógica en
servicios, Visual solo UI, sin `utils/`).

Decisiones de producto (acordadas):
- **Modelos coexisten por Tema** (`modo`): `reparto` · `votacion` · `ranking` ·
  `texto_libre`. Una Plantilla puede mezclarlos.
- **Atributos custom dinámicos** por Plantilla. `edad`/`sexo`/`lider` dejan de
  estar hardcodeados; ejemplos de la plantilla "Asignación".
- **Galería de plantillas** de arranque (votación, Sí/No, ideas, asignación,
  ranking, mixta).
- **Operaciones masivas** en el builder: multi-selección + borrar en lote +
  borrar todo.
- **Renombrado Categoría→Tema en UI y código** (contexts, servicios, props,
  storage keys, con migración de localStorage).

---

## PARTE A — Arquitectura (Fase 0, antes de las features)

### A.1 Estructura de carpetas de servicios (`sliceConfig.json` → `paths`)
- **`Core`** (type Service) — infraestructura sin conocimiento de dominio:
  `StoreService`, `HtmlService`, `DomService`, `FileDownloadService`,
  `FetchManager`, `LocalStorageManager`, `IndexedDbManager`, `ChartService`.
- **`Domain`** (type Service) — lógica de negocio: `PlantillaService`,
  `RespuestasService`, `ConsensoService`, `SettingsService`,
  `RespuestasImportService`, `ExportService`, `ComparativaService` (nuevo).
- **`Providers`** (type Service) — wiring + provider-services con Visual propio:
  `Providers`, `ToastProvider`, `ConfirmActionModal`, `DragDropService`.
- Visual sigue en `Visual` / `AppComponents` / `DataDisplay`.

### A.2 Matar `utils/`
- `utils/format.js` → borrar (`esc` vive en `HtmlService`).
- `utils/sliceBuild.js` → borrar (GOTCHAS §5 "no usar").
- `utils/context.js` → `StoreService.ensure/get/set` (wrappers finos sobre
  `slice.context`). Quitar `/utils` de `publicFolders`.

### A.3 Core services nuevos
- **`HtmlService`** — `esc(value)` + `sanitize(html)` (fusiona Format+Sanitize).
  Las vistas cachean la **instancia** una vez (`this._html = getComponent(...)`)
  — sin `.bind`, sin doble `getComponent`. El `innerHTML = this._html.sanitize()`
  se queda **explícito en la vista** (nada de `setHtml` mágico).
- **`StoreService`** — `ensure(name, initial, key)`, `get(name)`,
  `set(name, updater)`, `watch(name, cmp, cb, selector)`. Los servicios de
  dominio lo consumen; **`ensure` se llama UNA vez en el `init()`** de cada
  servicio (no en cada método — hoy hay ~40 llamadas defensivas). Verificar
  boot order antes de quitar las repetidas.
- **`DomService`** — dueño de `reconcile()` (ver B, contrato de refresco).

### A.4 Vocabulario de dominio
Estandarizar a **`temaId`/`opcionId`** en TODO el código (hoy conviven
`teamId`/`memberId`/`row.member`). Renombrar `categoria(s)`→`tema(s)` en
contexts, servicios, props, storage keys. Migración de localStorage por
`StoreService` (leer clave vieja, mapear, escribir clave nueva).

---

## PARTE B — Contrato de componentes y refresco (OFICIAL)

La doc de Slice manda: **usar el mecanismo más liviano que sirva**
(prop setter → `update()` → context → events → destroy+recreate). El
`innerHTML = string` es el patrón MÁS pesado y **leakea** si adentro hay
componentes Slice (GOTCHAS §7) → prohibido en regiones con componentes.

### B.1 Ciclo de vida de una vista/contenedor
- **`.html`** = shell estático (adjuntado en el constructor con
  `attachTemplate`).
- **`init()`** (corre UNA vez — es la frontera once-only): cachear refs, montar
  **componentes atómicos fijos** (Buttons/Inputs del chrome), wire de
  `watch`ers, y **primer paint** llamando al **privado `_render()`** (NUNCA
  `this.update()` — GOTCHAS §4). `_buildShell()` separado es **opcional**
  (solo si `init()` se agranda); no hace falta para el once-only.
- **`update()`** (revisitas cacheadas / parent / watcher) → delega en el mismo
  **`_render()`**. No se llama en el primer build.
- **`_render()`** (privado, compartido por init/update/watch): setters +
  `reconcile` + `textContent`.
- **Nombre unificado**: el privado de repintado se llama **`_render()`** en
  todas las vistas.

### B.2 Cómo refrescar una instancia (prop por prop SIEMPRE)
| Situación | Herramienta |
|---|---|
| 1 prop independiente | setter crudo `node.x = v` |
| varios props independientes | `slice.setComponentProps(node, {...})` |
| props **interdependientes** (B depende de A) o refresh con **async/builds** | el componente define `update(props)` coordinado; el parent llama `await node.update(props)` |
| texto puro | `el.textContent = …` |
| HTML plano, **cero** componentes Slice | `innerHTML` (única excepción; se convierte si mañana lleva un componente) |

`reconcile` es **prop-por-prop aplicado a una lista** (build nuevos / refrescar
existentes / destruir sobrantes) — no compite con prop-por-prop, lo usa por
dentro.

### B.3 `DomService.reconcile` — order-safe, leak-safe
```js
async reconcile(container, items, { keyOf, component, props, refresh }) {
  const applyRefresh = refresh || ((n, p) => slice.setComponentProps(n, p));
  const alive = new Set();
  const ordered = [];
  for (const item of items) {
    const sliceId = keyOf(item); alive.add(sliceId);
    let node = slice.getComponent(sliceId);
    if (node) await applyRefresh(node, props(item));                       // existe → prop por prop
    else node = await slice.build(component, { sliceId, ...props(item) }); // nuevo → build
    if (node) ordered.push(node);
  }
  // prune (destroy real, nunca innerHTML='')
  for (const el of Array.from(container.children)) {
    const id = el.getAttribute('slice-id');
    if (id && !alive.has(id)) slice.controller.destroyComponent(id);
  }
  // orden del DOM = orden de items (mover NO clona → leak-safe §6; solo mueve desalineados)
  ordered.forEach((node, i) => {
    if (container.children[i] !== node) container.insertBefore(node, container.children[i] || null);
  });
}
```
- El **array `items` es la única fuente de verdad del orden visual** (newest-first,
  campo `orden`, re-sort, drag → reordenás el array y el DOM lo refleja).
- `refresh` opcional → `(n,p) => n.update(p)` cuando el hijo coordina props
  interdependientes / rebuild de sus hijos.
- Para el build inicial visible al analyzer, respetar patrón inline (GOTCHAS §5).

### B.4 Visual = solo UI
Las vistas NO computan dominio: piden **view-models** a servicios y mapean
data→markup. Caso grande: `CompareView` (588 líneas) → extraer
`ComparativaService` que devuelve las matrices/tallies; la vista solo pinta.
Formateo de atributos (`'M'→'Masculino'`, etc.) → servicio, no vista.

---

## Modelo de datos objetivo (features)

`plantilla` → `{ nombre, atributos, temas, opciones }`
- `atributos`: `[{ key, label, type:'texto'|'numero'|'lista'|'siNo', opciones? }]`
- `temas` (ex `categorias`): `modo` ∈ `reparto` (ex `seleccion`) · `votacion` ·
  `ranking` · `texto_libre`.
- `opciones`: `temaId` opcional. `null` = pool global (reparto); no-null =
  pertenece a ese Tema (votación/ranking). `meta` = valores de atributos por
  `key` + `fijo`/`rolFijo`/`lider`.

`respuestas` → `{ seleccion, texto, voto, ranking }`
- `voto`: `{[temaId]: opcionId}` · `ranking`: `{[temaId]: opcionId[]}`.

`decisionFinal` espeja `voto`/`ranking`.

Migración (una vez, `StoreService`, respetando GOTCHAS §20): `seleccion→reparto`,
`temaId:null`, `atributos:[]`, `categoria*→tema*`, storage keys nuevas.

---

## Fases

- [x] **Fase 0 — Arquitectura** (Parte A + B): COMPLETA (falta boot-check).
  - [x] Core services (`StoreService`/`HtmlService`/`DomService`) creados,
    registrados (`sliceConfig` cat. `Core` + `components.js`), booteados 1º.
  - [x] `HtmlService` adoptado en 9 vistas; `FormatService`+`SanitizeService`
    eliminados.
  - [x] `ensureContext` consolidado (1x en init, 5 servicios); `utils/` borrado
    (`context/format/sliceBuild`); `/utils` fuera de `publicFolders`.
  - [x] Rename **Categoría→Tema** (código+UI+data, 458 reemplazos/33 archivos):
    métodos, props, `CategoriaRow→TemaRow`, `PorCategoriaView→PorTemaView`
    (carpetas+tags+`customElements.define`), copy de UI (género + colisión
    "temas"=topics), migración `plantilla.categorias→temas` en `_ensure`.
    58/58 sintaxis OK.
  - [x] Vocabulario legacy `team/teams/teamId/member/members` (incl. camelCase
    `_renderTeamView`, clases CSS `.team-card`, var `--team-color`) →
    `tema*/opcion*`. `asignaciones` se dejó como alias benigno de view-model
    (= `seleccion`; además es palabra española en copy). 58/58 sintaxis OK.
  - [x] `_render()` unificado (`_paint`/`_layout`/`_refresh` → `_render` en las
    7 vistas; `update()` delega).
  - [x] Servicios movidos a `Core` (infra) / `Domain` (negocio) / `Providers`
    (wiring + UI-providers); `Service`/`AppServices` eliminados; `sliceConfig`
    + `components.js` actualizados; 51/51 componentes resuelven a su archivo.
  - Nota: `DomService.reconcile` y el contrato de refresco (Parte B) quedan
    LISTOS como servicio; las vistas viejas se migran a `reconcile`/shell-once
    cuando se tocan por features (estricto para lo nuevo, oportunista para lo
    viejo — como acordamos).
- [x] **Fase 1 — Fundación de datos**: COMPLETA.
  - modo `seleccion→reparto` + nuevos `votacion`/`ranking`; migración one-shot
    en `_ensure` (categorias→temas, seleccion→reparto, temaId:null, atributos:[])
    que corre ANTES del check de validez (no borra datos de usuarios viejos).
  - `opciones.temaId` (null=pool reparto; no-null=dueño votacion/ranking).
  - `plantilla.atributos` + CRUD (`addAtributo`/`updateAtributo`/`removeAtributo`).
  - helpers `getTemasVotacion/Ranking`, `getOpcionesPool/DeTema`, `getAtributos`.
  - bulk `removeTemas/removeOpciones/clearTemas/clearOpciones` (con cascada de
    opciones dueñas + cleanup).
  - `RespuestasService` + `ConsensoService`: estado + setters `voto`/`ranking`.
  - `_cleanupOrphaned` limpia `voto`/`ranking` en respuestas y decisionFinal.
  - export/import de Plantilla incluye `atributos`.
  - UI: builder modo "Selección"→**"Asignación"** (value `reparto`), dashboard
    "N de asignación", filtro. Los modos `votacion`/`ranking` NO se ofrecen aún
    en el builder (sin vista de respuesta todavía → Fase 2/4).
- [x] **Fase 2 — Modo `votacion` end-to-end + bulk ops**: COMPLETA.
  - [x] **Bulk ops** en el builder: checkbox de selección por row
    (`TemaRow`/`OpcionRow` exponen `selected`), barra "Borrar seleccionados (N)"
    (delegación de `change` en la lista), y "🗑 Borrar todo" por sección. Usan
    `removeTemas/removeOpciones/clearTemas/clearOpciones` + `confirm:request`.
  - [x] Builder anidado: modo `votacion` en `TemaRow` con editor de Opciones
    dueñas inline (add/list/remove con `temaId`); la lista global de Opciones
    del builder muestra solo el pool (`getOpcionesPool`).
  - [x] Vista de respuesta `votacion` (`RespuestasVotacionView` — "elegí una",
    una card por tema) integrada en los kind-tabs de `RespuestasView`
    (Asignación/Votación/Texto libre, se muestran según disponibilidad).
    Dashboard incluye "N de votación".
  - [x] Modelo de opciones aclarado en el builder: la sección global pasó a
    **"Pool de Asignación"** (el pool compartido de `reparto`), y **solo se
    muestra si hay ≥1 Tema de Asignación**. Una Plantilla de solo
    votación/ideas muestra únicamente Temas, cada uno editando sus opciones
    inline. (`temaId` null = pool; no-null = dueño del tema.)
  - [x] Comparación de `votacion` en CompareView: kind-tab "Votación",
    tally por tema (barras + conteo), mayoría sugerida y decisión final
    manual (★) vía `ConsensoService.setResolutionVoto`/`clearResolutionVoto`.
    `RespuestasImportService` ahora preserva/normaliza `voto` (y `ranking`) al
    importar; `exportFinal` los incluye.
- [x] **Fase 3 — Atributos custom dinámicos**: COMPLETA.
  - `plantilla.atributos` = campos custom `{key,label,type,opciones?}`;
    `DEFAULT_ATRIBUTOS` (sexo/edad) es solo el ejemplo del seed "Asignación".
    Migración adopta sexo/edad para datos viejos (no orfandad).
  - Editor de atributos en el builder (agregar/renombrar/tipo/opciones de
    lista/quitar) reemplaza los toggles sexo/edad.
  - `OpcionRow` genérico: un campo por atributo (texto/número/lista/sí-no,
    plain-HTML, shell-once + sync-if-not-focused) escribiendo `meta[key]`.
  - Helpers `PlantillaService.getOpcionAtributos`/`formatAtributo` (view-model).
  - Retirados los consumidores hardcodeados: `SettingsService` sin
    `sexoEnabled/edadEnabled`; tags genéricos en MisRespuestas/CompareCarousel;
    quitados dot de sexo (OpcionChip), cards Hombres/Mujeres + dot (Dashboard),
    conteos M/F (PorTema); CSV de Compare exporta todos los atributos.
  - Nota: quedó CSS muerto de sexo/gender (selectores sin match, inofensivo) →
    barrer en Fase 6.
- [x] **Fase 4 — Modo `ranking` end-to-end**: COMPLETA.
  - Builder: modo `ranking` en `TemaRow` reusando el editor de opciones dueñas
    (votación/ranking comparten `ownsOpciones`).
  - Respuesta: `RespuestasRankingView` — lista ordenable con ▲▼ por tema,
    `setRanking(temaId, opcionId[])`; orden efectivo = guardado + faltantes.
  - Comparación: kind-tab "Ranking" en CompareView con agregación **Borda**
    (puntos por posición) → orden sugerido por mayoría, "Adoptar" fija el orden
    final (`ConsensoService.setResolutionRanking`).
  - Integrado en kind-tabs de Responder y Comparar; dashboard "N de ranking".
  - `RespuestasImportService`/`exportFinal`/cleanup ya manejaban `ranking`
    (Fase 1/2).
- [x] **Fase 5 — Galería de plantillas**: COMPLETA.
  - `src/data/presets.js`: 6 presets (asignación, votación, **Sí/No**, ideas,
    ranking, **mixta**) — cada uno un payload `{nombre, atributos, temas,
    opciones}` completo con ids safe.
  - Galería en el builder (`<details>` "Empezá desde una plantilla de ejemplo")
    con cards; al elegir carga vía `prepareImport` + `loadFromData`
    (confirm-of-impact si la Plantilla no está vacía).
  - `_impactOfReplacing` ahora cuenta también voto/ranking huérfanos.
  - Intro del builder actualizado a los 4 modos.
- [x] **Fase 6 — Landing + docs + pulido UI/UX**: COMPLETA.
  - Docs al día: `DATA.md` reescrito, `ARCHITECTURE.md`/`FEATURES.md` bloque
    post-Fase-3, `COMPONENT-PATTERNS.md`, `GOTCHAS §23–26`, `AGENTS.md`.
  - **Landing** reencuadrada a decisiones grupales: hero + tira de composición
    (badges por modo) + 4 CTAs + "cómo funciona" + 4 casos = los 4 modos.
  - **CSS muerto barrido** (sexo/gender). Tokens `--male/female-color` quedan
    en Themes sin uso (inofensivo).
  - **CompareView**: tabs primary/secondary con más aire; votación/ranking en
    grid. **Pantalla completa para texto**: `RespuestasTextoView` (editor ⛶,
    autosave debounced) y `TextCompareCards` (lectura ⛶); layout de texto más
    espacioso.

## Componentes compartidos nuevos
- **`Tabs`** (Visual, del registry, reskineado a Sticker Book): segmented
  control con prop `variant` (`primary` = hero con borde de tinta + sombra
  dura; `secondary` = nested sutil). API `items:[{id,label}]` + `activeTab` +
  `onChange(id)`. Reemplazó las filas de botones hechas a mano en
  `RespuestasView` y `CompareView` (borra su CSS/JS de tabs duplicado). El
  contenedor lleva UN borde de tinta (hero-por-grupo), no una pill por botón
  (que el DESIGN.md desaconseja para elementos repetidos).
- **Fix infra:** `api/index.js` SPA fallback migrado a `res.sendFile('index.html',
  { root })` — Express 5 rechaza la ruta absoluta con "Not Found" (era el 500).

## Invariantes
- Lenguaje visual "Sticker Book" (`DESIGN.md`): sin gradientes, outlines +
  sombras duras **selectivas**, Fredoka + Plus Jakarta Sans.
- IDs por `isSafeId` (trust boundary de import).
- `[hidden]` companion rule al ocultar (GOTCHAS §18).
- Parches de componentes de registry en su propio `.css` (§14).
