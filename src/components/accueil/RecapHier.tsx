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
import { CelebrationGuide, VisageGuide } from "@/components/AssistantMark";
import { nomGuide, type GuideRef } from "@/lib/guides";
import { lockBodyModal } from "@/lib/bodyModal";
import { nettoyerRecap, type Recap } from "@/lib/recapJour";

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
  /* Six cases au plus, donc deux rangées de trois. Bleu et violet pour
     l'entraînement (Louis : pas de vert ici), l'orange de l'énergie pour
     les calories. L'EXP sort de la grille : elle vit dans la pastille, à
     côté de la série, parce que ce sont les deux choses qu'on a GAGNÉES. */
  const cases: Case[] = [
    { valeur: f.seances.length, libelle: f.seances.length > 1 ? "séances" : "séance", encre: "var(--exp-encre)" },
    { valeur: f.minutes, unite: "min", libelle: "d’entraînement", encre: "var(--bleu-encre)" },
    { valeur: f.series, libelle: f.series > 1 ? "séries" : "série", encre: "var(--exp-encre)" },
    { valeur: f.kcalBrulees, unite: "kcal", libelle: "dépensées", encre: "var(--feu-encre)" },
    { valeur: f.repas, libelle: f.repas > 1 ? "repas notés" : "repas noté", encre: "var(--bleu-encre)" },
    { valeur: f.calories, unite: "kcal", libelle: "mangées", encre: "var(--feu-encre)" },
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
        aria-label="Ta journée d'hier"
        className="relative w-full sm:max-w-[400px] overflow-hidden rounded-t-[var(--r-feuille)] sm:rounded-[var(--r-affiche)]"
        style={{ background: "rgb(var(--surface-rgb))", boxShadow: "var(--ombre-flottant)", maxHeight: "94dvh", overflowY: "auto" }}
        initial={reduce ? false : { y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
      >
        {/* Le Guide en grand, en haut, sur une lumière douce : même dessin
            que la fin de séance. Blanc, sans verre, pour redonner confiance. */}
        <div
          className="flex flex-col items-center px-6 pt-5 text-center"
          style={{ background: "linear-gradient(180deg, rgba(139,92,246,0.13) 0%, rgba(193,59,193,0.05) 150px, transparent 220px)" }}
        >
          {guide ? (
            <CelebrationGuide guide={guide} hauteur="clamp(112px, 17vh, 150px)" />
          ) : (
            <VisageGuide guide={guide} etat="encourage" size={64} />
          )}
          <p className="text-[11px] font-semibold mt-2" style={{ color: "var(--or-encre)" }}>Vaiiya+ · Ton récap</p>
          <h2 className="vy-titre" style={{ fontSize: 26, fontWeight: 800, color: "var(--text-0)" }}>
            Ta journée d’hier
          </h2>
          <motion.p
            className="mt-2 text-[16px] leading-[1.45] max-w-[19rem]"
            style={{ color: "var(--text-1)", textWrap: "pretty" }}
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: reduce ? 0 : 0.35, duration: 0.4 }}
          >
            {/* Nettoyé aussi à l’affichage : un récap déjà gardé sur l’appareil
                peut encore porter l’emoji d’avant la règle. */}
            {nettoyerRecap(recap.texte)}
          </motion.p>

          {(f.serie > 1 || f.exp > 0) && (
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              {f.serie > 1 && (
                <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-bold"
                  style={{ background: "rgba(245,177,32,0.14)", color: "var(--feu-encre)" }}>
                  <span aria-hidden="true">🔥</span>
                  <span>Série de <span className="vy-nombre" style={{ fontWeight: 800 }}>{f.serie}</span>&nbsp;jours</span>
                </span>
              )}
              {f.exp > 0 && (
                <span className="inline-flex items-center rounded-full px-3 py-1.5 text-[13px] font-bold"
                  style={{ background: "rgba(139,92,246,0.12)", color: "var(--exp-encre)" }}>
                  +<span className="vy-nombre" style={{ fontWeight: 800 }}>{f.exp}</span>&nbsp;EXP
                </span>
              )}
            </div>
          )}
        </div>

        <div className="px-5" style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}>
          {cases.length > 0 && (
            /* Les chiffres : UN groupe à filets internes, trois par rangée,
               le nombre au-dessus de ce qu'il compte. Seules les valeurs non
               nulles s'affichent. */
            <div
              className="mt-5 grid grid-cols-3 overflow-hidden rounded-[var(--r-bloc)]"
              style={{ border: "1px solid rgba(var(--text-3-rgb),0.16)", background: "rgba(var(--tint-violet-rgb),0.35)" }}
            >
              {cases.map((c, i) => (
                <motion.div
                  key={c.libelle}
                  className="flex flex-col items-center justify-center px-2 py-3.5 text-center min-w-0"
                  style={{
                    borderLeft: i % 3 ? "1px solid rgba(var(--text-3-rgb),0.14)" : undefined,
                    borderTop: i > 2 ? "1px solid rgba(var(--text-3-rgb),0.14)" : undefined,
                  }}
                  initial={reduce ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: reduce ? 0 : 0.2 + i * 0.06, duration: 0.3 }}
                >
                  <p className="whitespace-nowrap leading-none" style={{ color: c.encre }}>
                    <span className="vy-nombre text-[26px]" style={{ fontWeight: 800 }}>{c.valeur}</span>
                    {c.unite && <span className="text-[11px] font-semibold ml-1">{c.unite}</span>}
                  </p>
                  <p className="text-[11px] mt-1.5 truncate max-w-full" style={{ color: "var(--text-2)" }}>{c.libelle}</p>
                </motion.div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={onFermer}
            className="mt-5 w-full py-4 rounded-2xl text-white text-[16px] font-bold"
            style={{ background: "linear-gradient(100deg, #8B5CF6, #C13BC1)", boxShadow: "var(--ombre-action)" }}
          >
            C’est parti
          </button>
          <button
            type="button"
            onClick={onParler}
            className="mt-1 w-full h-11 text-[13px] font-semibold"
            style={{ color: "var(--exp-encre)" }}
          >
            En parler {guide ? `avec ${nomGuide(guide)}` : "au coach"}
          </button>
        </div>
      </motion.div>
    </div>,
    document.body,
  );
}
