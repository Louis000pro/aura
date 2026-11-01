"use client";

/* ════════════════════════════════════════════════════════════════════
   LES PROGRAMMES · LES PIÈCES COMMUNES DES ÉCRANS (maquette « Les
   programmes », version 2).

   ⚠️ CES ÉCRANS SONT TOUJOURS CLAIRS, comme le tunnel et les classiques :
   les encres sont écrites en dur et ne suivent pas le mode sombre. Une
   pièce qui vit DANS un écran à thème (la rangée du catalogue, la bande de
   la semaine sur l'accueil) n'utilise pas ce fichier.
   ════════════════════════════════════════════════════════════════════ */

import { useEffect, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { ChevronLeft, X } from "lucide-react";
import { VisageGuide } from "@/components/AssistantMark";
import { lockBodyModal } from "@/lib/bodyModal";
import { typoParcours } from "@/lib/parcours";
import type { EtatGuide, GuideRef } from "@/lib/guides";

export const E = { t1: "#1F1B2E", t2: "#4A4560", t3: "#6B6580", t4: "#9A93AE", lav: "#6D4BD6", teal: "#0B8A68" };
export const DEGRADE = "linear-gradient(135deg,#8B5CF6,#C13BC1)";
export const FOND = "radial-gradient(150% 75% at 0% 0%, rgba(167,139,250,.30) 0%, rgba(167,139,250,.05) 65%, transparent 90%), linear-gradient(180deg, #F3EEFF 0%, #FAF8FF 45%, #FFF6FB 100%)";
export const TITRE: CSSProperties = { fontWeight: 900, fontVariationSettings: "'wdth' 116" };
export const SOUS: CSSProperties = { fontWeight: 700, fontVariationSettings: "'wdth' 116" };
export const GROUPE: CSSProperties = {
  borderRadius: 18, background: "#FFFFFF", border: "1px solid rgba(31,27,46,0.08)",
  boxShadow: "0 1px 2px rgba(45,55,72,0.05), 0 6px 18px rgba(45,55,72,0.05)", overflow: "hidden",
};
export const FILET = "1px solid rgba(31,27,46,0.08)";
/** La valeur mesurée porte le visage du chiffre. */
export const MONO: CSSProperties = { fontFamily: "var(--chiffre)", fontVariationSettings: "var(--w-nombre)", letterSpacing: "-0.045em" };

/** Un écran plein, posé au-dessus de tout, dans un portail. */
export function Ecran({ ouvert, onFermer, retour = false, etiquette, fond = FOND, children, z = 108 }: {
  ouvert: boolean;
  onFermer: () => void;
  /** Une flèche de retour au lieu d'une croix. */
  retour?: boolean;
  etiquette: string;
  fond?: string;
  children: ReactNode;
  z?: number;
}) {
  useEffect(() => (ouvert ? lockBodyModal() : undefined), [ouvert]);
  useEffect(() => {
    if (!ouvert) return;
    const echap = (e: KeyboardEvent) => { if (e.key === "Escape") onFermer(); };
    window.addEventListener("keydown", echap);
    return () => window.removeEventListener("keydown", echap);
  }, [ouvert, onFermer]);
  if (!ouvert || typeof document === "undefined") return null;
  return createPortal(
    <motion.div role="dialog" aria-modal="true" aria-label={etiquette}
      className="fixed inset-0 overflow-y-auto"
      style={{ zIndex: z, background: fond, color: E.t1, scrollbarWidth: "none" }}
      initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 380, damping: 36 }}>
      <div className="mx-auto w-full max-w-lg min-h-full relative" style={{ paddingBottom: "max(24px, env(safe-area-inset-bottom))" }}>
        <button type="button" onClick={onFermer} aria-label={retour ? "Retour" : "Fermer"}
          className="absolute z-10 flex items-center justify-center rounded-full cursor-pointer border-none"
          style={{ top: "max(14px, env(safe-area-inset-top))", left: retour ? 10 : undefined, right: retour ? undefined : 12, width: 44, height: 44, background: "rgba(255,255,255,0.72)", color: E.t1, backdropFilter: "blur(10px)" }}>
          {retour ? <ChevronLeft size={22} strokeWidth={2.4} /> : <X size={20} strokeWidth={2.4} />}
        </button>
        {children}
      </div>
    </motion.div>,
    document.body,
  );
}

/** Une feuille du bas, au-dessus d'un écran du programme. */
export function Feuille({ ouverte, onFermer, etiquette, children, z = 109 }: {
  ouverte: boolean; onFermer: () => void; etiquette: string; children: ReactNode; z?: number;
}) {
  if (!ouverte || typeof document === "undefined") return null;
  return createPortal(
    <motion.div className="fixed inset-0 flex items-end sm:items-center justify-center"
      style={{ zIndex: z, background: "rgba(12,8,20,0.55)" }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onFermer}>
      <motion.div role="dialog" aria-modal="true" aria-label={etiquette}
        className="w-full sm:max-w-md overflow-y-auto"
        style={{
          maxHeight: "92dvh", background: "#FFFFFF", color: E.t1, padding: "10px 22px 0",
          paddingBottom: "max(26px, env(safe-area-inset-bottom))",
          borderTopLeftRadius: "var(--r-feuille)", borderTopRightRadius: "var(--r-feuille)",
          boxShadow: "0 -12px 60px rgba(20,12,36,0.35)", scrollbarWidth: "none",
        }}
        initial={{ y: 60 }} animate={{ y: 0 }} transition={{ type: "spring", stiffness: 380, damping: 36 }}
        onClick={(e) => e.stopPropagation()}>
        <span aria-hidden className="block mx-auto rounded-full" style={{ width: 40, height: 5, background: "rgba(31,27,46,0.16)" }} />
        {children}
      </motion.div>
    </motion.div>,
    document.body,
  );
}

/** Le Guide qui parle : son visage, une bulle. */
export function BulleGuide({ guide, etat = "explain", texte }: { guide: GuideRef; etat?: EtatGuide; texte: string }) {
  return (
    <div className="flex items-end gap-2.5">
      <span className="flex-shrink-0 rounded-full overflow-hidden" style={{ width: 40, height: 40, background: "#EDE7FB" }}>
        <VisageGuide guide={guide} etat={etat} size={40} />
      </span>
      <p className="flex-1 min-w-0 text-[16px] leading-[22px] m-0" style={{ padding: "11px 14px", borderRadius: "18px 18px 18px 6px", background: "rgba(139,92,246,0.09)", color: E.t1 }}>
        {typoParcours(texte)}
      </p>
    </div>
  );
}

/** Le bouton d'action, violet. */
export function Bouton({ children, onClick, desactive = false, enCours = false }: {
  children: ReactNode; onClick: () => void; desactive?: boolean; enCours?: boolean;
}) {
  return (
    <motion.button type="button" whileTap={desactive ? undefined : { scale: 0.97 }} onClick={desactive || enCours ? undefined : onClick}
      aria-disabled={desactive || enCours}
      className="w-full flex items-center justify-center text-white cursor-pointer border-none"
      style={{
        height: 56, borderRadius: 22, background: DEGRADE, fontSize: 18, fontWeight: 800,
        boxShadow: "0 10px 30px -6px rgba(193,59,193,0.45)", opacity: desactive ? 0.45 : 1,
      }}>
      {enCours ? "Un instant…" : children}
    </motion.button>
  );
}

/** Une action secondaire : du texte, sans surface. */
export function Lien({ children, onClick, couleur = E.t3, gras = false }: { children: ReactNode; onClick: () => void; couleur?: string; gras?: boolean }) {
  return (
    <button type="button" onClick={onClick}
      className="flex items-center min-h-[44px] text-[16px] cursor-pointer bg-transparent border-none p-0"
      style={{ color: couleur, fontWeight: gras ? 700 : 600 }}>
      {children}
    </button>
  );
}
