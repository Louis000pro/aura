import type { Metadata } from "next";
import Link from "next/link";
import { PageVitrine } from "@/components/seo/VitrineChrome";
import CarteExercice from "@/components/exercices/CarteExercice";
import { fichesPubliees, fichesAVenir, verifierFiches } from "@/lib/exercicesPublics";
import { EXERCISE_LIBRARY, estAnime } from "@/lib/exerciseLibrary";

export const metadata: Metadata = {
  title: "Exercices de musculation : la bibliothèque animée",
  description:
    "Chaque exercice de musculation montré en mouvement, avec les muscles travaillés, la technique et les erreurs à éviter. Fiches claires, sans jargon.",
  alternates: { canonical: "https://vaiiya.fr/exercices" },
  openGraph: {
    title: "Exercices de musculation, montrés en mouvement",
    description:
      "Les exercices de musculation expliqués et animés : technique, muscles travaillés, erreurs fréquentes.",
    url: "https://vaiiya.fr/exercices",
    images: ["/og-image.png"],
  },
};

/* Le nombre de mouvements animés réellement livrés. Il n'est pas écrit à
   la main : une promesse chiffrée qui se périme est pire que pas de
   chiffre du tout, et celui-ci est vérifiable à chaque construction. */
const NB_ANIMES = EXERCISE_LIBRARY.filter((e) => estAnime(e.name)).length;

export default function ExercicesPage() {
  /* Un nom mal orthographié, un slug en double : ces fautes ne se voient
     pas à l'écran, elles produisent une page à moitié vide. On les fait
     donc échouer bruyamment à la construction. */
  const soucis = verifierFiches();
  if (soucis.length) throw new Error(`Fiches d'exercices : ${soucis.join(" | ")}`);

  const publiees = fichesPubliees();
  const aVenir = fichesAVenir();

  const filAriane = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: "https://vaiiya.fr" },
      { "@type": "ListItem", position: 2, name: "Exercices", item: "https://vaiiya.fr/exercices" },
    ],
  };

  return (
    <PageVitrine largeur="max-w-5xl">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(filAriane) }}
      />

      {/* ── Ouverture ────────────────────────────────────────────── */}
      <section className="mb-12">
        <p className="text-[11px] font-bold tracking-[0.22em] uppercase mb-3" style={{ color: "#A78BFA" }}>
          La bibliothèque
        </p>
        <h1
          className="font-light leading-[1.08] mb-4"
          style={{ fontSize: "clamp(2rem,6vw,2.9rem)", letterSpacing: "-0.01em", color: "#1A1535" }}
        >
          Les exercices de musculation, montrés en mouvement
        </h1>
        <p className="max-w-[640px] text-[1.05rem] leading-[1.65]" style={{ color: "#4A5568" }}>
          Un exercice se comprend en le voyant, pas en lisant sa description. Chaque fiche part
          donc du geste animé, puis dit l&apos;essentiel : les muscles qui travaillent, comment
          exécuter le mouvement, et les erreurs qui coûtent cher. Rien à installer, rien à créer.
        </p>
      </section>

      {/* ── Les fiches ───────────────────────────────────────────── */}
      <section>
        <h2 className="text-[1.35rem] font-medium mb-1" style={{ color: "#2D2150" }}>
          Les fiches disponibles
        </h2>
        <p className="text-sm mb-6" style={{ color: "#8B84A8" }}>
          Nous ouvrons la bibliothèque exercice par exercice, en écrivant chaque fiche à la main.
        </p>

        {/* Les fiches rédigées d'abord, celles à venir ensuite. Les quatre
            premières cartes sont prioritaires : ce sont elles qu'on voit
            en arrivant, et une grille qui s'ouvre sur des cases vides
            annulerait tout l'intérêt de la page. */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          {[
            ...publiees.map((f) => ({ cle: f.slug, lib: f.lib, href: `/exercices/${f.slug}` })),
            ...aVenir.map(({ fiche, lib }) => ({ cle: fiche.slug, lib, href: undefined })),
          ].map((c, i) => (
            <CarteExercice key={c.cle} lib={c.lib} href={c.href} priorite={i < 4} />
          ))}
        </div>
      </section>

      {/* ── Ce qui distingue ces fiches ──────────────────────────── */}
      <section className="mt-14 grid gap-5 md:grid-cols-3">
        {[
          {
            t: "Le geste avant le texte",
            d: `Nos ${NB_ANIMES} mouvements ont leur personnage animé, dessiné pour Vaiiya. Il rejoue le geste, pose après pose.`,
          },
          {
            t: "Ce qu'il faut savoir, pas plus",
            d: "Le placement, l'exécution, les deux erreurs qui reviennent le plus. Pas de remplissage pour faire long.",
          },
          {
            t: "Utile sans compte",
            d: "Tout est lisible tout de suite. Vaiiya sert à construire la séance autour, si tu en as envie.",
          },
        ].map((c) => (
          <div
            key={c.t}
            className="rounded-3xl p-6"
            style={{ background: "rgba(255,255,255,0.72)", border: "1px solid rgba(167,139,250,0.16)" }}
          >
            <p className="text-[15px] font-semibold mb-1.5" style={{ color: "#1A1535" }}>{c.t}</p>
            <p className="text-[14px] leading-[1.6]" style={{ color: "#4A5568" }}>{c.d}</p>
          </div>
        ))}
      </section>

      {/* ── CTA, une seule fois, après avoir donné quelque chose ─── */}
      <section
        className="mt-14 rounded-3xl px-7 py-10 text-center"
        style={{
          background: "linear-gradient(135deg,rgba(212,192,255,0.55),rgba(245,230,163,0.45))",
          border: "1px solid rgba(255,255,255,0.9)",
          boxShadow: "0 12px 40px rgba(167,139,250,0.18)",
        }}
      >
        <h2 className="text-2xl font-light mb-2" style={{ color: "#1A1535" }}>
          Une séance construite autour de ces mouvements
        </h2>
        <p className="text-sm mb-6 mx-auto max-w-[460px]" style={{ color: "#4A5568" }}>
          Dis à Vaiiya ton matériel et ton niveau, il compose la séance et te guide pendant
          l&apos;effort, avec ces mêmes personnages.
        </p>
        <Link
          href="/auth"
          className="inline-block px-7 py-3.5 rounded-2xl text-sm font-semibold"
          style={{
            background: "linear-gradient(135deg,#A78BFA,#D4A843)",
            color: "#fff",
            boxShadow: "0 6px 24px rgba(167,139,250,0.4)",
          }}
        >
          Créer mon compte gratuit →
        </Link>
      </section>
    </PageVitrine>
  );
}
