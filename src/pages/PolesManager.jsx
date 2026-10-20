import { useEffect, useState } from 'react';
import { BarChart3, Plus, Sprout, Trash2, Upload } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
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
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { formatNumber, slugify } from '@/lib/format';

const EMPTY = { name: '', tagline: '', description: '', color: '#1C4A38', logo_url: '' };

export default function PolesManager() {
  const { toast } = useToast();
  const [poles, setPoles] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    const [list, grouped] = await Promise.all([
      base44.entities.Pole.filter({}, { sort: 'display_order', limit: 50 }),
      base44.entities.Catalogue.aggregate({ query: { status: { $ne: 'archived' } }, groupBy: 'pole_id' }),
    ]);
    setPoles(list.items || []);
    const map = {};
    (grouped.rows || []).forEach((row) => {
      map[row.pole_id] = row.count || 0;
    });
    setCounts(map);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    if (!editing?.name) return;
    const payload = {
      name: editing.name,
      slug: editing.slug || slugify(editing.name),
      tagline: editing.tagline || '',
      description: editing.description || '',
      color: editing.color || '#1C4A38',
      logo_url: editing.logo_url || '',
      display_order: editing.display_order ?? poles.length,
    };
    if (editing.id) await base44.entities.Pole.update(editing.id, payload);
    else await base44.entities.Pole.create(payload);
    setEditing(null);
    toast({ title: 'Pôle enregistré' });
    load();
  };

  const uploadLogo = async (file) => {
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
    setEditing((current) => ({ ...current, logo_url: file_url }));
    setUploading(false);
  };

  const remove = async (pole) => {
    await base44.entities.Pole.delete(pole.id);
    toast({ title: 'Pôle supprimé', description: 'Les catalogues déjà publiés restent accessibles.' });
    load();
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 lg:px-12 lg:py-16">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">Organisation</p>
          <h1 className="mt-3 font-display text-4xl leading-tight">FILIALES</h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Chaque catalogue appartient à un pôle : le nom, le logo et la couleur accompagnent la diffusion publique et les statistiques.
          </p>
        </div>
        <Button size="lg" className="rounded-full px-6" onClick={() => setEditing({ ...EMPTY })}>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau pôle
        </Button>
      </header>

      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading
          ? [0, 1, 2].map((key) => <div key={key} className="h-40 animate-pulse rounded-xl border border-border bg-secondary/50" />)
          : poles.map((pole) => (
              <div key={pole.id} className="flex flex-col rounded-xl border border-border bg-card p-5">
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-lg" style={{ backgroundColor: `${pole.color}1a` }}>
                    {pole.logo_url ? (
                      <img src={pole.logo_url} alt={pole.name} className="h-7 w-7 object-contain" />
                    ) : (
                      <Sprout className="h-5 w-5" style={{ color: pole.color }} />
                    )}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <BarChart3 className="h-3.5 w-3.5" />
                    {formatNumber(counts[pole.id] || 0)} catalogues
                  </span>
                </div>
                <p className="mt-4 font-display text-xl leading-tight">{pole.name}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{pole.tagline || pole.description || '—'}</p>
                <div className="mt-5 flex items-center gap-2 border-t border-border pt-4">
                  <Button variant="outline" size="sm" className="rounded-full" onClick={() => setEditing({ ...pole })}>
                    Modifier
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="ml-auto text-muted-foreground" aria-label="Supprimer">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer « {pole.name} » ?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Les catalogues déjà publiés restent en ligne, mais ne seront plus rattachés à ce pôle.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={() => remove(pole)}>Supprimer</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
      </div>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing?.id ? 'Modifier le pôle' : 'Nouveau pôle'}</DialogTitle>
          </DialogHeader>
          {editing ? (
            <div className="space-y-4">
              <div>
                <Label>Nom</Label>
                <Input value={editing.name} onChange={(event) => setEditing({ ...editing, name: event.target.value })} className="mt-2" />
              </div>
              <div>
                <Label>Accroche</Label>
                <Input value={editing.tagline} onChange={(event) => setEditing({ ...editing, tagline: event.target.value })} className="mt-2" />
              </div>
              <div>
                <Label>Présentation</Label>
                <Textarea rows={3} value={editing.description} onChange={(event) => setEditing({ ...editing, description: event.target.value })} className="mt-2" />
              </div>
              <div className="flex flex-wrap items-end gap-4">
                <div>
                  <Label>Couleur</Label>
                  <input
                    type="color"
                    value={editing.color || '#1C4A38'}
                    onChange={(event) => setEditing({ ...editing, color: event.target.value })}
                    className="mt-2 h-10 w-20 cursor-pointer rounded-lg border border-border bg-white p-1"
                  />
                </div>
                <div className="flex-1">
                  <Label>Logo</Label>
                  <label className="mt-2 flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border px-3 text-xs text-muted-foreground">
                    <Upload className="h-3.5 w-3.5" />
                    {uploading ? 'Envoi…' : editing.logo_url ? 'Remplacer le logo' : 'Ajouter un logo (PNG, SVG)'}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => uploadLogo(event.target.files?.[0])}
                    />
                  </label>
                </div>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Annuler
            </Button>
            <Button onClick={save} disabled={!editing?.name}>
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}