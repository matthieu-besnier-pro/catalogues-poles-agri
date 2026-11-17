import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, CalendarSearch, FileText, Loader2, Pencil, Trash2, UploadCloud } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Image } from '@/components/ui/image';
import { useToast } from '@/components/ui/use-toast';
import { detectOperationDate, formatDate, formatNumber, publicPath } from '@/lib/format';
import { cn } from '@/lib/utils';

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

export default function CatalogueTable({ catalogues, poles, onUpdated, onDeleted, onDropReplace, dropTargetId }) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [savingId, setSavingId] = useState('');
  const [selected, setSelected] = useState([]);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [overId, setOverId] = useState('');

  const hasFiles = (event) => Array.from(event.dataTransfer?.types || []).includes('Files');

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

  const allSelected = catalogues.length > 0 && selected.length === catalogues.length;
  const someSelected = selected.length > 0 && !allSelected;

  const toggleAll = (checked) => setSelected(checked ? catalogues.map((item) => item.id) : []);
  const toggleOne = (id, checked) =>
    setSelected((current) => (checked ? [...current, id] : current.filter((item) => item !== id)));

  const bulkChangePole = async (poleId) => {
    const pole = poles.find((item) => item.id === poleId) || null;
    setBulkBusy(true);
    try {
      await Promise.all(
        selected.map((id) =>
          base44.entities.Catalogue.update(id, { pole_id: pole?.id || '', pole_name: pole?.name || '', pole_slug: pole?.slug || '' }).then(
            (updated) => onUpdated(id, updated),
          ),
        ),
      );
      toast({ title: `Filiale mise à jour pour ${selected.length} catalogue${selected.length > 1 ? 's' : ''}` });
    } catch (error) {
      toast({ title: 'Échec de la mise à jour groupée', description: error?.message || '' });
    } finally {
      setBulkBusy(false);
    }
  };

  const bulkChangeStatus = async (status) => {
    setBulkBusy(true);
    try {
      await Promise.all(
        selected.map((id) => {
          const current = catalogues.find((item) => item.id === id);
          return base44.entities.Catalogue.update(id, {
            status,
            published_date: status === 'published' ? current?.published_date || new Date().toISOString() : current?.published_date,
          }).then((updated) => onUpdated(id, updated));
        }),
      );
      toast({ title: `Statut mis à jour pour ${selected.length} catalogue${selected.length > 1 ? 's' : ''}` });
    } catch (error) {
      toast({ title: 'Échec de la mise à jour groupée', description: error?.message || '' });
    } finally {
      setBulkBusy(false);
    }
  };

  // Relance la détection — d'abord sur le texte de la couverture (ce qui est
  // réellement imprimé dessus, déjà extrait et stocké pour la recherche),
  // sinon sur le nom du PDF enregistré — utile pour les catalogues publiés
  // avant l'existence de ce champ, sans rouvrir chacun dans ses réglages.
  const bulkDetectDate = async () => {
    setBulkBusy(true);
    try {
      let detected = 0;
      await Promise.all(
        selected.map(async (id) => {
          const current = catalogues.find((item) => item.id === id);
          if (!current) return;
          let coverText = '';
          if (current.active_version_id) {
            const cover = await base44.entities.CataloguePage.filter(
              { version_id: current.active_version_id, page_number: 1 },
              { limit: 1, fields: ['text'] },
            );
            coverText = cover.items?.[0]?.text || '';
          }
          const fallbackYear = current.created_date ? new Date(current.created_date).getFullYear() : new Date().getFullYear();
          const operationDate = detectOperationDate(current.pdf_file_name || '', coverText, fallbackYear);
          if (!operationDate) return;
          detected += 1;
          const updated = await base44.entities.Catalogue.update(id, { operation_date: operationDate });
          onUpdated(id, updated);
        }),
      );
      toast({
        title: detected
          ? `Date détectée pour ${detected} catalogue${detected > 1 ? 's' : ''}`
          : 'Aucune date détectée (ni sur la couverture, ni dans le nom du fichier) pour la sélection',
      });
    } catch (error) {
      toast({ title: 'Échec de la détection groupée', description: error?.message || '' });
    } finally {
      setBulkBusy(false);
    }
  };

  const bulkDelete = async () => {
    const ids = selected;
    setBulkBusy(true);
    try {
      await Promise.all([
        base44.entities.CataloguePage.deleteMany({ catalogue_id: { $in: ids } }),
        base44.entities.CatalogueVersion.deleteMany({ catalogue_id: { $in: ids } }),
        base44.entities.CatalogueEvent.deleteMany({ catalogue_id: { $in: ids } }),
      ]);
      await base44.entities.Catalogue.deleteMany({ id: { $in: ids } });
      setSelected([]);
      onDeleted?.(ids);
      toast({ title: `${ids.length} catalogue${ids.length > 1 ? 's supprimés' : ' supprimé'}` });
    } catch (error) {
      toast({ title: 'Échec de la suppression groupée', description: error?.message || '' });
    } finally {
      setBulkBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      {selected.length > 0 ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
          <span className="text-sm font-medium">
            {selected.length} sélectionné{selected.length > 1 ? 's' : ''}
          </span>
          {bulkBusy ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : null}
          <Button variant="outline" size="sm" className="rounded-full" disabled={bulkBusy} onClick={bulkDetectDate}>
            <CalendarSearch className="mr-2 h-3.5 w-3.5" />
            Détecter la date d’opération
          </Button>
          <Select onValueChange={bulkChangePole} disabled={bulkBusy}>
            <SelectTrigger className="h-8 w-[170px]">
              <SelectValue placeholder="Changer la filiale" />
            </SelectTrigger>
            <SelectContent>
              {poles.map((pole) => (
                <SelectItem key={pole.id} value={pole.id}>
                  {pole.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select onValueChange={bulkChangeStatus} disabled={bulkBusy}>
            <SelectTrigger className="h-8 w-[150px]">
              <SelectValue placeholder="Changer le statut" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="ml-auto rounded-full text-destructive" disabled={bulkBusy}>
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                Supprimer la sélection
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Supprimer {selected.length} catalogue{selected.length > 1 ? 's' : ''} ?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Cette action est définitive : les catalogues, leurs pages converties et leurs statistiques seront supprimés,
                  et leurs liens publics cesseront immédiatement de fonctionner.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={bulkDelete}>Supprimer</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-[880px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              <th className="w-10 px-4 py-3">
                <Checkbox
                  checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                  onCheckedChange={toggleAll}
                  aria-label="Tout sélectionner"
                />
              </th>
              <th className="px-4 py-3 font-medium">Catalogue</th>
              <th className="px-4 py-3 font-medium">Filiale</th>
              <th className="px-4 py-3 font-medium">Statut</th>
              <th className="px-4 py-3 font-medium">Téléchargement</th>
              <th className="px-4 py-3 font-medium">Date d’opération</th>
              <th className="px-4 py-3 font-medium">Publié le</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {catalogues.map((catalogue) => (
              <tr
                key={catalogue.id}
                className={cn(
                  savingId === catalogue.id && 'opacity-60',
                  (overId === catalogue.id || dropTargetId === catalogue.id) && onDropReplace && 'bg-primary/5',
                )}
                onDragOver={(event) => {
                  if (!onDropReplace || !hasFiles(event)) return;
                  event.preventDefault();
                  event.stopPropagation();
                }}
                onDragEnter={(event) => {
                  if (!onDropReplace || !hasFiles(event)) return;
                  event.preventDefault();
                  event.stopPropagation();
                  setOverId(catalogue.id);
                }}
                onDragLeave={(event) => {
                  if (!onDropReplace) return;
                  event.stopPropagation();
                  setOverId((current) => (current === catalogue.id ? '' : current));
                }}
                onDrop={(event) => {
                  if (!onDropReplace) return;
                  event.preventDefault();
                  event.stopPropagation();
                  setOverId('');
                  onDropReplace(catalogue, event.dataTransfer.files?.[0]);
                }}
              >
                <td className="px-4 py-3">
                  <Checkbox
                    checked={selected.includes(catalogue.id)}
                    onCheckedChange={(checked) => toggleOne(catalogue.id, checked)}
                    aria-label={`Sélectionner ${catalogue.title}`}
                  />
                </td>
                <td className="px-4 py-3">
                <div className="flex min-w-[220px] items-center gap-3">
                  <span className="relative h-12 w-9 shrink-0 overflow-hidden rounded border border-border bg-secondary">
                    {catalogue.cover_url ? (
                      <Image src={catalogue.cover_url} alt={catalogue.title} className="h-full w-full" />
                    ) : (
                      <FileText className="h-full w-full p-2 text-muted-foreground" />
                    )}
                    {(overId === catalogue.id || dropTargetId === catalogue.id) && onDropReplace ? (
                      <span className="absolute inset-0 flex items-center justify-center bg-primary/90 text-primary-foreground">
                        {dropTargetId === catalogue.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <UploadCloud className="h-4 w-4" />
                        )}
                      </span>
                    ) : null}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{catalogue.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {overId === catalogue.id && onDropReplace
                        ? 'Déposer pour remplacer le PDF'
                        : `${formatNumber(catalogue.page_count)} pages`}
                    </p>
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
                {catalogue.operation_date
                  ? new Date(catalogue.operation_date).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })
                  : '—'}
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
    </div>
  );
}
