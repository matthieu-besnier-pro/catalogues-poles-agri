import { AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ConversionProgress({ progress, error, onRetry, compact = false }) {
  if (error) {
    return (
      <div className={compact ? 'space-y-3' : 'rounded-xl border border-destructive/30 bg-destructive/5 p-6'}>
        <p className="flex items-center gap-2 text-sm font-medium text-destructive">
          <AlertTriangle className="h-4 w-4" />
          La conversion n’a pas abouti
        </p>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{error}</p>
        {onRetry ? (
          <Button variant="outline" size="sm" onClick={onRetry} className="mt-3 rounded-full">
            Relancer la conversion
          </Button>
        ) : null}
      </div>
    );
  }

  const percent = Math.round(progress?.percent || 0);

  return (
    <div>
      <div className="flex items-center gap-3">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <p className="text-sm">{progress?.stage || 'Conversion en cours…'}</p>
        <p className="ml-auto text-sm tabular-nums text-muted-foreground">{percent} %</p>
      </div>
      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-500 ease-out"
          style={{ width: `${Math.max(3, percent)}%` }}
        />
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        Chaque page est convertie en image, indexée pour la recherche, puis publiée. Vous pouvez laisser cet onglet ouvert.
      </p>
    </div>
  );
}