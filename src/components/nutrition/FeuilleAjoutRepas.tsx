"use client";

/* ════════════════════════════════════════════════════════════════════
   « Ajouter un repas » : la seule porte d'ajout de l'écran Nutrition.

   On choisit le moment (préchoisi sur le repas qui vient, ou sur le moment
   vide qu'on a touché dans le détail), puis la façon : la photo de
   l'assiette en grand, le code-barres et l'écrire en dessous, et les
   derniers repas en un geste.

   Le moment choisi ici part dans la modale qui s'ouvre (photo, code-barres,
   saisie) : elle le montre déjà coché, et on peut encore le changer là-bas.

   « Mes plats » : les favoris d'abord, puis les derniers repas (la même
   grille que « Mes classiques », GrillePlats). Un plat ajouté se coche ;
   le toucher une seconde fois le retire. Le cœur le met dans les favoris :
   il remplace l'appui long du 2026-10-22, que personne ne trouvait.
   ════════════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { Barcode, Camera, PenLine, X } from "lucide-react";
import Sheet from "@/components/communaute/Sheet";
import GrillePlats from "@/components/nutrition/GrillePlats";
import { MOMENTS, MOMENT_COURT, type MealType, type RecentMeal } from "@/lib/repas";
import ns from "@/components/nutrition/Nutrition.module.css";

/** « 2026-10-20 » → « lundi 20 octobre ». */
function jourEnLettres(date: string): string {
  const [a, m, j] = date.split("-").map(Number);
  return new Date(a, m - 1, j).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}

export default function FeuilleAjoutRepas({
  typeInitial, date, aujourdhui, plats, estFavori,
  onFermer, onPhoto, onCodeBarres, onEcrire, onAjouterRecent, onRetirer, onCoeur,
}: {
  typeInitial: MealType;
  date: string;
  aujourdhui: string;
  /** Figés à l'ouverture : un plat touché ne change pas de place. */
  plats: RecentMeal[];
  /** `null` tant que les favoris ne sont pas connus. */
  estFavori: ((nom: string) => boolean) | null;
  onFermer: () => void;
  onPhoto: (type: MealType) => void;
  onCodeBarres: (type: MealType) => void;
  onEcrire: (type: MealType) => void;
  /** Rend l'identifiant du repas écrit, ou `null` si l'écriture a échoué. */
  onAjouterRecent: (r: RecentMeal, type: MealType) => Promise<string | null>;
  onRetirer: (id: string) => Promise<void> | void;
  onCoeur: (r: RecentMeal) => void;
}) {
  const [type, setType] = useState<MealType>(typeInitial);
  const [toutVoir, setToutVoir] = useState(false);

  const visibles = toutVoir ? plats : plats.slice(0, 3);

  return (
    <Sheet onFermer={onFermer} niveau={90}>
      <div className="flex flex-col gap-4 pb-1">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <h2 className="text-[26px] leading-tight" style={{ color: "var(--text-0)", fontWeight: 800, fontVariationSettings: "var(--w-voix)" }}>
              Ajouter un repas
            </h2>
            {date !== aujourdhui && (
              <span className="text-[13px]" style={{ color: "var(--text-3)" }}>Pour le {jourEnLettres(date)}</span>
            )}
          </div>
          <button type="button" onClick={onFermer} aria-label="Fermer"
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full cursor-pointer"
            style={{ background: "rgba(var(--text-3-rgb),0.12)", color: "var(--text-1)" }}>
            <X size={17} strokeWidth={2.3} />
          </button>
        </div>

        <div role="radiogroup" aria-label="Quel repas" className="flex gap-1.5">
          {MOMENTS.map((m) => (
            <button key={m} type="button" role="radio" aria-checked={type === m} onClick={() => setType(m)} className={ns.puce}>
              {MOMENT_COURT[m]}
            </button>
          ))}
        </div>

        <button type="button" onClick={() => onPhoto(type)}
          className="flex items-center gap-3.5 p-4 text-left text-white cursor-pointer"
          style={{ minHeight: 104, borderRadius: "var(--r-bloc)", background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", boxShadow: "var(--ombre-action)" }}>
          <span className="flex flex-shrink-0 items-center justify-center rounded-full"
            style={{ width: 52, height: 52, background: "rgba(255,255,255,0.22)", border: "1px solid rgba(255,255,255,0.4)" }}>
            <Camera size={24} strokeWidth={2} />
          </span>
          <span className="flex flex-col gap-1">
            <span className="text-[16px] font-bold">Prendre mon assiette en photo</span>
            <span className="text-[13px]" style={{ color: "rgba(255,255,255,0.9)" }}>Les calories sont estimées à partir de la photo.</span>
          </span>
        </button>

        <div className="-mt-1.5 grid grid-cols-2 gap-2.5">
          {[
            { cle: "code", titre: "Code-barres", sous: "Pour un produit emballé", Icone: Barcode, agir: () => onCodeBarres(type) },
            { cle: "ecrire", titre: "L’écrire", sous: "Par exemple : un yaourt", Icone: PenLine, agir: () => onEcrire(type) },
          ].map(({ cle, titre, sous, Icone, agir }) => (
            <button key={cle} type="button" onClick={agir} className={`${ns.bloc} cursor-pointer`} style={{ minHeight: 104, padding: 12, gap: 10 }}>
              <span className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: "rgba(139,92,246,0.12)", color: "var(--exp-encre)" }}>
                <Icone size={18} strokeWidth={2} />
              </span>
              <span className="flex flex-col gap-0.5">
                <span className="text-[16px] font-bold" style={{ color: "var(--text-0)" }}>{titre}</span>
                <span className="text-[11px]" style={{ color: "var(--text-3)" }}>{sous}</span>
              </span>
            </button>
          ))}
        </div>

        {plats.length > 0 && (
          <div className="flex flex-col gap-2.5">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[16px] font-bold" style={{ color: "var(--text-0)" }}>Mes plats</span>
              {plats.length > 3 && (
                <button type="button" onClick={() => setToutVoir((v) => !v)} className="min-h-11 pl-3 text-[13px] font-semibold cursor-pointer"
                  style={{ color: "var(--exp-encre)" }}>
                  {toutVoir ? "Voir moins" : "Tout voir"}
                </button>
              )}
            </div>
            <GrillePlats plats={visibles} estFavori={estFavori}
              onAjouter={(r) => onAjouterRecent(r, type)} onRetirer={onRetirer} onCoeur={onCoeur} />
          </div>
        )}
      </div>
    </Sheet>
  );
}
