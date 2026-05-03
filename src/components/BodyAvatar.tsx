"use client";

import { useMemo } from "react";
import type { Gender } from "@/hooks/useProfileSettings";

/* ── Muscle keys ──────────────────────────────────────────────── */
export type MuscleKey =
  | "chest" | "left-shoulder" | "right-shoulder"
  | "left-bicep" | "right-bicep"
  | "left-tricep" | "right-tricep"
  | "abs" | "lower-back"
  | "traps" | "rhomboids" | "left-lat" | "right-lat"
  | "left-quad" | "right-quad"
  | "left-glute" | "right-glute"
  | "left-hamstring" | "right-hamstring"
  | "left-calf" | "right-calf";

export const MUSCLE_MAP: Record<string, MuscleKey[]> = {
  "Pectoraux":    ["chest"],
  "Dos":          ["traps", "rhomboids", "left-lat", "right-lat"],
  "Épaules":      ["left-shoulder", "right-shoulder"],
  "Biceps":       ["left-bicep", "right-bicep"],
  "Triceps":      ["left-tricep", "right-tricep"],
  "Abdominaux":   ["abs"],
  "Lombaires":    ["lower-back", "left-lat", "right-lat"],
  "Quadriceps":   ["left-quad", "right-quad"],
  "Fessiers":     ["left-glute", "right-glute"],
  "Ischio":       ["left-hamstring", "right-hamstring"],
  "Corps entier": [
    "chest","left-shoulder","right-shoulder","left-bicep","right-bicep",
    "left-tricep","right-tricep","abs","traps","rhomboids","left-lat","right-lat",
    "lower-back","left-quad","right-quad","left-glute","right-glute",
    "left-hamstring","right-hamstring","left-calf","right-calf",
  ],
  "Cardio":    ["chest","abs","left-quad","right-quad","left-hamstring","right-hamstring"],
  "Mobilité":  ["left-shoulder","right-shoulder","abs","left-quad","right-quad"],
  "Souplesse": ["left-quad","right-quad","left-hamstring","right-hamstring"],
};

/* ── Path data ────────────────────────────────────────────────────
   ViewBox: "0 0 160 200"
   FRONT: centre x=37  (span 0-74)
   BACK:  centre x=123 (span 86-160)
   ─────────────────────────────────────────────────────────────── */

type PathEntry = { key: MuscleKey; d: string };

const FRONT: PathEntry[] = [
  // ── Anterior deltoids ──
  { key: "left-shoulder",  d: "M16,20 C8,24 4,34 4,50 C4,58 8,62 16,60 C20,58 22,52 22,40 C22,32 18,26 16,20 Z" },
  { key: "right-shoulder", d: "M58,20 C66,24 70,34 70,50 C70,58 66,62 58,60 C54,58 52,52 52,40 C52,32 54,26 58,20 Z" },

  // ── Pectoralis major ──
  { key: "chest", d: "M37,23 C34,21 25,23 17,33 C11,41 11,55 21,61 Q29,65 37,65 L37,23 Z" },
  { key: "chest", d: "M37,23 C40,21 49,23 57,33 C63,41 63,55 53,61 Q45,65 37,65 L37,23 Z" },

  // ── Biceps brachii ──
  { key: "left-bicep",  d: "M4,50 C2,54 0,66 2,80 L4,94 C8,98 17,96 19,88 L17,72 C15,61 8,56 4,50 Z" },
  { key: "right-bicep", d: "M70,50 C72,54 74,66 72,80 L70,94 C66,98 57,96 55,88 L57,72 C59,61 66,56 70,50 Z" },

  // ── External oblique ──
  { key: "abs", d: "M17,55 C13,63 11,77 13,93 L21,97 C21,83 21,69 23,61 Z" },
  { key: "abs", d: "M57,55 C61,63 63,77 61,93 L53,97 C53,83 53,69 51,61 Z" },

  // ── Rectus abdominis (6 sections) ──
  { key: "abs", d: "M25,65 L25,76 C25,78 27,79 31,77 L37,77 L37,65 Z" },
  { key: "abs", d: "M49,65 L49,76 C49,78 47,79 43,77 L37,77 L37,65 Z" },
  { key: "abs", d: "M25,79 L25,89 C25,91 27,92 31,90 L37,90 L37,79 Z" },
  { key: "abs", d: "M49,79 L49,89 C49,91 47,92 43,90 L37,90 L37,79 Z" },
  { key: "abs", d: "M27,91 L27,101 C27,103 29,104 33,102 L37,102 L37,91 Z" },
  { key: "abs", d: "M47,91 L47,101 C47,103 45,104 41,102 L37,102 L37,91 Z" },

  // ── Quadriceps ──
  { key: "left-quad",  d: "M19,103 C13,111 9,127 11,151 C13,163 23,169 35,167 L37,147 L37,105 C29,103 23,103 19,103 Z" },
  { key: "right-quad", d: "M55,103 C61,111 65,127 63,151 C61,163 51,169 39,167 L37,147 L37,105 C45,103 51,103 55,103 Z" },

  // ── Tibialis anterior ──
  { key: "left-calf",  d: "M23,165 C19,171 17,181 21,191 L25,197 C29,197 31,195 29,189 L27,179 C25,173 23,167 23,165 Z" },
  { key: "right-calf", d: "M51,165 C55,171 57,181 53,191 L49,197 C45,197 43,195 45,189 L47,179 C49,173 51,167 51,165 Z" },

  // ── Gastrocnemius (medial head, visible from front) ──
  { key: "left-calf",  d: "M27,165 C23,173 23,183 27,193 C29,197 33,197 35,193 L33,179 C31,171 29,167 27,165 Z" },
  { key: "right-calf", d: "M47,165 C51,173 51,183 47,193 C45,197 41,197 39,193 L41,179 C43,171 45,167 47,165 Z" },
];

const BACK: PathEntry[] = [
  // ── Trapezius ──
  { key: "traps", d: "M123,18 C117,18 105,22 97,34 C93,44 97,52 107,50 C113,48 117,40 123,38 C129,40 133,48 139,50 C149,52 153,44 149,34 C141,22 129,18 123,18 Z" },

  // ── Posterior deltoids ──
  { key: "left-shoulder",  d: "M102,21 C94,25 90,35 90,51 C90,59 94,63 102,61 C106,59 108,53 108,41 C108,33 104,27 102,21 Z" },
  { key: "right-shoulder", d: "M144,21 C152,25 156,35 156,51 C156,59 152,63 144,61 C140,59 138,53 138,41 C138,33 142,27 144,21 Z" },

  // ── Triceps ──
  { key: "left-tricep",  d: "M90,51 C88,57 86,69 88,83 L90,95 C94,99 102,97 104,89 L102,73 C100,63 94,59 90,51 Z" },
  { key: "right-tricep", d: "M156,51 C158,57 160,69 158,83 L156,95 C152,99 144,97 142,89 L144,73 C146,63 152,59 156,51 Z" },

  // ── Latissimus dorsi ──
  { key: "left-lat",  d: "M96,57 C92,67 90,85 94,103 C98,117 110,125 122,127 L123,105 L123,65 C114,61 104,57 96,57 Z" },
  { key: "right-lat", d: "M150,57 C154,67 156,85 152,103 C148,117 136,125 124,127 L123,105 L123,65 C132,61 142,57 150,57 Z" },

  // ── Rhomboids / mid-back ──
  { key: "rhomboids", d: "M108,37 C106,47 106,61 108,71 L123,75 L138,71 C140,61 140,47 138,37 L123,33 Z" },

  // ── Erector spinae / lower back ──
  { key: "lower-back", d: "M109,117 C105,125 103,133 107,139 L113,143 L123,145 L123,117 Z" },
  { key: "lower-back", d: "M137,117 C141,125 143,133 139,139 L133,143 L123,145 L123,117 Z" },

  // ── Gluteus maximus ──
  { key: "left-glute",  d: "M100,101 C94,111 92,129 96,149 C100,163 112,169 122,167 L123,147 L123,103 C116,101 108,101 100,101 Z" },
  { key: "right-glute", d: "M146,101 C152,111 154,129 150,149 C146,163 134,169 124,167 L123,147 L123,103 C130,101 138,101 146,101 Z" },

  // ── Biceps femoris / hamstrings ──
  { key: "left-hamstring",  d: "M96,161 C90,169 90,183 96,195 L101,199 C109,199 115,195 115,189 L113,171 C109,163 101,161 96,161 Z" },
  { key: "right-hamstring", d: "M150,161 C156,169 156,183 150,195 L145,199 C137,199 131,195 131,189 L133,171 C137,163 145,161 150,161 Z" },

  // ── Gastrocnemius (prominent from back) ──
  { key: "left-calf",  d: "M104,187 C100,193 100,203 106,207 L112,207 C116,203 114,193 110,189 L104,187 Z" },
  { key: "right-calf", d: "M142,187 C146,193 146,203 140,207 L134,207 C130,203 132,193 136,189 L142,187 Z" },
];

/* ── Neutral background shapes (always gray) ────────────────── */
// These give the silhouette without being muscles
const NEUTRAL_FRONT = {
  head:        "M37,2 C44,2 47,7 47,14 C47,21 44,26 37,26 C30,26 27,21 27,14 C27,7 30,2 37,2 Z",
  neck:        "M32,26 L30,32 Q37,34 44,32 L42,26 Z",
  forearmL:    "M4,94 C2,98 0,110 2,124 L4,132 C8,134 14,132 16,128 L14,112 C12,102 6,100 4,94 Z",
  forearmR:    "M70,94 C72,98 74,110 72,124 L70,132 C66,134 60,132 58,128 L60,112 C62,102 68,100 70,94 Z",
};
const NEUTRAL_BACK = {
  head:     "M123,2 C130,2 133,7 133,14 C133,21 130,26 123,26 C116,26 113,21 113,14 C113,7 116,2 123,2 Z",
  neck:     "M118,26 L116,32 Q123,34 130,32 L128,26 Z",
  forearmL: "M90,95 C88,101 86,113 88,127 L90,135 C94,137 100,135 102,131 L100,115 C98,105 92,103 90,95 Z",
  forearmR: "M156,95 C158,101 160,113 158,127 L156,135 C152,137 146,135 144,131 L146,115 C148,105 154,103 156,95 Z",
};

/* ── Component ───────────────────────────────────────────────── */
export default function BodyAvatar({
  gender = "homme",
  muscles = [],
  accent = "#F9A8C9",
  width = 140,
  className = "",
}: {
  gender?: Gender;
  muscles?: string[];
  accent?: string;
  width?: number;
  className?: string;
}) {
  const active = useMemo<Set<MuscleKey>>(() => {
    const s = new Set<MuscleKey>();
    muscles.forEach((m) => MUSCLE_MAP[m]?.forEach((k) => s.add(k)));
    return s;
  }, [muscles]);

  const on = (k: MuscleKey) => active.has(k);
  const fill = (k: MuscleKey) => on(k) ? accent : "rgba(190,202,214,0.55)";
  const glow = (k: MuscleKey) => on(k) ? `drop-shadow(0 0 3px ${accent}99)` : "none";

  const neutralFill  = "rgba(210,218,226,0.5)";
  const neutralFill2 = "rgba(210,218,226,0.3)";

  const height = width * (200 / 160);

  return (
    <svg
      viewBox="0 0 160 200"
      width={width}
      height={height}
      className={className}
      style={{ display: "block", overflow: "visible" }}
    >
      {/* ── FRONT VIEW ─────────────────────────────────── */}
      {/* Neutral parts */}
      <path d={NEUTRAL_FRONT.head}     fill={neutralFill} />
      <path d={NEUTRAL_FRONT.neck}     fill={neutralFill2} />
      <path d={NEUTRAL_FRONT.forearmL} fill={neutralFill2} />
      <path d={NEUTRAL_FRONT.forearmR} fill={neutralFill2} />

      {/* Female breast overlay under pecs */}
      {gender === "femme" && (
        <>
          <ellipse cx="30" cy="52" rx="8" ry="7"
            fill={on("chest") ? accent : "rgba(200,212,220,0.4)"} opacity={0.6} />
          <ellipse cx="44" cy="52" rx="8" ry="7"
            fill={on("chest") ? accent : "rgba(200,212,220,0.4)"} opacity={0.6} />
        </>
      )}

      {/* Highlighted muscles */}
      {FRONT.map((p, i) => (
        <path
          key={`f${i}`}
          d={p.d}
          fill={fill(p.key)}
          style={{ filter: glow(p.key), transition: "fill 0.3s ease" }}
        />
      ))}

      {/* Front label */}
      <text x="37" y="208" textAnchor="middle"
        style={{ fontSize: 7, fill: "rgba(160,174,192,0.8)", fontFamily: "sans-serif", letterSpacing: "0.1em" }}>
        AVANT
      </text>

      {/* ── BACK VIEW ──────────────────────────────────── */}
      {/* Neutral parts */}
      <path d={NEUTRAL_BACK.head}     fill={neutralFill} />
      <path d={NEUTRAL_BACK.neck}     fill={neutralFill2} />
      <path d={NEUTRAL_BACK.forearmL} fill={neutralFill2} />
      <path d={NEUTRAL_BACK.forearmR} fill={neutralFill2} />

      {/* Female glute adjustment */}
      {gender === "femme" && (
        <>
          <ellipse cx="110" cy="138" rx="14" ry="10"
            fill={on("left-glute") ? accent : "rgba(200,212,220,0.35)"} opacity={0.5} />
          <ellipse cx="136" cy="138" rx="14" ry="10"
            fill={on("right-glute") ? accent : "rgba(200,212,220,0.35)"} opacity={0.5} />
        </>
      )}

      {/* Highlighted muscles */}
      {BACK.map((p, i) => (
        <path
          key={`b${i}`}
          d={p.d}
          fill={fill(p.key)}
          style={{ filter: glow(p.key), transition: "fill 0.3s ease" }}
        />
      ))}

      {/* Separator line */}
      <line x1="80" y1="10" x2="80" y2="196" stroke="rgba(200,210,220,0.4)" strokeWidth="1" strokeDasharray="3,4" />

      {/* Back label */}
      <text x="123" y="208" textAnchor="middle"
        style={{ fontSize: 7, fill: "rgba(160,174,192,0.8)", fontFamily: "sans-serif", letterSpacing: "0.1em" }}>
        ARRIÈRE
      </text>
    </svg>
  );
}
