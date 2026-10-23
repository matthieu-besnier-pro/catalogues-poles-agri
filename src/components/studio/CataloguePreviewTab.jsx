import { ExternalLink } from 'lucide-react';
import { Image } from '@/components/ui/image';
import { Button } from '@/components/ui/button';
import { absoluteUrl, publicPath } from '@/lib/format';

export default function CataloguePreviewTab({ catalogue, pages }) {
  const link = absoluteUrl(publicPath(catalogue.slug));
  const reviewSuffix = catalogue.status === 'published' ? '' : `&rev=${catalogue.preview_token}`;
  const pageLink = (pageNumber) => publicPath(catalogue.slug, `?open=1&p=${pageNumber}${reviewSuffix}`);

  return (
    <div className="grid gap-8 lg:grid-cols-[300px_1fr]">
      <div>
        <div className="paper-soft overflow-hidden rounded-lg border border-border bg-white">
          {catalogue.cover_url ? (
            <Image src={catalogue.cover_url} alt={catalogue.title} className="h-full w-full" />
          ) : (
            <div className="flex aspect-[3/4] items-center justify-center text-sm text-muted-foreground">Couverture</div>
          )}
        </div>
        <Button asChild className="mt-5 w-full rounded-full">
          <a href={link} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="mr-2 h-4 w-4" />
            Ouvrir la visionneuse
          </a>
        </Button>
        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
          {catalogue.page_count || 0} pages · {catalogue.trim_note || 'conversion standard'}
        </p>
      </div>

      <div>
        <p className="font-display text-2xl">Aperçu des pages</p>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
          {catalogue.description || 'Aucune description renseignée pour ce catalogue.'}
        </p>
        {pages.length ? (
          <div className="mt-6 grid grid-cols-4 gap-3 sm:grid-cols-6">
            {pages.map((page) => (
              <a
                key={page.id || page.page_number}
                href={pageLink(page.page_number)}
                target="_blank"
                rel="noopener noreferrer"
                className="group overflow-hidden rounded border border-border bg-white transition-colors hover:border-primary"
                title={`Ouvrir la page ${page.page_number} dans la visionneuse`}
              >
                <Image
                  src={page.image_url}
                  alt={`Page ${page.page_number}`}
                  className="h-full w-full transition-transform duration-300 group-hover:scale-[1.04]"
                />
                <p className="px-1.5 py-1 text-[10px] tabular-nums text-muted-foreground">{page.page_number}</p>
              </a>
            ))}
          </div>
        ) : (
          <p className="mt-6 text-sm text-muted-foreground">Les pages converties apparaîtront ici.</p>
        )}
      </div>
    </div>
  );
}