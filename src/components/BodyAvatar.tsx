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
   FRONT figure centered at x=50  (body spans roughly x=14..86)
   BACK  figure centered at x=150 (body spans roughly x=114..186)
   Separator dashed line at x=100

   Design goals
   ────────────
   • Smooth cubic bezier curves throughout — zero straight edges
   • Shoulder width ~72 px  (from ~14 to ~86)
   • Waist width  ~38 px  (from ~31 to ~69)
   • Hip width    ~50 px  (from ~25 to ~75)
   • Arms hang separately from torso with a visible gap (~2 px)
   • Head : neck : shoulder ratio  ≈ 1 : 0.28 : 1.45
   • Leg gap visible between knees and thighs
   ═══════════════════════════════════════════════════════════════ */

/* ────────────────────────────────────────────────────────────────
   FRONT BASE SILHOUETTE
   ──────────────────────────────────────────────────────────────── */
const FB = {
  /* Rounded head — slightly wider at temple */
  head: `
    M50,4
    C54,4 59,6 62,10
    C65,14 65,19 64,23
    C63,28 60,33 57,35
    C55,36 53,37 50,37
    C47,37 45,36 43,35
    C40,33 37,28 36,23
    C35,19 35,14 38,10
    C41,6 46,4 50,4 Z`,

  /* Neck — tapers slightly from head to clavicle */
  neck: `
    M44,36
    C43,39 43,43 43,48
    C43,50 44,52 45,53
    L55,53
    C56,52 57,50 57,48
    C57,43 57,39 56,36
    C54,35 52,34 50,34
    C48,34 46,35 44,36 Z`,

  /*
   * Main torso: clavicle shelf → wide shoulders → armpit undercut →
   * oblique taper to waist → hip flare → inner thigh → leg separation →
   * calves → feet
   *
   * This is ONE closed shape from shoulders to feet.
   * Arms are separate overlapping shapes so we get the gap naturally.
   *
   * Key x anchors:
   *   Shoulder outer edge : 14 (left) / 86 (right)
   *   Armpit inset        : 22 (left) / 78 (right)
   *   Waist               : 31 (left) / 69 (right)
   *   Hip outer           : 26 (left) / 74 (right)
   *   Knee outer          : 28 (left) / 72 (right)
   *   Ankle               : 30 (left) / 70 (right)
   *   Left foot           : ends ~x=42, right foot starts ~x=58
   */
  torso: `
    M43,53
    C40,53 36,54 33,56
    C28,58 23,61 20,65
    C17,69 16,74 17,79
    C18,84 21,88 24,90
    C26,92 27,94 27,97
    C27,102 26,108 26,114
    C25,120 24,126 24,132
    C23,137 22,141 22,145
    C20,152 18,162 17,174
    C16,184 16,194 17,204
    C18,212 20,218 22,222
    C24,226 26,228 27,232
    C28,238 28,246 27,254
    C26,260 25,266 25,272
    C25,278 26,283 30,285
    C33,287 37,287 41,286
    C44,286 46,284 47,281
    C48,278 48,274 48,270
    L48,260
    C48,257 49,255 50,255
    C51,255 52,257 52,260
    L52,270
    C52,274 52,278 53,281
    C54,284 56,286 59,286
    C63,287 67,287 70,285
    C74,283 75,278 75,272
    C75,266 74,260 73,254
    C72,246 72,238 73,232
    C74,228 76,226 78,222
    C80,218 82,212 83,204
    C84,194 84,184 83,174
    C82,162 80,152 78,145
    C78,141 77,137 76,132
    C76,126 75,120 74,114
    C74,108 73,102 73,97
    C73,94 74,92 76,90
    C79,88 82,84 83,79
    C84,74 83,69 80,65
    C77,61 72,58 67,56
    C64,54 60,53 57,53
    Z`,

  /*
   * Left arm — hangs alongside torso with ~2 px gap.
   * Deltoid rounds at top, tapers to elbow, then forearm.
   * Outer edge x ≈ 10 at mid-deltoid.
   * Covers from shoulder (y≈60) to wrist (y≈178).
   */
  lArm: `
    M22,65
    C19,67 15,71 13,77
    C11,83 11,90 13,98
    C14,104 16,110 17,116
    C18,122 18,128 17,134
    C16,140 14,148 13,156
    C12,162 12,169 13,176
    C14,181 17,184 21,183
    C24,183 27,180 28,175
    C29,170 29,163 29,157
    C29,151 28,144 27,138
    C26,132 25,126 25,120
    C25,114 26,108 27,102
    C28,96 29,90 29,84
    C29,78 28,72 26,68
    C25,66 23,65 22,65 Z`,

  /*
   * Right arm — mirror of left (+100 would be back; this is +0, mirrored at x=50)
   * Outer edge x ≈ 90 at mid-deltoid.
   */
  rArm: `
    M78,65
    C81,67 85,71 87,77
    C89,83 89,90 87,98
    C86,104 84,110 83,116
    C82,122 82,128 83,134
    C84,140 86,148 87,156
    C88,162 88,169 87,176
    C86,181 83,184 79,183
    C76,183 73,180 72,175
    C71,170 71,163 71,157
    C71,151 72,144 73,138
    C74,132 75,126 75,120
    C75,114 74,108 73,102
    C72,96 71,90 71,84
    C71,78 72,72 74,68
    C75,66 77,65 78,65 Z`,

  /* Forearms — below elbow, neutral (no muscle group) */
  lForearm: `
    M13,156
    C12,162 12,169 13,176
    C14,181 17,184 21,183
    C23,183 26,180 27,174
    C28,168 28,160 27,153
    C25,147 22,145 19,147
    C16,149 14,152 13,156 Z`,

  rForearm: `
    M87,156
    C88,162 88,169 87,176
    C86,181 83,184 79,183
    C77,183 74,180 73,174
    C72,168 72,160 73,153
    C75,147 78,145 81,147
    C84,149 86,152 87,156 Z`,
};

/* ────────────────────────────────────────────────────────────────
   BACK BASE SILHOUETTE  (all x values = front + 100)
   ──────────────────────────────────────────────────────────────── */
const BB = {
  head: `
    M150,4
    C154,4 159,6 162,10
    C165,14 165,19 164,23
    C163,28 160,33 157,35
    C155,36 153,37 150,37
    C147,37 145,36 143,35
    C140,33 137,28 136,23
    C135,19 135,14 138,10
    C141,6 146,4 150,4 Z`,

  neck: `
    M144,36
    C143,39 143,43 143,48
    C143,50 144,52 145,53
    L155,53
    C156,52 157,50 157,48
    C157,43 157,39 156,36
    C154,35 152,34 150,34
    C148,34 146,35 144,36 Z`,

  torso: `
    M143,53
    C140,53 136,54 133,56
    C128,58 123,61 120,65
    C117,69 116,74 117,79
    C118,84 121,88 124,90
    C126,92 127,94 127,97
    C127,102 126,108 126,114
    C125,120 124,126 124,132
    C123,137 122,141 122,145
    C120,152 118,162 117,174
    C116,184 116,194 117,204
    C118,212 120,218 122,222
    C124,226 126,228 127,232
    C128,238 128,246 127,254
    C126,260 125,266 125,272
    C125,278 126,283 130,285
    C133,287 137,287 141,286
    C144,286 146,284 147,281
    C148,278 148,274 148,270
    L148,260
    C148,257 149,255 150,255
    C151,255 152,257 152,260
    L152,270
    C152,274 152,278 153,281
    C154,284 156,286 159,286
    C163,287 167,287 170,285
    C174,283 175,278 175,272
    C175,266 174,260 173,254
    C172,246 172,238 173,232
    C174,228 176,226 178,222
    C180,218 182,212 183,204
    C184,194 184,184 183,174
    C182,162 180,152 178,145
    C178,141 177,137 176,132
    C176,126 175,120 174,114
    C174,108 173,102 173,97
    C173,94 174,92 176,90
    C179,88 182,84 183,79
    C184,74 183,69 180,65
    C177,61 172,58 167,56
    C164,54 160,53 157,53
    Z`,

  lArm: `
    M122,65
    C119,67 115,71 113,77
    C111,83 111,90 113,98
    C114,104 116,110 117,116
    C118,122 118,128 117,134
    C116,140 114,148 113,156
    C112,162 112,169 113,176
    C114,181 117,184 121,183
    C124,183 127,180 128,175
    C129,170 129,163 129,157
    C129,151 128,144 127,138
    C126,132 125,126 125,120
    C125,114 126,108 127,102
    C128,96 129,90 129,84
    C129,78 128,72 126,68
    C125,66 123,65 122,65 Z`,

  rArm: `
    M178,65
    C181,67 185,71 187,77
    C189,83 189,90 187,98
    C186,104 184,110 183,116
    C182,122 182,128 183,134
    C184,140 186,148 187,156
    C188,162 188,169 187,176
    C186,181 183,184 179,183
    C176,183 173,180 172,175
    C171,170 171,163 171,157
    C171,151 172,144 173,138
    C174,132 175,126 175,120
    C175,114 174,108 173,102
    C172,96 171,90 171,84
    C171,78 172,72 174,68
    C175,66 177,65 178,65 Z`,

  lForearm: `
    M113,156
    C112,162 112,169 113,176
    C114,181 117,184 121,183
    C123,183 126,180 127,174
    C128,168 128,160 127,153
    C125,147 122,145 119,147
    C116,149 114,152 113,156 Z`,

  rForearm: `
    M187,156
    C188,162 188,169 187,176
    C186,181 183,184 179,183
    C177,183 174,180 173,174
    C172,168 172,160 173,153
    C175,147 178,145 181,147
    C184,149 186,152 187,156 Z`,
};

/* ────────────────────────────────────────────────────────────────
   MUSCLE OVERLAY PATHS
   Each entry has:
     k  — array of MuscleKey (determines fill/glow)
     d  — array of SVG path strings (one entry may have multiple shapes)
   ──────────────────────────────────────────────────────────────── */
type MEntry = { d: string[]; k: MuscleKey[] };

/* ─── FRONT MUSCLES ─────────────────────────────────────────── */
const FRONT_MUSCLES: MEntry[] = [

  /* ── Anterior deltoids ─────────────────────────────────────
     Rounded cap sitting at the shoulder junction.
     Left deltoid: outer edge ~x=12, inner meets torso ~x=24
     Right deltoid: mirror */
  {
    k: ["left-shoulder"],
    d: [`
      M22,64
      C18,66 14,70 12,76
      C10,82 11,89 14,94
      C16,98 20,100 24,98
      C27,96 29,91 29,84
      C29,77 27,69 24,65
      C23,64 22,64 22,64 Z`],
  },
  {
    k: ["right-shoulder"],
    d: [`
      M78,64
      C82,66 86,70 88,76
      C90,82 89,89 86,94
      C84,98 80,100 76,98
      C73,96 71,91 71,84
      C71,77 73,69 76,65
      C77,64 78,64 78,64 Z`],
  },

  /* ── Pectoralis major ──────────────────────────────────────
     Two halves meeting at the sternal midline (x=50).
     Upper insertion follows clavicle curve, lower follows ribs. */
  {
    k: ["chest"],
    d: [
      /* Left pec */
      `
      M50,59
      C47,59 43,59 40,61
      C36,63 32,67 29,73
      C26,79 26,86 28,91
      C30,96 34,100 39,102
      C43,103 47,102 49,100
      C50,99 50,99 50,97
      L50,59 Z`,
      /* Right pec */
      `
      M50,59
      C53,59 57,59 60,61
      C64,63 68,67 71,73
      C74,79 74,86 72,91
      C70,96 66,100 61,102
      C57,103 53,102 51,100
      C50,99 50,99 50,97
      L50,59 Z`,
      /* Pec separation line — thin subtle stroke path */
      `
      M50,60 C50,72 50,84 50,97`,
    ],
  },

  /* ── Biceps brachii ────────────────────────────────────────
     Occupies the anterior arm from mid-deltoid to elbow.
     Peak at y≈110, tapers both ways. */
  {
    k: ["left-bicep"],
    d: [`
      M14,94
      C13,100 12,108 13,116
      C14,122 16,128 18,132
      C20,136 23,138 26,136
      C28,134 29,130 29,124
      C29,118 28,112 27,106
      C26,100 25,95 23,93
      C20,91 16,91 14,94 Z`],
  },
  {
    k: ["right-bicep"],
    d: [`
      M86,94
      C87,100 88,108 87,116
      C86,122 84,128 82,132
      C80,136 77,138 74,136
      C72,134 71,130 71,124
      C71,118 72,112 73,106
      C74,100 75,95 77,93
      C80,91 84,91 86,94 Z`],
  },

  /* ── Rectus abdominis + obliques ───────────────────────────
     6 rectangular-ish segments (3 left, 3 right of midline)
     with oblique wings on the sides. */
  {
    k: ["abs"],
    d: [
      /* ─ Left column, top segment */
      `M50,105
       C48,105 44,105 41,107
       C39,108 37,110 37,114
       C37,118 39,121 41,122
       C44,123 47,123 50,122
       Z`,
      /* ─ Left column, middle segment */
      `M50,125
       C48,125 44,125 41,127
       C39,128 37,130 37,134
       C37,138 39,141 41,142
       C44,143 47,143 50,142
       Z`,
      /* ─ Left column, lower segment */
      `M50,145
       C48,145 44,145 41,147
       C39,148 37,150 37,154
       C37,158 39,160 42,161
       C45,162 48,162 50,161
       Z`,

      /* ─ Right column, top segment */
      `M50,105
       C52,105 56,105 59,107
       C61,108 63,110 63,114
       C63,118 61,121 59,122
       C56,123 53,123 50,122
       Z`,
      /* ─ Right column, middle segment */
      `M50,125
       C52,125 56,125 59,127
       C61,128 63,130 63,134
       C63,138 61,141 59,142
       C56,143 53,143 50,142
       Z`,
      /* ─ Right column, lower segment */
      `M50,145
       C52,145 56,145 59,147
       C61,148 63,150 63,154
       C63,158 61,160 58,161
       C55,162 52,162 50,161
       Z`,

      /* ─ Left oblique */
      `M37,108
       C33,114 30,122 29,130
       C28,137 29,144 31,148
       C33,151 36,152 38,150
       C40,148 41,144 41,138
       C41,132 40,125 39,118
       C38,113 37,108 37,108 Z`,
      /* ─ Right oblique */
      `M63,108
       C67,114 70,122 71,130
       C72,137 71,144 69,148
       C67,151 64,152 62,150
       C60,148 59,144 59,138
       C59,132 60,125 61,118
       C62,113 63,108 63,108 Z`,
    ],
  },

  /* ── Quadriceps ────────────────────────────────────────────
     4-head mass from hip to knee.  Left quad: inner edge ~x=32,
     outer edge ~x=22, spans y≈165 to y≈238. */
  {
    k: ["left-quad"],
    d: [`
      M27,165
      C24,170 21,178 19,188
      C17,197 17,208 19,218
      C21,225 24,230 28,232
      C31,233 35,232 37,229
      C39,226 40,220 40,212
      C40,203 39,193 38,183
      C37,174 35,165 32,162
      C30,160 28,162 27,165 Z`],
  },
  {
    k: ["right-quad"],
    d: [`
      M73,165
      C76,170 79,178 81,188
      C83,197 83,208 81,218
      C79,225 76,230 72,232
      C69,233 65,232 63,229
      C61,226 60,220 60,212
      C60,203 61,193 62,183
      C63,174 65,165 68,162
      C70,160 72,162 73,165 Z`],
  },

  /* ── Calves — medial + lateral gastrocnemius heads ─────────
     Two teardrops side by side per leg, y≈240 to y≈278 */
  {
    k: ["left-calf"],
    d: [
      /* Medial (inner) head */
      `M31,240
       C29,245 27,252 28,260
       C29,266 31,271 34,272
       C37,272 39,269 39,263
       C39,256 38,248 36,243
       C34,239 32,238 31,240 Z`,
      /* Lateral (outer) head */
      `M23,240
       C21,245 19,252 20,260
       C21,266 23,271 26,272
       C29,272 31,269 31,263
       C31,256 30,248 28,243
       C26,239 24,238 23,240 Z`,
    ],
  },
  {
    k: ["right-calf"],
    d: [
      /* Medial (inner) head */
      `M69,240
       C71,245 73,252 72,260
       C71,266 69,271 66,272
       C63,272 61,269 61,263
       C61,256 62,248 64,243
       C66,239 68,238 69,240 Z`,
      /* Lateral (outer) head */
      `M77,240
       C79,245 81,252 80,260
       C79,266 77,271 74,272
       C71,272 69,269 69,263
       C69,256 70,248 72,243
       C74,239 76,238 77,240 Z`,
    ],
  },
];

/* ─── BACK MUSCLES  (all x = front equivalent + 100) ────────── */
const BACK_MUSCLES: MEntry[] = [

  /* ── Trapezius ─────────────────────────────────────────────
     Diamond from base of skull / C7 (y≈49) spreading to acromia,
     narrowing to mid-thoracic (y≈100). */
  {
    k: ["traps"],
    d: [`
      M150,49
      C148,50 144,52 140,55
      C135,58 129,62 124,67
      C121,71 120,76 122,80
      C124,84 128,86 133,84
      C138,82 143,78 148,76
      C149,75 150,74 150,74
      C151,75 152,75 152,76
      C157,78 162,82 167,84
      C172,86 176,84 178,80
      C180,76 179,71 176,67
      C171,62 165,58 160,55
      C156,52 152,50 150,49 Z`],
  },

  /* ── Posterior deltoids ────────────────────────────────────*/
  {
    k: ["left-shoulder"],
    d: [`
      M122,64
      C118,66 114,70 112,76
      C110,82 111,89 114,94
      C116,98 120,100 124,98
      C127,96 129,91 129,84
      C129,77 127,69 124,65
      C123,64 122,64 122,64 Z`],
  },
  {
    k: ["right-shoulder"],
    d: [`
      M178,64
      C182,66 186,70 188,76
      C190,82 189,89 186,94
      C184,98 180,100 176,98
      C173,96 171,91 171,84
      C171,77 173,69 176,65
      C177,64 178,64 178,64 Z`],
  },

  /* ── Triceps brachii ───────────────────────────────────────
     Long head runs along posterior arm from rear deltoid to elbow. */
  {
    k: ["left-tricep"],
    d: [`
      M114,94
      C113,100 112,108 113,116
      C114,122 116,128 118,132
      C120,136 123,138 126,136
      C128,134 129,130 129,124
      C129,118 128,112 127,106
      C126,100 125,95 123,93
      C120,91 116,91 114,94 Z`],
  },
  {
    k: ["right-tricep"],
    d: [`
      M186,94
      C187,100 188,108 187,116
      C186,122 184,128 182,132
      C180,136 177,138 174,136
      C172,134 171,130 171,124
      C171,118 172,112 173,106
      C174,100 175,95 177,93
      C180,91 184,91 186,94 Z`],
  },

  /* ── Rhomboids ─────────────────────────────────────────────
     Sits between scapulae, diamond shape in upper mid-back */
  {
    k: ["rhomboids"],
    d: [`
      M150,60
      C147,61 143,64 140,68
      C137,72 136,77 138,82
      C140,86 144,89 148,90
      C149,90 150,90 150,90
      C151,90 152,90 152,90
      C156,89 160,86 162,82
      C164,77 163,72 160,68
      C157,64 153,61 150,60 Z`],
  },

  /* ── Latissimus dorsi ──────────────────────────────────────
     Fan from armpit / lower scapula to iliac crest.
     Left lat: spans from ~x=122 outer to x=150 inner */
  {
    k: ["left-lat"],
    d: [`
      M130,82
      C126,88 122,96 121,106
      C120,116 120,128 121,138
      C122,146 124,152 128,156
      C131,159 135,160 139,158
      C143,156 146,151 148,144
      C149,138 149,131 148,124
      L148,100
      C146,92 140,84 134,81
      C132,80 131,80 130,82 Z`],
  },
  {
    k: ["right-lat"],
    d: [`
      M170,82
      C174,88 178,96 179,106
      C180,116 180,128 179,138
      C178,146 176,152 172,156
      C169,159 165,160 161,158
      C157,156 154,151 152,144
      C151,138 151,131 152,124
      L152,100
      C154,92 160,84 166,81
      C168,80 169,80 170,82 Z`],
  },

  /* ── Erector spinae / lower back ──────────────────────────
     Two vertical columns flanking the spine, y≈130 to y≈175 */
  {
    k: ["lower-back"],
    d: [
      /* Left column */
      `M146,130
       C144,136 143,143 143,150
       C143,157 144,164 146,169
       C147,173 149,175 150,174
       L150,128
       C149,128 147,129 146,130 Z`,
      /* Right column */
      `M154,130
       C156,136 157,143 157,150
       C157,157 156,164 154,169
       C153,173 151,175 150,174
       L150,128
       C151,128 153,129 154,130 Z`,
    ],
  },

  /* ── Gluteus maximus ───────────────────────────────────────
     Large rounded mass, left glute: y≈158 to y≈215 */
  {
    k: ["left-glute"],
    d: [`
      M122,162
      C119,168 117,177 117,187
      C117,197 119,206 123,212
      C126,217 130,220 135,219
      C140,218 144,214 146,208
      C148,202 148,194 148,186
      L148,170
      C146,163 141,158 136,157
      C130,156 125,158 122,162 Z`],
  },
  {
    k: ["right-glute"],
    d: [`
      M178,162
      C181,168 183,177 183,187
      C183,197 181,206 177,212
      C174,217 170,220 165,219
      C160,218 156,214 154,208
      C152,202 152,194 152,186
      L152,170
      C154,163 159,158 164,157
      C170,156 175,158 178,162 Z`],
  },

  /* ── Biceps femoris / hamstrings ───────────────────────────
     Posterior thigh, y≈215 to y≈270 */
  {
    k: ["left-hamstring"],
    d: [`
      M122,218
      C119,224 118,232 118,240
      C118,249 120,257 123,263
      C126,267 130,268 134,266
      C138,263 140,257 140,249
      C140,241 139,232 137,224
      C135,217 131,213 127,214
      C124,215 123,216 122,218 Z`],
  },
  {
    k: ["right-hamstring"],
    d: [`
      M178,218
      C181,224 182,232 182,240
      C182,249 180,257 177,263
      C174,267 170,268 166,266
      C162,263 160,257 160,249
      C160,241 161,232 163,224
      C165,217 169,213 173,214
      C176,215 177,216 178,218 Z`],
  },

  /* ── Gastrocnemius (posterior view) ───────────────────────
     Two prominent teardrops, medial larger than lateral */
  {
    k: ["left-calf"],
    d: [
      /* Medial head */
      `M131,260
       C129,265 128,271 129,277
       C130,281 133,284 136,283
       C139,282 140,279 140,274
       C140,268 138,261 136,257
       C134,254 132,256 131,260 Z`,
      /* Lateral head */
      `M122,258
       C120,263 119,270 120,276
       C121,280 124,283 127,282
       C130,281 131,278 131,272
       C131,266 130,259 128,255
       C126,252 123,254 122,258 Z`,
    ],
  },
  {
    k: ["right-calf"],
    d: [
      /* Medial head */
      `M169,260
       C171,265 172,271 171,277
       C170,281 167,284 164,283
       C161,282 160,279 160,274
       C160,268 162,261 164,257
       C166,254 168,256 169,260 Z`,
      /* Lateral head */
      `M178,258
       C180,263 181,270 180,276
       C179,280 176,283 173,282
       C170,281 169,278 169,272
       C169,266 170,259 172,255
       C174,252 177,254 178,258 Z`,
    ],
  },
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
  const fillBase     = "rgba(210,222,232,0.40)";
  const fillNeutral  = "rgba(200,214,224,0.82)";
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
          <stop offset="0%"   stopColor={accent} stopOpacity="0.52" />
          <stop offset="100%" stopColor={accent} stopOpacity="0.88" />
        </linearGradient>

        {/* Inactive muscle — soft blue-gray gradient */}
        <linearGradient id={`ig-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="rgb(200,214,228)" stopOpacity="0.50" />
          <stop offset="100%" stopColor="rgb(178,196,212)" stopOpacity="0.68" />
        </linearGradient>

        {/* Glow / bloom on active muscles */}
        <filter id={`gw-${uid}`} x="-35%" y="-35%" width="170%" height="170%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* ════════════════ FRONT VIEW ════════════════ */}

      {/* Base silhouette (lowest layer) */}
      <path d={FB.torso}    fill={fillBase} />
      <path d={FB.lArm}     fill={fillBase} />
      <path d={FB.rArm}     fill={fillBase} />

      {/* Neutral (no muscle group) parts */}
      <path d={FB.head}     fill={fillNeutral} />
      <path d={FB.neck}     fill={fillNeutral} />
      <path d={FB.lForearm} fill={fillNeutral} />
      <path d={FB.rForearm} fill={fillNeutral} />

      {/* Muscle overlays */}
      {FRONT_MUSCLES.map((e, i) =>
        e.d.map((d, j) => (
          <path
            key={`f${i}-${j}`}
            d={d}
            fill={
              /* The pec separation line is a stroke, not a fill */
              i === 1 && j === 2
                ? "none"
                : isOn(e.k) ? fillActive : fillInactive
            }
            stroke={
              i === 1 && j === 2
                ? isOn(e.k)
                  ? accent + "99"
                  : "rgba(170,186,200,0.50)"
                : "none"
            }
            strokeWidth={i === 1 && j === 2 ? 0.7 : 0}
            style={mStyle(e.k)}
          />
        ))
      )}

      {/* Female chest modifier */}
      {gender === "femme" && (
        <>
          <ellipse
            cx="40" cy="84" rx="9" ry="7.5"
            fill={isOn(["chest"]) ? fillActive : fillInactive}
            style={mStyle(["chest"])}
            opacity={0.75}
          />
          <ellipse
            cx="60" cy="84" rx="9" ry="7.5"
            fill={isOn(["chest"]) ? fillActive : fillInactive}
            style={mStyle(["chest"])}
            opacity={0.75}
          />
        </>
      )}

      {/* AVANT label */}
      <text
        x="50" y="289"
        textAnchor="middle"
        style={{
          fontSize: 6,
          fill: "rgba(138,156,172,0.80)",
          fontFamily: "system-ui,sans-serif",
          letterSpacing: "0.14em",
          fontWeight: 700,
        }}
      >
        AVANT
      </text>

      {/* Dashed separator */}
      <line
        x1="100" y1="6" x2="100" y2="284"
        stroke="rgba(174,192,208,0.25)"
        strokeWidth="0.8"
        strokeDasharray="4,5"
      />

      {/* ════════════════ BACK VIEW ════════════════ */}

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

      {/* Female wider glute modifier */}
      {gender === "femme" && (
        <>
          <ellipse
            cx="136" cy="185" rx="14" ry="11"
            fill={isOn(["left-glute"]) ? fillActive : fillInactive}
            style={mStyle(["left-glute"])}
            opacity={0.45}
          />
          <ellipse
            cx="164" cy="185" rx="14" ry="11"
            fill={isOn(["right-glute"]) ? fillActive : fillInactive}
            style={mStyle(["right-glute"])}
            opacity={0.45}
          />
        </>
      )}

      {/* ARRIÈRE label */}
      <text
        x="150" y="289"
        textAnchor="middle"
        style={{
          fontSize: 6,
          fill: "rgba(138,156,172,0.80)",
          fontFamily: "system-ui,sans-serif",
          letterSpacing: "0.14em",
          fontWeight: 700,
        }}
      >
        ARRIÈRE
      </text>
    </svg>
  );
}
