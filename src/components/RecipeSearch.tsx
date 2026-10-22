"use client";

/* ════════════════════════════════════════════════════════════════════
   RecipeSearch : chercher une recette de la banque par son nom.

   On tape un plat (« poulet », « saumon », « bowl »…) et on tombe sur les
   recettes de la banque curée (recipeBank), CHACUNE AVEC SON IMAGE.
   Toucher un résultat ouvre la fiche partagée de l'écran (`onOuvrir`) :
   une seule RecipeSheet dans tout l'écran Nutrition.

   L'aiguille et la botte de foin sont sans accent : « crepe » trouve « crêpe ».
   ════════════════════════════════════════════════════════════════════ */

import { useMemo, useState } from "react";
import { Search, X, ChevronRight } from "lucide-react";
import { RECIPES, type Recipe } from "@/lib/recipeBank";
import { dureeRecette } from "@/lib/collectionsRecettes";
import ns from "@/components/nutrition/Nutrition.module.css";

const sansAccent = (v: string) =>
  v.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

const hayOf = (r: Recipe) =>
  sansAccent(`${r.nom} ${r.description ?? ""} ${(r.tags ?? []).join(" ")}`);

export default function RecipeSearch({ onOuvrir, autoFocus = false }: {
  onOuvrir: (r: Recipe) => void;
  autoFocus?: boolean;
}) {
  const [q, setQ] = useState("");

  const resultats = useMemo<Recipe[]>(() => {
    const query = sansAccent(q.trim());
    if (query.length < 2) return [];
    const mots = query.split(/\s+/);
    return RECIPES.filter((r) => {
      const hay = hayOf(r);
      return mots.every((m) => hay.includes(m));
    });
  }, [q]);

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
          placeholder="Poulet, bowl, saumon…"
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

      {q.trim().length >= 2 && (
        <div className={`${ns.bloc} overflow-hidden`}>
          {resultats.length === 0 ? (
            <p className="px-4 py-4 text-[13px]" style={{ color: "var(--text-3)" }}>
              Aucune recette pour «&nbsp;{q.trim()}&nbsp;».
            </p>
          ) : (
            <div className="max-h-[48vh] overflow-y-auto">
              {resultats.map((r) => (
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
          )}
        </div>
      )}
    </div>
  );
}
