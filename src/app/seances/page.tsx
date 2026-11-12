import type { Metadata } from "next";
import Link from "next/link";
import { PageVitrine } from "@/components/seo/VitrineChrome";
import { photosDeRangee } from "@/lib/workoutArt";
import { CATEGORIES_SEANCES, materielDe, seanceOuverte, seancesPubliees } from "@/lib/seancesPubliques";

/* Le hub des séances du catalogue, rangées par grande famille. Une même
   photo ne revient pas deux fois dans une famille (`photosDeRangee`, la
   règle des rangées de l'application). Les nombres se comptent dans le
   code. */

const NB = String.fromCharCode(160);

export const metadata: Metadata = {
  title: "Séances de sport guidées, à la maison ou en salle",
  description:
    "Des séances guidées mouvement par mouvement : renforcement, full body, cardio, mobilité, à la maison sans matériel, aux haltères ou à la salle. Le programme de chaque séance gratuite se lit sans compte.",
  alternates: { canonical: "https://vaiiya.fr/seances" },
  openGraph: {
    title: "Séances de sport guidées, à la maison ou en salle",
    description: "Renforcement, full body, cardio et mobilité, avec chaque mouvement montré en animation.",
    url: "https://vaiiya.fr/seances",
    images: ["/og-image.png"],
  },
};

export default function SeancesPage() {
  const seances = seancesPubliees();
  const gratuites = seances.filter(seanceOuverte).length;
  const familles = CATEGORIES_SEANCES.map((c) => {
    const liste = seances.filter((s) => s.category === c.id);
    return { ...c, liste, photos: photosDeRangee(liste) };
  }).filter((f) => f.liste.length > 0);

  const filAriane = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: "https://vaiiya.fr" },
      { "@type": "ListItem", position: 2, name: "Séances", item: "https://vaiiya.fr/seances" },
    ],
  };

  return (
    <PageVitrine largeur="max-w-5xl">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(filAriane) }} />

      <section className="mb-10">
        <p className="text-[11px] font-bold tracking-[0.22em] uppercase mb-3" style={{ color: "#A78BFA" }}>
          Les séances
        </p>
        <h1
          className="font-light leading-[1.08] mb-4"
          style={{ fontSize: "clamp(2.125rem,6vw,2.9rem)", letterSpacing: "-0.01em", color: "#1A1535" }}
        >
          {seances.length}{NB}séances guidées, mouvement par mouvement
        </h1>
        <p className="max-w-[640px] text-[1rem] leading-[1.65]" style={{ color: "#4A5568" }}>
          Chaque séance montre ses mouvements en animation. Le programme complet des {gratuites}{NB}séances
          gratuites se lit ici, celui des séances Vaiiya+ en aperçu.
        </p>
        <nav aria-label="Aller à une famille" className="mt-6 flex flex-wrap gap-2">
          {familles.map((f) => (
            <a
              key={f.id}
              href={`#${f.id}`}
              className="px-3.5 py-2 rounded-full text-[13px] font-semibold"
              style={{ border: "1px solid rgba(139,92,246,0.28)", color: "#6B46C1", background: "#fff" }}
            >
              {f.titre} · {f.liste.length}
            </a>
          ))}
        </nav>
      </section>

      <div className="flex flex-col gap-12">
        {familles.map((f, iFamille) => (
          <section key={f.id} id={f.id} style={{ scrollMarginTop: 24 }}>
            <h2 className="mb-5 text-[1.625rem] font-medium" style={{ color: "#2D2150" }}>{f.titre}</h2>
            <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
              {f.liste.map((s, i) => {
                const m = materielDe(s);
                return (
                  <Link
                    key={s.id}
                    href={`/seances/${s.id}`}
                    className="block rounded-3xl overflow-hidden transition-transform hover:-translate-y-0.5"
                    style={{ background: "#fff", border: "1px solid rgba(167,139,250,0.16)", boxShadow: "0 6px 24px rgba(90,60,180,0.07)" }}
                  >
                    <span className="relative block" style={{ aspectRatio: "4 / 3", background: "#1A1424" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/entrainement/m/${f.photos.get(s.id)}.webp`}
                        alt=""
                        width={750}
                        height={1000}
                        loading={iFamille === 0 && i < 4 ? "eager" : "lazy"}
                        className="absolute inset-0 w-full h-full"
                        style={{ objectFit: "cover", objectPosition: "50% 35%" }}
                      />
                    </span>
                    <span className="block p-3.5">
                      <span className="block text-[16px] font-semibold leading-snug" style={{ color: "#1A1535" }}>{s.title}</span>
                      <span className="block mt-1 text-[13px]" style={{ color: "#8B84A8" }}>
                        {s.duration}{NB}min{m ? ` · ${m}` : ""}{seanceOuverte(s) ? "" : " · Vaiiya+"}
                      </span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <p className="mt-12 text-[1rem] leading-[1.65] max-w-[640px]" style={{ color: "#4A5568" }}>
        Pour aller plus loin que la séance du jour, suis un{" "}
        <Link href="/programmes" className="font-semibold hover:underline" style={{ color: "#7C5CFA" }}>programme</Link>{" "}
        sur plusieurs semaines, ou relève un{" "}
        <Link href="/defis" className="font-semibold hover:underline" style={{ color: "#7C5CFA" }}>défi</Link>{" "}
        à refaire pour battre ton score.
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
          Lance une séance guidée
        </h2>
        <p className="text-[16px] mb-6 mx-auto max-w-[460px]" style={{ color: "#4A5568" }}>
          Crée ton compte gratuit&nbsp;: choisis une séance, ou demande au coach IA d’en composer une pour toi.
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
