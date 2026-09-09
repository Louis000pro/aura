"use client";

/* ════════════════════════════════════════════════════════════════════
   CarteSeance — la carte que l'✦ pose sous sa phrase quand elle propose
   une séance, qu'elle soit destinée à la bibliothèque ou à un jour du
   planning.

   ⚠️ DANS UN CHAT, C'EST UNE CARTE DE DÉCISION, PAS UN ÉCRAN DE DÉTAIL,
   et c'est la correction du 2026-09-09 (Louis, après le premier essai
   réel de V9B). Elle se comportait comme une fiche séance complète : la
   liste entière des mouvements en grand, deux gros boutons secondaires
   côte à côte, un gros bouton violet, et la CONSÉQUENCE MÉTIER tout en
   bas, c'est-à-dire sous tout ce qu'il fallait faire défiler. Elle
   dépassait la place qu'on lui donne, donc son bouton finissait derrière
   le composer.

   L'ordre visuel est désormais la règle, et il se lit de haut en bas
   dans l'ordre où l'on décide :
     1. la séance et son jour        (de quoi on parle)
     2. ce que le geste change       (V9B, avant le clic, jamais après)
     3. le bouton                    (l'action, une seule)
     4. les sorties secondaires      (du texte, pas des pavés)
     5. les mouvements, repliés      (le détail, seulement si on le veut)

   ⚠️ LE DÉTAIL EST EN DERNIER PARCE QUE C'EST CE QUI L'AUTORISE À
   GRANDIR. Déplié, il pousse vers le bas ce qui est déjà lu, jamais le
   bouton ni la conséquence : ouvrir les mouvements ne peut donc pas
   faire disparaître la décision sous le bord de la feuille.

   Trois décisions plus anciennes NE CHANGENT PAS :
   • Les mouvements se VOIENT quand on les ouvre. Ce sont les mêmes
     personnages animés que dans le tunnel et dans la bibliothèque,
     jamais une nouvelle image : un exercice sans planche garde son halo
     violet, comme partout.
   • « Annuler » n'est pas un bouton aussi lourd que « Valider ». Dans le
     système D le violet plein désigne L'ACTION ; fermer est une croix.
   • Les sorties SUIVENT la demande. Ce qui ne s'applique pas ne s'affiche
     pas, d'où `options` et `jours` en props plutôt que des branches
     câblées ici.

   Ce composant ne décide RIEN et n'écrit RIEN : il reçoit ce qu'il doit
   montrer et rend les clics. La règle produit ne bouge pas, rien ne part
   en base tant qu'on n'a pas touché le bouton violet.
   ════════════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, ChevronDown, X } from "lucide-react";
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
  label: string;
  /**
   * Une BASCULE garde un état qu'on veut relire (« garder aussi »), donc
   * elle porte une coche quand elle est active. Une simple ouverture
   * (« changer de jour ») n'en porte pas : ce qu'elle a ouvert est juste
   * en dessous, et une coche y dirait « c'est fait » à tort.
   */
  bascule?: boolean;
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
  consequence,
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
  /**
   * V9B · CE QUE LE GESTE CHANGE, DIT AVANT LE CLIC.
   *
   * ⚠️ CE N'EST PAS UN `hint`, ET LA DIFFÉRENCE COMPTE. Un hint accompagne
   * une option ; celle-ci répond à « qu'est-ce que ça va faire à mon
   * programme ? », c'est-à-dire à la question qu'on ne peut pas poser après
   * coup. Elle vit donc JUSTE AU-DESSUS du bouton, dans l'encre du texte
   * courant, et elle vient toujours du code : la carte ne devine rien.
   */
  consequence?: string | null;
}) {
  /* Le détail est REPLIÉ par défaut, et c'est tout l'objet de cette passe :
     la carte doit tenir dans un chat. On ne mémorise rien d'une proposition
     à l'autre, la carte porte une `key` chez son appelant. */
  const [detail, setDetail] = useState(false);

  const TEAL = "#2BD4A0";
  const encre = ton === "jour" ? "var(--feu-encre)" : "var(--exp-encre)";
  const barre = ton === "jour"
    ? "linear-gradient(90deg, #F5B120, #E8620C)"
    : "linear-gradient(90deg, var(--accent), #C13BC1)";

  /* « Squat · Fentes · +3 » : de quoi reconnaître la séance sans la
     dérouler. Deux noms suffisent, le reste se compte. */
  const apercu = [
    ...exercices.slice(0, 2).map((e) => e.name),
    ...(exercices.length > 2 ? [`+${exercices.length - 2}`] : []),
  ].join(" · ");

  return (
    <motion.div initial={{ opacity: 0, y: 10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
      className="w-full overflow-hidden relative flex-shrink-0"
      style={{
        borderRadius: "var(--r-bloc)",
        background: "rgba(var(--surface-rgb),0.98)",
        border: "1px solid rgba(var(--accent-rgb),0.20)",
        boxShadow: "var(--ombre-pose)",
      }}>

      {/* Le filet coloré dit d'un coup d'oeil de quoi il s'agit : violet =
          une séance à garder, orange = un jour du planning qui va changer. */}
      <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: barre }} />

      {/* 1. La séance et son jour */}
      <div className="px-4 pt-3.5 pb-2 flex flex-col gap-0.5">
        <button type="button" onClick={onFermer} aria-label="Fermer la proposition"
          className="absolute top-2.5 right-2.5 w-7 h-7 flex items-center justify-center cursor-pointer"
          style={{ borderRadius: "var(--r-controle)", background: "rgba(var(--accent-rgb),0.08)" }}>
          <X size={13} strokeWidth={2.4} style={{ color: "var(--text-3)" }} />
        </button>
        <p className="vy-label pr-8" style={{ color: encre }}>{kicker}</p>
        <p className="text-[17px] font-bold leading-tight pr-8" style={{ color: "var(--text-0)", letterSpacing: "-0.018em" }}>{titre}</p>
        <p className="text-[12px] font-medium" style={{ color: "var(--text-2)" }}>{meta}</p>
      </div>

      <div className="px-3 pb-3 flex flex-col gap-2">

        {/* 2. Ce que le geste change, lu AVANT le bouton et sans avoir à
            passer sous la liste des mouvements. */}
        {consequence && (
          <p className="text-[12px] leading-snug px-1" style={{ color: "var(--text-1)" }}>{consequence}</p>
        )}

        {/* 3. L'action, seule de son poids */}
        <motion.button whileTap={{ scale: 0.98 }} onClick={onValider}
          className="w-full py-3 text-[13.5px] font-bold cursor-pointer flex items-center justify-center gap-2"
          style={{ borderRadius: "var(--r-controle)", background: "linear-gradient(135deg, var(--accent), var(--violet-mid))", color: "#fff", boxShadow: "var(--ombre-action)" }}>
          <Check size={15} strokeWidth={2.6} /> {cta}
        </motion.button>

        {hint && (
          <p className="text-[10.5px] text-center" style={{ color: "var(--text-3)" }}>{hint}</p>
        )}

        {/* 4. Les sorties secondaires : du texte, en retrait, séparé par un
            point médian. Deux pavés côte à côte annulaient la lecture du
            système D, où le violet plein est L'ACTION. */}
        {options.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-x-1 px-1">
            {options.map((o, i) => (
              <span key={o.id} className="flex items-center">
                {i > 0 && <span className="text-[11px] px-1" style={{ color: "var(--text-3)" }}>·</span>}
                <button type="button" onClick={o.onClick} aria-pressed={o.bascule ? !!o.actif : undefined}
                  className="flex items-center gap-1 py-1 text-[12px] cursor-pointer"
                  style={{ color: o.actif ? encre : "var(--text-2)", fontWeight: o.actif ? 700 : 500 }}>
                  {o.bascule && o.actif && <Check size={11} strokeWidth={3} />}
                  {o.label}
                </button>
              </span>
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
      </div>

      {/* 5. Le détail, replié. Il ne s'ouvre que si on le demande, et il
          s'ouvre SOUS la décision : rien de ce qui précède ne bouge. */}
      {exercices.length > 0 && (
        <>
          <button type="button" onClick={() => setDetail((v) => !v)} aria-expanded={detail}
            className="w-full flex items-center gap-2 px-4 py-2.5 cursor-pointer text-left"
            style={{ borderTop: "1px solid rgba(var(--accent-rgb),0.10)" }}>
            <span className="flex-1 min-w-0 truncate text-[11.5px] font-medium" style={{ color: "var(--text-2)" }}>
              {detail ? `Les mouvements · ${exercices.length}` : apercu}
            </span>
            <ChevronDown size={14} strokeWidth={2.2} className="flex-shrink-0"
              style={{ color: "var(--text-3)", transform: detail ? "rotate(180deg)" : "none", transition: "transform .18s ease" }} />
          </button>

          {detail && (
            <div className="px-2.5 pb-2">
              {exercices.map((ex, i) => (
                <div key={`${ex.name}-${i}`} className="vy-filet flex items-center gap-2.5 px-1.5 py-1">
                  <ExerciseThumb name={ex.name} size={46} delay={i * 220} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium truncate" style={{ color: "var(--text-1)" }}>{ex.name}</p>
                    {ex.muscles && ex.muscles.length > 0 && (
                      <p className="text-[10.5px] truncate" style={{ color: "var(--text-3)" }}>{ex.muscles.slice(0, 2).join(", ")}</p>
                    )}
                  </div>
                  <span className="vy-nombre text-[11.5px] flex-shrink-0" style={{ color: "var(--exp-encre)" }}>{ex.dose}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}
