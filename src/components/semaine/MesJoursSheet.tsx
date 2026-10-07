"use client";

/* ════════════════════════════════════════════════════════════════════
   R9b · « MES JOURS » (maquette 08, écran 03)

   Une règle par semaine, à partir d'aujourd'hui (`effet_le`). Personne ne
   reçoit de jours choisis à sa place (décision 27).

   ⚠️ LA PREMIÈRE FOIS, L'APP MONTRE LES ANCIENNES SÉANCES AUTOMATIQUES
   ET DEMANDE QUOI EN FAIRE. Seul le mobilier (`origine = 'systeme'`, à
   venir, sans occurrence réservée) est proposé ; les séances faites, posées
   à la main ou par le Guide, et les réservations ne bougent jamais. Les
   garder est un choix valable : elles occupent leur jour, et la séance du
   programme passe au jour d'entraînement suivant.
   ════════════════════════════════════════════════════════════════════ */

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import FeuilleBas from "@/components/semaine/FeuilleBas";
import { enregistrerJours, oublierJours } from "@/lib/joursEntrainement";
import { dayTitle, fetchRange, libererMobilierAnnonce, type PlanningDay } from "@/lib/planning";
import { decaler, normaliserJours, type Calendrier } from "@/lib/projection";
import { ABR_JOURS, LETTRES_JOURS, mobilierAVenir } from "@/lib/semaine";

/** Jusqu'où l'on cherche le mobilier à proposer de retirer. */
const HORIZON_MOBILIER = 42;

export default function MesJoursSheet({ userId, calendrier, aujourdhui, onClose, onEnregistre }: {
  userId: string;
  calendrier: Calendrier;
  aujourdhui: string;
  onClose: () => void;
  onEnregistre: () => void;
}) {
  const [jours, setJours] = useState<number[]>(normaliserJours(calendrier.jours));
  const [mobilier, setMobilier] = useState<PlanningDay[] | null>(calendrier.choisi ? [] : null);
  /* ⚠️ Tour 42 · « JE N'AI PAS PU LIRE » N'EST PAS « IL N'Y A RIEN ». */
  const [mobilierIllisible, setMobilierIllisible] = useState(false);
  const [lecture, setLecture] = useState(0);
  /* Les jours sont enregistrés mais le retrait a échoué : on ne redemande
     que le retrait. */
  const [joursEnregistres, setJoursEnregistres] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const premiereFois = !calendrier.choisi;

  /* Le mobilier ne se cherche qu'au premier choix : ensuite il n'y en a plus. */
  useEffect(() => {
    if (!premiereFois) return;
    let vivant = true;
    const dates = Array.from({ length: HORIZON_MOBILIER }, (_, i) => decaler(aujourdhui, i));
    fetchRange(userId, dates)
      .then((m) => { if (vivant) { setMobilierIllisible(false); setMobilier(mobilierAVenir(Object.values(m).flat(), aujourdhui)); } })
      .catch(() => { if (vivant) { setMobilier(null); setMobilierIllisible(true); } });
    return () => { vivant = false; };
  }, [premiereFois, userId, aujourdhui, lecture]);

  const basculer = (j: number) => setJours((p) => (p.includes(j) ? p.filter((x) => x !== j) : [...p, j].sort()));

  /* ⚠️ Tour 42 · on ne retire QUE les lignes annoncées (par leur identité,
     encore admissibles en base), et les deux échecs se distinguent. */
  const enregistrer = async (retirerMobilier: boolean) => {
    setEnvoi(true); setErreur(null);
    if (!joursEnregistres) {
      try {
        await enregistrerJours(userId, jours, aujourdhui);
        setJoursEnregistres(true);
      } catch {
        setErreur("Tes jours n’ont pas été enregistrés. Réessaie dans un instant.");
        setEnvoi(false);
        return;
      }
    }
    if (retirerMobilier && mobilier && mobilier.length > 0) {
      try {
        await libererMobilierAnnonce(userId, mobilier.map((d) => d.id).filter((x): x is string => !!x));
      } catch {
        setErreur("Tes jours sont enregistrés, mais les anciennes séances sont encore là. Réessaie le retrait.");
        setEnvoi(false);
        return;
      }
    }
    onEnregistre();
  };

  const revenir = async () => {
    setEnvoi(true); setErreur(null);
    try { await oublierJours(userId); onEnregistre(); }
    catch { setErreur("Ça n’a pas pris. Réessaie dans un instant."); setEnvoi(false); }
  };

  const aRetirer = mobilier?.length ?? 0;

  return (
    <FeuilleBas onClose={onClose} niveau={105}>
      <div className="px-5 pt-1 pb-2 flex items-center justify-between flex-shrink-0">
        <p className="vy-sous" style={{ color: "var(--text-0)" }}>Mes jours d&apos;entraînement</p>
        <button onClick={onClose} aria-label="Fermer" className="w-8 h-8 flex items-center justify-center cursor-pointer bg-transparent border-none">
          <X size={16} style={{ color: "var(--text-3)" }} />
        </button>
      </div>

      <div className="overflow-y-auto px-5 flex-1" style={{ scrollbarWidth: "none" }}>
        <div className="flex gap-1.5 mt-1">
          {LETTRES_JOURS.map((l, i) => {
            const on = jours.includes(i + 1);
            return (
              <button key={i} onClick={() => basculer(i + 1)} aria-pressed={on} aria-label={ABR_JOURS[i]}
                className="flex-1 h-11 rounded-[var(--r-controle)] cursor-pointer text-[16px] font-bold"
                style={on
                  ? { background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", color: "#fff", border: "none" }
                  : { background: "transparent", color: "var(--text-2)", border: "1px solid rgba(var(--text-3-rgb),0.3)" }}>
                {l}
              </button>
            );
          })}
        </div>
        <p className="vy-label mt-2" style={{ color: "var(--text-3)" }}>
          {jours.length === 0 ? "Aucun jour fixe : rien ne sera prévu d’avance." : "Chaque semaine, à partir d’aujourd’hui."}
        </p>

        {premiereFois && mobilier === null && !mobilierIllisible && (
          <p className="vy-corps mt-5" style={{ color: "var(--text-3)" }}>Je regarde ce qui est déjà prévu…</p>
        )}
        {premiereFois && mobilierIllisible && (
          <div className="mt-5">
            <p className="vy-corps" style={{ color: "var(--text-2)" }}>Je n&apos;arrive pas à voir ce qui est déjà prévu.</p>
            <button onClick={() => { setMobilierIllisible(false); setLecture((n) => n + 1); }}
              className="mt-2 text-[13px] font-semibold bg-transparent border-none cursor-pointer p-0" style={{ color: "var(--exp-encre)" }}>
              Réessayer
            </button>
          </div>
        )}
        {premiereFois && aRetirer > 0 && (
          <div className="mt-5">
            <p className="text-[13px] font-semibold" style={{ color: "var(--text-1)" }}>
              {aRetirer} séance{aRetirer > 1 ? "s" : ""} posée{aRetirer > 1 ? "s" : ""} automatiquement avant
            </p>
            <div className="mt-2">
              {mobilier!.map((d) => (
                <p key={d.id ?? d.date} className="text-[13px] py-1.5" style={{ color: "var(--text-2)", borderTop: "1px solid rgba(var(--text-3-rgb),0.14)" }}>
                  {ABR_JOURS[(new Date(d.date + "T00:00:00").getDay() + 6) % 7]} {Number(d.date.slice(8, 10))} · {dayTitle(d)}
                </p>
              ))}
            </div>
            <p className="vy-label mt-2" style={{ color: "var(--text-3)" }}>
              Tes séances faites et celles que tu as posées toi-même ne bougent pas.
            </p>
          </div>
        )}
        {erreur && <p className="text-[13px] mt-4" style={{ color: "#DC2626" }}>{erreur}</p>}
        {calendrier.choisi && (
          <button onClick={revenir} disabled={envoi}
            className="vy-label mt-6 bg-transparent border-none p-0 cursor-pointer underline" style={{ color: "var(--text-3)" }}>
            Ne plus avoir de jours fixes
          </button>
        )}
        <div style={{ height: 12 }} />
      </div>

      <div className="px-5 pt-3 flex flex-col gap-2 flex-shrink-0"
        style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}>
        <motion.button whileTap={{ scale: 0.97 }} disabled={envoi || (premiereFois && mobilier === null)}
          onClick={() => void enregistrer(aRetirer > 0)}
          className="w-full py-3 rounded-2xl text-[16px] font-extrabold text-white cursor-pointer border-none"
          style={{ background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", boxShadow: "var(--ombre-action)", opacity: envoi ? 0.6 : 1 }}>
          {joursEnregistres && aRetirer > 0 ? "Réessayer le retrait" : aRetirer > 0 ? "Les retirer et garder mes jours" : "Garder ces jours"}
        </motion.button>
        {aRetirer > 0 && !joursEnregistres && (
          <button disabled={envoi} onClick={() => void enregistrer(false)}
            className="w-full py-2 text-[13px] font-semibold cursor-pointer bg-transparent border-none" style={{ color: "var(--text-2)" }}>
            Les garder aussi
          </button>
        )}
      </div>
    </FeuilleBas>
  );
}
