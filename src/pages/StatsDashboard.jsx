import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Breakdown from '@/components/studio/Breakdown';
import PeriodSelect from '@/components/studio/PeriodSelect';
import StatsMethodology from '@/components/studio/StatsMethodology';
import StatsSummary from '@/components/studio/StatsSummary';
import TopCataloguesList from '@/components/studio/TopCataloguesList';
import TrendChart from '@/components/studio/TrendChart';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { downloadText, formatDateTime, toCsv } from '@/lib/format';
import { DEVICE_LABELS, SOURCE_LABELS, exportEvents, fetchOverview } from '@/lib/stats';

const TYPE_LABELS = {
  view: 'Vue',
  page: 'Page lue',
  full_read: 'Lecture complète',
  download: 'Téléchargement',
  share: 'Partage',
};

export default function StatsDashboard() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  // Même filtrage « confort » que la liste des catalogues : un admin rattaché
  // à une ou plusieurs filiales ne voit ses stats que pour celles-ci. « Toutes
  // les filiales » reste sélectionnable mais ne porte alors que sur les
  // filiales qui lui sont attribuées (la liste `poles` elle-même est déjà
  // restreinte à celles-ci).
  const scopedPoleIds = user?.role === 'admin' ? user?.pole_ids || [] : [];
  const scopedPoleKey = scopedPoleIds.join(',');
  const [days, setDays] = useState(30);
  const [poleId, setPoleId] = useState('all');
  const [poles, setPoles] = useState([]);
  const [catalogueTitles, setCatalogueTitles] = useState({});
  const [overview, setOverview] = useState(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const query = scopedPoleIds.length ? { id: { $in: scopedPoleIds } } : {};
    base44.entities.Pole.filter(query, { sort: 'display_order', limit: 50 }).then((page) => setPoles(page.items || []));
    base44.entities.Catalogue.filter({}, { fields: ['id', 'title'], limit: 500 }).then((page) => {
      const map = {};
      (page.items || []).forEach((item) => {
        map[item.id] = item.title;
      });
      setCatalogueTitles(map);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopedPoleKey]);

  useEffect(() => {
    let active = true;
    setOverview(null);
    fetchOverview({ poleId: poleId === 'all' ? '' : poleId, poleIds: poleId === 'all' ? scopedPoleIds : [], days }).then((data) => {
      if (active) setOverview(data);
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days, poleId, scopedPoleKey]);

  const handleExport = async () => {
    setExporting(true);
    const rows = await exportEvents({
      poleId: poleId === 'all' ? '' : poleId,
      poleIds: poleId === 'all' ? scopedPoleIds : [],
      days,
    });
    downloadText(
      toCsv(
        rows.map((row) => ({
          Date: formatDateTime(row.created_date),
          Événement: TYPE_LABELS[row.type] || row.type,
          Catalogue: catalogueTitles[row.catalogue_id] || row.catalogue_id,
          Page: row.page_number || '',
          Source: SOURCE_LABELS[row.source] || row.source || '',
          Appareil: DEVICE_LABELS[row.device] || row.device || '',
        })),
      ),
      `statistiques-${new Date().toISOString().slice(0, 10)}.csv`,
    );
    setExporting(false);
    toast({ title: 'Export prêt', description: `${rows.length} événements exportés au format CSV.` });
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 lg:px-12 lg:py-16">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">Mesure d’audience</p>
          <h1 className="mt-3 font-display text-4xl leading-tight">Statistiques</h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Vues, lecteurs uniques, pages consultées, téléchargements et canaux d’arrivée. Aucune donnée nominative n’est collectée.
          </p>
        </div>
        <Button variant="outline" className="rounded-full" disabled={exporting} onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />
          {exporting ? 'Export…' : 'Exporter en CSV'}
        </Button>
      </header>

      <div className="mt-10 flex flex-wrap items-center gap-3">
        <PeriodSelect value={days} onChange={setDays} />
        <Select value={poleId} onValueChange={setPoleId}>
          <SelectTrigger className="h-9 w-[210px] rounded-full">
            <SelectValue placeholder="Toutes les filiales" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les filiales</SelectItem>
            {poles.map((pole) => (
              <SelectItem key={pole.id} value={pole.id}>
                {pole.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-8 space-y-6">
        <StatsSummary overview={overview} />

        <div className="rounded-xl border border-border bg-card p-6">
          <p className="font-display text-lg">Vues par jour</p>
          <div className="mt-4">
            <TrendChart data={overview?.trend || []} />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-6">
            <p className="font-display text-lg">Catalogues les plus consultés</p>
            <TopCataloguesList
              rows={overview?.byCatalogue || []}
              catalogueTitles={catalogueTitles}
              onSelect={(catalogueId) => navigate(`/catalogue/${catalogueId}`)}
            />
          </div>
          <div className="rounded-xl border border-border bg-card p-6">
            <Breakdown title="Origine du trafic" rows={overview?.sources || []} labels={SOURCE_LABELS} />
          </div>
          <div className="rounded-xl border border-border bg-card p-6">
            <Breakdown title="Appareils" rows={overview?.devices || []} labels={DEVICE_LABELS} />
          </div>
        </div>

        <StatsMethodology />
      </div>
    </div>
  );
}