import type { Metadata } from "next";

/** Métadonnées de /confidentialite (la page est un composant client). */
export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description:
    "Quelles données Vaiiya collecte, pourquoi, combien de temps elles sont conservées et comment exercer tes droits.",
  alternates: { canonical: "https://vaiiya.fr/confidentialite" },
};

export default function ConfidentialiteLayout({ children }: { children: React.ReactNode }) {
  return children;
}
