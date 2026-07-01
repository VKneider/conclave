// slice.build() only checks its per-type template/CSS cache BEFORE a fetch
// starts, and only populates it once that fetch resolves. Firing N builds of
// the same component type via Promise.all() before any of them resolves is a
// race: every one of them sees the cache empty and independently re-fetches
// the same .html/.css. Building the first instance alone warms that cache;
// the rest can then build in parallel safely.
export async function buildEach(componentName, propsList) {
  if (!propsList.length) return [];
  const [first, ...rest] = propsList;
  const firstNode = await slice.build(componentName, first);
  const restNodes = await Promise.all(rest.map((props) => slice.build(componentName, props)));
  return [firstNode, ...restNodes];
}
