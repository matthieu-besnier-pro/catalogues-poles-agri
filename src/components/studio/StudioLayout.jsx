import { NavLink, Outlet } from 'react-router-dom';
import { BarChart3, Library, Plus, Sprout } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { cn } from '@/lib/utils';

const NAV = [
  { to: '/', label: 'Catalogues', icon: Library, end: true },
  { to: '/nouveau', label: 'Nouveau', icon: Plus, adminOnly: true },
  { to: '/statistiques', label: 'Statistiques', icon: BarChart3, adminOnly: true },
  { to: '/poles', label: 'Pôles', icon: Sprout, adminOnly: true },
];

export default function StudioLayout() {
  const { isAuthenticated, user } = useAuth();
  const isAdmin = isAuthenticated && user?.role === 'admin';
  const items = NAV.filter((item) => !item.adminOnly || isAdmin);

  return (
    <div className="flex min-h-screen flex-col bg-background lg:flex-row">
      <aside className="flex flex-col bg-primary text-primary-foreground lg:w-[272px] lg:shrink-0">
        <div className="flex items-baseline gap-3 px-6 pb-5 pt-7 lg:block lg:pt-10">
          <p className="font-display text-2xl leading-none tracking-tight">Catalogues</p>
          <p className="text-[11px] uppercase tracking-[0.32em] text-accent lg:mt-2.5">Pôles Agri</p>
        </div>
        <nav className="hide-scrollbar flex gap-1 overflow-x-auto px-3 pb-4 lg:flex-col lg:overflow-visible">
          {items.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 whitespace-nowrap rounded-lg px-4 py-2.5 text-sm transition-colors duration-200',
                  isActive ? 'bg-white/15 text-white' : 'text-white/65 hover:bg-white/8 hover:text-white',
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto hidden border-t border-white/10 px-6 py-6 lg:block">
          <p className="text-[11px] uppercase tracking-[0.2em] text-white/45">Espace de publication</p>
          <p className="mt-2.5 text-xs leading-relaxed text-white/60">
            Un PDF importé devient un catalogue feuilletable, diffusé par un lien public stable.
          </p>
        </div>
      </aside>
      <main className="min-w-0 flex-1">
        <Outlet />
      </main>
    </div>
  );
}