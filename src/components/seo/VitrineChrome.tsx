import Link from "next/link";
import { SEO_PAGES } from "@/lib/seoPages";

/* ════════════════════════════════════════════════════════════════════
   L'en-tête et le pied de page des pages publiques.

   Ils vivaient dans `MarketingShell`, donc seules les pages qui passent
   par ce gabarit pouvaient les avoir. Les fiches d'exercices ne peuvent
   pas passer par lui : il impose une colonne de 768 px et le style
   d'article `.seo-article`, alors qu'une fiche est une affiche avant
   d'être un texte. Sans extraction, on recopiait un logo et un pied de
   page, et les deux divergeaient à la première retouche.

   Ici, rien n'est nouveau : c'est exactement le même balisage, déplacé.
   ════════════════════════════════════════════════════════════════════ */

export function VitrineHeader() {
  return (
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
  );
}

export function VitrinePied() {
  return (
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
  );
}

/** Le fond et la colonne des pages publiques. `largeur` est la seule
    différence entre un article vitrine (colonne étroite, lisible) et une
    fiche d'exercice (plus large, parce qu'elle a une grille et un héros
    en deux colonnes). Le corps de texte d'une fiche, lui, se borne à
    lui-même : la page peut être large sans que les lignes le soient. */
export function PageVitrine({
  largeur = "max-w-3xl",
  children,
}: {
  largeur?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="min-h-screen w-full md:pl-[88px]"
      style={{ background: "linear-gradient(180deg,#faf8ff 0%,#fffef8 100%)" }}
    >
      <div className={`mx-auto ${largeur} px-5 pt-10 pb-28`} style={{ paddingTop: "calc(env(safe-area-inset-top) + 28px)" }}>
        <VitrineHeader />
        {children}
        <VitrinePied />
      </div>
    </div>
  );
}
