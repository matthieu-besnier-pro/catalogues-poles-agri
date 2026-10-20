import { Download, Leaf } from 'lucide-react';
import { Image } from '@/components/ui/image';
import { Button } from '@/components/ui/button';

export default function CoverScreen({ catalogue, onOpen, onDownload }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-primary px-6 py-14">
      <div className="flex w-full max-w-[560px] flex-col items-center text-center">
        {catalogue.pole_name ? (
          <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-accent">
            <Leaf className="h-3.5 w-3.5" />
            {catalogue.pole_name}
          </p>
        ) : null}
        <h1 className="mt-5 font-display text-3xl leading-tight text-primary-foreground lg:text-4xl">{catalogue.title}</h1>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-primary-foreground/70">
          {catalogue.description || `Catalogue feuilletable de ${catalogue.page_count || 0} pages, consultable en ligne.`}
        </p>

        <div className="paper relative mt-10 w-[240px] overflow-hidden rounded-lg bg-white sm:w-[280px]">
          {catalogue.cover_url ? (
            <Image src={catalogue.cover_url} alt={catalogue.title} className="h-full w-full" />
          ) : (
            <div className="flex aspect-[3/4] items-center justify-center text-muted-foreground">Couverture</div>
          )}
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Button size="lg" onClick={onOpen} className="rounded-full bg-accent px-8 text-accent-foreground hover:bg-accent/90">
            Feuilleter le catalogue
          </Button>
          {catalogue.download_enabled ? (
            <button
              type="button"
              onClick={onDownload}
              className="inline-flex items-center gap-2 rounded-full border border-white/25 px-6 py-3.5 text-sm text-primary-foreground transition-colors hover:bg-white/10"
            >
              <Download className="h-4 w-4" />
              Télécharger le PDF
            </button>
          ) : null}
        </div>
        <p className="mt-8 text-[11px] uppercase tracking-[0.18em] text-primary-foreground/40">
          {catalogue.page_count || 0} pages · lecture gratuite, sans compte
        </p>
      </div>
    </div>
  );
}