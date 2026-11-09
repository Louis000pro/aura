import type { Metadata } from "next";
import Link from "next/link";
import { PageVitrine } from "@/components/seo/VitrineChrome";
import { typoCours } from "@/lib/coursNutrition";
import { conseilsParTheme, conseilsPublies, slugConseil } from "@/lib/conseilsPublics";

/* Le sommaire des mini-cours d'entraînement, par thème. Les nombres se
   comptent dans le code. */

const NB = String.fromCharCode(160);

export const metadata: Metadata = {
  title: "Conseils d’entraînement : des mini-cours de 3 à 5 minutes",
  description:
    "Des mini-cours d’entraînement simples et sourcés : séries et répétitions, récupération, courbatures, échauffement, régularité, sommeil. Chacun finit par une règle à retenir.",
  alternates: { canonical: "https://vaiiya.fr/conseils" },
  openGraph: {
    title: "Conseils d’entraînement : des mini-cours de 3 à 5 minutes",
    description: "S’entraîner, progresser, récupérer : l’essentiel en quelques minutes, avec un exemple concret.",
    url: "https://vaiiya.fr/conseils",
    images: ["/og-image.png"],
  },
};

export default function ConseilsPage() {
  const tous = conseilsPublies();
  const gratuits = tous.filter((a) => a.access === "free").length;
  const themes = conseilsParTheme();

  const filAriane = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: "https://vaiiya.fr" },
      { "@type": "ListItem", position: 2, name: "Conseils", item: "https://vaiiya.fr/conseils" },
    ],
  };

  return (
    <PageVitrine largeur="max-w-5xl">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(filAriane) }} />

      <section className="mb-12">
        <p className="text-[11px] font-bold tracking-[0.22em] uppercase mb-3" style={{ color: "#A78BFA" }}>
          Conseils et progresser
        </p>
        <h1
          className="font-light leading-[1.08] mb-4"
          style={{ fontSize: "clamp(2.125rem,6vw,2.9rem)", letterSpacing: "-0.01em", color: "#1A1535" }}
        >
          {tous.length}{NB}mini-cours pour s’entraîner et progresser
        </h1>
        <p className="max-w-[640px] text-[1rem] leading-[1.65]" style={{ color: "#4A5568" }}>
          {typoCours(
            `Chacun se lit en trois à cinq minutes, avec un exemple concret, une règle à retenir et une chose à essayer. ${gratuits} se lisent en entier ici, les autres en aperçu.`,
          )}
        </p>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        {themes.map((g) => (
          <section
            key={g.theme}
            className="rounded-3xl overflow-hidden"
            style={{ background: "#fff", border: "1px solid rgba(167,139,250,0.16)", boxShadow: "0 6px 24px rgba(90,60,180,0.06)" }}
          >
            <h2 className="px-5 pt-5 pb-3 text-[1.25rem] font-medium" style={{ color: "#2D2150" }}>{g.theme}</h2>
            <ul className="list-none p-0 m-0">
              {g.articles.map((a) => (
                <li key={a.id} style={{ borderTop: "1px solid rgba(167,139,250,0.12)" }}>
                  <Link href={`/conseils/${slugConseil(a)}`} className="block px-5 py-3 hover:bg-[rgba(139,92,246,0.04)]">
                    <span className="block text-[1rem] font-semibold leading-snug" style={{ color: "#1A1535" }}>{typoCours(a.title)}</span>
                    <span className="block mt-0.5 text-[13px]" style={{ color: "#8B84A8" }}>
                      {a.readingMinutes}{NB}min{a.access === "free" ? "" : " · Vaiiya+ · aperçu"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <p className="mt-10 text-[1rem] leading-[1.65] max-w-[640px]" style={{ color: "#4A5568" }}>
        Pour mettre ces conseils en pratique, choisis une{" "}
        <Link href="/seances" className="font-semibold hover:underline" style={{ color: "#7C5CFA" }}>séance guidée</Link>{" "}
        ou un{" "}
        <Link href="/programmes" className="font-semibold hover:underline" style={{ color: "#7C5CFA" }}>programme</Link>
        .
      </p>

      <section
        className="mt-14 rounded-3xl px-7 py-10 text-center"
        style={{
          background: "linear-gradient(135deg,rgba(212,192,255,0.55),rgba(245,230,163,0.45))",
          border: "1px solid rgba(255,255,255,0.9)",
          boxShadow: "0 12px 40px rgba(167,139,250,0.18)",
        }}
      >
        <h2 className="text-[26px] font-light mb-2" style={{ color: "#1A1535" }}>
          Lis, puis entraîne-toi
        </h2>
        <p className="text-[16px] mb-6 mx-auto max-w-[460px]" style={{ color: "#4A5568" }}>
          Avec ton compte gratuit, les mini-cours sont à côté des séances guidées et du coach IA.
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
