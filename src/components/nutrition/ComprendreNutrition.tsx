"use client";

/* ════════════════════════════════════════════════════════════════════
   « Comprendre la nutrition » : la rangée des cours, en bas de l'écran
   Nutrition. Version B de la maquette « Distinguer un cours d'une
   recette » (Louis, 2026-10-25) : une fiche par cours, la photo du plat
   en petit à gauche et le texte d'abord, avec la ligne du format (un
   livre, « Flash · 2 min ») qui dit « cours » là où une recette n'a
   qu'une photo.

   « Les N cours » ouvre le sommaire (TousLesCours). Le lecteur est tenu
   par l'écran (NutritionTab) : il s'ouvre aussi depuis le sommaire, et
   son bouton du bas ouvre une envie de recettes.

   Un cours Vaiiya+ garde son cadre or → magenta, son cadenas et sa
   pastille. Chez un compte gratuit, le toucher ouvre son aperçu, jamais
   /premium d'un coup : même règle que les séances du catalogue.
   ════════════════════════════════════════════════════════════════════ */

import { BookOpen, Check } from "lucide-react";
import { DANS_LA_RANGEE, NOM_FORMAT, libelleFormat, typoCours, type Cours } from "@/lib/coursNutrition";
import { imageRecette } from "@/lib/collectionsRecettes";
import { Typo } from "@/components/nutrition/Typo";
import c from "@/components/nutrition/Cours.module.css";
import ns from "@/components/nutrition/Nutrition.module.css";

export function Cadenas({ taille = 13 }: { taille?: number }) {
  return (
    <span aria-hidden className={c.cadenas}>
      <svg width={taille} height={taille} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="11" width="14" height="10" rx="2" />
        <path d="M8 11V8a4 4 0 0 1 8 0v3" />
      </svg>
    </span>
  );
}

/** Ce qu'un lecteur d'écran annonce d'un cours. */
export function nomAccessible(cours: Cours, lu: boolean, verrou: boolean): string {
  const format = `${NOM_FORMAT[cours.format].titre}, ${cours.minutes} minute${cours.minutes > 1 ? "s" : ""}`;
  return `${typoCours(cours.titre)}, ${format}${lu ? ", lu" : ""}${verrou ? ", réservé à Vaiiya+" : ""}`;
}

function FicheCours({ cours, lu, verrou, onOuvrir }: {
  cours: Cours; lu: boolean; verrou: boolean; onOuvrir: () => void;
}) {
  return (
    <button type="button" onClick={onOuvrir} aria-label={nomAccessible(cours, lu, verrou)}
      className={verrou ? `${c.fiche} ${c.ficheVerrou}` : c.fiche}>
      <span className={c.ficheCorps}>
        <span className={c.fichePhoto}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageRecette(cours.photo)} alt="" loading="lazy" decoding="async" />
          {verrou && <Cadenas />}
        </span>
        <span className={c.ficheTexte}>
          <span className={c.format}>
            <BookOpen size={13} strokeWidth={2.2} aria-hidden />
            {libelleFormat(cours)}
          </span>
          <span className={c.ficheTitre}><Typo s={cours.titre} /></span>
          {verrou ? (
            <span className={`${c.plus} mt-auto`}>Vaiiya+</span>
          ) : lu ? (
            <span className={`${c.ficheBas} ${c.lu}`}><Check size={14} strokeWidth={2.6} aria-hidden />Lu</span>
          ) : (
            <span className={c.ficheBas}>Lire</span>
          )}
        </span>
      </span>
    </button>
  );
}

export default function ComprendreNutrition({ cours, lus, premiumDebloque, onOuvrir, onTous }: {
  cours: Cours[];
  lus: ReadonlySet<string>;
  premiumDebloque: boolean;
  onOuvrir: (cours: Cours) => void;
  onTous: () => void;
}) {
  const rangee = cours.slice(0, DANS_LA_RANGEE);

  return (
    <section id="nutrition-comprendre" className="flex flex-col gap-3" aria-label="Comprendre la nutrition">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[20px]" style={{ color: "var(--text-0)", fontWeight: 750, fontVariationSettings: "var(--w-voix)" }}>
          Comprendre la nutrition
        </h2>
        <button type="button" onClick={onTous}
          className="-my-3 flex-shrink-0 cursor-pointer whitespace-nowrap py-3 text-[13px] font-bold"
          style={{ color: "var(--exp-encre)" }}>
          Les {cours.length}&nbsp;cours
        </button>
      </div>

      {/* La rangée va d'un bord à l'autre et garde de la place sous les fiches :
          un conteneur qui défile coupe ce qui dépasse, donc l'ombre aussi. */}
      <div className={`${ns.rail} -mx-4 -mb-5 px-4 pb-6 pt-1 md:mx-0 md:px-0`} style={{ gap: 12 }}>
        {rangee.map((co) => (
          <FicheCours key={co.id} cours={co} lu={lus.has(co.id)}
            verrou={co.acces === "vaiiya+" && !premiumDebloque} onOuvrir={() => onOuvrir(co)} />
        ))}
      </div>
    </section>
  );
}
