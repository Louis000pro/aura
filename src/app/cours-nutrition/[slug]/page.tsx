import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageVitrine } from "@/components/seo/VitrineChrome";
import { imageRecette, recettesDe } from "@/lib/collectionsRecettes";
import { COURS, NOM_FORMAT, THEMES_COURS, chargerTexte, dateLisible, typoCours, type Cours } from "@/lib/coursNutrition";
import { dureeDite } from "@/lib/recettesPubliques";
import { VENTE_OUVERTE } from "@/lib/plans";

/* ════════════════════════════════════════════════════════════════════
   LA PAGE PUBLIQUE D'UN COURS DE NUTRITION (vague 3 de la bibliothèque
   publique).

   Un cours gratuit se lit en entier, sources comprises : c'est le même
   texte que dans l'application (`lib/textesCours/<id>.ts`), avec sa date
   de vérification. Un cours Vaiiya+ se lit en aperçu, comme dans
   l'application pour un compte gratuit (`ApercuCours`) : l'introduction
   et les premières parties, sans la suite.

   ⚠️ L'adresse est l'identifiant du cours, figé pour toujours.
   ⚠️ /nutrition est un écran de l'application : les cours vivent donc
   sous /cours-nutrition.
   ════════════════════════════════════════════════════════════════════ */

const NB = String.fromCharCode(160);

export const dynamicParams = false;

export function generateStaticParams() {
  return COURS.map((c) => ({ slug: c.id }));
}

const coursParId = (id: string): Cours | null => COURS.find((c) => c.id === id) ?? null;
const ouvert = (c: Cours) => c.acces === "gratuit";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const c = coursParId(slug);
  if (!c) return {};
  const url = `https://vaiiya.fr/cours-nutrition/${c.id}`;
  return {
    title: typoCours(c.titre),
    description: typoCours(c.sousTitre),
    alternates: { canonical: url },
    openGraph: { title: typoCours(c.titre), description: typoCours(c.sousTitre), url, images: [imageRecette(c.photo)] },
  };
}

function Encadre({ titre, couleur, fond, children }: { titre: string; couleur: string; fond: string; children: ReactNode }) {
  return (
    <section className="mt-8 rounded-2xl px-6 py-5" style={{ background: fond, borderLeft: `3px solid ${couleur}` }}>
      <h2 className="text-[11px] font-bold tracking-[0.18em] uppercase mb-2" style={{ color: couleur }}>{titre}</h2>
      {children}
    </section>
  );
}

export default async function CoursPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const c = coursParId(slug);
  if (!c) notFound();

  const texte = await chargerTexte(c.id);
  const format = NOM_FORMAT[c.format];
  const theme = THEMES_COURS.find((t) => t.id === c.theme)?.nom ?? "";
  const libre = ouvert(c);
  const memeTheme = COURS.filter((x) => x.theme === c.theme && x.id !== c.id).slice(0, 3);
  const recettes = libre && c.envie ? recettesDe(c.envie).slice(0, 3) : [];

  const filAriane = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: "https://vaiiya.fr" },
      { "@type": "ListItem", position: 2, name: "Cours de nutrition", item: "https://vaiiya.fr/cours-nutrition" },
      { "@type": "ListItem", position: 3, name: typoCours(c.titre), item: `https://vaiiya.fr/cours-nutrition/${c.id}` },
    ],
  };
  const article = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: typoCours(c.titre),
    description: typoCours(c.sousTitre),
    image: [`https://vaiiya.fr${imageRecette(c.photo)}`],
    inLanguage: "fr",
    dateModified: c.verifieLe,
    author: { "@type": "Organization", name: "Vaiiya", url: "https://vaiiya.fr" },
    publisher: { "@type": "Organization", name: "Vaiiya", url: "https://vaiiya.fr" },
    mainEntityOfPage: `https://vaiiya.fr/cours-nutrition/${c.id}`,
  };

  const p = (s: string, i: number) => (
    <p key={i} className="text-[1rem] leading-[1.75] mb-4" style={{ color: "#4A5568" }}>{typoCours(s)}</p>
  );

  return (
    <PageVitrine largeur="max-w-5xl">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(filAriane) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(article).replace(/</g, "\\u003c") }} />

      <nav aria-label="Fil d’Ariane" className="mb-7 text-[13px]" style={{ color: "#8B84A8" }}>
        <Link href="/" className="hover:underline">Accueil</Link>
        <span className="mx-1.5">›</span>
        <Link href="/cours-nutrition" className="hover:underline">Cours de nutrition</Link>
      </nav>

      <article className="max-w-[680px]">
        <p className="text-[11px] font-bold tracking-[0.22em] uppercase mb-3" style={{ color: "#A78BFA" }}>
          {format.titre}
          {libre ? "" : " Vaiiya+"} · {c.minutes}{NB}min · {theme}
        </p>
        <h1
          className="font-light leading-[1.1]"
          style={{ fontSize: "clamp(2rem,6.5vw,2.75rem)", letterSpacing: "-0.015em", color: "#1A1535" }}
        >
          {typoCours(c.titre)}
        </h1>
        <p className="mt-4 text-[1.125rem] leading-[1.6]" style={{ color: "#4A5568" }}>
          {typoCours(c.sousTitre)}
        </p>

        <div className="mt-8">{(libre ? texte.intro : texte.intro.slice(0, 1)).map(p)}</div>

        <div className="my-8 relative w-full overflow-hidden rounded-[22px]" style={{ aspectRatio: "16 / 9", background: "#EEE8F8" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageRecette(c.photo)} alt="" width={800} height={450} className="absolute inset-0 w-full h-full" style={{ objectFit: "cover" }} />
        </div>

        {libre ? (
          <>
            {texte.sections.map((s) => (
              <section key={s.titre}>
                <h2 className="mt-10 mb-4 text-[1.5rem] font-medium" style={{ color: "#2D2150" }}>{typoCours(s.titre)}</h2>
                {s.paragraphes.map(p)}
              </section>
            ))}

            {texte.exemple && texte.exemple.length > 0 && (
              <Encadre titre="Un exemple" couleur="#7C5CFA" fond="rgba(139,92,246,0.07)">
                {texte.exemple.map((s, i) => (
                  <p key={i} className="text-[1rem] leading-[1.7] mb-2" style={{ color: "#2D2150" }}>{typoCours(s)}</p>
                ))}
              </Encadre>
            )}
            {texte.doute && texte.doute.length > 0 && (
              <Encadre titre="Ce qu’on ne sait pas encore" couleur="#8B84A8" fond="rgba(139,132,168,0.08)">
                {texte.doute.map((s, i) => (
                  <p key={i} className="text-[1rem] leading-[1.7] mb-2" style={{ color: "#2D2150" }}>{typoCours(s)}</p>
                ))}
              </Encadre>
            )}
            <Encadre titre="À retenir" couleur="#12A67C" fond="rgba(43,212,160,0.08)">
              <p className="text-[1rem] leading-[1.7]" style={{ color: "#2D2150" }}>{typoCours(texte.retenir)}</p>
            </Encadre>
            {texte.essai && (
              <Encadre titre="Essaie ça" couleur="#B9770E" fond="rgba(245,177,32,0.09)">
                <p className="text-[1rem] leading-[1.7]" style={{ color: "#2D2150" }}>{typoCours(texte.essai)}</p>
              </Encadre>
            )}

            <section className="mt-12">
              <h2 className="mb-3 text-[1.25rem] font-medium" style={{ color: "#2D2150" }}>Sources</h2>
              {texte.sources.map((g) => (
                <div key={g.groupe} className="mb-4">
                  <p className="text-[13px] font-semibold mb-1.5" style={{ color: "#8B84A8" }}>{typoCours(g.groupe)}</p>
                  <ul className="list-none p-0 m-0">
                    {g.liens.map((l) => (
                      <li key={l.url} className="text-[13px] leading-[1.6] mb-1">
                        <a href={l.url} rel="noopener" className="hover:underline" style={{ color: "#6B46C1" }}>{typoCours(l.label)}</a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              <p className="text-[13px]" style={{ color: "#8B84A8" }}>Sources relues le {dateLisible(c.verifieLe)}.</p>
            </section>
          </>
        ) : (
          <>
            {texte.sections.length > 0 && (
              <section className="rounded-2xl overflow-hidden" style={{ background: "#fff", border: "1px solid rgba(167,139,250,0.18)" }}>
                <p className="px-5 pt-4 text-[13px] font-semibold" style={{ color: "#8B84A8" }}>Dans ce {format.un}</p>
                {texte.sections.slice(0, 3).map((s, i) => (
                  <p key={s.titre} className="px-5 py-3 text-[1rem] font-semibold" style={{ color: "#2D2150", borderTop: i ? "1px solid rgba(167,139,250,0.12)" : undefined }}>
                    <span className="vy-nombre mr-2" style={{ color: "#7C5CFA" }}>{i + 1}</span>{" "}
                    {typoCours(s.titre)}
                  </p>
                ))}
              </section>
            )}
            <p className="mt-5 text-[1rem] leading-[1.7]" style={{ color: "#4A5568" }}>
              {VENTE_OUVERTE
                ? "La suite de ce cours se lit dans Vaiiya, avec Vaiiya+."
                : "La suite de ce cours fera partie de Vaiiya+, qui n’est pas encore ouvert à l’abonnement. Les cours gratuits, eux, se lisent en entier."}
            </p>
          </>
        )}
      </article>

      {recettes.length > 0 && (
        <section className="mt-14">
          <h2 className="text-[1.5rem] font-medium mb-5" style={{ color: "#2D2150" }}>Des recettes pour aller avec</h2>
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 max-w-[860px]">
            {recettes.map((r) => (
              <Link
                key={r.id}
                href={`/recettes/${r.id}`}
                className="block rounded-3xl overflow-hidden transition-transform hover:-translate-y-0.5"
                style={{ background: "#fff", border: "1px solid rgba(167,139,250,0.16)" }}
              >
                <span className="relative block" style={{ aspectRatio: "1 / 1", background: "#EEE8F8" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={r.image} alt="" width={400} height={400} loading="lazy" className="absolute inset-0 w-full h-full" style={{ objectFit: "cover" }} />
                </span>
                <span className="block p-3.5">
                  <span className="block text-[15px] font-semibold leading-snug" style={{ color: "#1A1535" }}>{r.nom}</span>
                  <span className="block mt-1 text-[13px]" style={{ color: "#8B84A8" }}>{typoCours(dureeDite(r))} · {r.calories}{NB}kcal</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {memeTheme.length > 0 && (
        <section className="mt-14">
          <h2 className="text-[1.5rem] font-medium mb-5" style={{ color: "#2D2150" }}>Dans le même thème</h2>
          <div className="grid gap-4 sm:grid-cols-3 max-w-[860px]">
            {memeTheme.map((x) => (
              <Link
                key={x.id}
                href={`/cours-nutrition/${x.id}`}
                className="block rounded-3xl p-5 transition-transform hover:-translate-y-0.5"
                style={{ background: "#fff", border: "1px solid rgba(167,139,250,0.16)" }}
              >
                <span className="block text-[11px] font-semibold mb-1" style={{ color: "#8B84A8" }}>
                  {NOM_FORMAT[x.format].titre}{x.acces === "gratuit" ? "" : " Vaiiya+"} · {x.minutes}{NB}min
                </span>
                <span className="block text-[16px] font-semibold leading-snug" style={{ color: "#1A1535" }}>{typoCours(x.titre)}</span>
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
          Les cours et les recettes, au même endroit
        </h2>
        <p className="text-[16px] mb-6 max-w-[520px]" style={{ color: "#4A5568" }}>
          Dans Vaiiya, ces cours se lisent à côté de ton journal de repas, et beaucoup mènent vers des recettes qui vont avec.
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
        <Link href="/cours-nutrition" className="hover:underline">← Tous les cours de nutrition</Link>
      </p>
    </PageVitrine>
  );
}
