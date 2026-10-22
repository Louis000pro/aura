"use client";

/* L'intro de la première séance du jour (Louis, 2026-10-21, maquette
   « T'es prêt ? » validée : « PARFAIT »).

   On appuie sur « C'est parti » : le Guide monte en grand, « PRÊT ? » s'écrit
   derrière lui dans le mot géant de Vaiiya, puis 3, 2, 1 (un toutes les
   0,7 s), il s'efface sur place et « GO » prend l'écran. La séance démarre ensuite.

   Les règles, à ne pas défaire :
   - **Toujours clair**, comme le tunnel : fond presque blanc, lueur lavande,
     mots en encre sombre. GO aussi est en noir (Louis).
   - **Une fois par jour** (jour parisien), seulement à la première séance :
     `introDuJourAJouer` / `noterIntroDuJour`, repère par compte et par appareil.
   - **Jamais sans Guide résolu** (on ne devine pas le Guide), et jamais quand
     l'appareil demande moins d'animations : la séance démarre directement.
   - **Un toucher la passe.** Ce 3-2-1 remplace celui du premier effort
     chronométré : le tunnel ne le rejoue pas derrière. */

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useAnimate } from "framer-motion";
import type { GuideId } from "@/lib/guides";
import { parisDateStr } from "@/lib/dates";
import { jouerSon } from "@/lib/sons";

const CLE = (userId: string) => `vaiiya_intro_seance_${userId}`;

/** Faut-il jouer l'intro ? Première séance du jour parisien, un Guide résolu,
 *  et un appareil qui accepte les animations. */
export function introDuJourAJouer(userId: string | null | undefined, guide: GuideId | null): boolean {
  if (!userId || !guide || typeof window === "undefined") return false;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return false;
  try { return localStorage.getItem(CLE(userId)) !== parisDateStr(); }
  catch { return false; }
}

export function noterIntroDuJour(userId: string): void {
  try { localStorage.setItem(CLE(userId), parisDateStr()); } catch { /* sans gravité */ }
}

type Etape = "pret" | "3" | "2" | "1" | "go";
/* Le moment (en ms) où chaque étape commence, puis la fin. */
const PLAN: [Etape, number][] = [["pret", 0], ["3", 1000], ["2", 1700], ["1", 2400], ["go", 3100]];
const FIN = 3800;

const MOT: React.CSSProperties = {
  fontWeight: 900, fontVariationSettings: "'wdth' 125", letterSpacing: "-0.05em",
  lineHeight: 0.82, whiteSpace: "nowrap", color: "#1D1530", textTransform: "uppercase",
};

export default function IntroSeance({ guide, onFin }: { guide: GuideId; onFin: () => void }) {
  const [etape, setEtape] = useState<Etape>("pret");
  /* ⚠️ Rien ne part avant que l'image du Guide soit décodée (au plus 0,8 s
     d'attente) : sinon, sur un réseau lent, il arrivait en plein décompte. */
  const [charge, setCharge] = useState(false);
  const fini = useRef(false);
  const finir = useRef(onFin);
  useEffect(() => { finir.current = onFin; }, [onFin]);
  const src = `/guides/${guide}-master-v1.webp`;
  const [portrait, animer] = useAnimate();

  useEffect(() => {
    let vivant = true;
    const pret = () => { if (vivant) setCharge(true); };
    const img = new Image();
    img.src = src;
    const attente = window.setTimeout(pret, 800);
    img.decode().then(pret, pret);
    return () => { vivant = false; clearTimeout(attente); };
  }, [src]);

  /* La petite pulsation de chaque chiffre se JOUE sur l'image, elle ne la
     remonte pas : une clé qui changeait à chaque chiffre faisait recharger
     le portrait, qui clignotait au 3, au 2 et au 1. */
  useEffect(() => {
    if (etape === "pret" || etape === "go" || !portrait.current) return;
    void animer(portrait.current, { scale: [1, 1.025, 1] }, { duration: 0.3 });
  }, [etape, animer, portrait]);

  useEffect(() => {
    if (!charge) return;
    const terminer = () => { if (!fini.current) { fini.current = true; finir.current(); } };
    const t = PLAN.slice(1).map(([e, ms]) => window.setTimeout(() => {
      setEtape(e);
      jouerSon(e === "go" ? "go" : "tic");
    }, ms));
    t.push(window.setTimeout(terminer, FIN));
    return () => t.forEach(clearTimeout);
  }, [charge]);

  const passer = () => { if (!fini.current) { fini.current = true; finir.current(); } };
  /* Le Guide disparaît d'un coup, sans fondu, pile quand GO apparaît (Louis). */
  const guideVisible = etape !== "go";

  return createPortal(
    <motion.div
      role="button" tabIndex={0} aria-label="Passer l’intro"
      onClick={passer} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") passer(); }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
      className="fixed inset-0 overflow-hidden"
      style={{ zIndex: 108, background: "radial-gradient(120% 70% at 50% 35%, #EFE6FF 0%, #FBF9FE 72%)", containerType: "size" }}
    >
      <span className="sr-only" aria-live="assertive">{etape === "pret" ? "Prêt ?" : etape === "go" ? "Go" : etape}</span>

      {/* Un mot à la fois : le suivant n'entre qu'une fois le précédent parti,
          sinon deux chiffres géants se superposaient le temps d'un fondu. */}
      <AnimatePresence mode="wait">
        {charge && etape === "pret" && (
          <motion.div key="pret" aria-hidden
            className="absolute inset-x-0 flex justify-center"
            style={{ ...MOT, top: "20cqh", fontSize: "19cqw", paddingInline: "4cqw" }}
            initial={{ opacity: 0, scale: 1.25 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, transition: { duration: 0.1 } }}
            transition={{ duration: 0.48, delay: 0.08, ease: [0.2, 0.8, 0.2, 1] }}
          >Prêt ?</motion.div>
        )}
        {(etape === "3" || etape === "2" || etape === "1") && (
          <motion.div key={etape} aria-hidden
            className="absolute inset-x-0 flex justify-center"
            style={{ ...MOT, top: "9cqh", fontSize: "78cqw" }}
            initial={{ opacity: 0, scale: 1.35 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, transition: { duration: 0.08 } }}
            transition={{ duration: 0.22, ease: [0.2, 0.9, 0.2, 1] }}
          >{etape}</motion.div>
        )}
        {etape === "go" && (
          <motion.div key="go" aria-hidden
            className="absolute inset-0 flex items-center justify-center"
            style={{ ...MOT, fontSize: "52cqw" }}
            initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: [0.6, 1.06, 1] }}
            transition={{ duration: 0.36, times: [0, 0.6, 1] }}
          >Go</motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {charge && guideVisible && (
          <motion.div key="guide" aria-hidden
            className="absolute"
            style={{
              left: "50%", bottom: "-2cqh", width: "118cqw", x: "-50%",
              WebkitMaskImage: "linear-gradient(180deg,#000 72%,transparent 96%)",
              maskImage: "linear-gradient(180deg,#000 72%,transparent 96%)",
            }}
            initial={{ y: "40%", scale: 0.9, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0 } }}
            transition={{ duration: 0.52, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <div ref={portrait} style={{ willChange: "transform" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="block h-auto w-full" draggable={false} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <span className="absolute text-[13px] font-semibold"
        style={{ right: "max(16px, env(safe-area-inset-right))", top: "calc(env(safe-area-inset-top) + 14px)", color: "rgba(29,21,48,.5)" }}>
        Passer
      </span>
    </motion.div>,
    document.body,
  );
}
