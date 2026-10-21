import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import PageFace from '@/components/viewer/PageFace';
import { buildTransformUrl, parseWixMediaUrl } from '@/components/ui/image-helpers';
import { buildSpreads } from '@/lib/spreads';
import { cn } from '@/lib/utils';

// Mirrors exactly what PageFace/ResponsiveImage requests for a page of this
// size (fittingType="fit" => uncropped, default quality 90) — preloading the
// raw page.image_url warms the wrong cache entry, since the real <img> asks
// for this resized/optimized variant instead.
function preloadPage(url, width, height) {
  if (!url || width <= 0 || height <= 0) return;
  const parsed = parseWixMediaUrl(url);
  const target = parsed
    ? buildTransformUrl(parsed, { width: Math.round(width), height: Math.round(height), crop: false, quality: 90 })
    : url;
  const image = new window.Image();
  image.src = target;
  image.decode?.().catch(() => {});
}

const SETTLE_MS = 380;
const TAP_TURN_MS = 520;
const DRAG_THRESHOLD = 6;
const COMMIT_RATIO = 0.4;
// Not -180: browsers can flicker/mis-paint backface-visibility right at the
// exact 180° boundary between the two faces (the original CSS keyframes this
// drag logic replaced used -179.5 for the same reason). Landing a hair short
// of it keeps the back face unambiguously the one on screen at rest.
const FLIPPED = -179.9;
const FLAT = 0;

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
    if (activeTurn.current) {
      activeTurn.current.el.removeEventListener('transitionend', activeTurn.current.onEnd);
      window.clearTimeout(activeTurn.current.timer);
    }
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

  // Builds the overlay that will animate over the spine: which page images ride it,
  // and where its hinge sits (the spine between two slots, or a lone page's own edge).
  const beginTurn = useCallback(
    (direction) => {
      const target = spreadIndex + direction;
      if (target < 0 || target >= spreads.length) return null;
      const from = spreads[spreadIndex];
      const to = spreads[target];
      if (!from || !to) return null;
      if (isSingleSlot(from) !== isSingleSlot(to)) {
        // Crossing the front/back cover boundary: the stage itself changes
        // shape mid-flip (a lone centered page vs. a two-slot spread), so a
        // single fixed hinge can't land the rotating page in the right spot
        // at both ends of the animation. Cross-fade instead of 3D-flipping.
        return { direction, target, simple: true, from, to };
      }
      const front = direction > 0 ? from.right : to.right;
      const back = double
        ? direction > 0 ? to.left : from.left
        : direction > 0 ? to.right : from.right;
      const hingeSpread = direction > 0 ? from : to;
      const hingeLeft = double && !isSingleSlot(hingeSpread) ? pageWidth : 0;
      return { direction, front, back, hingeLeft, target, simple: false };
    },
    [double, pageWidth, spreadIndex, spreads],
  );

  // Swaps the static spread over to the new page only once the overlay's own
  // transition has actually finished painting — a parallel setTimeout can
  // fire a frame or two before the CSS transition it's meant to track (it
  // starts counting before the rAF-delayed transition even begins), which
  // swaps the content early and leaves the old page visible for a beat
  // after the flip looks done. transitionend can't drift like that; the
  // timeout stays only as a safety net in case it never fires.
  const finishTurn = useCallback(
    (state, commit) => {
      if (activeTurn.current) {
        activeTurn.current.el.removeEventListener('transitionend', activeTurn.current.onEnd);
        window.clearTimeout(activeTurn.current.timer);
        activeTurn.current = null;
      }
      setTurning(null);
      if (commit) onSpreadChange(state.target);
    },
    [onSpreadChange],
  );

  const animateTo = useCallback(
    (state, property, value, duration, easing, commit) => {
      const el = overlayRef.current;
      if (!el) {
        finishTurn(state, commit);
        return;
      }
      const onEnd = (event) => {
        if (event.target === el && event.propertyName === property) finishTurn(state, commit);
      };
      el.addEventListener('transitionend', onEnd);
      const timer = window.setTimeout(() => finishTurn(state, commit), duration + 150);
      activeTurn.current = { el, onEnd, timer };
      el.style.transition = `${property} ${duration}ms ${easing}`;
      el.style[property] = value;
    },
    [finishTurn],
  );

  const animateOverlayTo = useCallback(
    (state, finalRotation, duration, easing, commit) =>
      animateTo(state, 'transform', `rotateY(${finalRotation}deg)`, duration, easing, commit),
    [animateTo],
  );

  const animateFadeTo = useCallback(
    (state, finalOpacity, duration, easing, commit) => animateTo(state, 'opacity', String(finalOpacity), duration, easing, commit),
    [animateTo],
  );

  const settle = useCallback(
    (state, commit) => {
      if (state.simple) {
        animateFadeTo(state, commit ? 1 : 0, SETTLE_MS, 'ease-out', commit);
        return;
      }
      const forward = state.direction > 0;
      const finalRotation = commit ? (forward ? FLIPPED : FLAT) : (forward ? FLAT : FLIPPED);
      animateOverlayTo(state, finalRotation, SETTLE_MS, 'cubic-bezier(0.33,0.08,0.2,1)', commit);
    },
    [animateFadeTo, animateOverlayTo],
  );

  const go = useCallback(
    (direction) => {
      if (turning || drag.current) return;
      const state = beginTurn(direction);
      if (!state) return;
      setTurning(state);
      requestAnimationFrame(() => {
        if (state.simple) animateFadeTo(state, 1, TAP_TURN_MS, 'ease-out', true);
        else animateOverlayTo(state, direction > 0 ? FLIPPED : FLAT, TAP_TURN_MS, 'cubic-bezier(0.44,0.05,0.24,1)', true);
      });
    },
    [animateFadeTo, animateOverlayTo, beginTurn, turning],
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
      state.direction = direction;
      state.turn = turn;
      event.currentTarget.setPointerCapture(event.pointerId);
      setTurning(turn);
    }
    if (!state.engaged) return;
    state.pendingDelta = delta;
    // One DOM write per screen frame, not per pointermove — pointermove can fire
    // faster than the display refreshes, and writing on every one of them is
    // what makes a 3D rotateY drag feel stuttery instead of silky.
    if (rafId.current) return;
    rafId.current = requestAnimationFrame(() => {
      rafId.current = null;
      if (!overlayRef.current || !drag.current) return;
      const progress = Math.min(1, Math.abs(drag.current.pendingDelta) / pageWidth);
      if (state.turn.simple) {
        overlayRef.current.style.opacity = String(progress);
      } else {
        const rotation = state.direction > 0 ? FLIPPED * progress : FLIPPED * (1 - progress);
        overlayRef.current.style.transform = `rotateY(${rotation}deg)`;
      }
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
  const single = isSingleSlot(current);

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
      {turning?.simple ? (
        <div className="relative" style={{ transform: `scale(${zoom})` }}>
          <div className="absolute inset-0 flex items-center justify-center">{renderSpread(turning.from)}</div>
          <div
            ref={overlayRef}
            className="absolute inset-0 flex items-center justify-center"
            style={{ opacity: 0, willChange: 'opacity' }}
          >
            {renderSpread(turning.to)}
          </div>
          {/* Keeps the stage's own size matched to the departing spread while both layers sit absolutely. */}
          <div className="invisible">{renderSpread(turning.from)}</div>
        </div>
      ) : (
        <div
          className={cn('relative flex items-stretch transition-transform duration-300 ease-out', !single && 'paper')}
          style={{ transform: `scale(${zoom})`, transformStyle: 'preserve-3d', perspective: '2600px' }}
        >
          {double && !single ? (
            <>
              <PageFace page={current.left} crop={crop} width={pageWidth} height={pageHeight} onLink={onLink} />
              <PageFace page={current.right} crop={crop} width={pageWidth} height={pageHeight} onLink={onLink} />
            </>
          ) : (
            <PageFace page={current.right} crop={crop} width={pageWidth} height={pageHeight} onLink={onLink} standalone />
          )}
          {double && !single ? (
            <div className="pointer-events-none absolute inset-y-0 left-1/2 hidden w-[26px] -translate-x-1/2 bg-gradient-to-r from-black/0 via-black/12 to-black/0 lg:block" />
          ) : null}
          {turning ? (
            <div
              ref={overlayRef}
              className="absolute inset-y-0"
              style={{
                left: turning.hingeLeft,
                width: pageWidth,
                transformOrigin: 'left center',
                transformStyle: 'preserve-3d',
                willChange: 'transform',
                transform: `rotateY(${turning.direction > 0 ? FLAT : FLIPPED}deg)`,
              }}
            >
              <PageFace page={turning.front} face="front" crop={crop} onLink={onLink} />
              <PageFace page={turning.back} face="back" crop={crop} onLink={onLink} />
            </div>
          ) : null}
        </div>
      )}

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
