import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageVitrine } from "@/components/seo/VitrineChrome";
import { REPOS } from "@/lib/collectionsRecettes";
import {
  descriptionRecette, difficulteDite, dureeDite, ligneIngredient, natureDite, quantite, recetteParSlug,
  recettesPubliees, regimesDits, schemaRecette, titleRecette, typoFr, voisines,
} from "@/lib/recettesPubliques";

/* ════════════════════════════════════════════════════════════════════
   LA PAGE PUBLIQUE D'UNE RECETTE (vague 3 de la bibliothèque publique).

   La recette en entier, lisible sans compte : la photo, le temps, les
   valeurs par portion, les ingrédients et les étapes. Dans l'application,
   la même recette s'ajoute au journal d'un geste, se garde en favori et
   s'ajuste au nombre de portions.

   Données structurées `Recipe` (Google affiche encore les recettes en
   résultat enrichi), sans note ni avis : il n'en existe pas.
   ════════════════════════════════════════════════════════════════════ */

const NB = String.fromCharCode(160);

export const dynamicParams = false;

export function generateStaticParams() {
  return recettesPubliees().map((r) => ({ slug: r.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const r = recetteParSlug(slug);
  if (!r) return {};
  const url = `https://vaiiya.fr/recettes/${r.id}`;
  return {
    title: titleRecette(r),
    description: descriptionRecette(r),
    alternates: { canonical: url },
    openGraph: { title: r.nom, description: typoFr(r.description), url, images: [r.image] },
  };
}

export default async function RecettePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const r = recetteParSlug(slug);
  if (!r) notFound();

  const nature = natureDite(r);
  const regimes = regimesDits(r);
  const repos = REPOS[r.id];
  const autres = voisines(r);

  const lignes: [string, string][] = [
    ["Temps", dureeDite(r)],
    ["Préparation", `${r.prepMin}${NB}min${r.cookMin ? ` · cuisson ${r.cookMin}${NB}min` : ""}`],
    ["Portions", String(r.portions)],
    ["Difficulté", difficulteDite(r)],
  ];

  const macros = [
    { cle: "Calories", valeur: `${r.calories}`, unite: "kcal" },
    { cle: "Protéines", valeur: `${r.proteins}`, unite: "g" },
    { cle: "Glucides", valeur: `${r.carbs}`, unite: "g" },
    { cle: "Lipides", valeur: `${r.fats}`, unite: "g" },
  ];

  const filAriane = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: "https://vaiiya.fr" },
      { "@type": "ListItem", position: 2, name: "Recettes", item: "https://vaiiya.fr/recettes" },
      { "@type": "ListItem", position: 3, name: r.nom, item: `https://vaiiya.fr/recettes/${r.id}` },
    ],
  };

  return (
    <PageVitrine largeur="max-w-5xl">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(filAriane) }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaRecette(r)).replace(/</g, "\\u003c") }}
      />

      <nav aria-label="Fil d’Ariane" className="mb-7 text-[13px]" style={{ color: "#8B84A8" }}>
        <Link href="/" className="hover:underline">Accueil</Link>
        <span className="mx-1.5">›</span>
        <Link href="/recettes" className="hover:underline">Recettes</Link>
        <span className="mx-1.5">›</span>
        <span style={{ color: "#4A5568" }}>{r.nom}</span>
      </nav>

      <section className="grid gap-5 md:gap-x-12 md:gap-y-4 md:grid-cols-[minmax(0,440px)_1fr] md:items-start">
        <div className="order-1 md:order-none md:col-start-2 md:row-start-1">
          <p className="text-[11px] font-bold tracking-[0.22em] uppercase mb-3" style={{ color: "#A78BFA" }}>
            {nature.categorie}{regimes.length ? ` · ${regimes.join(" · ")}` : ""}
          </p>
          <h1
            className="font-light leading-[1.05]"
            style={{ fontSize: "clamp(2.125rem,6.5vw,2.9rem)", letterSpacing: "-0.015em", color: "#1A1535" }}
          >
            {r.nom}
          </h1>
        </div>

        <div
          className="order-2 md:order-none md:col-start-1 md:row-start-1 md:row-span-2 md:self-start relative w-full overflow-hidden rounded-[28px] mx-auto"
          style={{ maxWidth: 440, aspectRatio: "1 / 1", background: "#EEE8F8" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={r.image}
            alt={r.nom}
            width={800}
            height={800}
            fetchPriority="high"
            className="absolute inset-0 w-full h-full"
            style={{ objectFit: "cover" }}
          />
        </div>

        <div className="order-3 md:order-none md:col-start-2 md:row-start-2">
          <p className="text-[1.25rem] leading-[1.6] mb-6" style={{ color: "#4A5568" }}>
            {typoFr(r.description)}
          </p>
          <dl className="text-[13px]">
            {lignes.map(([cle, valeur], i) => (
              <div
                key={cle}
                className="flex gap-4 py-2.5"
                style={i > 0 ? { borderTop: "1px solid rgba(167,139,250,0.16)" } : undefined}
              >
                <dt className="w-[96px] shrink-0" style={{ color: "#8B84A8" }}>{cle}</dt>
                <dd className="font-medium" style={{ color: "#2D2150" }}>{typoFr(valeur)}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ── Les valeurs par portion ───────────────────────────────────── */}
      <section className="mt-10">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-[760px]">
          {macros.map((m) => (
            <div
              key={m.cle}
              className="rounded-2xl px-4 py-3.5"
              style={{ background: "#fff", border: "1px solid rgba(167,139,250,0.16)" }}
            >
              <p className="text-[11px] font-semibold" style={{ color: "#8B84A8" }}>{m.cle}</p>
              <p className="mt-0.5" style={{ color: "#1A1535" }}>
                <span className="vy-nombre text-[26px]">{m.valeur}</span>
                <span className="text-[13px] ml-1" style={{ color: "#4A5568" }}>{m.unite}</span>
              </p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[13px]" style={{ color: "#8B84A8" }}>
          Pour une portion, calculé à partir des ingrédients.
        </p>
      </section>

      <div className="mt-12 grid gap-10 md:grid-cols-[minmax(0,320px)_1fr] max-w-[960px]">
        <div>
          <h2 className="mb-4 text-[1.625rem] font-medium" style={{ color: "#2D2150" }}>
            Ingrédients
          </h2>
          <p className="mb-3 text-[13px]" style={{ color: "#8B84A8" }}>
            Pour {r.portions}{NB}portion{r.portions > 1 ? "s" : ""}
          </p>
          <ul className="rounded-2xl overflow-hidden" style={{ background: "#fff", border: "1px solid rgba(167,139,250,0.18)" }}>
            {r.ingredients.map((ing, i) => {
              const q = quantite(r, i);
              return (
                <li
                  key={`${ing.nom}-${i}`}
                  className="flex gap-3 px-4 py-2.5 text-[1rem]"
                  style={i > 0 ? { borderTop: "1px solid rgba(167,139,250,0.12)" } : undefined}
                >
                  <span className="w-[84px] shrink-0 font-semibold" style={{ color: "#7C5CFA" }}>
                    {q === "—" ? "" : typoFr(q)}
                  </span>
                  <span style={{ color: "#2D2150" }}>{typoFr(q === "—" ? ligneIngredient(r, i) : ing.nom)}</span>
                </li>
              );
            })}
          </ul>
          {r.ustensiles.length > 0 && (
            <>
              <h3 className="mt-6 mb-2 text-[16px] font-semibold" style={{ color: "#2D2150" }}>Ustensiles</h3>
              <p className="text-[1rem] leading-[1.6]" style={{ color: "#4A5568" }}>
                {typoFr(r.ustensiles.map((u, i) => (i ? u.charAt(0).toLocaleLowerCase("fr-FR") + u.slice(1) : u)).join(", "))}
              </p>
            </>
          )}
        </div>

        <div>
          <h2 className="mb-5 text-[1.625rem] font-medium" style={{ color: "#2D2150" }}>
            Étapes
          </h2>
          <ol className="list-none p-0 m-0">
            {r.steps.map((s, i) => (
              <li key={i} className="relative pl-12 pb-6">
                <span
                  className="absolute left-0 top-0 flex items-center justify-center rounded-full text-[13px] font-bold"
                  style={{ width: 30, height: 30, background: "rgba(139,92,246,0.12)", color: "#7C5CFA" }}
                >
                  {i + 1}
                </span>
                <p className="text-[1rem] leading-[1.7]" style={{ color: "#4A5568" }}>{typoFr(s)}</p>
              </li>
            ))}
          </ol>
          {repos?.texte && (
            <p className="text-[13px] leading-[1.6]" style={{ color: "#8B84A8" }}>
              {typoFr(`À prévoir : ${repos.texte}.`)}
            </p>
          )}
        </div>
      </div>

      {autres.length > 0 && (
        <section className="mt-16">
          <h2 className="text-[1.625rem] font-medium mb-5" style={{ color: "#2D2150" }}>
            D’autres idées
          </h2>
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3">
            {autres.map((a) => (
              <Link
                key={a.id}
                href={`/recettes/${a.id}`}
                className="block rounded-3xl overflow-hidden transition-transform hover:-translate-y-0.5"
                style={{ background: "#fff", border: "1px solid rgba(167,139,250,0.16)", boxShadow: "0 6px 24px rgba(90,60,180,0.07)" }}
              >
                <span className="relative block" style={{ aspectRatio: "1 / 1", background: "#EEE8F8" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={a.image} alt="" width={400} height={400} loading="lazy" className="absolute inset-0 w-full h-full" style={{ objectFit: "cover" }} />
                </span>
                <span className="block p-3.5">
                  <span className="block text-[16px] font-semibold leading-snug" style={{ color: "#1A1535" }}>{a.nom}</span>
                  <span className="block mt-1 text-[13px]" style={{ color: "#8B84A8" }}>
                    {typoFr(dureeDite(a))} · {a.calories}{NB}kcal
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
          Garde cette recette dans Vaiiya
        </h2>
        <p className="text-[16px] mb-6 max-w-[520px]" style={{ color: "#4A5568" }}>
          Avec ton compte gratuit, une recette s’ajoute à ton journal d’un geste, se garde en favori et s’ajuste au nombre de portions.
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
        <Link href="/recettes" className="hover:underline">← Toutes les recettes</Link>
      </p>
    </PageVitrine>
  );
}
