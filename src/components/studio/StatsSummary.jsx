import StatCard from '@/components/studio/StatCard';
import { Download, Eye, FileText, Users } from 'lucide-react';
import { formatNumber } from '@/lib/format';
import { typeCount } from '@/lib/stats';

export default function StatsSummary({ overview }) {
  if (!overview) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((key) => (
          <div key={key} className="h-[122px] animate-pulse rounded-xl border border-border bg-secondary/50" />
        ))}
      </div>
    );
  }

  const views = typeCount(overview.byType, 'view');
  const pages = typeCount(overview.byType, 'page');
  const downloads = typeCount(overview.byType, 'download');
  const shares = typeCount(overview.byType, 'share');
  const fullReads = typeCount(overview.byType, 'full_read');

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label="Vues" value={formatNumber(views)} hint={`${formatNumber(shares)} partages`} icon={Eye} />
      <StatCard label="Lecteurs uniques" value={formatNumber(overview.readers)} hint="sans cookie nominatif" icon={Users} />
      <StatCard
        label="Pages lues par visite"
        value={views ? (pages / views).toFixed(1) : '—'}
        hint={`${formatNumber(fullReads)} lectures complètes`}
        icon={FileText}
      />
      <StatCard
        label="Téléchargements PDF"
        value={formatNumber(downloads)}
        hint={views ? `${Math.round((downloads / views) * 100)} % des vues` : '—'}
        icon={Download}
      />
    </div>
  );
}