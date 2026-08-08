import type { Metadata } from "next";

/** Métadonnées de /mentions-legales (la page est un composant client). */
export const metadata: Metadata = {
  title: "Mentions légales",
  description:
    "Éditeur, hébergeur et informations légales du site Vaiiya.",
  alternates: { canonical: "https://vaiiya.fr/mentions-legales" },
};

export default function MentionsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
