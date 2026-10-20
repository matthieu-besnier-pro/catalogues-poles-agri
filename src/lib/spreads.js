export function isDoublePage(width) {
  const value = typeof width === 'number' ? width : typeof window === 'undefined' ? 1280 : window.innerWidth;
  return value >= 1024;
}

export function buildSpreads(pages, double) {
  if (!pages || !pages.length) return [];
  if (!double) {
    const last = pages.length - 1;
    return pages.map((page, index) => ({ left: null, right: page, cover: index === 0 || index === last }));
  }

  const last = pages.length - 1;
  if (last === 0) return [{ left: null, right: pages[0], cover: true }];

  // Front and back cover always stand alone and centered, like a real book —
  // only the interior pages pair up into two-page spreads.
  const spreads = [{ left: null, right: pages[0], cover: true }];
  const interior = pages.slice(1, last);
  for (let index = 0; index < interior.length; index += 2) {
    spreads.push({ left: interior[index], right: interior[index + 1] || null, cover: false });
  }
  spreads.push({ left: null, right: pages[last], cover: true });
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