"use client";

/* ════════════════════════════════════════════════════════════════════
   La photo d'une séance, et les ambiances des états fixes.

   Extraits de `/progression` par V7A : le héros « Aujourd'hui » vit
   désormais sur l'accueil, et ces deux-là le suivent. Ils restent une
   SOURCE UNIQUE, partagée par les deux écrans — la banque photo parle
   d'elle-même, et il n'y a qu'une façon de la cadrer.
   ════════════════════════════════════════════════════════════════════ */

import { useGuideActif } from "@/context/GuideContext";
import { cadrageDeLaPhoto, photoDuGuide } from "@/lib/photosGuide";

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
export function Photo({ img, fichier, pos = "center 25%", className, style, children, prioritaire = false, sizes }: {
  img: string; pos?: string;
  /** Nom de fichier déjà résolu pour le Guide (sans dossier ni extension) :
      il passe tel quel, sans relire le Guide. Sert au squelette, qui
      s'affiche avant que la session et le Guide soient connus. */
  fichier?: string;
  className?: string; style?: React.CSSProperties; children?: React.ReactNode;
  prioritaire?: boolean;
  /** Largeur affichée, pour que le navigateur prenne la version 720 px sur une carte. */
  sizes?: string;
}) {
  const { guide } = useGuideActif();
  const nom = fichier ?? photoDuGuide(img, guide);
  return (
    <div className={className} style={{ position: "relative", overflow: "hidden", background: "#101018", ...style }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/entrainement/${nom}.webp`}
        /* Version 720 px pour les cartes (≈ 25 Ko au lieu de 200) : le
           2048 px ne part que pour un grand affichage. */
        srcSet={`/entrainement/m/${nom}.webp 720w, /entrainement/${nom}.webp 2048w`}
        sizes={sizes ?? (prioritaire ? "100vw" : "(max-width: 640px) 50vw, 360px")}
        alt=""
        aria-hidden
        decoding="async"
        loading={prioritaire ? "eager" : "lazy"}
        fetchPriority={prioritaire ? "high" : "auto"}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: cadrageDeLaPhoto(nom, pos) }}
      />
      {children}
    </div>
  );
}

/** Le héros de l'accueil attend sa journée avant de savoir quelle photo
 *  montrer : on retient la dernière montrée sur cet appareil et on la
 *  télécharge pendant le squelette. Le jour suivant, c'est presque
 *  toujours la même famille de séance, donc l'image est déjà là. */
/* ⚠️ On retient le FICHIER déjà résolu pour Nora ou Sasha (2026-11-07,
   Louis : « l'image d'une version d'avant s'affiche en preload »). Le
   squelette s'affiche avant la session, donc avant le Guide : avec le seul
   nom de base, il montrait la photo neutre. La clé change (`_v2`) pour
   oublier les anciens noms de base. Le script du <head> lit la même clé
   pour lancer le téléchargement avant même React. */
const CLE_DERNIERE = "vaiiya_photo_heros_v2";

export function retenirPhotoHeros(fichier: string) {
  try { localStorage.setItem(CLE_DERNIERE, fichier); } catch { /* stockage bloqué */ }
}

/** La dernière photo montrée sur cet appareil, ou `null`. */
export function photoHerosRetenue(): string | null {
  try {
    const img = localStorage.getItem(CLE_DERNIERE);
    return img && /^[a-z0-9-]+$/i.test(img) ? img : null;
  } catch { return null; }
}
