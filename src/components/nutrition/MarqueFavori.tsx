/* Le petit cœur posé sur la photo d'une recette favorite, dans le fil :
   un repère, jamais un bouton. On met ou on retire un favori depuis la
   fiche de la recette. */

import { Heart } from "lucide-react";

export default function MarqueFavori({ taille = 30, ecart = 10 }: { taille?: number; ecart?: number }) {
  return (
    <span role="img" aria-label="Dans tes favoris"
      className="absolute flex items-center justify-center rounded-full"
      style={{ top: ecart, right: ecart, width: taille, height: taille, background: "rgba(255,255,255,0.92)", boxShadow: "var(--ombre-pose)" }}>
      <Heart size={Math.round(taille / 2)} strokeWidth={2.2} aria-hidden style={{ color: "#8B5CF6", fill: "#8B5CF6" }} />
    </span>
  );
}
