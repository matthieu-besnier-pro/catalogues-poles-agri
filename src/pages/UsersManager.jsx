import { useEffect, useState } from 'react';
import { Check, Copy, RefreshCw, ShieldCheck, UserRound } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PoleMultiSelect from '@/components/studio/PoleMultiSelect';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { absoluteUrl, copyText, formatDate } from '@/lib/format';

export default function UsersManager() {
  const { toast } = useToast();
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [poles, setPoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [savingId, setSavingId] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  const registerLink = absoluteUrl('/register');

  const copyRegisterLink = async () => {
    const done = await copyText(registerLink);
    if (done) {
      setLinkCopied(true);
      window.setTimeout(() => setLinkCopied(false), 1800);
    }
  };

  const load = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const result = await base44.functions.invoke('listUsers', {});
      const payload = result?.data ?? result;
      if (payload?.error) throw new Error(payload.error);
      setUsers(payload?.items || []);
    } catch (error) {
      setLoadError(error?.message || 'Une erreur inconnue est survenue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    base44.entities.Pole.filter({}, { sort: 'display_order', limit: 50 }).then((page) => setPoles(page.items || []));
  }, []);

  const changeRole = async (targetUser, role) => {
    if (role === targetUser.role) return;
    if (targetUser.id === me?.id && role !== 'admin') {
      toast({ title: 'Action impossible', description: 'Vous ne pouvez pas retirer votre propre accès administrateur.' });
      return;
    }
    setSavingId(targetUser.id);
    try {
      const result = await base44.functions.invoke('updateUserRole', { userId: targetUser.id, role });
      const payload = result?.data ?? result;
      if (payload?.error) throw new Error(payload.error);
      setUsers((current) => current.map((item) => (item.id === targetUser.id ? { ...item, role } : item)));
      toast({ title: 'Rôle mis à jour' });
    } catch (error) {
      toast({ title: 'Échec de la mise à jour', description: error?.message || '' });
    } finally {
      setSavingId('');
    }
  };

  const changePoles = async (targetUser, poleIds) => {
    setSavingId(targetUser.id);
    try {
      const result = await base44.functions.invoke('updateUserRole', { userId: targetUser.id, role: targetUser.role, poleIds });
      const payload = result?.data ?? result;
      if (payload?.error) throw new Error(payload.error);
      setUsers((current) => current.map((item) => (item.id === targetUser.id ? { ...item, pole_ids: poleIds } : item)));
      toast({ title: 'Filiales mises à jour' });
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
          compte (onglet Connexion) : elles apparaissent ici ensuite, avec le rôle « Lecteur » par défaut. Rattacher un
          administrateur à une ou plusieurs filiales filtre ce qu’il voit dans l’outil (liste des catalogues, statistiques) —
          cela ne l’empêche pas techniquement d’accéder aux autres filiales, c’est une aide à la clarté, pas une restriction
          stricte.
        </p>
      </header>

      <div className="mt-8 rounded-xl border border-border bg-card p-5">
        <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Lien d’inscription</p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Partagez ce lien à la personne à inviter : elle arrive directement sur le formulaire de création de compte, sans
          passer par l’écran de connexion.
        </p>
        <div className="mt-3 flex items-stretch gap-2">
          <input
            readOnly
            value={registerLink}
            className="min-w-0 flex-1 rounded-lg border border-border bg-white px-3 py-2 text-xs text-foreground/80"
          />
          <Button type="button" variant="outline" size="icon" onClick={copyRegisterLink} className="shrink-0 rounded-lg">
            {linkCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
        {loading ? (
          <div className="space-y-3 p-6">
            {[0, 1, 2].map((key) => (
              <div key={key} className="h-12 animate-pulse rounded-lg bg-secondary/60" />
            ))}
          </div>
        ) : loadError ? (
          <div className="px-8 py-16 text-center">
            <p className="font-display text-xl">Impossible de charger les utilisateurs</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              {loadError} Si cet onglet vient d’être ajouté, vérifiez que l’application a bien été publiée depuis le dashboard
              Base44 : les fonctions backend ne sont disponibles qu’après publication.
            </p>
            <Button variant="outline" className="mt-5 rounded-full" onClick={load}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Réessayer
            </Button>
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
                <div className="flex flex-wrap items-center gap-2">
                  <PoleMultiSelect
                    poles={poles}
                    value={item.pole_ids || []}
                    onChange={(poleIds) => changePoles(item, poleIds)}
                    disabled={savingId === item.id || item.role !== 'admin'}
                    className="h-9 w-[180px] justify-between gap-2 rounded-full px-4 text-sm font-normal"
                  />
                  <Select value={item.role} onValueChange={(role) => changeRole(item, role)} disabled={savingId === item.id}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Administrateur</SelectItem>
                      <SelectItem value="user">Lecteur</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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