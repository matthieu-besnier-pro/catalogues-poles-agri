import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';

function Row({ title, description, checked, onChange, children }) {
  return (
    <div className="flex items-start justify-between gap-6 border-b border-border py-4 last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
        {children}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

export default function CatalogueOptions({ options, onChange, passwordLabel = 'Mot de passe de consultation' }) {
  const set = (patch) => onChange({ ...options, ...patch });

  return (
    <div className="divide-y divide-border">
      <Row
        title="Téléchargement du PDF"
        description="Le bouton de téléchargement apparaît dans la visionneuse. Sans cette option, le fichier d'origine n'est jamais transmis au lecteur."
        checked={!!options.download_enabled}
        onChange={(value) => set({ download_enabled: value })}
      />
      <Row
        title="Recherche plein texte"
        description="Le lecteur peut chercher un mot dans l'ensemble des pages et y accéder directement."
        checked={options.search_enabled !== false}
        onChange={(value) => set({ search_enabled: value })}
      />
      <Row
        title="Indexation par les moteurs de recherche"
        description="Désactivez-la pour un catalogue réservé aux clients : la page publiera une consigne de non-indexation."
        checked={!!options.no_index}
        onChange={(value) => set({ no_index: value })}
      />
      <div className="py-4">
        <Label className="text-sm font-medium">{passwordLabel}</Label>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Laissez vide pour un accès libre. Le mot de passe est enregistré sous forme d'empreinte, jamais en clair.
        </p>
        <Input
          type="password"
          value={options.password || ''}
          onChange={(event) => set({ password: event.target.value })}
          placeholder="Accès libre"
          className="mt-3 max-w-xs"
        />
      </div>
    </div>
  );
}