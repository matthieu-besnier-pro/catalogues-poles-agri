import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import CoverScreen from '@/components/viewer/CoverScreen';
import FlipBook from '@/components/viewer/FlipBook';
import PasswordGate from '@/components/viewer/PasswordGate';
import SidePanel from '@/components/viewer/SidePanel';
import ViewerFooter from '@/components/viewer/ViewerFooter';
import ViewerToolbar from '@/components/viewer/ViewerToolbar';
import { useToast } from '@/components/ui/use-toast';
import { absoluteUrl, copyText, publicPath } from '@/lib/format';
import { buildSpreads, findSpreadIndex, isDoublePage, spreadPageNumbers } from '@/lib/spreads';
import { trackEvent } from '@/lib/tracking';

const ZOOM_STEPS = [1, 1.4, 1.9, 2.5];

export default function PublicViewer({ embedded = false }) {
  const { slug } = useParams();
  const [params] = useSearchParams();
  const reviewToken = params.get('rev');
  const startPage = Number(params.get('p')) || 0;
  const { toast } = useToast();

  const [catalogue, setCatalogue] = useState(null);
  const [status, setStatus] = useState('loading');
  const [pages, setPages] = useState([]);
  const [opened, setOpened] = useState(embedded);
  const [panel, setPanel] = useState(null);
  const [spreadIndex, setSpreadIndex] = useState(0);
  const [double, setDouble] = useState(() => isDoublePage());
  const [zoomIndex, setZoomIndex] = useState(0);
  const shellRef = useRef(null);
  const stageRef = useRef(null);
  const seen = useRef(new Set());

  useEffect(() => {
    let active = true;
    (async () => {
      const found = await base44.entities.Catalogue.filter({ slug }, { limit: 1 });
      const record = found.items?.[0];
      if (!active) return;
      if (!record) {
        setStatus('missing');
        return;
      }
      if (record.status !== 'published' && reviewToken !== record.preview_token) {
        setStatus('closed');
        return;
      }
      if (record.password_hash && sessionStorage.getItem(`pa-unlock-${slug}`) !== '1') {
        setCatalogue(record);
        setStatus('locked');
        return;
      }
      setCatalogue(record);
      setStatus('ready');
    })();
    return () => {
      active = false;
    };
  }, [slug, reviewToken]);

  useEffect(() => {
    if (status !== 'ready' || !catalogue?.active_version_id) return undefined;
    let active = true;
    (async () => {
      const collected = [];
      let cursor;
      for (let step = 0; step < 5; step += 1) {
        const result = await base44.entities.CataloguePage.filter(
          { version_id: catalogue.active_version_id },
          { sort: 'page_number', limit: 500, fields: ['page_number', 'image_url', 'thumb_url', 'width', 'height', 'links'], cursor },
        );
        collected.push(...result.items);
        if (!result.has_more) break;
        cursor = result.next_cursor;
      }
      if (active) setPages(collected);
    })();
    return () => {
      active = false;
    };
  }, [status, catalogue?.active_version_id]);

  useEffect(() => {
    const onResize = () => setDouble(isDoublePage());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const spreads = useMemo(() => buildSpreads(pages, double), [pages, double]);
  const current = spreads[Math.min(spreadIndex, Math.max(0, spreads.length - 1))] || null;
  const spreadNumbers = spreadPageNumbers(current);
  const spreadKey = spreadNumbers.join('-');

  useEffect(() => {
    if (!spreads.length) return;
    setSpreadIndex((value) => {
      const target = startPage ? findSpreadIndex(spreads, startPage) : value;
      return Math.min(Math.max(0, target), spreads.length - 1);
    });
  }, [spreads, startPage]);

  useEffect(() => {
    if (!catalogue) return undefined;
    const previous = document.title;
    document.title = `${catalogue.title}${catalogue.pole_name ? ` · ${catalogue.pole_name}` : ''}`;
    let meta = null;
    if (catalogue.no_index) {
      meta = document.createElement('meta');
      meta.name = 'robots';
      meta.content = 'noindex, nofollow';
      document.head.appendChild(meta);
    }
    return () => {
      document.title = previous;
      if (meta) document.head.removeChild(meta);
    };
  }, [catalogue]);

  useEffect(() => {
    if (status !== 'ready' || !opened || seen.current.has('view')) return;
    seen.current.add('view');
    trackEvent({ catalogue, type: 'view' }).catch(() => {});
  }, [status, opened, catalogue]);

  useEffect(() => {
    if (status !== 'ready' || !opened || !spreadKey) return;
    spreadNumbers.forEach((number) => {
      if (seen.current.has(`p${number}`)) return;
      seen.current.add(`p${number}`);
      trackEvent({ catalogue, type: 'page', pageNumber: number }).catch(() => {});
    });
    if (pages.length && spreadNumbers.includes(pages.length) && !seen.current.has('done')) {
      seen.current.add('done');
      trackEvent({ catalogue, type: 'full_read', pageNumber: pages.length }).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spreadKey, pages.length, opened, status]);

  useEffect(() => {
    if (!opened) return undefined;
    const onKey = (event) => {
      if (event.key === 'ArrowRight') setSpreadIndex((index) => Math.min(spreads.length - 1, index + 1));
      if (event.key === 'ArrowLeft') setSpreadIndex((index) => Math.max(0, index - 1));
      if (event.key === 'Escape') setPanel(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [opened, spreads.length]);

  const goToPage = useCallback(
    (pageNumber) => {
      setSpreadIndex(findSpreadIndex(spreads, pageNumber));
      setPanel(null);
    },
    [spreads],
  );

  const handleDownload = async () => {
    if (!catalogue.pdf_file_uri) return;
    const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({
      file_uri: catalogue.pdf_file_uri,
      expires_in: 900,
    });
    window.open(signed_url, '_blank', 'noopener');
    trackEvent({ catalogue, type: 'download' }).catch(() => {});
  };

  const handleShare = async () => {
    const target = absoluteUrl(`${publicPath(catalogue.slug)}${spreadNumbers[0] > 1 ? `?p=${spreadNumbers[0]}` : ''}`);
    try {
      if (navigator.share) {
        await navigator.share({ title: catalogue.title, url: target });
      } else {
        await copyText(target);
        toast({ title: 'Lien copié', description: 'Le lien de cette page est dans le presse-papiers.' });
      }
      trackEvent({ catalogue, type: 'share' }).catch(() => {});
    } catch (error) {
      // partage interrompu par le lecteur
    }
  };

  const handleLink = (link) => {
    if (link.url) window.open(link.url, '_blank', 'noopener');
    else if (link.page) goToPage(link.page);
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else shellRef.current?.requestFullscreen?.();
  };

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-primary">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/25 border-t-accent" />
      </div>
    );
  }

  if (status === 'missing' || status === 'closed') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-primary px-8 text-center">
        <div>
          <p className="font-display text-3xl text-primary-foreground">
            {status === 'missing' ? 'Catalogue introuvable' : 'Catalogue non publié'}
          </p>
          <p className="mt-3 text-sm text-primary-foreground/60">
            {status === 'missing'
              ? "Ce lien ne correspond à aucun catalogue. Vérifiez l'adresse transmise."
              : 'Ce catalogue est encore en relecture. Demandez le lien privé à son auteur.'}
          </p>
        </div>
      </div>
    );
  }

  if (status === 'locked') {
    return <PasswordGate catalogue={catalogue} onUnlock={() => setStatus('ready')} />;
  }

  if (!opened) {
    return <CoverScreen catalogue={catalogue} onOpen={() => setOpened(true)} onDownload={handleDownload} />;
  }

  return (
    <div ref={shellRef} className="flex h-screen flex-col overflow-hidden bg-[#e7e4dc]">
      <ViewerToolbar
        catalogue={catalogue}
        compact={embedded}
        panel={panel}
        onPanel={setPanel}
        zoom={ZOOM_STEPS[zoomIndex]}
        onZoom={(direction) => setZoomIndex((index) => Math.min(ZOOM_STEPS.length - 1, Math.max(0, index + direction)))}
        onFullscreen={toggleFullscreen}
        onDownload={handleDownload}
        onShare={handleShare}
      />
      {catalogue.theme_color ? <div className="h-[3px] shrink-0" style={{ backgroundColor: catalogue.theme_color }} /> : null}

      <div className="grain min-h-0 flex-1 p-3 lg:p-6">
        {pages.length ? (
          <FlipBook
            pages={pages}
            spreadIndex={spreadIndex}
            onSpreadChange={setSpreadIndex}
            onLink={handleLink}
            crop={catalogue.crop}
            zoom={ZOOM_STEPS[zoomIndex]}
            containerRef={stageRef}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
            <p className="text-sm text-muted-foreground">Chargement des pages…</p>
          </div>
        )}
      </div>

      <ViewerFooter
        firstPage={spreadNumbers[0]}
        lastPage={spreadNumbers[1]}
        totalPages={pages.length}
        index={spreadIndex}
        count={spreads.length}
        onPrev={() => setSpreadIndex((index) => Math.max(0, index - 1))}
        onNext={() => setSpreadIndex((index) => Math.min(spreads.length - 1, index + 1))}
        onSeek={(value) => setSpreadIndex(value)}
      />

      <SidePanel
        panel={panel}
        onPanel={setPanel}
        catalogue={catalogue}
        pages={pages}
        onClose={() => setPanel(null)}
        onSelectPage={goToPage}
      />
    </div>
  );
}