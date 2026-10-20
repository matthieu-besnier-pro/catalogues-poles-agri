import { cn } from '@/lib/utils';

const STYLES = {
  draft: { label: 'Brouillon', className: 'bg-white/90 text-foreground' },
  published: { label: 'Publié', className: 'bg-primary text-primary-foreground' },
  archived: { label: 'Archivé', className: 'bg-muted text-muted-foreground' },
  processing: { label: 'Conversion', className: 'bg-accent text-accent-foreground' },
  ready: { label: 'Prête', className: 'bg-primary/90 text-primary-foreground' },
  failed: { label: 'Échec', className: 'bg-destructive text-destructive-foreground' },
};

export default function StatusBadge({ status, className }) {
  const style = STYLES[status] || STYLES.draft;
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]',
        style.className,
        className,
      )}
    >
      {style.label}
    </span>
  );
}