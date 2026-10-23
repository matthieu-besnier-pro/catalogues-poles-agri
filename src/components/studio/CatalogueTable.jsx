import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, FileText, Pencil } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Image } from '@/components/ui/image';
import { useToast } from '@/components/ui/use-toast';
import { formatDate, formatNumber, publicPath } from '@/lib/format';

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Brouillon' },
  { value: 'published', label: 'Publié' },
  { value: 'archived', label: 'Archivé' },
];

function RowAction({ label, icon: Icon, onClick }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

export default function CatalogueTable({ catalogues, poles, onUpdated }) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [savingId, setSavingId] = useState('');

  const patch = async (catalogue, payload, successMessage) => {
    setSavingId(catalogue.id);
    try {
      const updated = await base44.entities.Catalogue.update(catalogue.id, payload);
      onUpdated(catalogue.id, updated);
      if (successMessage) toast({ title: successMessage });
    } catch (error) {
      toast({ title: 'Échec de la mise à jour', description: error?.message || '' });
    } finally {
      setSavingId('');
    }
  };

  const changePole = (catalogue, poleId) => {
    const pole = poles.find((item) => item.id === poleId) || null;
    patch(catalogue, { pole_id: pole?.id || '', pole_name: pole?.name || '', pole_slug: pole?.slug || '' }, 'Filiale mise à jour');
  };

  const changeStatus = (catalogue, status) => {
    patch(
      catalogue,
      { status, published_date: status === 'published' ? catalogue.published_date || new Date().toISOString() : catalogue.published_date },
      status === 'published' ? 'Catalogue publié' : status === 'archived' ? 'Catalogue archivé' : 'Catalogue dépublié',
    );
  };

  const toggleDownload = (catalogue, checked) => {
    patch(catalogue, { download_enabled: checked });
  };

  const openPdf = async (catalogue) => {
    if (!catalogue.pdf_file_uri) return;
    const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({
      file_uri: catalogue.pdf_file_uri,
      expires_in: 900,
    });
    window.open(signed_url, '_blank', 'noopener');
  };

  const browseUrl = (catalogue) =>
    catalogue.status === 'published'
      ? publicPath(catalogue.slug, '?open=1')
      : publicPath(catalogue.slug, `?open=1&rev=${catalogue.preview_token}`);

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full min-w-[840px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border text-left text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            <th className="px-4 py-3 font-medium">Catalogue</th>
            <th className="px-4 py-3 font-medium">Filiale</th>
            <th className="px-4 py-3 font-medium">Statut</th>
            <th className="px-4 py-3 font-medium">Téléchargement</th>
            <th className="px-4 py-3 font-medium">Publié le</th>
            <th className="px-4 py-3 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {catalogues.map((catalogue) => (
            <tr key={catalogue.id} className={savingId === catalogue.id ? 'opacity-60' : undefined}>
              <td className="px-4 py-3">
                <div className="flex min-w-[220px] items-center gap-3">
                  <span className="h-12 w-9 shrink-0 overflow-hidden rounded border border-border bg-secondary">
                    {catalogue.cover_url ? (
                      <Image src={catalogue.cover_url} alt={catalogue.title} className="h-full w-full" />
                    ) : (
                      <FileText className="h-full w-full p-2 text-muted-foreground" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{catalogue.title}</p>
                    <p className="text-xs text-muted-foreground">{formatNumber(catalogue.page_count)} pages</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                <Select value={catalogue.pole_id || ''} onValueChange={(value) => changePole(catalogue, value)} disabled={savingId === catalogue.id}>
                  <SelectTrigger className="h-9 w-[170px]">
                    <SelectValue placeholder="Aucune" />
                  </SelectTrigger>
                  <SelectContent>
                    {poles.map((pole) => (
                      <SelectItem key={pole.id} value={pole.id}>
                        {pole.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </td>
              <td className="px-4 py-3">
                <Select value={catalogue.status} onValueChange={(value) => changeStatus(catalogue, value)} disabled={savingId === catalogue.id}>
                  <SelectTrigger className="h-9 w-[130px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </td>
              <td className="px-4 py-3">
                <Switch
                  checked={!!catalogue.download_enabled}
                  onCheckedChange={(checked) => toggleDownload(catalogue, checked)}
                  disabled={savingId === catalogue.id}
                />
              </td>
              <td className="px-4 py-3 text-xs text-muted-foreground">
                {catalogue.status === 'published' ? formatDate(catalogue.published_date) : '—'}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-1">
                  <RowAction label="Feuilleter" icon={BookOpen} onClick={() => window.open(browseUrl(catalogue), '_blank', 'noopener')} />
                  <RowAction label="Voir le PDF" icon={FileText} onClick={() => openPdf(catalogue)} />
                  <RowAction label="Modifier" icon={Pencil} onClick={() => navigate(`/catalogue/${catalogue.id}`)} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
