import { useState } from 'react';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sha256 } from '@/lib/format';

export default function PasswordGate({ catalogue, onUnlock }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    const digest = await sha256(value);
    if (digest === catalogue.password_hash) {
      sessionStorage.setItem(`pa-unlock-${catalogue.slug}`, '1');
      onUnlock();
      return;
    }
    setError('Mot de passe incorrect.');
    setBusy(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-primary px-6">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl bg-background p-8 shadow-2xl">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary">
          <Lock className="h-5 w-5 text-primary" />
        </span>
        <h1 className="mt-6 font-display text-2xl leading-tight">{catalogue.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Ce catalogue est protégé. Saisissez le mot de passe communiqué par son auteur.</p>
        <input
          type="password"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          autoFocus
          className="mt-6 h-11 w-full rounded-lg border border-border bg-white px-3 text-sm outline-none focus:border-primary"
          placeholder="Mot de passe"
        />
        {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
        <Button type="submit" disabled={busy || !value} className="mt-4 w-full rounded-lg">
          {busy ? 'Vérification…' : 'Consulter le catalogue'}
        </Button>
      </form>
    </div>
  );
}