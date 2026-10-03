// Portals can be siblings in React. Allocate by opening order, not DOM ancestry.
const activeLayers = new Set<number>();

export function acquireModalLayer() {
  const layer = activeLayers.size ? Math.max(...activeLayers) + 1 : 0;
  activeLayers.add(layer);
  return { layer, release: () => { activeLayers.delete(layer); } };
}
