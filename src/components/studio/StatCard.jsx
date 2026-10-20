export default function StatCard({ label, value, hint, icon: Icon }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 transition-shadow duration-300 hover:shadow-[0_18px_34px_-26px_rgba(14,32,26,0.45)]">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
        {Icon ? <Icon className="h-4 w-4 shrink-0 text-accent" /> : null}
      </div>
      <p className="mt-4 font-display text-3xl leading-none">{value}</p>
      {hint ? <p className="mt-2 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}