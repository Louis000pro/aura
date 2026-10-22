"use client";

/* ════════════════════════════════════════════════════════════════════
   Une grille de plats qu'on remet en un geste : « Mes plats » dans
   « Ajouter un repas », dans « Mes classiques » et dans « Mes favoris ».

   Le « + » ajoute le plat à la journée et devient une coche ; le toucher
   une seconde fois le retire. Le cœur, en haut à gauche de la photo, met
   le plat dans les favoris ou l'en retire. Il remplace l'appui long, que
   personne ne trouvait.

   L'écran fige la liste à l'ouverture : un plat touché ne glisse pas sous
   le doigt quand les derniers repas se relisent.

   Le cœur ne s'affiche que si les favoris sont connus (`estFavori` non
   nul) : un cœur vide sur un plat qui est peut-être un favori serait faux.

   ⚠️ LA GRILLE N'ÉCRIT RIEN. Elle demande, et l'écran Nutrition écrit :
   les six écritures du journal vivent dans NutritionTab.
   ════════════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { Check, Heart, Plus } from "lucide-react";
import ImageRepas from "@/components/nutrition/ImageRepas";
import { nomComparable, type RecentMeal } from "@/lib/repas";

export default function GrillePlats({ plats, estFavori, onAjouter, onRetirer, onCoeur, hauteur = 118 }: {
  plats: RecentMeal[];
  /** `null` tant que les favoris ne sont pas connus : aucun cœur. */
  estFavori: ((nom: string) => boolean) | null;
  /** Rend l'identifiant du repas écrit, ou `null` si l'écriture a échoué. */
  onAjouter: (r: RecentMeal) => Promise<string | null>;
  onRetirer: (id: string) => Promise<void> | void;
  onCoeur: (r: RecentMeal) => void;
  hauteur?: number;
}) {
  const [ajoutes, setAjoutes] = useState<Record<string, string>>({});
  const [enCours, setEnCours] = useState<string | null>(null);

  const toucher = async (r: RecentMeal) => {
    const cle = nomComparable(r.name);
    if (enCours) return;
    setEnCours(cle);
    const deja = ajoutes[cle];
    if (deja) {
      await onRetirer(deja);
      setAjoutes((a) => { const s = { ...a }; delete s[cle]; return s; });
    } else {
      const id = await onAjouter(r);
      if (id) setAjoutes((a) => ({ ...a, [cle]: id }));
    }
    setEnCours(null);
  };

  return (
    <div className="grid grid-cols-3" style={{ gap: "12px 8px" }}>
      {plats.map((r) => {
        const cle = nomComparable(r.name);
        const fait = !!ajoutes[cle];
        const favori = estFavori ? estFavori(r.name) : null;
        return (
          <div key={cle} className="relative flex min-w-0 flex-col">
            <button type="button" aria-pressed={fait}
              aria-label={fait ? `${r.name}, ajouté. Toucher pour le retirer` : `Ajouter ${r.name}`}
              onClick={() => { void toucher(r); }}
              className="flex min-w-0 flex-col gap-1.5 text-left cursor-pointer" style={{ opacity: enCours === cle ? 0.6 : 1 }}>
              <span className="relative block">
                <ImageRepas nom={r.name} className="block w-full" icone={24}
                  style={{ height: hauteur, borderRadius: "var(--r-bloc)", boxShadow: "var(--ombre-pose)" }} />
                <span aria-hidden className="absolute bottom-[7px] right-[7px] flex h-[30px] w-[30px] items-center justify-center rounded-full text-white"
                  style={{ background: fait ? "#0B8A68" : "linear-gradient(135deg,#8B5CF6,#C13BC1)", boxShadow: "0 0 0 2px #fff" }}>
                  {fait ? <Check size={16} strokeWidth={3} /> : <Plus size={16} strokeWidth={3} />}
                </span>
              </span>
              <span className="line-clamp-2 text-[13px] font-semibold leading-snug" style={{ color: "var(--text-0)" }}>{r.name}</span>
            </button>
            {favori !== null && (
              <button type="button" onClick={() => onCoeur(r)} aria-pressed={favori}
                aria-label={favori ? `Retirer ${r.name} de mes favoris` : `Mettre ${r.name} dans mes favoris`}
                className="absolute left-0 top-0 flex h-11 w-11 items-center justify-center cursor-pointer">
                <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full"
                  style={{ background: "rgba(255,255,255,0.92)", boxShadow: "var(--ombre-pose)" }}>
                  <Heart size={15} strokeWidth={2.2} aria-hidden
                    style={{ color: favori ? "#8B5CF6" : "#6A6480", fill: favori ? "#8B5CF6" : "transparent" }} />
                </span>
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
