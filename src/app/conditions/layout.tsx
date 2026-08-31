import type { Metadata } from "next";

/** Métadonnées de /conditions (la page est un composant client). */
export const metadata: Metadata = {
  title: "Conditions générales",
  description:
    "Conditions générales d’utilisation et de vente de Vaiiya : usage du service, abonnement, résiliation, rétractation et usage raisonnable de l’assistant.",
  alternates: { canonical: "https://vaiiya.fr/conditions" },
};

export default function ConditionsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
