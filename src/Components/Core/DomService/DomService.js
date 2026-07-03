// DOM/list helpers for views — keeps the leak-prone list-diff logic in ONE
// place (services own logic; Visual is only UI) instead of hand-rolled in
// every view.
//
// reconcile() is the canonical way to render a variable-length list of child
// components, following the framework's own update() guidance:
//   • existing (by stable sliceId) → refresh IN PLACE, prop-by-prop
//     (slice.setComponentProps by default, or a coordinated node.update(props)
//     via the `refresh` override for interdependent props / async child builds).
//   • new → slice.build with the stable sliceId.
//   • gone → slice.controller.destroyComponent (runs beforeDestroy so the
//     registry is cleaned) — NEVER innerHTML='' (GOTCHAS §7 leak).
//   • order → the DOM sequence is forced to match `items` order, so the items
//     array is the single source of truth for display order (newest-first, an
//     `orden` field, a re-sort, drag). Moving an existing node is NOT cloning,
//     so it never re-runs the constructor / leaks (GOTCHAS §6) — only nodes
//     that are out of place are moved.
export default class DomService {
  async reconcile(container, items, { keyOf, component, props, refresh }) {
    const applyRefresh = refresh || ((node, p) => slice.setComponentProps(node, p));
    const alive = new Set();
    const ordered = [];

    for (const item of items) {
      const sliceId = keyOf(item);
      alive.add(sliceId);
      const p = props ? props(item) : {};
      let node = slice.getComponent(sliceId);
      if (node) {
        await applyRefresh(node, p);
      } else {
        node = await slice.build(component, { sliceId, ...p });
      }
      if (node) ordered.push(node);
    }

    // Prune: destroy children whose data is gone (before reordering).
    for (const el of Array.from(container.children)) {
      const id = el.getAttribute('slice-id');
      if (id && !alive.has(id)) slice.controller.destroyComponent(id);
    }

    // Enforce DOM order === items order — move only what's out of place.
    ordered.forEach((node, i) => {
      if (container.children[i] !== node) {
        container.insertBefore(node, container.children[i] || null);
      }
    });
  }
}
