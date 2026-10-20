import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const shortDate = (value) => new Date(value).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
const fullDate = (value) => new Date(value).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

export default function TrendChart({ data, color = '#1C4A38' }) {
  if (!data?.length) {
    return (
      <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
        Aucune vue enregistrée sur cette période.
      </div>
    );
  }

  return (
    <div className="h-[240px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 6, left: -22, bottom: 0 }}>
          <defs>
            <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
          <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} allowDecimals={false} width={54} />
          <Tooltip
            labelFormatter={fullDate}
            formatter={(value) => [value, 'Vues']}
            contentStyle={{ borderRadius: 10, border: '1px solid hsl(var(--border))', fontSize: 12 }}
          />
          <Area type="monotone" dataKey="count" stroke={color} strokeWidth={2} fill="url(#viewsGradient)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}