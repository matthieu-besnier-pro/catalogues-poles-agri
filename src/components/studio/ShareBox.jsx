import { useState } from 'react';
import { Check, Code2, Copy, ExternalLink, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { absoluteUrl, copyText, iframeCode, publicPath } from '@/lib/format';

function Field({ label, value, onCopied }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    const done = await copyText(value);
    setCopied(done);
    window.setTimeout(() => setCopied(false), 1800);
    if (done) onCopied();
  };
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <div className="mt-2 flex items-stretch gap-2">
        <input readOnly value={value} className="min-w-0 flex-1 rounded-lg border border-border bg-white px-3 py-2 text-xs text-foreground/80" />
        <Button type="button" variant="outline" size="icon" onClick={copy} className="shrink-0 rounded-lg">
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}

export default function ShareBox({ catalogue, onCopied }) {
  const link = absoluteUrl(publicPath(catalogue.slug));
  const direct = absoluteUrl(`${publicPath(catalogue.slug)}?open=1`);
  const review = absoluteUrl(`${publicPath(catalogue.slug)}?rev=${catalogue.preview_token}`);
  const embedded = iframeCode(catalogue.slug);

  return (
    <div className="space-y-5 rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-4">
        <p className="font-display text-lg">Diffusion</p>
        <Button asChild variant="outline" size="sm" className="rounded-full">
          <a href={link} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="mr-2 h-3.5 w-3.5" />
            Ouvrir
          </a>
        </Button>
      </div>

      <Field label="Lien public du catalogue" value={link} onCopied={onCopied} />
      <Field label="Lien direct (feuilletage immédiat, sans écran d'accueil)" value={direct} onCopied={onCopied} />

      <div>
        <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          <Code2 className="h-3.5 w-3.5" />
          Intégration sur un site
        </p>
        <textarea
          readOnly
          value={embedded}
          rows={3}
          className="mt-2 w-full rounded-lg border border-border bg-white px-3 py-2 text-xs text-foreground/70"
        />
      </div>

      {catalogue.status !== 'published' ? (
        <Field label="Lien de relecture (brouillon)" value={review} onCopied={onCopied} />
      ) : (
        <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
          <Link2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Le lien reste identique après le remplacement du PDF : les adresses déjà diffusées continuent de fonctionner.
        </p>
      )}
    </div>
  );
}