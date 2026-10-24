"use client";

import type { CSSProperties, ReactNode } from "react";
import type { Cosmetiques } from "@/lib/aura";
import styles from "./IdentiteRang.module.css";

/**
 * Le rendu RÉEL de ce qu'un rang met sur l'identité : le cadre de la photo,
 * le titre sous le pseudo, le pseudo lumineux.
 *
 * Règle posée le 2026-07-29 et toujours vraie : la galerie des rangs et la
 * scène de passage n'annoncent que ce qui existe et se voit. Elles utilisent
 * donc EXACTEMENT ces composants pour leurs aperçus. Tout se calcule depuis
 * le rang déjà connu (`cosmetiquesDuRang`) : aucun réglage, aucune colonne.
 *
 * Chaque composant prend un objet `Cosmetiques` explicite (et non un rang)
 * pour qu'un aperçu puisse en forcer un seul sans dupliquer le rendu.
 */

/* ─────────────────────────────────────────────────────────────────────────────
 * La photo et son cadre (refonte du 2026-10-24) : un cadre par rang, dès
 * l'Argent. L'Or ajoute une lueur, le Platine une lumière qui tourne, le
 * Diamant des facettes, l'Éternel son aura. Le dessin vit dans le module CSS.
 * ────────────────────────────────────────────────────────────────────────── */

export function AvatarRang({
  cosmetiques,
  size,
  className,
  children,
}: {
  cosmetiques: Cosmetiques;
  /** Diamètre de la photo : un nombre de px, ou une longueur CSS (« 7cqh »).
   *  Le cadre déborde autour, à proportion. */
  size: number | string;
  className?: string;
  children: ReactNode;
}) {
  const taille = typeof size === "number" ? `${size}px` : size;
  return (
    <div
      className={`${styles.av}${className ? ` ${className}` : ""}`}
      data-cadre={cosmetiques.cadre ?? undefined}
      style={{ width: taille, height: taille, "--s": taille } as CSSProperties}
    >
      {cosmetiques.cadre && <span aria-hidden="true" className={styles.aura} />}
      {children}
      {cosmetiques.cadre && (
        <>
          <span aria-hidden="true" className={styles.cadre} />
          <span aria-hidden="true" className={styles.lumiere} />
        </>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Le pseudo : en dégradé lumineux à l'Éternel, normal sinon.
 *
 * ⚠️ L'animation est 100 % CSS (`.pseudo-brillant` dans `globals.css`), surtout
 * PAS framer-motion : la première version pilotait `backgroundPosition` en JS
 * et saccadait dès que le fil principal travaillait. Ne pas repasser en JS.
 * ────────────────────────────────────────────────────────────────────────── */

export function PseudoRang({
  cosmetiques,
  pseudo,
  className,
  style,
}: {
  cosmetiques: Cosmetiques;
  pseudo: string;
  /** Classes du TEXTE (c'est lui qui tronque dans une liste). */
  className?: string;
  style?: CSSProperties;
}) {
  if (!cosmetiques.brillant) {
    return (
      <span className={className} style={style}>
        {pseudo}
      </span>
    );
  }

  // `color` viendrait écraser la transparence qui laisse voir le dégradé.
  const reste: CSSProperties = { ...style };
  delete reste.color;
  return (
    <span className={`pseudo-brillant${className ? ` ${className}` : ""}`} style={reste}>
      {pseudo}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Le titre du Diamant, sous le pseudo
 * ────────────────────────────────────────────────────────────────────────── */

export function TitreRang({ cosmetiques, nuit = false }: { cosmetiques: Cosmetiques; nuit?: boolean }) {
  if (!cosmetiques.titre) return null;
  return (
    <span className={styles.titre} data-nuit={nuit ? "" : undefined}>
      {cosmetiques.titre}
    </span>
  );
}
