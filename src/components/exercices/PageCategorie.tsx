import Link from "next/link";
import { PageVitrine } from "@/components/seo/VitrineChrome";
import CarteExercice from "@/components/exercices/CarteExercice";
import { libelleCategorie } from "@/lib/exercicesPublics";
import { categoriesPubliees, type PageCategorieExercices } from "@/lib/categoriesExercices";

/* La page d'une catégorie de la bibliothèque (/exercices/abdos…).

   Le même dessin que le hub, pour une seule zone : l'ouverture, la grille
   des fiches, les autres zones, puis l'appel à créer son compte, une seule
   fois, après avoir donné les fiches. Aucune carte de plus que le hub :
   la page ne montre que des fiches publiées, toutes cliquables. */
export default function PageCategorie({ categorie }: { categorie: PageCategorieExercices }) {
  const autres = categoriesPubliees().filter((c) => c.id !== categorie.id);
  const url = `https://vaiiya.fr/exercices/${categorie.id}`;

  const filAriane = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: "https://vaiiya.fr" },
      { "@type": "ListItem", position: 2, name: "Exercices", item: "https://vaiiya.fr/exercices" },
      { "@type": "ListItem", position: 3, name: categorie.label, item: url },
    ],
  };

  return (
    <PageVitrine largeur="max-w-5xl">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(filAriane) }}
      />

      <nav aria-label="Fil d’Ariane" className="mb-7 text-[13px]" style={{ color: "#8B84A8" }}>
        <Link href="/" className="hover:underline">Accueil</Link>
        <span className="mx-1.5">›</span>
        <Link href="/exercices" className="hover:underline">Exercices</Link>
        <span className="mx-1.5">›</span>
        <span style={{ color: "#4A5568" }}>{categorie.label}</span>
      </nav>

      {/* ── Ouverture ────────────────────────────────────────────── */}
      <section className="mb-10">
        <p className="text-[11px] font-bold tracking-[0.22em] uppercase mb-3" style={{ color: "#A78BFA" }}>
          La bibliothèque · {categorie.fiches.length} exercices
        </p>
        <h1
          className="font-light leading-[1.08] mb-4"
          style={{ fontSize: "clamp(2.125rem,6vw,2.9rem)", letterSpacing: "-0.01em", color: "#1A1535" }}
        >
          {categorie.h1}
        </h1>
        <p className="max-w-[640px] text-[1rem] leading-[1.65]" style={{ color: "#4A5568" }}>
          {categorie.intro} Chaque fiche montre le geste, les muscles sollicités, le matériel,
          l’exécution et les erreurs fréquentes.
        </p>
      </section>

      {/* ── Les fiches ─────────────────────────────────────────────── */}
      <section>
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          {categorie.fiches.map((f, i) => (
            <CarteExercice
              key={f.slug}
              lib={f.lib}
              href={`/exercices/${f.slug}`}
              materiel={f.contenu.materielCourt}
              zone={libelleCategorie(f.categorie)}
              sansZone
              priorite={i < 4}
            />
          ))}
        </div>
      </section>

      {/* ── Les autres zones ───────────────────────────────────────
          Des liens en texte, sans pastille : ce sont des chemins, pas des
          filtres. Le hub reste toujours au bout de la ligne. */}
      <section className="mt-14">
        <h2 className="text-[1.625rem] font-medium mb-4" style={{ color: "#2D2150" }}>
          Les autres zones
        </h2>
        <ul className="flex flex-wrap gap-x-6 gap-y-3 text-[16px]">
          {autres.map((c) => (
            <li key={c.id}>
              <Link href={`/exercices/${c.id}`} className="font-medium hover:underline" style={{ color: "#7C5CFA" }}>
                {c.label}
              </Link>{" "}
              <span style={{ color: "#8B84A8" }}>{c.fiches.length}</span>
            </li>
          ))}
          <li>
            <Link href="/exercices" className="font-medium hover:underline" style={{ color: "#7C5CFA" }}>
              Tous les exercices
            </Link>
          </li>
        </ul>
      </section>

      {/* ── CTA, une seule fois, après avoir donné les fiches ─────── */}
      <section
        className="mt-14 rounded-3xl px-7 py-10 text-center"
        style={{
          background: "linear-gradient(135deg,rgba(212,192,255,0.55),rgba(245,230,163,0.45))",
          border: "1px solid rgba(255,255,255,0.9)",
          boxShadow: "0 12px 40px rgba(167,139,250,0.18)",
        }}
      >
        <h2 className="text-[26px] font-light mb-2" style={{ color: "#1A1535" }}>
          Une séance construite autour de ces mouvements
        </h2>
        <p className="text-[16px] mb-6 mx-auto max-w-[460px]" style={{ color: "#4A5568" }}>
          Dis à Vaiiya ton matériel et ton niveau, il compose la séance et te guide pendant
          l’effort, avec ces mêmes personnages.
        </p>
        <Link
          href="/premiers-pas"
          className="inline-block px-7 py-3.5 rounded-2xl text-[16px] font-semibold"
          style={{
            background: "linear-gradient(135deg,#A78BFA,#D4A843)",
            color: "#fff",
            boxShadow: "0 6px 24px rgba(167,139,250,0.4)",
          }}
        >
          Créer mon compte gratuit →
        </Link>
      </section>
    </PageVitrine>
  );
}
