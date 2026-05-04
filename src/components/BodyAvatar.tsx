"use client";

import { useMemo } from "react";
import type { Gender } from "@/hooks/useProfileSettings";

/* ── Types ─────────────────────────────────────────────────── */
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

/* ═══════════════════════════════════════════════════════════════
   SVG BODY — viewBox "0 0 200 290"
   FRONT: figures centered at x=50  |  BACK: centered at x=150
   Separator dashed line at x=100
   ═══════════════════════════════════════════════════════════════ */

/* ── FRONT — base silhouette shapes (drawn beneath muscles) ─── */
const FB = {
  head: `M50,4 C58,4 64,10 64,20 C64,30 57,37 50,37
         C43,37 36,30 36,20 C36,10 42,4 50,4 Z`,

  neck: `M44,37 C44,41 43,47 43,53
         L57,53 C57,47 56,41 56,37
         C54,36 52,35 50,35 C48,35 46,36 44,37 Z`,

  // Main torso + legs (one closed shape — shoulders to feet)
  torso: `M22,62 C20,78 18,98 20,114 C20,124 24,132 24,140
          L22,144 C16,160 14,188 14,214 C14,224 16,230 20,232
          C18,252 18,268 22,278 C24,284 30,286 36,286
          L44,286 L44,268 L46,260 L54,260 L56,268 L56,286
          L64,286 C70,286 76,284 78,278
          C82,268 82,252 80,232
          C84,230 86,224 86,214 C86,188 84,160 78,144
          L76,140 C76,132 80,124 80,114
          C82,98 80,78 78,62
          C70,56 62,52 57,53 L43,53
          C38,52 30,56 22,62 Z`,

  // Upper arms (base shape; deltoid + bicep overlaid on top)
  lArm: `M22,60 C14,64 10,76 12,90
         C14,100 20,106 26,102
         C32,98 34,84 32,72
         C30,62 24,58 22,60 Z`,
  rArm: `M78,60 C86,64 90,76 88,90
         C86,100 80,106 74,102
         C68,98 66,84 68,72
         C70,62 76,58 78,60 Z`,

  // Forearms — neutral (no muscle key)
  lForearm: `M12,96 C8,108 8,128 12,140
             C15,148 21,150 25,144
             C29,138 30,116 28,104
             C25,94 17,90 12,96 Z`,
  rForearm: `M88,96 C92,108 92,128 88,140
             C85,148 79,150 75,144
             C71,138 70,116 72,104
             C75,94 83,90 88,96 Z`,
};

/* ── BACK — same shapes, all x + 100 ─────────────────────── */
const BB = {
  head: `M150,4 C158,4 164,10 164,20 C164,30 157,37 150,37
         C143,37 136,30 136,20 C136,10 142,4 150,4 Z`,

  neck: `M144,37 C144,41 143,47 143,53
         L157,53 C157,47 156,41 156,37
         C154,36 152,35 150,35 C148,35 146,36 144,37 Z`,

  torso: `M122,62 C120,78 118,98 120,114 C120,124 124,132 124,140
          L122,144 C116,160 114,188 114,214 C114,224 116,230 120,232
          C118,252 118,268 122,278 C124,284 130,286 136,286
          L144,286 L144,268 L146,260 L154,260 L156,268 L156,286
          L164,286 C170,286 176,284 178,278
          C182,268 182,252 180,232
          C184,230 186,224 186,214 C186,188 184,160 178,144
          L176,140 C176,132 180,124 180,114
          C182,98 180,78 178,62
          C170,56 162,52 157,53 L143,53
          C138,52 130,56 122,62 Z`,

  lArm: `M122,60 C114,64 110,76 112,90
         C114,100 120,106 126,102
         C132,98 134,84 132,72
         C130,62 124,58 122,60 Z`,
  rArm: `M178,60 C186,64 190,76 188,90
         C186,100 180,106 174,102
         C168,98 166,84 168,72
         C170,62 176,58 178,60 Z`,

  lForearm: `M112,96 C108,108 108,128 112,140
             C115,148 121,150 125,144
             C129,138 130,116 128,104
             C125,94 117,90 112,96 Z`,
  rForearm: `M188,96 C192,108 192,128 188,140
             C185,148 179,150 175,144
             C171,138 170,116 172,104
             C175,94 183,90 188,96 Z`,
};

/* ── Muscle path definitions ─────────────────────────────── */
type MEntry = { d: string[]; k: MuscleKey[] };

const FRONT_MUSCLES: MEntry[] = [
  // ── Anterior deltoids ──
  { k: ["left-shoulder"],
    d: [`M22,60 C14,64 10,74 12,84
         C13,90 17,96 23,96
         C28,96 32,90 32,78
         C32,68 28,60 22,60 Z`] },
  { k: ["right-shoulder"],
    d: [`M78,60 C86,64 90,74 88,84
         C87,90 83,96 77,96
         C72,96 68,90 68,78
         C68,68 72,60 78,60 Z`] },

  // ── Pectoralis major (left + right halves) ──
  { k: ["chest"],
    d: [
      `M44,60 C38,64 28,72 26,86
       C24,96 28,108 38,112
       C43,114 48,112 50,108 L50,64 Z`,
      `M56,60 C62,64 72,72 74,86
       C76,96 72,108 62,112
       C57,114 52,112 50,108 L50,64 Z`,
    ] },

  // ── Biceps brachii ──
  { k: ["left-bicep"],
    d: [`M12,90 C8,100 8,120 12,132
         C15,140 21,142 25,138
         C29,132 30,112 28,100
         C26,90 18,86 12,90 Z`] },
  { k: ["right-bicep"],
    d: [`M88,90 C92,100 92,120 88,132
         C85,140 79,142 75,138
         C71,132 70,112 72,100
         C74,90 82,86 88,90 Z`] },

  // ── Rectus abdominis (6 packs) + obliques ──
  { k: ["abs"],
    d: [
      // Left column — 3 sections
      "M36,110 L36,120 C38,122 42,122 46,120 L50,110 Z",
      "M36,124 L36,134 C38,136 42,136 46,134 L50,124 Z",
      "M37,138 L37,148 C39,150 43,150 47,148 L50,138 Z",
      // Right column — 3 sections
      "M64,110 L64,120 C62,122 58,122 54,120 L50,110 Z",
      "M64,124 L64,134 C62,136 58,136 54,134 L50,124 Z",
      "M63,138 L63,148 C61,150 57,150 53,148 L50,138 Z",
      // Obliques
      `M26,108 C22,118 20,130 22,142
       L30,146 C32,134 34,120 36,112 Z`,
      `M74,108 C78,118 80,130 78,142
       L70,146 C68,134 66,120 64,112 Z`,
    ] },

  // ── Quadriceps ──
  { k: ["left-quad"],
    d: [`M24,142 C18,156 16,180 18,208
         C20,220 26,226 34,222
         C40,218 44,204 42,188
         L40,164 C38,152 30,140 24,142 Z`] },
  { k: ["right-quad"],
    d: [`M76,142 C82,156 84,180 82,208
         C80,220 74,226 66,222
         C60,218 56,204 58,188
         L60,164 C62,152 70,140 76,142 Z`] },

  // ── Calves — tibialis anterior + gastroc medial head ──
  { k: ["left-calf"],
    d: [
      `M20,224 C16,236 16,256 20,268
       C22,276 28,278 32,274
       L32,250 C30,238 25,226 20,224 Z`,
      `M26,224 C22,236 22,256 26,270
       C29,276 34,276 36,270
       L34,250 C32,238 29,226 26,224 Z`,
    ] },
  { k: ["right-calf"],
    d: [
      `M80,224 C84,236 84,256 80,268
       C78,276 72,278 68,274
       L68,250 C70,238 75,226 80,224 Z`,
      `M74,224 C78,236 78,256 74,270
       C71,276 66,276 64,270
       L66,250 C68,238 71,226 74,224 Z`,
    ] },
];

const BACK_MUSCLES: MEntry[] = [
  // ── Trapezius — diamond from neck to shoulder caps ──
  { k: ["traps"],
    d: [`M150,49 C146,49 138,53 126,61
         C118,67 114,75 116,83
         C118,89 126,89 136,81
         L150,75 L164,81
         C174,89 182,89 184,83
         C186,75 182,67 174,61
         C162,53 154,49 150,49 Z`] },

  // ── Posterior deltoids ──
  { k: ["left-shoulder"],
    d: [`M122,60 C114,64 110,74 112,84
         C113,90 117,96 123,96
         C128,96 132,90 132,78
         C132,68 128,60 122,60 Z`] },
  { k: ["right-shoulder"],
    d: [`M178,60 C186,64 190,74 188,84
         C187,90 183,96 177,96
         C172,96 168,90 168,78
         C168,68 172,60 178,60 Z`] },

  // ── Triceps brachii ──
  { k: ["left-tricep"],
    d: [`M112,90 C108,100 108,120 112,132
         C115,140 121,142 125,138
         C129,132 130,112 128,100
         C126,90 118,86 112,90 Z`] },
  { k: ["right-tricep"],
    d: [`M188,90 C192,100 192,120 188,132
         C185,140 179,142 175,138
         C171,132 170,112 172,100
         C174,90 182,86 188,90 Z`] },

  // ── Rhomboids / mid-back ──
  { k: ["rhomboids"],
    d: [`M136,63 C132,73 132,89 136,99
         L150,103 L164,99
         C168,89 168,73 164,63
         L150,59 Z`] },

  // ── Latissimus dorsi ──
  { k: ["left-lat"],
    d: [`M128,75 C122,85 120,109 122,131
         C124,145 132,153 144,153
         L150,133 L150,81
         C144,73 134,71 128,75 Z`] },
  { k: ["right-lat"],
    d: [`M172,75 C178,85 180,109 178,131
         C176,145 168,153 156,153
         L150,133 L150,81
         C156,73 166,71 172,75 Z`] },

  // ── Erector spinae / lower back (two columns) ──
  { k: ["lower-back"],
    d: [
      `M144,133 C140,145 140,159 144,169
       C147,175 150,177 150,173 L150,131 Z`,
      `M156,133 C160,145 160,159 156,169
       C153,175 150,177 150,173 L150,131 Z`,
    ] },

  // ── Gluteus maximus ──
  { k: ["left-glute"],
    d: [`M118,135 C112,149 110,169 114,187
         C118,201 128,207 140,203
         C148,201 152,191 150,179
         L150,139 C144,133 130,129 118,135 Z`] },
  { k: ["right-glute"],
    d: [`M182,135 C188,149 190,169 186,187
         C182,201 172,207 160,203
         C152,201 148,191 150,179
         L150,139 C156,133 170,129 182,135 Z`] },

  // ── Hamstrings ──
  { k: ["left-hamstring"],
    d: [`M118,197 C114,211 114,233 118,251
         C122,263 130,267 138,263
         C144,259 146,243 144,225
         L142,207 C138,197 124,193 118,197 Z`] },
  { k: ["right-hamstring"],
    d: [`M182,197 C186,211 186,233 182,251
         C178,263 170,267 162,263
         C156,259 154,243 156,225
         L158,207 C162,197 176,193 182,197 Z`] },

  // ── Gastrocnemius (back — most prominent) ──
  { k: ["left-calf"],
    d: [`M120,257 C116,269 118,281 124,285
         C130,289 136,285 138,275
         L136,261 Z`] },
  { k: ["right-calf"],
    d: [`M180,257 C184,269 182,281 176,285
         C170,289 164,285 162,275
         L164,261 Z`] },
];

/* ── Component ──────────────────────────────────────────────── */
export default function BodyAvatar({
  gender   = "homme",
  muscles  = [],
  accent   = "#F9A8C9",
  width    = 160,
  className = "",
}: {
  gender?:    Gender;
  muscles?:   string[];
  accent?:    string;
  width?:     number;
  className?: string;
}) {
  const active = useMemo<Set<MuscleKey>>(() => {
    const s = new Set<MuscleKey>();
    muscles.forEach(m => MUSCLE_MAP[m]?.forEach(k => s.add(k)));
    return s;
  }, [muscles]);

  const uid    = accent.replace(/[^a-zA-Z0-9]/g, "");
  const height = Math.round(width * 290 / 200);
  const isOn   = (keys: MuscleKey[]) => keys.some(k => active.has(k));

  const fillActive   = `url(#ag-${uid})`;
  const fillInactive = `url(#ig-${uid})`;
  const fillBase     = "rgba(218,228,236,0.44)";
  const fillNeutral  = "rgba(206,218,226,0.78)";
  const glowFilter   = `url(#gw-${uid})`;

  const mStyle = (keys: MuscleKey[]): React.CSSProperties =>
    isOn(keys) ? { filter: glowFilter } : {};

  return (
    <svg
      viewBox="0 0 200 290"
      width={width}
      height={height}
      className={className}
      style={{ display: "block", overflow: "visible" }}
    >
      <defs>
        {/* Active muscle — top-to-bottom gradient */}
        <linearGradient id={`ag-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={accent} stopOpacity="0.58" />
          <stop offset="100%" stopColor={accent} stopOpacity="0.87" />
        </linearGradient>

        {/* Inactive muscle — soft blue-gray gradient */}
        <linearGradient id={`ig-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="rgb(204,216,226)" stopOpacity="0.55" />
          <stop offset="100%" stopColor="rgb(183,200,214)" stopOpacity="0.70" />
        </linearGradient>

        {/* Glow / bloom on active muscles */}
        <filter id={`gw-${uid}`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* ══════════ FRONT ══════════ */}

      {/* Silhouette base (faintest layer) */}
      <path d={FB.torso}    fill={fillBase} />
      <path d={FB.lArm}     fill={fillBase} />
      <path d={FB.rArm}     fill={fillBase} />

      {/* Neutral parts — always the same light gray */}
      <path d={FB.head}     fill={fillNeutral} />
      <path d={FB.neck}     fill={fillNeutral} />
      <path d={FB.lForearm} fill={fillNeutral} />
      <path d={FB.rForearm} fill={fillNeutral} />

      {/* Front muscle paths */}
      {FRONT_MUSCLES.map((e, i) =>
        e.d.map((d, j) => (
          <path
            key={`f${i}-${j}`}
            d={d}
            fill={isOn(e.k) ? fillActive : fillInactive}
            style={mStyle(e.k)}
          />
        ))
      )}

      {/* Female breast overlay on chest area */}
      {gender === "femme" && (
        <>
          <ellipse cx="40" cy="84" rx="9" ry="7"
            fill={isOn(["chest"]) ? fillActive : fillInactive}
            style={mStyle(["chest"])} opacity={0.72} />
          <ellipse cx="60" cy="84" rx="9" ry="7"
            fill={isOn(["chest"]) ? fillActive : fillInactive}
            style={mStyle(["chest"])} opacity={0.72} />
        </>
      )}

      {/* AVANT label */}
      <text x="50" y="289" textAnchor="middle" style={{
        fontSize: 6, fill: "rgba(144,160,174,0.85)",
        fontFamily: "system-ui,sans-serif",
        letterSpacing: "0.14em", fontWeight: 700,
      }}>
        AVANT
      </text>

      {/* Dashed separator */}
      <line x1="100" y1="8" x2="100" y2="284"
        stroke="rgba(180,196,210,0.28)"
        strokeWidth="0.8"
        strokeDasharray="4,5" />

      {/* ══════════ BACK ══════════ */}

      <path d={BB.torso}    fill={fillBase} />
      <path d={BB.lArm}     fill={fillBase} />
      <path d={BB.rArm}     fill={fillBase} />

      <path d={BB.head}     fill={fillNeutral} />
      <path d={BB.neck}     fill={fillNeutral} />
      <path d={BB.lForearm} fill={fillNeutral} />
      <path d={BB.rForearm} fill={fillNeutral} />

      {BACK_MUSCLES.map((e, i) =>
        e.d.map((d, j) => (
          <path
            key={`b${i}-${j}`}
            d={d}
            fill={isOn(e.k) ? fillActive : fillInactive}
            style={mStyle(e.k)}
          />
        ))
      )}

      {/* Female wider glute cue */}
      {gender === "femme" && (
        <>
          <ellipse cx="137" cy="168" rx="14" ry="10"
            fill={isOn(["left-glute"]) ? fillActive : fillInactive}
            style={mStyle(["left-glute"])} opacity={0.48} />
          <ellipse cx="163" cy="168" rx="14" ry="10"
            fill={isOn(["right-glute"]) ? fillActive : fillInactive}
            style={mStyle(["right-glute"])} opacity={0.48} />
        </>
      )}

      {/* ARRIÈRE label */}
      <text x="150" y="289" textAnchor="middle" style={{
        fontSize: 6, fill: "rgba(144,160,174,0.85)",
        fontFamily: "system-ui,sans-serif",
        letterSpacing: "0.14em", fontWeight: 700,
      }}>
        ARRIÈRE
      </text>
    </svg>
  );
}
