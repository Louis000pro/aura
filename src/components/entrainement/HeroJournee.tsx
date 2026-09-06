"use client";

/* ════════════════════════════════════════════════════════════════════
   V7A · LE HÉROS DE LA JOURNÉE, MONTÉ SUR L'ACCUEIL.

   Il assemble les trois pièces et n'en décide aucune : `useJournee` dit
   ce qu'il y a à montrer, `TodayHero` le montre, `terminerSeance`
   referme ce que la séance referme.

   ⚠️ LES ACTIONS SECONDAIRES PARTENT VERS ENTRAÎNEMENT, ET C'EST VOULU.
   « Organiser », « J'ai envie de bouger » et « Lui donner un jour »
   ouvrent des feuilles qui vivent dans l'écran Entraînement, avec la
   semaine et le catalogue qu'elles manipulent. Les dupliquer sur
   l'accueil ferait deux « Organiser » à tenir d'accord ; on y va, et
   `?ouvrir=` dit laquelle ouvrir. L'action PRINCIPALE, elle, ne quitte
   jamais l'accueil : lancer sa séance depuis l'écran où l'on arrive est
   tout l'intérêt du déplacement.

   « Décaler » et « Remplacer » parlent au Guide, qui est global : ils
   marchent ici exactement comme sur Entraînement.
   ════════════════════════════════════════════════════════════════════ */

import { useRouter } from "next/navigation";
import { useAssistant } from "@/context/AssistantContext";
import { useJournee } from "@/hooks/useJournee";
import { dayTitle, hasSeance } from "@/lib/planning";
import TodayHero from "./TodayHero";

export default function HeroJournee() {
  const router = useRouter();
  const { open: openAssistant } = useAssistant();
  const j = useJournee();

  const ouvrir = (feuille: "organiser" | "improviser") =>
    router.push(`/progression?ouvrir=${feuille}`);

  return (
    <section>
      <TodayHero
        state={j.etat}
        day={j.jour}
        etape={j.etape}
        nbExos={j.nbExos}
        nextLabel={j.nextLabel}
        doneStats={j.doneStats}
        onStart={j.lancerAujourdhui}
        onImprovise={() => ouvrir("improviser")}
        onOrganise={() => ouvrir("organiser")}
        onShift={() => openAssistant("Décale ma séance d’aujourd’hui à un autre jour")}
        onReplace={() => openAssistant("Remplace ma séance d’aujourd’hui par autre chose")}
      />

      {/* ⚠️ CE QUI VIENT EN PLUS AUJOURD'HUI (V6b). Le héros ne montre
          qu'une séance, et c'est très bien : il répond à « je fais quoi
          maintenant ». Mais une seconde intention existe en base, donc
          elle doit exister à l'écran, sinon on l'a écrite pour rien. Une
          ligne, lançable, sous le héros : la mise en scène d'une journée
          chargée est un travail de composition, et c'est V7B. */}
      {j.extras.length > 0 && (
        <div style={{ marginTop: 10 }}>
          {j.extras.map((extra) => (
            <button key={extra.id ?? extra.title}
              onClick={() => j.lancerIntention(extra)}
              disabled={!hasSeance(extra)}
              className="w-full flex items-center gap-2 py-1.5 text-left border-none bg-transparent"
              style={{ cursor: hasSeance(extra) ? "pointer" : "default" }}>
              <span className="vy-label flex-shrink-0" style={{ color: "var(--text-3)" }}>En plus</span>
              <span className="flex-1 min-w-0 text-[12.5px] font-semibold truncate" style={{ color: "var(--text-2)" }}>
                {dayTitle(extra)}
              </span>
              {hasSeance(extra) && (
                <span className="text-[10px] font-bold flex-shrink-0"
                  style={{ color: extra.status === "done" ? "var(--teal-encre)" : "var(--exp-encre)" }}>
                  {extra.status === "done" ? "Faite ✓" : "Commencer"}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
