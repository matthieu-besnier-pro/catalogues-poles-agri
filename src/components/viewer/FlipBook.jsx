import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import PageFace from '@/components/viewer/PageFace';
import { DEVICE_PIXEL_RATIOS, buildTransformUrl, parseWixMediaUrl } from '@/components/ui/image-helpers';
import { buildSpreads } from '@/lib/spreads';
import { cn } from '@/lib/utils';

// Mirrors exactly what PageFace/ResponsiveImage requests for a page of this
// size (fittingType="fit" => uncropped, default quality 90). The real <img>
// also carries a srcSet with 1x/2x/3x variants and the browser — not this
// code — decides which one to actually fetch based on screen density; on
// any Retina display that's the 2x (or 3x) URL, never the plain one, so
// preloading only the bare width/height warmed a cache entry the browser
// was never going to use. Preload every candidate so whichever one wins is
// already warm.
function preloadPage(url, width, height) {
  if (!url || width <= 0 || height <= 0) return;
  const parsed = parseWixMediaUrl(url);
  if (!parsed) {
    const image = new window.Image();
    image.src = url;
    image.decode?.().catch(() => {});
    return;
  }
  DEVICE_PIXEL_RATIOS.forEach((dpr) => {
    // buildTransformUrl rounds internally (clampDim) — rounding here too, on
    // a different intermediate value than buildSrcSet's own `width * dpr`,
    // can land one pixel off and silently build a different URL than the
    // one the <img> will actually request.
    const target = buildTransformUrl(parsed, { width: width * dpr, height: height * dpr, crop: false, quality: 90 });
    const image = new window.Image();
    image.src = target;
    image.decode?.().catch(() => {});
  });
}

const SETTLE_MS = 320;
const TAP_TURN_MS = 420;
const DRAG_THRESHOLD = 6;
const COMMIT_RATIO = 0.4;

const isSingleSlot = (spread) => !(spread?.left && spread?.right);

export default function FlipBook({ pages, spreadIndex, onSpreadChange, onLink, crop, zoom = 1, containerRef }) {
  const [double, setDouble] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 1024);
  const [turning, setTurning] = useState(null);
  const [area, setArea] = useState({ width: 0, height: 0 });
  const overlayRef = useRef(null);
  const drag = useRef(null);
  const activeTurn = useRef(null);
  const rafId = useRef(null);

  useEffect(() => {
    const onResize = () => setDouble(window.innerWidth >= 1024);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const element = containerRef?.current;
    if (!element) return undefined;
    const measure = () => setArea({ width: element.clientWidth, height: element.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [containerRef, pages.length, double]);

  useEffect(() => () => {
    if (activeTurn.current) window.clearTimeout(activeTurn.current.timer);
    if (rafId.current) cancelAnimationFrame(rafId.current);
  }, []);

  const spreads = useMemo(() => buildSpreads(pages, double), [pages, double]);
  const current = spreads[Math.min(spreadIndex, Math.max(0, spreads.length - 1))];

  const ratio = pages[0]?.width && pages[0]?.height ? pages[0].width / pages[0].height : 0.707;
  const safeRatio = ratio > 0.35 && ratio < 1.4 ? ratio : 0.707;
  const perPage = double ? Math.max(120, area.width / 2) : Math.max(180, area.width);
  const pageHeight = Math.max(160, Math.min(area.height || 600, perPage / safeRatio));
  const pageWidth = pageHeight * safeRatio;

  useEffect(() => {
    if (!pageWidth || !pageHeight) return;
    [spreads[spreadIndex - 1], spreads[spreadIndex + 1]].forEach((spread) => {
      preloadPage(spread?.left?.image_url, pageWidth, pageHeight);
      preloadPage(spread?.right?.image_url, pageWidth, pageHeight);
    });
  }, [spreads, spreadIndex, pageWidth, pageHeight]);

  // Renders one whole spread (both pages, or the single centered cover) as a
  // self-contained block — used for the static page and for each side of a
  // transition, so every page in the spread changes together as one unit
  // instead of one side flipping while the other waits for state to catch up.
  const renderSpread = (spread) => {
    const isSingle = isSingleSlot(spread);
    return (
      <div className={cn('relative flex items-stretch', !isSingle && 'paper')}>
        {double && !isSingle ? (
          <>
            <PageFace page={spread.left} crop={crop} width={pageWidth} height={pageHeight} onLink={onLink} />
            <PageFace page={spread.right} crop={crop} width={pageWidth} height={pageHeight} onLink={onLink} />
          </>
        ) : (
          <PageFace page={spread.right} crop={crop} width={pageWidth} height={pageHeight} onLink={onLink} standalone />
        )}
        {double && !isSingle ? (
          <div className="pointer-events-none absolute inset-y-0 left-1/2 hidden w-[26px] -translate-x-1/2 bg-gradient-to-r from-black/0 via-black/12 to-black/0 lg:block" />
        ) : null}
      </div>
    );
  };

  const beginTurn = useCallback(
    (direction) => {
      const target = spreadIndex + direction;
      if (target < 0 || target >= spreads.length) return null;
      const from = spreads[spreadIndex];
      const to = spreads[target];
      if (!from || !to) return null;
      return { direction, target, from, to };
    },
    [spreadIndex, spreads],
  );

  // Swaps the static spread over to the new page once the overlay's own
  // transition is due to finish. Timed by a plain setTimeout — not
  // transitionend, which this code relied on before but which testing showed
  // never actually fires here, turning every flip's safety-net padding into
  // a fixed, repeatable delay rather than a rare fallback.
  const finishTurn = useCallback(
    (state, commit) => {
      if (activeTurn.current) {
        window.clearTimeout(activeTurn.current.timer);
        activeTurn.current = null;
      }
      setTurning(null);
      if (commit) onSpreadChange(state.target);
    },
    [onSpreadChange],
  );

  const animateFadeTo = useCallback(
    (state, finalOpacity, duration, easing, commit) => {
      const el = overlayRef.current;
      if (!el) {
        finishTurn(state, commit);
        return;
      }
      // Force the browser to commit/paint the starting opacity before
      // switching the transition on — otherwise React's render of it and
      // this rAF-scheduled mutation can land in the same frame and get
      // collapsed into one paint, so nothing visibly animates.
      void el.offsetHeight;
      const timer = window.setTimeout(() => finishTurn(state, commit), duration);
      activeTurn.current = { timer };
      el.style.transition = `opacity ${duration}ms ${easing}`;
      el.style.opacity = String(finalOpacity);
    },
    [finishTurn],
  );

  const settle = useCallback(
    (state, commit) => animateFadeTo(state, commit ? 1 : 0, SETTLE_MS, 'ease-out', commit),
    [animateFadeTo],
  );

  const go = useCallback(
    (direction) => {
      if (turning || drag.current) return;
      const state = beginTurn(direction);
      if (!state) return;
      setTurning(state);
      requestAnimationFrame(() => animateFadeTo(state, 1, TAP_TURN_MS, 'ease-out', true));
    },
    [animateFadeTo, beginTurn, turning],
  );

  const onPointerDown = (event) => {
    if (zoom > 1 || turning) return;
    const rect = event.currentTarget.getBoundingClientRect();
    drag.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      atRight: (event.clientX - rect.left) / rect.width > 0.5,
      engaged: false,
    };
  };

  const onPointerMove = (event) => {
    const state = drag.current;
    if (!state || state.pointerId !== event.pointerId) return;
    const delta = event.clientX - state.startX;
    if (!state.engaged) {
      if (Math.abs(delta) < DRAG_THRESHOLD) return;
      const direction = delta < 0 ? 1 : -1;
      const turn = beginTurn(direction);
      if (!turn) {
        drag.current = null;
        return;
      }
      state.engaged = true;
      state.turn = turn;
      event.currentTarget.setPointerCapture(event.pointerId);
      setTurning(turn);
    }
    if (!state.engaged) return;
    state.pendingDelta = delta;
    // One DOM write per screen frame, not per pointermove — pointermove can fire
    // faster than the display refreshes, and writing on every one of them is
    // what makes the drag feel stuttery instead of silky.
    if (rafId.current) return;
    rafId.current = requestAnimationFrame(() => {
      rafId.current = null;
      if (!overlayRef.current || !drag.current) return;
      const progress = Math.min(1, Math.abs(drag.current.pendingDelta) / pageWidth);
      overlayRef.current.style.opacity = String(progress);
      state.progress = progress;
    });
  };

  const endPointer = () => {
    const state = drag.current;
    if (!state) return;
    drag.current = null;
    if (!state.engaged) {
      go(state.atRight ? 1 : -1);
      return;
    }
    settle(state.turn, (state.progress || 0) > COMMIT_RATIO);
  };

  if (!current) {
    return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Préparation des pages…</div>;
  }

  const canPrev = spreadIndex > 0;
  const canNext = spreadIndex < spreads.length - 1;

  return (
    <div
      ref={containerRef}
      className={cn(
        'group/stage relative flex h-full w-full items-center justify-center select-none',
        zoom > 1 ? 'touch-auto overflow-auto' : 'touch-none overflow-hidden',
        zoom <= 1 && !turning && 'cursor-grab active:cursor-grabbing',
      )}
      onPointerDown={zoom > 1 ? undefined : onPointerDown}
      onPointerMove={zoom > 1 ? undefined : onPointerMove}
      onPointerUp={zoom > 1 ? undefined : endPointer}
      onPointerCancel={zoom > 1 ? undefined : endPointer}
    >
      <div className="relative" style={{ transform: `scale(${zoom})` }}>
        <div className="absolute inset-0 flex items-center justify-center">
          {renderSpread(turning ? turning.from : current)}
        </div>
        {turning ? (
          <div
            ref={overlayRef}
            className="absolute inset-0 flex items-center justify-center"
            style={{ opacity: 0, willChange: 'opacity' }}
          >
            {renderSpread(turning.to)}
          </div>
        ) : null}
        {/* Keeps the stage's own size matched to the current spread while the layers above sit absolutely. */}
        <div className="invisible">{renderSpread(turning ? turning.from : current)}</div>
      </div>

      {zoom <= 1 ? (
        <>
          <button
            type="button"
            aria-label="Page précédente"
            tabIndex={-1}
            onClick={() => go(-1)}
            disabled={!canPrev}
            className="pointer-events-none absolute inset-y-0 left-0 flex w-16 items-center justify-start pl-2 opacity-0 transition-opacity duration-200 group-hover/stage:pointer-events-auto group-hover/stage:opacity-100 disabled:hidden lg:pl-4"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-background/80 text-foreground shadow-md backdrop-blur transition-transform hover:scale-105">
              <ChevronLeft className="h-5 w-5" />
            </span>
          </button>
          <button
            type="button"
            aria-label="Page suivante"
            tabIndex={-1}
            onClick={() => go(1)}
            disabled={!canNext}
            className="pointer-events-none absolute inset-y-0 right-0 flex w-16 items-center justify-end pr-2 opacity-0 transition-opacity duration-200 group-hover/stage:pointer-events-auto group-hover/stage:opacity-100 disabled:hidden lg:pr-4"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-background/80 text-foreground shadow-md backdrop-blur transition-transform hover:scale-105">
              <ChevronRight className="h-5 w-5" />
            </span>
          </button>
        </>
      ) : null}
    </div>
  );
}
