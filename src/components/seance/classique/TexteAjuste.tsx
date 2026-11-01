"use client";

/* Un texte géant qui SE MESURE pour remplir la largeur sans jamais la
   dépasser (le chrono, « TEMPS ! », un score). Même procédé que le mot
   des couvertures (`useMotAjuste`) : posé à 100 px, largeur lue, taille
   réglée, relue au redimensionnement et à l'arrivée de la police.
   `gabarit` mesure un texte stable (« 00:00 ») quand le texte change
   chaque seconde, pour que la taille ne bouge pas avec lui. */

import { useMotAjuste } from "@/components/profil/CouvertureSeance";

export default function TexteAjuste({ texte, gabarit, plafond, className, style, aligner = "left" }: {
  texte: string;
  gabarit?: string;
  plafond: number;
  className?: string;
  style?: React.CSSProperties;
  aligner?: "left" | "center";
}) {
  const { boite, mesure, taille } = useMotAjuste(gabarit ?? texte, plafond);
  return (
    <div ref={boite} className="relative w-full" style={{ textAlign: aligner }}>
      <span ref={mesure} aria-hidden="true" className={`${className ?? ""} pointer-events-none invisible absolute left-0 top-0`}
        style={{ ...style, fontSize: 100, whiteSpace: "nowrap" }}>
        {gabarit ?? texte}
      </span>
      {/* Jamais invisible : tant que la mesure n'a pas eu lieu, une taille
          prudente, plutôt qu'un chrono qu'on ne voit pas. */}
      <p className={className} style={{ ...style, fontSize: taille || Math.round(plafond * 0.7), whiteSpace: "nowrap" }}>
        {texte}
      </p>
    </div>
  );
}
