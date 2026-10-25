"use client";

/* L'aperçu d'un cours Vaiiya+, pour un compte gratuit : la photo, le
   titre, l'intro et les trois premières parties, puis la porte vers
   Vaiiya+. Toucher un cours verrouillé ouvre ceci, jamais /premium d'un
   coup : même règle que les séances du catalogue. */

import { useEffect, useState } from "react";
import { NOM_FORMAT, chargerTexte, type Cours, type TexteCours } from "@/lib/coursNutrition";
import { imageRecette } from "@/lib/collectionsRecettes";
import { Typo } from "@/components/nutrition/Typo";
import Sheet from "@/components/communaute/Sheet";
import c from "@/components/nutrition/Cours.module.css";
import ns from "@/components/nutrition/Nutrition.module.css";

export default function ApercuCours({ cours, onFermer, onPremium }: {
  cours: Cours;
  onFermer: () => void;
  onPremium: () => void;
}) {
  const [texte, setTexte] = useState<TexteCours | null>(null);
  useEffect(() => {
    let annule = false;
    chargerTexte(cours.id).then((t) => { if (!annule) setTexte(t); }).catch(() => { /* l'aperçu reste sans intro */ });
    return () => { annule = true; };
  }, [cours.id]);
  const format = NOM_FORMAT[cours.format];

  return (
    <Sheet onFermer={onFermer} niveau={150}>
      <div className="flex flex-col gap-4 overflow-y-auto pb-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageRecette(cours.photo)} alt="" className="block w-full object-cover"
          style={{ aspectRatio: "16 / 9", borderRadius: "var(--r-bloc)" }} />
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-bold" style={{ color: "var(--or-encre)" }}>
            {format.titre} Vaiiya+ · {cours.minutes}&nbsp;min
          </span>
          <h3 className="text-[20px] font-semibold leading-snug" style={{ color: "var(--text-0)" }}>
            <Typo s={cours.titre} />
          </h3>
        </div>
        {texte ? (
          <p className="vy-corps" style={{ color: "var(--text-1)" }}><Typo s={texte.intro[0]} /></p>
        ) : (
          <span className={c.attente} />
        )}
        {texte && texte.sections.length > 0 && (
          <div className="flex flex-col">
            <span className="mb-1 text-[11px] font-bold" style={{ color: "var(--text-3)" }}>Dans ce {format.un}</span>
            {texte.sections.slice(0, 3).map((s, i) => (
              <span key={s.titre} className="vy-filet flex items-center gap-2.5 py-2.5">
                <span className="vy-nombre text-[13px]" style={{ color: "var(--exp-encre)", fontWeight: 700 }}>{i + 1}</span>
                <span className="text-[13px] font-semibold" style={{ color: "var(--text-1)" }}><Typo s={s.titre} /></span>
              </span>
            ))}
          </div>
        )}
        <button type="button" onClick={onPremium} className={ns.pilule}>
          Découvrir Vaiiya+
        </button>
      </div>
    </Sheet>
  );
}
