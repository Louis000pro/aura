import Link from "next/link";
import { SEO_PAGES } from "@/lib/seoPages";

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
      className="min-h-screen w-full md:pl-[88px]"
      style={{ background: "linear-gradient(180deg,#faf8ff 0%,#fffef8 100%)" }}
    >
      <div className="mx-auto max-w-3xl px-5 pt-10 pb-28" style={{ paddingTop: "calc(env(safe-area-inset-top) + 28px)" }}>
        {/* En-tête : logo + CTA connexion */}
        <header className="flex items-center justify-between mb-10">
          <Link href="/" className="flex items-center gap-2.5" aria-label="Accueil Vaiiya">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/icon-192.png" alt="Logo Vaiiya" width={36} height={36} className="rounded-xl" />
            <span className="text-lg font-light tracking-[0.18em]" style={{ color: "#1A1535" }}>VAIIYA</span>
          </Link>
          <Link
            href="/auth"
            className="px-4 py-2 rounded-full text-[13px] font-semibold"
            style={{ background: "linear-gradient(135deg,#A78BFA,#D4A843)", color: "#fff", boxShadow: "0 4px 16px rgba(167,139,250,0.32)" }}
          >
            Créer mon compte
          </Link>
        </header>

        {/* Contenu de l'article (H1, H2, texte…) */}
        <article className="seo-article">{children}</article>

        {/* CTA de conversion */}
        <section
          className="mt-14 rounded-3xl px-7 py-10 text-center"
          style={{ background: "linear-gradient(135deg,rgba(212,192,255,0.55),rgba(245,230,163,0.45))", border: "1px solid rgba(255,255,255,0.9)", boxShadow: "0 12px 40px rgba(167,139,250,0.18)" }}
        >
          <h2 className="text-2xl font-light mb-2" style={{ color: "#1A1535" }}>Commence gratuitement avec Vaiiya</h2>
          <p className="text-sm mb-6" style={{ color: "#4A5568" }}>
            Ton coach IA, tes programmes de musculation et ton suivi nutrition — personnalisés en 2 minutes.
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
        <nav className="mt-12 pt-8 border-t" style={{ borderColor: "rgba(167,139,250,0.18)" }} aria-label="Pages Vaiiya">
          <p className="text-[11px] font-bold tracking-[0.2em] uppercase mb-4" style={{ color: "#A78BFA" }}>Explorer</p>
          <ul className="flex flex-wrap gap-x-5 gap-y-2.5">
            {SEO_PAGES.map((p) => (
              <li key={p.href}>
                <Link href={p.href} className="text-sm font-medium hover:underline" style={{ color: "#6B5BA0" }}>
                  {p.label}
                </Link>
              </li>
            ))}
            <li><Link href="/premium" className="text-sm font-medium hover:underline" style={{ color: "#6B5BA0" }}>Vaiiya Premium</Link></li>
          </ul>
          <p className="mt-8 text-[11px]" style={{ color: "#A0AEC0" }}>
            © {new Date().getFullYear()} Vaiiya ·{" "}
            <Link href="/mentions-legales" className="hover:underline">Mentions légales</Link> ·{" "}
            <Link href="/confidentialite" className="hover:underline">Confidentialité</Link>
          </p>
        </nav>
      </div>
    </div>
  );
}
