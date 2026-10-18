"use client";

/* ════════════════════════════════════════════════════════════════════
   R4 · LA QUESTION APRÈS UN REPÈRE (maquette 07, écran 05 ; décision 57)

   Trois réponses neutres, sans couleur de réussite ni de faute, et « Je ne
   sais pas », secondaire mais lisible. Il n'y a pas de « Passer » : ne pas
   répondre suffit, et rien ne change alors. La réponse reste modifiable.

   ⚠️ LA QUESTION EST CELLE DU GUIDE : son visage l'accompagne (verrou
   Nora/Sasha), l'étincelle ✦ quand aucun Guide n'est résolu.
   ════════════════════════════════════════════════════════════════════ */

import type { ReactNode } from "react";
import type { Marge } from "@/lib/progression";

const PRINCIPALES: { marge: Marge; label: string }[] = [
  { marge: "aucune", label: "Aucune" },
  { marge: "1_2", label: "1 ou 2" },
  { marge: "3_plus", label: "3 ou plus" },
];

/* Le repos du tunnel est clair depuis le 2026-10-18 ; la fin de séance et
   le détail des exercices restent noirs. */
const ENCRES = {
  sombre: { titre: "#fff", question: "#C9C2DD", bouton: "#fff", fond: "rgba(255,255,255,0.06)", bord: "rgba(255,255,255,0.14)", fondChoisi: "rgba(201,184,255,0.18)", bordChoisi: "rgba(201,184,255,0.6)", discret: "#A79FC0" },
  clair: { titre: "#1A202C", question: "#4A5568", bouton: "#2D3748", fond: "rgba(255,255,255,0.75)", bord: "rgba(26,32,44,0.1)", fondChoisi: "rgba(139,92,246,0.14)", bordChoisi: "rgba(109,75,214,0.55)", discret: "#718096" },
};

export default function QuestionMarge({ question, titre, reponse, onRepondre, visage, clair }: {
  question: string;
  /** Le visage du Guide qui pose la question. */
  visage: ReactNode;
  /** Le nom de l'exercice, quand la question n'est pas posée pendant son repos. */
  titre?: string;
  reponse: Marge | null;
  onRepondre: (m: Marge) => void;
  /** Les encres du tunnel clair. */
  clair?: boolean;
}) {
  const e = clair ? ENCRES.clair : ENCRES.sombre;
  return (
    <div className="text-left">
      {titre && <p className="text-[13px] font-bold mb-1" style={{ color: e.titre }}>{titre}</p>}
      <div className="flex gap-3 items-center">
        <span className="flex-shrink-0">{visage}</span>
        <p className="text-[13px] leading-snug" style={{ color: e.question }}>{question}</p>
      </div>
      <div className="grid grid-cols-3 gap-2 mt-3">
        {PRINCIPALES.map(({ marge, label }) => {
          const choisie = reponse === marge;
          return (
            <button key={marge} type="button" onClick={() => onRepondre(marge)} aria-pressed={choisie}
              className="py-2.5 rounded-xl text-[13px] font-bold cursor-pointer"
              style={{
                color: e.bouton,
                background: choisie ? e.fondChoisi : e.fond,
                border: `1px solid ${choisie ? e.bordChoisi : e.bord}`,
              }}>
              {label}
            </button>
          );
        })}
      </div>
      <button type="button" onClick={() => onRepondre("inconnue")} aria-pressed={reponse === "inconnue"}
        className="mt-2 text-[13px] font-semibold cursor-pointer"
        style={{ color: reponse === "inconnue" ? e.titre : e.discret, textDecoration: reponse === "inconnue" ? "underline" : "none" }}>
        Je ne sais pas
      </button>
    </div>
  );
}
