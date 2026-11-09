import type { Metadata } from "next";
import { Fragment } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageVitrine } from "@/components/seo/VitrineChrome";
import AnimationExercice, { labelAnimation } from "@/components/exercices/AnimationExercice";
import { slugDeLExercice } from "@/lib/exercicesPublics";
import { blocsDe, doseDe, enTeteDuBloc } from "@/lib/toursSeance";
import { VENTE_OUVERTE } from "@/lib/plans";
import {
  descriptionSeance, exercicesDe, materielDe, motCategorie, photoDe, seanceOuverte, seanceParSlug, seancesPubliees,
  seancesVoisines, titleSeance,
} from "@/lib/seancesPubliques";

/* ════════════════════════════════════════════════════════════════════
   LA PAGE PUBLIQUE D'UNE SÉANCE (vague 4 de la bibliothèque publique).

   Une séance gratuite se lit en entier : ses mouvements animés, dans
   l'ordre, avec leurs séries, leurs répétitions et leurs repos, et ses
   circuits annoncés comme dans l'application (« Circuit · 4 tours »).
   Une séance Vaiiya+ se lit en aperçu : ses trois premiers mouvements.

   ⚠️ Les doses viennent de `doseDe` et les blocs de `enTeteDuBloc`, les
   mêmes fonctions que « Au programme » dans l'application.
   ════════════════════════════════════════════════════════════════════ */

const NB = String.fromCharCode(160);

export const dynamicParams = false;

export function generateStaticParams() {
  return seancesPubliees().map((s) => ({ slug: s.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const s = seanceParSlug(slug);
  if (!s) return {};
  const url = `https://vaiiya.fr/seances/${s.id}`;
  return {
    title: titleSeance(s),
    description: descriptionSeance(s),
    alternates: { canonical: url },
    openGraph: { title: s.title, description: descriptionSeance(s), url, images: [photoDe(s)] },
  };
}

/** « 60 s de repos », « 1 min 30 de repos ». */
function repos(sec?: number): string | null {
  if (!sec || sec <= 0) return null;
  if (sec < 60) return `${sec}${NB}s de repos`;
  const m = Math.floor(sec / 60), r = sec % 60;
  return r ? `${m}${NB}min${NB}${String(r).padStart(2, "0")} de repos` : `${m}${NB}min de repos`;
}

export default async function SeancePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const s = seanceParSlug(slug);
  if (!s) notFound();

  const exos = exercicesDe(s);
  const ouverte = seanceOuverte(s);
  const materiel = materielDe(s);
  const blocs = blocsDe(exos);
  const debutDe = new Map(blocs.map((b) => [b.debut, b]));
  const dansUnBloc = (i: number) => blocs.some((b) => i >= b.debut && i < b.fin);
  const apercu = (s.previewExercises?.length ? s.previewExercises : exos.map((e) => e.name)).slice(0, 3);
  const voisines = seancesVoisines(s);

  const lignes: [string, string][] = [
    ["Durée", `${s.duration}${NB}min`],
    ["Niveau", s.difficulty],
    ...(materiel ? [["Matériel", materiel] as [string, string]] : []),
    ["Accès", ouverte ? "Inclus dans le compte gratuit." : VENTE_OUVERTE ? "Avec Vaiiya+." : "Fera partie de Vaiiya+, qui n’est pas encore ouvert à l’abonnement."],
  ];

  const filAriane = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: "https://vaiiya.fr" },
      { "@type": "ListItem", position: 2, name: "Séances", item: "https://vaiiya.fr/seances" },
      { "@type": "ListItem", position: 3, name: s.title, item: `https://vaiiya.fr/seances/${s.id}` },
    ],
  };

  const carteMouvement = (nom: string, detail: string | null, cle: string, priorite: boolean) => {
    const fiche = slugDeLExercice(nom);
    return (
      <li key={cle} className="flex items-center gap-4 px-4 py-3" style={{ borderTop: "1px solid rgba(167,139,250,0.12)" }}>
        <span
          className="shrink-0 rounded-2xl flex items-center justify-center"
          style={{ width: 72, height: 72, background: "radial-gradient(circle at 50% 45%, rgba(139,92,246,0.13), rgba(139,92,246,0) 68%)" }}
        >
          <AnimationExercice nom={nom} taille={72} label={labelAnimation(nom)} priorite={priorite} />
        </span>
        <span className="min-w-0">
          {fiche ? (
            <Link href={`/exercices/${fiche}`} className="block text-[1rem] font-semibold leading-snug hover:underline" style={{ color: "#1A1535" }}>
              {nom}
            </Link>
          ) : (
            <span className="block text-[1rem] font-semibold leading-snug" style={{ color: "#1A1535" }}>{nom}</span>
          )}
          {detail && <span className="block mt-0.5 text-[13px]" style={{ color: "#8B84A8" }}>{detail}</span>}
        </span>
      </li>
    );
  };

  return (
    <PageVitrine largeur="max-w-5xl">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(filAriane) }} />

      <nav aria-label="Fil d’Ariane" className="mb-7 text-[13px]" style={{ color: "#8B84A8" }}>
        <Link href="/" className="hover:underline">Accueil</Link>
        <span className="mx-1.5">›</span>
        <Link href="/seances" className="hover:underline">Séances</Link>
        <span className="mx-1.5">›</span>
        <span style={{ color: "#4A5568" }}>{s.title}</span>
      </nav>

      <section className="grid gap-5 md:gap-x-12 md:gap-y-4 md:grid-cols-[minmax(0,410px)_1fr] md:items-start">
        <div className="order-1 md:order-none md:col-start-2 md:row-start-1">
          <p className="text-[11px] font-bold tracking-[0.22em] uppercase mb-3" style={{ color: "#A78BFA" }}>
            Séance {motCategorie(s)} · {s.duration}{NB}min{ouverte ? "" : " · Vaiiya+"}
          </p>
          <h1
            className="font-light leading-[1.05]"
            style={{ fontSize: "clamp(2.125rem,7vw,3.1rem)", letterSpacing: "-0.015em", color: "#1A1535" }}
          >
            {s.title}
          </h1>
        </div>

        <div
          className="order-2 md:order-none md:col-start-1 md:row-start-1 md:row-span-2 md:self-start relative w-full overflow-hidden rounded-[28px] mx-auto"
          style={{ maxWidth: 410, aspectRatio: "4 / 5", background: "#1A1424" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoDe(s)}
            alt=""
            width={750}
            height={1000}
            fetchPriority="high"
            className="absolute inset-0 w-full h-full"
            style={{ objectFit: "cover", objectPosition: "50% 35%" }}
          />
        </div>

        <div className="order-3 md:order-none md:col-start-2 md:row-start-2">
          <p className="text-[1.25rem] leading-[1.55] mb-4" style={{ color: "#4A5568" }}>{s.subtitle}</p>
          <ul className="flex flex-wrap gap-2 mb-6">
            {s.muscles.map((m, i) => (
              <li
                key={m}
                className="px-3 py-1.5 rounded-full text-[13px] font-semibold"
                style={i === 0 ? { background: "rgba(139,92,246,0.14)", color: "#6B46C1" } : { border: "1px solid rgba(139,92,246,0.28)", color: "#7C5CFA" }}
              >
                {m}
              </li>
            ))}
          </ul>
          <dl className="text-[13px]">
            {lignes.map(([cle, valeur], i) => (
              <div key={cle} className="flex gap-4 py-2.5" style={i > 0 ? { borderTop: "1px solid rgba(167,139,250,0.16)" } : undefined}>
                <dt className="w-[86px] shrink-0" style={{ color: "#8B84A8" }}>{cle}</dt>
                <dd className="font-medium" style={{ color: "#2D2150" }}>{valeur}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <div className="mt-14 max-w-[680px]">
        <h2 className="mb-2 text-[1.625rem] font-medium" style={{ color: "#2D2150" }}>Au programme</h2>
        <p className="mb-5 text-[13px]" style={{ color: "#8B84A8" }}>
          {ouverte
            ? `${exos.length}${NB}mouvement${exos.length > 1 ? "s" : ""}, dans l’ordre, après un échauffement.`
            : `Les ${apercu.length} premiers mouvements, sur ${s.exercises}.`}
        </p>

        {ouverte ? (
          <ul className="list-none p-0 m-0 rounded-2xl overflow-hidden" style={{ background: "#fff", border: "1px solid rgba(167,139,250,0.18)" }}>
            {exos.map((e, i) => {
              const b = debutDe.get(i);
              const detail = [doseDe(e, dansUnBloc(i)), dansUnBloc(i) ? null : repos(e.rest)].filter(Boolean).join(" · ");
              return (
                <Fragment key={`${e.name}-${i}`}>
                  {b && (
                    <li className="px-4 pt-4 pb-2 text-[11px] font-bold tracking-[0.14em] uppercase" style={{ color: "#B9770E", borderTop: i ? "1px solid rgba(167,139,250,0.12)" : undefined }}>
                      {enTeteDuBloc(exos, b)}
                    </li>
                  )}
                  {carteMouvement(e.name, detail || null, `${e.name}-${i}`, i < 2)}
                </Fragment>
              );
            })}
          </ul>
        ) : (
          <>
            <ul className="list-none p-0 m-0 rounded-2xl overflow-hidden" style={{ background: "#fff", border: "1px solid rgba(167,139,250,0.18)" }}>
              {apercu.map((nom, i) => carteMouvement(nom, null, `${nom}-${i}`, i < 2))}
            </ul>
            <p className="mt-4 text-[1rem] leading-[1.7]" style={{ color: "#4A5568" }}>
              {VENTE_OUVERTE
                ? "La séance complète, avec ses séries et ses repos, se fait dans Vaiiya avec Vaiiya+."
                : "La séance complète fera partie de Vaiiya+, qui n’est pas encore ouvert à l’abonnement. Les séances gratuites, elles, se lisent en entier."}
            </p>
          </>
        )}

        <h2 className="mt-12 mb-3 text-[1.625rem] font-medium" style={{ color: "#2D2150" }}>Dans Vaiiya</h2>
        <p className="text-[1rem] leading-[1.7]" style={{ color: "#4A5568" }}>
          La séance se lance guidée&nbsp;: le personnage montre chaque geste, le chrono compte les efforts et les repos,
          et ce que tu as fait est gardé à la fin. Tu peux aussi la poser un jour de ta semaine, ou t’en inspirer pour
          composer la tienne.
        </p>
      </div>

      {voisines.length > 0 && (
        <section className="mt-16">
          <h2 className="text-[1.625rem] font-medium mb-5" style={{ color: "#2D2150" }}>D’autres séances</h2>
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3">
            {voisines.map((v) => (
              <Link
                key={v.id}
                href={`/seances/${v.id}`}
                className="block rounded-3xl overflow-hidden transition-transform hover:-translate-y-0.5"
                style={{ background: "#fff", border: "1px solid rgba(167,139,250,0.16)", boxShadow: "0 6px 24px rgba(90,60,180,0.07)" }}
              >
                <span className="relative block" style={{ aspectRatio: "4 / 3", background: "#1A1424" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photoDe(v)} alt="" width={750} height={1000} loading="lazy" className="absolute inset-0 w-full h-full" style={{ objectFit: "cover", objectPosition: "50% 35%" }} />
                </span>
                <span className="block p-3.5">
                  <span className="block text-[16px] font-semibold leading-snug" style={{ color: "#1A1535" }}>{v.title}</span>
                  <span className="block mt-1 text-[13px]" style={{ color: "#8B84A8" }}>
                    {v.duration}{NB}min · {v.difficulty}{seanceOuverte(v) ? "" : " · Vaiiya+"}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

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
          Fais cette séance avec Vaiiya
        </h2>
        <p className="text-[16px] mb-6 max-w-[520px]" style={{ color: "#4A5568" }}>
          Crée ton compte gratuit&nbsp;: la séance se lance guidée, mouvement par mouvement.
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
        <Link href="/seances" className="hover:underline">← Toutes les séances</Link>
      </p>
    </PageVitrine>
  );
}
