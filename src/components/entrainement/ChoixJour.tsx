"use client";

/* ════════════════════════════════════════════════════════════════════
   « Quel jour ? » — la liste des sept jours, écrite UNE SEULE FOIS.

   Elle vivait dans le menu `⋯` d'une séance du catalogue. V7A lui donne
   un second appelant : le héros de l'accueil, quand on donne un jour à
   la prochaine étape du programme. Deux copies de cette liste, ce
   seraient deux façons de dire ce qu'une journée porte déjà, et deux
   occasions de diverger sur la seule règle qui compte ici.

   ⚠️ « PRISE » NE VEUT PLUS DIRE « INTERDITE » (V6b). Une journée peut
   porter une séance et un supplément : poser une séance sur un jour
   occupé l'AJOUTE, elle n'écrase plus rien. Seul le passé est fermé ;
   une journée dont tout est fait reste ouverte à un extra.
   ════════════════════════════════════════════════════════════════════ */

import { motion } from "framer-motion";
import { useMemo } from "react";
import {
  dayTitle, parDate, principale, seancesDuJour, todayYmd, weekDates,
  type PlanningDay,
} from "@/lib/planning";

const DAY_FULL = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];

export default function ChoixJour({ week, onChoisir }: {
  week: PlanningDay[] | null;
  onChoisir: (date: string) => void;
}) {
  const dates = weekDates();
  const today = todayYmd();
  const parJour = useMemo(() => parDate(week), [week]);

  return (
    <>
      {DAY_FULL.map((nom, i) => {
        const date = dates[i];
        const intentions = parJour[date] ?? [];
        const tete = principale(intentions);
        const prise = seancesDuJour(intentions).length > 0;
        const faite = !!tete && intentions.every((x) => x.status === "done");
        const bloque = date < today;
        return (
          <motion.button key={date} whileTap={bloque ? undefined : { scale: 0.98 }}
            onClick={() => { if (!bloque) onChoisir(date); }}
            disabled={bloque}
            className="w-full flex items-center gap-3 py-2.5 text-left border-none bg-transparent"
            style={{ opacity: bloque ? 0.38 : 1, cursor: bloque ? "default" : "pointer" }}>
            <span className="w-[42px] text-[11px] font-semibold flex-shrink-0"
              style={{ color: date === today ? "var(--accent)" : "var(--text-2)" }}>
              {nom.slice(0, 3)}
            </span>
            <span className="flex-1 min-w-0 text-[12.5px] font-semibold truncate"
              style={{ color: prise ? "var(--text-2)" : "var(--text-3)" }}>
              {tete ? dayTitle(tete) + (faite ? " ✓" : "") : "Rien de prévu"}
            </span>
            {!bloque && (
              <span className="text-[10px] font-bold flex-shrink-0"
                style={{ color: prise ? "var(--exp-encre)" : "var(--accent)" }}>
                {prise ? "Ajouter" : date === today ? "Aujourd’hui" : "Choisir"}
              </span>
            )}
          </motion.button>
        );
      })}
    </>
  );
}
