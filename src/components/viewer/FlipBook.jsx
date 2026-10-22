import { forwardRef, useImperativeHandle, useRef } from 'react';
import HTMLFlipBook from 'react-pageflip';
import PageFace from '@/components/viewer/PageFace';

// Real page-curl book, via react-pageflip (the library behind most
// Calaméo/Issuu-style catalogue viewers) instead of a hand-built animation —
// it already handles double/single layout, the front/back cover standing
// alone, drag-to-turn and the paper shadow, which is exactly the ground we
// kept re-covering by hand.
const FlipBook = forwardRef(function FlipBook({ pages, startPage = 1, onFlip, onLink, crop, zoom = 1, containerRef }, ref) {
  const bookRef = useRef(null);

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
    <div ref={containerRef} className="relative flex h-full w-full items-center justify-center overflow-auto">
      <div style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}>
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
          mobileScrollSupport={false}
          drawShadow
          flippingTime={420}
          startPage={Math.min(Math.max(0, startPage - 1), last)}
          onFlip={(event) => onFlip(event.data)}
          className="paper"
        >
          {pages.map((page, index) => (
            <div key={page.id || page.page_number} className="page bg-white" data-density={index === 0 || index === last ? 'hard' : 'soft'}>
              <PageFace page={page} crop={crop} width="100%" height="100%" onLink={onLink} />
            </div>
          ))}
        </HTMLFlipBook>
      </div>
    </div>
  );
});

export default FlipBook;
