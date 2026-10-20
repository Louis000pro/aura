"use client";

/* ════════════════════════════════════════════════════════════════════
   La photo d'une séance, et les ambiances des états fixes.

   Extraits de `/progression` par V7A : le héros « Aujourd'hui » vit
   désormais sur l'accueil, et ces deux-là le suivent. Ils restent une
   SOURCE UNIQUE, partagée par les deux écrans — la banque photo parle
   d'elle-même, et il n'y a qu'une façon de la cadrer.
   ════════════════════════════════════════════════════════════════════ */

import { useGuideActif } from "@/context/GuideContext";
import { photoDuGuide } from "@/lib/photosGuide";

/** Ambiances des états fixes (widgets) — couleur appliquée in-app, comme la banque. */
export const WIDGET: Record<"repos" | "done" | "setup" | "improvise", {
  img: string; pos: string;
}> = {
  repos:     { img: "repos",     pos: "68% center" },
  done:      { img: "done",      pos: "center 40%" },
  setup:     { img: "setup",     pos: "center 45%" },
  improvise: { img: "improvise", pos: "center 6%" },
};

/** Photo naturelle — la banque parle d'elle-même. Juste l'image, cadrée,
    sur fond sombre le temps du chargement. Le scrim vit chez l'appelant.

    ⚠️ UNE VRAIE `<img>`, PLUS UN `background-image` (2026-10-18, Louis :
    « l'image de la séance prend trop de temps à se charger »). Une image
    de fond n'est découverte qu'une fois le style calculé, et elle ne
    reçoit jamais de priorité réseau. `prioritaire` la passe en
    `fetchPriority="high"` : c'est le héros de l'accueil, la première
    chose qu'on regarde. */
export function Photo({ img, pos = "center 25%", className, style, children, prioritaire = false }: {
  img: string; pos?: string;
  className?: string; style?: React.CSSProperties; children?: React.ReactNode;
  prioritaire?: boolean;
}) {
  const { guide } = useGuideActif();
  return (
    <div className={className} style={{ position: "relative", overflow: "hidden", background: "#101018", ...style }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/entrainement/${photoDuGuide(img, guide)}.webp`}
        alt=""
        aria-hidden
        decoding="async"
        loading={prioritaire ? "eager" : "lazy"}
        fetchPriority={prioritaire ? "high" : "auto"}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: pos }}
      />
      {children}
    </div>
  );
}

/** Le héros de l'accueil attend sa journée avant de savoir quelle photo
 *  montrer : on retient la dernière montrée sur cet appareil et on la
 *  télécharge pendant le squelette. Le jour suivant, c'est presque
 *  toujours la même famille de séance, donc l'image est déjà là. */
const CLE_DERNIERE = "vaiiya_photo_heros";

export function retenirPhotoHeros(img: string) {
  try { localStorage.setItem(CLE_DERNIERE, img); } catch { /* stockage bloqué */ }
}

/** La dernière photo montrée sur cet appareil, ou `null`. */
export function photoHerosRetenue(): string | null {
  try {
    const img = localStorage.getItem(CLE_DERNIERE);
    return img && /^[a-z0-9-]+$/i.test(img) ? img : null;
  } catch { return null; }
}
