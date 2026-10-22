import { useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';

// Gates the studio (everything except /c/:slug, the public catalogue
// viewer) behind a logged-in user whose User record has role "admin".
// Anyone with the public link can still read/share a catalogue; only
// managing catalogues requires an admin account.
export default function RequireAdmin({ children }) {
  const { isAuthenticated, isLoadingAuth, isLoadingPublicSettings, user, navigateToLogin, logout } = useAuth();
  const ready = !isLoadingPublicSettings && !isLoadingAuth;

  useEffect(() => {
    if (ready && !isAuthenticated) navigateToLogin();
  }, [ready, isAuthenticated, navigateToLogin]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    // navigateToLogin() above is already redirecting away from this page.
    return null;
  }

  if (user?.role !== 'admin') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="font-display text-2xl">Accès réservé</p>
        <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
          Cet espace de gestion des catalogues est réservé aux administrateurs.
          {user?.email ? ` Le compte ${user.email} n'a pas ce droit.` : ''}
        </p>
        <button
          type="button"
          onClick={() => logout()}
          className="text-xs uppercase tracking-[0.16em] text-primary underline-offset-4 hover:underline"
        >
          Se déconnecter
        </button>
      </div>
    );
  }

  return children;
}
