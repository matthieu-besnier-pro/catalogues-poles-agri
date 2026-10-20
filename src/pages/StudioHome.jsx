import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, Eye, Plus, Search, Sparkles, Users } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import CatalogueCard from '@/components/studio/CatalogueCard';
import StatCard from '@/components/studio/StatCard';
import { escapeRegex, formatNumber } from '@/lib/format';
import { fetchStudioHome } from '@/lib/queries';
import { typeCount } from '@/lib/stats';
import { cn } from '@/lib/utils';

const TABS = [
  { key: 'all', label: 'Tous' },
  { key: 'published', label: 'Publiés' },
  { key: 'draft', label: 'Brouillons' },
];

export default function StudioHome() {
  const [status, setStatus] = useState('all');
  const [term, setTerm] = useState('');
  const [catalogues, setCatalogues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [kpi, setKpi] = useState(null);

  useEffect(() => {
    fetchStudioHome(30).then(setKpi);
  }, []);

  useEffect(() => {
    let active = true;
    const handle = window.setTimeout(async () => {
      setLoading(true);
      const query = {};
      if (status === 'published' || status === 'draft') query.status = status;
      else query.status = { $ne: 'archived' };
      const cleaned = term.trim();
      if (cleaned) query.title = { $regex: escapeRegex(cleaned), $options: 'i' };
      const result = await base44.entities.Catalogue.filter(query, { sort: '-created_date', limit: 60 });
      if (!active) return;
      setCatalogues(result.items || []);
      setLoading(false);
    }, term ? 320 : 0);
    return () => {
      active = false;
      window.clearTimeout(handle);
    };
  }, [status, term]);

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
        <StatCard label="Catalogues publiés" value={kpi ? formatNumber(kpi.published) : '—'} hint="en ligne actuellement" icon={Sparkles} />
        <StatCard label="Vues" value={kpi ? formatNumber(typeCount(kpi.byType, 'view')) : '—'} hint="30 derniers jours" icon={Eye} />
        <StatCard label="Lecteurs uniques" value={kpi ? formatNumber(kpi.readers) : '—'} hint="sans cookie nominatif" icon={Users} />
        <StatCard label="Téléchargements PDF" value={kpi ? formatNumber(typeCount(kpi.byType, 'download')) : '—'} hint="30 derniers jours" icon={Download} />
      </div>

      <section className="mt-16">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="font-display text-2xl">Tous les catalogues</h2>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={term}
                onChange={(event) => setTerm(event.target.value)}
                placeholder="Rechercher un titre"
                className="h-9 w-56 rounded-full border border-border bg-card pl-9 pr-3 text-sm outline-none focus:border-primary"
              />
            </div>
            <div className="flex gap-1 rounded-full bg-secondary p-1">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setStatus(tab.key)}
                  className={cn(
                    'rounded-full px-3.5 py-1.5 text-xs transition-colors',
                    status === tab.key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((key) => (
              <div key={key} className="animate-pulse">
                <div className="aspect-[3/4] rounded-lg bg-secondary" />
                <div className="mt-4 h-4 w-3/4 rounded bg-secondary" />
                <div className="mt-2 h-3 w-1/2 rounded bg-secondary" />
              </div>
            ))}
          </div>
        ) : catalogues.length ? (
          <div className="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {catalogues.map((catalogue) => (
              <CatalogueCard key={catalogue.id} catalogue={catalogue} viewCount={kpi?.views?.[catalogue.id] || 0} />
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-2xl border border-dashed border-border bg-card/60 px-8 py-16 text-center">
            <h3 className="font-display text-2xl">Aucun catalogue pour l’instant</h3>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
              Déposez le PDF d’un de vos pôles : les pages sont converties en images, le sommaire et le texte sont extraits, et un
              lien public est généré en une seule opération.
            </p>
            <Button asChild size="lg" className="mt-7 rounded-full px-6">
              <Link to="/nouveau">
                <Plus className="mr-2 h-4 w-4" />
                Importer un PDF
              </Link>
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}