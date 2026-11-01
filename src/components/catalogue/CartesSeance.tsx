"use client";

/* ════════════════════════════════════════════════════════════════════
   LES CARTES DE « TROUVER MA SÉANCE » (maquette version 2).

   Le titre vit SOUS la photo, comme une vitrine où l'on compare d'un coup
   d'œil : la photo reste naturelle, le nom et la durée se lisent sans
   voile. Seule la grande carte « Pour toi » écrit sur sa photo.

   Une séance Vaiiya+ porte le cadre or → magenta et la bande « Vaiiya+ »
   des collections (components/catalogue/Premium) : marquée, jamais
   cachée. Celle qu'on n'a pas encore porte le cadenas et ouvre son
   aperçu ; l'écran décide (`onOuvrir`), la carte ne fait que montrer.
   ════════════════════════════════════════════════════════════════════ */

import type { CSSProperties, ReactNode } from "react";
import { motion } from "framer-motion";
import { ChevronRight, MoreHorizontal } from "lucide-react";
import { Photo } from "@/components/entrainement/PhotoSeance";
import { Cadenas, EtincellePremium, PREMIUM_CADRE, PREMIUM_CADRE_PX, PREMIUM_PUCE } from "@/components/catalogue/Premium";

const NB = String.fromCharCode(160);

export type SeanceCarte = {
  id: string;
  title: string;
  duration: number;
  difficulty: string;
  access?: "free" | "premium";
  perso?: boolean;
  bientotPlus?: boolean;
};

type Commun<S extends SeanceCarte> = {
  seance: S;
  img: string;
  /** Vaiiya+ et pas encore à soi : cadenas, et la carte ouvre l'aperçu. */
  verrou: boolean;
  onOuvrir: (s: S) => void;
};

export function PucePlus({ texte = "Vaiiya+" }: { texte?: string }) {
  return (
    <span className="inline-flex items-center px-[5px] py-[2px] rounded-[5px] text-[11px] font-semibold leading-none whitespace-nowrap"
      style={{ background: PREMIUM_PUCE, color: "#3A2402" }}>
      {texte}
    </span>
  );
}

/** « 20 min · Débutant », puis la puce qui dit Vaiiya+ ou « Bientôt Vaiiya+ ». */
export function MetaSeance({ seance, puce = true, taille = 13 }: { seance: SeanceCarte; puce?: boolean; taille?: 11 | 13 }) {
  const premium = seance.access === "premium";
  return (
    <span className={`flex items-center gap-1.5 flex-wrap ${taille === 11 ? "text-[11px]" : "text-[13px]"} font-medium`} style={{ color: "var(--text-2)" }}>
      <span>
        <span className="vy-nombre">{seance.duration}</span>{NB}min · {seance.difficulty}{seance.perso ? " · à toi" : ""}
      </span>
      {puce && premium && <PucePlus />}
      {!premium && seance.bientotPlus && <PucePlus texte="Bientôt Vaiiya+" />}
    </span>
  );
}

/** La photo, nue ou dans le cadre Vaiiya+ avec sa bande. */
function CadrePhoto({ premium, rayon, bande = 26, style, children }: {
  premium: boolean; rayon: string; bande?: number; style?: CSSProperties; children: ReactNode;
}) {
  if (!premium) {
    return (
      <div className="relative overflow-hidden" style={{ borderRadius: rayon, boxShadow: "var(--ombre-pose)", background: "#101018", ...style }}>
        {children}
      </div>
    );
  }
  return (
    <div className="relative flex flex-col" style={{
      padding: PREMIUM_CADRE_PX, borderRadius: rayon, background: PREMIUM_CADRE,
      boxShadow: "0 12px 28px -14px rgba(198,140,20,0.55)", ...style,
    }}>
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden"
        style={{ borderRadius: `calc(${rayon} - ${PREMIUM_CADRE_PX}px)`, background: "rgb(var(--surface-rgb))" }}>
        <div className="flex items-center gap-[6px] px-2 flex-shrink-0"
          style={{ height: bande, borderBottom: "1px solid rgba(245,177,32,0.22)" }}>
          <EtincellePremium />
          <PucePlus />
        </div>
        <div className="relative flex-1 min-h-0" style={{ background: "#101018" }}>{children}</div>
      </div>
    </div>
  );
}

/** Le ⋯ des cartes (« M'en inspirer », « Ajouter à ma semaine »…), ou le
 *  cadenas d'une carte fermée, posé sur la photo, hors du bouton. */
function CoinPhoto({ verrou, titre, onGerer }: { verrou: boolean; titre: string; onGerer?: () => void }) {
  if (verrou) return <Cadenas />;
  if (!onGerer) return null;
  return (
    <motion.button whileTap={{ scale: 0.85 }} onClick={onGerer}
      className="pointer-events-auto absolute bottom-2 right-2 w-7 h-7 rounded-full flex items-center justify-center cursor-pointer border-none p-0"
      style={{ background: "var(--verre-photo)", backdropFilter: "blur(16px) saturate(170%)", WebkitBackdropFilter: "blur(16px) saturate(170%)", border: "1px solid var(--verre-photo-bord)" }}
      aria-label={`Options : ${titre}`}>
      <MoreHorizontal size={14} strokeWidth={2.2} style={{ color: "rgba(255,255,255,0.88)" }} />
    </motion.button>
  );
}

const ariaDe = (s: SeanceCarte, verrou: boolean) => (verrou ? `${s.title}, réservé à Vaiiya+` : `Lancer : ${s.title}`);

/** La carte d'une grille de deux : photo, nom, durée. */
export function CarteGrille<S extends SeanceCarte>({ seance, img, verrou, onOuvrir, onGerer }: Commun<S> & { onGerer?: (s: S) => void }) {
  const premium = seance.access === "premium";
  return (
    <div className="relative min-w-0">
      <motion.button whileTap={{ scale: 0.97 }} onClick={() => onOuvrir(seance)}
        className="block w-full text-left p-0 border-none bg-transparent cursor-pointer" aria-label={ariaDe(seance, verrou)}>
        <CadrePhoto premium={premium} rayon="var(--r-bloc)" style={{ aspectRatio: "4 / 5" }}>
          <Photo img={img} pos="center 22%" style={{ position: "absolute", inset: 0 }} />
        </CadrePhoto>
        <p className="text-[16px] font-semibold leading-[1.25] mt-2" style={{
          color: "var(--text-0)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>
          {seance.title}
        </p>
        <span className="block mt-0.5"><MetaSeance seance={seance} puce={false} /></span>
      </motion.button>
      {/* Le coin se pose sur une boîte de la taille de la photo : un bouton
          dans un bouton n'est pas permis. */}
      <div className="absolute inset-x-0 top-0 pointer-events-none" style={{ aspectRatio: "4 / 5" }}>
        <CoinPhoto verrou={verrou} titre={seance.title} onGerer={onGerer ? () => onGerer(seance) : undefined} />
      </div>
    </div>
  );
}

/** La grande carte de « Pour toi » : le nom sur la photo, et le bouton qui lance. */
export function GrandeCarte<S extends SeanceCarte>({ seance, img, verrou, onOuvrir, onGerer }: Commun<S> & { onGerer?: (s: S) => void }) {
  const premium = seance.access === "premium";
  return (
    <div className="relative flex-shrink-0" style={{ width: "min(300px, 78vw)", scrollSnapAlign: "start" }}>
      <motion.button whileTap={{ scale: 0.98 }} onClick={() => onOuvrir(seance)}
        className="block w-full text-left p-0 border-none bg-transparent cursor-pointer" aria-label={ariaDe(seance, verrou)}>
        <CadrePhoto premium={premium} rayon="var(--r-affiche)" bande={30} style={{ aspectRatio: "15 / 19" }}>
          <Photo img={img} pos="center 22%" style={{ position: "absolute", inset: 0 }} />
          <div className="absolute inset-x-0 bottom-0 px-4 pb-4 pt-20" style={{ background: "var(--voile-affiche)", forcedColorAdjust: "none" }}>
            <p className="text-[26px] font-bold leading-[1.1] text-white" style={{ fontVariationSettings: "'wdth' 108", textShadow: "0 2px 10px rgba(0,0,0,0.45)" }}>
              {seance.title}
            </p>
            <div className="mt-2.5 flex items-center justify-between gap-3 min-h-[52px]">
              <p className="text-[13px] font-medium" style={{ color: "rgba(255,255,255,0.88)" }}>
                <span className="vy-nombre">{seance.duration}</span>{NB}min · {seance.difficulty}
              </p>
              {!verrou && (
                <span aria-hidden className="w-[52px] h-[52px] rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", boxShadow: "var(--ombre-action)" }}>
                  <svg width="20" height="20" viewBox="0 0 24 24"><path d="M8.5 5.6v12.8c0 .8.9 1.3 1.6.9l10-6.4c.6-.4.6-1.3 0-1.7l-10-6.4c-.7-.5-1.6 0-1.6.8z" fill="#FFFFFF" /></svg>
                </span>
              )}
            </div>
          </div>
        </CadrePhoto>
      </motion.button>
      {verrou ? (
        <div className="absolute inset-0 pointer-events-none"><Cadenas /></div>
      ) : onGerer ? (
        <div className="absolute right-0 pointer-events-none" style={{ top: premium ? 30 : 0 }}>
          <div className="relative w-12 h-12"><CoinPhoto verrou={false} titre={seance.title} onGerer={() => onGerer(seance)} /></div>
        </div>
      ) : null}
    </div>
  );
}

/** La petite carte d'une rangée qui défile (« Nouvelles séances »). */
export function CarteRail<S extends SeanceCarte>({ seance, img, verrou, onOuvrir }: Commun<S>) {
  const premium = seance.access === "premium";
  return (
    <motion.button whileTap={{ scale: 0.97 }} onClick={() => onOuvrir(seance)}
      className="relative flex-shrink-0 block text-left p-0 border-none bg-transparent cursor-pointer"
      style={{ width: 128, scrollSnapAlign: "start" }} aria-label={ariaDe(seance, verrou)}>
      <CadrePhoto premium={premium} rayon="var(--r-bloc)" bande={24} style={{ height: 164 }}>
        <Photo img={img} pos="center 22%" style={{ position: "absolute", inset: 0 }} />
        {verrou && <Cadenas />}
      </CadrePhoto>
      <p className="text-[13px] font-semibold leading-[1.3] mt-2" style={{
        color: "var(--text-0)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", minHeight: 34,
      }}>
        {seance.title}
      </p>
      <span className="block mt-0.5"><MetaSeance seance={seance} puce={false} taille={11} /></span>
    </motion.button>
  );
}

/** Une ligne de liste : photo, nom, une ligne de détail, la durée. */
export function LigneSeance<S extends SeanceCarte>({ seance, img, verrou, onOuvrir, detail, grande = false, premiere = false }: Commun<S> & {
  detail?: string; grande?: boolean; premiere?: boolean;
}) {
  const premium = seance.access === "premium";
  const w = grande ? 64 : 56, h = grande ? 80 : 56;
  return (
    <button type="button" onClick={() => onOuvrir(seance)}
      className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left cursor-pointer bg-transparent border-none"
      style={{ borderTop: premiere ? "none" : "1px solid rgba(var(--accent-rgb),0.1)" }}
      aria-label={ariaDe(seance, verrou)}>
      <span className="relative flex-shrink-0 block" style={{
        width: w, height: h, borderRadius: 12, padding: premium ? 2 : 0, background: premium ? PREMIUM_CADRE : undefined,
      }}>
        <Photo img={img} pos="center 22%" style={{ position: "absolute", inset: premium ? 2 : 0, borderRadius: premium ? 10 : 12 }} />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-[16px] font-semibold leading-[1.25] truncate" style={{ color: "var(--text-0)" }}>{seance.title}</span>
        {detail && <span className="block text-[13px] font-medium leading-snug truncate mt-0.5" style={{ color: "var(--text-2)" }}>{detail}</span>}
        <span className="block mt-0.5"><MetaSeance seance={seance} /></span>
      </span>
      <ChevronRight size={18} strokeWidth={2.2} className="flex-shrink-0" style={{ color: "var(--text-3)" }} />
    </button>
  );
}
