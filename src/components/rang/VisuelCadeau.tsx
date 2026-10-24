"use client";

import type { CSSProperties } from "react";
import CarteRang from "@/components/rang/CarteRang";
import { AvatarRang, TitreRang } from "@/components/rang/IdentiteRang";
import { RangeeJokers } from "@/components/rang/Joker";
import { TITRE_DIAMANT, type GenreCadeau, type Rang } from "@/lib/aura";
import type { DonneesCarte } from "@/lib/cartesRang";

/**
 * Le visuel d'un cadeau de rang, joué avec les VRAIS composants : la carte,
 * le cadre autour de TA photo, les jokers, le titre, le pseudo lumineux.
 * Un aperçu ne peut donc jamais mentir sur ce qu'on reçoit (règle du
 * 2026-07-29). Partagé par la scène de passage et la galerie des rangs.
 */
export default function VisuelCadeau({
  genre,
  rang,
  carte,
  avatarUrl,
  n = 1,
  nuit = false,
  taille,
}: {
  genre: GenreCadeau;
  rang: Rang;
  /** Ce que la carte écrit (le pseudo, au moins). */
  carte: DonneesCarte;
  avatarUrl?: string | null;
  /** Les jokers : combien. */
  n?: number;
  /** Sur la nuit de la scène. */
  nuit?: boolean;
  /** La taille du visuel : un nombre de px ou une longueur CSS. */
  taille: number | string;
}) {
  const t = typeof taille === "number" ? `${taille}px` : taille;
  const pseudo = carte.pseudo.trim() || "toi";

  if (genre === "carte") {
    return (
      <div style={{ width: `calc(${t} * 0.72)` }}>
        <CarteRang rang={rang} donnees={carte} decor />
      </div>
    );
  }

  if (genre === "cadre") {
    return (
      <AvatarRang cosmetiques={{ cadre: rang.id, titre: null, brillant: false }} size={`calc(${t} * 0.75)`}>
        <PhotoRonde avatarUrl={avatarUrl} pseudo={pseudo} />
      </AvatarRang>
    );
  }

  if (genre === "joker") return <RangeeJokers pleins={n} taille={`calc(${t} * 0.54)`} />;

  if (genre === "titre") {
    return <TitreRang cosmetiques={{ cadre: null, titre: TITRE_DIAMANT, brillant: false }} nuit={nuit} />;
  }

  return (
    <span
      className="pseudo-brillant"
      style={{ fontSize: `calc(${t} * 0.3)`, fontWeight: 900, fontVariationSettings: "var(--w-voix)", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } as CSSProperties}
    >
      {pseudo}
    </span>
  );
}

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
