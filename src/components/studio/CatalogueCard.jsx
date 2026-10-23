import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, FileText, Pencil } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Image } from '@/components/ui/image';
import StatusBadge from '@/components/studio/StatusBadge';
import { formatDate, formatNumber, publicPath } from '@/lib/format';

function QuickAction({ label, icon: Icon, onClick }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClick();
      }}
      className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-primary shadow-sm transition-colors hover:bg-white"
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

export default function CatalogueCard({ catalogue, viewCount, to }) {
  const navigate = useNavigate();
  const admin = !to;

  const browseUrl =
    catalogue.status === 'published'
      ? publicPath(catalogue.slug, '?open=1')
      : publicPath(catalogue.slug, `?open=1&rev=${catalogue.preview_token}`);

  const openPdf = async () => {
    if (!catalogue.pdf_file_uri) return;
    const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({
      file_uri: catalogue.pdf_file_uri,
      expires_in: 900,
    });
    window.open(signed_url, '_blank', 'noopener');
  };

  return (
    <Link to={to || `/catalogue/${catalogue.id}`} className="group block">
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
        {admin ? (
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 bg-gradient-to-t from-black/55 to-transparent px-3 py-3 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <QuickAction label="Feuilleter" icon={BookOpen} onClick={() => window.open(browseUrl, '_blank', 'noopener')} />
            <QuickAction label="Voir le PDF" icon={FileText} onClick={openPdf} />
            <QuickAction label="Modifier" icon={Pencil} onClick={() => navigate(`/catalogue/${catalogue.id}`)} />
          </div>
        ) : null}
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