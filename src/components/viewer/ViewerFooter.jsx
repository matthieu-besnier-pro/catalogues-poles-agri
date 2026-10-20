import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function ViewerFooter({ firstPage, lastPage, totalPages, index, count, onPrev, onNext, onSeek }) {
  const progress = count > 1 ? (index / (count - 1)) * 100 : 0;
  const label = !firstPage
    ? `Couverture`
    : lastPage && lastPage !== firstPage
      ? `Pages ${firstPage}–${lastPage}`
      : `Page ${firstPage}`;

  return (
    <footer className="relative z-20 flex items-center gap-3 border-t border-border bg-background/95 px-3 py-2.5 backdrop-blur lg:px-6">
      <button
        type="button"
        onClick={onPrev}
        disabled={index <= 0}
        aria-label="Page précédente"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-border transition-colors hover:bg-secondary disabled:opacity-35"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onNext}
        disabled={index >= count - 1}
        aria-label="Page suivante"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-border transition-colors hover:bg-secondary disabled:opacity-35"
      >
        <ChevronRight className="h-4 w-4" />
      </button>

      <div className="relative mx-1 flex-1">
        <div className="absolute left-0 top-1/2 h-[3px] w-full -translate-y-1/2 rounded-full bg-secondary" />
        <div className="absolute left-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-accent transition-[width] duration-300" style={{ width: `${progress}%` }} />
        <input
          type="range"
          min={0}
          max={Math.max(0, count - 1)}
          value={index}
          onChange={(event) => onSeek(Number(event.target.value))}
          aria-label="Position dans le catalogue"
          className="relative w-full cursor-pointer opacity-0"
          style={{ height: '18px' }}
        />
      </div>

      <p className="shrink-0 text-[11px] uppercase tracking-[0.14em] text-muted-foreground tabular-nums">
        {label} <span className="text-muted-foreground/60">/ {totalPages}</span>
      </p>
    </footer>
  );
}