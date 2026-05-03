"use client";

import { useMemo } from "react";
import type { Gender } from "@/hooks/useProfileSettings";

type MuscleKey =
  | "chest" | "left-shoulder" | "right-shoulder"
  | "left-bicep" | "right-bicep" | "abs"
  | "left-quad" | "right-quad"
  | "left-calf" | "right-calf" | "traps";

export const MUSCLE_MAP: Record<string, MuscleKey[]> = {
  "Pectoraux":    ["chest"],
  "Dos":          ["traps", "left-shoulder", "right-shoulder"],
  "Épaules":      ["left-shoulder", "right-shoulder"],
  "Biceps":       ["left-bicep", "right-bicep"],
  "Triceps":      ["left-bicep", "right-bicep"],
  "Abdominaux":   ["abs"],
  "Lombaires":    ["abs"],
  "Quadriceps":   ["left-quad", "right-quad"],
  "Fessiers":     ["left-quad", "right-quad"],
  "Ischio":       ["left-quad", "right-quad"],
  "Corps entier": [
    "chest", "traps", "left-shoulder", "right-shoulder",
    "left-bicep", "right-bicep", "abs",
    "left-quad", "right-quad", "left-calf", "right-calf",
  ],
  "Cardio": ["chest", "abs", "left-quad", "right-quad"],
  "Mobilité": [
    "chest", "left-shoulder", "right-shoulder", "abs",
    "left-quad", "right-quad", "left-calf", "right-calf",
  ],
  "Souplesse": ["left-quad", "right-quad", "abs", "left-calf", "right-calf"],
};

/* ── SVG body dimensions per gender ──────────────────────────── */
// ViewBox: 0 0 80 200   (center x = 40)
const W = 80;

type BodyConfig = {
  shldrX: number; shldrW: number;
  chestX: number; chestW: number;
  absX: number;   absW: number;
  hipsX: number;  hipsW: number;
  armX: number;   armW: number;  armH: number;
  foreX: number;  foreW: number; foreH: number;
  quadX: number;  quadW: number; quadH: number;
  calfX: number;  calfW: number; calfH: number;
};

const HOMME: BodyConfig = {
  shldrX: 4,  shldrW: 20,
  chestX: 14, chestW: 52,
  absX:   16, absW:   48,
  hipsX:  16, hipsW:  48,
  armX:    4, armW:   12, armH:  30,
  foreX:   5, foreW:  10, foreH: 26,
  quadX:  16, quadW:  20, quadH: 44,
  calfX:  18, calfW:  16, calfH: 36,
};

const FEMME: BodyConfig = {
  shldrX: 6,  shldrW: 18,
  chestX: 16, chestW: 48,
  absX:   16, absW:   48,
  hipsX:  10, hipsW:  60,   // wider hips
  armX:    6, armW:   10, armH:  28,
  foreX:   7, foreW:   8, foreH: 24,
  quadX:  11, quadW:  22, quadH: 44,
  calfX:  13, calfW:  16, calfH: 36,
};

/* ── Component ────────────────────────────────────────────────── */
export default function BodyAvatar({
  gender = "homme",
  muscles = [],
  accent = "#F9A8C9",
  width = 60,
  className = "",
}: {
  gender?: Gender;
  muscles?: string[];
  accent?: string;
  width?: number;
  className?: string;
}) {
  const activeRegions = useMemo<Set<MuscleKey>>(() => {
    const s = new Set<MuscleKey>();
    muscles.forEach((m) => MUSCLE_MAP[m]?.forEach((r) => s.add(r)));
    return s;
  }, [muscles]);

  const on  = (k: MuscleKey) => activeRegions.has(k);
  const f   = (k: MuscleKey) => on(k) ? accent : "rgba(170,185,200,0.38)";
  const glo = (k: MuscleKey) => on(k) ? `drop-shadow(0 0 4px ${accent}88)` : "none";

  const c = gender === "femme" ? FEMME : HOMME;
  const mir = (x: number, w: number) => W - x - w;

  const ARM_TOP = 48;
  const FORE_TOP = ARM_TOP + c.armH;
  const HIP_TOP  = 104;
  const QUAD_TOP = 116;
  const CALF_TOP = QUAD_TOP + c.quadH;

  return (
    <svg
      viewBox="0 0 80 200"
      width={width}
      height={width * (200 / 80)}
      className={className}
      style={{ display: "block", overflow: "visible" }}
    >
      {/* HEAD */}
      <rect x="28" y="2" width="24" height="24" rx="12" fill="rgba(170,185,200,0.5)" />

      {/* NECK */}
      <rect x="33" y="24" width="14" height="10" rx="5" fill="rgba(170,185,200,0.4)" />

      {/* TRAPS */}
      <rect
        x="21" y="30" width="38" height="12" rx="6"
        fill={f("traps")}
        style={{ filter: glo("traps") }}
      />

      {/* LEFT SHOULDER */}
      <rect
        x={c.shldrX} y="36" width={c.shldrW} height="14" rx="7"
        fill={f("left-shoulder")}
        style={{ filter: glo("left-shoulder") }}
      />
      {/* RIGHT SHOULDER */}
      <rect
        x={mir(c.shldrX, c.shldrW)} y="36" width={c.shldrW} height="14" rx="7"
        fill={f("right-shoulder")}
        style={{ filter: glo("right-shoulder") }}
      />

      {/* CHEST */}
      <rect
        x={c.chestX} y="44" width={c.chestW} height="28" rx="8"
        fill={f("chest")}
        style={{ filter: glo("chest") }}
      />
      {/* Femme: breast overlay */}
      {gender === "femme" && (
        <>
          <ellipse cx="30" cy="58" rx="8" ry="7"
            fill={on("chest") ? accent : "rgba(170,185,200,0.22)"}
            opacity={0.55}
          />
          <ellipse cx="50" cy="58" rx="8" ry="7"
            fill={on("chest") ? accent : "rgba(170,185,200,0.22)"}
            opacity={0.55}
          />
        </>
      )}

      {/* ABS */}
      <rect
        x={c.absX} y="70" width={c.absW} height="36" rx="7"
        fill={f("abs")}
        style={{ filter: glo("abs") }}
      />

      {/* HIPS (neutral) */}
      <rect x={c.hipsX} y={HIP_TOP} width={c.hipsW} height="14" rx="7"
        fill="rgba(170,185,200,0.28)" />

      {/* LEFT BICEP */}
      <rect
        x={c.armX} y={ARM_TOP} width={c.armW} height={c.armH} rx="6"
        fill={f("left-bicep")}
        style={{ filter: glo("left-bicep") }}
      />
      {/* RIGHT BICEP */}
      <rect
        x={mir(c.armX, c.armW)} y={ARM_TOP} width={c.armW} height={c.armH} rx="6"
        fill={f("right-bicep")}
        style={{ filter: glo("right-bicep") }}
      />

      {/* LEFT FOREARM */}
      <rect x={c.foreX} y={FORE_TOP} width={c.foreW} height={c.foreH} rx="5"
        fill="rgba(170,185,200,0.22)" />
      {/* RIGHT FOREARM */}
      <rect x={mir(c.foreX, c.foreW)} y={FORE_TOP} width={c.foreW} height={c.foreH} rx="5"
        fill="rgba(170,185,200,0.22)" />

      {/* LEFT QUAD */}
      <rect
        x={c.quadX} y={QUAD_TOP} width={c.quadW} height={c.quadH} rx="8"
        fill={f("left-quad")}
        style={{ filter: glo("left-quad") }}
      />
      {/* RIGHT QUAD */}
      <rect
        x={mir(c.quadX, c.quadW)} y={QUAD_TOP} width={c.quadW} height={c.quadH} rx="8"
        fill={f("right-quad")}
        style={{ filter: glo("right-quad") }}
      />

      {/* LEFT CALF */}
      <rect
        x={c.calfX} y={CALF_TOP} width={c.calfW} height={c.calfH} rx="7"
        fill={f("left-calf")}
        style={{ filter: glo("left-calf") }}
      />
      {/* RIGHT CALF */}
      <rect
        x={mir(c.calfX, c.calfW)} y={CALF_TOP} width={c.calfW} height={c.calfH} rx="7"
        fill={f("right-calf")}
        style={{ filter: glo("right-calf") }}
      />
    </svg>
  );
}
