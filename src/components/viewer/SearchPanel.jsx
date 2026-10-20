import { useEffect, useState } from 'react';
import { Search as SearchIcon } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { escapeRegex } from '@/lib/format';

export default function SearchPanel({ versionId, onSelect }) {
  const [term, setTerm] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const cleaned = term.trim();
    if (!versionId || cleaned.length < 3) {
      setResults([]);
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    const handle = window.setTimeout(async () => {
      const page = await base44.entities.CataloguePage.filter(
        { version_id: versionId, text: { $regex: escapeRegex(cleaned), $options: 'i' } },
        { limit: 30, fields: ['page_number', 'text'] },
      );
      setResults(page.items || []);
      setLoading(false);
    }, 320);
    return () => {
      window.clearTimeout(handle);
      setLoading(false);
    };
  }, [term, versionId]);

  return (
    <div className="flex h-full flex-col">
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          autoFocus
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Rechercher dans le catalogue"
          className="h-11 w-full rounded-lg border border-border bg-white pl-9 pr-3 text-sm outline-none focus:border-primary"
        />
      </div>
      <div className="mt-4 flex-1 overflow-y-auto">
        {loading ? <p className="text-xs text-muted-foreground">Recherche…</p> : null}
        {!loading && term.trim().length >= 3 && !results.length ? (
          <p className="text-xs text-muted-foreground">Aucun résultat pour « {term.trim()} ».</p>
        ) : null}
        {!loading && term.trim().length < 3 ? (
          <p className="text-xs text-muted-foreground">Saisissez au moins 3 caractères. Le texte des pages est interrogé tel qu'il figure dans le PDF.</p>
        ) : null}
        <ul className="space-y-2">
          {results.map((page) => (
            <li key={page.id}>
              <button
                type="button"
                onClick={() => onSelect(page.page_number)}
                className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-left transition-colors hover:border-primary/40"
              >
                <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Page {page.page_number}</span>
                <span className="mt-1 block text-xs leading-relaxed text-foreground/80">
                  {snippet(page.text, term.trim())}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function snippet(text, term) {
  const source = text || '';
  const index = source.toLowerCase().indexOf(term.toLowerCase());
  if (index < 0) return source.slice(0, 120);
  const start = Math.max(0, index - 40);
  return `…${source.slice(start, start + 150).trim()}…`;
}