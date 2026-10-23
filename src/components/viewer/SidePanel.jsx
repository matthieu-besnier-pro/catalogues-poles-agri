import { X } from 'lucide-react';
import { Image } from '@/components/ui/image';
import SearchPanel from '@/components/viewer/SearchPanel';
import { cn } from '@/lib/utils';

const TABS = [
  { key: 'toc', label: 'Sommaire' },
  { key: 'thumbs', label: 'Miniatures' },
  { key: 'search', label: 'Recherche' },
];

export default function SidePanel({ panel, onPanel, catalogue, pages, onClose, onSelectPage }) {
  if (!panel) return null;
  const tabs = TABS.filter((tab) => tab.key !== 'search' || catalogue.search_enabled);

  return (
    <>
      <button
        type="button"
        aria-label="Fermer le panneau"
        onClick={onClose}
        className="fixed inset-0 z-30 bg-primary/25 backdrop-blur-[1px]"
      />
      <aside className="fixed right-0 top-0 z-40 flex h-full w-full max-w-[420px] flex-col border-l border-border bg-background p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-1 rounded-lg bg-secondary p-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => onPanel(tab.key)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs transition-colors',
                  panel === tab.key ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-muted-foreground hover:bg-secondary" aria-label="Fermer">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 flex-1 overflow-hidden">
          {panel === 'toc' ? (
            <div className="h-full overflow-y-auto">
              {catalogue.toc?.length ? (
                <ul className="space-y-1">
                  {catalogue.toc.map((entry) => (
                    <li key={`${entry.page}-${entry.title}`}>
                      <button
                        type="button"
                        onClick={() => onSelectPage(entry.page)}
                        className="flex w-full items-baseline justify-between gap-4 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-secondary"
                        style={{ paddingLeft: `${12 + (entry.level || 0) * 14}px` }}
                      >
                        <span className="leading-snug">{entry.title}</span>
                        <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">{entry.page}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-1 text-xs leading-relaxed text-muted-foreground">
                  Ce PDF ne contient pas de signets. Le bandeau de miniatures permet de parcourir le catalogue.
                </p>
              )}
            </div>
          ) : null}

          {panel === 'thumbs' ? (
            <div className="h-full overflow-y-auto">
              <div className="grid grid-cols-3 gap-3">
                {pages.map((page) => (
                  <button
                    key={page.id || page.page_number}
                    type="button"
                    onClick={() => onSelectPage(page.page_number)}
                    className="group text-left"
                  >
                    <span className="block overflow-hidden rounded-md border border-border bg-white shadow-sm transition-transform duration-300 group-hover:-translate-y-0.5">
                      <Image src={page.image_url} alt={`Page ${page.page_number}`} className="h-full w-full" loading="lazy" />
                    </span>
                    <span className="mt-1.5 block text-[10px] tabular-nums text-muted-foreground">{page.page_number}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {panel === 'search' ? (
            <SearchPanel versionId={catalogue.active_version_id} onSelect={onSelectPage} />
          ) : null}
        </div>
      </aside>
    </>
  );
}