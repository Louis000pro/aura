import Link from "next/link";
import { SEO_PAGES } from "@/lib/seoPages";
import { VitrineHeader, VitrinePied } from "./VitrineChrome";

/**
 * Shell vitrine SSR (Server Component) pour les pages SEO publiques.
 * Tout le texte est rendu côté serveur → crawlable par Google.
 * Pas de "use client" : ces pages doivent rester 100% statiques pour le référencement.
 *
 * La liste des pages vit dans `lib/seoPages.ts` : le pied de page de la landing
 * la lit aussi, pour que ces pages cessent d'être une île qui ne se lie qu'à
 * elle-même.
 */
export { SEO_PAGES };

export default function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      /* Aucune réserve pour le rail : il n'y en a pas sur une vitrine. */
      className="min-h-screen w-full"
      style={{ background: "linear-gradient(180deg,#faf8ff 0%,#fffef8 100%)" }}
    >
      <div className="mx-auto max-w-3xl px-5 pt-10 pb-28" style={{ paddingTop: "calc(env(safe-area-inset-top) + 28px)" }}>
        {/* En-tête : logo + CTA connexion */}
        <VitrineHeader />

        {/* Contenu de l'article (H1, H2, texte…) */}
        <article className="seo-article">{children}</article>

        {/* CTA de conversion */}
        <section
          className="mt-14 rounded-3xl px-7 py-10 text-center"
          style={{ background: "linear-gradient(135deg,rgba(212,192,255,0.55),rgba(245,230,163,0.45))", border: "1px solid rgba(255,255,255,0.9)", boxShadow: "0 12px 40px rgba(167,139,250,0.18)" }}
        >
          <h2 className="text-2xl font-light mb-2" style={{ color: "#1A1535" }}>Commence gratuitement avec Vaiiya</h2>
          {/* L'ancienne phrase promettait « tes programmes de musculation et ton
              suivi nutrition personnalisés en 2 minutes » : un programme au
              pluriel qu'on ne construit pas, et une personnalisation complète en
              deux minutes que personne ne peut tenir. Le compte gratuit et la
              première séance suffisent à donner envie, et ils sont vrais. */}
          <p className="text-sm mb-6" style={{ color: "#4A5568" }}>
            Compte gratuit, sans carte bancaire. Ta première séance guidée dès l&apos;inscription.
          </p>
          <Link
            href="/auth"
            className="inline-block px-7 py-3.5 rounded-2xl text-sm font-semibold"
            style={{ background: "linear-gradient(135deg,#A78BFA,#D4A843)", color: "#fff", boxShadow: "0 6px 24px rgba(167,139,250,0.4)" }}
          >
            Créer mon compte gratuit →
          </Link>
        </section>

        {/* Maillage interne : liens vers les autres pages SEO */}
        <VitrinePied />
      </div>
    </div>
  );
}
