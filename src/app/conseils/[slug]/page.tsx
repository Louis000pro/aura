import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageVitrine } from "@/components/seo/VitrineChrome";
import { typoCours } from "@/lib/coursNutrition";
import { VENTE_OUVERTE } from "@/lib/plans";
import { conseilParSlug, conseilsPublies, slugConseil, verifierConseils } from "@/lib/conseilsPublics";

/* ════════════════════════════════════════════════════════════════════
   LA PAGE PUBLIQUE D'UN MINI-COURS D'ENTRAÎNEMENT.

   Le même texte que le lecteur de l'application (`AdviceReaderSheet`) :
   l'introduction, les parties, l'exemple concret, « À retenir », « Essaie
   ça » et les sources. Un mini-cours Vaiiya+ se lit en aperçu.
   ════════════════════════════════════════════════════════════════════ */

const NB = String.fromCharCode(160);

export const dynamicParams = false;

export function generateStaticParams() {
  return conseilsPublies().map((a) => ({ slug: slugConseil(a) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const a = conseilParSlug(slug);
  if (!a) return {};
  const url = `https://vaiiya.fr/conseils/${slug}`;
  return {
    title: typoCours(a.title),
    description: typoCours(a.subtitle),
    alternates: { canonical: url },
    openGraph: { title: typoCours(a.title), description: typoCours(a.subtitle), url, images: [`/entrainement/${a.image}.webp`] },
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

export default async function ConseilPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const soucis = verifierConseils();
  if (soucis.length) throw new Error(`Mini-cours publics : ${soucis.join(" | ")}`);

  const { slug } = await params;
  const a = conseilParSlug(slug);
  if (!a) notFound();

  const libre = a.access === "free";
  const memeTheme = conseilsPublies().filter((x) => x.theme === a.theme && x.id !== a.id).slice(0, 3);

  const filAriane = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: "https://vaiiya.fr" },
      { "@type": "ListItem", position: 2, name: "Conseils", item: "https://vaiiya.fr/conseils" },
      { "@type": "ListItem", position: 3, name: typoCours(a.title), item: `https://vaiiya.fr/conseils/${slug}` },
    ],
  };
  const article = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: typoCours(a.title),
    description: typoCours(a.subtitle),
    image: [`https://vaiiya.fr/entrainement/${a.image}.webp`],
    inLanguage: "fr",
    author: { "@type": "Organization", name: "Vaiiya", url: "https://vaiiya.fr" },
    publisher: { "@type": "Organization", name: "Vaiiya", url: "https://vaiiya.fr" },
    mainEntityOfPage: `https://vaiiya.fr/conseils/${slug}`,
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
        <Link href="/conseils" className="hover:underline">Conseils</Link>
      </nav>

      <article className="max-w-[680px]">
        <p className="text-[11px] font-bold tracking-[0.22em] uppercase mb-3" style={{ color: "#A78BFA" }}>
          {a.theme}{libre ? "" : " · Vaiiya+"} · {a.readingMinutes}{NB}min de lecture
        </p>
        <h1
          className="font-light leading-[1.1]"
          style={{ fontSize: "clamp(2.125rem,6.5vw,2.75rem)", letterSpacing: "-0.015em", color: "#1A1535" }}
        >
          {typoCours(a.title)}
        </h1>
        <p className="mt-4 text-[1.25rem] leading-[1.6]" style={{ color: "#4A5568" }}>{typoCours(a.subtitle)}</p>

        <div className="mt-8">{p(a.intro, 0)}</div>

        <div className="my-8 relative w-full overflow-hidden rounded-[22px]" style={{ aspectRatio: "16 / 9", background: "#1A1424" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/entrainement/${a.image}.webp`}
            alt=""
            width={800}
            height={450}
            className="absolute inset-0 w-full h-full"
            style={{ objectFit: "cover", objectPosition: a.imagePosition ?? "50% 35%" }}
          />
        </div>

        {libre ? (
          <>
            {a.sections.map((s) => (
              <section key={s.title}>
                <h2 className="mt-10 mb-4 text-[1.625rem] font-medium" style={{ color: "#2D2150" }}>{typoCours(s.title)}</h2>
                {s.paragraphs.map(p)}
                {s.bullets && s.bullets.length > 0 && (
                  <ul className="mb-4 pl-5 list-disc">
                    {s.bullets.map((b, i) => (
                      <li key={i} className="text-[1rem] leading-[1.7] mb-1.5" style={{ color: "#4A5568" }}>{typoCours(b)}</li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
            <Encadre titre="Exemple concret" couleur="#7C5CFA" fond="rgba(139,92,246,0.07)">
              <p className="text-[1rem] leading-[1.7]" style={{ color: "#2D2150" }}>{typoCours(a.example)}</p>
            </Encadre>
            <Encadre titre="À retenir" couleur="#12A67C" fond="rgba(43,212,160,0.08)">
              <p className="text-[1rem] leading-[1.7]" style={{ color: "#2D2150" }}>{typoCours(a.takeaway)}</p>
            </Encadre>
            <Encadre titre="Essaie ça" couleur="#B9770E" fond="rgba(245,177,32,0.09)">
              <p className="text-[1rem] leading-[1.7]" style={{ color: "#2D2150" }}>{typoCours(a.tryThis)}</p>
            </Encadre>
            {a.sources.length > 0 && (
              <section className="mt-12">
                <h2 className="mb-3 text-[1.25rem] font-medium" style={{ color: "#2D2150" }}>Sources</h2>
                <ul className="list-none p-0 m-0">
                  {a.sources.map((s) => (
                    <li key={s.url} className="text-[13px] leading-[1.6] mb-1">
                      <a href={s.url} rel="noopener" className="hover:underline" style={{ color: "#6B46C1" }}>{typoCours(s.label)}</a>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        ) : (
          <>
            <section className="rounded-2xl overflow-hidden" style={{ background: "#fff", border: "1px solid rgba(167,139,250,0.18)" }}>
              <p className="px-5 pt-4 text-[13px] font-semibold" style={{ color: "#8B84A8" }}>Dans ce mini-cours</p>
              {a.sections.slice(0, 3).map((s, i) => (
                <p key={s.title} className="px-5 py-3 text-[1rem] font-semibold" style={{ color: "#2D2150", borderTop: i ? "1px solid rgba(167,139,250,0.12)" : undefined }}>
                  <span className="vy-nombre mr-2" style={{ color: "#7C5CFA" }}>{i + 1}</span>{" "}
                  {typoCours(s.title)}
                </p>
              ))}
            </section>
            <p className="mt-5 text-[1rem] leading-[1.7]" style={{ color: "#4A5568" }}>
              {VENTE_OUVERTE
                ? "La suite de ce mini-cours se lit dans Vaiiya, avec Vaiiya+."
                : "La suite de ce mini-cours fera partie de Vaiiya+, qui n’est pas encore ouvert à l’abonnement. Les mini-cours gratuits, eux, se lisent en entier."}
            </p>
          </>
        )}
      </article>

      {memeTheme.length > 0 && (
        <section className="mt-14">
          <h2 className="text-[1.625rem] font-medium mb-5" style={{ color: "#2D2150" }}>Dans le même thème</h2>
          <div className="grid gap-4 sm:grid-cols-3 max-w-[860px]">
            {memeTheme.map((x) => (
              <Link
                key={x.id}
                href={`/conseils/${slugConseil(x)}`}
                className="block rounded-3xl p-5 transition-transform hover:-translate-y-0.5"
                style={{ background: "#fff", border: "1px solid rgba(167,139,250,0.16)" }}
              >
                <span className="block text-[11px] font-semibold mb-1" style={{ color: "#8B84A8" }}>
                  {x.readingMinutes}{NB}min{x.access === "free" ? "" : " · Vaiiya+"}
                </span>
                <span className="block text-[16px] font-semibold leading-snug" style={{ color: "#1A1535" }}>{typoCours(x.title)}</span>
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
          Passe de la lecture à la séance
        </h2>
        <p className="text-[16px] mb-6 max-w-[520px]" style={{ color: "#4A5568" }}>
          Avec ton compte gratuit, ces mini-cours se lisent à côté des séances guidées et du coach IA.
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
        <Link href="/conseils" className="hover:underline">← Tous les conseils</Link>
      </p>
    </PageVitrine>
  );
}
