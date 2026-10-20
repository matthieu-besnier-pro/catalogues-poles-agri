import { Link } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { Image } from '@/components/ui/image';
import StatusBadge from '@/components/studio/StatusBadge';
import { formatDate, formatNumber } from '@/lib/format';

export default function CatalogueCard({ catalogue, viewCount }) {
  return (
    <Link to={`/catalogue/${catalogue.id}`} className="group block">
      <div className="paper-soft relative aspect-[3/4] overflow-hidden rounded-lg border border-border bg-secondary">
        {catalogue.cover_url ? (
          <Image
            src={catalogue.cover_url}
            alt={catalogue.title}
            className="h-full w-full transition-transform duration-700 ease-out group-hover:scale-[1.035]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <FileText className="h-7 w-7" />
          </div>
        )}
        <div className="absolute left-3 top-3">
          <StatusBadge status={catalogue.status} />
        </div>
      </div>
      <div className="mt-3.5 space-y-1">
        <p className="font-display text-lg leading-snug transition-colors group-hover:text-primary">{catalogue.title}</p>
        <p className="text-xs text-muted-foreground">
          {catalogue.pole_name ? `${catalogue.pole_name} · ` : ''}
          {formatNumber(catalogue.page_count)} pages
          {typeof viewCount === 'number' ? ` · ${formatNumber(viewCount)} vues` : ''}
        </p>
        <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground/70">
          {catalogue.status === 'published' ? 'Publié le' : 'Créé le'} {formatDate(catalogue.published_date || catalogue.created_date)}
        </p>
      </div>
    </Link>
  );
}