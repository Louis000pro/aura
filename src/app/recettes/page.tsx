import type { Metadata } from "next";
import Link from "next/link";
import { PageVitrine } from "@/components/seo/VitrineChrome";
import { natureDe } from "@/lib/collectionsRecettes";
import { NATURES, dureeDite, recettesPubliees, typoFr } from "@/lib/recettesPubliques";

/* Le hub des recettes : toute la banque, rangée par nature (petits-déjeuners,
   plats, entrées, encas, desserts, boissons). Le nombre se compte dans le
   code, jamais écrit à la main. */

const NB = String.fromCharCode(160);

export const metadata: Metadata = {
  title: "Recettes avec calories et protéines par portion",
  description:
    "Des recettes avec leurs calories et leurs protéines par portion : petits-déjeuners, plats, salades, encas, desserts et shakers. Ingrédients et étapes, lisibles sans compte.",
  alternates: { canonical: "https://vaiiya.fr/recettes" },
  openGraph: {
    title: "Recettes avec calories et protéines par portion",
    description: "Petits-déjeuners, plats, salades, encas, desserts et shakers, avec leurs valeurs par portion.",
    url: "https://vaiiya.fr/recettes",
    images: ["/og-image.png"],
  },
};

export default function RecettesPage() {
  const recettes = recettesPubliees();
  const parNature = NATURES.map((n) => ({ ...n, recettes: recettes.filter((r) => natureDe(r) === n.id) })).filter(
    (n) => n.recettes.length > 0,
  );

  const filAriane = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: "https://vaiiya.fr" },
      { "@type": "ListItem", position: 2, name: "Recettes", item: "https://vaiiya.fr/recettes" },
    ],
  };

  return (
    <PageVitrine largeur="max-w-5xl">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(filAriane) }} />

      <section className="mb-10">
        <p className="text-[11px] font-bold tracking-[0.22em] uppercase mb-3" style={{ color: "#A78BFA" }}>
          Les recettes
        </p>
        <h1
          className="font-light leading-[1.08] mb-4"
          style={{ fontSize: "clamp(2.125rem,6vw,2.9rem)", letterSpacing: "-0.01em", color: "#1A1535" }}
        >
          {recettes.length}{NB}recettes, avec leurs calories et leurs protéines
        </h1>
        <p className="max-w-[640px] text-[1rem] leading-[1.65]" style={{ color: "#4A5568" }}>
          Chaque recette donne ses ingrédients, ses étapes, son temps et ses valeurs pour une portion,
          calculées à partir des ingrédients. Dans Vaiiya, elle s’ajoute à ton journal d’un geste.
        </p>
        <nav aria-label="Aller à une catégorie" className="mt-6 flex flex-wrap gap-2">
          {parNature.map((n) => (
            <a
              key={n.id}
              href={`#${n.id}`}
              className="px-3.5 py-2 rounded-full text-[13px] font-semibold"
              style={{ border: "1px solid rgba(139,92,246,0.28)", color: "#6B46C1", background: "#fff" }}
            >
              {n.titre} · {n.recettes.length}
            </a>
          ))}
        </nav>
      </section>

      <div className="flex flex-col gap-12">
        {parNature.map((n, iNature) => (
          <section key={n.id} id={n.id} style={{ scrollMarginTop: 24 }}>
            <h2 className="mb-5 text-[1.625rem] font-medium" style={{ color: "#2D2150" }}>
              {n.titre}
            </h2>
            <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
              {n.recettes.map((r, i) => (
                <Link
                  key={r.id}
                  href={`/recettes/${r.id}`}
                  className="block rounded-3xl overflow-hidden transition-transform hover:-translate-y-0.5"
                  style={{ background: "#fff", border: "1px solid rgba(167,139,250,0.16)", boxShadow: "0 6px 24px rgba(90,60,180,0.07)" }}
                >
                  <span className="relative block" style={{ aspectRatio: "1 / 1", background: "#EEE8F8" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={r.image}
                      alt=""
                      width={400}
                      height={400}
                      loading={iNature === 0 && i < 4 ? "eager" : "lazy"}
                      className="absolute inset-0 w-full h-full"
                      style={{ objectFit: "cover" }}
                    />
                  </span>
                  <span className="block p-3.5">
                    <span className="block text-[15px] font-semibold leading-snug" style={{ color: "#1A1535" }}>{r.nom}</span>
                    <span className="block mt-1 text-[13px]" style={{ color: "#8B84A8" }}>
                      {typoFr(dureeDite(r))} · {r.calories}{NB}kcal · {r.proteins}{NB}g de protéines
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>

      <section
        className="mt-16 rounded-3xl px-7 py-10 text-center"
        style={{
          background: "linear-gradient(135deg,rgba(212,192,255,0.55),rgba(245,230,163,0.45))",
          border: "1px solid rgba(255,255,255,0.9)",
          boxShadow: "0 12px 40px rgba(167,139,250,0.18)",
        }}
      >
        <h2 className="text-[26px] font-light mb-2" style={{ color: "#1A1535" }}>
          Toutes ces recettes, dans ta poche
        </h2>
        <p className="text-[16px] mb-6 mx-auto max-w-[480px]" style={{ color: "#4A5568" }}>
          Avec ton compte gratuit, Vaiiya te propose une idée selon l’heure et tes envies, et note le repas d’un geste.
        </p>
        <Link
          href="/premiers-pas"
          className="inline-block px-7 py-3.5 rounded-2xl text-[16px] font-semibold"
          style={{ background: "linear-gradient(135deg,#A78BFA,#D4A843)", color: "#fff", boxShadow: "0 6px 24px rgba(167,139,250,0.4)" }}
        >
          Créer mon compte gratuit →
        </Link>
      </section>
    </PageVitrine>
  );
}
