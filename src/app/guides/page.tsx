"use client";

import ExerciseGuide from "@/components/ExerciseGuide";
import { GUIDE_SECTIONS } from "@/lib/guideSections";

/* ════════════════════════════════════════════════════════════════════
   Galerie des personnages-guides — regroupe TOUS les exos animés de
   Vaiiya avec leur perso en fondu, comme dans le « tunnel » de séance.
   Écran de revue (fond toujours sombre = contexte réel des sprites).

   La liste vit dans src/lib/guideSections.ts — partagée avec les séances
   « Défi Animations ». Elle était dupliquée ici et a divergé (galerie
   restée à 55 exos pendant que les séances montaient à 101) : ajouter un
   sprite se fait dans le module, pas dans cet écran.
   ════════════════════════════════════════════════════════════════════ */

const SECTIONS = GUIDE_SECTIONS;

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
