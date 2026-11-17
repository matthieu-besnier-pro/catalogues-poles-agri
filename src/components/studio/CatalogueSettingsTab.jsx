import { useEffect, useState } from 'react';
import { Search, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import CatalogueOptions from '@/components/studio/CatalogueOptions';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/lib/AuthContext';
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
import { detectOperationDate, sha256 } from '@/lib/format';

const LANGUAGES = [
  { value: 'fr', label: 'Français' },
  { value: 'en', label: 'Anglais' },
  { value: 'es', label: 'Espagnol' },
  { value: 'de', label: 'Allemand' },
  { value: 'it', label: 'Italien' },
  { value: 'nl', label: 'Néerlandais' },
];

export default function CatalogueSettingsTab({ catalogue, onSaved, onDelete }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const scopedPoleIds = user?.role === 'admin' ? user?.pole_ids || [] : [];
  const scopedPoleKey = scopedPoleIds.join(',');
  const [poles, setPoles] = useState([]);
  const [form, setForm] = useState({
    title: catalogue.title,
    description: catalogue.description || '',
    language: catalogue.language || 'fr',
    theme_color: catalogue.theme_color || '#1C4A38',
    pole_id: catalogue.pole_id || '',
    operation_date: (catalogue.operation_date || '').slice(0, 7),
  });
  const [options, setOptions] = useState({
    download_enabled: !!catalogue.download_enabled,
    search_enabled: catalogue.search_enabled !== false,
    no_index: !!catalogue.no_index,
    password: '',
  });
  const [saving, setSaving] = useState(false);
  const [coverText, setCoverText] = useState('');
  const [coverTextLoaded, setCoverTextLoaded] = useState(false);
  const [detecting, setDetecting] = useState(false);

  useEffect(() => {
    const query = scopedPoleIds.length ? { id: { $in: scopedPoleIds } } : {};
    base44.entities.Pole.filter(query, { sort: 'display_order', limit: 50 }).then((page) => setPoles(page.items || []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopedPoleKey]);

  // Surfaced purely as a diagnostic: the date detector reads this same text,
  // so seeing it (empty, garbled, or fine) says immediately whether a missed
  // detection is a pattern problem or there was never any text to read.
  useEffect(() => {
    setCoverText('');
    setCoverTextLoaded(false);
    if (!catalogue.active_version_id) {
      setCoverTextLoaded(true);
      return;
    }
    base44.entities.CataloguePage.filter(
      { version_id: catalogue.active_version_id, page_number: 1 },
      { limit: 1, fields: ['text'] },
    ).then((page) => {
      setCoverText(page.items?.[0]?.text || '');
      setCoverTextLoaded(true);
    });
  }, [catalogue.active_version_id]);

  useEffect(() => {
    setForm({
      title: catalogue.title,
      description: catalogue.description || '',
      language: catalogue.language || 'fr',
      theme_color: catalogue.theme_color || '#1C4A38',
      pole_id: catalogue.pole_id || '',
      operation_date: (catalogue.operation_date || '').slice(0, 7),
    });
  }, [catalogue]);

  const save = async () => {
    setSaving(true);
    const pole = poles.find((item) => item.id === form.pole_id) || null;
    const payload = {
      title: form.title,
      description: form.description,
      language: form.language,
      theme_color: form.theme_color,
      pole_id: pole?.id || '',
      pole_name: pole?.name || '',
      pole_slug: pole?.slug || '',
      operation_date: form.operation_date ? `${form.operation_date}-01` : '',
      download_enabled: options.download_enabled,
      search_enabled: options.search_enabled,
      no_index: options.no_index,
    };
    if (options.password) payload.password_hash = await sha256(options.password);
    await base44.entities.Catalogue.update(catalogue.id, payload);
    setOptions((current) => ({ ...current, password: '' }));
    setSaving(false);
    toast({ title: 'Réglages enregistrés' });
    onSaved();
  };

  const runDetection = () => {
    setDetecting(true);
    const fallbackYear = catalogue.created_date ? new Date(catalogue.created_date).getFullYear() : new Date().getFullYear();
    const operationDate = detectOperationDate(catalogue.pdf_file_name || '', coverText, fallbackYear);
    setDetecting(false);
    if (operationDate) {
      setForm((current) => ({ ...current, operation_date: operationDate.slice(0, 7) }));
      toast({ title: 'Date détectée', description: 'Enregistrez pour la conserver.' });
    } else if (!coverText.trim()) {
      toast({
        title: 'Aucune date reconnue',
        description: 'Aucun texte sélectionnable sur cette couverture : son texte est probablement vectorisé/dessiné, pas de l’OCR serait nécessaire pour en lire une.',
      });
    } else {
      toast({
        title: 'Aucune date reconnue',
        description: `Du texte existe (${coverText.trim().length} caractères) mais rien n’y ressemble à une date. Voir le détail ci-dessous.`,
      });
    }
  };

  const removePassword = async () => {
    await base44.entities.Catalogue.update(catalogue.id, { password_hash: '' });
    toast({ title: 'Protection retirée' });
    onSaved();
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
      <div className="space-y-8">
        <div className="rounded-xl border border-border bg-card p-6">
          <p className="font-display text-lg">Présentation</p>
          <div className="mt-5 space-y-4">
            <div>
              <Label>Titre</Label>
              <Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className="mt-2" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                rows={3}
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                className="mt-2"
              />
            </div>
            <div>
              <Label>Filiale</Label>
              <Select value={form.pole_id} onValueChange={(value) => setForm({ ...form, pole_id: value })}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Choisir une filiale" />
                </SelectTrigger>
                <SelectContent>
                  {poles.map((pole) => (
                    <SelectItem key={pole.id} value={pole.id}>
                      {pole.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date d’opération</Label>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <input
                  type="month"
                  value={form.operation_date}
                  onChange={(event) => setForm({ ...form, operation_date: event.target.value })}
                  className="h-10 w-[190px] rounded-lg border border-border bg-white px-3 text-sm"
                />
                <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={runDetection} disabled={detecting}>
                  <Search className="mr-2 h-3.5 w-3.5" />
                  Détecter
                </Button>
              </div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
                Détectée depuis le texte de la couverture (ou, à défaut, le nom du PDF) à la mise en ligne ; corrigez-la ici si
                besoin pour trier correctement.
              </p>
              <details className="mt-2" open={!form.operation_date}>
                <summary className="cursor-pointer text-[11px] text-muted-foreground hover:text-foreground">
                  Texte lu sur la couverture (diagnostic)
                </summary>
                <div className="mt-2 max-h-32 overflow-y-auto rounded-lg border border-border bg-secondary/40 p-3 text-[11px] leading-relaxed text-muted-foreground">
                  {!coverTextLoaded
                    ? 'Chargement…'
                    : coverText || 'Aucun texte sélectionnable trouvé sur cette page — la couverture est probablement une image sans texte, la détection ne peut rien y lire.'}
                </div>
              </details>
            </div>
            <div className="flex flex-wrap gap-4">
              <div>
                <Label>Langue</Label>
                <Select value={form.language} onValueChange={(value) => setForm({ ...form, language: value })}>
                  <SelectTrigger className="mt-2 w-[190px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((language) => (
                      <SelectItem key={language.value} value={language.value}>
                        {language.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Couleur d’accent</Label>
                <input
                  type="color"
                  value={form.theme_color}
                  onChange={(event) => setForm({ ...form, theme_color: event.target.value })}
                  className="mt-2 h-10 w-24 cursor-pointer rounded-lg border border-border bg-white p-1"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <p className="font-display text-lg">Options de lecture</p>
          <div className="mt-2">
            <CatalogueOptions
              options={options}
              onChange={setOptions}
              passwordLabel={catalogue.password_hash ? 'Nouveau mot de passe (facultatif)' : 'Mot de passe de consultation'}
            />
          </div>
          {catalogue.password_hash ? (
            <p className="text-xs text-muted-foreground">
              Ce catalogue est protégé.{' '}
              <button type="button" onClick={removePassword} className="underline hover:text-foreground">
                Retirer la protection
              </button>
            </p>
          ) : null}
          <Button onClick={save} disabled={saving || !form.title} className="mt-6 rounded-full px-6">
            {saving ? 'Enregistrement…' : 'Enregistrer les réglages'}
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
          <p className="font-display text-lg text-destructive">Zone sensible</p>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            La suppression retire le catalogue, ses versions converties et ses statistiques. Le lien public cesse immédiatement de
            fonctionner.
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="mt-5 rounded-full border-destructive/40 text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Supprimer le catalogue
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Supprimer « {catalogue.title} » ?</AlertDialogTitle>
                <AlertDialogDescription>Cette action est définitive et libère les pages converties.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete}>Supprimer</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}