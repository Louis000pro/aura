"use client";

/* ════════════════════════════════════════════════════════════════════
   « Quel jour ? » — le sélecteur de jour, écrit UNE SEULE FOIS.

   Il vivait dans le menu `⋯` d'une séance du catalogue. V7A lui a donné
   un second appelant : le héros de l'accueil, quand on donne un jour à
   la prochaine étape du programme. Deux copies, ce seraient deux façons
   de dire ce qu'une journée porte déjà.

   ⚠️ ⚠️ IL PROPOSAIT LA SEMAINE CIVILE, ET C'ÉTAIT UN CUL-DE-SAC UN
   DIMANCHE. Il posait `weekDates()` (lundi → dimanche de la semaine EN
   COURS) puis grisait tout ce qui est passé : le samedi il restait deux
   jours, le dimanche **un seul**, et il devenait impossible de placer
   quoi que ce soit. Or le modèle dit exactement l'inverse : la prochaine
   étape peut rester « quand tu veux », mais si on décide de la dater, on
   doit pouvoir choisir un vrai jour futur. Il déroule donc les QUINZE
   PROCHAINS JOURS à partir d'aujourd'hui (`prochainsJours`, dont le
   commentaire promettait déjà « ce qu'attend un choix : quand veux-tu la
   faire ? »). Plus aucune ligne grisée : ce qui est proposé est
   choisissable.

   ⚠️ ET IL LIT SA PROPRE FENÊTRE, IL NE REÇOIT PLUS LA SEMAINE. Les
   écrans ne connaissent que la semaine courante : au-delà, ce composant
   aurait affirmé « Rien de prévu » sur des journées qu'il n'a jamais
   lues, ce qui est pire que de ne rien dire. Une requête, à l'ouverture,
   sur exactement les dates montrées. Tant qu'elle n'est pas revenue, la
   colonne du milieu reste VIDE : on n'annonce pas une journée libre
   avant de savoir.

   ⚠️ « PRISE » NE VEUT PAS DIRE « INTERDITE » (V6b). Une journée peut
   porter une séance et un supplément : poser une séance sur un jour
   occupé l'AJOUTE, elle n'écrase rien.
   ════════════════════════════════════════════════════════════════════ */

import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  dayTitle, fetchRange, principale, prochainsJours, seancesDuJour, todayYmd,
  type PlanningDay,
} from "@/lib/planning";

/** Deux semaines pleines : c'est ce qui garantit qu'un dimanche donne
 *  accès à toute la semaine suivante, quel que soit le jour où l'on est. */
const FENETRE = 15;

const COURT = ["dim", "lun", "mar", "mer", "jeu", "ven", "sam"];

/** « Auj. », « Demain », puis le jour ET son quantième : sur quinze jours
 *  il y a deux lundis, et deux lignes qui se lisent pareil ne se
 *  choisissent pas. */
function libelle(date: string, today: string, demain: string): string {
  if (date === today) return "Auj.";
  if (date === demain) return "Demain";
  const d = new Date(date + "T00:00:00");
  return `${COURT[d.getDay()]} ${d.getDate()}`;
}

export default function ChoixJour({ onChoisir }: { onChoisir: (date: string) => void }) {
  const { user } = useAuth();
  const dates = useMemo(() => prochainsJours(FENETRE), []);
  const today = todayYmd();
  /** `null` = pas encore lu. On ne confond jamais « je ne sais pas » et
   *  « il n'y a rien », c'est la règle de tout le chantier. */
  const [parJour, setParJour] = useState<Record<string, PlanningDay[]> | null>(null);

  useEffect(() => {
    if (!user) return;
    let annule = false;
    void fetchRange(user.id, dates)
      .then((r) => { if (!annule) setParJour(r); })
      .catch(() => { if (!annule) setParJour({}); });
    return () => { annule = true; };
  }, [user, dates]);

  return (
    <div className="overflow-y-auto" style={{ maxHeight: "46vh", scrollbarWidth: "none" }}>
      {dates.map((date) => {
        const intentions = parJour?.[date] ?? [];
        const tete = principale(intentions);
        const prise = seancesDuJour(intentions).length > 0;
        const faite = !!tete && intentions.every((x) => x.status === "done");
        return (
          <motion.button key={date} whileTap={{ scale: 0.98 }}
            onClick={() => onChoisir(date)}
            className="w-full flex items-center gap-3 py-2.5 text-left border-none bg-transparent cursor-pointer">
            <span className="w-[56px] text-[11px] font-semibold flex-shrink-0"
              style={{ color: date === today ? "var(--accent)" : "var(--text-2)" }}>
              {libelle(date, today, dates[1])}
            </span>
            <span className="flex-1 min-w-0 text-[12.5px] font-semibold truncate"
              style={{ color: prise ? "var(--text-2)" : "var(--text-3)" }}>
              {parJour === null ? "" : tete ? dayTitle(tete) + (faite ? " ✓" : "") : "Rien de prévu"}
            </span>
            <span className="text-[10px] font-bold flex-shrink-0"
              style={{ color: prise ? "var(--exp-encre)" : "var(--accent)" }}>
              {prise ? "Ajouter" : date === today ? "Aujourd’hui" : "Choisir"}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
