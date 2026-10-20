import { formatNumber } from '@/lib/format';

export default function Breakdown({ title, rows, labels, emptyLabel = 'Pas encore de donnée.' }) {
  const total = (rows || []).reduce((sum, row) => sum + (row.count || 0), 0);

  return (
    <div>
      <p className="font-display text-lg">{title}</p>
      {rows?.length ? (
        <ul className="mt-4 space-y-3">
          {rows.map((row) => {
            const share = total ? Math.round(((row.count || 0) / total) * 100) : 0;
            return (
              <li key={row.source || row.device || row.key}>
                <div className="flex items-baseline justify-between text-sm">
                  <span>{labels[row.source || row.device] || row.source || row.device}</span>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {formatNumber(row.count)} · {share} %
                  </span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full bg-primary/70" style={{ width: `${Math.max(2, share)}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">{emptyLabel}</p>
      )}
    </div>
  );
}