# Casos de uso — Tests E2E

## Progreso

| Sección | Tests planificados | Tests implementados | % |
|---|---|---|---|
| 1. PlantillaBuilderView | 33 | 19 | 58% |
| 2. Navegación | 20 | 18 | 90% |
| 3. Asignación (carrusel) | 12 | 9 | 75% |
| 4. Votación | 4 | 4 | 100% |
| 5. Ranking | 4 | 4 | 100% |
| 6. Texto libre | 8 | 8 | 100% |
| 7. Persistencia | 8 | 0 | 0% |
| 8. Compartir Respuestas | 8 | 0 | 0% |
| 9. Compartir Plantilla | 4 | 0 | 0% |
| 10. Importar Respuestas | 8 | 0 | 0% |
| 11. Importar Plantilla | 5 | 0 | 0% |
| 12. Dashboard | 8 | 8 | 100% |
| 13. CompareView | 17 | 0 | 0% |
| 14. Resumen Final | 7 | 7 | 100% |
| 15. Eventos de Slice | 11 | 0 | 0% |
| 16. Reset / Reiniciar | 4 | 4 | 100% |
| **Total** | **161** | **81** | **50%** |

**Leyenda:** ✅ implementado · ⬜ pendiente

---

## Contextos de Slice (persistencia localStorage)

| Contexto | Key localStorage | Shape |
|---|---|---|
| `settings` | `conclave-settings-v3` | `{ autor, email }` |
| `plantilla` | `conclave-plantilla-v1` | `{ nombre, atributos, temas, opciones }` |
| `respuestas` | `conclave-respuestas-v1` | `{ seleccion, texto, voto, ranking }` |
| `decisionFinal` | `conclave-decision-final-v1` | `{ seleccion, texto, voto, ranking }` |
| `respuestasImportadas` | `conclave-respuestas-importadas-v1` | `[{ autor, respuestas }]` |

---

## 1. Vista Plantilla (PlantillaBuilderView)

### 1.1 CRUD de Temas (reparto, votacion, ranking, texto_libre)

| # | Caso | Pasos | Verificaciones | Estado |
|---|---|---|---|---|
| 1.1.1 | Agregar tema "Logística" modo reparto | Escribir "Logística" en `#addCatSlot` Input, click `#addCatBtn` | Aparece un `.pb-row` con nombre "Logística", modo `reparto` por defecto. Se ve en `#catList`. | ✅ |
| 1.1.2 | Agregar tema modo votación | Click en Select de modo del nuevo tema, elegir "Votación" | Se ocultan campos min/max/capacidad. Aparece editor inline de opciones del tema. | ✅ |
| 1.1.3 | Agregar tema modo ranking | Cambiar modo a "Ranking" | Se ocultan min/max/capacidad. Aparece editor inline de opciones del tema. | ✅ |
| 1.1.4 | Agregar tema modo texto libre | Cambiar modo a "Texto libre" | Se ocultan todos los campos extra. Solo queda nombre y modo. | ✅ |
| 1.1.5 | Editar nombre de tema | Click en el nombre del tema, escribir nuevo nombre, blur | El nombre se actualiza. Al recargar, persiste. | ✅ |
| 1.1.6 | Cambiar modo de tema existente | Cambiar modo de "reparto" a "votacion" | Los campos específicos de reparto se ocultan/muestran según el modo. | ✅ |
| 1.1.7 | Borrar tema con confirmación | Click botón 🗑 en un tema. Confirmar en modal. | El tema desaparece. Si tenía respuestas, se limpian. | ✅ |
| 1.1.8 | Borrar tema cancelando | Click 🗑, click "Cancelar" en modal | El tema sigue visible. | ✅ |

### 1.2 Opciones de votación/ranking (inline por tema)

| # | Caso | Pasos | Verificaciones | Estado |
|---|---|---|---|---|
| 1.2.1 | Agregar opción a tema votación | Estando en modo votación, escribir opción en el input inline + Enter | La opción aparece listada bajo ese tema. | ✅ |
| 1.2.2 | Eliminar opción de tema votación | Click 🗑 en una opción inline | La opción se elimina del tema. | ✅ |
| 1.2.3 | Editar nombre de opción inline | Click en el nombre de la opción, editar, blur | Se actualiza. | ⬜ |

### 1.3 CRUD de Opciones (pool, reparto)

| # | Caso | Pasos | Verificaciones | Estado |
|---|---|---|---|---|
| 1.3.1 | Agregar opción "Juan Pérez" al pool | Escribir en `#addOpcSlot` Input, click `#addOpcBtn` | Aparece en `#opcList`. | ✅ |
| 1.3.2 | Editar nombre de opción | Click nombre, editar, blur | Persiste al recargar. | ✅ |
| 1.3.3 | Marcar opción como "fijo" | Toggle checkbox o botón "fijo" | La opción se marca como fija, no aparecerá en disponibles para asignación. | ✅ |
| 1.3.4 | Borrar opción con confirmación | Click 🗑, confirmar | Opción eliminada. Respuestas que la referenciaban se limpian. | ✅ |
| 1.3.5 | Bulk delete opciones | Checkear 2 opciones, click `#opcBulkDelete`, confirmar | Ambas se eliminan. | ⬜ |
| 1.3.6 | Borrar todas las opciones | Click "Borrar todo" en sección opciones, confirmar | Se vacía la lista. | ⬜ |

### 1.4 Atributos personalizados

| # | Caso | Pasos | Verificaciones | Estado |
|---|---|---|---|---|
| 1.4.1 | Agregar atributo tipo texto | Escribir label "Teléfono", seleccionar type "texto", click "+ Agregar" | Aparece en `#atribList`. Cada opción muestra campo para ese atributo. | ✅ |
| 1.4.2 | Agregar atributo tipo lista | Label "Rol", type "lista", escribir opciones "A,B,C" | En cada opción aparece un select con esas opciones. | ✅ |
| 1.4.3 | Eliminar atributo | Click 🗑 en un atributo | El campo desaparece de todas las opciones. | ✅ |

### 1.5 Presets

| # | Caso | Pasos | Verificaciones | Estado |
|---|---|---|---|---|
| 1.5.1 | Cargar preset "Asignación" | Click en preset "Asignación de equipos". Confirmar si hay datos. | Se cargan 9 temas (7 reparto + 2 texto_libre) y 15 opciones. | ✅ |
| 1.5.2 | Cargar preset "Votación" | Click preset "Votación" | 1 tema modo votación con 4 opciones. Sin opciones pool. | ✅ |
| 1.5.3 | Cargar preset "Sí/No" | Click preset "Sí / No / Abstención" | 1 tema votación con 3 opciones. | ⬜ |
| 1.5.4 | Cargar preset "Lluvia de ideas" | Click preset "Lluvia de ideas" | 3 temas texto_libre. Sin opciones. | ⬜ |
| 1.5.5 | Cargar preset "Ranking" | Click preset "Priorización" | 1 tema ranking con 6 opciones. | ⬜ |
| 1.5.6 | Cargar preset "Mixta" | Click preset "Reunión (mixta)" | 1 tema votación + 1 ranking + 1 texto_libre. | ⬜ |
| 1.5.7 | Cargar preset con datos existentes | Estando con datos, cargar preset | Aparece confirm dialog. Si se confirma, reemplaza. Si se cancela, datos anteriores intactos. | ⬜ |

### 1.6 Nombre de plantilla

| # | Caso | Pasos | Verificaciones | Estado |
|---|---|---|---|---|
| 1.6.1 | Cambiar nombre de plantilla | Editar Input en `#plantillaNombreSlot`, blur | El nombre se actualiza en TopBar `.brand-sub` y persiste. | ✅ |
| 1.6.2 | Nombre por defecto en seed | Recargar con seed data | El nombre se muestra en el `.brand-sub`. | ⬜ |

### 1.7 Filtros de temas

| # | Caso | Pasos | Verificaciones | Estado |
|---|---|---|---|---|
| 1.7.1 | Filtrar por modo "Asignación" | Click `.pb-filter-btn[data-filter="reparto"]` | Solo se ven temas modo reparto. | ✅ |
| 1.7.2 | Filtrar por "Texto libre" | Click `.pb-filter-btn[data-filter="texto_libre"]` | Solo se ven temas modo texto_libre. | ✅ |
| 1.7.3 | Volver a "Todas" | Click `.pb-filter-btn[data-filter="all"]` | Se ven todos los temas. | ⬜ |
| 1.7.4 | Filtro sin resultados | Filtrar un modo que no existe | Se muestra mensaje de empty filter. | ⬜ |

---

## 2. Navegación (AppShell, TopBar, Router)

### 2.1 Tabs de navegación

| # | Caso | Pasos | Verificaciones | Estado |
|---|---|---|---|---|
| 2.1.1 | Click en tab "Dashboard" | Click en `.tab[data-path="/dashboard"]` | URL cambia a `/dashboard`. Se ve contenido de Dashboard. Tab queda `.active`. | ✅ |
| 2.1.2 | Click en tab "Mis respuestas" | Click en `.tab[data-path="/mis-respuestas"]` | URL cambia a `/mis-respuestas`. Se ve RespuestasView. | ✅ |
| 2.1.3 | Click en tab "Comparar" | Click en `.tab[data-path="/comparar"]` | URL cambia a `/comparar`. Se ve CompareView. | ✅ |
| 2.1.4 | Click en tab "Resumen" | Click en `.tab[data-path="/resumen"]` | URL cambia a `/resumen`. Se ve ResumenFinalView. | ✅ |
| 2.1.5 | Click en tab "Plantilla" | Click en `.tab[data-path="/plantilla"]` | URL cambia a `/plantilla`. Se ve PlantillaBuilderView. | ✅ |
| 2.1.6 | Navegación hacia atrás/adelante (historial) | Navegar a `/dashboard`, luego `/mis-respuestas`, luego botón "Atrás" del browser | Vuelve a `/dashboard`. El tab correcto se marca activo. | ✅ |
| 2.1.7 | Click brand vuelve a landing | Click en `.brand` | Navega a `/`. | ✅ |

### 2.2 Landing page

| # | Caso | Pasos | Verificaciones | Estado |
|---|---|---|---|---|
| 2.2.1 | Stats correctos en landing | Cargar seed data, ir a `/` | Se ven conteos de opciones, temas, respondidas. | ✅ |
| 2.2.2 | Click card "Responder" | Click en `.la-card[data-href="/mis-respuestas"]` | Navega a `/mis-respuestas`. | ⬜ |
| 2.2.3 | Click card "Comparar" | Click en `.la-card[data-href="/comparar"]` | Navega a `/comparar`. | ⬜ |
| 2.2.4 | Click card "Dashboard" | Click en `.la-card[data-href="/dashboard"]` | Navega a `/dashboard`. | ✅ |
| 2.2.5 | Click card "Plantilla" | Click en `.la-card[data-href="/plantilla"]` | Navega a `/plantilla`. | ✅ |
| 2.2.6 | Click en CTA "Responder" | Click en `.landing-cta[data-href="/mis-respuestas"]` | Navega a `/mis-respuestas`. | ✅ |
| 2.2.7 | Click en CTA "Editar plantilla" | Click en `.landing-cta[data-href="/plantilla"]` | Navega a `/plantilla`. | ✅ |

### 2.3 UserMenu

| # | Caso | Pasos | Verificaciones | Estado |
|---|---|---|---|---|
| 2.3.1 | Abrir UserMenu | Click en `.user-menu__trigger` | Panel `.user-menu__panel` se muestra (no hidden). | ✅ |
| 2.3.2 | Cerrar UserMenu click fuera | Abrir menú, click fuera | Panel se oculta. | ✅ |
| 2.3.3 | Cerrar UserMenu con Escape | Abrir menú, presionar Escape | Panel se oculta. | ✅ |
| 2.3.4 | Setear nombre de usuario | Escribir nombre en Input `[data-el="autorFieldSlot"]`, blur | Persiste en localStorage. Al abrir UserMenu de nuevo, se ve el nombre. | ✅ |
| 2.3.5 | Setear email de usuario | Escribir email en `[data-el="emailFieldSlot"]`, blur | Persiste. | ✅ |
| 2.3.6 | Toggle tema en UserMenu | Click ThemeSwitcher en `[data-el="themeSlot"]` | Tema cambia (Light ↔ Dark). | ✅ |

---

## 3. Llenar Respuestas (MisRespuestasView — Asignación carrusel)

### 3.1 Flujo de asignación

| # | Caso | Pasos | Verificaciones | Estado |
|---|---|---|---|---|
| 3.1.1 | Asignar opción a un tema | Ir a `/mis-respuestas`, tab "Asignación", modo "Carrusel". Click en un pill `.pill[data-tema="<id>"]` | Pill se pone verde con animación. Resumen "Opción → Tema". Después de 500ms avanza al siguiente. | ✅ |
| 3.1.2 | Desasignar opción | Click pill "✕ Sin asignar" | Opción queda sin asignar, avanza inmediatamente sin delay. | ✅ |
| 3.1.3 | Navegar con flechas ‹ › | Click `[data-act="prev"]` / `[data-act="next"]` | Cambia de opción en el carrusel. | ✅ |
| 3.1.4 | Navegar con dots | Click en `.dot[data-idx="<n>"]` | Salta a esa opción. | ✅ |
| 3.1.5 | Navegar con teclado ← → | Presionar ← o → | Navega entre opciones. | ✅ |
| 3.1.6 | Re-asignar opción ya asignada | Opción ya asignada a Tema A, click pill Tema B | Cambia a Tema B. | ✅ |
| 3.1.7 | Feedback visual en pill asignado | Asignar opción | Pill obtiene clase `.pill-just-assigned`. | ⬜ |
| 3.1.8 | Pill at-capacity se ve diferente | Asignar hasta llenar cupo de un tema | Pills de ese tema muestran `.at-capacity`. | ⬜ |
| 3.1.9 | Progress bar se actualiza | Asignar varias opciones | `#progressLabel` se actualiza, `.dot.done` aumenta. | ✅ |
| 3.1.10 | Completar toda la asignación | Asignar todas las opciones | Todas las opciones asignadas. Banner de sección completa. | ⬜ |

### 3.2 Búsqueda

| # | Caso | Pasos | Verificaciones | Estado |
|---|---|---|---|---|
| 3.2.1 | Buscar opción por nombre | Escribir en `.mrv-search-slot` Input | Filtra las opciones visibles. | ✅ |
| 3.2.2 | Limpiar búsqueda | Borrar texto del search | Vuelven a verse todas las opciones. | ✅ |

---

## 4. Llenar Respuestas — Votación

### 4.1 Votar

| # | Caso | Pasos | Verificaciones | Estado |
|---|---|---|---|---|
| 4.1.1 | Votar por una opción | Ir a `/mis-respuestas`, tab "Votación". Click en `.vv-opc[data-vote]` | Opción se marca como elegida (`.vv-opc--chosen`, `aria-pressed="true"`). Status cambia a "✓ Elegida". | ✅ |
| 4.1.2 | Cambiar voto | Click en otra opción del mismo tema | La nueva se marca elegida, la anterior se desmarca. | ✅ |
| 4.1.3 | Votar en múltiples temas | Votar en un tema, navegar al siguiente, votar | Ambos votos guardados. | ✅ |
| 4.1.4 | Completar todas las votaciones | Votar en todos los temas votación | Banner de sección completa aparece. | ✅ |

---

## 5. Llenar Respuestas — Ranking

### 5.1 Ordenar ranking

| # | Caso | Pasos | Verificaciones | Estado |
|---|---|---|---|---|
| 5.1.1 | Mover opción arriba en ranking | Click ▲ en `.rk-move[data-rank-move="up"]` | Opción sube una posición. | ✅ |
| 5.1.2 | Mover opción abajo en ranking | Click ▼ en `.rk-move[data-rank-move="down"]` | Opción baja una posición. | ✅ |
| 5.1.3 | Ordenar completamente un ranking | Mover opciones hasta orden deseado | Status cambia a "✓ Ordenada". | ✅ |
| 5.1.4 | Reordenar después de completado | Volver a mover items | Se actualiza el orden. | ✅ |

---

## 6. Llenar Respuestas — Texto libre

### 6.1 Escribir respuestas

| # | Caso | Pasos | Verificaciones | Estado |
|---|---|---|---|---|
| 6.1.1 | Escribir respuesta de texto | Ir a `/mis-respuestas`, tab "Texto libre". Escribir en EnhancedEditor (Quill), blur | Se guarda en `respuestas.texto[temaId]`. | ✅ |
| 6.1.2 | Modificar respuesta existente | Volver a la misma pregunta, editar texto, blur | Se actualiza. | ✅ |
| 6.1.3 | Ver modo "Una por una" | Click en `[data-rtmode="single"]` | Se ve un editor por vez con flechas. | ✅ |
| 6.1.4 | Ver modo "Dos columnas" | Click en `[data-rtmode="columns"]` | Se ven dos editores lado a lado. | ✅ |
| 6.1.5 | Ver modo "Ver todas" | Click en `[data-rtmode="grid"]` | Se ven todos los editores en grilla. | ✅ |
| 6.1.6 | Abrir fullscreen de editor | Click en botón "⛶" | El overlay `.rt-fs` se muestra. Editor ocupa pantalla completa. | ✅ |
| 6.1.7 | Cerrar fullscreen | Click "✕ Cerrar" o Escape | Overlay se oculta. | ✅ |
| 6.1.8 | Escribir en fullscreen | Abrir fullscreen, escribir, cerrar | Texto guardado. | ✅ |

---

## 7. Persistencia al recargar

### 7.1 Persistencia de datos

| # | Caso | Pasos | Verificaciones | Estado |
|---|---|---|---|---|
| 7.1.1 | Persistir plantilla | Modificar plantilla, recargar página | Los cambios en temas/opciones persisten. | ⬜ |
| 7.1.2 | Persistir respuestas asignación | Asignar opciones, recargar | Asignaciones intactas en MisRespuestasView y Dashboard. | ⬜ |
| 7.1.3 | Persistir respuestas votación | Votar, recargar | Votos intactos. | ⬜ |
| 7.1.4 | Persistir respuestas ranking | Ordenar ranking, recargar | Orden intacto. | ⬜ |
| 7.1.5 | Persistir respuestas texto | Escribir textos, recargar | Textos intactos. | ⬜ |
| 7.1.6 | Persistir settings | Setear nombre/email, recargar | Nombre y email persisten. | ⬜ |
| 7.1.7 | Persistir decisiones finales | Setear decisiones en CompareView, recargar | Decisiones intactas en ResumenFinalView. | ⬜ |
| 7.1.8 | Persistir respuestas importadas | Importar respuestas, recargar | Fuentes importadas aparecen en CompareView. | ⬜ |

---

## 8. Compartir Respuestas

### 8.1 ExportRespuestasModal

| # | Caso | Pasos | Verificaciones | Estado |
|---|---|---|---|---|
| 8.1.1 | Abrir modal desde RespuestasView | Click en botón "📤 Compartir respuestas" en `[data-el="exportSlot"]` | Se abre el modal `#exportRespuestasDialog`. | ⬜ |
| 8.1.2 | Abrir modal desde Dashboard | Click en botón "📤 Compartir respuestas" en Dashboard | Mismo modal. | ⬜ |
| 8.1.3 | Abrir modal desde UserMenu | Abrir UserMenu, click "Compartir respuestas" | Mismo modal. | ⬜ |
| 8.1.4 | Cerrar modal | Click ✕ o backdrop o Escape | Modal se cierra. | ⬜ |
| 8.1.5 | Prompt de nombre si falta | No tener nombre seteado, click "⬇ Descargar respuestas" | Aparece confirm:request pidiendo nombre. | ⬜ |
| 8.1.6 | Descargar respuestas | Tener nombre, click "⬇ Descargar respuestas" | Se descarga archivo `.respuestas`. | ⬜ |
| 8.1.7 | Copiar enlace de respuestas | Click "🔗 Copiar enlace" | Se copia al portapapeles (no verificable automáticamente, se puede verificar que no hay error). | ⬜ |
| 8.1.8 | Enviar por correo | Click "✉️ Enviar por correo" | Se abre `mailto:` (verificar que no explota). | ⬜ |

---

## 9. Compartir Plantilla

### 9.1 SharePlantillaModal

| # | Caso | Pasos | Verificaciones | Estado |
|---|---|---|---|---|
| 9.1.1 | Abrir modal desde PlantillaBuilderView | Click `#sharePlantillaBtn` | Se abre modal `#sharePlantillaDialog`. | ⬜ |
| 9.1.2 | Descargar plantilla | Click "⬇ Descargar archivo de plantilla" | Se descarga archivo `.plantilla` con `{ nombre, autor, email, atributos, temas, opciones }`. | ⬜ |
| 9.1.3 | Copiar enlace de plantilla | Click "🔗 Copiar enlace" | Se copia al portapapeles. | ⬜ |
| 9.1.4 | Enviar por correo plantilla | Click "✉️ Enviar por correo" | Se abre `mailto:`. | ⬜ |

---

## 10. Importar Respuestas

### 10.1 ImportDrop

| # | Caso | Pasos | Verificaciones | Estado |
|---|---|---|---|---|
| 10.1.1 | Ver ImportDrop en CompareView | Ir a `/comparar` | Se ve el área `.import-drop#drop`. | ⬜ |
| 10.1.2 | Importar archivo de respuestas | Arrastrar/Seleccionar archivo `.respuestas` o `.json` válido | Aparece source tag con el autor importado. | ⬜ |
| 10.1.3 | Mostrar drag feedback | Arrastrar archivo sobre el drop | Aparece clase `.drag` en `#drop`. | ⬜ |
| 10.1.4 | Importar múltiples archivos | Seleccionar 2 archivos JSON de respuestas | Ambos aparecen como sources. | ⬜ |
| 10.1.5 | Importar archivo inválido | Arrastrar archivo con formato inválido | Toast de error. No se agrega source. | ⬜ |
| 10.1.6 | Ver source tags | Después de importar | Cada fuente tiene `.source-tag` con `.swatch` y nombre. | ⬜ |

### 10.2 Importar respuestas desde UserMenu

| # | Caso | Pasos | Verificaciones | Estado |
|---|---|---|---|---|
| 10.2.1 | Importar mis respuestas | Abrir UserMenu, click "Importar mis Respuestas", seleccionar archivo | Se reemplazan respuestas actuales. Confirm dialog si ya hay datos. | ⬜ |
| 10.2.2 | Cancelar import | Click "Importar", cancelar en confirm dialog | Respuestas intactas. | ⬜ |

---

## 11. Importar Plantilla

### 11.1 Importar desde PlantillaBuilderView

| # | Caso | Pasos | Verificaciones | Estado |
|---|---|---|---|---|
| 11.1.1 | Importar archivo de plantilla | Click `#importPlantillaBtn`, seleccionar JSON válido | Confirm dialog con impacto. Si se confirma, reemplaza plantilla. | ⬜ |
| 11.1.2 | Importar plantilla cancelando | Click import, cancelar confirm | Plantilla anterior intacta. | ⬜ |
| 11.1.3 | Importar plantilla inválida | Archivo con formato incorrecto | Error toast. | ⬜ |

### 11.2 Importar desde CompareView

| # | Caso | Pasos | Verificaciones | Estado |
|---|---|---|---|---|
| 11.2.1 | Ver sección "Importar una Plantilla compartida" | Ir a `/comparar`, expandir `<details>` de URL import | Se ve textarea + botón. | ⬜ |
| 11.2.2 | Importar plantilla desde URL | Pegar hash comprimido, click botón importar | Confirm dialog, si confirma reemplaza. | ⬜ |

---

## 12. Dashboard

### 12.1 Vista general

| # | Caso | Pasos | Verificaciones | Estado |
|---|---|---|---|---|
| 12.1.1 | Ver stats correctos | Con seed data y algunas asignaciones | Se ven total de temas, respondidos, en rango, fuera de rango. | ✅ |
| 12.1.2 | Ver doughnut de progreso | Tener asignaciones | Se ve canvas con chart doughnut. Porcentaje visible. | ✅ |
| 12.1.3 | Ver nombre de plantilla en header | El nombre se muestra en `[data-el="plantillaName"]`. | ✅ |
| 12.1.4 | Click en tema card abre modal | Click en `.tema-card[data-tema-id]` | Se abre modal con detalle del tema (lista de opciones asignadas). | ✅ |

### 12.2 Secciones por modo

| # | Caso | Pasos | Verificaciones | Estado |
|---|---|---|---|---|
| 12.2.1 | Sección Asignación visible | Plantilla con temas reparto | Se ven tarjetas con barras de progreso y badges. | ✅ |
| 12.2.2 | Sección Votación visible | Plantilla con temas votación | Se ven badges de estado. | ✅ |
| 12.2.3 | Sección Ranking visible | Plantilla con temas ranking | Se ven badges de estado. | ✅ |
| 12.2.4 | Sección Texto libre visible | Plantilla con temas texto_libre | Se ven "Respondida"/"Pendiente". | ✅ |

---

## 13. CompareView

### 13.1 Tablas de comparación

| # | Caso | Pasos | Verificaciones | Estado |
|---|---|---|---|---|
| 13.1.1 | Ver tabla de asignación | Ir a `/comparar`, con fuentes importadas | Se ve tabla comparativa. | ⬜ |
| 13.1.2 | Ver carrusel de comparación | Cambiar modo a "Carrusel" | Se ve CompareCarousel. | ⬜ |
| 13.1.3 | Ver team view | Click "Vista por equipo" | Se ven asignaciones agrupadas por tema. | ⬜ |
| 13.1.4 | Filtrar por coincidencia | Click en filtro `[data-f="disagree"]` | Solo filas en desacuerdo. | ⬜ |
| 13.1.5 | Filtrar por tema | Select `#svcFilter` | Solo ese tema. | ⬜ |
| 13.1.6 | Remover source de comparación | Click `[data-rm="<autor>"]` | Fuente eliminada de la tabla. | ⬜ |
| 13.1.7 | Setear decisión final individual | Cambiar select `.final-select[data-opcion]` | Se marca decisión. | ⬜ |
| 13.1.8 | Autocompletar sugerencias | Click `#btnFillSug` | Todas las decisiones se llenan con la sugerencia (mayoría). | ⬜ |
| 13.1.9 | Limpiar todas las decisiones | Click `#btnClearRes`, confirmar | Decisiones borradas. | ⬜ |
| 13.1.10 | Exportar CSV de comparación | Click `#btnExportCmp` | Se descarga CSV. | ⬜ |

### 13.2 Comparación de votación

| # | Caso | Pasos | Verificaciones | Estado |
|---|---|---|---|---|
| 13.2.1 | Ver tally de votos | Tener fuentes importadas con votos, kind tab "Votación" | Se ven cards con conteo de votos por opción. Barra de mayoría. | ⬜ |
| 13.2.2 | Fijar decisión final en votación | Click ★ `.cmp-vt-star[data-vt-pick]` | Opción marcada como final. | ⬜ |

### 13.3 Comparación de ranking

| # | Caso | Pasos | Verificaciones | Estado |
|---|---|---|---|---|
| 13.3.1 | Ver agregación Borda | Kind tab "Ranking" con fuentes | Se ven puntajes Borda. | ⬜ |
| 13.3.2 | Adoptar orden como final | Click `[data-rk-adopt]` | Orden adoptado como decisión final. | ⬜ |

### 13.4 Comparación de texto libre

| # | Caso | Pasos | Verificaciones | Estado |
|---|---|---|---|---|
| 13.4.1 | Ver TextCompareCards | Kind tab "Texto libre" con fuentes | Se ven cards grandes con respuestas de cada autor. | ⬜ |
| 13.4.2 | Marcar respuesta como elegida | Click "Marcar como elegida" en una card | Card se marca con borde y etiqueta "Elegida". | ⬜ |
| 13.4.3 | Navegar entre temas texto | Click flechas de navegación | Cambia a siguiente/previa pregunta. | ⬜ |

---

## 14. Resumen Final (ResumenFinalView)

| # | Caso | Pasos | Verificaciones | Estado |
|---|---|---|---|---|
| 14.1.1 | Ver resumen de asignaciones | Tener decisiones finales seteadas, ir a `/resumen` | Se ven tablas de asignación con decisiones finales. | ✅ |
| 14.1.2 | Ver resumen de votaciones | Tener decisiones finales de votación | Se ven cards con opción elegida. | ✅ |
| 14.1.3 | Ver resumen de rankings | Tener decisiones finales de ranking | Se ven listas ordenadas. | ✅ |
| 14.1.4 | Ver resumen de texto libre | Tener decisiones finales de texto | Se ven quotes con autor. | ✅ |
| 14.1.5 | Descargar HTML | Click en botón "Descargar HTML" | Se descarga archivo HTML. | ✅ |
| 14.1.6 | Descargar JSON final | Click en DropDown "Exportar JSON" | Se descarga archivo `.respuestas` con decisiones finales. | ✅ |
| 14.1.7 | Ver sección vacía cuando no hay decisiones | No haber seteadas decisiones para un modo | Se muestra "Sin datos" o similar. | ✅ |

---

## 15. Eventos de Slice

### 15.1 toast:show

| # | Caso | Pasos | Verificaciones | Estado |
|---|---|---|---|---|
| 15.1.1 | Toast de over-capacity | Asignar opción que excede cupo máximo | Aparece toast: `"«Tema» quedó con exceso de personas"`. | ⬜ |
| 15.1.2 | Toast de error en import | Importar archivo inválido | Toast error. | ⬜ |
| 15.1.3 | Toast de éxito | Acción exitosa | Toast success si corresponde. | ⬜ |

### 15.2 confirm:request

| # | Caso | Pasos | Verificaciones | Estado |
|---|---|---|---|---|
| 15.2.1 | Confirm al borrar tema | Click 🗑 en tema | Aparece modal de confirmación con mensaje de impacto. | ⬜ |
| 15.2.2 | Confirm con campo de input | Click export sin nombre | Modal con input para nombre. | ⬜ |
| 15.2.3 | Confirm danger (rojo) | Resetear todas las respuestas | Botón de confirmar en rojo. | ⬜ |
| 15.2.4 | Cancelar confirm | Click "Cancelar" | No se ejecuta acción. | ⬜ |

### 15.3 router:change

| # | Caso | Pasos | Verificaciones | Estado |
|---|---|---|---|---|
| 15.3.1 | Active tab se actualiza al navegar | Navegar entre rutas | Tab activo cambia correctamente. | ⬜ |
| 15.3.2 | popstate actualiza UI | Navegar, luego browser back | UI se actualiza. | ⬜ |

### 15.4 context:change

| # | Caso | Pasos | Verificaciones | Estado |
|---|---|---|---|---|
| 15.4.1 | Watchers reaccionan a cambios | Modificar respuestas desde UserMenu (import/reiniciar) mientras se ve Dashboard | Dashboard se refresca automáticamente. | ⬜ |
| 15.4.2 | Watchers de plantilla | Modificar plantilla mientras se ve CompareView | CompareView reacciona. | ⬜ |

---

## 16. Reset / Reiniciar

### 16.1 Reiniciar respuestas

| # | Caso | Pasos | Verificaciones | Estado |
|---|---|---|---|---|
| 16.1.1 | Reiniciar mis respuestas | UserMenu → "Reiniciar mis Respuestas", confirmar | Todas las respuestas se limpian. Dashboard muestra 0. | ✅ |
| 16.1.2 | Cancelar reinicio | Click "Reiniciar", cancelar confirm | Respuestas intactas. | ✅ |

### 16.2 Restaurar ejemplo (seed)

| # | Caso | Pasos | Verificaciones | Estado |
|---|---|---|---|---|
| 16.2.1 | Restaurar plantilla seed | PlantillaBuilderView → "🔄 Restaurar ejemplo", confirmar | Se cargan los 9 temas seed y 15 opciones. | ✅ |
| 16.2.2 | Cancelar restauración | Click "Restaurar", cancelar | Plantilla actual intacta. | ✅ |
