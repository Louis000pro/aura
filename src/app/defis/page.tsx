import type { Metadata } from "next";
import Link from "next/link";
import { PageVitrine } from "@/components/seo/VitrineChrome";
import AnimationExercice, { labelAnimation } from "@/components/exercices/AnimationExercice";
import { mouvements, typo } from "@/lib/classiques";
import { defisPublies, verifierDefis } from "@/lib/defisPublics";
import { VENTE_OUVERTE } from "@/lib/plans";

/* Le hub des défis (« Les classiques » dans l'application). Le nombre se
   lit dans le code : un classique ajouté apparaît ici tout seul, et le
   filet refuse un classique sans page. */

const NB = String.fromCharCode(160);
const LETTRES = ["zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix", "onze", "douze"];

export const metadata: Metadata = {
  title: "Défis sportifs sans classement : les classiques de Vaiiya",
  description:
    "Des défis sportifs à refaire d’un mois sur l’autre pour battre ton score : le Décompte, le Centurion, le max en 12 minutes, la chaise au mur… Sans classement.",
  alternates: { canonical: "https://vaiiya.fr/defis" },
  openGraph: {
    title: "Défis sportifs : les classiques de Vaiiya",
    description: "La même séance, d’un mois sur l’autre, pour battre ton propre score.",
    url: "https://vaiiya.fr/defis",
    images: ["/og-image.png"],
  },
};

export default function DefisPage() {
  const soucis = verifierDefis();
  if (soucis.length) throw new Error(`Défis publics : ${soucis.join(" | ")}`);

  const defis = defisPublies();
  const nombre = LETTRES[defis.length] ?? String(defis.length);

  const filAriane = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: "https://vaiiya.fr" },
      { "@type": "ListItem", position: 2, name: "Défis", item: "https://vaiiya.fr/defis" },
    ],
  };

  return (
    <PageVitrine largeur="max-w-5xl">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(filAriane) }} />

      <section className="mb-12">
        <p className="text-[11px] font-bold tracking-[0.22em] uppercase mb-3" style={{ color: "#A78BFA" }}>
          Les classiques
        </p>
        <h1
          className="font-light leading-[1.08] mb-4"
          style={{ fontSize: "clamp(2.125rem,6vw,2.9rem)", letterSpacing: "-0.01em", color: "#1A1535" }}
        >
          Des défis sportifs à refaire pour battre ton score
        </h1>
        <p className="max-w-[640px] text-[1rem] leading-[1.65]" style={{ color: "#4A5568" }}>
          {typo(`${nombre.charAt(0).toUpperCase()}${nombre.slice(1)} défis, toujours les mêmes : mêmes mouvements, même ordre, même chrono. Tu le refais quelques semaines plus tard, et ton seul adversaire est ton score précédent.`)}
        </p>
      </section>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {defis.map((d, i) => {
          const premier = mouvements(d.c)[0]?.exercice ?? "Burpees";
          return (
            <Link
              key={d.slug}
              href={`/defis/${d.slug}`}
              className="block rounded-3xl p-4 transition-transform hover:-translate-y-0.5"
              style={{ background: "#fff", border: "1px solid rgba(167,139,250,0.16)", boxShadow: "0 6px 24px rgba(90,60,180,0.07)" }}
            >
              <span
                className="flex items-center justify-center rounded-2xl mb-3"
                style={{ height: 124, background: "radial-gradient(circle at 50% 45%, rgba(245,177,32,0.14), rgba(245,177,32,0) 68%)" }}
              >
                <AnimationExercice nom={premier} taille={124} label={labelAnimation(premier)} priorite={i < 4} />
              </span>
              <span className="block text-[16px] font-semibold leading-snug" style={{ color: "#1A1535" }}>{d.c.titre}</span>
              <span className="block mt-1 text-[13px] leading-[1.5]" style={{ color: "#4A5568" }}>{typo(d.c.promesse)}</span>
              <span className="block mt-2 text-[11px] font-semibold" style={{ color: "#8B84A8" }}>
                {d.c.minutes}{NB}min{d.c.ouvert || VENTE_OUVERTE ? "" : " · Bientôt Vaiiya+"}
              </span>
            </Link>
          );
        })}
      </div>

      <section className="mt-14 grid gap-5 md:grid-cols-3">
        {[
          { t: "Toujours la même séance", d: "Mêmes mouvements, même ordre : ton score se compare d’une fois sur l’autre." },
          { t: "Un seul chiffre à la fin", d: "Un temps, des tours, des répétitions ou une tenue, selon le défi." },
          { t: "Aucun classement", d: "Tu essaies de battre ton meilleur score, jamais celui de quelqu’un d’autre." },
        ].map((x) => (
          <div
            key={x.t}
            className="rounded-3xl p-6"
            style={{ background: "rgba(255,255,255,0.72)", border: "1px solid rgba(167,139,250,0.16)" }}
          >
            <p className="text-[16px] font-semibold mb-1.5" style={{ color: "#1A1535" }}>{x.t}</p>
            <p className="text-[13px] leading-[1.6]" style={{ color: "#4A5568" }}>{typo(x.d)}</p>
          </div>
        ))}
      </section>

      <p className="mt-10 text-[1rem] leading-[1.65] max-w-[640px]" style={{ color: "#4A5568" }}>
        Tu cherches plutôt un chemin sur plusieurs semaines&nbsp;? Va voir{" "}
        <Link href="/programmes" className="font-semibold hover:underline" style={{ color: "#7C5CFA" }}>
          les programmes
        </Link>
        , ou la technique de chaque mouvement dans{" "}
        <Link href="/exercices" className="font-semibold hover:underline" style={{ color: "#7C5CFA" }}>
          les fiches d’exercices
        </Link>
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
          Relève un défi avec Vaiiya
        </h2>
        <p className="text-[16px] mb-6 mx-auto max-w-[460px]" style={{ color: "#4A5568" }}>
          Crée ton compte gratuit&nbsp;: le chrono tourne, les répétitions se comptent, et ton meilleur score est gardé.
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
