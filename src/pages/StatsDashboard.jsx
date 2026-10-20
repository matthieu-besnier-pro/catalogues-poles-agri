import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import Breakdown from '@/components/studio/Breakdown';
import PeriodSelect from '@/components/studio/PeriodSelect';
import StatsSummary from '@/components/studio/StatsSummary';
import TopPagesList from '@/components/studio/TopPagesList';
import TrendChart from '@/components/studio/TrendChart';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { base44 } from '@/api/base44Client';
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
  const [days, setDays] = useState(30);
  const [poleId, setPoleId] = useState('all');
  const [poles, setPoles] = useState([]);
  const [overview, setOverview] = useState(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    base44.entities.Pole.filter({}, { sort: 'display_order', limit: 50 }).then((page) => setPoles(page.items || []));
  }, []);

  useEffect(() => {
    let active = true;
    setOverview(null);
    fetchOverview({ poleId: poleId === 'all' ? '' : poleId, days }).then((data) => {
      if (active) setOverview(data);
    });
    return () => {
      active = false;
    };
  }, [days, poleId]);

  const handleExport = async () => {
    setExporting(true);
    const rows = await exportEvents({ poleId: poleId === 'all' ? '' : poleId, days });
    downloadText(
      toCsv(
        rows.map((row) => ({
          Date: formatDateTime(row.created_date),
          Événement: TYPE_LABELS[row.type] || row.type,
          Catalogue: row.catalogue_id,
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
            <SelectValue placeholder="Tous les pôles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les pôles</SelectItem>
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
            <p className="font-display text-lg">Pages les plus lues</p>
            <TopPagesList rows={overview?.topPages || []} />
          </div>
          <div className="rounded-xl border border-border bg-card p-6">
            <Breakdown title="Origine du trafic" rows={overview?.sources || []} labels={SOURCE_LABELS} />
          </div>
          <div className="rounded-xl border border-border bg-card p-6">
            <Breakdown title="Appareils" rows={overview?.devices || []} labels={DEVICE_LABELS} />
          </div>
        </div>
      </div>
    </div>
  );
}