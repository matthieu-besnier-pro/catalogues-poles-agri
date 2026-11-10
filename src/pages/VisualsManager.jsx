import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Check, Copy, FileUp, ImageOff, Loader2, Trash2, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Image } from '@/components/ui/image';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/lib/AuthContext';
import { copyText, formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

const MAX_SIZE = 20 * 1024 * 1024;
const MAX_FILES = 30;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ACCEPTED_PATTERN = /\.(jpe?g|png|webp|gif)$/i;

const prettyName = (name) => name.replace(/\.[a-z0-9]+$/i, '').replace(/[-_]+/g, ' ');

let uid = 0;
const nextId = () => {
  uid += 1;
  return `v${uid}`;
};

function measureImage(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const probe = new window.Image();
    probe.onload = () => {
      resolve({ width: probe.naturalWidth, height: probe.naturalHeight });
      URL.revokeObjectURL(url);
    };
    probe.onerror = () => {
      resolve({ width: 0, height: 0 });
      URL.revokeObjectURL(url);
    };
    probe.src = url;
  });
}

const STATUS_ICON = {
  pending: null,
  processing: <Loader2 className="h-4 w-4 animate-spin text-primary" />,
  done: <Check className="h-4 w-4 text-primary" />,
  error: <AlertTriangle className="h-4 w-4 text-destructive" />,
};

export default function VisualsManager() {
  const { toast } = useToast();
  const { user } = useAuth();
  const scopedPoleIds = user?.role === 'admin' ? user?.pole_ids || [] : [];
  const scopedPoleKey = scopedPoleIds.join(',');

  const input = useRef(null);
  const [poles, setPoles] = useState([]);
  const [poleId, setPoleId] = useState('');
  const [items, setItems] = useState([]);
  const [over, setOver] = useState(false);
  const [dropError, setDropError] = useState('');
  const [running, setRunning] = useState(false);
  const [visuals, setVisuals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState('');

  const loadVisuals = async () => {
    setLoading(true);
    const query = scopedPoleIds.length ? { pole_id: { $in: scopedPoleIds } } : {};
    const result = await base44.entities.Visual.filter(query, { sort: '-created_date', limit: 200 });
    setVisuals(result.items || []);
    setLoading(false);
  };

  useEffect(() => {
    const query = scopedPoleIds.length ? { id: { $in: scopedPoleIds } } : {};
    base44.entities.Pole.filter(query, { sort: 'display_order', limit: 50 }).then((page) => {
      const list = page.items || [];
      setPoles(list);
      setPoleId((current) => current || list[0]?.id || '');
    });
    loadVisuals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopedPoleKey]);

  const addFiles = (fileList) => {
    setDropError('');
    const incoming = Array.from(fileList || []);
    const valid = [];
    for (const file of incoming) {
      if (!ACCEPTED_TYPES.includes(file.type) && !ACCEPTED_PATTERN.test(file.name)) continue;
      if (file.size > MAX_SIZE) continue;
      valid.push(file);
    }
    if (!valid.length && incoming.length) {
      setDropError('Seules les images (JPG, PNG, WEBP, GIF) de moins de 20 Mo sont acceptées.');
      return;
    }
    setItems((current) => {
      const room = Math.max(0, MAX_FILES - current.length);
      if (room <= 0) return current;
      const added = valid.slice(0, room).map((file) => ({
        id: nextId(),
        file,
        title: prettyName(file.name),
        status: 'pending',
        error: '',
      }));
      return [...current, ...added];
    });
  };

  const removeItem = (id) => setItems((current) => current.filter((item) => item.id !== id));
  const updateTitle = (id, title) => setItems((current) => current.map((item) => (item.id === id ? { ...item, title } : item)));

  const remaining = items.filter((item) => item.status !== 'done');
  const canPublish = !running && remaining.length > 0;

  const publishAll = async () => {
    const pole = poles.find((item) => item.id === poleId) || null;
    const queue = items.filter((item) => item.status !== 'done');
    setRunning(true);
    let success = 0;
    let failed = 0;

    for (const item of queue) {
      setItems((current) => current.map((row) => (row.id === item.id ? { ...row, status: 'processing', error: '' } : row)));
      try {
        const [{ file_url }, dims] = await Promise.all([
          base44.integrations.Core.UploadPublicFile({ file: item.file }),
          measureImage(item.file),
        ]);
        await base44.entities.Visual.create({
          title: item.title || prettyName(item.file.name),
          image_url: file_url,
          file_name: item.file.name,
          width: dims.width,
          height: dims.height,
          pole_id: pole?.id || '',
          pole_name: pole?.name || '',
        });
        success += 1;
        setItems((current) => current.map((row) => (row.id === item.id ? { ...row, status: 'done' } : row)));
      } catch (error) {
        failed += 1;
        setItems((current) =>
          current.map((row) => (row.id === item.id ? { ...row, status: 'error', error: error?.message || 'Échec de l’envoi.' } : row)),
        );
      }
    }

    setRunning(false);
    await loadVisuals();
    if (success || failed) {
      toast({
        title: failed
          ? `${success} visuel${success > 1 ? 's' : ''} ajouté${success > 1 ? 's' : ''}, ${failed} en échec`
          : `${success} visuel${success > 1 ? 's' : ''} ajouté${success > 1 ? 's' : ''}`,
      });
    }
  };

  const copyLink = async (visual) => {
    const done = await copyText(visual.image_url);
    if (done) {
      setCopiedId(visual.id);
      window.setTimeout(() => setCopiedId(''), 1800);
    }
  };

  const remove = async (visual) => {
    await base44.entities.Visual.delete(visual.id);
    setVisuals((current) => current.filter((item) => item.id !== visual.id));
    toast({ title: 'Visuel supprimé' });
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 lg:px-12 lg:py-16">
      <header>
        <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">Communication</p>
        <h1 className="mt-3 font-display text-4xl leading-tight">Visuels</h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
          Hébergez des visuels publicitaires (une image, un format) — affiches, promos, bannières — et copiez leur lien direct
          pour les diffuser par SMS, e-mail ou ailleurs.
        </p>
      </header>

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setOver(false);
          addFiles(event.dataTransfer.files);
        }}
        onClick={() => input.current?.click()}
        className={cn(
          'mt-8 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-8 py-12 text-center transition-colors duration-300',
          over ? 'border-accent bg-accent/10' : 'border-border bg-card hover:border-primary/40 hover:bg-secondary/40',
        )}
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/8">
          <FileUp className="h-5 w-5 text-primary" />
        </span>
        <p className="mt-4 font-display text-lg">Déposez une ou plusieurs images, ou cliquez pour les choisir</p>
        <p className="mt-2 max-w-sm text-xs leading-relaxed text-muted-foreground">
          JPG, PNG, WEBP ou GIF, jusqu’à 20 Mo chacune, {MAX_FILES} images maximum par envoi.
        </p>
        <input
          ref={input}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(event) => {
            addFiles(event.target.files);
            event.target.value = '';
          }}
        />
      </div>
      {dropError ? <p className="mt-3 text-sm text-destructive">{dropError}</p> : null}

      {items.length ? (
        <>
          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_260px]">
            <div className="rounded-xl border border-border bg-card p-6">
              <Label>Filiale</Label>
              <Select value={poleId} onValueChange={setPoleId} disabled={running}>
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
              <p className="mt-2 text-xs text-muted-foreground">Appliquée à l’ensemble des visuels de cet envoi (facultatif).</p>
            </div>
            <div className="rounded-xl border border-border bg-secondary/40 p-5">
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Envoi</p>
              <p className="mt-3 text-sm">
                {items.length} visuel{items.length > 1 ? 's' : ''}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {items.filter((item) => item.status === 'done').length} publié
                {items.filter((item) => item.status === 'done').length > 1 ? 's' : ''}
              </p>
            </div>
          </div>

          <ul className="mt-6 divide-y divide-border rounded-xl border border-border bg-card">
            {items.map((item) => (
              <li key={item.id} className="flex items-center gap-4 px-5 py-4">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center">{STATUS_ICON[item.status]}</span>
                <div className="min-w-0 flex-1">
                  <Input
                    value={item.title}
                    onChange={(event) => updateTitle(item.id, event.target.value)}
                    disabled={running || item.status === 'done'}
                    className="h-8 max-w-sm text-sm"
                  />
                  {item.status === 'error' ? (
                    <p className="mt-1.5 text-xs text-destructive">{item.error}</p>
                  ) : (
                    <p className="mt-1.5 text-xs text-muted-foreground">{item.file.name}</p>
                  )}
                </div>
                {item.status !== 'processing' && item.status !== 'done' ? (
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    disabled={running}
                    aria-label="Retirer cette image"
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-30"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </li>
            ))}
          </ul>

          <div className="mt-8 flex items-center justify-end gap-3">
            {running ? <span className="text-xs text-muted-foreground">Publication en cours, laissez cet onglet ouvert…</span> : null}
            <Button onClick={publishAll} disabled={!canPublish} className="rounded-full px-6">
              {remaining.length ? `Publier ${remaining.length} visuel${remaining.length > 1 ? 's' : ''}` : 'Tout est publié'}
            </Button>
          </div>
        </>
      ) : null}

      <section className="mt-16">
        <h2 className="font-display text-2xl">Visuels hébergés</h2>

        {loading ? (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((key) => (
              <div key={key} className="aspect-square animate-pulse rounded-xl bg-secondary/60" />
            ))}
          </div>
        ) : visuals.length ? (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {visuals.map((visual) => (
              <div key={visual.id} className="flex flex-col rounded-xl border border-border bg-card p-3">
                <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-secondary">
                  {visual.image_url ? (
                    <Image src={visual.image_url} alt={visual.title} className="h-full w-full object-contain" />
                  ) : (
                    <ImageOff className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <p className="mt-3 truncate text-sm font-medium">{visual.title || visual.file_name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {visual.pole_name ? `${visual.pole_name} · ` : ''}
                  {visual.width && visual.height ? `${visual.width}×${visual.height} · ` : ''}
                  {formatDate(visual.created_date)}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <Button variant="outline" size="sm" className="flex-1 rounded-full" onClick={() => copyLink(visual)}>
                    {copiedId === visual.id ? <Check className="mr-2 h-3.5 w-3.5" /> : <Copy className="mr-2 h-3.5 w-3.5" />}
                    {copiedId === visual.id ? 'Copié' : 'Copier le lien'}
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground" aria-label="Supprimer">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer ce visuel ?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Le lien cessera de fonctionner immédiatement, y compris s’il a déjà été diffusé.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={() => remove(visual)}>Supprimer</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed border-border bg-card/60 px-8 py-16 text-center">
            <h3 className="font-display text-xl">Aucun visuel pour l’instant</h3>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
              Déposez une image ci-dessus pour obtenir son lien direct.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
