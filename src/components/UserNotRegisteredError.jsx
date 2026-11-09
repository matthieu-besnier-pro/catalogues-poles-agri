import React from 'react';
import { ShieldAlert, Sprout } from 'lucide-react';

const UserNotRegisteredError = () => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="mb-8 flex flex-col items-center gap-1.5">
        <div className="flex items-center gap-2 text-primary">
          <Sprout className="h-5 w-5" aria-hidden="true" />
          <span className="font-display text-xl leading-none">Catalogues</span>
        </div>
        <p className="text-[11px] uppercase tracking-[0.32em] text-accent">Pôle Agri</p>
      </div>
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary">
          <ShieldAlert className="h-7 w-7 text-primary-foreground" aria-hidden="true" />
        </div>
        <h1 className="font-display text-3xl tracking-tight text-foreground">Accès restreint</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Vous n'êtes pas inscrit pour utiliser cette application. Contactez l'administrateur pour demander l'accès.
        </p>
        <div className="mt-6 rounded-lg bg-secondary/60 p-4 text-left text-sm text-muted-foreground">
          <p>Si vous pensez qu'il s'agit d'une erreur :</p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>Vérifiez que vous êtes connecté avec le bon compte</li>
            <li>Contactez l'administrateur pour demander l'accès</li>
            <li>Essayez de vous déconnecter puis reconnecter</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default UserNotRegisteredError;
