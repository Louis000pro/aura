"use client";

/* ════════════════════════════════════════════════════════════════════
   R4 · LA QUESTION APRÈS UN REPÈRE (maquette 07, écran 05 ; décision 57)

   Trois réponses neutres, sans couleur de réussite ni de faute, et « Je ne
   sais pas », secondaire mais lisible. Il n'y a pas de « Passer » : ne pas
   répondre suffit, et rien ne change alors. La réponse reste modifiable.
   ════════════════════════════════════════════════════════════════════ */

import type { Marge } from "@/lib/progression";

const PRINCIPALES: { marge: Marge; label: string }[] = [
  { marge: "aucune", label: "Aucune" },
  { marge: "1_2", label: "1 ou 2" },
  { marge: "3_plus", label: "3 ou plus" },
];

export default function QuestionMarge({ question, titre, reponse, onRepondre }: {
  question: string;
  /** Le nom de l'exercice, quand la question n'est pas posée pendant son repos. */
  titre?: string;
  reponse: Marge | null;
  onRepondre: (m: Marge) => void;
}) {
  return (
    <div className="text-left">
      {titre && <p className="text-[13px] font-bold mb-1" style={{ color: "#fff" }}>{titre}</p>}
      <p className="text-[13px] leading-snug" style={{ color: "#C9C2DD" }}>{question}</p>
      <div className="grid grid-cols-3 gap-2 mt-3">
        {PRINCIPALES.map(({ marge, label }) => {
          const choisie = reponse === marge;
          return (
            <button key={marge} type="button" onClick={() => onRepondre(marge)} aria-pressed={choisie}
              className="py-2.5 rounded-xl text-[13px] font-bold cursor-pointer"
              style={{
                color: "#fff",
                background: choisie ? "rgba(201,184,255,0.18)" : "rgba(255,255,255,0.06)",
                border: `1px solid ${choisie ? "rgba(201,184,255,0.6)" : "rgba(255,255,255,0.14)"}`,
              }}>
              {label}
            </button>
          );
        })}
      </div>
      <button type="button" onClick={() => onRepondre("inconnue")} aria-pressed={reponse === "inconnue"}
        className="mt-2 text-[13px] font-semibold cursor-pointer"
        style={{ color: reponse === "inconnue" ? "#fff" : "#A79FC0", textDecoration: reponse === "inconnue" ? "underline" : "none" }}>
        Je ne sais pas
      </button>
    </div>
  );
}
