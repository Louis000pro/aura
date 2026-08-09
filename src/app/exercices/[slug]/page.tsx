import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageVitrine } from "@/components/seo/VitrineChrome";
import AnimationExercice, { labelAnimation } from "@/components/exercices/AnimationExercice";
import CarteExercice from "@/components/exercices/CarteExercice";
import {
  ficheParSlug,
  fichesPubliees,
  libelleCategorie,
  libelleNiveau,
  slugDeLExercice,
  verifierFiches,
  voisinsPublies,
  type Variante,
} from "@/lib/exercicesPublics";
import { EQUIPS, libelleReps, trouverExercice } from "@/lib/exerciseLibrary";

/* Seules les fiches RÉDIGÉES existent en tant qu'URL. Les sept autres
   slugs sont déjà réservés côté données, mais un slug réservé n'est pas
   une page : sans `contenu`, la route n'est pas générée et l'URL répond
   404. Publier une coquille vide pour « tenir » une adresse serait la
   pire chose à montrer à un moteur comme à un lecteur. */
export const dynamicParams = false;

export function generateStaticParams() {
  return fichesPubliees().map((f) => ({ slug: f.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const fiche = ficheParSlug(slug);
  if (!fiche) return {};

  const url = `https://vaiiya.fr/exercices/${fiche.slug}`;
  return {
    title: fiche.title,
    description: fiche.description,
    alternates: { canonical: url },
    openGraph: {
      title: `${fiche.lib.name} : technique et erreurs`,
      description: fiche.lib.benefit,
      url,
      images: ["/og-image.png"],
    },
  };
}

export default async function FicheExercicePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const soucis = verifierFiches();
  if (soucis.length) throw new Error(`Fiches d'exercices : ${soucis.join(" | ")}`);

  const { slug } = await params;
  const fiche = ficheParSlug(slug);
  if (!fiche) notFound();

  const { lib, contenu } = fiche;
  const categorie = libelleCategorie(fiche.categorie);
  const voisins = voisinsPublies(fiche);
  const materiel =
    contenu.materiel ?? EQUIPS.find((e) => e.id === lib.equip)?.label ?? lib.equip;

  /* Le fil d'Ariane, et lui seul.

     Le contenu de cette page EST une procédure, donc le schema `HowTo` lui
     correspondrait sur le fond. On ne le pose pas : Google a retiré son
     affichage enrichi en 2023 et ne l'exploite plus. Ce serait donc du
     balisage que personne ne lit, ajouté au poids de la page pour une
     promesse qui n'existe plus. Ce que les étapes ont à dire, elles le
     disent déjà dans un `<ol>`, qui est du HTML que tout le monde
     comprend, moteurs classiques comme moteurs de réponse. */
  const filAriane = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: "https://vaiiya.fr" },
      { "@type": "ListItem", position: 2, name: "Exercices", item: "https://vaiiya.fr/exercices" },
      {
        "@type": "ListItem",
        position: 3,
        name: lib.name,
        item: `https://vaiiya.fr/exercices/${fiche.slug}`,
      },
    ],
  };

  return (
    <PageVitrine largeur="max-w-5xl">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(filAriane) }}
      />

      {/* ── Fil d'Ariane visible ─────────────────────────────────── */}
      <nav aria-label="Fil d'Ariane" className="mb-7 text-[12px]" style={{ color: "#8B84A8" }}>
        <Link href="/" className="hover:underline">Accueil</Link>
        <span className="mx-1.5">›</span>
        <Link href="/exercices" className="hover:underline">Exercices</Link>
        <span className="mx-1.5">›</span>
        <span style={{ color: "#4A5568" }}>{lib.name}</span>
      </nav>

      {/* ── Le héros ─────────────────────────────────────────────────
          Trois blocs plutôt que deux, et c'est le mobile qui l'impose.

          En deux blocs (animation, puis tout le texte), un téléphone
          affiche l'animation en premier et le H1 tombe à 546 px : lisible,
          mais on voit le geste avant de savoir sur quelle page on est.
          En inversant, c'est l'animation qui sort de l'écran, parce que la
          promesse, les muscles et les repères la repoussent trop bas.

          On coupe donc le texte en deux : le titre monte au-dessus de
          l'animation, le reste passe dessous. Sur téléphone on lit le nom
          de l'exercice, puis on voit le mouvement, les deux dans le
          premier écran. Sur desktop, la grille remet l'animation à gauche
          et recolle les deux moitiés de texte à droite. */}
      <section className="grid gap-5 md:gap-x-12 md:gap-y-4 md:grid-cols-[minmax(0,410px)_1fr] md:items-start">
        <div className="order-1 md:order-none md:col-start-2 md:row-start-1">
          <p
            className="text-[11px] font-bold tracking-[0.22em] uppercase mb-3"
            style={{ color: "#A78BFA" }}
          >
            {categorie} · {EQUIPS.find((e) => e.id === lib.equip)?.label}
          </p>
          <h1
            className="font-light leading-[1.05]"
            style={{ fontSize: "clamp(2.1rem,7vw,3.1rem)", letterSpacing: "-0.015em", color: "#1A1535" }}
          >
            {lib.name}
          </h1>
        </div>

        <div
          className="order-2 md:order-none md:col-start-1 md:row-start-1 md:row-span-2 md:self-center relative w-full rounded-[28px] mx-auto"
          style={{
            maxWidth: 410,
            aspectRatio: "1 / 1",
            background:
              "radial-gradient(circle at 50% 46%, rgba(139,92,246,0.17), rgba(139,92,246,0.03) 58%, rgba(139,92,246,0) 72%)",
          }}
        >
          <AnimationExercice
            nom={lib.name}
            taille="100%"
            label={labelAnimation(lib.name)}
            priorite
          />
        </div>

        <div className="order-3 md:order-none md:col-start-2 md:row-start-2">
          <p className="text-[1.12rem] leading-[1.55] mb-6" style={{ color: "#4A5568" }}>
            {lib.benefit}
          </p>

          <ul className="flex flex-wrap gap-2 mb-7">
            {lib.muscles.map((m, i) => (
              <li
                key={m}
                className="px-3 py-1.5 rounded-full text-[12.5px] font-semibold"
                style={
                  i === 0
                    ? { background: "rgba(139,92,246,0.14)", color: "#6B46C1" }
                    : { border: "1px solid rgba(139,92,246,0.28)", color: "#7C5CFA" }
                }
              >
                {m}
              </li>
            ))}
          </ul>

          <dl className="text-[14px]">
            {[
              ["Matériel", materiel],
              ["Pour", libelleNiveau(fiche.niveau.de, fiche.niveau.a)],
              [
                "Repères",
                `${lib.sets} × ${libelleReps(lib.mode, lib.reps, lib.seconds, lib.unite)} · ${lib.rest} s de repos`,
              ],
            ].map(([cle, valeur], i) => (
              <div
                key={cle}
                className="flex gap-4 py-2.5"
                style={i > 0 ? { borderTop: "1px solid rgba(167,139,250,0.16)" } : undefined}
              >
                <dt className="w-[86px] shrink-0" style={{ color: "#8B84A8" }}>{cle}</dt>
                <dd className="font-medium" style={{ color: "#2D2150" }}>{valeur}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ── Le point technique : le seul élément teal de la page ─── */}
      <aside
        className="mt-10 rounded-2xl px-6 py-5"
        style={{
          background: "rgba(43,212,160,0.07)",
          borderLeft: "3px solid #2BD4A0",
        }}
      >
        <p className="text-[11px] font-bold tracking-[0.18em] uppercase mb-1.5" style={{ color: "#12A67C" }}>
          Le point qui compte
        </p>
        <p className="text-[1.02rem] leading-[1.6]" style={{ color: "#2D2150" }}>
          {lib.tip}
        </p>
      </aside>

      {/* ── Le corps : borné à 680 px quelle que soit la fenêtre ─── */}
      <div className="mt-14 max-w-[680px]">
        <p className="text-[1.05rem] leading-[1.7]" style={{ color: "#4A5568" }}>
          {contenu.definition}
        </p>

        {/* Exécution */}
        <h2 className="mt-12 mb-6 text-[1.45rem] font-medium" style={{ color: "#2D2150" }}>
          Comment faire {motDeLExercice(lib.name)}
        </h2>
        <ol className="list-none p-0 m-0">
          {contenu.etapes.map((e, i) => (
            <li key={e.titre} className="relative pl-12 pb-7">
              <span
                className="absolute left-0 top-0 flex items-center justify-center rounded-full text-[13px] font-bold"
                style={{
                  width: 30,
                  height: 30,
                  background: "rgba(139,92,246,0.12)",
                  color: "#7C5CFA",
                }}
              >
                {i + 1}
              </span>
              <p className="text-[1.02rem] font-semibold mb-1" style={{ color: "#1A1535" }}>
                {e.titre}
              </p>
              <p className="text-[1rem] leading-[1.7]" style={{ color: "#4A5568" }}>
                {e.texte}
              </p>
            </li>
          ))}
        </ol>

        {contenu.precaution && (
          <p
            className="rounded-2xl px-5 py-4 text-[0.95rem] leading-[1.6]"
            style={{ background: "rgba(245,177,32,0.09)", color: "#7A5210" }}
          >
            <strong style={{ color: "#7A5210" }}>À savoir avant de charger.</strong>{" "}
            {contenu.precaution}
          </p>
        )}

        {/* ── Erreurs ──────────────────────────────────────────────
            En cartes côte à côte, trois erreurs donnaient deux cartes en
            haut et une orpheline en bas. Trois colonnes ont été mesurées
            plutôt que supposées : dans la colonne de lecture de 680 px,
            chaque carte tomberait à 216 px, dont 176 px de texte utile,
            et un titre comme « Faire rebondir la barre sur la poitrine »
            y prend quatre lignes. Ce serait faire rentrer trois colonnes
            au prix de la lisibilité.

            Elles deviennent donc des lignes pleine largeur, séparées par
            un filet. Aucune n'est orpheline puisqu'il n'y a plus de
            grille, chacune garde toute la largeur de lecture, et ça se lit
            pour ce que c'est : une liste de choses à ne pas faire. Sur
            téléphone, le rendu est exactement le même. */}
        <h2 className="mt-12 mb-5 text-[1.45rem] font-medium" style={{ color: "#2D2150" }}>
          Erreurs fréquentes
        </h2>
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: "#fff", border: "1px solid rgba(232,98,12,0.18)" }}
        >
          {contenu.erreurs.map((err, i) => (
            <div
              key={err.titre}
              className="flex items-start gap-3.5 px-5 py-4"
              style={i > 0 ? { borderTop: "1px solid rgba(232,98,12,0.14)" } : undefined}
            >
              {/* La croix est DESSINÉE, pas écrite. Un « ✕ » posé dans le
                  flux se recolle au titre dès qu'on extrait le texte de la
                  page, et c'est exactement ce que le contrôle d'espacement
                  attrape. Un SVG est un graphique : il ne laisse rien
                  derrière lui dans le texte, et il est déjà décoratif. */}
              <svg
                aria-hidden
                viewBox="0 0 16 16"
                className="shrink-0"
                style={{ width: 16, height: 16, marginTop: 4, stroke: "#E8620C", strokeWidth: 2.2, strokeLinecap: "round" }}
              >
                <line x1="4" y1="4" x2="12" y2="12" />
                <line x1="12" y1="4" x2="4" y2="12" />
              </svg>
              <div>
                <p className="text-[1rem] font-semibold mb-1" style={{ color: "#1A1535" }}>
                  {err.titre}
                </p>
                <p className="text-[0.95rem] leading-[1.6]" style={{ color: "#4A5568" }}>
                  {err.pourquoi}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Variantes */}
        <h2 className="mt-12 mb-5 text-[1.45rem] font-medium" style={{ color: "#2D2150" }}>
          Variantes et progressions
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {contenu.variantes.map((v) => (
            <CarteVariante key={v.exercice} variante={v} />
          ))}
        </div>

        {/* Placement */}
        <h2 className="mt-12 mb-3 text-[1.45rem] font-medium" style={{ color: "#2D2150" }}>
          Où le placer dans ta séance
        </h2>
        <p className="text-[1.02rem] leading-[1.7]" style={{ color: "#4A5568" }}>
          {contenu.placement}
        </p>
      </div>

      {/* ── Le CTA, une seule fois, après avoir donné la réponse ─── */}
      <section
        className="mt-16 rounded-3xl px-7 py-10"
        style={{
          background: "linear-gradient(135deg,rgba(212,192,255,0.55),rgba(245,230,163,0.45))",
          border: "1px solid rgba(255,255,255,0.9)",
          boxShadow: "0 12px 40px rgba(167,139,250,0.18)",
        }}
      >
        <p className="text-[13px] font-semibold mb-2" style={{ color: "#7C5CFA" }}>✦ Vaiiya</p>
        <h2 className="text-2xl font-light mb-2 max-w-[520px]" style={{ color: "#1A1535" }}>
          Une séance {categorie.toLowerCase()} construite autour de ce mouvement
        </h2>
        <p className="text-sm mb-6 max-w-[520px]" style={{ color: "#4A5568" }}>
          Dis ton matériel et ton niveau, Vaiiya compose la séance et te guide pendant l&apos;effort,
          avec ces mêmes personnages. Gratuit.
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
          Créer ma séance →
        </Link>
      </section>

      {/* ── Les voisins ──────────────────────────────────────────────
          Uniquement des fiches publiées, donc toutes cliquables. Quand la
          zone n'en a pas d'autre, la section entière disparaît : une
          rangée de vignettes qui ne mènent nulle part se lirait comme un
          catalogue en travaux. Le lien vers le hub, lui, reste toujours
          là, sinon la fiche deviendrait un cul-de-sac. */}
      {voisins.length > 0 && (
        <section className="mt-16">
          <h2 className="text-[1.35rem] font-medium mb-5" style={{ color: "#2D2150" }}>
            Les autres exercices {categorie.toLowerCase()}
          </h2>
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            {voisins.map((v) => (
              <CarteExercice key={v.slug} lib={v.lib} href={`/exercices/${v.slug}`} taille={124} />
            ))}
          </div>
        </section>
      )}

      <p className="mt-12 text-sm">
        <Link href="/exercices" className="font-medium hover:underline" style={{ color: "#7C5CFA" }}>
          Voir tous les exercices
        </Link>
      </p>
    </PageVitrine>
  );
}

/* ─────────────────────────── Pièces ─────────────────────────────── */

/** « Comment faire le développé couché » / « … les burpees ».
    Le titre le plus cherché commence par « comment faire », et il sonne
    faux sans son article. Une table serait un mensonge de plus à tenir :
    la règle se déduit du nom, et les cas irréguliers sont nommés ici. */
function motDeLExercice(nom: string): string {
  const pluriel = /s$/.test(nom) && !/^(gainage|squat)/i.test(nom);
  if (pluriel) return `les ${nom.toLowerCase()}`;
  return `le ${nom.charAt(0).toLowerCase()}${nom.slice(1)}`;
}

function CarteVariante({ variante }: { variante: Variante }) {
  const lib = trouverExercice(variante.exercice);
  if (!lib) return null;

  const slug = slugDeLExercice(lib.name);

  const corps = (
    <>
      <div className="flex items-center gap-3 mb-3">
        <div
          className="shrink-0 rounded-2xl flex items-center justify-center"
          style={{
            width: 76,
            height: 76,
            background: "radial-gradient(circle at 50% 46%, rgba(139,92,246,0.13), rgba(139,92,246,0) 70%)",
          }}
        >
          <AnimationExercice nom={lib.name} taille={76} label={labelAnimation(lib.name)} />
        </div>
        <div>
          {/* L'étiquette dit EN QUOI la variante diffère, pas si elle est
              plus facile. Elle portait « Plus facile » en teal et « Plus
              difficile » en orange : deux couleurs opposées installaient
              une échelle de difficulté qui n'est vraie pour personne en
              particulier. Un seul violet, neutre, et c'est le texte qui
              renseigne. */}
          <p
            className="text-[10.5px] font-bold tracking-[0.16em] uppercase mb-1"
            style={{ color: "#A78BFA" }}
          >
            {variante.angle}
          </p>
          <p className="text-[15px] font-semibold leading-tight" style={{ color: "#1A1535" }}>
            {lib.name}
          </p>
        </div>
      </div>
      <p className="text-[0.93rem] leading-[1.6]" style={{ color: "#4A5568" }}>
        {variante.texte}
      </p>
    </>
  );

  const style = {
    background: "#fff",
    border: "1px solid rgba(167,139,250,0.18)",
    boxShadow: "0 6px 24px rgba(90,60,180,0.06)",
  } as const;

  /* La variante n'a pas toujours sa propre fiche. Elle reste alors une
     carte informative : l'animation et l'explication suffisent, et un
     lien vers une page qui n'existe pas ne rendrait service à personne. */
  return slug ? (
    <Link href={`/exercices/${slug}`} className="block rounded-2xl p-5 transition-transform hover:-translate-y-0.5" style={style}>
      {corps}
    </Link>
  ) : (
    <div className="rounded-2xl p-5" style={style}>{corps}</div>
  );
}
