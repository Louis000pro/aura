import type { Metadata } from "next";
import Link from "next/link";
import { PageVitrine } from "@/components/seo/VitrineChrome";
import { COURS, NOM_FORMAT, themesAvecCours, typoCours } from "@/lib/coursNutrition";

/* Le sommaire des cours de nutrition : un cadre par thème, comme dans
   l'application. Les cours gratuits se lisent en entier, les cours Vaiiya+
   en aperçu. Les nombres se comptent dans le code. */

const NB = String.fromCharCode(160);

export const metadata: Metadata = {
  title: "Cours de nutrition : courts, simples et sourcés",
  description:
    "Des cours de nutrition courts et sourcés : protéines, glucides, créatine, whey, perdre du poids, jeûne intermittent, idées reçues. Chaque cours cite ses sources.",
  alternates: { canonical: "https://vaiiya.fr/cours-nutrition" },
  openGraph: {
    title: "Cours de nutrition : courts, simples et sourcés",
    description: "Comprendre ce qu’on mange, en deux à cinq minutes, avec les sources.",
    url: "https://vaiiya.fr/cours-nutrition",
    images: ["/og-image.png"],
  },
};

export default function CoursNutritionPage() {
  const themes = themesAvecCours(COURS);
  const gratuits = COURS.filter((c) => c.acces === "gratuit").length;

  const filAriane = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: "https://vaiiya.fr" },
      { "@type": "ListItem", position: 2, name: "Cours de nutrition", item: "https://vaiiya.fr/cours-nutrition" },
    ],
  };

  return (
    <PageVitrine largeur="max-w-5xl">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(filAriane) }} />

      <section className="mb-12">
        <p className="text-[11px] font-bold tracking-[0.22em] uppercase mb-3" style={{ color: "#A78BFA" }}>
          Comprendre la nutrition
        </p>
        <h1
          className="font-light leading-[1.08] mb-4"
          style={{ fontSize: "clamp(2.125rem,6vw,2.9rem)", letterSpacing: "-0.01em", color: "#1A1535" }}
        >
          {COURS.length}{NB}cours de nutrition, courts et sourcés
        </h1>
        <p className="max-w-[640px] text-[1rem] leading-[1.65]" style={{ color: "#4A5568" }}>
          {typoCours(
            `Chaque cours répond à une question en deux à cinq minutes, avec les sources qu'il cite : recommandations officielles, études, tables de composition. ${gratuits} se lisent en entier ici, les autres en aperçu.`,
          )}
        </p>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        {themes.map((t) => (
          <section
            key={t.id}
            className="rounded-3xl overflow-hidden"
            style={{ background: "#fff", border: "1px solid rgba(167,139,250,0.16)", boxShadow: "0 6px 24px rgba(90,60,180,0.06)" }}
          >
            <h2 className="px-5 pt-5 pb-3 text-[1.25rem] font-medium" style={{ color: "#2D2150" }}>
              {t.nom}
            </h2>
            <ul className="list-none p-0 m-0">
              {t.cours.map((c) => (
                <li key={c.id} style={{ borderTop: "1px solid rgba(167,139,250,0.12)" }}>
                  <Link href={`/cours-nutrition/${c.id}`} className="block px-5 py-3 hover:bg-[rgba(139,92,246,0.04)]">
                    <span className="block text-[1rem] font-semibold leading-snug" style={{ color: "#1A1535" }}>
                      {typoCours(c.titre)}
                    </span>
                    <span className="block mt-0.5 text-[13px]" style={{ color: "#8B84A8" }}>
                      {NOM_FORMAT[c.format].titre}
                      {c.acces === "gratuit" ? "" : " Vaiiya+ · aperçu"} · {c.minutes}{NB}min
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <p className="mt-10 text-[1rem] leading-[1.65] max-w-[640px]" style={{ color: "#4A5568" }}>
        Pour passer à la cuisine, les{" "}
        <Link href="/recettes" className="font-semibold hover:underline" style={{ color: "#7C5CFA" }}>
          recettes
        </Link>{" "}
        donnent leurs calories et leurs protéines par portion.
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
          Ces cours, à côté de ton journal de repas
        </h2>
        <p className="text-[16px] mb-6 mx-auto max-w-[480px]" style={{ color: "#4A5568" }}>
          Avec ton compte gratuit, Vaiiya garde les cours que tu as lus et te propose des recettes qui vont avec.
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
