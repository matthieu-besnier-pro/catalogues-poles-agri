import { useEffect, useState } from 'react';
import { ShieldCheck, UserRound } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { formatDate } from '@/lib/format';

export default function UsersManager() {
  const { toast } = useToast();
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState('');

  const load = async () => {
    const result = await base44.entities.User.list('-created_date');
    setUsers(result || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const changeRole = async (targetUser, role) => {
    if (role === targetUser.role) return;
    if (targetUser.id === me?.id && role !== 'admin') {
      toast({ title: 'Action impossible', description: 'Vous ne pouvez pas retirer votre propre accès administrateur.' });
      return;
    }
    setSavingId(targetUser.id);
    try {
      await base44.entities.User.update(targetUser.id, { role });
      setUsers((current) => current.map((item) => (item.id === targetUser.id ? { ...item, role } : item)));
      toast({ title: 'Rôle mis à jour' });
    } catch (error) {
      toast({ title: 'Échec de la mise à jour', description: error?.message || '' });
    } finally {
      setSavingId('');
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-10 lg:px-12 lg:py-16">
      <header>
        <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">Organisation</p>
        <h1 className="mt-3 font-display text-4xl leading-tight">Utilisateurs</h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
          Seuls les comptes administrateurs peuvent gérer les catalogues. Les nouvelles personnes doivent d’abord créer un
          compte (onglet Connexion) : elles apparaissent ici ensuite, avec le rôle « Lecteur » par défaut.
        </p>
      </header>

      <div className="mt-10 overflow-hidden rounded-xl border border-border bg-card">
        {loading ? (
          <div className="space-y-3 p-6">
            {[0, 1, 2].map((key) => (
              <div key={key} className="h-12 animate-pulse rounded-lg bg-secondary/60" />
            ))}
          </div>
        ) : users.length ? (
          <ul className="divide-y divide-border">
            {users.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-muted-foreground">
                    {item.role === 'admin' ? <ShieldCheck className="h-4 w-4 text-primary" /> : <UserRound className="h-4 w-4" />}
                  </span>
                  <div>
                    <p className="text-sm font-medium">
                      {item.full_name || item.email}
                      {item.id === me?.id ? <span className="ml-2 text-xs text-muted-foreground">(vous)</span> : null}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.email} · Inscrit le {formatDate(item.created_date)}
                    </p>
                  </div>
                </div>
                <Select value={item.role} onValueChange={(role) => changeRole(item, role)} disabled={savingId === item.id}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrateur</SelectItem>
                    <SelectItem value="user">Lecteur</SelectItem>
                  </SelectContent>
                </Select>
              </li>
            ))}
          </ul>
        ) : (
          <div className="px-8 py-16 text-center">
            <p className="font-display text-xl">Aucun compte pour l’instant</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Les comptes créés depuis l’onglet Connexion apparaîtront ici.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}