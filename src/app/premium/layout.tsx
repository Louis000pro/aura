import type { Metadata } from "next";

/**
 * Métadonnées de /premium. La page elle-même est un composant client, qui ne
 * peut donc pas exporter de `metadata` : ce layout est là uniquement pour ça.
 *
 * La page reste indexable alors que la vente est fermée (`VENTE_OUVERTE` à
 * faux). C'est délibéré : « prix Vaiiya » et « Vaiiya abonnement » sont des
 * requêtes de marque qui seront posées de toute façon, et mieux vaut y répondre
 * nous-mêmes que laisser deviner. Le texte de la page dit déjà que l'abonnement
 * n'est pas ouvert ; il ne s'agit donc pas d'annoncer une offre qu'on ne vend
 * pas. La refonte de la page est un chantier à part.
 */
export const metadata: Metadata = {
  // Le gabarit du layout racine ajoute « · Vaiiya » : « Vaiiya Premium » ici
  // donnerait « Vaiiya Premium · Vaiiya ».
  title: "Premium, prix et offre",
  description:
    "Ce que le compte gratuit Vaiiya contient, ce que Premium ajoute et combien il coûte. L’abonnement n’est pas encore ouvert à la souscription.",
  alternates: { canonical: "https://vaiiya.fr/premium" },
};

export default function PremiumLayout({ children }: { children: React.ReactNode }) {
  return children;
}
