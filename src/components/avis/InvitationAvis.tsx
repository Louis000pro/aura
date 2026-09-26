"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Star, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  EVENEMENT_PROPOSER_AVIS,
  LIEN_AVIS,
  marquerAvis,
  peutProposerAvis,
} from "@/lib/invitationAvis";

/**
 * L'invitation à laisser un avis. Montée une fois dans le layout : elle répond à
 * un moment de satisfaction (montée de rang, relais gagné) qui peut survenir
 * n'importe où, donc elle ne peut pas vivre dans un écran.
 *
 * Discrète et ignorable par contrat : une carte en bas, jamais un mur ni un
 * voile. Elle ne s'affiche qu'UNE fois par personne (le flag se pose à
 * l'affichage, `avis.ts`), donc « fermer » suffit à ne plus jamais la revoir —
 * pas de « plus tard » mensonger. Aucune récompense, aucune promesse : on ne
 * paie pas un avis et on ne demande pas un « bon » avis (§14/§17).
 */
export default function InvitationAvis() {
  const { user } = useAuth();
  const reduce = useReducedMotion();
  const [ouvert, setOuvert] = useState(false);

  const fermer = useCallback(() => setOuvert(false), []);

  useEffect(() => {
    const onProposer = () => {
      const id = user?.id;
      if (!id || !peutProposerAvis(id)) return;
      // On ferme la porte tout de suite : vue une fois, jamais reproposée, même
      // si la personne navigue ailleurs sans répondre.
      marquerAvis(id, "vu");
      // Un court délai laisse la scène précédente (célébration de rang) finir sa
      // sortie avant que la carte n'arrive : on ne s'empile pas dessus.
      window.setTimeout(() => setOuvert(true), 700);
    };
    window.addEventListener(EVENEMENT_PROPOSER_AVIS, onProposer);
    return () => window.removeEventListener(EVENEMENT_PROPOSER_AVIS, onProposer);
  }, [user?.id]);

  // Auto-effacement : une invitation qui reste plantée à l'écran devient une gêne.
  useEffect(() => {
    if (!ouvert) return;
    const t = window.setTimeout(() => setOuvert(false), 14000);
    return () => window.clearTimeout(t);
  }, [ouvert]);

  const donnerAvis = useCallback(() => {
    const id = user?.id;
    if (id) marquerAvis(id, "fait");
    window.open(LIEN_AVIS, "_blank", "noopener,noreferrer");
    setOuvert(false);
  }, [user?.id]);

  // `ouvert` est toujours faux à l'hydratation (il ne passe à vrai qu'après un
  // évènement client), donc rien ne se rend au montage : ce garde suffit, sans
  // état de montage ni setState dans un effet.
  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {ouvert && (
        <motion.div
          className="fixed inset-x-0 z-[112] flex justify-center px-4"
          style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 84px)" }}
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: 24 }}
          transition={{ type: "spring", damping: 24, stiffness: 280 }}
          role="dialog"
          aria-label="Donner ton avis sur Vaiiya"
        >
          <div
            className="relative w-full max-w-[380px] rounded-[22px] px-4 pt-4 pb-3.5"
            style={{
              background: "var(--page-bg)",
              border: "1px solid rgba(var(--accent-rgb),0.16)",
              boxShadow: "0 18px 48px rgba(0,0,0,0.32)",
            }}
          >
            <button
              type="button"
              onClick={fermer}
              aria-label="Fermer"
              className="absolute right-2.5 top-2.5 grid h-7 w-7 place-items-center rounded-full active:opacity-70"
              style={{ color: "var(--text-3)" }}
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-start gap-3 pr-6">
              <span
                aria-hidden="true"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full"
                style={{ background: "rgba(var(--accent-rgb),0.10)", color: "var(--gold)" }}
              >
                <Star className="h-[18px] w-[18px]" fill="currentColor" />
              </span>
              <div className="min-w-0">
                <p className="text-[14px] font-bold leading-tight" style={{ color: "var(--text-0)" }}>
                  Tu aimes Vaiiya&nbsp;?
                </p>
                <p className="mt-1 text-[12px] leading-snug" style={{ color: "var(--text-soft)" }}>
                  Ton avis aide d’autres personnes à nous découvrir. 30&nbsp;secondes, si le cœur t’en dit.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={donnerAvis}
              className="mt-3 w-full rounded-2xl py-3 text-[15px] font-bold text-white active:opacity-90"
              style={{
                background: "linear-gradient(135deg,#8B5CF6,#C13BC1)",
                boxShadow: "0 8px 22px rgba(139,92,246,0.30)",
              }}
            >
              Donner mon avis
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
