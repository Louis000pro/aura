"use client";

/* ════════════════════════════════════════════════════════════════════
   RecapHier — le popup du récap d'hier (avantage Vaiiya+).

   Demande de Louis (2026-09-25) : à l'ouverture de l'app, un popup avec
   ce qui a été fait hier (séances, temps, séries, calories, repas, EXP)
   et le Guide qui dit un truc super positif dessus.

   ⚠️ Seules les valeurs NON NULLES s'affichent : une case « 0 repas »
   serait un reproche, et le produit s'interdit d'en faire. Une journée
   entièrement vide n'ouvre pas le popup du tout (voir `journeeVide`).
   ⚠️ Pas de `toLocaleString` sur les chiffres : l'espace insécable des
   milliers casse la lecture en chasse fixe (règle de `.vy-nombre`).
   ════════════════════════════════════════════════════════════════════ */

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, useReducedMotion } from "framer-motion";
import { VisageGuide } from "@/components/AssistantMark";
import { nomGuide, type GuideRef } from "@/lib/guides";
import { lockBodyModal } from "@/lib/bodyModal";
import type { Recap } from "@/lib/recapJour";

type Case = { valeur: number; unite?: string; libelle: string; encre: string };

export default function RecapHier({
  recap,
  guide,
  onFermer,
  onParler,
}: {
  recap: Recap;
  guide: GuideRef;
  onFermer: () => void;
  onParler: () => void;
}) {
  const reduce = useReducedMotion();
  useEffect(() => lockBodyModal(), []);

  const f = recap.faits;
  const cases: Case[] = [
    { valeur: f.seances.length, libelle: f.seances.length > 1 ? "séances" : "séance", encre: "var(--teal-encre)" },
    { valeur: f.minutes, unite: "min", libelle: "d'entraînement", encre: "var(--teal-encre)" },
    { valeur: f.series, libelle: f.series > 1 ? "séries" : "série", encre: "var(--teal-encre)" },
    { valeur: f.kcalBrulees, unite: "kcal", libelle: "dépensées", encre: "var(--feu-encre)" },
    { valeur: f.repas, libelle: f.repas > 1 ? "repas notés" : "repas noté", encre: "var(--feu-encre)" },
    { valeur: f.calories, unite: "kcal", libelle: "mangées", encre: "var(--feu-encre)" },
    { valeur: f.exp, unite: "EXP", libelle: "gagnée", encre: "var(--exp-encre)" },
  ].filter((c) => c.valeur > 0);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[112] flex items-end sm:items-center justify-center sm:px-4">
      <motion.div
        className="absolute inset-0 bg-black/50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={onFermer}
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Ton récap d'hier"
        className="relative w-full sm:max-w-[400px] rounded-t-[var(--r-feuille)] sm:rounded-[var(--r-affiche)] px-5 pt-6"
        style={{
          background: "rgb(var(--surface-rgb))",
          boxShadow: "var(--ombre-flottant)",
          paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))",
        }}
        initial={reduce ? false : { y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
      >
        <div className="flex items-center gap-3">
          <VisageGuide guide={guide} etat="encourage" size={48} />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold" style={{ color: "var(--or-encre)" }}>Vaiiya+ · Ton récap</p>
            <h2 className="vy-titre" style={{ color: "var(--text-0)" }}>Ta journée d’hier</h2>
          </div>
        </div>

        {cases.length > 0 && (
          <div
            className="mt-5 grid grid-cols-3 gap-y-4 gap-x-2 rounded-[var(--r-bloc)] px-3 py-4"
            style={{ background: "rgba(var(--text-3-rgb), .07)" }}
          >
            {cases.map((c, i) => (
              <motion.div
                key={c.libelle}
                className="flex flex-col items-center text-center min-w-0"
                initial={reduce ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: reduce ? 0 : 0.15 + i * 0.06, duration: 0.3 }}
              >
                <span className="whitespace-nowrap" style={{ color: c.encre }}>
                  <span className="vy-nombre text-[26px]" style={{ fontWeight: 800 }}>{c.valeur}</span>
                  {c.unite && <span className="text-[11px] font-semibold ml-0.5">{c.unite}</span>}
                </span>
                <span className="text-[11px] mt-0.5" style={{ color: "var(--text-2)" }}>{c.libelle}</span>
              </motion.div>
            ))}
          </div>
        )}

        <motion.p
          className="mt-5 text-[16px] leading-[1.45]"
          style={{ color: "var(--text-0)", textWrap: "pretty" }}
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: reduce ? 0 : 0.5, duration: 0.4 }}
        >
          {recap.texte}
        </motion.p>
        {f.serie > 1 && (
          <p className="mt-2 text-[13px]" style={{ color: "var(--feu-encre)" }}>
            🔥 Série de <span className="vy-nombre">{f.serie}</span> jours
          </p>
        )}

        <button
          type="button"
          onClick={onFermer}
          className="mt-6 w-full h-12 rounded-full text-white text-[16px] font-semibold"
          style={{ background: "linear-gradient(135deg, #8B5CF6, #C13BC1)", boxShadow: "var(--ombre-action)" }}
        >
          C’est parti
        </button>
        <button
          type="button"
          onClick={onParler}
          className="mt-2 w-full h-10 text-[13px] font-semibold"
          style={{ color: "var(--exp-encre)" }}
        >
          En parler {guide ? `avec ${nomGuide(guide)}` : "au coach"}
        </button>
      </motion.div>
    </div>,
    document.body,
  );
}
