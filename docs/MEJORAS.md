# Mejoras potenciales

Análisis de oportunidades recolectado en julio 2026 — bugs, UI/UX, nuevos casos de uso, deuda técnica.

---

## Bugs / pendientes

| Prioridad | Ítem | Localización | Notas |
|---|---|---|---|
| Alta | Overflow de tabla en CompareView en mobile | `CompareView.js` `_renderOpcionView` / `_renderTemaView` | Sin scroll horizontal, en pantallas angostas los datos se salen del viewport. Agregar `overflow-x: auto` + indicador visual "deslizá". |
| Alta | Manejo de foco en carrusel al avanzar | `MisRespuestasView.js` | Tras navegar (‹ › / teclado / dots), el foco no se mueve al nuevo set de pills de la opción activa. Usuario de teclado debe tabear todo. |
| Media | API de toasts inconsistente | `CompareView.js:158` vs `CompareView.js:1822` | A veces usa `ToastProvider.show()`, a veces `slice.events.emit('toast:show', ...)`. Unificar en una sola vía. |
| Media | Animaciones faltantes en votación/ranking | `RespuestasVotacionView.js`, `RespuestasRankingView.js` | El carrusel tiene `pillAssignPop` (bounce). Votación cambia clase instantáneamente, ranking mueve ítems sin transición. Agregar un scale/bounce al seleccionar voto y slide al reordenar ranking. |
| Baja | Tokens `--male-color` / `--female-color` muertos | `Light.css`, `Dark.css` | Sobrante de Fase 2 (sexo hardcodeado). Ya no se referencian desde ningún CSS. |

---

## Deuda técnica

| Prioridad | Ítem | Localización | Notas |
|---|---|---|---|
| Alta | **CompareView: 1008 líneas** | `CompareView.js` | Archivo más grande por mucho. REDESIGN.md ya identificó extraer `ComparativaService` pero nunca se hizo. Maneja 6 sub-vistas distintas en un solo archivo. |
| Media | **Lógica de notas duplicada** | `CompareView.js:246-293`, `ResumenFinalView.js:84-116` | ~50 líneas casi idénticas de load/save/persist de notas en localStorage, misma clave `conclave-notas-por-tema-v1`. Mover a un Core o Domain service. |
| Baja | `var` en `ConsensoService` | `ConsensoService.js:224-227,231,306-320` | Usa `var` en medio de código ES6 moderno. Pasar a `const`/`let`. |
| Baja | `innerHTML` para sub-vistas grandes | `CompareView.js` `_renderVotacion`, `_renderRanking`, `_renderOpcionView`, `_renderTemaView` | Strings HTML enormes, más duros de mantener y testear que componentes Slice. |
| Baja | CSS de impresión/export duplicado | `RespuestasService.js:365`, `ConsensoService.js:292` | Estilos inline en strings JS que duplican el design system. Si cambia el tema sticker book, no se actualizan. |

---

## UI / UX polish

### Animaciones
- **Votación**: las pills de `RespuestasVotacionView` cambian clase `vv-opc--chosen` sin transición. Un bounce como el `pillAssignPop` del carrusel daría feedback inmediato.
- **Ranking**: los botones ▲▼ intercambian ítems sin animación. Un slide del ítem hacia arriba/abajo mejoraría la percepción. Alternativamente: drag-to-reorder reusando `DragDropService`.

### Estado vacío
- `CompareView` construye sus propios divs `.empty-state` con HTML. Existe un componente `EmptyState` reutilizable que no se usa ahí. Unificar.

### Fullscreen
- `RespuestasTextoView` tiene overlay fullscreen para el editor. `CompareView` tiene otro fullscreen para toda la vista. Difieren en estilo y en forma de cierre (Escape vs botón). Compartir patrón.

### Responsive / mobile
- **Tabla comparativa**: overflow horizontal sin indicación. Agregar gradiente de scroll como pista.
- **Flechas del carrusel**: los caracteres `‹` `›` son targets de tap muy pequeños en mobile. Agrandar a botones de mínimo 44px.
- **Teclado móvil + overlay fullscreen**: en `RespuestasTextoView`, el overlay fixed pierde scroll cuando se abre el teclado virtual.

### Accesibilidad
- **Sin regiones `aria-live`**: las actualizaciones dinámicas (avance de carrusel, refresco de comparación, toasts) no se anuncian a lectores de pantalla.
- **Indicadores solo-color**: los badges `.ok`/`.over`/`.under` usan solo color de fondo sin icono o texto adicional. OK en el tag de CompareView que sí incluye texto ("Coincide"/"Difiere").
- **Skip navigation link**: no hay "saltear al contenido principal" para navegación por teclado.
- **Focus trapping en modales**: `ConfirmActionModal` no trapea foco explícitamente (aunque el Modal del registry podría hacerlo — verificar).
- **`prefers-reduced-motion`**: `pillAssignPop` y `checkBounce` no tienen el media query guard que sí existe en `UX.md` para otras animaciones.

### Consistencia
- **Landing page estática**: los cards de caso de uso y los pasos son siempre iguales. Podrían reflejar el estado actual ("Tenés 5 opciones sin asignar").
- **Import por URL oculto**: está dentro de un `<details>` en CompareView — poco descubrible.

---

## Nuevos casos de uso

### 1. PWA / offline first (esfuerzo: 1-2 días)
Todo el estado vive en localStorage, no hay servidor. Solo falta:
- `service-worker.js` que cachee los assets
- `manifest.json` con íconos y `display: standalone`
- Registrar el SW en `AppShell.init()`

### 2. Sesión rápida co-locada via BroadcastChannel (esfuerzo: 1 día)
Ver explicación detallada más abajo.

### 3. Galería de plantillas en landing (esfuerzo: medio día)
Hoy los 6 presets están en un `<details>` dentro del builder. Mostrarlos en la landing como jump-start cards, cada una con su descripción. Al clickear, navegar a `/plantilla` con el preset precargado (o mostrar confirmación si hay datos).

### 4. Multi-plantilla (esfuerzo: 2-3 días)
Hoy solo se puede tener una plantilla a la vez (importar reemplaza). Una vista de dashboard con lista de plantillas guardadas (abrir, duplicar, borrar) habilitaría a organizadores que manejan múltiples sesiones.

### 5. Votación ponderada (esfuerzo: 2-3 días)
En lugar de un voto por persona por opción, permitir distribuir puntos (ej: 10 puntos a repartir entre opciones). Sería un modo nuevo o una variante de `votacion`.

### 6. Importar opciones desde CSV (esfuerzo: 1 día)
Para organizadores que gestionan listados en Excel/Sheets. Subir CSV mapea columnas a nombre + atributos, crea las opciones en el pool o en el tema activo.

### 7. Filtro por persona en CompareView (esfuerzo: medio día)
Los filtros actuales son por opción (query) y por tema (dropdown). No hay forma de ver solo las respuestas de una persona específica.

### 8. Exportar sesión completa en PDF/HTML (esfuerzo: 1-2 días)
`ResumenFinalView` ya exporta HTML con las decisiones. Un "exportar todo" que combine: descripción de la plantilla + todas las respuestas (por persona) + decisiones finales, en un solo documento.

---

## BroadcastChannel — explicación

`BroadcastChannel` es una API del navegador que permite comunicación entre **pestañas/ventanas/iframes del mismo origen** (mismo `https://dominio`). No requiere servidor ni conexión de red.

### Cómo funciona

```js
// Pestaña A: enviar mensaje
const canal = new BroadcastChannel('conclave-sync');
canal.postMessage({ type: 'respuestas-update', data: respuestas });

// Pestaña B: recibir mensaje
const canal = new BroadcastChannel('conclave-sync');
canal.onmessage = (event) => {
  if (event.data.type === 'respuestas-update') {
    // importar/mergear respuestas
  }
};
```

### Para qué serviría en Conclave

Hoy, dos personas en la misma sala deben: (1) exportar archivo `.respuestas`, (2) compartirlo por mail/USB/mensaje, (3) importarlo. Con BroadcastChannel:

1. **Un organizador abre la plantilla en su máquina.**
2. **Comparte un enlace** (misma URL) a los demás en la sala.
3. **Cada persona abre la misma URL en su propia pestaña** (misma máquina o distintas — si están en la misma red local, también se puede con WebRTC, pero BroadcastChannel es solo misma máquina).
4. **Cuando alguien completa sus respuestas y hace clic en "Compartir"**, la app envía las respuestas por BroadcastChannel.
5. **Las otras pestañas** reciben el mensaje y las importan automáticamente, sin archivos intermedios.

### Limitaciones
- **Solo funciona entre pestañas del mismo navegador en la misma máquina.** No sirve para personas en distintas computadoras (para eso están los archivos `.respuestas` o un servidor).
- Si se quiere sincronizar entre dispositivos en la misma red local, se necesitaría WebRTC o un servidor intermediario (ej: WebSocket, peer.js). Eso escapa al espíritu serverless de Conclave.

### Alternativa complementaria: QR + hash
La app ya tiene QR en los modales de compartir. Si en lugar de (o además de) exportar un archivo, el QR codificara la plantilla + respuestas en un hash de la URL (como ya se hace con `#plantilla=` y `#consenso=`), escanear el QR abriría la app con los datos precargados en otra pestaña — combinado con BroadcastChannel para sincronizar cambios posteriores.

---

## Prioridad sugerida

1. **Alta/bajo esfuerzo**: animaciones votación + ranking, unificar toasts, manejo de foco carrusel, overflow tabla mobile, cleanup tokens muertos.
2. **Alto impacto**: extraer `ComparativaService`, deduplicar notas → reduce deuda y destraba mejoras en CompareView.
3. **Nuevo feature (sesión rápida)**: BroadcastChannel + QR hash existente → killer feature para uso en sala.
4. **Futuro**: PWA, multi-plantilla, galería en landing, CSV import.
