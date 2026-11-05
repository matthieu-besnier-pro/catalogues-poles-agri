import { formatNumber } from '@/lib/format';

export default function TopCataloguesList({ rows, catalogueTitles, onSelect }) {
  const max = (rows || []).reduce((value, row) => Math.max(value, row.count || 0), 0) || 1;

  if (!rows?.length) {
    return <p className="mt-3 text-sm text-muted-foreground">Aucune vue sur cette période.</p>;
  }

  return (
    <ul className="mt-4 space-y-2">
      {rows.map((row) => (
        <li key={row.catalogue_id}>
          <button
            type="button"
            onClick={() => onSelect?.(row.catalogue_id)}
            disabled={!onSelect}
            className="w-full rounded-lg px-2 py-2 text-left transition-colors enabled:hover:bg-secondary"
          >
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate">{catalogueTitles?.[row.catalogue_id] || row.catalogue_id}</span>
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{formatNumber(row.count)} vues</span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
              <div className="h-full rounded-full bg-accent" style={{ width: `${Math.max(3, (row.count / max) * 100)}%` }} />
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}
