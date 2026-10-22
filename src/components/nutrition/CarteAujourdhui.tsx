"use client";

/* ════════════════════════════════════════════════════════════════════
   « Aujourd'hui » : ce qu'on a mangé, en un coup d'œil, sous la question.

   Les repas du jour posés comme des polaroids, le lien vers le détail, et
   l'ajout. Aucun objectif de calories ici, aucun anneau à remplir : on
   montre ce qui a été mangé, jamais ce qui manque. Les chiffres vivent
   dans le détail, derrière « Voir le détail ».

   ⚠️ « PAS ENCORE LU » N'EST PAS « RIEN MANGÉ ». Tant que la base n'a pas
   répondu, la carte montre une forme vide, jamais « Ton premier repas
   apparaîtra ici ».
   ════════════════════════════════════════════════════════════════════ */

import { ChevronRight, Plus } from "lucide-react";
import { MEAL_META, heureLisible, type MealEntry } from "@/lib/repas";
import ImageRepas from "@/components/nutrition/ImageRepas";
import ns from "@/components/nutrition/Nutrition.module.css";

/* De quoi l'assiette du jour est faite : la part de chaque macro dans les
   calories (protéines et glucides × 4, lipides × 9). Un repère de forme,
   pas une jauge : le cercle est plein dès qu'il y a quelque chose. */
function MiniDonut({ repas }: { repas: MealEntry[] }) {
  const parts = [
    { v: repas.reduce((t, m) => t + (m.proteins || 0) * 4, 0), c: "#8B5CF6" },
    { v: repas.reduce((t, m) => t + (m.carbs || 0) * 4, 0), c: "#E8620C" },
    { v: repas.reduce((t, m) => t + (m.fats || 0) * 9, 0), c: "#2BD4A0" },
  ];
  const total = parts.reduce((t, p) => t + p.v, 0);
  if (total <= 0) return null;
  const C = 2 * Math.PI * 24;
  // Chaque arc commence où le précédent s'arrête, avec un petit jour entre eux.
  const arcs = parts.reduce<{ c: string; trait: number; debut: number; fin: number }[]>((acc, p) => {
    const debut = acc.length ? acc[acc.length - 1].fin : 0;
    const long = (p.v / total) * C;
    return [...acc, { c: p.c, trait: Math.max(0, long - 2), debut, fin: debut + long }];
  }, []);
  return (
    <svg width={18} height={18} viewBox="0 0 64 64" aria-hidden style={{ transform: "rotate(-90deg)", flexShrink: 0 }}>
      <circle cx={32} cy={32} r={24} fill="none" stroke="rgba(var(--text-3-rgb),0.22)" strokeWidth={12} />
      {arcs.filter((a) => a.trait > 0).map((a) => (
        <circle key={a.c} cx={32} cy={32} r={24} fill="none" stroke={a.c} strokeWidth={12}
          strokeDasharray={`${a.trait} ${C}`} strokeDashoffset={-a.debut} />
      ))}
    </svg>
  );
}

export default function CarteAujourdhui({ repas, onDetail, onAjouter }: {
  /** `null` tant que la base n'a pas répondu. */
  repas: MealEntry[] | null;
  onDetail: () => void;
  onAjouter: () => void;
}) {
  const derniers = repas ? repas.slice(-2) : [];

  return (
    <section className={ns.bloc} style={{ padding: 14, gap: 14 }} aria-label="Aujourd’hui">
      <div className="flex min-h-8 items-center justify-between gap-3">
        <h2 className="text-[20px]" style={{ color: "var(--text-0)", fontWeight: 750, fontVariationSettings: "var(--w-voix)" }}>
          Aujourd’hui
        </h2>
        <button type="button" onClick={onDetail}
          className="flex min-h-11 items-center gap-1.5 pl-3 text-[13px] font-semibold cursor-pointer"
          style={{ color: "var(--exp-encre)" }}>
          {repas && repas.length > 0 && <MiniDonut repas={repas} />}
          Voir le détail
          <ChevronRight size={14} strokeWidth={2.3} />
        </button>
      </div>

      <button type="button" onClick={onDetail} aria-label="Voir le détail de ma journée"
        className="flex items-center gap-4 text-left cursor-pointer">
        {repas === null ? (
          <>
            <span aria-hidden className="h-14 w-14 flex-shrink-0 rounded-full animate-pulse" style={{ background: "rgba(var(--text-3-rgb),0.16)" }} />
            <span aria-hidden className="h-3 w-40 rounded-full animate-pulse" style={{ background: "rgba(var(--text-3-rgb),0.16)" }} />
          </>
        ) : repas.length === 0 ? (
          <>
            <span aria-hidden className="h-14 w-14 flex-shrink-0 rounded-full" style={{ border: "2px dashed rgba(109,75,214,0.35)" }} />
            <span className="text-[13px] leading-snug" style={{ color: "var(--text-2)" }}>Ton premier repas apparaîtra ici.</span>
          </>
        ) : (
          <>
            {derniers.length === 1 ? (
              <span className="relative flex-shrink-0" style={{ width: 92, height: 86 }}>
                <ImageRepas nom={derniers[0].name} className={ns.polaroid}
                  style={{ left: 6, top: 4, width: 76, height: 76, transform: "rotate(-5deg)" }} />
              </span>
            ) : (
              <span className="relative flex-shrink-0" style={{ width: 112, height: 86 }}>
                <ImageRepas nom={derniers[0].name} className={ns.polaroid} icone={18}
                  style={{ left: 2, top: 6, width: 70, height: 70, transform: "rotate(-7deg)" }} />
                <ImageRepas nom={derniers[1].name} className={ns.polaroid} icone={18}
                  style={{ left: 38, top: 10, width: 70, height: 70, transform: "rotate(6deg)" }} />
              </span>
            )}
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-[11px] font-bold" style={{ color: "var(--text-3)" }}>
                {repas.length === 1
                  ? `${MEAL_META[repas[0].mealType]?.label ?? "Repas"} · ${heureLisible(repas[0].time)}`
                  : `${repas.length} repas`}
              </span>
              <span className="line-clamp-2 text-[16px] font-bold leading-snug" style={{ color: "var(--text-0)" }}>
                {repas.map((m) => m.name).join(", ")}
              </span>
            </span>
          </>
        )}
      </button>

      <button type="button" onClick={onAjouter} className={ns.pilule}>
        <Plus size={16} strokeWidth={2.8} />
        Ajouter un repas
      </button>
    </section>
  );
}
