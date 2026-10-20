import { Link } from 'react-router-dom';
import { Download, Eye, Plus, Sparkles, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CatalogueCard from '@/components/studio/CatalogueCard';
import StatCard from '@/components/studio/StatCard';

// Aperçu local : données d'exemple, remplacées par la base dès le premier import.
const SAMPLE_CATALOGUES = [
  {
    id: 'sample-1',
    title: 'Semences & fourrages',
    pole_name: 'Pôle Végétal',
    status: 'published',
    page_count: 184,
    cover_url: '',
    created_date: '2026-10-20T09:00:00.000Z',
    published_date: '2026-10-20T09:00:00.000Z',
  },
  {
    id: 'sample-2',
    title: 'Nutrition animale 2026',
    pole_name: 'Pôle Animal',
    status: 'draft',
    page_count: 96,
    cover_url: '',
    created_date: '2026-10-20T09:00:00.000Z',
  },
  {
    id: 'sample-3',
    title: 'Matériel de récolte',
    pole_name: 'Pôle Agroéquipement',
    status: 'published',
    page_count: 252,
    cover_url: '',
    created_date: '2026-10-20T09:00:00.000Z',
    published_date: '2026-10-20T09:00:00.000Z',
  },
];

export default function StudioHome() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-10 lg:px-12 lg:py-16">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">Espace de publication</p>
          <h1 className="mt-3 font-display text-4xl leading-[1.05] lg:text-5xl">Vos catalogues</h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Importez un PDF : il devient un catalogue feuilletable, diffusé par un lien public stable, avec ses statistiques de lecture.
          </p>
        </div>
        <Button asChild size="lg" className="rounded-full px-6">
          <Link to="/nouveau">
            <Plus className="mr-2 h-4 w-4" />
            Nouveau catalogue
          </Link>
        </Button>
      </header>

      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Catalogues publiés" value="2" hint="sur 3 catalogues" icon={Sparkles} />
        <StatCard label="Vues" value="1 284" hint="30 derniers jours" icon={Eye} />
        <StatCard label="Lecteurs uniques" value="912" hint="Sans cookie nominatif" icon={Users} />
        <StatCard label="Téléchargements PDF" value="168" hint="13 % des vues" icon={Download} />
      </div>

      <section className="mt-16">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="font-display text-2xl">Tous les catalogues</h2>
          <span className="rounded-full bg-secondary px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Aperçu · données d'exemple
          </span>
        </div>
        <div className="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {SAMPLE_CATALOGUES.map((catalogue) => (
            <CatalogueCard key={catalogue.id} catalogue={catalogue} viewCount={0} />
          ))}
        </div>
      </section>
    </div>
  );
}