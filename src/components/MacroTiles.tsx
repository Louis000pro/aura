"use client";

/* ════════════════════════════════════════════════════════════════════
   MacroTiles — les 3 macros (P / G / L) au format Système D, tokenisé.

   UNE seule vérité visuelle pour les macros dans toute l'app :
   violet = protéines · ambre = glucides · teal = lipides. Fond/bordure en
   tokens (`--tint-violet-rgb` / `--violet-mid-rgb`) → correct en clair ET en
   sombre sans effort. Réutilisable partout (Photo IA, code-barres, fiches
   recette, récap commande…). Voir [[design-system-D-couleurs]].
   ════════════════════════════════════════════════════════════════════ */

export const MACRO_COLORS = { proteins: "#8B5CF6", carbs: "#EF9F27", fats: "#2BD4A0" } as const;

export default function MacroTiles({
  proteins, carbs, fats, className, compact = false,
}: {
  proteins: number;
  carbs: number;
  fats: number;
  className?: string;
  compact?: boolean;
}) {
  const tiles = [
    { label: "Protéines", v: proteins, c: MACRO_COLORS.proteins },
    { label: "Glucides",  v: carbs,    c: MACRO_COLORS.carbs },
    { label: "Lipides",   v: fats,     c: MACRO_COLORS.fats },
  ];
  return (
    <div className={`grid grid-cols-3 gap-2 ${className ?? ""}`}>
      {tiles.map((t) => (
        <div key={t.label} className="relative overflow-hidden rounded-2xl text-center"
          style={{
            background: "rgba(var(--tint-violet-rgb),0.5)",
            border: "1px solid rgba(var(--violet-mid-rgb),0.3)",
            padding: compact ? "9px 4px 8px" : "11px 6px 9px",
          }}>
          <span aria-hidden className="absolute top-0 left-0 right-0" style={{ height: 3, background: t.c }} />
          <p className="font-extrabold" style={{ color: t.c, fontSize: compact ? 14 : 15, fontVariantNumeric: "tabular-nums" }}>{t.v}g</p>
          <p style={{ color: "var(--text-3)", fontSize: 9.5, marginTop: 3 }}>{t.label}</p>
        </div>
      ))}
    </div>
  );
}
