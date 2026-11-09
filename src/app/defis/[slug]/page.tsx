import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageVitrine } from "@/components/seo/VitrineChrome";
import AnimationExercice, { labelAnimation } from "@/components/exercices/AnimationExercice";
import { slugDeLExercice } from "@/lib/exercicesPublics";
import { VENTE_OUVERTE } from "@/lib/plans";
import {
  feuillePremiereFois, mouvements, regleComplete, surtitre, titreMouvements, typo, type Classique, type SorteScore,
} from "@/lib/classiques";
import { defiParSlug, defisPublies, verifierDefis } from "@/lib/defisPublics";

/* ════════════════════════════════════════════════════════════════════
   LA PAGE PUBLIQUE D'UN DÉFI (un « classique » dans l'application).

   On y lit le défi : ses mouvements animés, comment il se joue, ce qui
   compte comme score. On le fait avec un compte, et Vaiiya garde alors
   le meilleur score de chacun.

   ⚠️ Les règles viennent de `lib/classiques.ts` (`regleComplete`, la même
   que l'écran « La règle complète » de l'application) : rien n'est
   réécrit ici, donc la page ne peut pas contredire l'application.
   ⚠️ Vaiiya+ en aperçu : pour un futur Vaiiya+, la page montre comment ça
   marche, sans la règle complète.
   ════════════════════════════════════════════════════════════════════ */

const NB = String.fromCharCode(160);

const SCORE: Record<SorteScore, string> = {
  temps: "Ton temps, du premier mouvement au dernier",
  tours: "Les tours finis avant la sonnerie, plus les répétitions du tour en cours",
  reps: "Le nombre de répétitions avant la sonnerie",
  tenue: "Le temps tenu, en une seule fois",
  minute: "La dernière minute finie à temps",
};

export const dynamicParams = false;

export function generateStaticParams() {
  return defisPublies().map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const d = defiParSlug(slug);
  if (!d) return {};
  const url = `https://vaiiya.fr/defis/${d.slug}`;
  return {
    title: d.title,
    description: d.description,
    alternates: { canonical: url },
    openGraph: { title: d.title, description: typo(d.c.promesse), url, images: ["/og-image.png"] },
  };
}

function acces(c: Classique): string {
  if (c.ouvert) return "Inclus dans le compte gratuit.";
  return VENTE_OUVERTE
    ? "Avec Vaiiya+."
    : "Fera partie de Vaiiya+. D’ici l’ouverture de l’abonnement, il se fait avec un compte gratuit.";
}

const maj = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

export default async function DefiPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const soucis = verifierDefis();
  if (soucis.length) throw new Error(`Défis publics : ${soucis.join(" | ")}`);

  const { slug } = await params;
  const d = defiParSlug(slug);
  if (!d) notFound();

  const { c } = d;
  const exact = c.format === "max" || c.format === "compte";
  const mvts = mouvements(c);
  const autres = defisPublies().filter((x) => x.slug !== d.slug).slice(0, 3);

  const lignes: [string, string][] = [
    ["Durée", `${c.minutes}${NB}min${exact ? "" : " environ"}`],
    ["Matériel", maj(c.materiel)],
    ["Ton score", SCORE[c.sorte]],
    ["Accès", acces(c)],
  ];

  const filAriane = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: "https://vaiiya.fr" },
      { "@type": "ListItem", position: 2, name: "Défis", item: "https://vaiiya.fr/defis" },
      { "@type": "ListItem", position: 3, name: c.titre, item: `https://vaiiya.fr/defis/${d.slug}` },
    ],
  };

  return (
    <PageVitrine largeur="max-w-5xl">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(filAriane) }} />

      <nav aria-label="Fil d’Ariane" className="mb-7 text-[13px]" style={{ color: "#8B84A8" }}>
        <Link href="/" className="hover:underline">Accueil</Link>
        <span className="mx-1.5">›</span>
        <Link href="/defis" className="hover:underline">Défis</Link>
        <span className="mx-1.5">›</span>
        <span style={{ color: "#4A5568" }}>{c.titre}</span>
      </nav>

      <section className="max-w-[760px]">
        <p className="text-[11px] font-bold tracking-[0.22em] uppercase mb-3" style={{ color: "#A78BFA" }}>
          {typo(surtitre(c))}
        </p>
        <h1
          className="font-light leading-[1.05]"
          style={{ fontSize: "clamp(2.125rem,7vw,3.1rem)", letterSpacing: "-0.015em", color: "#1A1535" }}
        >
          {c.titre}
        </h1>
        <p className="mt-4 text-[1.25rem] leading-[1.55]" style={{ color: "#4A5568" }}>
          {typo(c.promesse)}
        </p>
        <dl className="mt-6 text-[13px] max-w-[560px]">
          {lignes.map(([cle, valeur], i) => (
            <div
              key={cle}
              className="flex gap-4 py-2.5"
              style={i > 0 ? { borderTop: "1px solid rgba(167,139,250,0.16)" } : undefined}
            >
              <dt className="w-[86px] shrink-0" style={{ color: "#8B84A8" }}>{cle}</dt>
              <dd className="font-medium" style={{ color: "#2D2150" }}>{typo(valeur)}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ── Les mouvements, animés ────────────────────────────────────── */}
      <section className="mt-12">
        <h2 className="mb-5 text-[1.625rem] font-medium" style={{ color: "#2D2150" }}>
          {titreMouvements(mvts.length)}
        </h2>
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          {mvts.map((m, i) => {
            const fiche = slugDeLExercice(m.exercice);
            const corps = (
              <>
                <span
                  className="flex items-center justify-center rounded-2xl mb-3"
                  style={{ height: 132, background: "radial-gradient(circle at 50% 45%, rgba(139,92,246,0.13), rgba(139,92,246,0) 68%)" }}
                >
                  <AnimationExercice nom={m.exercice} taille={132} label={labelAnimation(m.exercice)} priorite={i < 2} />
                </span>
                <span className="block text-[16px] font-semibold leading-snug" style={{ color: "#1A1535" }}>{m.nom}</span>
                <span className="block mt-0.5 text-[13px]" style={{ color: "#8B84A8" }}>{typo(m.detail)}</span>
              </>
            );
            const style = { background: "#fff", border: "1px solid rgba(167,139,250,0.16)", boxShadow: "0 6px 24px rgba(90,60,180,0.07)" };
            return fiche ? (
              <Link key={m.exercice} href={`/exercices/${fiche}`} className="block rounded-3xl p-4 transition-transform hover:-translate-y-0.5" style={style}>
                {corps}
              </Link>
            ) : (
              <div key={m.exercice} className="rounded-3xl p-4" style={style}>{corps}</div>
            );
          })}
        </div>
      </section>

      <div className="mt-14 max-w-[680px]">
        <h2 className="mb-6 text-[1.625rem] font-medium" style={{ color: "#2D2150" }}>
          Comment ça marche
        </h2>
        <ol className="list-none p-0 m-0">
          {c.comment.map((l, i) => (
            <li key={l.texte} className="relative pl-12 pb-7">
              <span
                className="absolute left-0 top-0 flex items-center justify-center rounded-full text-[13px] font-bold"
                style={{ width: 30, height: 30, background: "rgba(139,92,246,0.12)", color: "#7C5CFA" }}
              >
                {i + 1}
              </span>
              <p className="text-[1rem] leading-[1.7]" style={{ color: "#1A1535" }}>
                {typo(l.texte)}
                {l.gras && (
                  <>
                    {" "}
                    <strong>{typo(l.gras)}</strong>
                  </>
                )}
              </p>
              {l.escalier && (
                <p className="mt-2 flex flex-wrap gap-1.5" aria-hidden>
                  {l.escalier.map((n, k) => (
                    <span
                      key={k}
                      className="inline-flex items-center justify-center rounded-lg text-[13px] font-bold"
                      style={{ width: 30, height: 30, background: "rgba(245,177,32,0.14)", color: "#9A5B05" }}
                    >
                      {n}
                    </span>
                  ))}
                </p>
              )}
              {l.note && (
                <p className="mt-1 text-[13px] leading-[1.6]" style={{ color: "#8B84A8" }}>{typo(l.note)}</p>
              )}
            </li>
          ))}
        </ol>

        {c.ouvert ? (
          <>
            <h2 className="mt-8 mb-5 text-[1.625rem] font-medium" style={{ color: "#2D2150" }}>
              La règle complète
            </h2>
            <div className="rounded-2xl overflow-hidden" style={{ background: "#fff", border: "1px solid rgba(167,139,250,0.18)" }}>
              {regleComplete(c).map((r, i) => (
                <div
                  key={r.titre}
                  className="px-5 py-4"
                  style={i > 0 ? { borderTop: "1px solid rgba(167,139,250,0.14)" } : undefined}
                >
                  <p className="text-[1rem] font-semibold mb-1" style={{ color: "#1A1535" }}>{typo(r.titre)}</p>
                  <p className="text-[1rem] leading-[1.6]" style={{ color: "#4A5568" }}>{typo(r.texte)}</p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <h2 className="mt-8 mb-5 text-[1.625rem] font-medium" style={{ color: "#2D2150" }}>
              En bref
            </h2>
            <div className="rounded-2xl overflow-hidden" style={{ background: "#fff", border: "1px solid rgba(167,139,250,0.18)" }}>
              {feuillePremiereFois(c).points.map((pt, i) => (
                <div
                  key={pt.titre}
                  className="px-5 py-4"
                  style={i > 0 ? { borderTop: "1px solid rgba(167,139,250,0.14)" } : undefined}
                >
                  <p className="text-[1rem] font-semibold mb-1" style={{ color: "#1A1535" }}>{typo(pt.titre)}</p>
                  <p className="text-[1rem] leading-[1.6]" style={{ color: "#4A5568" }}>{typo(pt.texte)}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[13px] leading-[1.6]" style={{ color: "#8B84A8" }}>
              La règle complète, l’échauffement et le chrono se trouvent dans Vaiiya, avec un compte.
            </p>
          </>
        )}

        <h2 className="mt-12 mb-3 text-[1.625rem] font-medium" style={{ color: "#2D2150" }}>
          Un score qui ne se compare qu’à toi
        </h2>
        <p className="text-[1rem] leading-[1.7]" style={{ color: "#4A5568" }}>
          Vaiiya garde ton meilleur score sur ce défi. Pendant l’effort, l’écran te dit quand tu es devant
          ton meilleur, et il se tait quand tu es derrière. Aucun classement, aucune moyenne&nbsp;: le seul
          chiffre qui compte est le tien, d’un mois sur l’autre.
        </p>
      </div>

      {autres.length > 0 && (
        <section className="mt-16">
          <h2 className="text-[1.625rem] font-medium mb-5" style={{ color: "#2D2150" }}>
            D’autres défis
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {autres.map((a) => (
              <Link
                key={a.slug}
                href={`/defis/${a.slug}`}
                className="block rounded-3xl p-5 transition-transform hover:-translate-y-0.5"
                style={{ background: "#fff", border: "1px solid rgba(167,139,250,0.16)", boxShadow: "0 6px 24px rgba(90,60,180,0.07)" }}
              >
                <span className="block text-[16px] font-semibold" style={{ color: "#1A1535" }}>{a.c.titre}</span>
                <span className="block mt-1 text-[13px] leading-[1.55]" style={{ color: "#4A5568" }}>{typo(a.c.promesse)}</span>
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
          Fais ce défi avec Vaiiya
        </h2>
        <p className="text-[16px] mb-6 max-w-[520px]" style={{ color: "#4A5568" }}>
          Crée ton compte gratuit&nbsp;: le chrono, le compte des répétitions et ton meilleur score sont tenus pour toi.
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
        <Link href="/defis" className="hover:underline">← Tous les défis</Link>
      </p>
    </PageVitrine>
  );
}
