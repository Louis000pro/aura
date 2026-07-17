"use client";

import ExerciseGuide from "@/components/ExerciseGuide";

/* ════════════════════════════════════════════════════════════════════
   Galerie des personnages-guides — regroupe TOUS les exos animés de
   Vaiiya avec leur perso en fondu, comme dans le « tunnel » de séance.
   Écran de revue (fond toujours sombre = contexte réel des sprites).

   Chaque libellé est un NOM D'EXO qui résout vers son sprite via les
   règles de src/lib/exerciseGuides.ts (ExerciseGuide fait le reste). Un
   exo sans sprite retomberait sur le halo — ici on ne liste que ceux qui
   ont une planche, d'où la parité avec public/entrainement/guides/.
   ════════════════════════════════════════════════════════════════════ */

const SECTIONS: { title: string; items: string[] }[] = [
  {
    title: "Poids du corps & HIIT",
    items: [
      "Squat", "Pompes", "Fentes", "Squats sautés", "Fentes sautées",
      "Pike push-ups", "Pompes diamant", "Pompes inclinées", "Dips sur chaise",
      "Tractions", "Rowing inversé", "Burpees", "Mountain climbers",
      "Jumping jacks", "Montées de genoux", "Corde à sauter", "Chaise au mur",
    ],
  },
  {
    title: "Gainage & abdos",
    items: ["Gainage", "Planche latérale", "Gainage dynamique", "Crunch", "Superman", "Bird dog"],
  },
  {
    title: "Machines",
    items: [
      "Presse à cuisses", "Leg extension", "Leg curl assis", "Leg curl allongé",
      "Abducteurs machine", "Hip thrust machine", "Pont fessier", "Pec deck",
      "Développé épaules machine", "Dips machine", "Tirage poitrine",
      "Rowing assis poulie", "Face pull poulie",
    ],
  },
  {
    title: "Haltères & barre",
    items: [
      "Développé couché", "Développé incliné haltères", "Développé militaire haltères",
      "Oiseau haltères", "Élévations latérales", "Curl haltères", "Curl marteau",
      "Curl barre EZ", "Extension triceps haltère", "Extension triceps poulie",
      "Rowing barre", "Rowing haltère", "Tirage menton haltères",
      "Soulevé de terre roumain", "Mollets", "Squat bulgare",
    ],
  },
  {
    title: "Cardio machine",
    items: ["Rameur", "Tapis de course", "Vélo"],
  },
];

const total = SECTIONS.reduce((n, s) => n + s.items.length, 0);

export default function GuidesGalleryPage() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        background: "linear-gradient(180deg,#150b26 0%,#0c0715 58%,#080510 100%)",
        color: "#fff",
      }}
    >
      <div className="mx-auto max-w-5xl px-4 pb-24 pt-10">
        <header className="mb-9">
          <div
            className="text-[11px] font-semibold uppercase tracking-[0.2em]"
            style={{ color: "#a78bfa" }}
          >
            Personnages-guides
          </div>
          <h1 className="mt-1.5 text-2xl font-bold sm:text-3xl">Tous les exercices animés</h1>
          <p className="mt-2 max-w-xl text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
            {total} exercices avec leur personnage-guide, en fondu-enchaîné comme pendant la
            séance. Les mouvements rejouent leur geste en boucle ; les tenues (gainage, chaise
            au mur) restent sur leur pose.
          </p>
        </header>

        {SECTIONS.map((sec) => (
          <section key={sec.title} className="mb-11">
            <h2
              className="mb-4 flex items-center gap-2.5 text-xs font-semibold uppercase tracking-wide"
              style={{ color: "rgba(255,255,255,0.85)" }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: 20,
                  height: 3,
                  borderRadius: 3,
                  background: "linear-gradient(90deg,#8B5CF6,#C13BC1)",
                }}
              />
              {sec.title}
              <span className="text-[11px] font-normal" style={{ color: "rgba(255,255,255,0.4)" }}>
                {sec.items.length}
              </span>
            </h2>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {sec.items.map((name) => (
                <div
                  key={name}
                  className="overflow-hidden rounded-2xl"
                  style={{
                    background: "rgba(255,255,255,0.045)",
                    border: "1px solid rgba(255,255,255,0.07)",
                  }}
                >
                  <div className="flex items-center justify-center [&_img]:max-w-full" style={{ height: 188 }}>
                    <ExerciseGuide name={name} />
                  </div>
                  <div
                    className="px-3 pb-3 pt-1 text-center text-[13px] font-medium leading-tight"
                    style={{ color: "rgba(255,255,255,0.9)" }}
                  >
                    {name}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
