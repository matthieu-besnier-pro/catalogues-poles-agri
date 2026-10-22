import LinkZones from '@/components/viewer/LinkZones';
import { mapLinkToCrop } from '@/lib/format';

// Plain <img> at the page's native resolution, not the smart-resizing
// <Image>/ResponsiveImage used elsewhere: that component sizes its request
// off a ResizeObserver measurement of its own box, but react-pageflip
// stretches pages to their on-screen size via a CSS transform — which
// ResizeObserver reports pre-transform, so it was asking for a much smaller
// image than what was actually being displayed (blurry, upscaled pages).
// The page images are already served at a sensible resolution for full-screen
// reading, so there's nothing to gain from trying to match display size here.
// Loaded eagerly: react-pageflip mounts every page upfront rather than only
// the visible ones, and `loading="lazy"` left the browser to guess whether a
// page positioned by the library counted as "near the viewport" — it often
// guessed wrong, so a page turn could land on one that hadn't started
// downloading yet (a blank page that then pops in). Catalogues here run a
// few dozen pages, not hundreds, so loading them all up front is cheap.
export default function PageFace({ page, crop, linksEnabled = true, onLink }) {
  const links = linksEnabled && page?.links?.length
    ? page.links.map((link) => ({ ...mapLinkToCrop(link, crop), url: link.url, page: link.page, label: link.label }))
    : [];

  return (
    <div className="relative h-full w-full overflow-hidden bg-white">
      {page ? (
        <>
          <img
            src={page.image_url}
            alt={`Page ${page.page_number}`}
            className="h-full w-full object-contain"
            loading="eager"
            draggable={false}
          />
          {linksEnabled ? <LinkZones links={links} onFollow={onLink} /> : null}
        </>
      ) : (
        <div className="h-full w-full bg-[#f2f0ea]" />
      )}
    </div>
  );
}
