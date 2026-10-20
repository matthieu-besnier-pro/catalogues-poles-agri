import { useEffect, useRef } from 'react';
import { Slider } from '@/components/ui/slider';
import { renderPageToCanvas } from '@/lib/pdfEngine';
import { Info } from 'lucide-react';

const EDGES = [
  { key: 'top', label: 'Haut' },
  { key: 'right', label: 'Droite' },
  { key: 'bottom', label: 'Bas' },
  { key: 'left', label: 'Gauche' },
];

export default function CropEditor({ doc, crop, onChange }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!doc) return undefined;
    let cancelled = false;
    const handle = window.setTimeout(async () => {
      const { canvas } = await renderPageToCanvas(doc, 1, { targetWidth: 900, crop });
      if (cancelled) return;
      const target = canvasRef.current;
      if (!target) return;
      target.width = canvas.width;
      target.height = canvas.height;
      target.getContext('2d').drawImage(canvas, 0, 0);
    }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [doc, crop.top, crop.right, crop.bottom, crop.left]);

  const active = EDGES.some((edge) => (crop[edge.key] || 0) > 0);

  return (
    <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
      <div>
        <div className="overflow-hidden rounded-lg border border-border bg-white">
          <canvas ref={canvasRef} className="h-auto w-full" />
        </div>
        <p className="mt-3 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          Aperçu de la page 1 · {active ? 'recadrage appliqué' : 'page entière'}
        </p>
      </div>

      <div>
        <div className="flex items-start gap-3 rounded-lg bg-secondary/60 p-4">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p className="text-xs leading-relaxed text-muted-foreground">
            Aucune TrimBox n’a pu être lue automatiquement dans ce PDF. Si la page comporte des traits de coupe, des fonds perdus ou
            des mires d’impression, indiquez la marge à retirer : elle sera appliquée à toutes les pages, à l’affichage comme au
            téléchargement.
          </p>
        </div>

        <div className="mt-6 space-y-5">
          {EDGES.map((edge) => (
            <div key={edge.key}>
              <div className="flex items-baseline justify-between">
                <p className="text-sm">{edge.label}</p>
                <p className="text-xs tabular-nums text-muted-foreground">
                  {Math.round((crop[edge.key] || 0) * 1000) / 10} %
                </p>
              </div>
              <Slider
                className="mt-3"
                min={0}
                max={12}
                step={0.5}
                value={[(crop[edge.key] || 0) * 100]}
                onValueChange={(value) => onChange({ ...crop, [edge.key]: value[0] / 100 })}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}