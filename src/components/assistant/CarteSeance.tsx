"use client";

/* ════════════════════════════════════════════════════════════════════
   CarteSeance — la carte que l'✦ pose sous sa phrase quand elle propose
   une séance, qu'elle soit destinée à la bibliothèque ou à un jour du
   planning.

   Elle remplace deux écrans qui se ressemblaient sans se ressembler : la
   vieille carte « Nouvelle séance » (une liste de noms, un seul bouton
   « Créer la séance ») et la carte de suite qui demandait ENSUITE quand
   la faire. Trois choses ont changé, validées en maquette :

   • Les mouvements se VOIENT. Ce sont les mêmes personnages animés que
     dans le tunnel et dans la bibliothèque, jamais une nouvelle image :
     un exercice sans planche garde son halo violet, comme partout.
   • « Annuler » cesse d'être un bouton aussi lourd que « Valider ». Dans
     le système D le violet plein désigne L'ACTION ; deux boutons de même
     poids annulaient cette lecture. Fermer redevient une croix.
   • Les sorties SUIVENT la demande. Une séance sans jour en tête ne
     propose pas la même chose qu'un « remplace jeudi ». Ce qui ne
     s'applique pas ne s'affiche pas — d'où `options` et `jours` en
     props plutôt que des branches câblées ici.

   Ce composant ne décide RIEN et n'écrit RIEN : il reçoit ce qu'il doit
   montrer et rend les clics. La règle produit ne bouge pas — rien ne
   part en base tant qu'on n'a pas touché le bouton violet.
   ════════════════════════════════════════════════════════════════════ */

import { motion } from "framer-motion";
import { Check, X } from "lucide-react";
import ExerciseThumb from "@/components/seance/ExerciseThumb";

export type ExerciceCarte = {
  name: string;
  dose: string;
  muscles?: string[];
};

/** Un jour proposé au choix. `occupe` porte le nom de ce qui est déjà prévu :
 *  on le dit AVANT le clic plutôt que d'écraser en silence. */
export type JourCarte = {
  ymd: string;
  label: string;
  occupe?: string | null;
  bloque?: boolean;
};

export type OptionCarte = {
  id: string;
  icone: React.ReactNode;
  ligne1: string;
  ligne2: string;
  actif?: boolean;
  onClick: () => void;
};

export default function CarteSeance({
  kicker,
  ton = "accent",
  titre,
  meta,
  exercices,
  options,
  jours,
  jourChoisi,
  onJour,
  cta,
  onValider,
  onFermer,
  hint,
}: {
  kicker: string;
  ton?: "accent" | "jour";
  titre: string;
  meta: string;
  exercices: ExerciceCarte[];
  options: OptionCarte[];
  jours?: JourCarte[] | null;
  jourChoisi?: string | null;
  onJour?: (ymd: string) => void;
  cta: string;
  onValider: () => void;
  onFermer: () => void;
  hint?: string | null;
}) {
  const TEAL = "#2BD4A0";
  const barre = ton === "jour"
    ? "linear-gradient(90deg, #F5B120, #E8620C)"
    : "linear-gradient(90deg, var(--accent), #C13BC1)";

  return (
    /* La carte est une colonne qui ne dépasse JAMAIS la place qu'on lui
       donne : en-tête et boutons gardent leur taille, c'est la liste des
       mouvements qui absorbe. Sans ça, une séance de 8 mouvements poussait
       le bouton violet sous le bord de la feuille (signalé par Louis). */
    <motion.div initial={{ opacity: 0, y: 10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
      className="w-full rounded-3xl overflow-hidden relative flex flex-col"
      style={{
        minHeight: 0,
        background: "rgba(var(--surface-rgb),0.98)",
        border: "1px solid rgba(var(--accent-rgb),0.20)",
        boxShadow: "0 8px 28px rgba(var(--accent-rgb),0.16)",
      }}>

      {/* Le filet coloré dit d'un coup d'œil de quoi il s'agit : violet =
          une séance à garder, orange = un jour du planning qui va changer. */}
      <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: barre }} />

      <div className="px-4 pt-3.5 pb-3 flex flex-col gap-0.5 flex-shrink-0">
        <button type="button" onClick={onFermer} aria-label="Fermer la proposition"
          className="absolute top-2.5 right-2.5 w-7 h-7 rounded-xl flex items-center justify-center cursor-pointer"
          style={{ background: "rgba(var(--accent-rgb),0.08)" }}>
          <X size={13} strokeWidth={2.4} style={{ color: "var(--text-3)" }} />
        </button>
        <p className="text-[9.5px] font-semibold tracking-[0.15em] uppercase pr-8"
          style={{ color: ton === "jour" ? "#E8620C" : "var(--accent)" }}>{kicker}</p>
        <p className="text-[17px] font-bold leading-tight pr-8" style={{ color: "var(--text-0)", letterSpacing: "-0.018em" }}>{titre}</p>
        <p className="text-[12px] font-medium" style={{ color: "var(--text-2)" }}>{meta}</p>
      </div>

      {exercices.length > 0 && (
        <>
          <p className="px-4 pb-1.5 text-[9.5px] font-semibold tracking-[0.13em] uppercase flex-shrink-0" style={{ color: "var(--text-3)" }}>
            Les mouvements · {exercices.length}
          </p>
          {/* Assez haut pour couper une ligne en deux : c'est ce demi-mouvement
              qui dit qu'il y en a d'autres en dessous. Une séance fait 5 à 8
              mouvements, la liste défile, Louis, 2026-07-30 : « rien qu'un
              petit slide vers le bas n'est pas très dérangeant ». Le plafond
              de 200 px est une préférence, pas une garantie : sur un écran
              court la liste descend plus bas encore, mais jamais au prix du
              bouton. */}
          <div className="px-2.5 overflow-y-auto flex-1" style={{ maxHeight: 200, minHeight: 76, scrollbarWidth: "none" }}>
            {exercices.map((ex, i) => (
              <div key={`${ex.name}-${i}`} className="flex items-center gap-2.5 px-1.5 py-1 rounded-2xl"
                style={i > 0 ? { boxShadow: "inset 0 1px 0 rgba(var(--accent-rgb),0.10)" } : undefined}>
                <ExerciseThumb name={ex.name} size={46} delay={i * 220} />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium truncate" style={{ color: "var(--text-1)" }}>{ex.name}</p>
                  {ex.muscles && ex.muscles.length > 0 && (
                    <p className="text-[10.5px] truncate" style={{ color: "var(--text-3)" }}>{ex.muscles.slice(0, 2).join(", ")}</p>
                  )}
                </div>
                <span className="text-[11.5px] font-bold flex-shrink-0 tabular-nums" style={{ color: "var(--accent)" }}>{ex.dose}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="px-3 pt-2.5 pb-3 mt-1 flex flex-col gap-2 flex-shrink-0" style={{ borderTop: "1px solid rgba(var(--accent-rgb),0.10)" }}>
        {options.length > 0 && (
          <div className="flex gap-1.5">
            {options.map((o) => (
              <motion.button key={o.id} type="button" whileTap={{ scale: 0.96 }} onClick={o.onClick}
                className="flex-1 flex flex-col items-center gap-1 px-1 py-2 rounded-2xl cursor-pointer"
                style={{
                  background: o.actif ? "rgba(var(--accent-rgb),0.14)" : "rgba(var(--accent-rgb),0.05)",
                  border: `1px solid rgba(var(--accent-rgb),${o.actif ? 0.4 : 0.16})`,
                }}>
                <span style={{ color: "var(--accent)", lineHeight: 0 }}>{o.icone}</span>
                <span className="text-[11px] font-semibold leading-tight text-center" style={{ color: "var(--text-1)" }}>
                  {o.ligne1}<br />{o.ligne2}
                </span>
              </motion.button>
            ))}
          </div>
        )}

        {/* Les jours s'ouvrent DANS la carte : empiler une feuille par-dessus
            une feuille sur téléphone, on ne sait plus d'où on vient. */}
        {jours && jours.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {jours.map((j) => {
              const choisi = j.ymd === jourChoisi;
              return (
                <motion.button key={j.ymd} type="button" whileTap={j.bloque ? {} : { scale: 0.94 }}
                  disabled={j.bloque}
                  onClick={() => onJour?.(j.ymd)}
                  className="px-3 py-1.5 rounded-full text-[11.5px] font-semibold cursor-pointer disabled:cursor-default"
                  style={choisi
                    ? { background: "rgba(43,212,160,0.13)", color: TEAL, border: "1px solid rgba(43,212,160,0.45)" }
                    : {
                        background: "rgba(var(--accent-rgb),0.06)",
                        color: j.bloque ? "var(--text-3)" : "var(--text-1)",
                        border: "1px solid rgba(var(--accent-rgb),0.18)",
                        opacity: j.bloque ? 0.55 : 1,
                      }}>
                  {choisi && "✓ "}{j.label}
                  {j.occupe && !choisi && (
                    <span style={{ color: "#E8620C", fontWeight: 500 }}> · pris</span>
                  )}
                </motion.button>
              );
            })}
          </div>
        )}

        <motion.button whileTap={{ scale: 0.98 }} onClick={onValider}
          className="w-full py-3 rounded-2xl text-[13.5px] font-bold cursor-pointer flex items-center justify-center gap-2"
          style={{ background: "linear-gradient(135deg, var(--accent), var(--violet-mid))", color: "#fff" }}>
          <Check size={15} strokeWidth={2.6} /> {cta}
        </motion.button>

        {hint && (
          <p className="text-[10.5px] text-center" style={{ color: "var(--text-3)" }}>{hint}</p>
        )}
      </div>
    </motion.div>
  );
}
