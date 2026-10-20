import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Archive, ExternalLink, Send, SendHorizontal } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CataloguePreviewTab from '@/components/studio/CataloguePreviewTab';
import CatalogueSettingsTab from '@/components/studio/CatalogueSettingsTab';
import CatalogueStatsTab from '@/components/studio/CatalogueStatsTab';
import ConversionProgress from '@/components/studio/ConversionProgress';
import ShareBox from '@/components/studio/ShareBox';
import StatusBadge from '@/components/studio/StatusBadge';
import VersionList from '@/components/studio/VersionList';
import { useToast } from '@/components/ui/use-toast';
import { openPdfFile } from '@/lib/pdfEngine';
import { replaceCataloguePdf } from '@/lib/publishCatalogue';
import { absoluteUrl, publicPath } from '@/lib/format';

export default function CatalogueDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInput = useRef(null);
  const releaseRef = useRef(null);
  const [catalogue, setCatalogue] = useState(null);
  const [versions, setVersions] = useState([]);
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState('');

  const load = async () => {
    const found = await base44.entities.Catalogue.filter({ id }, { limit: 1 });
    const record = found.items?.[0];
    setCatalogue(record || null);
    if (record) {
      const [versionPage, thumbPage] = await Promise.all([
        base44.entities.CatalogueVersion.filter({ catalogue_id: id }, { sort: '-created_date', limit: 30 }),
        record.active_version_id
          ? base44.entities.CataloguePage.filter(
              { version_id: record.active_version_id },
              { sort: 'page_number', limit: 12, fields: ['page_number', 'thumb_url'] },
            )
          : Promise.resolve({ items: [] }),
      ]);
      setVersions(versionPage.items || []);
      setPages(thumbPage.items || []);
    } else {
      setPages([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    return () => releaseRef.current?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const setStatus = async (status) => {
    const updated = await base44.entities.Catalogue.update(catalogue.id, {
      status,
      published_date:
        status === 'published' ? catalogue.published_date || new Date().toISOString() : catalogue.published_date,
    });
    setCatalogue(updated);
    toast({
      title:
        status === 'published' ? 'Catalogue publié' : status === 'archived' ? 'Catalogue archivé' : 'Catalogue dépublié',
    });
  };

  const remove = async () => {
    await Promise.all([
      base44.entities.CataloguePage.deleteMany({ catalogue_id: catalogue.id }),
      base44.entities.CatalogueVersion.deleteMany({ catalogue_id: catalogue.id }),
      base44.entities.CatalogueEvent.deleteMany({ catalogue_id: catalogue.id }),
    ]);
    await base44.entities.Catalogue.delete(catalogue.id);
    toast({ title: 'Catalogue supprimé' });
    navigate('/');
  };

  const handleReplace = async (file) => {
    if (!file) return;
    setBusy(true);
    setError('');
    setProgress({ percent: 0, stage: 'Lecture du PDF' });
    try {
      const opened = await openPdfFile(file);
      releaseRef.current?.();
      releaseRef.current = opened.release;
      const result = await replaceCataloguePdf({
        file,
        doc: opened.doc,
        catalogue,
        crop: catalogue.crop,
        onProgress: setProgress,
      });
      toast({
        title: 'Nouvelle version en ligne',
        description: `${result.pageCount} pages converties. Le lien public n’a pas changé.`,
      });
      await load();
    } catch (err) {
      setError(err?.message || 'La conversion a échoué.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
      </div>
    );
  }

  if (!catalogue) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-24 text-center">
        <h1 className="font-display text-3xl">Catalogue introuvable</h1>
        <p className="mt-3 text-sm text-muted-foreground">Ce catalogue a peut-être été supprimé.</p>
        <Button asChild className="mt-6 rounded-full">
          <Link to="/">Retour aux catalogues</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 lg:px-12 lg:py-14">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Catalogues
      </Link>

      <header className="mt-6 flex flex-wrap items-start justify-between gap-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={catalogue.status} />
            {catalogue.pole_name ? (
              <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{catalogue.pole_name}</span>
            ) : null}
          </div>
          <h1 className="mt-3 font-display text-4xl leading-tight">{catalogue.title}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" className="rounded-full">
            <a href={absoluteUrl(publicPath(catalogue.slug))} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              Ouvrir
            </a>
          </Button>
          {catalogue.status === 'published' ? (
            <Button variant="outline" className="rounded-full" onClick={() => setStatus('draft')}>
              <SendHorizontal className="mr-2 h-4 w-4" />
              Dépublier
            </Button>
          ) : (
            <Button className="rounded-full" onClick={() => setStatus('published')}>
              <Send className="mr-2 h-4 w-4" />
              Publier
            </Button>
          )}
          {catalogue.status !== 'archived' ? (
            <Button variant="ghost" className="rounded-full text-muted-foreground" onClick={() => setStatus('archived')}>
              <Archive className="mr-2 h-4 w-4" />
              Archiver
            </Button>
          ) : null}
        </div>
      </header>

      <Tabs defaultValue="diffusion" className="mt-10">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="diffusion">Diffusion</TabsTrigger>
          <TabsTrigger value="apercu">Aperçu</TabsTrigger>
          <TabsTrigger value="reglages">Réglages</TabsTrigger>
          <TabsTrigger value="versions">Versions</TabsTrigger>
          <TabsTrigger value="statistiques">Statistiques</TabsTrigger>
        </TabsList>

        <TabsContent value="diffusion" className="mt-8">
          <div className="grid gap-6 lg:grid-cols-2">
            <ShareBox catalogue={catalogue} onCopied={() => toast({ title: 'Lien copié' })} />
            <div className="rounded-xl border border-border bg-card p-5">
              <p className="font-display text-lg">État de la diffusion</p>
              <ul className="mt-4 space-y-3 text-sm">
                <li className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Adresse publique</span>
                  <span className="truncate text-right text-xs">/c/{catalogue.slug}</span>
                </li>
                <li className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Téléchargement du PDF</span>
                  <span className="text-xs">{catalogue.download_enabled ? 'autorisé' : 'désactivé'}</span>
                </li>
                <li className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Recherche plein texte</span>
                  <span className="text-xs">{catalogue.search_enabled ? 'activée' : 'désactivée'}</span>
                </li>
                <li className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Indexation Google</span>
                  <span className="text-xs">{catalogue.no_index ? 'demandée hors index' : 'autorisée'}</span>
                </li>
                <li className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Accès</span>
                  <span className="text-xs">{catalogue.password_hash ? 'protégé par mot de passe' : 'libre'}</span>
                </li>
              </ul>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="apercu" className="mt-8">
          <CataloguePreviewTab catalogue={catalogue} pages={pages} />
        </TabsContent>

        <TabsContent value="reglages" className="mt-8">
          <CatalogueSettingsTab catalogue={catalogue} onSaved={load} onDelete={remove} />
        </TabsContent>

        <TabsContent value="versions" className="mt-8 space-y-6">
          <VersionList
            versions={versions}
            activeVersionId={catalogue.active_version_id}
            busy={busy}
            onReplace={() => fileInput.current?.click()}
          />
          {busy || error ? (
            <div className="rounded-xl border border-border bg-card p-6">
              <ConversionProgress progress={progress} error={error} onRetry={() => fileInput.current?.click()} />
            </div>
          ) : null}
          <input
            ref={fileInput}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(event) => {
              handleReplace(event.target.files?.[0]);
              event.target.value = '';
            }}
          />
        </TabsContent>

        <TabsContent value="statistiques" className="mt-8">
          <CatalogueStatsTab catalogueId={catalogue.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}