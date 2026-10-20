import { Download, Grid3x3, List, Maximize2, Search, Share2, ZoomIn, ZoomOut } from 'lucide-react';
import { cn } from '@/lib/utils';

const BUTTON = 'flex h-9 w-9 items-center justify-center rounded-full text-white/75 transition-colors hover:bg-white/12 hover:text-white';

function Tool({ label, active, onClick, children }) {
  return (
    <button type="button" title={label} aria-label={label} onClick={onClick} className={cn(BUTTON, active && 'bg-white/15 text-white')}>
      {children}
    </button>
  );
}

export default function ViewerToolbar({
  catalogue,
  panel,
  onPanel,
  zoom,
  onZoom,
  onFullscreen,
  onDownload,
  onShare,
  compact = false,
}) {
  return (
    <header className="relative z-20 flex items-center gap-3 border-b border-white/10 bg-primary px-3 py-2.5 text-primary-foreground lg:px-5">
      <div className="min-w-0 flex-1">
        {catalogue.pole_name ? (
          <p className="flex items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-accent">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" />
            {catalogue.pole_name}
          </p>
        ) : null}
        <h1 className="truncate font-display text-sm leading-tight lg:text-base">{catalogue.title}</h1>
      </div>
      <div className="flex items-center gap-0.5">
        <Tool label="Sommaire" active={panel === 'toc'} onClick={() => onPanel(panel === 'toc' ? null : 'toc')}>
          <List className="h-4 w-4" />
        </Tool>
        <Tool label="Miniatures" active={panel === 'thumbs'} onClick={() => onPanel(panel === 'thumbs' ? null : 'thumbs')}>
          <Grid3x3 className="h-4 w-4" />
        </Tool>
        {catalogue.search_enabled ? (
          <Tool label="Rechercher" active={panel === 'search'} onClick={() => onPanel(panel === 'search' ? null : 'search')}>
            <Search className="h-4 w-4" />
          </Tool>
        ) : null}
        <span className="mx-1 hidden h-5 w-px bg-white/15 sm:block" />
        <Tool label="Réduire" onClick={() => onZoom(-1)}>
          <ZoomOut className="h-4 w-4" />
        </Tool>
        <span className="hidden min-w-[38px] text-center text-[11px] tabular-nums text-white/60 sm:block">{Math.round(zoom * 100)} %</span>
        <Tool label="Agrandir" onClick={() => onZoom(1)}>
          <ZoomIn className="h-4 w-4" />
        </Tool>
        {!compact ? (
          <Tool label="Plein écran" onClick={onFullscreen}>
            <Maximize2 className="h-4 w-4" />
          </Tool>
        ) : null}
        <Tool label="Partager" onClick={onShare}>
          <Share2 className="h-4 w-4" />
        </Tool>
        {catalogue.download_enabled ? (
          <Tool label="Télécharger le PDF" onClick={onDownload}>
            <Download className="h-4 w-4" />
          </Tool>
        ) : null}
      </div>
    </header>
  );
}