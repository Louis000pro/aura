import type { Metadata } from "next";
import { Fragment } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageVitrine } from "@/components/seo/VitrineChrome";
import AnimationExercice, { labelAnimation } from "@/components/exercices/AnimationExercice";
import { slugDeLExercice } from "@/lib/exercicesPublics";
import { VENTE_OUVERTE } from "@/lib/plans";
import {
  SEANCES, capitale, nbCreneaux, planSemaines, semainesDites, typoParcours, type DefParcours,
} from "@/lib/parcours";
import { programmeParSlug, programmesPublies, verifierProgrammes } from "@/lib/programmesPublics";

/* ════════════════════════════════════════════════════════════════════
   LA PAGE PUBLIQUE D'UN PROGRAMME (vague 2 de la bibliothèque publique).

   Une page vitrine, pas l'écran de l'application : on y lit le programme
   en entier (à qui il s'adresse, ses semaines, ses séances, son test), et
   on le suit avec un compte. Même gabarit que les fiches d'exercices,
   pour que la bibliothèque publique se lise comme un seul ensemble.

   ⚠️ Vaiiya+ en aperçu (décision de Louis, 2026-11-08) : la structure du
   programme est publique, le contenu des séances reste dans l'application.
   ⚠️ Aucune promesse de résultat, aucune adaptation automatique.
   ════════════════════════════════════════════════════════════════════ */

const NB = String.fromCharCode(160);
const LETTRES = ["zéro", "une", "deux", "trois", "quatre", "cinq", "six", "sept"];

export const dynamicParams = false;

export function generateStaticParams() {
  return programmesPublies().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const p = programmeParSlug(slug);
  if (!p) return {};
  const url = `https://vaiiya.fr/programmes/${p.slug}`;
  return {
    title: p.title,
    description: p.description,
    alternates: { canonical: url },
    openGraph: {
      title: p.title,
      description: typoParcours(p.def.accroche),
      url,
      images: ["/og-image.png"],
    },
  };
}

/** Le signe × d'Archivo se dessine en losange dans la largeur des titres
    (`"wdth" 116`, vu le 2026-11-09 : « Force 5 ◆ 5 »). Dans un titre, il
    reprend donc la largeur normale de la police, où il est juste. */
function TitreSansLosange({ texte }: { texte: string }) {
  return (
    <>
      {texte.split("×").map((morceau, i) => (
        <Fragment key={i}>
          {i > 0 && <span style={{ fontVariationSettings: "normal" }}>×</span>}
          {morceau}
        </Fragment>
      ))}
    </>
  );
}

/** Ce que coûte le programme, dit sans jamais laisser croire qu'on peut
    payer aujourd'hui (positionnement public, §12). */
function acces(def: DefParcours): string {
  if (def.acces === "inclus") return "Inclus dans le compte gratuit, pour toujours.";
  return VENTE_OUVERTE
    ? "Avec Vaiiya+."
    : "Fera partie de Vaiiya+. D’ici l’ouverture de l’abonnement, il se suit avec un compte gratuit.";
}

export default async function ProgrammePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const soucis = verifierProgrammes();
  if (soucis.length) throw new Error(`Programmes publics : ${soucis.join(" | ")}`);

  const { slug } = await params;
  const p = programmeParSlug(slug);
  if (!p) notFound();

  const { def } = p;
  const plan = planSemaines(def);
  const seances = [...new Set(def.phases.flatMap((ph) => ph.seances))]
    .map((id) => ({ id, s: SEANCES[id] }))
    .filter((x) => x.s);
  const parSemaine = capitale(LETTRES[def.parSemaine] ?? String(def.parSemaine));
  const ficheTest = slugDeLExercice(def.test.mouvement);
  const suivant = def.suivant ? programmesPublies().find((x) => x.id === def.suivant) ?? null : null;

  const lignes: [string, string][] = [
    ["Durée", `${def.semaines}${NB}semaines, ${def.parSemaine}${NB}séances par semaine`],
    ["Où", def.lieu],
    ["Le test", def.test.depart],
    ["Accès", acces(def)],
  ];

  const etapes = [
    { titre: "Un test au départ", texte: def.test.depart },
    {
      titre: `${parSemaine} séances par semaine`,
      texte: "Les jours que tu choisis. Une séance manquée glisse au prochain jour libre, jamais deux le même jour.",
    },
    { titre: "Le même test à la fin", texte: "Pour voir le chemin parcouru, sans te comparer à personne." },
  ];

  const filAriane = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: "https://vaiiya.fr" },
      { "@type": "ListItem", position: 2, name: "Programmes", item: "https://vaiiya.fr/programmes" },
      { "@type": "ListItem", position: 3, name: def.titre, item: `https://vaiiya.fr/programmes/${p.slug}` },
    ],
  };

  return (
    <PageVitrine largeur="max-w-5xl">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(filAriane) }} />

      <nav aria-label="Fil d’Ariane" className="mb-7 text-[13px]" style={{ color: "#8B84A8" }}>
        <Link href="/" className="hover:underline">Accueil</Link>
        <span className="mx-1.5">›</span>
        <Link href="/programmes" className="hover:underline">Programmes</Link>
        <span className="mx-1.5">›</span>
        <span style={{ color: "#4A5568" }}>{def.titre}</span>
      </nav>

      {/* ── Le héros : même découpe que les fiches d'exercices ─────────
          Sur téléphone, le titre passe au-dessus de la photo, le reste
          dessous ; sur ordinateur, la photo à gauche, le texte à droite. */}
      <section className="grid gap-5 md:gap-x-12 md:gap-y-4 md:grid-cols-[minmax(0,410px)_1fr] md:items-start">
        <div className="order-1 md:order-none md:col-start-2 md:row-start-1">
          <p className="text-[11px] font-bold tracking-[0.22em] uppercase mb-3" style={{ color: "#A78BFA" }}>
            Programme · {def.semaines}{NB}semaines · {nbCreneaux(def)}{NB}séances
          </p>
          <h1
            className="font-light leading-[1.05]"
            style={{ fontSize: "clamp(2.125rem,7vw,3.1rem)", letterSpacing: "-0.015em", color: "#1A1535" }}
          >
            <TitreSansLosange texte={def.titre} />
          </h1>
        </div>

        <div
          className="order-2 md:order-none md:col-start-1 md:row-start-1 md:row-span-2 md:self-start relative w-full overflow-hidden rounded-[28px] mx-auto"
          style={{ maxWidth: 410, aspectRatio: "4 / 5", background: "#1A1424" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/entrainement/${p.photo}.webp`}
            alt=""
            width={750}
            height={1000}
            fetchPriority="high"
            className="absolute inset-0 w-full h-full"
            style={{ objectFit: "cover", objectPosition: p.pos ?? "50% 50%" }}
          />
        </div>

        <div className="order-3 md:order-none md:col-start-2 md:row-start-2">
          <p className="text-[1.25rem] leading-[1.55] mb-6" style={{ color: "#4A5568" }}>
            {typoParcours(def.accroche)}
          </p>
          <dl className="text-[13px]">
            {lignes.map(([cle, valeur], i) => (
              <div
                key={cle}
                className="flex gap-4 py-2.5"
                style={i > 0 ? { borderTop: "1px solid rgba(167,139,250,0.16)" } : undefined}
              >
                <dt className="w-[86px] shrink-0" style={{ color: "#8B84A8" }}>{cle}</dt>
                <dd className="font-medium" style={{ color: "#2D2150" }}>{typoParcours(valeur)}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <div className="mt-14 max-w-[680px]">
        <p className="text-[1rem] leading-[1.7]" style={{ color: "#4A5568" }}>
          {typoParcours(p.pourQui)}
        </p>

        <h2 className="mt-12 mb-6 text-[1.625rem] font-medium" style={{ color: "#2D2150" }}>
          Comment ça marche
        </h2>
        <ol className="list-none p-0 m-0">
          {etapes.map((e, i) => (
            <li key={e.titre} className="relative pl-12 pb-7">
              <span
                className="absolute left-0 top-0 flex items-center justify-center rounded-full text-[13px] font-bold"
                style={{ width: 30, height: 30, background: "rgba(139,92,246,0.12)", color: "#7C5CFA" }}
              >
                {i + 1}
              </span>
              <p className="text-[1rem] font-semibold mb-1" style={{ color: "#1A1535" }}>{e.titre}</p>
              <p className="text-[1rem] leading-[1.7]" style={{ color: "#4A5568" }}>{typoParcours(e.texte)}</p>
            </li>
          ))}
        </ol>

        <h2 className="mt-8 mb-5 text-[1.625rem] font-medium" style={{ color: "#2D2150" }}>
          {capitale(`les ${semainesDites(def.semaines)}`)}
        </h2>
        <div className="rounded-2xl overflow-hidden" style={{ background: "#fff", border: "1px solid rgba(167,139,250,0.18)" }}>
          {plan.map((l, i) => (
            <div
              key={l.quand}
              className="flex flex-col sm:flex-row gap-1 sm:gap-4 px-5 py-4"
              style={i > 0 ? { borderTop: "1px solid rgba(167,139,250,0.14)" } : undefined}
            >
              <p className="sm:w-[120px] shrink-0 text-[13px] font-bold" style={{ color: "#7C5CFA" }}>{l.quand}</p>
              <p className="text-[1rem] leading-[1.6]" style={{ color: "#2D2150" }}>{typoParcours(l.quoi)}</p>
            </div>
          ))}
        </div>

        <h2 className="mt-12 mb-5 text-[1.625rem] font-medium" style={{ color: "#2D2150" }}>
          {seances.length > 1 ? "Les séances du programme" : "La séance du programme"}
        </h2>
        <div className="rounded-2xl overflow-hidden" style={{ background: "#fff", border: "1px solid rgba(167,139,250,0.18)" }}>
          {seances.map(({ id, s }, i) => (
            <div
              key={id}
              className="px-5 py-4"
              style={i > 0 ? { borderTop: "1px solid rgba(167,139,250,0.14)" } : undefined}
            >
              <p className="text-[1rem] font-semibold" style={{ color: "#1A1535" }}>{typoParcours(s.titre)}</p>
              <p className="mt-0.5 text-[13px]" style={{ color: "#8B84A8" }}>
                {s.minutes}{NB}min · {s.exercices}{NB}{s.exercices > 1 ? "exercices" : "exercice"} · {s.difficulte}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[13px] leading-[1.6]" style={{ color: "#8B84A8" }}>
          Chaque séance se lance guidée dans Vaiiya, mouvement par mouvement, avec le personnage qui montre le geste.
        </p>

        <h2 className="mt-12 mb-5 text-[1.625rem] font-medium" style={{ color: "#2D2150" }}>
          Le test
        </h2>
        <div
          className="flex flex-col sm:flex-row gap-5 sm:items-center rounded-2xl px-5 py-5"
          style={{ background: "#fff", border: "1px solid rgba(167,139,250,0.18)" }}
        >
          <div
            className="shrink-0 mx-auto sm:mx-0 rounded-2xl flex items-center justify-center"
            style={{
              width: 150,
              height: 150,
              background: "radial-gradient(circle at 50% 45%, rgba(139,92,246,0.13), rgba(139,92,246,0) 68%)",
            }}
          >
            <AnimationExercice nom={def.test.mouvement} taille={150} label={labelAnimation(def.test.mouvement)} />
          </div>
          <div>
            <p className="text-[1rem] font-semibold mb-1" style={{ color: "#1A1535" }}>{typoParcours(def.test.titre)}</p>
            <p className="text-[1rem] leading-[1.6]" style={{ color: "#4A5568" }}>{typoParcours(def.test.consigne)}</p>
            <p className="mt-2 text-[13px] leading-[1.6]" style={{ color: "#8B84A8" }}>
              Le même test revient à la dernière séance, et seul ton propre chiffre sert de comparaison.
            </p>
            {ficheTest && (
              <Link href={`/exercices/${ficheTest}`} className="inline-block mt-3 text-[13px] font-semibold hover:underline" style={{ color: "#7C5CFA" }}>
                La technique du mouvement →
              </Link>
            )}
          </div>
        </div>

        {suivant && (
          <>
            <h2 className="mt-12 mb-5 text-[1.625rem] font-medium" style={{ color: "#2D2150" }}>
              Et après
            </h2>
            <Link
              href={`/programmes/${suivant.slug}`}
              className="flex gap-4 items-center rounded-2xl p-3 transition-transform hover:-translate-y-0.5"
              style={{ background: "#fff", border: "1px solid rgba(167,139,250,0.18)" }}
            >
              <span className="relative shrink-0 overflow-hidden rounded-xl" style={{ width: 72, height: 90, background: "#1A1424" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/entrainement/${suivant.photo}.webp`}
                  alt=""
                  width={72}
                  height={90}
                  loading="lazy"
                  className="absolute inset-0 w-full h-full"
                  style={{ objectFit: "cover", objectPosition: suivant.pos ?? "50% 50%" }}
                />
              </span>
              <span>
                <span className="block text-[1rem] font-semibold" style={{ color: "#1A1535" }}>{suivant.def.titre}</span>
                <span className="block mt-0.5 text-[13px] leading-[1.5]" style={{ color: "#4A5568" }}>
                  {typoParcours(suivant.def.accroche)}
                </span>
              </span>
            </Link>
          </>
        )}
      </div>

      <section
        className="mt-16 rounded-3xl px-7 py-10"
        style={{
          background: "linear-gradient(135deg,rgba(212,192,255,0.55),rgba(245,230,163,0.45))",
          border: "1px solid rgba(255,255,255,0.9)",
          boxShadow: "0 12px 40px rgba(167,139,250,0.18)",
        }}
      >
        <p className="text-[13px] font-semibold mb-2" style={{ color: "#7C5CFA" }}>✦ Vaiiya</p>
        <h2 className="text-[26px] font-light mb-2 max-w-[520px]" style={{ color: "#1A1535" }}>
          Suis ce programme dans Vaiiya
        </h2>
        <p className="text-[16px] mb-6 max-w-[520px]" style={{ color: "#4A5568" }}>
          Crée ton compte gratuit, choisis tes jours, et chaque séance se lance guidée, du test de départ au test final.
        </p>
        <Link
          href="/premiers-pas"
          className="inline-block px-7 py-3.5 rounded-2xl text-[16px] font-semibold"
          style={{ background: "linear-gradient(135deg,#A78BFA,#D4A843)", color: "#fff", boxShadow: "0 6px 24px rgba(167,139,250,0.4)" }}
        >
          Créer mon compte gratuit →
        </Link>
      </section>

      <p className="mt-8 text-[13px]" style={{ color: "#8B84A8" }}>
        <Link href="/programmes" className="hover:underline">← Tous les programmes</Link>
      </p>
    </PageVitrine>
  );
}
