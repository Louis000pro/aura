"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import GemmeRang from "@/components/GemmeRang";
import ApercuRecompense from "@/components/rang/ApercuRecompense";
import { rejouerCelebration } from "@/lib/celebrationRang";
import { RANGS, RECOMPENSE_RANG } from "@/lib/aura";

/**
 * La galerie de TOUS les rangs (bottom-sheet). Montre la gemme, le nom, le seuil
 * EXP et l'état (atteint / rang courant / verrouillé) de chaque rang connu.
 * Les rangs pas encore atteints sont grisés + désaturés (mystère préservé).
 *
 * ⚠️ Depuis le 2026-07-29, chaque récompense est montrée en APERÇU RÉEL, sur le
 * pseudo et la photo de l'utilisateur, avec les composants de `IdentiteRang.tsx`
 * qui la rendent vraiment dans l'app. Louis : « on ne sait même pas ce que c'est,
 * on n'en a jamais vu ». Une récompense qu'on ne peut pas montrer ici ne doit pas
 * être annoncée du tout.
 *
 * Ouverte depuis l'accueil (bandeau de rang) ET depuis le profil (carte « Ton
 * rang ») : le profil ouvrait l'accueil, ce qui perdait l'utilisateur en route.
 */
export default function RangsModal({
  open,
  onClose,
  expActuel,
  rangActuelId,
  pseudo,
  avatarUrl,
  isAdmin = false,
}: {
  open: boolean;
  onClose: () => void;
  expActuel: number;
  rangActuelId: string;
  /** Pour montrer les aperçus sur SON pseudo (et pas un exemple abstrait). */
  pseudo: string;
  avatarUrl?: string | null;
  /** Admin : rejouer la célébration d'un rang pour la vérifier sur son téléphone. */
  isAdmin?: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          style={{ background: "rgba(10,6,20,0.55)", backdropFilter: "blur(4px)" }}
        >
          <motion.div
            className="w-full sm:max-w-md max-h-[85vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl px-5 pt-4 pb-[calc(env(safe-area-inset-bottom)+20px)]"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            style={{ background: "var(--page-bg)", boxShadow: "0 -8px 40px rgba(0,0,0,0.3)" }}
          >
            {/* poignée + titre */}
            <div className="flex items-center justify-between mb-1">
              <div className="mx-auto sm:hidden h-1.5 w-10 rounded-full" style={{ background: "rgba(var(--accent-rgb),0.25)" }} />
            </div>
            <div className="flex items-center justify-between mb-1 mt-1">
              <h2 className="text-[18px] font-extrabold" style={{ color: "var(--text-0)" }}>Les rangs</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fermer"
                className="grid place-items-center h-8 w-8 rounded-full outline-none active:opacity-80"
                style={{ background: "rgba(var(--accent-rgb),0.08)", color: "var(--text-soft)" }}
              >
                <X size={16} strokeWidth={2.5} />
              </button>
            </div>
            <p className="mb-4 text-[12.5px] leading-snug" style={{ color: "var(--text-3)" }}>
              Chaque rang débloque une décoration. Elle s&apos;applique toute seule dès que tu l&apos;atteins ✦
            </p>

            <div className="flex flex-col gap-3">
              {RANGS.map((rang) => {
                const atteint = expActuel >= rang.min;
                const courant = rang.id === rangActuelId;
                const reco = RECOMPENSE_RANG[rang.id];
                return (
                  <div
                    key={rang.id}
                    className="rounded-2xl px-3.5 py-3"
                    style={{
                      background: courant ? "rgba(var(--accent-rgb),0.07)" : "rgb(var(--surface-rgb))",
                      border: courant ? "1.5px solid rgba(var(--accent-rgb),0.35)" : "1px solid rgba(var(--accent-rgb),0.08)",
                    }}
                  >
                    <div className="flex items-center gap-3.5">
                      <div
                        className="shrink-0"
                        style={{ filter: atteint ? "none" : "grayscale(0.85) opacity(0.45)" }}
                      >
                        <GemmeRang rang={rang} size={52} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[15px] font-extrabold" style={{ color: "var(--text-0)" }}>{rang.nom}</span>
                          {courant && (
                            <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide" style={{ background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", color: "#fff" }}>
                              Ton rang
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-[12px]" style={{ color: "var(--text-3)" }}>
                          {rang.min === 0
                            ? "Le point de départ"
                            : atteint
                              ? "Débloqué"
                              : "À débloquer"}
                        </p>
                      </div>
                      <div className="shrink-0 text-[11px] font-bold" style={{ color: atteint ? "var(--accent)" : "var(--text-soft)" }}>
                        {atteint ? "Atteint ✦" : `${rang.min} EXP`}
                      </div>
                    </div>

                    {reco && (
                      <div
                        className="mt-2.5 rounded-xl px-3 py-2.5"
                        style={{
                          background: atteint ? "rgba(var(--accent-rgb),0.06)" : "rgba(var(--accent-rgb),0.03)",
                          border: "1px solid rgba(var(--accent-rgb),0.08)",
                        }}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-[16px] shrink-0" style={{ filter: atteint ? "none" : "grayscale(1) opacity(0.5)" }}>
                            {atteint ? reco.emoji : "🔒"}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-[12.5px] font-bold leading-tight" style={{ color: atteint ? "var(--text-0)" : "var(--text-soft)" }}>
                              {reco.titre}
                            </p>
                            <p className="mt-0.5 text-[11px] leading-snug" style={{ color: "var(--text-3)" }}>
                              {reco.desc}
                            </p>
                          </div>
                        </div>

                        {/* L'aperçu : la décoration jouée pour de vrai, sur toi. */}
                        <div
                          className="mt-2.5 flex items-center gap-3 rounded-lg px-3 py-2.5"
                          style={{
                            background: "rgba(var(--tint-violet-rgb),0.55)",
                            border: "1px dashed rgba(var(--accent-rgb),0.16)",
                          }}
                        >
                          <ApercuRecompense
                            kind={reco.apercu}
                            rang={rang}
                            pseudo={pseudo}
                            avatarUrl={avatarUrl}
                          />
                          <span className="ml-auto shrink-0 text-[9.5px] font-bold uppercase tracking-[0.12em]" style={{ color: atteint ? "var(--accent)" : "var(--text-3)" }}>
                            {atteint ? "Actif" : "Aperçu"}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Admin seulement : la célébration ne se joue qu'à une VRAIE montée
                de rang, donc elle est invisible pour qui a déjà son rang. De quoi
                la vérifier sur son téléphone sans toucher au stockage. */}
            {isAdmin && (
              <div className="mt-4 border-t pt-3" style={{ borderColor: "rgba(var(--accent-rgb),0.1)" }}>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: "var(--text-3)" }}>
                  Admin · rejouer la célébration
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {RANGS.map((rang) => (
                    <button
                      key={rang.id}
                      type="button"
                      onClick={() => {
                        onClose();
                        rejouerCelebration(rang.id);
                      }}
                      className="rounded-full px-2.5 py-1 text-[11px] font-bold active:opacity-80"
                      style={{
                        background: "rgba(var(--accent-rgb),0.08)",
                        color: "var(--accent)",
                        border: "1px solid rgba(var(--accent-rgb),0.14)",
                      }}
                    >
                      {rang.nom}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
