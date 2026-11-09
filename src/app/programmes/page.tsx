import type { Metadata } from "next";
import Link from "next/link";
import { PageVitrine } from "@/components/seo/VitrineChrome";
import { PROGRAMMES_PUBLICS } from "@/lib/chiffresPublics";
import { nbCreneaux, typoParcours } from "@/lib/parcours";
import { programmesPublies, verifierProgrammes } from "@/lib/programmesPublics";

/* Le hub des programmes : les huit, avec leur photo, leur durée et leur
   lieu. Les chiffres se lisent dans le code (`PROGRAMMES_PUBLICS`), jamais
   écrits à la main. */

const NB = String.fromCharCode(160);

export const metadata: Metadata = {
  title: "Programmes de musculation de 4 à 8 semaines",
  description:
    "Huit programmes écrits par Vaiiya, de 4 à 8 semaines : première traction, cent pompes, force 5 × 5, fessiers, abdos, reprise du sport. Un test au départ, le même à la fin.",
  alternates: { canonical: "https://vaiiya.fr/programmes" },
  openGraph: {
    title: "Programmes de musculation de 4 à 8 semaines",
    description: "Huit programmes avec un test au départ et le même à la fin, sur les jours que tu choisis.",
    url: "https://vaiiya.fr/programmes",
    images: ["/og-image.png"],
  },
};

export default function ProgrammesPage() {
  const soucis = verifierProgrammes();
  if (soucis.length) throw new Error(`Programmes publics : ${soucis.join(" | ")}`);

  const programmes = programmesPublies();
  const { nombre, semainesMin, semainesMax } = PROGRAMMES_PUBLICS;

  const filAriane = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: "https://vaiiya.fr" },
      { "@type": "ListItem", position: 2, name: "Programmes", item: "https://vaiiya.fr/programmes" },
    ],
  };

  return (
    <PageVitrine largeur="max-w-5xl">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(filAriane) }} />

      <section className="mb-12">
        <p className="text-[11px] font-bold tracking-[0.22em] uppercase mb-3" style={{ color: "#A78BFA" }}>
          Les programmes
        </p>
        <h1
          className="font-light leading-[1.08] mb-4"
          style={{ fontSize: "clamp(2.125rem,6vw,2.9rem)", letterSpacing: "-0.01em", color: "#1A1535" }}
        >
          Des programmes de musculation de {semainesMin} à {semainesMax}{NB}semaines
        </h1>
        <p className="max-w-[640px] text-[1rem] leading-[1.65]" style={{ color: "#4A5568" }}>
          {nombre}{NB}programmes écrits par Vaiiya, chacun pour un but précis. Tu choisis tes jours, un test
          ouvre le programme, et le même test le referme&nbsp;: c’est ton propre chiffre qui dit le chemin
          parcouru.
        </p>
      </section>

      <section>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {programmes.map((p, i) => (
            <Link
              key={p.slug}
              href={`/programmes/${p.slug}`}
              className="block rounded-3xl overflow-hidden transition-transform hover:-translate-y-0.5"
              style={{ background: "#fff", border: "1px solid rgba(167,139,250,0.16)", boxShadow: "0 6px 24px rgba(90,60,180,0.07)" }}
            >
              <span className="relative block overflow-hidden" style={{ aspectRatio: "4 / 3", background: "#1A1424" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/entrainement/${p.photo}.webp`}
                  alt=""
                  width={750}
                  height={1000}
                  loading={i < 4 ? "eager" : "lazy"}
                  className="absolute inset-0 w-full h-full"
                  style={{ objectFit: "cover", objectPosition: p.pos ?? "50% 50%" }}
                />
              </span>
              <span className="block p-4">
                <span className="block text-[16px] font-semibold leading-snug" style={{ color: "#1A1535" }}>
                  {p.def.titre}
                </span>
                <span className="block mt-1 text-[13px]" style={{ color: "#8B84A8" }}>
                  {p.def.semaines}{NB}semaines · {nbCreneaux(p.def)}{NB}séances
                </span>
                <span className="block mt-2 text-[13px] leading-[1.55]" style={{ color: "#4A5568" }}>
                  {typoParcours(p.def.accroche)}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-14 grid gap-5 md:grid-cols-3">
        {[
          { t: "Un test au départ", d: "Le programme commence par une mesure simple : des répétitions, une tenue ou une charge." },
          { t: "Tes jours, ton rythme", d: "Les séances se posent sur les jours que tu choisis. Une séance manquée glisse au prochain jour libre." },
          { t: "Le même test à la fin", d: "Tu refais exactement la même mesure. Personne d’autre n’entre dans la comparaison." },
        ].map((c) => (
          <div
            key={c.t}
            className="rounded-3xl p-6"
            style={{ background: "rgba(255,255,255,0.72)", border: "1px solid rgba(167,139,250,0.16)" }}
          >
            <p className="text-[16px] font-semibold mb-1.5" style={{ color: "#1A1535" }}>{c.t}</p>
            <p className="text-[13px] leading-[1.6]" style={{ color: "#4A5568" }}>{typoParcours(c.d)}</p>
          </div>
        ))}
      </section>

      <p className="mt-10 text-[1rem] leading-[1.65] max-w-[640px]" style={{ color: "#4A5568" }}>
        Plutôt une semaine type que tu composes toi-même&nbsp;? Lis{" "}
        <Link href="/programme-musculation-3-fois-par-semaine" className="font-semibold hover:underline" style={{ color: "#7C5CFA" }}>
          comment organiser trois séances par semaine
        </Link>
        , ou va voir{" "}
        <Link href="/defis" className="font-semibold hover:underline" style={{ color: "#7C5CFA" }}>
          les défis
        </Link>{" "}
        à refaire d’un mois sur l’autre.
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
          Commence un programme dans Vaiiya
        </h2>
        <p className="text-[16px] mb-6 mx-auto max-w-[460px]" style={{ color: "#4A5568" }}>
          Crée ton compte gratuit, choisis un programme et tes jours&nbsp;: les séances se lancent guidées,
          mouvement par mouvement.
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
