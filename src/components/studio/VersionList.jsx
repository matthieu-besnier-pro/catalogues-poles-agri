import { FileText, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import StatusBadge from '@/components/studio/StatusBadge';
import { formatBytes, formatDateTime } from '@/lib/format';

export default function VersionList({ versions, activeVersionId, onReplace, busy }) {
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between gap-4 border-b border-border p-5">
        <div>
          <p className="font-display text-lg">Versions</p>
          <p className="mt-1 text-xs text-muted-foreground">Remplacer le PDF crée une version : le lien public ne change pas.</p>
        </div>
        <Button variant="outline" size="sm" disabled={busy} onClick={onReplace} className="shrink-0 rounded-full">
          <RefreshCw className="mr-2 h-3.5 w-3.5" />
          Remplacer le PDF
        </Button>
      </div>

      <ul className="divide-y divide-border">
        {versions.map((version) => (
          <li key={version.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 p-5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary">
              <FileText className="h-4 w-4 text-primary" />
            </span>
            <div className="min-w-[200px] flex-1">
              <p className="flex items-center gap-2 text-sm">
                {version.label || 'Version'}
                {version.id === activeVersionId ? (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-primary">
                    diffusée
                  </span>
                ) : null}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {version.file_name || 'PDF'} · {formatBytes(version.file_size)} · {version.page_count || 0} pages ·{' '}
                {formatDateTime(version.created_date)}
              </p>
              {version.status === 'failed' && version.error ? (
                <p className="mt-1 text-[11px] text-destructive">{version.error}</p>
              ) : null}
            </div>
            <StatusBadge status={version.status} />
          </li>
        ))}
        {!versions.length ? (
          <li className="p-5 text-sm text-muted-foreground">Aucune version enregistrée pour ce catalogue.</li>
        ) : null}
      </ul>
    </div>
  );
}