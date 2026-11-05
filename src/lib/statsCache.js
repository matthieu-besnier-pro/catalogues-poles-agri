// Every stats surface (home KPIs, the global dashboard, each catalogue's own
// tab) re-ran its aggregate queries from scratch on every mount — so
// switching tabs and coming back re-paid the same slow CatalogueEvent scan
// seconds later for identical params. A short in-memory cache (cleared on
// full reload, shared across the whole admin session) skips that repeat work.
const TTL = 60_000;
const cache = new Map();

export async function cached(key, fn) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.time < TTL) return hit.value;
  const value = await fn();
  cache.set(key, { value, time: Date.now() });
  return value;
}
