# Plan — Síntesis de respuestas para modo `texto_libre`

Feature: que la **respuesta elegida** de un tema `texto_libre` pueda ser una
**síntesis** construida a partir de las respuestas de todas las personas (combinar
varias propuestas en una respuesta final compuesta), no solo la adopción literal
de la respuesta exacta de una sola persona.

> Estado de referencia: Fases 0–6 del REDESIGN completas. Este plan se documenta
> antes de tocar código; al terminar la implementación queda el registro de lo
> hecho.
>
> **Estado: ✅ IMPLEMENTADO (Etapas 0–5 completas).** Verificado: lint 0 errores,
> `slice:doctor` 8/8, e2e CompareView 18/18 (incl. nuevo 13.4.4) y ResumenFinalView
> 8/8.
>
> **Ampliación posterior:** tests de export (13.4.5, 14.1.8, 14.1.9) + fix de
> `exportFinal` para preservar la entrada completa de `texto` (esSintesis/fuentes)
> en el JSON "Exportar lista final".
>
> **Cobertura completa (commit `0e93822`):** editar (13.4.6) y quitar (13.4.7) la
> síntesis, vista de resumen renderizada (14.1.10) e import por hash `#consenso=`
> (14.2.2). Fix de flake e2e: `injectPlantilla` (ResumenFinalView.spec.js) reintenta
> la navegación a `/resumen` tras el reload — el `popstate` podía perderse antes de
> que el router registrara su listener. Docs de referencia actualizados: DATA.md
> (§`decisionFinal.texto` entries), FEATURES.md (§TextCompareCards), ARCHITECTURE.md
> (fila ConsensoService + tabla de contextos).

---

## Contexto / problema

Hoy, el consenso de un tema `texto_libre` tiene dos mecanismos **separados**:

1. **"Marcar como elegida"** (`TextCompareCards.js`) → `ConsensoService.setResolutionTexto(temaId, autor, texto)`
   guarda la respuesta **exacta de UNA persona** como `decisionFinal.texto[temaId] = { autor, texto }`.
   No hay forma de combinar.
2. **Notas** (`CompareNotesModal` / `conclave-notas-por-tema-v1`) → libreto de apuntes por tema,
   exportable, pero es un borrador aparte que **no es la respuesta elegida**.

Para opiniones / lluvia de ideas la respuesta final suele ser una **combinación** de las
respuestas de todas las personas → elegir solo una no alcanza. Se mantiene el mecanismo de
notas (borrador) y la adopción simple, y se agrega una **herramienta de síntesis** que escribe
la respuesta elegida compuesta.

## Decisiones de producto

- **Ubicación**: CompareView → tab "Texto libre" (`TextCompareCards`), junto a las cards comparadas.
  (ResumenFinalView solo **muestra** el resultado.)
- **Combinación**: cada "Insertar" pega la respuesta completa de esa persona al final del editor;
  el organizador edita después. Simple y flexible.
- **Coexistencia**: la adopción simple ("Marcar como elegida" de una persona) se mantiene. Ambas
  escriben el mismo `decisionFinal.texto[temaId]`; la síntesis lo hace con `esSintesis: true` +
  `fuentes`.

---

## Etapa 0 — Documentación

- Crear este archivo (`docs/PLAN-SINTESIS-TEXTO.md`) con el plan por etapas.

## Etapa 1 — `ConsensoService` (data model retrocompatible)

`decisionFinal.texto[temaId]` pasa de `{ autor, texto }` a poder ser
`{ autor, texto, esSintesis, fuentes }`:

- `setSintesisTexto(temaId, texto, fuentes)` → guarda
  `{ autor: 'Síntesis del equipo', texto, esSintesis: true, fuentes: string[] }`.
- `hasSintesisTexto(temaId)` → `esSintesis === true` en la entrada.
- `descripcionTextoFinal(entry)` → helper view-model: label a mostrar
  ("Síntesis del equipo · de Ana, Beto, Caro" vs "— Ana").
- `_normalizeRespuestas` (ya filtra por existencia del tema y pasa la entrada completa)
  → **sin migración** ni cambios de import/backup. Toda lectura existente
  (`finalTextoFor`, `exportFinal`, export HTML) sigue usando `entry.texto` / `entry.autor`.

## Etapa 2 — `TextCompareCards` (UI de síntesis)

- Botón **"Redactar respuesta final"** por sección de tema (HTML plano + delegación, mismo
  patrón que `.tcc-pick`). Si ya existe síntesis, el banner muestra "Editar".
- **Modal lazy-build** (patrón `CompareNotesModal`: `_ensureModal` + `_modalPromise`,
  `slice.build('Modal', ...)`, `appendBody` / `appendFooter`, `.open = true`), montado como
  hijo Slice real del componente (regla: nunca componentes Slice dentro de `innerHTML`).
- Body del modal:
  - `EnhancedEditor` (el mismo de `TextoCard`) precargado con el texto final actual.
  - Lista de fuentes: cada persona con su respuesta y un botón **"Insertar"** → pega la
    respuesta completa al final del editor y registra al autor en `fuentes`.
- Footer: **"Guardar como respuesta final"** (→ `setSintesisTexto` con las fuentes insertadas),
  **"Quitar"** (→ `clearResolutionTexto`) y **"Cerrar"**.
- Banner del tema: para síntesis muestra "✓ Final: Síntesis del equipo · (fuentes)" + botones
  "Editar" / "Quitar". La adopción simple ("Elegida: Ana") queda igual; el `is-final` de una
  card se marca solo por adopción literal (la síntesis no coincide con ninguna card).

## Etapa 3 — Resumen + export

- `ResumenFinalView._renderTexto` y `ConsensoService._buildTexto` (export HTML/print) muestran
  el label de síntesis + línea de fuentes cuando `esSintesis`.

## Etapa 4 — CSS

- Estilos `.tcc-synth-*` para el modal, la lista de fuentes, botones insertar y el banner de
  síntesis, siguiendo Sticker Book (outlines + sombra dura, `var(--token)`).

## Etapa 5 — Verificación

- Caso e2e en `CompareView.spec.js` (tests 13.4 de texto libre): redactar síntesis →
  `decisionFinal.texto[tema].esSintesis` persiste y el banner lo muestra.
- `pnpm run lint`, `pnpm run slice:doctor`, `pnpm run dev` + test e2e de CompareView (texto).

---

## Alcance

- **No se toca** `CompareView.js` (1008 líneas) — el feature vive en `TextCompareCards`,
  `ConsensoService`, `ResumenFinalView` y CSS.
- El mecanismo de **notas queda como está** (borrador); la síntesis es la **respuesta elegida**.
- Data model retrocompatible: sin migración de localStorage, sin cambios en import/backup.

## Archivos

| Archivo | Cambio |
|---|---|
| `docs/PLAN-SINTESIS-TEXTO.md` | este plan |
| `src/Components/Domain/ConsensoService/ConsensoService.js` | `setSintesisTexto`, `hasSintesisTexto`, `descripcionTextoFinal`, `_buildTexto`, `exportFinal` (preserva entrada completa) |
| `src/Components/DataDisplay/TextCompareCards/TextCompareCards.js` | botón + modal de síntesis + banner |
| `src/Components/DataDisplay/TextCompareCards/TextCompareCards.css` | estilos `.tcc-synth-*` |
| `src/Components/AppComponents/ResumenFinalView/ResumenFinalView.js` | `_renderTexto` muestra síntesis |
| `src/Components/AppComponents/CompareView/CompareView.spec.js` | casos e2e 13.4.4–13.4.7 (redactar, export lista final, editar, quitar) |
| `src/Components/AppComponents/ResumenFinalView/ResumenFinalView.spec.js` | casos e2e 14.1.8 (HTML export), 14.1.9 (backup JSON), 14.1.10 (vista renderizada), 14.2.2 (import por hash) |
