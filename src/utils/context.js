export function ensureContext(name, initialState, storageKey) {
  if (!slice.context.has(name)) {
    slice.context.create(name, initialState, { persist: true, storageKey });
  }
}
