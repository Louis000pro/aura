"use client";

/* ════════════════════════════════════════════════════════════════════
   « SUIVRE UN PROGRAMME », DANS « JE CHOISIS », APRÈS « POUR TOI »
   (maquette « Les programmes », version 2).

   Une carte par programme proposé ce jour-là (Prépa ski de novembre à
   février), le programme en cours d'abord, avec sa séance. Un programme
   Vaiiya+ porte « Bientôt Vaiiya+ » tant que la vente est fermée, et
   s'ouvre quand même. Toucher une carte ouvre sa fiche.

   ⚠️ LA RANGÉE NE S'AFFICHE QUE QUAND LA BASE A RÉPONDU (`lecture`).
   Tant que la migration n'est pas collée, la lecture échoue et la rangée
   n'existe pas : jamais un chantier visible.
   ════════════════════════════════════════════════════════════════════ */

import { motion } from "framer-motion";
import { Photo } from "@/components/entrainement/PhotoSeance";
import { PucePlus } from "@/components/catalogue/CartesSeance";
import { VENTE_OUVERTE } from "@/lib/plans";
import { photosDeRangee } from "@/lib/workoutArt";
import type { LectureParcours } from "@/lib/parcoursBase";
import type { EtatParcours } from "@/hooks/useJournee";
import { SEANCES, programmesProposes, typoParcours, type DefParcours, type IdParcours } from "@/lib/parcours";

const NB = String.fromCharCode(160);

function Carte({ def, photo, premium, enCours, onOuvrir }: { def: DefParcours; photo: string; premium: boolean; enCours: string | null; onOuvrir: () => void }) {
  return (
    <motion.button type="button" whileTap={{ scale: 0.98 }} onClick={onOuvrir}
      className="relative flex-shrink-0 block text-left p-0 border-none cursor-pointer overflow-hidden"
      aria-label={`Le programme ${def.titre}${enCours ? ", en cours" : ""}`}
      style={{ width: "min(292px, 76vw)", aspectRatio: "292 / 368", borderRadius: "var(--r-affiche)", background: "#2A2438", scrollSnapAlign: "start", boxShadow: "var(--ombre-pose)" }}>
      <Photo img={photo} pos="50% 18%" style={{ position: "absolute", inset: 0 }} />
      <span aria-hidden className="absolute inset-x-0 bottom-0" style={{ height: "62%", background: "linear-gradient(180deg, rgba(14,10,24,0) 0%, rgba(14,10,24,0.55) 45%, rgba(14,10,24,0.9) 100%)" }} />
      <span className="absolute flex gap-1.5" style={{ left: 14, top: 14 }}>
        {enCours && (
          <span className="text-[11px] font-bold text-white" style={{ padding: "4px 9px", borderRadius: 999, background: "linear-gradient(135deg,#8B5CF6,#C13BC1)" }}>{enCours}</span>
        )}
        {def.acces === "plus" && !premium && <PucePlus texte={VENTE_OUVERTE ? "Vaiiya+" : "Bientôt Vaiiya+"} />}
      </span>
      <span className="absolute block text-white" style={{ left: 18, right: 18, bottom: 18 }}>
        <span className="block text-[13px] font-bold" style={{ color: "rgba(255,255,255,0.84)" }}>
          <span className="vy-nombre">{def.semaines}</span>{NB}semaines · <span className="vy-nombre">{def.parSemaine}</span>{NB}séances par semaine
        </span>
        <span className="block mt-1.5 text-[26px] leading-[29px] font-extrabold" style={{ fontVariationSettings: "'wdth' 112", textShadow: "0 2px 10px rgba(0,0,0,0.45)" }}>
          {typoParcours(def.titre)}
        </span>
        <span className="block mt-1.5 text-[13px] leading-[18px]" style={{ color: "rgba(255,255,255,0.88)" }}>{typoParcours(def.accroche)}</span>
      </span>
    </motion.button>
  );
}

export default function RangeeProgrammes({ lecture, parcours, premium, aujourdhui, onOuvrir }: {
  lecture: LectureParcours | null;
  parcours: EtatParcours | null;
  premium: boolean;
  aujourdhui: string;
  onOuvrir: (id: IdParcours) => void;
}) {
  if (!lecture) return null;
  const enCours = lecture.enCours?.def ?? null;
  const proposes = programmesProposes(aujourdhui);
  const liste = enCours ? [enCours, ...proposes.filter((p) => p.id !== enCours.id)] : proposes;
  /* Une photo par carte, sans doublon dans la rangée : celle de la séance qui représente le programme. */
  const photos = photosDeRangee(liste.map((p) => ({ id: p.id, title: SEANCES[p.photo]?.titre ?? p.titre, category: SEANCES[p.photo]?.categorie })));
  return (
    <section className="mt-8">
      <h3 className="vy-sous" style={{ color: "var(--text-0)" }}>Suivre un programme</h3>
      <p className="text-[13px] font-medium mt-1" style={{ color: "var(--text-2)" }}>
        Quelques semaines de séances pour un but, avec un test au début et le même à la fin.
      </p>
      <div className="flex gap-3 overflow-x-auto -mx-5 px-5 mt-3 pb-2" style={{ scrollSnapType: "x mandatory", scrollPaddingInline: 20, scrollbarWidth: "none" }}>
        {liste.map((p) => (
          <Carte key={p.id} def={p} photo={photos.get(p.id) ?? ""} premium={premium} onOuvrir={() => onOuvrir(p.id)}
            enCours={enCours?.id === p.id ? (parcours?.rang ? `En cours · ${parcours.rang.toLowerCase()}` : "En cours") : null} />
        ))}
      </div>
    </section>
  );
}
