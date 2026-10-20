import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PageFace from '@/components/viewer/PageFace';
import { buildSpreads } from '@/lib/spreads';
import { cn } from '@/lib/utils';

const TURN_MS = 640;

export default function FlipBook({ pages, spreadIndex, onSpreadChange, onLink, crop, zoom = 1, containerRef }) {
  const [double, setDouble] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 1024);
  const [turning, setTurning] = useState(null);
  const [area, setArea] = useState({ width: 0, height: 0 });
  const touchStart = useRef(null);
  const timer = useRef(null);

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

  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);

  const spreads = useMemo(() => buildSpreads(pages, double), [pages, double]);
  const current = spreads[Math.min(spreadIndex, Math.max(0, spreads.length - 1))];

  useEffect(() => {
    const next = spreads[spreadIndex + 1];
    [next?.left?.image_url, next?.right?.image_url].forEach((url) => {
      if (url) {
        const image = new Image();
        image.src = url;
      }
    });
  }, [spreads, spreadIndex]);

  const go = useCallback(
    (direction) => {
      if (turning) return;
      const target = spreadIndex + direction;
      if (target < 0 || target >= spreads.length) return;
      const from = spreads[spreadIndex];
      const to = spreads[target];
      if (!from || !to) return;
      const front = direction > 0 ? from.right : to.right;
      const back = double
        ? direction > 0 ? to.left : from.left
        : direction > 0 ? to.right : from.right;
      setTurning({ direction, front, back });
      timer.current = window.setTimeout(() => {
        setTurning(null);
        onSpreadChange(target);
      }, TURN_MS);
    },
    [double, onSpreadChange, spreadIndex, spreads, turning],
  );

  if (!current) {
    return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Préparation des pages…</div>;
  }

  const ratio = pages[0]?.width && pages[0]?.height ? pages[0].width / pages[0].height : 0.707;
  const safeRatio = ratio > 0.35 && ratio < 1.4 ? ratio : 0.707;
  const perPage = double ? Math.max(120, area.width / 2) : Math.max(180, area.width);
  const pageHeight = Math.max(160, Math.min(area.height || 600, perPage / safeRatio));
  const pageWidth = pageHeight * safeRatio;

  const handleClick = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const position = (event.clientX - rect.left) / rect.width;
    go(position > 0.5 ? 1 : -1);
  };

  return (
    <div
      ref={containerRef}
      className={cn('relative flex h-full w-full items-center justify-center', zoom > 1 ? 'overflow-auto' : 'overflow-hidden')}
      onClick={zoom > 1 ? undefined : handleClick}
      onTouchStart={(event) => { touchStart.current = event.touches[0].clientX; }}
      onTouchEnd={(event) => {
        if (touchStart.current === null || zoom > 1) return;
        const delta = event.changedTouches[0].clientX - touchStart.current;
        touchStart.current = null;
        if (Math.abs(delta) > 45) go(delta < 0 ? 1 : -1);
      }}
    >
      <div
        className="paper relative flex items-stretch transition-transform duration-300 ease-out"
        style={{ transform: `scale(${zoom})`, transformStyle: 'preserve-3d', perspective: '2600px' }}
      >
        {double ? (
          <>
            <PageFace page={current.left} crop={crop} width={pageWidth} height={pageHeight} onLink={onLink} />
            <PageFace page={current.right} crop={crop} width={pageWidth} height={pageHeight} onLink={onLink} />
          </>
        ) : (
          <PageFace page={current.right} crop={crop} width={pageWidth} height={pageHeight} onLink={onLink} />
        )}
        <div className="pointer-events-none absolute inset-y-0 left-1/2 hidden w-[26px] -translate-x-1/2 bg-gradient-to-r from-black/0 via-black/12 to-black/0 lg:block" />
        {turning ? (
          <div
            className="absolute inset-y-0"
            style={{
              left: double ? pageWidth : 0,
              width: pageWidth,
              transformOrigin: 'left center',
              transformStyle: 'preserve-3d',
              animation: `${turning.direction > 0 ? 'leaf-forward' : 'leaf-backward'} ${TURN_MS}ms cubic-bezier(0.44,0.05,0.24,1) forwards`,
            }}
          >
            <PageFace page={turning.front} face="front" crop={crop} onLink={onLink} />
            <PageFace page={turning.back} face="back" crop={crop} onLink={onLink} />
          </div>
        ) : null}
      </div>
    </div>
  );
}