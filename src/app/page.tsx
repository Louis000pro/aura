import type { Metadata } from "next";
import AccueilClient from "./AccueilClient";
import { CHIFFRES_PUBLICS } from "@/lib/chiffresPublics";

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

export default function Page() {
  /* Les chiffres de la landing sont comptés ici, côté serveur, et descendus en
     props. Les importer directement dans `LandingStory` (composant client)
     enverrait au navigateur le texte intégral des 26 mini-cours pour n'afficher
     qu'un nombre. Voir `lib/chiffresPublics.ts`. */
  return <AccueilClient chiffres={CHIFFRES_PUBLICS} />;
}
