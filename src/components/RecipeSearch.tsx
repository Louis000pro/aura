"use client";

/* ════════════════════════════════════════════════════════════════════
   RecipeSearch : la loupe de « Envie de quoi ? ».

   On tape un plat, un ingrédient ou une envie (« poulet », « sans
   gluten », « un truc rapide ») et on tombe sur les recettes de la banque
   curée, CHACUNE AVEC SON IMAGE. Toucher un résultat ouvre la fiche
   partagée de l'écran (`onOuvrir`) : une seule RecipeSheet dans tout
   l'écran Nutrition.

   Toute la lecture vit dans lib/rechercheRecettes (l'écriture, les
   régimes, les envies, les fautes de frappe). L'écran n'ajoute aucun
   réglage : au plus une ligne dit ce que la loupe a compris.
   ════════════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useState } from "react";
import { Search, X, ChevronRight } from "lucide-react";
import type { DietKey, Recipe } from "@/lib/recipeBank";
import { dureeRecette } from "@/lib/collectionsRecettes";
import { chercherRecettes, preparerRecherche } from "@/lib/rechercheRecettes";
import ns from "@/components/nutrition/Nutrition.module.css";

const AUCUN_REGIME: DietKey[] = [];

export default function RecipeSearch({ onOuvrir, regime = AUCUN_REGIME, autoFocus = false }: {
  onOuvrir: (r: Recipe) => void;
  /** Le régime de la personne : ce qui lui convient passe devant, rien n'est caché. */
  regime?: DietKey[];
  autoFocus?: boolean;
}) {
  const [q, setQ] = useState("");
  const saisie = q.trim();
  const trouvaille = useMemo(() => chercherRecettes(q, regime), [q, regime]);

  // La banque se lit juste après l'ouverture, pas pendant : le champ s'affiche tout de suite.
  useEffect(() => {
    const id = setTimeout(preparerRecherche, 0);
    return () => clearTimeout(id);
  }, []);

  return (
    <div className="flex flex-col gap-2">
      {/* ⚠️ `flexDirection` en style : un module CSS n'est dans aucune couche,
          il l'emporte sur les utilitaires Tailwind, donc `flex-row` perdrait. */}
      <label className={`${ns.bloc} items-center gap-2.5 px-4`} style={{ minHeight: 48, flexDirection: "row" }}>
        <Search size={16} style={{ color: "var(--text-3)", flexShrink: 0 }} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoFocus={autoFocus}
          placeholder="Poulet, sans gluten, rapide…"
          className="min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-[var(--text-3)]"
          style={{ color: "var(--text-1)" }}
          aria-label="Chercher une recette"
        />
        {q && (
          <button type="button" onClick={() => setQ("")} aria-label="Effacer" className="flex h-11 w-8 flex-shrink-0 items-center justify-center cursor-pointer">
            <X size={15} style={{ color: "var(--text-3)" }} />
          </button>
        )}
      </label>

      {saisie.length >= 2 && !trouvaille.vide && (
        <div className={`${ns.bloc} overflow-hidden`}>
          {trouvaille.recettes.length === 0 ? (
            <p className="px-4 py-4 text-[13px]" style={{ color: "var(--text-3)" }}>
              Aucune recette pour «&nbsp;{saisie}&nbsp;». Essaie un plat, un ingrédient ou une envie.
            </p>
          ) : (
            <>
              {trouvaille.aide && (
                <p className="vy-filet px-4 pb-2.5 pt-3 text-[13px]" style={{ color: "var(--text-3)" }}>
                  {trouvaille.aide}
                </p>
              )}
              <div className="vy-filet max-h-[48vh] overflow-y-auto">
                {trouvaille.recettes.map((r) => (
                  <button key={r.id} type="button" onClick={() => onOuvrir(r)}
                    className="vy-filet flex w-full items-center gap-3 px-3 py-2.5 text-left cursor-pointer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={r.image} alt="" loading="lazy" decoding="async"
                      className="h-12 w-12 flex-shrink-0 object-cover" style={{ borderRadius: "var(--r-controle)", background: "rgba(var(--accent-rgb),0.10)" }} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[16px] font-semibold" style={{ color: "var(--text-1)" }}>{r.nom}</span>
                      <span className="block truncate text-[13px]" style={{ color: "var(--text-3)" }}>{dureeRecette(r)}</span>
                    </span>
                    <ChevronRight size={16} style={{ color: "var(--text-3)", flexShrink: 0 }} />
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
