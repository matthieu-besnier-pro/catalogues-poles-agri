import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import Breakdown from '@/components/studio/Breakdown';
import PeriodSelect from '@/components/studio/PeriodSelect';
import StatsSummary from '@/components/studio/StatsSummary';
import TopPagesList from '@/components/studio/TopPagesList';
import TrendChart from '@/components/studio/TrendChart';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { downloadText, formatDateTime, toCsv } from '@/lib/format';
import { DEVICE_LABELS, SOURCE_LABELS, exportEvents, fetchOverview } from '@/lib/stats';

const TYPE_LABELS = {
  view: 'Vue',
  page: 'Page lue',
  full_read: 'Lecture complète',
  download: 'Téléchargement',
  share: 'Partage',
};

export default function CatalogueStatsTab({ catalogueId }) {
  const { toast } = useToast();
  const [days, setDays] = useState(30);
  const [overview, setOverview] = useState(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let active = true;
    fetchOverview({ catalogueId, days }).then((data) => {
      if (active) setOverview(data);
    });
    return () => {
      active = false;
    };
  }, [catalogueId, days]);

  const handleExport = async () => {
    setExporting(true);
    const rows = await exportEvents({ catalogueId, days });
    downloadText(
      toCsv(
        rows.map((row) => ({
          Date: formatDateTime(row.created_date),
          Événement: TYPE_LABELS[row.type] || row.type,
          Page: row.page_number || '',
          Source: SOURCE_LABELS[row.source] || row.source || '',
          Appareil: DEVICE_LABELS[row.device] || row.device || '',
        })),
      ),
      `statistiques-catalogue-${new Date().toISOString().slice(0, 10)}.csv`,
    );
    setExporting(false);
    toast({ title: 'Export prêt', description: `${rows.length} événements exportés au format CSV.` });
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PeriodSelect value={days} onChange={setDays} />
        <Button variant="outline" size="sm" disabled={exporting} onClick={handleExport} className="rounded-full">
          <Download className="mr-2 h-3.5 w-3.5" />
          {exporting ? 'Export…' : 'Exporter en CSV'}
        </Button>
      </div>

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
  );
}