import { useRef, useState } from 'react';
import { FileUp, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const MAX_SIZE = 200 * 1024 * 1024;

export default function PdfDropzone({ onFile, busy = false, hint }) {
  const input = useRef(null);
  const [over, setOver] = useState(false);
  const [error, setError] = useState('');

  const accept = async (file) => {
    setError('');
    if (!file) return;
    if (file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name)) {
      setError('Seuls les fichiers PDF sont acceptés.');
      return;
    }
    if (file.size > MAX_SIZE) {
      setError('Ce fichier dépasse la limite de 200 Mo.');
      return;
    }
    onFile(file);
  };

  return (
    <div>
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setOver(false);
          accept(event.dataTransfer.files?.[0]);
        }}
        onClick={() => input.current?.click()}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-8 py-16 text-center transition-colors duration-300',
          over ? 'border-accent bg-accent/10' : 'border-border bg-card hover:border-primary/40 hover:bg-secondary/40',
        )}
      >
        {busy ? (
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        ) : (
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/8">
            <FileUp className="h-6 w-6 text-primary" />
          </span>
        )}
        <p className="mt-5 font-display text-xl">{busy ? 'Lecture du PDF…' : 'Déposez le PDF du catalogue'}</p>
        <p className="mt-2 max-w-sm text-xs leading-relaxed text-muted-foreground">
          {hint || 'PDF jusqu’à 200 Mo, 300 pages environ. Les traits de coupe peuvent être rognés à l’étape suivante.'}
        </p>
        <input
          ref={input}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(event) => {
            accept(event.target.files?.[0]);
            event.target.value = '';
          }}
        />
      </div>
      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
    </div>
  );
}