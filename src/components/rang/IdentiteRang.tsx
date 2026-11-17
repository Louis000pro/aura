"use client";

import type { CSSProperties, ReactNode } from "react";
import type { Cosmetiques } from "@/lib/aura";
import styles from "./IdentiteRang.module.css";

/**
 * Le rendu RÉEL de ce qu'un rang met sur l'identité : le cadre de la photo,
 * le titre sous le pseudo.
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
 * Une lueur continue autour de la photo dès l'Argent (2026-11-18).
 * Sa couleur dépend du rang, avec un reflet doux qui tourne.
 * La galerie et le passage de rang utilisent ce même composant.
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

/* Le pseudo garde sa couleur et sa typographie à tous les rangs. */
export function PseudoRang({
  pseudo,
  className,
  style,
}: {
  cosmetiques: Cosmetiques;
  pseudo: string;
  className?: string;
  style?: CSSProperties;
}) {
  return <span className={className} style={style}>{pseudo}</span>;
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

/* Vit ici, avec le cadre qui l'entoure, et pas dans VisuelCadeau : la barre
   du haut l'affiche sur toutes les pages, et l'importer depuis VisuelCadeau
   tirait au démarrage la carte de rang entière, avec sa feuille de style. */
/** La photo du compte, ou son initiale sur le violet de la marque. */
export function PhotoRonde({ avatarUrl, pseudo, style }: { avatarUrl?: string | null; pseudo: string; style?: CSSProperties }) {
  return (
    <span
      className="absolute inset-0 grid place-items-center overflow-hidden rounded-full"
      style={{
        background: avatarUrl ? "transparent" : "linear-gradient(135deg,#8B5CF6,#C13BC1)",
        color: "#fff",
        fontWeight: 800,
        fontSize: "calc(var(--s) * 0.42)",
        lineHeight: 1,
        ...style,
      }}
    >
      {avatarUrl
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" decoding="async" />
        : (pseudo.charAt(0).toUpperCase() || "V")}
    </span>
  );
}
