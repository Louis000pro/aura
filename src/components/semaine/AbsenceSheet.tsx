"use client";

/* ════════════════════════════════════════════════════════════════════
   R9b · « JE M'ABSENTE » (maquette 08, écran 08)

   Une plage de dates. La projection se suspend, aucun rappel ne part, et
   les séances attendent dans le même ordre : aucune n'est comptée comme
   manquée. Rien n'est effacé.

   ⚠️ « Je m'absente » ET JAMAIS « Je serai absente » : pas d'accord de
   genre (GO de Louis sur la maquette 08).
   ════════════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import FeuilleBas from "@/components/semaine/FeuilleBas";
import { poserAbsence, retirerAbsence } from "@/lib/joursEntrainement";
import type { Calendrier } from "@/lib/projection";
import { ABSENCE_JOURS_MAX, LETTRES_JOURS, choisirPlage, libellePlage, semaineDe } from "@/lib/semaine";
import { decaler } from "@/lib/projection";

const SEMAINES = 5;

const ecart = (a: string, b: string) =>
  Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);

export default function AbsenceSheet({ userId, calendrier, aujourdhui, onClose, onEnregistre }: {
  userId: string;
  calendrier: Calendrier;
  aujourdhui: string;
  onClose: () => void;
  onEnregistre: () => void;
}) {
  const [plage, setPlage] = useState<{ debut: string | null; fin: string | null }>({ debut: null, fin: null });
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const lundi = semaineDe(aujourdhui)[0];
  const grille = Array.from({ length: SEMAINES * 7 }, (_, i) => decaler(lundi, i));
  const fin = plage.fin ?? plage.debut;
  const aVenir = calendrier.absences.filter((a) => a.fin >= aujourdhui).sort((a, b) => a.debut.localeCompare(b.debut));

  const enregistrer = async () => {
    if (!plage.debut || !fin) return;
    if (ecart(plage.debut, fin) > ABSENCE_JOURS_MAX) { setErreur("Une absence dure au plus quatre mois."); return; }
    setEnvoi(true); setErreur(null);
    try {
      await poserAbsence(userId, plage.debut, fin);
      onEnregistre();
    } catch (e) {
      setErreur((e as Error).message === "absence_chevauche"
        ? "Ces dates touchent une absence déjà prévue. Retire-la d’abord."
        : "Ton absence n’a pas été enregistrée. Réessaie dans un instant.");
      setEnvoi(false);
    }
  };

  const retirer = async (id: string | undefined) => {
    if (!id) return;
    setEnvoi(true); setErreur(null);
    try { await retirerAbsence(userId, id); onEnregistre(); }
    catch { setErreur("Ça n’a pas pris. Réessaie dans un instant."); setEnvoi(false); }
  };

  return (
    <FeuilleBas onClose={onClose} niveau={105}>
      <div className="px-5 pt-1 pb-2 flex items-center justify-between flex-shrink-0">
        <p className="vy-sous" style={{ color: "var(--text-0)" }}>Je m&apos;absente</p>
        <button onClick={onClose} aria-label="Fermer" className="w-8 h-8 flex items-center justify-center cursor-pointer bg-transparent border-none">
          <X size={16} style={{ color: "var(--text-3)" }} />
        </button>
      </div>

      <div className="overflow-y-auto px-5 flex-1" style={{ scrollbarWidth: "none" }}>
        <div className="grid grid-cols-7 gap-1 mt-1">
          {LETTRES_JOURS.map((l, i) => (
            <span key={i} className="text-center text-[11px] font-bold" style={{ color: "var(--text-3)" }}>{l}</span>
          ))}
          {grille.map((d) => {
            const passe = d < aujourdhui;
            const dedans = !!plage.debut && !!fin && d >= plage.debut && d <= fin;
            const borne = d === plage.debut || d === fin;
            return (
              <button key={d} disabled={passe} onClick={() => { setErreur(null); setPlage((p) => choisirPlage(p, d)); }}
                className="h-10 rounded-[var(--r-controle)] text-[13px] font-semibold border-none"
                style={{
                  cursor: passe ? "default" : "pointer",
                  opacity: passe ? 0.3 : 1,
                  background: borne ? "linear-gradient(135deg,#8B5CF6,#C13BC1)" : dedans ? "rgba(var(--accent-rgb),0.16)" : "transparent",
                  color: borne ? "#fff" : d === aujourdhui ? "var(--exp-encre)" : "var(--text-1)",
                }}>
                {Number(d.slice(8, 10))}
              </button>
            );
          })}
        </div>

        <p className="vy-corps mt-4" style={{ color: "var(--text-1)" }}>
          {plage.debut ? libellePlage(plage.debut, fin) : "Touche le premier jour, puis le dernier."}
        </p>
        <p className="vy-label mt-1" style={{ color: "var(--text-3)" }}>
          Tes séances t&apos;attendent à ton retour, dans le même ordre. Aucune ne sera comptée comme manquée.
        </p>

        {aVenir.length > 0 && (
          <div className="mt-5">
            <p className="text-[13px] font-semibold" style={{ color: "var(--text-1)" }}>Déjà prévu</p>
            {aVenir.map((a) => (
              <div key={a.id ?? a.debut} className="flex items-center justify-between py-2" style={{ borderTop: "1px solid rgba(var(--text-3-rgb),0.14)" }}>
                <span className="text-[13px]" style={{ color: "var(--text-2)" }}>{libellePlage(a.debut, a.fin)}</span>
                <button onClick={() => void retirer(a.id)} disabled={envoi}
                  className="text-[13px] font-semibold bg-transparent border-none cursor-pointer" style={{ color: "var(--exp-encre)" }}>
                  Retirer
                </button>
              </div>
            ))}
          </div>
        )}
        {erreur && <p className="text-[13px] mt-4" style={{ color: "#DC2626" }}>{erreur}</p>}
        <div style={{ height: 12 }} />
      </div>

      <div className="px-5 pt-3 flex-shrink-0" style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}>
        <motion.button whileTap={{ scale: 0.97 }} disabled={envoi || !plage.debut} onClick={() => void enregistrer()}
          className="w-full py-3 rounded-2xl text-[16px] font-extrabold text-white cursor-pointer border-none"
          style={{ background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", boxShadow: "var(--ombre-action)", opacity: envoi || !plage.debut ? 0.5 : 1 }}>
          Enregistrer mon absence
        </motion.button>
      </div>
    </FeuilleBas>
  );
}
