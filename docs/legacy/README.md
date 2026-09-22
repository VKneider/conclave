# Legacy docs — historical record, NOT current state

Everything in this folder describes work that is **finished**, superseded, or
fixed upstream. It is kept because it explains *why* the code looks the way it
does, but it must not be read as documentation of how the app works today.

**For the current state, read `docs/` one level up** (and `AGENTS.md` at the
root, which indexes it).

| File | What it is | Why it is legacy |
| --- | --- | --- |
| `REDESIGN.md` | The phased rework (Fases 0–6) that turned Conclave from "assign people to teams" into a generic decision/ideas app: the data model, the four modos, custom atributos, the preset gallery, and the architecture refactor. | Every phase shipped. Its product decisions are the rationale behind today's model; the step-by-step plan is history. `docs/DATA.md` documents the resulting model. |
| `PLAN-SLICE-COMPONENTS.md` | The plan to replace raw `<button>`/`<select>`/`<input>` with registry Visual components. | All 9 phases are ✅ HECHA. The convention it established now lives in `docs/COMPONENT-PATTERNS.md` §Reskinning registry components and GOTCHAS §14/§26. |
| `PLAN-SINTESIS-TEXTO.md` | The plan for synthesising a final answer from several `texto_libre` responses. | ✅ Implemented (stages 0–5). The feature is documented in `docs/FEATURES.md` §TextCompareCards / SynthTextoModal. |
| `SLICEJS-BUNDLE-INIT-BUG.md` | A framework bug: `Slice.js`'s `init()` loaded bundles before creating `slice.logger`, so `loadBundle()` crashed calling `logger.logWarning()`. | Fixed upstream. In `slicejs-web-framework@4.0.2` the logger is created (`Slice.js:459`) before any `loadBundle` call (`:488`). |

## When to move a doc in here

A doc belongs in `legacy/` when it documents a **plan that shipped**, a
**migration that completed**, or a **bug that was fixed** — anything whose
value is now "this is how we got here" rather than "this is how it works".
When you move one, add a row above saying what replaced it, and update the doc
index in `AGENTS.md`.
