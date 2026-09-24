import type { Metadata } from "next";
import AccueilClient from "./AccueilClient";
import { CHIFFRES_PUBLICS } from "@/lib/chiffresPublics";
import { resumeAvisPublics } from "@/lib/avisPublics";

/* La landing lit les avis approuvés côté serveur : on met le rendu en cache
   10 min plutôt que de frapper la base à chaque visite de l'écran le plus
   ouvert de l'app. Les avis n'ont pas besoin d'être à la seconde près. */
export const revalidate = 600;

/**
 * Coquille serveur de l'accueil.
 *
 * Elle n'existe que pour porter la `metadata` de `/`. Le layout racine est
 * partagé par toutes les routes : un canonical posé là-bas serait hérité par
 * chaque page qui n'en redéfinit pas, et c'est exactement ce qui faisait
 * déclarer à onze URL publiques qu'elles étaient des doublons de l'accueil.
 * Le canonical de la page d'accueil vit donc ici, sur la page d'accueil.
 *
 * Tout l'écran, lui, reste dans `AccueilClient` : c'est un composant client
 * (état d'authentification, animations), et un composant client ne peut pas
 * exporter de `metadata`.
 */
export const metadata: Metadata = {
  alternates: { canonical: "https://vaiiya.fr/" },
};

export default async function Page() {
  /* Les chiffres de la landing sont comptés ici, côté serveur, et descendus en
     props. Les importer directement dans `LandingStory` (composant client)
     enverrait au navigateur le texte intégral des 26 mini-cours pour n'afficher
     qu'un nombre. Voir `lib/chiffresPublics.ts`.

     Les avis approuvés se lisent en base (lecture serveur, jamais côté client :
     voir `lib/avisPublics.ts`). */
  const avis = await resumeAvisPublics();
  return <AccueilClient chiffres={CHIFFRES_PUBLICS} avis={avis} />;
}
