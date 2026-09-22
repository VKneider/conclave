# Use cases — E2E tests

Domain vocabulary (Plantilla, Tema, Opción, modo names, UI strings) stays in
Spanish, because that is the product's language; everything else is English.

## Progress

| Section                                                                                   | Planned tests | Implemented tests | %        |
| ------------------------------------------------------------------------------------------ | ------------------ | ------------------- | -------- |
| 1. PlantillaBuilderView                                                                    | 33                 | 41                  | +8 ⭐    |
| 2. Navigation                                                                              | 20                 | 20                  | 100%     |
| 3. Asignación (carousel)                                                                   | 12                 | 15                  | +3 ⭐    |
| 4. Votación                                                                                | 4                  | 4                   | 100%     |
| 5. Ranking                                                                                 | 4                  | 4                   | 100%     |
| 6. Texto libre                                                                             | 8                  | 8                   | 100%     |
| 7. Persistence                                                                             | 8                  | 8                   | 100%     |
| 8. Sharing Respuestas                                                                      | 8                  | 9                   | +1 ⭐    |
| 9. Sharing a Plantilla                                                                     | 4                  | 5                   | +1 ⭐    |
| 10. Importing Respuestas                                                                   | 8                  | 8                   | 100%     |
| 11. Importing a Plantilla                                                                  | 5                  | 5                   | 100%     |
| 12. Dashboard                                                                              | 8                  | 8                   | 100%     |
| 13. CompareView                                                                            | 17                 | 17                  | 100%     |
| 14. Final summary                                                                          | 7                  | 8                   | +1 ⭐    |
| 15. Slice events                                                                           | 11                 | 13                  | 100%     |
| 16. Reset                                                                                  | 4                  | 4                   | 100%     |
| 17. DragDropService (touch)                                                                | —                  | 6                   | ⭐       |
| **Total (original plan)**                                                                  | **161**            | **161**             | **100%** |
| _+ Bonus (1.8 reorder, 15.2 email validation, 8.1.9 QR, 9.1.5 QR, 14.2.1 consenso hash)_   | _—_                | _11_                | _—_      |
| **Grand total (real tests)**                                                               | **—**              | **233**             | **—**    |

**Legend:** ✅ implemented · ⬜ pending

---

## Slice contexts (localStorage persistence)

| Context                | localStorage key                    | Shape                                    |
| ---------------------- | ----------------------------------- | ---------------------------------------- |
| `settings`             | `conclave-settings-v3`              | `{ autor, email }`                       |
| `plantilla`            | `conclave-plantilla-v1`             | `{ nombre, atributos, temas, opciones }` |
| `respuestas`           | `conclave-respuestas-v1`            | `{ seleccion, texto, voto, ranking }`    |
| `decisionFinal`        | `conclave-decision-final-v1`        | `{ seleccion, texto, voto, ranking }`    |
| `respuestasImportadas` | `conclave-respuestas-importadas-v1` | `[{ autor, respuestas }]`                |

---

## 1. Plantilla view (PlantillaBuilderView)

### 1.1 Tema CRUD (reparto, votacion, ranking, texto_libre)

| #      | Case                                     | Steps                                                                   | Checks                                                                                                                                         | Status |
| ------ | ---------------------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 1.1.1  | Add tema "Logística", modo texto libre   | Type "Logística" into the `#addCatSlot` Textarea, click `#addCatBtn`    | A `slice-temarow` appears named "Logística", modo `texto_libre` by default (the active filter's, if any). It shows at the END of `#catList`.    | ✅     |
| 1.1.2  | Add tema, then switch to modo votación   | Open the new tema's modo Select, pick "Votación"                        | min/max/capacity fields hide. The tema's inline opciones editor appears.                                                                        | ✅     |
| 1.1.3  | Add tema, then switch to modo ranking    | Change modo to "Ranking"                                                | min/max/capacity hide. The tema's inline opciones editor appears.                                                                               | ✅     |
| 1.1.4  | Add tema, modo texto libre, with filter  | Change modo to "Texto libre"                                            | All extra fields hide. Only nombre and modo remain.                                                                                            | ✅     |
| 1.1.5  | Edit an existing tema's name             | Click the tema's name, type a new name, blur                            | The name updates and survives a reload.                                                                                                        | ✅     |
| 1.1.5b | The name is a wrapping textarea          | Type a long question, then press Enter                                  | autoGrow makes the field taller (the whole question is visible); Enter commits and inserts no newline.                                          | ✅     |
| 1.1.5c | Escape discards a name edit              | Type something else into a tema's name, press Escape                    | The field goes back to the stored name and `plantilla.temas` is unchanged.                                                                      | ✅     |
| 1.1.6  | Change an existing tema's modo           | Change modo from "reparto" to "votacion"                                | The reparto-specific fields hide/show according to the modo.                                                                                   | ✅     |
| 1.1.7  | Delete a tema, confirming                | Click 🗑 on a tema, confirm in the modal                                 | The tema disappears. Any respuestas pointing at it are cleaned.                                                                                | ✅     |
| 1.1.8  | Delete a tema, cancelling                | Click 🗑, click "Cancelar" in the modal                                  | The tema is still visible.                                                                                                                     | ✅     |
| 1.1.9  | Submit the add row while empty           | Click "Agregar" without typing anything                                 | The field shakes (`triggerError`) and `#addCatError` explains what is missing. No tema is created. Typing clears the message.                   | ✅     |
| 1.1.10 | A new tema goes to the end               | Add a tema with N temas already present                                 | It is last in `#catList` and in `plantilla.temas`, with `orden` = N+1 shown in `.cat-row__order`.                                               | ✅     |
| 1.1.11 | Numbering recomposes on delete           | Delete the 2nd tema                                                     | The `orden` values are 1..n with no gaps, both in the context and in the row labels.                                                           | ✅     |
| 1.1.12 | The modo picked in the add row is used   | Pick "Votación" in `#addCatModoSlot` and add two temas                  | Both are created with `modo: 'votacion'` (the Select keeps the choice between adds).                                                            | ✅     |

### 1.2 Votación/ranking opciones (inline, per tema)

| #     | Case                                  | Steps                                                                | Checks                                  | Status |
| ----- | ------------------------------------- | --------------------------------------------------------------------- | --------------------------------------- | ------ |
| 1.2.1 | Add an opción to a votación tema      | In modo votación, type an opción into the inline input + Enter       | The opción is listed under that tema.   | ✅     |
| 1.2.2 | Delete an opción from a votación tema | Click 🗑 on an inline opción                                          | The opción is removed from the tema.    | ✅     |
| 1.2.3 | Edit an inline opción's name          | Click the opción's name, edit, blur                                  | It updates.                             | ✅     |

### 1.3 Opción CRUD (the reparto pool)

| #     | Case                                       | Steps                                                       | Checks                                                                                                                                                     | Status |
| ----- | ------------------------------------------ | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| 1.3.1 | Add opción "Juan Pérez" to the pool        | Type into the `#addOpcSlot` Input, click `#addOpcBtn`       | It appears LAST in `#opcList` and in the pool (same append convention as temas).                                                                            | ✅     |
| 1.3.2 | Edit an opción's name                      | Click the name, edit, blur                                  | Survives a reload.                                                                                                                                         | ✅     |
| 1.3.3 | Mark an opción as "fijo"                   | Toggle the "fijo" checkbox                                  | The opción is marked fixed and no longer shows among those available for assignment.                                                                       | ✅     |
| 1.3.4 | Delete an opción, confirming               | Click 🗑, confirm                                            | The opción is deleted. Respuestas referencing it are cleaned.                                                                                              | ✅     |
| 1.3.5 | Bulk-delete opciones                       | Check 2 opciones, click `#opcBulkDelete`, confirm           | Both are deleted.                                                                                                                                          | ✅     |
| 1.3.6 | Delete every opción                        | Click "Borrar todo" in the opciones section, confirm        | The list empties.                                                                                                                                          | ✅     |
| 1.3.7 | ▲/▼ reorder the pool (and only the pool)   | Add a votación tema with an owned opción, then move pool rows | The pool order changes and the owned opción keeps its slot in `opciones`; ▲ on the first row is a no-op.                                                   | ✅     |
| 1.3.8 | Drag and drop reorders the pool            | Drag the first pool row past the third                      | The pool order changes accordingly.                                                                                                                        | ✅     |

### 1.4 Custom atributos

| #     | Case                                          | Steps                                                                | Checks                                                                                                          | Status |
| ----- | --------------------------------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------ |
| 1.4.1 | Add a texto atributo                          | Type label "Rol", leave type "texto", click "Agregar"                | It appears in `#atribList` as a `slice-atributorow`. Every opción shows a field for it.                          | ✅     |
| 1.4.2 | Add a lista atributo                          | Label "Equipo", type "lista"                                         | Each opción gets a select with those options.                                                                   | ✅     |
| 1.4.3 | Delete an atributo                            | Click ✕ on an atributo, confirm                                      | Confirm-gated (it names how many Opciones hold a value). The field disappears from every opción.                | ✅     |
| 1.4.4 | Edit an atributo's label and lista options    | Edit the label and the "opciones" field of the `sexo` atributo       | `label` and `opciones` update in the context.                                                                   | ✅     |
| 1.4.5 | Add an atributo with no name                  | Click "Agregar" without typing a label                               | `#atribAddError` is shown and no atributo is created.                                                           | ✅     |

### 1.5 Presets

| #     | Case                                       | Steps                                                         | Checks                                                       | Status |
| ----- | ------------------------------------------ | -------------------------------------------------------------- | ------------------------------------------------------------ | ------ |
| 1.5.1 | Load the "Asignación" preset               | Click the "Asignación de equipos" preset. Confirm if data exists. | 9 temas (7 reparto + 2 texto_libre) and 15 opciones load.  | ✅     |
| 1.5.2 | Load the "Votación" preset                 | Click the "Votación" preset                                   | 1 votación tema with 4 opciones. No pool opciones.           | ✅     |
| 1.5.3 | Load the "Sí/No" preset                    | Click the "Sí / No / Abstención" preset                       | 1 votación tema with 3 opciones.                             | ✅     |
| 1.5.4 | Load the "Lluvia de ideas" preset          | Click the "Lluvia de ideas" preset                            | 3 texto_libre temas. No opciones.                            | ✅     |
| 1.5.5 | Load the "Ranking" preset                  | Click the "Priorización" preset                               | 1 ranking tema with 6 opciones.                              | ✅     |
| 1.5.6 | Load the "Mixta" preset                    | Click the "Reunión (mixta)" preset                            | 1 votación + 1 ranking + 1 texto_libre tema.                 | ✅     |
| 1.5.7 | Load a preset over existing data (cancel)  | With data present, load a preset, cancel                      | The previous data is intact.                                 | ✅     |

### 1.6 Plantilla name

| #     | Case                     | Steps                                       | Checks                                                      | Status                       |
| ----- | ------------------------ | ------------------------------------------- | ------------------------------------------------------------ | ---------------------------- |
| 1.6.1 | Change the Plantilla name | Edit the Input in `#plantillaNombreSlot`, blur | The name updates in TopBar's `.brand-sub` and persists.   | ✅                           |
| 1.6.2 | Default name from seed    | Reload with seed data                        | The name shows in `.brand-sub`.                             | ✅ (verified via context)    |

### 1.7 Tema filters

| #     | Case                          | Steps                                             | Checks                                | Status |
| ----- | ----------------------------- | ------------------------------------------------- | ------------------------------------- | ------ |
| 1.7.1 | Filter by modo "Asignación"   | Click `.pb-filter-btn[data-filter="reparto"]`     | Only reparto temas are visible.       | ✅     |
| 1.7.2 | Filter by "Texto libre"       | Click `.pb-filter-btn[data-filter="texto_libre"]` | Only texto_libre temas are visible.   | ✅     |
| 1.7.3 | Back to "Todas"               | Click `.pb-filter-btn[data-filter="all"]`         | Every tema is visible.                | ✅     |
| 1.7.4 | Filter with no results        | Filter by a modo that does not exist              | The empty-filter message is shown.    | ✅     |

### 1.8 Reordering temas (bonus — not in the original plan)

| #      | Case                                          | Steps                                                                  | Checks                                                                                                     | Status |
| ------ | --------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------ |
| 1.8.1  | ▼ moves a tema down                           | Click ▼ on the first tema                                              | The first tema becomes the second.                                                                         | ✅     |
| 1.8.2  | ▲ moves a tema up                             | Click ▲ on the second tema                                             | The second tema becomes the first.                                                                         | ✅     |
| 1.8.3  | ▲ on the first is a no-op                     | Click ▲ on the first tema                                              | The order does not change.                                                                                 | ✅     |
| 1.8.4  | ▼ on the last is a no-op                      | Click ▼ on the last tema                                               | The order does not change.                                                                                 | ✅     |
| 1.8.4b | With a filter active, ▲/▼ use the VISIBLE neighbour | Filter by a modo, then move a row at the edge of the visible set  | ▼ with no visible neighbour below is a no-op; ▲ jumps over the hidden rows and `orden` stays 1..n.          | ✅     |
| 1.8.5  | Drag and drop downwards                       | Drag the first tema to third place                                     | The first becomes third, the rest move up.                                                                 | ✅     |
| 1.8.6  | Drag and drop upwards                         | Drag the last tema to second place                                     | The last becomes second, the rest move down.                                                               | ✅     |

---

## 2. Navigation (AppShell, TopBar, Router)

### 2.1 Navigation tabs

| #     | Case                                   | Steps                                                                       | Checks                                                                           | Status |
| ----- | -------------------------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------ |
| 2.1.1 | Click the "Dashboard" tab              | Click `.tab[data-path="/dashboard"]`                                        | The URL changes to `/dashboard`. The Dashboard content shows. The tab is `.active`. | ✅  |
| 2.1.2 | Click the "Mis respuestas" tab         | Click `.tab[data-path="/mis-respuestas"]`                                   | The URL changes to `/mis-respuestas`. RespuestasView shows.                      | ✅     |
| 2.1.3 | Click the "Comparar" tab               | Click `.tab[data-path="/comparar"]`                                         | The URL changes to `/comparar`. CompareView shows.                               | ✅     |
| 2.1.4 | Click the "Resumen" tab                | Click `.tab[data-path="/resumen"]`                                          | The URL changes to `/resumen`. ResumenFinalView shows.                           | ✅     |
| 2.1.5 | Click the "Plantilla" tab              | Click `.tab[data-path="/plantilla"]`                                        | The URL changes to `/plantilla`. PlantillaBuilderView shows.                     | ✅     |
| 2.1.6 | Back/forward navigation (history)      | Go to `/dashboard`, then `/mis-respuestas`, then the browser's Back button  | It returns to `/dashboard`. The right tab is marked active.                      | ✅     |
| 2.1.7 | Clicking the brand returns to landing  | Click `.brand`                                                              | It navigates to `/`.                                                             | ✅     |

### 2.2 Landing page

| #     | Case                           | Steps                                                | Checks                                              | Status |
| ----- | ------------------------------ | ---------------------------------------------------- | --------------------------------------------------- | ------ |
| 2.2.1 | Correct stats on the landing   | Load seed data, go to `/`                            | Counts of opciones, temas and answered items show.  | ✅     |
| 2.2.2 | Click the "Responder" card     | Click `.la-card[data-href="/mis-respuestas"]`        | Navigates to `/mis-respuestas`.                     | ✅     |
| 2.2.3 | Click the "Comparar" card      | Click `.la-card[data-href="/comparar"]`              | Navigates to `/comparar`.                           | ✅     |
| 2.2.4 | Click the "Dashboard" card     | Click `.la-card[data-href="/dashboard"]`             | Navigates to `/dashboard`.                          | ✅     |
| 2.2.5 | Click the "Plantilla" card     | Click `.la-card[data-href="/plantilla"]`             | Navigates to `/plantilla`.                          | ✅     |
| 2.2.6 | Click the "Responder" CTA      | Click `.landing-cta[data-href="/mis-respuestas"]`    | Navigates to `/mis-respuestas`.                     | ✅     |
| 2.2.7 | Click the "Editar plantilla" CTA | Click `.landing-cta[data-href="/plantilla"]`       | Navigates to `/plantilla`.                          | ✅     |

### 2.3 UserMenu

| #     | Case                          | Steps                                                       | Checks                                                                  | Status |
| ----- | ----------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------- | ------ |
| 2.3.1 | Open the UserMenu             | Click `.user-menu__trigger`                                 | The `.user-menu__panel` shows (not hidden).                             | ✅     |
| 2.3.2 | Close the UserMenu by clicking outside | Open the menu, click outside                       | The panel hides.                                                        | ✅     |
| 2.3.3 | Close the UserMenu with Escape | Open the menu, press Escape                                | The panel hides.                                                        | ✅     |
| 2.3.4 | Set the user name             | Type a name into the `[data-el="autorFieldSlot"]` Input, blur | It persists in localStorage and is there when the menu reopens.       | ✅     |
| 2.3.5 | Set the user email            | Type an email into `[data-el="emailFieldSlot"]`, blur       | It persists.                                                            | ✅     |
| 2.3.6 | Toggle the theme from the UserMenu | Click the ThemeSwitcher in `[data-el="themeSlot"]`     | The theme changes (Light ↔ Dark).                                       | ✅     |
| 2.3.7 | App version in the UserMenu   | Open the UserMenu                                           | `conclave vX.Y.Z` shows at the foot of the panel.                       | ✅     |

---

## 3. Filling in Respuestas (MisRespuestasView — Asignación carousel)

### 3.1 Assignment flow

| #      | Case                                | Steps                                                                                               | Checks                                                                                            | Status |
| ------ | ----------------------------------- | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ------ |
| 3.1.1  | Assign an opción to a tema          | Go to `/mis-respuestas`, tab "Asignación", mode "Carrusel". Click a `.pill[data-tema="<id>"]`         | The pill turns green with an animation. A "Opción → Tema" summary shows. After 500 ms it advances.  | ✅     |
| 3.1.2  | Unassign an opción                  | Click the "✕ Sin asignar" pill                                                                        | The opción is left unassigned and it advances immediately, with no delay.                          | ✅     |
| 3.1.3  | Navigate with the ‹ › arrows        | Click `[data-act="prev"]` / `[data-act="next"]`                                                       | The carousel changes opción.                                                                       | ✅     |
| 3.1.4  | Navigate with the dots              | Click `.dot[data-idx="<n>"]`                                                                          | It jumps to that opción.                                                                           | ✅     |
| 3.1.5  | Navigate with the ← → keys          | Press ← or →                                                                                          | It moves between opciones.                                                                         | ✅     |
| 3.1.6  | Re-assign an already assigned opción | Opción already in Tema A, click Tema B's pill                                                        | It moves to Tema B.                                                                                | ✅     |
| 3.1.7  | Visual feedback on the assigned pill | Assign an opción                                                                                     | The pill gets the `.pill-just-assigned` class.                                                     | ✅     |
| 3.1.8  | An at-capacity pill looks different | Assign until a tema is at its maximum                                                                 | That tema's pills show `.at-capacity`.                                                             | ✅     |
| 3.1.9  | Progress dots update                | Assign several opciones                                                                               | `.dot.done` grows.                                                                                 | ✅     |
| 3.1.10 | Complete the whole assignment       | Assign every opción                                                                                   | Every opción is assigned (every dot `.done`).                                                      | ✅     |

### 3.2 Search

| #     | Case                          | Steps                                   | Checks                                | Status |
| ----- | ----------------------------- | --------------------------------------- | ------------------------------------- | ------ |
| 3.2.1 | Search an opción by name      | Type into the `.mrv-search-slot` Input  | It filters the visible opciones.      | ✅     |
| 3.2.2 | Clear the search              | Delete the search text                  | Every opción is visible again.        | ✅     |

### 3.3 Order stays in sync with the Plantilla

Temas and the pool must read in the SAME order as in the builder, live (no
reload, no tab switch).

| #     | Case                                          | Steps                                                                  | Checks                                                                                                                       | Status |
| ----- | --------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------ |
| 3.3.1 | The carousel follows a reorder                | `PlantillaService.moveTema(id, 1)` with the carousel open              | The `.tema-pills .pill[data-tema]` pills end up in `plantilla.temas`'s new order.                                             | ✅     |
| 3.3.2 | The "Por tema" board reorders and renames     | Move the last reparto tema to the front and `updateTema` its name + máx | `.ps-square[data-drop]` in the new order; `[data-el="name-id"]` and `[data-el="max-id"]` up to date, with no shell rebuild.   | ✅     |
| 3.3.3 | Texto libre cards follow a reorder            | `moveTema` on a texto_libre tema                                       | The `.rt-title` of each `slice-textocard` ends up in the Plantilla's order.                                                  | ✅     |

---

## 4. Filling in Respuestas — Votación

### 4.1 Voting

| #     | Case                          | Steps                                                                 | Checks                                                                                                   | Status |
| ----- | ----------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------ |
| 4.1.1 | Vote for an opción            | Go to `/mis-respuestas`, tab "Votación". Click `.vv-opc[data-vote]`   | The opción is marked chosen (`.vv-opc--chosen`, `aria-pressed="true"`). The status becomes "✓ Elegida".   | ✅     |
| 4.1.2 | Change the vote               | Click another opción of the same tema                                 | The new one is marked chosen and the previous one is cleared.                                            | ✅     |
| 4.1.3 | Vote across several temas     | Vote in one tema, move to the next, vote                              | Both votes are stored.                                                                                   | ✅     |
| 4.1.4 | Complete every votación       | Vote in every votación tema                                           | The section-complete banner appears.                                                                     | ✅     |

---

## 5. Filling in Respuestas — Ranking

### 5.1 Ordering a ranking

| #     | Case                            | Steps                                        | Checks                                | Status |
| ----- | ------------------------------- | -------------------------------------------- | ------------------------------------- | ------ |
| 5.1.1 | Move an opción up               | Click ▲ on `.rk-move[data-rank-move="up"]`   | The opción moves up one position.     | ✅     |
| 5.1.2 | Move an opción down             | Click ▼ on `.rk-move[data-rank-move="down"]` | The opción moves down one position.   | ✅     |
| 5.1.3 | Fully order a ranking           | Move opciones into the desired order         | The status becomes "✓ Ordenada".      | ✅     |
| 5.1.4 | Reorder after completing        | Move items again                             | The order updates.                    | ✅     |

---

## 6. Filling in Respuestas — Texto libre

### 6.1 Writing answers

| #     | Case                            | Steps                                                                             | Checks                                                        | Status |
| ----- | ------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------- | ------ |
| 6.1.1 | Write a text answer             | Go to `/mis-respuestas`, tab "Texto libre". Type into the EnhancedEditor, blur      | It is stored in `respuestas.texto[temaId]`.                   | ✅     |
| 6.1.2 | Modify an existing answer       | Return to the same question, edit the text, blur                                    | It updates.                                                   | ✅     |
| 6.1.3 | "Una por una" mode              | Click `[data-rtmode="single"]`                                                      | One editor at a time, with arrows.                            | ✅     |
| 6.1.4 | "Dos columnas" mode             | Click `[data-rtmode="columns"]`                                                     | Two editors side by side.                                     | ✅     |
| 6.1.5 | "Ver todas" mode                | Click `[data-rtmode="grid"]`                                                        | Every editor in a grid.                                       | ✅     |
| 6.1.6 | Open the fullscreen editor      | Click the "⛶" button                                                                | The `.rt-fs` overlay shows. The editor fills the screen.      | ✅     |
| 6.1.7 | Close the fullscreen editor     | Click "✕ Cerrar" or press Escape                                                    | The overlay hides.                                            | ✅     |
| 6.1.8 | Write in fullscreen             | Open fullscreen, type, close                                                        | The text is stored.                                           | ✅     |

---

## 7. Persistence across reloads

### 7.1 Data persistence

| #     | Case                                 | Steps                                            | Checks                                                       | Status |
| ----- | ------------------------------------ | ------------------------------------------------ | ------------------------------------------------------------ | ------ |
| 7.1.1 | Persist the Plantilla                | Modify the Plantilla, reload                     | Tema/opción changes persist.                                 | ✅     |
| 7.1.2 | Persist asignación respuestas        | Assign opciones, reload                          | Assignments intact in MisRespuestasView and the Dashboard.   | ✅     |
| 7.1.3 | Persist votación respuestas          | Vote, reload                                     | Votes intact.                                                | ✅     |
| 7.1.4 | Persist ranking respuestas           | Order a ranking, reload                          | The order is intact.                                         | ✅     |
| 7.1.5 | Persist texto respuestas             | Write texts, reload                              | The texts are intact.                                        | ✅     |
| 7.1.6 | Persist settings                     | Set name/email, reload                           | Name and email persist.                                      | ✅     |
| 7.1.7 | Persist final decisions              | Set decisions in CompareView, reload             | Decisions intact in ResumenFinalView.                        | ✅     |
| 7.1.8 | Persist imported respuestas          | Import respuestas, reload                        | The imported sources appear in CompareView.                  | ✅     |

---

## 8. Sharing Respuestas

### 8.1 ExportRespuestasModal

| #     | Case                                   | Steps                                                                           | Checks                                                                                            | Status |
| ----- | -------------------------------------- | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ------ |
| 8.1.1 | Open the modal from RespuestasView     | Click "📤 Compartir respuestas" in `[data-el="exportSlot"]`                      | The `#exportRespuestasDialog` modal opens.                                                        | ✅     |
| 8.1.2 | Open the modal from the Dashboard      | Click "📤 Compartir respuestas" on the Dashboard                                | The same modal.                                                                                   | ✅     |
| 8.1.3 | Open the modal from the UserMenu       | Open the UserMenu, click "Compartir respuestas"                                 | The same modal.                                                                                   | ✅     |
| 8.1.4 | Close the modal                        | Click ✕, the backdrop, or press Escape                                          | The modal closes.                                                                                 | ✅     |
| 8.1.5 | Name prompt when it is missing         | With no name set, click "⬇ Descargar respuestas"                                | A `confirm:request` asking for the name appears.                                                  | ✅     |
| 8.1.6 | Download respuestas                    | With a name set, click "⬇ Descargar respuestas"                                 | A `.respuestas` file downloads.                                                                   | ✅     |
| 8.1.7 | Copy the respuestas link               | Click "🔗 Copiar enlace"                                                        | It is copied to the clipboard (not automatically verifiable; the check is that nothing errors).   | ✅     |
| 8.1.8 | Email the respuestas to the creator    | Click "✉️ Enviar por correo" with a name set and `creadoEmail` on the Plantilla | Opens `mailto:` addressed to the Plantilla creator's email, with the respuestas link.             | ✅     |
| 8.1.9 | Respuestas QR                          | Click "📷 Código QR"                                                            | The QR modal opens with a QR canvas (or a placeholder if the link is too long). No errors.        | ✅     |

---

## 9. Sharing a Plantilla

### 9.1 SharePlantillaModal

| #     | Case                                      | Steps                                                       | Checks                                                                                            | Status |
| ----- | ----------------------------------------- | ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ------ |
| 9.1.1 | Open the modal from PlantillaBuilderView  | Click `#sharePlantillaBtn`                                  | The `#sharePlantillaDialog` modal opens.                                                          | ✅     |
| 9.1.2 | Download the Plantilla                    | Click "⬇ Descargar archivo de plantilla"                    | A `.plantilla` file downloads with `{ nombre, autor, email, atributos, temas, opciones }`.        | ✅     |
| 9.1.3 | Copy the Plantilla link                   | Click "🔗 Copiar enlace"                                    | It is copied to the clipboard.                                                                    | ✅     |
| 9.1.4 | Email the Plantilla                       | Click "✉️ Enviar por correo" with name + email set          | Opens `mailto:` to your own email with the Plantilla link. If the email is missing, it asks.      | ✅     |
| 9.1.5 | Plantilla QR                              | Click "📷 Código QR"                                        | The QR modal opens with a QR canvas (or a placeholder if the link is too long). No errors.        | ✅     |

---

## 10. Importing Respuestas

### 10.1 ImportDrop

| #      | Case                               | Steps                                                       | Checks                                                     | Status |
| ------ | ---------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------- | ------ |
| 10.1.1 | See ImportDrop in CompareView      | Go to `/comparar`                                           | The `.import-drop#drop` area is visible.                   | ✅     |
| 10.1.2 | Import a respuestas file           | Drag/select a valid `.respuestas` or `.json` file          | A source tag with the imported author appears.             | ✅     |
| 10.1.3 | Drag feedback                      | Drag a file over the drop area                              | `#drop` gets the `.drag` class.                            | ✅     |
| 10.1.4 | Import several files               | Select 2 respuestas JSON files                              | Both appear as sources.                                    | ✅     |
| 10.1.5 | Import an invalid file             | Drag a file with an invalid format                          | Error toast. No source is added.                           | ✅     |
| 10.1.6 | See the source tags                | After importing                                             | Each source has a `.source-tag` with a `.swatch` and name. | ✅     |

### 10.2 Importing respuestas from the UserMenu

| #      | Case                       | Steps                                                                | Checks                                                                   | Status |
| ------ | -------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------ | ------ |
| 10.2.1 | Import my respuestas       | Open the UserMenu, click "Importar mis Respuestas", pick a file      | The current respuestas are replaced. A confirm dialog if data exists.    | ✅     |
| 10.2.2 | Cancel the import          | Click "Importar", cancel in the confirm dialog                       | The respuestas are intact.                                               | ✅     |

---

## 11. Importing a Plantilla

### 11.1 Importing from PlantillaBuilderView

| #      | Case                           | Steps                                                | Checks                                                              | Status |
| ------ | ------------------------------ | ---------------------------------------------------- | -------------------------------------------------------------------- | ------ |
| 11.1.1 | Import a Plantilla file        | Click `#importPlantillaBtn`, pick a valid JSON      | Confirm dialog with the impact. On confirm, the Plantilla is replaced. | ✅   |
| 11.1.2 | Cancel a Plantilla import      | Click import, cancel the confirm                     | The previous Plantilla is intact.                                    | ✅     |
| 11.1.3 | Import an invalid Plantilla    | A file with the wrong format                         | Error toast.                                                         | ✅     |

### 11.2 Importing from CompareView / a URL

| #      | Case                                             | Steps                                                  | Checks                                                                                  | Status |
| ------ | ------------------------------------------------ | ------------------------------------------------------ | ----------------------------------------------------------------------------------------- | ------ |
| 11.2.1 | See the "Importar una Plantilla compartida" area | Go to `/comparar`, expand the URL-import `<details>`   | A textarea and a button are visible.                                                    | ✅     |
| 11.2.2 | Import a Plantilla from a URL                    | Navigate with a `#plantilla=` hash                     | Confirm dialog when there is impact, or a direct import. The Plantilla is replaced.     | ✅     |
| 11.2.3 | Hash import with impact=0 navigates from `init()` | Load a `#plantilla=` hash whose import orphans nothing | It navigates to `/mis-respuestas` with exactly ONE AppShell, the view mounts, and later navigation still works. | ✅ |

---

## 12. Dashboard

### 12.1 Overview

| #      | Case                                   | Steps                                          | Checks                                                              | Status |
| ------ | -------------------------------------- | ---------------------------------------------- | -------------------------------------------------------------------- | ------ |
| 12.1.1 | Correct stats                          | With seed data and some assignments            | Totals for temas, answered, in range and out of range are visible.  | ✅     |
| 12.1.2 | Progress doughnut                      | With assignments present                       | The doughnut chart canvas shows. The percentage is visible.         | ✅     |
| 12.1.3 | Plantilla name in the header           | Open the Dashboard                             | The name shows in `[data-el="plantillaName"]`.                      | ✅     |
| 12.1.4 | Clicking a tema card opens a modal     | Click `.tema-card[data-tema-id]`               | A modal with the tema's detail opens (its assigned opciones).       | ✅     |

### 12.2 Per-modo sections

| #      | Case                            | Steps                            | Checks                                          | Status |
| ------ | ------------------------------- | -------------------------------- | ----------------------------------------------- | ------ |
| 12.2.1 | Asignación section visible      | Plantilla with reparto temas     | Cards with progress bars and badges show.       | ✅     |
| 12.2.2 | Votación section visible        | Plantilla with votación temas    | Status badges show.                             | ✅     |
| 12.2.3 | Ranking section visible         | Plantilla with ranking temas     | Status badges show.                             | ✅     |
| 12.2.4 | Texto libre section visible     | Plantilla with texto_libre temas | "Respondida"/"Pendiente" show.                  | ✅     |

---

## 13. CompareView

### 13.1 Comparison tables

| #       | Case                                  | Steps                                        | Checks                                                       | Status |
| ------- | ------------------------------------- | -------------------------------------------- | ------------------------------------------------------------ | ------ |
| 13.1.1  | See the assignment table              | Go to `/comparar` with imported sources      | The comparison table shows.                                  | ✅     |
| 13.1.2  | See the comparison carousel           | Switch mode to "Carrusel"                    | CompareCarousel shows.                                       | ✅     |
| 13.1.3  | See the team view                     | Click "Vista por equipo"                     | Assignments grouped by tema.                                 | ✅     |
| 13.1.4  | Filter by agreement                   | Click the `[data-f="disagree"]` filter       | Only disagreeing rows.                                       | ✅     |
| 13.1.5  | Filter by tema                        | The `#svcFilter` select                      | Only that tema.                                              | ✅     |
| 13.1.6  | Remove a source from the comparison   | Click `[data-rm="<autor>"]`                  | The source is removed from the table.                        | ✅     |
| 13.1.7  | Set an individual final decision      | Change the `.final-select[data-opcion]` select | The decision is recorded.                                  | ✅     |
| 13.1.8  | Autofill the suggestions              | Click `#btnFillSug`                          | Every decision is filled with the suggestion (the majority). | ✅     |
| 13.1.9  | Clear every decision                  | Click `#btnClearRes`, confirm                | The decisions are cleared.                                   | ✅     |
| 13.1.10 | Export the comparison CSV             | Click `#btnExportCmp`                        | A CSV downloads.                                             | ✅     |

### 13.2 Votación comparison

| #      | Case                             | Steps                                                       | Checks                                                              | Status |
| ------ | -------------------------------- | ----------------------------------------------------------- | --------------------------------------------------------------------- | ------ |
| 13.2.1 | See the vote tally               | With imported sources carrying votes, kind tab "Votación"   | Cards with per-opción vote counts show, plus the majority bar.       | ✅     |
| 13.2.2 | Pin the final decision in a vote | Click ★ `.cmp-vt-star[data-vt-pick]`                        | The opción is marked final.                                          | ✅     |

### 13.3 Ranking comparison

| #      | Case                          | Steps                               | Checks                                  | Status |
| ------ | ----------------------------- | ----------------------------------- | --------------------------------------- | ------ |
| 13.3.1 | See the Borda aggregation     | Kind tab "Ranking" with sources     | Borda scores show.                      | ✅     |
| 13.3.2 | Adopt the order as final      | Click `[data-rk-adopt]`             | The order is adopted as the decision.   | ✅     |

### 13.4 Texto libre comparison

| #      | Case                              | Steps                                          | Checks                                                     | Status |
| ------ | --------------------------------- | ---------------------------------------------- | ---------------------------------------------------------- | ------ |
| 13.4.1 | See TextCompareCards              | Kind tab "Texto libre" with sources            | Large cards with each author's answer show.                | ✅     |
| 13.4.2 | Mark an answer as chosen          | Click "Marcar como elegida" on a card          | The card gets the border and the "Elegida" label.          | ✅     |
| 13.4.3 | Navigate between texto temas      | Click the navigation arrows                    | It moves to the next/previous question.                    | ✅     |

---

## 14. Final summary (ResumenFinalView)

| #      | Case                                          | Steps                                                 | Checks                                                                   | Status |
| ------ | --------------------------------------------- | ----------------------------------------------------- | -------------------------------------------------------------------------- | ------ |
| 14.1.1 | See the assignment summary                    | With final decisions set, go to `/resumen`            | Assignment tables with the final decisions show.                         | ✅     |
| 14.1.2 | See the votación summary                      | With final votación decisions                         | Cards with the chosen opción show.                                       | ✅     |
| 14.1.3 | See the ranking summary                       | With final ranking decisions                          | Ordered lists show.                                                      | ✅     |
| 14.1.4 | See the texto libre summary                   | With final texto decisions                            | Quotes with their author show.                                           | ✅     |
| 14.1.5 | Download the HTML                             | Click the "Descargar HTML" button                     | An HTML file downloads.                                                  | ✅     |
| 14.1.6 | Download the final JSON                       | Click "Exportar JSON" in the DropDown                 | A `.respuestas` file with the final decisions downloads.                 | ✅     |
| 14.1.7 | Empty section when there are no decisions     | With no decisions set for a modo                      | "Sin datos" or similar shows.                                            | ✅     |
| 14.2.1 | Import decisions from a hash link             | Navigate to `/#consenso=<data>` and confirm           | The decisions import, it navigates to `/resumen`, and the data shows.    | ✅     |

---

## 15. Slice events

### 15.1 toast:show

| #      | Case                        | Steps                                       | Checks                                                 | Status |
| ------ | --------------------------- | ------------------------------------------- | ------------------------------------------------------ | ------ |
| 15.1.1 | Over-capacity toast         | Assign an opción beyond a tema's maximum    | Toast: `"«Tema» quedó con exceso de personas"`.        | ✅     |
| 15.1.2 | Import error toast          | Emit `toast:show` with `type:'error'`       | No errors.                                             | ✅     |
| 15.1.3 | Success toast               | Emit `toast:show` with `type:'success'`     | No errors.                                             | ✅     |

### 15.2 confirm:request

| #      | Case                                | Steps                                                                                      | Checks                                                   | Status |
| ------ | ----------------------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------- | ------ |
| 15.2.1 | Confirm when deleting a tema        | Click 🗑 on a tema                                                                          | A confirmation modal with the impact message appears.    | ✅     |
| 15.2.2 | Confirm with an input field         | Emit `confirm:request` with `inputLabel`                                                   | No errors.                                               | ✅     |
| 15.2.3 | Danger confirm (red)                | Emit `confirm:request` with `danger:true`                                                  | No errors.                                               | ✅     |
| 15.2.4 | Cancel a confirm                    | Click "Cancelar"                                                                           | The action does not run.                                 | ✅     |
| 15.2.5 | An invalid email blocks the confirm | Emit `confirm:request` with `inputType:'email'`, type an invalid email, click Confirm      | The modal stays open and `onConfirm` does not run.       | ✅     |
| 15.2.6 | A valid email allows the confirm    | Emit `confirm:request` with `inputType:'email'`, type a valid email, click Confirm         | The modal closes and `onConfirm` runs.                   | ✅     |

### 15.3 router:change

| #      | Case                               | Steps                             | Checks                              | Status |
| ------ | ---------------------------------- | --------------------------------- | ----------------------------------- | ------ |
| 15.3.1 | The active tab updates on navigate | Navigate between routes           | The active tab changes correctly.   | ✅     |
| 15.3.2 | popstate updates the UI            | Navigate, then use browser back   | The UI updates.                     | ✅     |

### 15.4 context:change

| #      | Case                              | Steps                                                           | Checks                                | Status |
| ------ | --------------------------------- | --------------------------------------------------------------- | ------------------------------------- | ------ |
| 15.4.1 | Watchers react to changes         | Modify respuestas via the service while the Dashboard is open   | The Dashboard refreshes with no errors. | ✅   |
| 15.4.2 | Plantilla watchers                | Modify the Plantilla via the service while CompareView is open  | CompareView reacts with no errors.    | ✅     |

---

## 16. Reset

### 16.1 Resetting respuestas

| #      | Case                        | Steps                                            | Checks                                                  | Status |
| ------ | --------------------------- | ------------------------------------------------ | -------------------------------------------------------- | ------ |
| 16.1.1 | Reset my respuestas         | UserMenu → "Reiniciar mis Respuestas", confirm   | Every respuesta is cleared. The Dashboard shows 0.      | ✅     |
| 16.1.2 | Cancel the reset            | Click "Reiniciar", cancel the confirm            | The respuestas are intact.                              | ✅     |

### 16.2 Restoring the seed example

| #      | Case                            | Steps                                                     | Checks                                      | Status |
| ------ | ------------------------------- | --------------------------------------------------------- | ------------------------------------------- | ------ |
| 16.2.1 | Restore the seed Plantilla      | PlantillaBuilderView → "🔄 Restaurar ejemplo", confirm    | The 9 seed temas and 15 opciones load.      | ✅     |
| 16.2.2 | Cancel the restore              | Click "Restaurar", cancel                                 | The current Plantilla is intact.            | ✅     |

---

## 17. DragDropService — touch (`DragDropService.spec.js`)

Synthetic `PointerEvent` (`pointerType: 'touch'`) + `TouchEvent`; the real
consumers are the "Por tema" board and the builder's sortable. See GOTCHAS §42.

| #      | Case                                              | Steps                                                                                | Checks                                                                                                              | Status |
| ------ | ------------------------------------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- | ------ |
| 17.1.1 | A quick swipe is a scroll, not a drag             | Touch `pointerdown` on a chip, `pointermove` > 8 px immediately, `pointercancel`     | No `_activeDrag` is created; the service is left free and a later gesture does start (it is not stuck).              | ✅     |
| 17.1.2 | Holding arms the drag and blocks scrolling        | `pointerdown`, wait > 200 ms, `pointermove` to a square, `pointerup`                 | Before arming `touchmove` is NOT cancelled; once armed: ghost, cancelled `touchmove`, `.drag-over`, and drop assigns. | ✅     |
| 17.1.3 | `pointercancel` mid-drag                          | Arm, move over a square, `pointercancel`                                             | No drop, no ghost, `.drag-over` removed, service free.                                                              | ✅     |
| 17.1.4 | Auto-scroll hands over from sidebar to page (phone) | 412 px viewport, arm a chip and hold the finger at the bottom edge                 | The page scrolls until a square is under the finger; the drop assigns to that square.                               | ✅     |
| 17.2.1 | Touch sortable: `pointercancel` restores          | Hold on a row, move, `pointercancel`                                                 | Placeholder and ghost disappear, the row returns to its index, `plantilla.temas` intact.                            | ✅     |
| 17.2.2 | Touch sortable: a drop reorders                   | Hold on row 0, release below row 2                                                   | `plantilla.temas` is reordered and `orden` is 1..n.                                                                 | ✅     |
