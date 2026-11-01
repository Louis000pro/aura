"use client";

/* ════════════════════════════════════════════════════════════════════
   EXPLIQUER UN CLASSIQUE, UNE FOIS, PUIS À UN TOUCHER (Louis, 2026-10-31 :
   « si j'avais pas eu le diapo, je n'aurais pas compris », et « je me
   demande s'il ne faudrait pas l'expliquer à chaque utilisateur la
   première fois qu'il fait face à des nouveaux concepts »).

   · La feuille de la première fois : le Guide annonce trois points. Elle
     s'ouvre toute seule, UNE fois par format (au chrono, le max, le
     compte, la tenue, la minute), puis se relit depuis « Les classiques ».
   · La règle complète : le but, le déroulé, ce qui compte, le chrono,
     l'arrêt, le score, le refaire, et avant de commencer.

   ⚠️ « Vu » vit sur l'appareil, par compte (`vaiiya_classiques_vus_<id>`).
   ════════════════════════════════════════════════════════════════════ */

import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { BellRing, ChevronLeft, Flag, Hand, Hourglass, Plus, Repeat, Timer, TrendingUp, User } from "lucide-react";
import { VisageGuide, AssistantSpark } from "@/components/AssistantMark";
import { voix, type GuideRef } from "@/lib/guides";
import { feuillePremiereFois, regleComplete, surtitre, typo, type Classique, type FormatClassique } from "@/lib/classiques";

const DEGRADE = "linear-gradient(100deg,#8B5CF6,#C13BC1)";
const MOT: React.CSSProperties = { fontWeight: 900, fontVariationSettings: "var(--w-voix)" };
const E = { t1: "#1F1B2E", t2: "#6B6580", lav: "#6B4BD6" };

/* ── Ce qui a déjà été vu ── */
const cle = (userId: string) => `vaiiya_classiques_vus_${userId}`;

export function feuilleVue(userId: string | null | undefined, format: FormatClassique): boolean {
  if (!userId) return true;
  try { return (JSON.parse(localStorage.getItem(cle(userId)) ?? "[]") as string[]).includes(format); }
  catch { return true; }
}

export function noterFeuilleVue(userId: string | null | undefined, format: FormatClassique): void {
  if (!userId) return;
  try {
    const vus = new Set(JSON.parse(localStorage.getItem(cle(userId)) ?? "[]") as string[]);
    vus.add(format);
    localStorage.setItem(cle(userId), JSON.stringify([...vus]));
  } catch { /* stockage bloqué : la feuille reviendra, ce n'est pas grave */ }
}

const ICONES: Record<FormatClassique, typeof Repeat[]> = {
  temps: [Repeat, Timer, User],
  max: [Repeat, TrendingUp, BellRing],
  compte: [Hand, TrendingUp, BellRing],
  tenue: [Timer, Hand, TrendingUp],
  minute: [Plus, Hourglass, Flag],
};

/* ── La feuille de la première fois ── */
export function FeuillePremiereFois({ classique: c, guide, ouverte, onFermer, onRegle }: {
  classique: Classique; guide: GuideRef; ouverte: boolean; onFermer: () => void; onRegle: () => void;
}) {
  if (typeof document === "undefined") return null;
  const f = feuillePremiereFois(c);
  const icones = ICONES[f.format];
  const phrase = voix(guide, f.format === "temps" ? "classique.premiere.classique" : "classique.premiere.format");
  return createPortal(
    <AnimatePresence>
      {ouverte && (
        <motion.div className="fixed inset-0 flex items-end sm:items-center justify-center" style={{ zIndex: 107, background: "rgba(8,5,16,0.55)" }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onFermer}>
          <motion.div role="dialog" aria-modal="true" aria-label={typo(f.question)}
            className="w-full sm:max-w-md bg-white px-5 pt-3 pb-7 overflow-y-auto"
            style={{ maxHeight: "92dvh", borderTopLeftRadius: "var(--r-feuille)", borderTopRightRadius: "var(--r-feuille)", scrollbarWidth: "none" }}
            initial={{ y: 60 }} animate={{ y: 0 }} exit={{ y: 60 }} transition={{ type: "spring", stiffness: 380, damping: 36 }}
            onClick={(e) => e.stopPropagation()}>
            <span className="block mx-auto rounded-full" style={{ width: 40, height: 5, background: "rgba(31,27,46,0.14)" }} aria-hidden="true" />
            <div className="flex items-end gap-3 mt-4">
              <span className="flex-shrink-0 rounded-full overflow-hidden" style={{ background: "rgba(139,92,246,0.10)" }}>
                {guide ? <VisageGuide guide={guide} etat="explain" size={44} /> : <span className="flex items-center justify-center" style={{ width: 44, height: 44 }}><AssistantSpark px={20} /></span>}
              </span>
              <p className="text-[16px] leading-snug rounded-[18px] px-4 py-3" style={{ background: "#F3EEFF", color: E.t1, borderBottomLeftRadius: 6 }}>
                {typo(phrase)}
              </p>
            </div>
            <p className="text-[13px] font-semibold mt-5" style={{ color: E.t2 }}>{surtitre(c)}</p>
            <h2 className="text-[34px] leading-[1.05] mt-1" style={{ ...MOT, color: E.t1 }}>{typo(f.question)}</h2>
            <div className="mt-4 rounded-[var(--r-bloc)] overflow-hidden" style={{ border: "1px solid rgba(31,27,46,0.10)" }}>
              {f.points.map((p, i) => {
                const Icone = icones[i] ?? Repeat;
                return (
                  <div key={i} className="flex gap-3.5 px-4 py-4" style={i ? { borderTop: "1px solid rgba(31,27,46,0.08)" } : undefined}>
                    <span className="flex-shrink-0 flex items-center justify-center rounded-full" style={{ width: 38, height: 38, background: "rgba(139,92,246,0.10)", color: E.lav }}>
                      <Icone size={18} strokeWidth={2.2} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[20px] font-bold leading-tight" style={{ color: E.t1 }}>{typo(p.titre)}</p>
                      <p className="text-[16px] mt-1 leading-snug" style={{ color: E.t2 }}>{typo(p.texte)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <motion.button type="button" whileTap={{ scale: 0.97 }} onClick={onFermer}
              className="w-full mt-5 flex items-center justify-center text-white font-bold text-[20px] cursor-pointer"
              style={{ height: 58, borderRadius: 22, background: DEGRADE, boxShadow: "0 10px 30px -6px rgba(193,59,193,0.45)" }}>
              J’ai compris
            </motion.button>
            <button type="button" onClick={onRegle} className="w-full mt-1 min-h-[44px] text-[16px] font-bold cursor-pointer" style={{ color: E.lav }}>
              Lire la règle complète
            </button>
            <p className="text-[13px] text-center mt-1" style={{ color: E.t2 }}>{typo("Tu peux le relire à tout moment dans « Les classiques ».")}</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

/* ── La règle complète ── */
export function PageRegle({ classique: c, ouverte, onFermer, onLancer }: {
  classique: Classique; ouverte: boolean; onFermer: () => void; onLancer?: () => void;
}) {
  if (typeof document === "undefined") return null;
  const sections = regleComplete(c);
  return createPortal(
    <AnimatePresence>
      {ouverte && (
        <motion.div className="fixed inset-0 flex justify-center" style={{ zIndex: 108, background: "rgba(8,5,16,0.55)" }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div role="dialog" aria-modal="true" aria-label={`La règle complète : ${c.titre}`}
            className="relative w-full sm:max-w-md h-[100dvh] flex flex-col"
            style={{ background: "linear-gradient(180deg,#F4EFFF 0%,#FBF9FF 40%,#FFFFFF 100%)" }}
            initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 40, opacity: 0 }} transition={{ duration: 0.22 }}>
            <div className="flex items-center gap-2 px-3 pt-3 flex-shrink-0">
              <button type="button" onClick={onFermer} aria-label="Revenir"
                className="flex items-center justify-center rounded-full cursor-pointer" style={{ width: 44, height: 44, color: E.t1 }}>
                <ChevronLeft size={22} strokeWidth={2.4} />
              </button>
              <p className="text-[16px] font-bold" style={{ color: E.t1 }}>La règle complète</p>
            </div>
            <div className="flex-1 overflow-y-auto px-5 pb-6" style={{ scrollbarWidth: "none" }}>
              <h2 className="text-[34px] leading-[1.05] mt-2" style={{ ...MOT, color: E.t1 }}>{c.titre}</h2>
              <p className="text-[16px] mt-2 leading-snug" style={{ color: E.t2 }}>{typo(c.promesse)}</p>
              <div className="mt-5">
                {sections.map((s, i) => (
                  <section key={i} className="py-4" style={i ? { borderTop: "1px solid rgba(31,27,46,0.08)" } : undefined}>
                    <h3 className="text-[20px] font-bold" style={{ color: E.t1 }}>{typo(s.titre)}</h3>
                    <p className="text-[16px] mt-1.5 leading-relaxed" style={{ color: "#4A4560" }}>{typo(s.texte)}</p>
                    {s.escalier && (
                      <div className="flex items-end gap-1.5 mt-3" style={{ height: 64 }} aria-hidden="true">
                        {s.escalier.map((n, k) => (
                          <span key={k} className="vy-nombre flex-1 flex justify-center rounded-[8px] pt-1 text-[11px]"
                            style={{ height: 18 + (46 * n) / Math.max(...s.escalier!), background: "#FFD9B8", color: "#7A3A0C", fontWeight: 800 }}>{n}</span>
                        ))}
                      </div>
                    )}
                  </section>
                ))}
              </div>
            </div>
            {onLancer && (
              <div className="px-5 pb-6 pt-3 flex-shrink-0" style={{ borderTop: "1px solid rgba(31,27,46,0.08)" }}>
                <motion.button type="button" whileTap={{ scale: 0.97 }} onClick={onLancer}
                  className="w-full flex items-center justify-center text-white font-bold text-[20px] cursor-pointer"
                  style={{ height: 58, borderRadius: 22, background: DEGRADE, boxShadow: "0 10px 30px -6px rgba(193,59,193,0.45)" }}>
                  C’est parti
                </motion.button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
