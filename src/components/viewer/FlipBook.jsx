import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import HTMLFlipBook from 'react-pageflip';
import PageFace from '@/components/viewer/PageFace';

const NARROW_BREAKPOINT = 900;

// Real page-curl book, via react-pageflip (the library behind most
// Calaméo/Issuu-style catalogue viewers) instead of a hand-built animation —
// it already handles double/single layout, the front/back cover standing
// alone, drag-to-turn and the paper shadow, which is exactly the ground we
// kept re-covering by hand.
const ROUND_TO = 8;

const FlipBook = forwardRef(function FlipBook({ pages, startPage = 1, onFlip, onLink, crop, zoom = 1, containerRef }, ref) {
  const bookRef = useRef(null);
  const [area, setArea] = useState({ width: 0, height: 0 });
  // The book remounts whenever its computed size changes (react-pageflip
  // doesn't react to width/height prop changes once built) — track where the
  // reader actually is so that remount reopens on the same page instead of
  // snapping back to wherever the book first opened.
  const pageRef = useRef(Math.max(0, startPage - 1));
  // showCover correctly keeps the front/back cover from pairing with a
  // neighbour, but react-pageflip still renders them inside the full
  // double-page frame — the lone page docked to one half, the other half
  // blank. Nudging it sideways alone just moves the blank half to the other
  // edge instead of removing it, since the frame itself stays double-width;
  // tracking the current page lets a clipping window (below) hide that
  // other half outright on exactly those two pages.
  const [activePage, setActivePage] = useState(pageRef.current);
  // Decide single- vs double-page ourselves rather than trust the library's
  // own container-based heuristic (it was defaulting to single-page even on
  // wide desktop viewports).
  const [isNarrow, setIsNarrow] = useState(() => typeof window !== 'undefined' && window.innerWidth < NARROW_BREAKPOINT);

  useEffect(() => {
    const onResize = () => setIsNarrow(window.innerWidth < NARROW_BREAKPOINT);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // react-pageflip's own size="stretch" measurement proved unreliable (too
  // small with an unsized parent, then overflowing the viewport once that
  // was fixed) — measuring the container ourselves and handing the library
  // an exact fixed size removes the guesswork entirely.
  useEffect(() => {
    const element = containerRef?.current;
    if (!element) return undefined;
    const measure = () =>
      setArea({
        width: Math.round(element.clientWidth / ROUND_TO) * ROUND_TO,
        height: Math.round(element.clientHeight / ROUND_TO) * ROUND_TO,
      });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [containerRef]);

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
  const last = pages.length - 1;

  // Fit one page inside the available space, respecting both the width
  // budget (half the container in double-page mode) and the height budget —
  // whichever is tighter wins, so the book never overflows either axis.
  const widthBudget = Math.max(120, (isNarrow ? area.width : area.width / 2) - 16);
  const heightBudget = Math.max(160, area.height - 16);
  const pageHeight = Math.round(Math.min(heightBudget, widthBudget / safeRatio));
  const pageWidth = Math.round(pageHeight * safeRatio);
  const ready = area.width > 0 && area.height > 0;

  // The front cover docks into the RIGHT half of the double-page frame, the
  // back cover into the LEFT half (observed empirically) — shift the inner
  // book so the real content lands at the window's origin, then clip the
  // window itself down to one page width so the other, blank half is
  // actually hidden rather than just relocated.
  const isCover = !isNarrow && (activePage === 0 || activePage === last);
  const innerLeft = isCover && activePage === 0 ? -pageWidth : 0;
  const frameWidth = isCover ? pageWidth : pageWidth * (isNarrow ? 1 : 2);

  return (
    <div ref={containerRef} className="relative flex h-full w-full items-center justify-center overflow-auto">
      {ready ? (
        <div
          className="relative overflow-hidden"
          style={{ width: frameWidth, height: pageHeight, transform: `scale(${zoom})`, transformOrigin: 'center center' }}
        >
          <div className="absolute top-0" style={{ left: innerLeft }}>
            <HTMLFlipBook
              key={`${isNarrow ? 'single' : 'double'}-${pageWidth}-${pageHeight}`}
              ref={bookRef}
              width={pageWidth}
              height={pageHeight}
              size="fixed"
              showCover
              usePortrait={isNarrow}
              mobileScrollSupport={false}
              drawShadow
              flippingTime={420}
              startPage={Math.min(Math.max(0, pageRef.current), last)}
              onFlip={(event) => {
                pageRef.current = event.data;
                setActivePage(event.data);
                onFlip(event.data);
              }}
              className="paper"
            >
              {pages.map((page, index) => (
                <div key={page.id || page.page_number} className="page bg-white" data-density={index === 0 || index === last ? 'hard' : 'soft'}>
                  <PageFace page={page} crop={crop} onLink={onLink} />
                </div>
              ))}
            </HTMLFlipBook>
          </div>
        </div>
      ) : null}
    </div>
  );
});

export default FlipBook;
