// Thin wrapper over slice.context — the single place context persistence is
// configured. Replaces the old utils/context.js `ensureContext()`: domain
// services call `this.ensure(...)` ONCE from their own init() (recovered via
// getComponent) instead of importing a bare util from an absolute path.
// Built first in Providers so every context-owning service can depend on it.
//
// `ensure` is idempotent (create-if-absent) — see GOTCHAS §20: adding a key
// to a context's initialState later does NOT retroactively backfill it for
// returning users, so migrations belong in the owning service's init(), not
// here.
export default class StoreService {
  ensure(name, initialState, storageKey) {
    if (!slice.context.has(name)) {
      slice.context.create(name, initialState, { persist: true, storageKey });
    }
  }

  has(name) {
    return slice.context.has(name);
  }

  get(name) {
    return slice.context.getState(name);
  }

  // `updater` is `(prev) => next` — the same contract as slice.context.setState.
  set(name, updater) {
    slice.context.setState(name, updater);
  }

  // Watchers registered with `component` are auto-cleaned on its destroy —
  // don't unwatch by hand. `selector` (optional) narrows the refresh to a
  // slice of state so watchers only fire when the relevant part changes.
  watch(name, component, callback, selector) {
    slice.context.watch(name, component, callback, selector);
  }
}
