"use client";

import { AvatarRang, PseudoRang, TitreRang } from "@/components/rang/IdentiteRang";
import { EXP_BIENVENUE, TITRE_DIAMANT, type ApercuCosmetique, type Cosmetiques, type Rang } from "@/lib/aura";

/**
 * L'aperçu d'une récompense de rang, joué avec les VRAIS composants de rendu
 * (`IdentiteRang.tsx`) sur le pseudo et la photo de l'utilisateur : un aperçu ne
 * peut donc jamais mentir sur le résultat. Un seul cosmétique est forcé à la
 * fois, quel que soit le rang réellement atteint.
 *
 * Partagé par la galerie des rangs et la célébration de passage de rang.
 */

const AUCUN: Cosmetiques = { badge: false, cadre: false, anneau: false, titre: null, brillant: false };

export default function ApercuRecompense({
  kind,
  rang,
  pseudo,
  avatarUrl,
}: {
  kind: ApercuCosmetique;
  rang: Rang;
  pseudo: string;
  avatarUrl?: string | null;
}) {
  const nom = pseudo.trim() || "toi";

  if (kind === "exp") {
    return (
      <span
        className="inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-black"
        style={{ background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", color: "#fff" }}
      >
        +{EXP_BIENVENUE} EXP
      </span>
    );
  }

  if (kind === "titre") {
    return (
      <span className="flex flex-col items-start leading-tight">
        <span className="text-[14px] font-black" style={{ color: "var(--text-0)" }}>{nom}</span>
        <TitreRang cosmetiques={{ ...AUCUN, titre: TITRE_DIAMANT }} />
      </span>
    );
  }

  if (kind === "badge" || kind === "brillant") {
    return (
      <PseudoRang
        rang={rang}
        cosmetiques={{ ...AUCUN, badge: kind === "badge", brillant: kind === "brillant" }}
        pseudo={nom}
        className="text-[15px] font-black tracking-[-0.02em]"
        style={{ color: "var(--text-0)" }}
        tailleGemme={17}
      />
    );
  }

  // « cadre » et « anneau » : la décoration se voit autour de la photo.
  return (
    <div className="flex items-center gap-3">
      <AvatarRang
        rang={rang}
        cosmetiques={{ ...AUCUN, cadre: kind === "cadre", anneau: kind === "anneau" }}
        size={40}
      >
        <span
          className="absolute inset-0 grid place-items-center overflow-hidden rounded-full text-[15px] font-bold"
          style={{
            background: avatarUrl ? "transparent" : "linear-gradient(135deg,rgba(var(--tint-violet-rgb),1),rgba(var(--tint-cream-rgb),1))",
            color: "var(--accent)",
          }}
        >
          {avatarUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
            : nom.charAt(0).toUpperCase()}
        </span>
      </AvatarRang>
      <span className="text-[14px] font-black" style={{ color: "var(--text-0)" }}>{nom}</span>
    </div>
  );
}
