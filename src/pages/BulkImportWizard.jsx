import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Check, ExternalLink, FileUp, Loader2, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import CatalogueOptions from '@/components/studio/CatalogueOptions';
import { useToast } from '@/components/ui/use-toast';
import { sha256 } from '@/lib/format';
import { openPdfFile } from '@/lib/pdfEngine';
import { NO_CROP, createCatalogueWithPdf } from '@/lib/publishCatalogue';
import { cn } from '@/lib/utils';

const MAX_SIZE = 200 * 1024 * 1024;
const MAX_FILES = 40;

const prettyName = (name) => name.replace(/\.pdf$/i, '').replace(/[-_]+/g, ' ');

let uid = 0;
const nextId = () => {
  uid += 1;
  return `f${uid}`;
};

const STATUS_ICON = {
  pending: null,
  processing: <Loader2 className="h-4 w-4 animate-spin text-primary" />,
  done: <Check className="h-4 w-4 text-primary" />,
  error: <AlertTriangle className="h-4 w-4 text-destructive" />,
};

export default function BulkImportWizard() {
  const { toast } = useToast();
  const input = useRef(null);
  const [items, setItems] = useState([]);
  const [over, setOver] = useState(false);
  const [dropError, setDropError] = useState('');
  const [poles, setPoles] = useState([]);
  const [poleId, setPoleId] = useState('');
  const [options, setOptions] = useState({ download_enabled: false, search_enabled: true, no_index: false, password: '' });
  const [running, setRunning] = useState(false);

  useEffect(() => {
    base44.entities.Pole.filter({}, { sort: 'display_order', limit: 50 }).then((page) => {
      const list = page.items || [];
      setPoles(list);
      setPoleId((current) => current || list[0]?.id || '');
    });
  }, []);

  const addFiles = (fileList) => {
    setDropError('');
    const incoming = Array.from(fileList || []);
    const valid = [];
    for (const file of incoming) {
      if (file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name)) continue;
      if (file.size > MAX_SIZE) continue;
      valid.push(file);
    }
    if (!valid.length && incoming.length) {
      setDropError('Seuls les fichiers PDF de moins de 200 Mo sont acceptés.');
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
        stage: '',
        percent: 0,
        error: '',
        result: null,
      }));
      return [...current, ...added];
    });
  };

  const removeItem = (id) => setItems((current) => current.filter((item) => item.id !== id));
  const updateTitle = (id, title) => setItems((current) => current.map((item) => (item.id === id ? { ...item, title } : item)));

  const remaining = items.filter((item) => item.status !== 'done');
  const canPublish = !running && remaining.length > 0 && Boolean(poleId);

  const publishAll = async () => {
    const pole = poles.find((item) => item.id === poleId) || null;
    const passwordHash = options.password ? await sha256(options.password) : '';
    const queue = items.filter((item) => item.status !== 'done');
    setRunning(true);
    let success = 0;
    let failed = 0;

    for (const item of queue) {
      setItems((current) => current.map((row) => (row.id === item.id ? { ...row, status: 'processing', error: '', percent: 0 } : row)));
      let opened = null;
      try {
        opened = await openPdfFile(item.file);
        const created = await createCatalogueWithPdf({
          file: item.file,
          doc: opened.doc,
          meta: { title: item.title || prettyName(item.file.name), description: '', language: 'fr', pole },
          options: { ...options, password_hash: passwordHash, theme_color: pole?.color || '' },
          crop: NO_CROP,
          onProgress: ({ stage, percent }) =>
            setItems((current) => current.map((row) => (row.id === item.id ? { ...row, stage, percent } : row))),
        });
        success += 1;
        setItems((current) => current.map((row) => (row.id === item.id ? { ...row, status: 'done', percent: 100, result: created } : row)));
      } catch (error) {
        failed += 1;
        setItems((current) =>
          current.map((row) => (row.id === item.id ? { ...row, status: 'error', error: error?.message || 'La conversion a échoué.' } : row)),
        );
      } finally {
        opened?.release?.();
      }
    }

    setRunning(false);
    if (success || failed) {
      toast({
        title: failed
          ? `${success} catalogue${success > 1 ? 's' : ''} publié${success > 1 ? 's' : ''}, ${failed} en échec`
          : `${success} catalogue${success > 1 ? 's' : ''} publié${success > 1 ? 's' : ''}`,
      });
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-10 lg:px-12 lg:py-16">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Catalogues
      </Link>

      <h1 className="mt-6 font-display text-4xl leading-tight lg:text-5xl">Import en masse</h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
        Déposez plusieurs PDF : chacun devient un catalogue publié séparément, avec le même pôle et les mêmes réglages de
        diffusion. Le titre de chaque catalogue reste modifiable avant publication.
      </p>

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
        <p className="mt-4 font-display text-lg">Déposez plusieurs PDF, ou cliquez pour les choisir</p>
        <p className="mt-2 max-w-sm text-xs leading-relaxed text-muted-foreground">
          PDF jusqu’à 200 Mo chacun, {MAX_FILES} fichiers maximum par envoi.
        </p>
        <input
          ref={input}
          type="file"
          accept="application/pdf,.pdf"
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
          <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_260px]">
            <div className="rounded-xl border border-border bg-card p-6">
              <Label>Pôle</Label>
              <Select value={poleId} onValueChange={setPoleId} disabled={running}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Choisir un pôle" />
                </SelectTrigger>
                <SelectContent>
                  {poles.map((pole) => (
                    <SelectItem key={pole.id} value={pole.id}>
                      {pole.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!poles.length ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Aucun pôle enregistré : créez-en un depuis l’onglet Pôles avant de publier.
                </p>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">Appliqué à l’ensemble des catalogues de cet envoi.</p>
              )}
              <div className="mt-6 border-t border-border pt-2">
                <CatalogueOptions options={options} onChange={setOptions} passwordLabel="Mot de passe (commun à cet envoi)" />
              </div>
            </div>
            <div className="rounded-xl border border-border bg-secondary/40 p-5">
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Envoi</p>
              <p className="mt-3 text-sm">{items.length} fichier{items.length > 1 ? 's' : ''}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {items.filter((item) => item.status === 'done').length} publié{items.filter((item) => item.status === 'done').length > 1 ? 's' : ''}
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
                  {item.status === 'processing' ? (
                    <p className="mt-1.5 text-xs text-muted-foreground">{item.stage || 'Préparation'} · {Math.round(item.percent)} %</p>
                  ) : item.status === 'error' ? (
                    <p className="mt-1.5 text-xs text-destructive">{item.error}</p>
                  ) : item.status === 'done' ? (
                    <p className="mt-1.5 text-xs text-muted-foreground">{item.result?.pageCount} pages publiées</p>
                  ) : (
                    <p className="mt-1.5 text-xs text-muted-foreground">{item.file.name}</p>
                  )}
                </div>
                {item.status === 'done' && item.result?.catalogue?.slug ? (
                  <a
                    href={`/c/${item.result.catalogue.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex shrink-0 items-center gap-1.5 text-xs text-primary hover:underline"
                  >
                    Voir
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                ) : null}
                {item.status !== 'processing' && item.status !== 'done' ? (
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    disabled={running}
                    aria-label="Retirer ce fichier"
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
              {remaining.length
                ? `Publier ${remaining.length} catalogue${remaining.length > 1 ? 's' : ''}`
                : 'Tout est publié'}
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}
