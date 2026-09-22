# Potential improvements

A backlog of opportunities — bugs, UI/UX, new use cases, technical debt.
Originally collected July 2026; re-checked against the code each time it is
touched, so a row here is an **open** item (shipped ones are deleted, not
ticked).

---

## Bugs / open

| Priority | Item | Location | Notes |
|---|---|---|---|
| High | CompareView table overflows on mobile | `CompareView.js` `_renderOpcionView` / `_renderTemaView` | No horizontal scroll: on narrow screens the data runs off the viewport. Add `overflow-x: auto` plus a visual "swipe" hint. |
| High | Focus handling in the carousel when advancing | `MisRespuestasView.js` | After navigating (‹ › / keyboard / dots), focus does not move to the new Opción's pill set. A keyboard user has to tab through everything. |
| Medium | Missing animations in votación/ranking | `RespuestasVotacionView.js`, `RespuestasRankingView.js` | The carousel has `pillAssignPop` (bounce). Votación swaps a class instantly; ranking moves items with no transition. Add a scale/bounce on vote and a slide on reorder. |

---

## Technical debt

| Priority | Item | Location | Notes |
|---|---|---|---|
| High | **CompareView: 1086 lines** | `CompareView.js` | By far the largest file. `docs/legacy/REDESIGN.md` already identified extracting a `ComparativaService`, but it was never done. It handles 6 distinct sub-views in one file. |
| Medium | **Duplicated notes logic** | `CompareView.js`, `ResumenFinalView.js` | ~50 near-identical lines of load/save/persist for notes in localStorage, sharing the key `conclave-notas-por-tema-v1`. Move it into a Core or Domain service. |
| Low | `var` in `ConsensoService` | `ConsensoService.js` (23 occurrences) | Uses `var` in the middle of otherwise modern ES6. Move to `const`/`let`. |
| Low | `innerHTML` for large sub-views | `CompareView.js` `_renderVotacion`, `_renderRanking`, `_renderOpcionView`, `_renderTemaView` | Huge HTML strings, harder to maintain and test than Slice components. |
| Low | Duplicated print/export CSS | `RespuestasService.js`, `ConsensoService.js` | Inline styles in JS strings that duplicate the design system. If the Sticker Book theme changes, they do not follow. |

---

## UI / UX polish

### Animations
- **Votación**: `RespuestasVotacionView`'s pills swap the `vv-opc--chosen`
  class with no transition. A bounce like the carousel's `pillAssignPop` would
  give immediate feedback.
- **Ranking**: the ▲▼ buttons swap items with no animation. Sliding the item
  up/down would read better. Alternatively: drag-to-reorder, reusing
  `DragDropService` (which now handles touch — GOTCHAS §42).

### Empty states
- `CompareView` builds its own `.empty-state` divs in HTML. A reusable
  `EmptyState` component exists and is not used there. Unify them.

### Fullscreen
- `RespuestasTextoView` has a fullscreen overlay for the editor; `CompareView`
  has another one for the whole view. They differ in style and in how they
  close (Escape vs button). Share the pattern.

### Responsive / mobile
- **Comparison table**: horizontal overflow with no affordance. Add a scroll
  gradient as a hint.
- **Carousel arrows**: the `‹` `›` characters are very small tap targets on
  mobile. Grow them to at least 44px buttons.
- **Mobile keyboard + fullscreen overlay**: in `RespuestasTextoView`, the fixed
  overlay loses scroll when the virtual keyboard opens.

### Accessibility
- **No `aria-live` regions**: dynamic updates (carousel advance, comparison
  refresh, toasts) are not announced to screen readers.
- **Colour-only indicators**: the `.ok`/`.over`/`.under` badges use background
  colour alone, with no icon or extra text. (CompareView's tag is fine — it
  includes the words "Coincide"/"Difiere".)
- **Skip navigation link**: there is no "skip to main content" for keyboard
  navigation.
- **Focus trapping in modals**: `ConfirmActionModal` does not trap focus
  explicitly (the registry `Modal` might — worth verifying).
- **`prefers-reduced-motion`**: `pillAssignPop` and `checkBounce` lack the
  media-query guard that `UX.md` prescribes for every other animation.

### Consistency
- **Static landing page**: the use-case cards and the steps are always the
  same. They could reflect the current state ("You have 5 unassigned Opciones").
- **URL import is hidden**: it lives inside a `<details>` in CompareView —
  hard to discover.

---

## New use cases

### 1. PWA / offline-first (effort: 1–2 days)
All the state already lives in localStorage and there is no server. What is
missing:
- a `service-worker.js` caching the assets
- a `manifest.json` with icons and `display: standalone`
- registering the SW in `AppShell.init()`

### 2. Quick co-located session via BroadcastChannel (effort: 1 day)
See the detailed explanation below.

### 3. Preset gallery on the landing page (effort: half a day)
Today the 6 presets live in a `<details>` inside the builder. Showing them on
the landing as jump-start cards, each with its description, and navigating to
`/plantilla` with the preset preloaded on click (or a confirmation when data
exists).

### 4. Multi-Plantilla (effort: 2–3 days)
Today you can only hold one Plantilla at a time (importing replaces it). A
dashboard listing saved Plantillas (open, duplicate, delete) would unlock
organisers running several sessions.

### 5. Weighted voting (effort: 2–3 days)
Instead of one vote per person per Opción, let people distribute points (e.g.
10 points to split across Opciones). Either a new modo or a variant of
`votacion`.

### 6. Import Opciones from CSV (effort: 1 day)
For organisers who keep lists in Excel/Sheets. Uploading a CSV maps columns to
nombre + atributos and creates the Opciones in the pool or in the active Tema.

### 7. Filter by person in CompareView (effort: half a day)
The current filters are by Opción (query) and by Tema (dropdown). There is no
way to see only one specific person's answers.

### 8. Export the whole session as PDF/HTML (effort: 1–2 days)
`ResumenFinalView` already exports HTML with the decisions. An "export
everything" combining the Plantilla's description + every answer (per person) +
the final decisions, in one document.

---

## BroadcastChannel — explanation

`BroadcastChannel` is a browser API for communication between **tabs, windows
and iframes of the same origin** (same `https://domain`). It needs no server
and no network connection.

### How it works

```js
// Tab A: send a message
const canal = new BroadcastChannel('conclave-sync');
canal.postMessage({ type: 'respuestas-update', data: respuestas });

// Tab B: receive it
const canal = new BroadcastChannel('conclave-sync');
canal.onmessage = (event) => {
  if (event.data.type === 'respuestas-update') {
    // import/merge the respuestas
  }
};
```

### What it would be good for in Conclave

Today, two people in the same room have to: (1) export a `.respuestas` file,
(2) share it by mail/USB/message, (3) import it. With BroadcastChannel:

1. **An organiser opens the Plantilla on their machine.**
2. **They share a link** (the same URL) with everyone else in the room.
3. **Each person opens that same URL in their own tab** (same machine, or a
   different one — on the same LAN that would need WebRTC; BroadcastChannel is
   same-machine only).
4. **When someone finishes their answers and clicks "Compartir"**, the app
   posts the respuestas over the channel.
5. **The other tabs** receive the message and import them automatically, with
   no file in between.

### Limitations
- **It only works between tabs of the same browser on the same machine.** It
  does nothing for people on different computers (that is what the
  `.respuestas` files or a server are for).
- Syncing between devices on the same LAN would need WebRTC or an intermediary
  server (WebSocket, peer.js). That escapes Conclave's serverless spirit.

### Complementary alternative: QR + hash
The app already shows a QR in the sharing modals. If the QR encoded the
Plantilla + respuestas in a URL hash (as `#plantilla=` and `#consenso=` already
do) instead of — or as well as — exporting a file, scanning it would open the
app with the data preloaded in another tab, and BroadcastChannel could keep
later changes in sync.

---

## Suggested priority

1. **High value / low effort**: votación + ranking animations, carousel focus
   handling, mobile table overflow.
2. **High impact**: extract `ComparativaService`, deduplicate the notes logic —
   both reduce debt and unblock further CompareView work.
3. **New feature (quick session)**: BroadcastChannel + the existing QR hash →
   the killer feature for in-room use.
4. **Later**: PWA, multi-Plantilla, landing gallery, CSV import.

---

## Shipped since this list was written

Deleted from the backlog because they are done — kept here only so a reader
does not re-file them:

- Unified toast API (`CompareView` now emits `toast:show` everywhere; no direct
  `ToastProvider.show()` calls remain).
- Dead `--male-color` / `--female-color` tokens removed from the themes.
- Touch drag-and-drop: the board and the builder's sortable work on a phone
  (GOTCHAS §42), so "Por tema" is no longer hidden on coarse pointers.
