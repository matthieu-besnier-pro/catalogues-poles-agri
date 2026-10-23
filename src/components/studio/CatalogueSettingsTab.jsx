import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import CatalogueOptions from '@/components/studio/CatalogueOptions';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
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
import { sha256 } from '@/lib/format';

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
  const [poles, setPoles] = useState([]);
  const [form, setForm] = useState({
    title: catalogue.title,
    description: catalogue.description || '',
    language: catalogue.language || 'fr',
    theme_color: catalogue.theme_color || '#1C4A38',
    pole_id: catalogue.pole_id || '',
  });
  const [options, setOptions] = useState({
    download_enabled: !!catalogue.download_enabled,
    search_enabled: catalogue.search_enabled !== false,
    no_index: !!catalogue.no_index,
    password: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    base44.entities.Pole.filter({}, { sort: 'display_order', limit: 50 }).then((page) => setPoles(page.items || []));
  }, []);

  useEffect(() => {
    setForm({
      title: catalogue.title,
      description: catalogue.description || '',
      language: catalogue.language || 'fr',
      theme_color: catalogue.theme_color || '#1C4A38',
      pole_id: catalogue.pole_id || '',
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