import type { Metadata } from "next";
import AccueilClient from "./AccueilClient";

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
  return <AccueilClient />;
}
