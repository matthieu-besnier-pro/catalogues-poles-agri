import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import HTMLFlipBook from 'react-pageflip';
import PageFace from '@/components/viewer/PageFace';

const NARROW_BREAKPOINT = 900;

// Real page-curl book, via react-pageflip (the library behind most
// Calaméo/Issuu-style catalogue viewers) instead of a hand-built animation —
// it already handles double/single layout, the front/back cover standing
// alone, drag-to-turn and the paper shadow, which is exactly the ground we
// kept re-covering by hand.
const FlipBook = forwardRef(function FlipBook({ pages, startPage = 1, onFlip, onLink, crop, zoom = 1, containerRef }, ref) {
  const bookRef = useRef(null);
  // Decide single- vs double-page ourselves rather than trust the library's
  // own container-based heuristic (it was defaulting to single-page even on
  // wide desktop viewports).
  const [isNarrow, setIsNarrow] = useState(() => typeof window !== 'undefined' && window.innerWidth < NARROW_BREAKPOINT);

  useEffect(() => {
    const onResize = () => setIsNarrow(window.innerWidth < NARROW_BREAKPOINT);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      flip: (pageNumber) => bookRef.current?.pageFlip()?.flip(Math.max(0, pageNumber - 1)),
      flipNext: () => bookRef.current?.pageFlip()?.flipNext(),
      flipPrev: () => bookRef.current?.pageFlip()?.flipPrev(),
    }),
    [],
  );

  const ratio = pages[0]?.width && pages[0]?.height ? pages[0].width / pages[0].height : 0.707;
  const safeRatio = ratio > 0.35 && ratio < 1.4 ? ratio : 0.707;
  const baseHeight = 900;
  const baseWidth = Math.round(baseHeight * safeRatio);
  const last = pages.length - 1;

  return (
    // react-pageflip's size="stretch" measures its own direct parent to
    // decide how big to render — it must be THIS div (already sized by flex
    // layout from above), not some intermediate unsized wrapper, or it falls
    // back to the literal width/height props (a small, fixed size that then
    // makes even a full-resolution page image look tiny and soft). The zoom
    // scale is applied to the book's own root via its style prop instead of
    // a wrapping div, so it can't get in the way of that measurement.
    <div ref={containerRef} className="relative flex h-full w-full items-center justify-center overflow-auto">
      <HTMLFlipBook
        ref={bookRef}
        width={baseWidth}
        height={baseHeight}
        size="stretch"
        minWidth={200}
        maxWidth={1400}
        minHeight={280}
        maxHeight={2000}
        showCover
        usePortrait={isNarrow}
        mobileScrollSupport={false}
        drawShadow
        flippingTime={420}
        startPage={Math.min(Math.max(0, startPage - 1), last)}
        onFlip={(event) => onFlip(event.data)}
        className="paper"
        style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
      >
        {pages.map((page, index) => (
          <div key={page.id || page.page_number} className="page bg-white" data-density={index === 0 || index === last ? 'hard' : 'soft'}>
            <PageFace page={page} crop={crop} onLink={onLink} eager={index < 2} />
          </div>
        ))}
      </HTMLFlipBook>
    </div>
  );
});

export default FlipBook;
