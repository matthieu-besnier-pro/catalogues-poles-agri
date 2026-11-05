import { HelpCircle } from 'lucide-react';

const ITEMS = [
  {
    term: 'Vue',
    text: "Comptée une fois par session de lecture ouverte, dès le clic sur « Feuilleter », quel que soit le nombre de pages tournées ensuite. Rouvrir le lien dans un nouvel onglet ou après un rechargement de page compte comme une nouvelle vue.",
  },
  {
    term: 'Lecteurs uniques',
    text: "Un identifiant anonyme est généré et conservé dans le navigateur du visiteur (stockage local, pas un cookie publicitaire) dès sa première visite — aucun nom, e-mail ou adresse IP n'est rattaché. Deux visites depuis le même navigateur comptent pour un seul lecteur ; le même lecteur sur deux appareils, ou en navigation privée, compte deux fois.",
  },
  {
    term: 'Pages lues / Pages lues par visite',
    text: "Une page compte la première fois qu'un lecteur l'atteint pendant sa session ; y revenir ensuite ne la recompte pas. « Pages lues par visite » est le total des pages lues divisé par le nombre de vues, sur la période choisie.",
  },
  {
    term: 'Lecture complète',
    text: 'Comptée quand un lecteur atteint la dernière page du catalogue.',
  },
  {
    term: 'Téléchargements',
    text: 'Un événement par clic sur « Télécharger le PDF » (si cette option est activée pour le catalogue) — télécharger plusieurs fois compte plusieurs fois.',
  },
  {
    term: 'Partages',
    text: 'Un événement par clic sur le bouton de partage, qu’il aboutisse ou non à un envoi effectif.',
  },
  {
    term: 'Origine du trafic',
    text: "Déterminée par le paramètre ?src= du lien s'il est présent (utile pour taguer un envoi), sinon par la page d'où vient le visiteur (son « référent »). De nombreux contextes ne transmettent aucun référent — SMS, WhatsApp, un e-mail, certaines applications — ces visites apparaissent alors en « Direct » même si l'origine réelle est différente. Pour fiabiliser le suivi d'un envoi (SMS, campagne), ajouter ?src=... à la fin du lien est le seul moyen sûr.",
  },
  {
    term: 'Appareils',
    text: "Déduits du user-agent du navigateur (mobile / tablette / ordinateur) — une estimation, pas une mesure exacte.",
  },
  {
    term: 'Période « Tout »',
    text: "Aucune limite de date : le calcul porte sur l'historique complet des événements enregistrés depuis le premier catalogue publié.",
  },
];

export default function StatsMethodology() {
  return (
    <details className="group rounded-xl border border-border bg-card p-6">
      <summary className="flex cursor-pointer list-none items-center gap-2 font-display text-lg">
        <HelpCircle className="h-4 w-4 text-muted-foreground" />
        Comment ces chiffres sont calculés
        <span className="ml-auto text-xs font-sans uppercase tracking-[0.14em] text-muted-foreground group-open:hidden">
          Afficher
        </span>
        <span className="ml-auto hidden text-xs font-sans uppercase tracking-[0.14em] text-muted-foreground group-open:inline">
          Masquer
        </span>
      </summary>
      <dl className="mt-5 space-y-4">
        {ITEMS.map((item) => (
          <div key={item.term}>
            <dt className="text-sm font-medium">{item.term}</dt>
            <dd className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.text}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
