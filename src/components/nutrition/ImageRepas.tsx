"use client";

/* La photo d'un repas noté, ou une tuile neutre quand on n'en a pas une qui
   dit vraiment ce plat (lib/photoRepas). La tuile ne fait pas semblant :
   un fond doux et des couverts, jamais une assiette inventée. */

import { useState } from "react";
import { UtensilsCrossed } from "lucide-react";
import { photoDuRepas } from "@/lib/photoRepas";

export default function ImageRepas({ nom, className = "", style, icone = 22 }: {
  nom: string;
  className?: string;
  style?: React.CSSProperties;
  /** La taille des couverts de la tuile neutre. */
  icone?: number;
}) {
  const photo = photoDuRepas(nom);
  const [rate, setRate] = useState<string | null>(null);

  if (photo && rate !== photo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={photo} alt="" aria-hidden loading="lazy" decoding="async"
        onError={() => setRate(photo)}
        className={`object-cover ${className}`} style={style} />
    );
  }
  return (
    <span aria-hidden className={`flex items-center justify-center ${className}`}
      style={{ background: "linear-gradient(135deg, rgba(var(--accent-rgb),0.18), rgba(193,59,193,0.12))", ...style }}>
      <UtensilsCrossed size={icone} strokeWidth={1.6} style={{ color: "var(--exp-encre)", opacity: 0.75 }} />
    </span>
  );
}
