import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, ExternalLink } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import CatalogueOptions from '@/components/studio/CatalogueOptions';
import ConversionProgress from '@/components/studio/ConversionProgress';
import CropEditor from '@/components/studio/CropEditor';
import PdfDropzone from '@/components/studio/PdfDropzone';
import ShareBox from '@/components/studio/ShareBox';
import { useToast } from '@/components/ui/use-toast';
import { sha256 } from '@/lib/format';
import { openPdfFile } from '@/lib/pdfEngine';
import { NO_CROP, createCatalogueWithPdf } from '@/lib/publishCatalogue';
import { cn } from '@/lib/utils';

const STEPS = ['Fichier PDF', 'Informations', 'Diffusion', 'Rognage', 'Publication'];

const LANGUAGES = [
  { value: 'fr', label: 'Français' },
  { value: 'en', label: 'Anglais' },
  { value: 'es', label: 'Espagnol' },
  { value: 'de', label: 'Allemand' },
  { value: 'it', label: 'Italien' },
  { value: 'nl', label: 'Néerlandais' },
];

const prettyName = (name) => name.replace(/\.pdf$/i, '').replace(/[-_]+/g, ' ');

export default function ImportWizard() {
  const { toast } = useToast();
  const releaseRef = useRef(null);
  const [step, setStep] = useState(0);
  const [file, setFile] = useState(null);
  const [doc, setDoc] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [reading, setReading] = useState(false);
  const [poles, setPoles] = useState([]);
  const [meta, setMeta] = useState({ title: '', description: '', language: 'fr', poleId: '' });
  const [options, setOptions] = useState({ download_enabled: false, search_enabled: true, no_index: false, password: '' });
  const [crop, setCrop] = useState(NO_CROP);
  const [progress, setProgress] = useState({ percent: 0, stage: '' });
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    base44.entities.Pole.filter({}, { sort: 'display_order', limit: 50 }).then((page) => {
      const items = page.items || [];
      setPoles(items);
      setMeta((current) => ({ ...current, poleId: current.poleId || items[0]?.id || '' }));
    });
    return () => releaseRef.current?.();
  }, []);

  const handleFile = async (selected) => {
    setReading(true);
    setError('');
    try {
      const opened = await openPdfFile(selected);
      releaseRef.current?.();
      releaseRef.current = opened.release;
      setFile(selected);
      setDoc(opened.doc);
      setPageCount(opened.doc.numPages);
      setMeta((current) => ({ ...current, title: current.title || prettyName(selected.name) }));
      setStep(1);
    } catch (err) {
      setError(err?.message || 'Lecture du fichier impossible.');
    } finally {
      setReading(false);
    }
  };

  const publish = async () => {
    setError('');
    setProgress({ percent: 0, stage: 'Préparation' });
    setStep(4);
    try {
      const pole = poles.find((item) => item.id === meta.poleId) || null;
      const created = await createCatalogueWithPdf({
        file,
        doc,
        meta: { title: meta.title, description: meta.description, language: meta.language, pole },
        options: {
          ...options,
          password_hash: options.password ? await sha256(options.password) : '',
          theme_color: pole?.color || '',
        },
        crop,
        onProgress: setProgress,
      });
      setResult(created);
      toast({ title: 'Catalogue publié', description: `${created.pageCount} pages converties et mises en ligne.` });
    } catch (err) {
      setError(err?.message || 'La conversion a échoué.');
    }
  };

  const canContinue = step === 1 ? Boolean(meta.title && meta.poleId) : true;

  return (
    <div className="mx-auto max-w-4xl px-6 py-10 lg:px-12 lg:py-16">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Catalogues
      </Link>

      <h1 className="mt-6 font-display text-4xl leading-tight lg:text-5xl">Nouveau catalogue</h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
        Le PDF est converti en pages, le sommaire, le texte et les liens sont extraits, puis un lien public est généré.
      </p>

      <ol className="mt-10 flex flex-wrap gap-x-7 gap-y-3">
        {STEPS.map((label, index) => (
          <li key={label} className="flex items-center gap-2.5">
            <span
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-medium',
                index < step
                  ? 'bg-primary text-primary-foreground'
                  : index === step
                    ? 'bg-accent text-accent-foreground'
                    : 'bg-secondary text-muted-foreground',
              )}
            >
              {index < step ? <Check className="h-3.5 w-3.5" /> : index + 1}
            </span>
            <span className={cn('text-xs', index === step ? 'text-foreground' : 'text-muted-foreground')}>{label}</span>
          </li>
        ))}
      </ol>

      <div className="mt-10">
        {step === 0 ? (
          <div>
            <PdfDropzone onFile={handleFile} busy={reading} />
            {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
          </div>
        ) : null}

        {step === 1 ? (
          <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
            <div className="space-y-4 rounded-xl border border-border bg-card p-6">
              <div>
                <Label>Titre du catalogue</Label>
                <Input value={meta.title} onChange={(event) => setMeta({ ...meta, title: event.target.value })} className="mt-2" />
              </div>
              <div>
                <Label>Pôle</Label>
                <Select value={meta.poleId} onValueChange={(value) => setMeta({ ...meta, poleId: value })}>
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
                ) : null}
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  rows={3}
                  value={meta.description}
                  onChange={(event) => setMeta({ ...meta, description: event.target.value })}
                  className="mt-2"
                  placeholder="Présentation affichée sur la page de couverture"
                />
              </div>
              <div>
                <Label>Langue</Label>
                <Select value={meta.language} onValueChange={(value) => setMeta({ ...meta, language: value })}>
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
            </div>
            <div className="rounded-xl border border-border bg-secondary/40 p-5">
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Fichier</p>
              <p className="mt-3 break-words text-sm">{file?.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">{pageCount} pages détectées</p>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="rounded-xl border border-border bg-card p-6">
            <CatalogueOptions options={options} onChange={setOptions} />
          </div>
        ) : null}

        {step === 3 ? <CropEditor doc={doc} crop={crop} onChange={setCrop} /> : null}

        {step === 4 ? (
          result ? (
            <div className="space-y-6">
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-6">
                <p className="font-display text-xl">Catalogue en ligne</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {result.pageCount} pages converties. Partagez le lien ci-dessous : il ne changera pas lors des prochaines mises à jour.
                </p>
              </div>
              <ShareBox catalogue={result.catalogue} onCopied={() => toast({ title: 'Lien copié' })} />
              <div className="flex flex-wrap gap-3">
                <Button asChild className="rounded-full px-6">
                  <a href={`/c/${result.catalogue.slug}`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Voir le catalogue
                  </a>
                </Button>
                <Button asChild variant="outline" className="rounded-full">
                  <Link to={`/catalogue/${result.catalogue.id}`}>Réglages et statistiques</Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card p-8">
              <ConversionProgress progress={progress} error={error} onRetry={publish} />
            </div>
          )
        ) : null}
      </div>

      <div className="mt-10 flex items-center justify-between">
        <Button variant="ghost" onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={step === 0 || step === 4}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour
        </Button>

        {step > 0 && step < 3 ? (
          <Button onClick={() => setStep(step + 1)} disabled={!canContinue} className="rounded-full px-6">
            Continuer
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : null}

        {step === 3 ? (
          <Button onClick={publish} className="rounded-full px-6">
            Convertir et publier
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : null}

        {step === 4 && !result ? (
          <span className="text-xs text-muted-foreground">Conversion en cours</span>
        ) : null}
      </div>
    </div>
  );
}