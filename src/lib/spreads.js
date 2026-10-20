export function isDoublePage(width) {
  const value = typeof width === 'number' ? width : typeof window === 'undefined' ? 1280 : window.innerWidth;
  return value >= 1024;
}

export function buildSpreads(pages, double) {
  if (!pages || !pages.length) return [];
  if (!double) return pages.map((page) => ({ left: null, right: page }));
  const spreads = [{ left: null, right: pages[0] }];
  for (let index = 1; index < pages.length; index += 2) {
    spreads.push({ left: pages[index], right: pages[index + 1] || null });
  }
  return spreads;
}

export function findSpreadIndex(spreads, pageNumber) {
  if (!pageNumber) return 0;
  const index = spreads.findIndex(
    (spread) => spread.left?.page_number === pageNumber || spread.right?.page_number === pageNumber,
  );
  return index < 0 ? 0 : index;
}

export function spreadPageNumbers(spread) {
  if (!spread) return [];
  return [spread.left?.page_number, spread.right?.page_number].filter(Boolean);
}