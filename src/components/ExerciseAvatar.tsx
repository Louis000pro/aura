"use client";

import { motion } from "framer-motion";

/* ─── Skeleton pose : coordonnées de chaque articulation ─────────────── */
type Pose = {
  hx: number; hy: number        // tête (centre)
  nx: number; ny: number        // jonction cou / épaules
  lsx: number; lsy: number      // épaule gauche
  rsx: number; rsy: number      // épaule droite
  lex: number; ley: number      // coude gauche
  rex: number; rey: number      // coude droit
  lhx: number; lhy: number      // main gauche
  rhx: number; rhy: number      // main droite
  bx:  number; by:  number      // centre bassin
  lhipx: number; lhipy: number  // hanche gauche
  rhipx: number; rhipy: number  // hanche droite
  lkx: number; lky: number      // genou gauche
  rkx: number; rky: number      // genou droit
  lfx: number; lfy: number      // pied gauche
  rfx: number; rfy: number      // pied droit
}

export type ExType =
  | "squat" | "curl" | "press" | "pullup" | "pushup"
  | "plank" | "deadlift" | "lunge" | "row" | "run" | "crunch" | "default"

/* ─── Pose debout de référence ───────────────────────────────────────── */
const BASE: Pose = {
  hx:50, hy:11,
  nx:50, ny:29,
  lsx:34, lsy:32,  rsx:66, rsy:32,
  lex:29, ley:51,  rex:71, rey:51,
  lhx:31, lhy:68,  rhx:69, rhy:68,
  bx:50,  by:73,
  lhipx:40, lhipy:73,  rhipx:60, rhipy:73,
  lkx:37, lky:97,  rkx:63, rky:97,
  lfx:33, lfy:124, rfx:67, rfy:124,
}

/* ─── Paires de poses par exercice (A ↔ B en boucle) ────────────────── */
const POSES: Record<ExType, [Pose, Pose]> = {

  default: [
    BASE,
    { ...BASE, lex:26,ley:49, rex:74,rey:49, lhx:28,lhy:65, rhx:72,rhy:65 },
  ],

  squat: [
    // A – debout, bras tendus devant
    { ...BASE, lex:28,ley:32, rex:72,rey:32, lhx:17,lhy:32, rhx:83,rhy:32 },
    // B – bas du squat
    {
      hx:50, hy:36,  nx:50, ny:52,
      lsx:34, lsy:56, rsx:66, rsy:56,
      lex:28, ley:56, rex:72, rey:56,
      lhx:17, lhy:56, rhx:83, rhy:56,
      bx:50,  by:89,
      lhipx:37, lhipy:89, rhipx:63, rhipy:89,
      lkx:20, lky:110, rkx:80, rky:110,
      lfx:18, lfy:128, rfx:82, rfy:128,
    },
  ],

  curl: [
    BASE,
    { ...BASE, lex:32,ley:51, rex:68,rey:51, lhx:35,lhy:32, rhx:65,rhy:32 },
  ],

  press: [
    // A – barre à hauteur épaules
    { ...BASE, lex:27,ley:34, rex:73,rey:34, lhx:27,lhy:22, rhx:73,rhy:22 },
    // B – bras tendus au-dessus
    { ...BASE, lex:37,ley:18, rex:63,rey:18, lhx:40,lhy:6,  rhx:60,rhy:6  },
  ],

  pullup: [
    // A – suspendu, bras tendus
    {
      hx:50, hy:44,  nx:50, ny:54,
      lsx:34, lsy:57, rsx:66, rsy:57,
      lex:28, ley:38, rex:72, rey:38,
      lhx:28, lhy:22, rhx:72, rhy:22,
      bx:50,  by:93,
      lhipx:40, lhipy:93, rhipx:60, rhipy:93,
      lkx:43, lky:112, rkx:57, rky:112,
      lfx:41, lfy:128, rfx:59, rfy:128,
    },
    // B – tiré, menton au-dessus de la barre
    {
      hx:50, hy:22,  nx:50, ny:32,
      lsx:34, lsy:35, rsx:66, rsy:35,
      lex:26, ley:22, rex:74, rey:22,
      lhx:28, lhy:22, rhx:72, rhy:22,
      bx:50,  by:72,
      lhipx:40, lhipy:72, rhipx:60, rhipy:72,
      lkx:43, lky:90,  rkx:57, rky:90,
      lfx:41, lfy:106, rfx:59, rfy:106,
    },
  ],

  pushup: [
    // A – planche bras tendus
    {
      hx:50, hy:38,  nx:50, ny:52,
      lsx:32, lsy:56, rsx:68, rsy:56,
      lex:27, ley:72, rex:73, rey:72,
      lhx:27, lhy:84, rhx:73, rhy:84,
      bx:50,  by:70,
      lhipx:44, lhipy:73, rhipx:56, rhipy:73,
      lkx:44,  lky:95,  rkx:56,  rky:95,
      lfx:41,  lfy:118, rfx:59,  rfy:118,
    },
    // B – coudes fléchis (bas de la pompe)
    {
      hx:50, hy:46,  nx:50, ny:60,
      lsx:33, lsy:64, rsx:67, rsy:64,
      lex:33, ley:72, rex:67, rey:72,
      lhx:27, lhy:84, rhx:73, rhy:84,
      bx:50,  by:76,
      lhipx:44, lhipy:79, rhipx:56, rhipy:79,
      lkx:44,  lky:98,  rkx:56,  rky:98,
      lfx:41,  lfy:120, rfx:59,  rfy:120,
    },
  ],

  plank: [
    {
      hx:50, hy:38,  nx:50, ny:52,
      lsx:33, lsy:56, rsx:67, rsy:56,
      lex:33, ley:70, rex:67, rey:70,   // sur avant-bras
      lhx:30, lhy:78, rhx:70, rhy:78,
      bx:50,  by:70,
      lhipx:44, lhipy:73, rhipx:56, rhipy:73,
      lkx:44,  lky:95,  rkx:56,  rky:95,
      lfx:41,  lfy:118, rfx:59,  rfy:118,
    },
    {
      hx:50, hy:38,  nx:50, ny:52,
      lsx:33, lsy:56, rsx:67, rsy:56,
      lex:33, ley:70, rex:67, rey:70,
      lhx:30, lhy:78, rhx:70, rhy:78,
      bx:50,  by:68,  // bassin très légèrement monté
      lhipx:44, lhipy:71, rhipx:56, rhipy:71,
      lkx:44,  lky:93,  rkx:56,  rky:93,
      lfx:41,  lfy:116, rfx:59,  rfy:116,
    },
  ],

  deadlift: [
    // A – debout, barre tenue
    { ...BASE, lex:38,ley:51, rex:62,rey:51, lhx:40,lhy:68, rhx:60,rhy:68 },
    // B – penché, barre mi-tibia
    {
      hx:66, hy:28,  nx:60, ny:38,
      lsx:47, lsy:43, rsx:73, rsy:43,
      lex:46, ley:57, rex:72, rey:57,
      lhx:46, lhy:73, rhx:62, rhy:73,
      bx:44,  by:62,
      lhipx:35, lhipy:62, rhipx:53, rhipy:62,
      lkx:32,  lky:88,  rkx:54,  rky:88,
      lfx:28,  lfy:115, rfx:55,  rfy:115,
    },
  ],

  lunge: [
    BASE,
    // B – fente profonde, jambe gauche avant
    {
      hx:50, hy:18,  nx:50, ny:34,
      lsx:34, lsy:38, rsx:66, rsy:38,
      lex:29, ley:56, rex:71, rey:56,
      lhx:32, lhy:68, rhx:68, rhy:68,
      bx:50,  by:82,
      lhipx:40, lhipy:82, rhipx:60, rhipy:82,
      lkx:24,  lky:104, rkx:67,  rky:109,
      lfx:18,  lfy:122, rfx:74,  rfy:122,
    },
  ],

  row: [
    // A – penché, barre basse
    {
      hx:66, hy:28,  nx:60, ny:38,
      lsx:47, lsy:43, rsx:73, rsy:43,
      lex:44, ley:60, rex:70, rey:60,
      lhx:44, lhy:75, rhx:62, rhy:75,
      bx:44,  by:62,
      lhipx:35, lhipy:62, rhipx:53, rhipy:62,
      lkx:33,  lky:88,  rkx:54,  rky:88,
      lfx:28,  lfy:115, rfx:55,  rfy:115,
    },
    // B – barre tirée au ventre
    {
      hx:66, hy:28,  nx:60, ny:38,
      lsx:47, lsy:43, rsx:73, rsy:43,
      lex:40, ley:46, rex:66, rey:46,
      lhx:44, lhy:53, rhx:62, rhy:53,
      bx:44,  by:62,
      lhipx:35, lhipy:62, rhipx:53, rhipy:62,
      lkx:33,  lky:88,  rkx:54,  rky:88,
      lfx:28,  lfy:115, rfx:55,  rfy:115,
    },
  ],

  run: [
    // A – enjambée, jambe gauche devant
    {
      hx:50, hy:11,  nx:50, ny:29,
      lsx:34, lsy:32, rsx:66, rsy:32,
      lex:64, ley:44, rex:34, rey:42,
      lhx:68, lhy:58, rhx:28, rhy:54,
      bx:50,  by:73,
      lhipx:40, lhipy:73, rhipx:60, rhipy:73,
      lkx:28,  lky:91,  rkx:64,  rky:95,
      lfx:18,  lfy:110, rfx:72,  rfy:118,
    },
    // B – enjambée opposée
    {
      hx:50, hy:11,  nx:50, ny:29,
      lsx:34, lsy:32, rsx:66, rsy:32,
      lex:34, ley:42, rex:64, rey:44,
      lhx:28, lhy:54, rhx:68, rhy:58,
      bx:50,  by:73,
      lhipx:40, lhipy:73, rhipx:60, rhipy:73,
      lkx:64,  lky:91,  rkx:28,  rky:95,
      lfx:72,  lfy:110, rfx:18,  rfy:118,
    },
  ],

  crunch: [
    // Vue de côté, allongé
    {
      hx:80, hy:56,  nx:70, ny:59,
      lsx:58, lsy:55, rsx:58, rsy:63,
      lex:64, ley:50, rex:64, rey:68,
      lhx:72, lhy:48, rhx:72, rhy:70,
      bx:35,  by:60,
      lhipx:26, lhipy:57, rhipx:26, rhipy:63,
      lkx:18,  lky:50,  rkx:18,  rky:70,
      lfx:16,  lfy:46,  rfx:16,  rfy:74,
    },
    // Crunch monté
    {
      hx:74, hy:46,  nx:66, ny:52,
      lsx:56, lsy:50, rsx:56, rsy:58,
      lex:62, ley:48, rex:62, rey:64,
      lhx:70, lhy:45, rhx:70, rhy:65,
      bx:35,  by:60,
      lhipx:26, lhipy:57, rhipx:26, rhipy:63,
      lkx:18,  lky:50,  rkx:18,  rky:70,
      lfx:16,  lfy:46,  rfx:16,  rfy:74,
    },
  ],
}

/* ─── Mapping nom d'exercice → type ─────────────────────────────────── */
const EXERCISE_MAP: [RegExp, ExType][] = [
  [/squat|goblet|sumo/i,                                          "squat"   ],
  [/pompe|push.?up|développé couché|développé incliné|dips/i,    "pushup"  ],
  [/planche|plank/i,                                              "plank"   ],
  [/soulevé|deadlift|roumain|sumo dead/i,                        "deadlift"],
  [/traction|pull.?up|chin.?up/i,                                "pullup"  ],
  [/curl|biceps/i,                                               "curl"    ],
  [/développé militaire|overhead press|press militaire|élévation/i, "press"],
  [/rowing|tirage|row|dorsaux|buste penché/i,                    "row"     ],
  [/fente|lunge/i,                                               "lunge"   ],
  [/crunch|abdominaux|sit.?up|relevé de jambe|russian/i,         "crunch"  ],
  [/course|cardio|run|saut|jumping|burpee|sprint|mountain|skater|high knee/i, "run"],
]

export function resolveExType(name: string): ExType {
  for (const [re, type] of EXERCISE_MAP) {
    if (re.test(name)) return type
  }
  return "default"
}

/* ─── Labels d'exercice ──────────────────────────────────────────────── */
const EX_LABELS: Record<ExType, string> = {
  squat:    "Squat",
  curl:     "Curl biceps",
  press:    "Développé militaire",
  pullup:   "Traction",
  pushup:   "Pompe",
  plank:    "Planche",
  deadlift: "Soulevé de terre",
  lunge:    "Fente",
  row:      "Rowing",
  run:      "Cardio",
  crunch:   "Crunch",
  default:  "Exercice",
}

/* ─── Composant figure animée ────────────────────────────────────────── */
function AnimatedFigure({
  poseA, poseB, accent, duration,
}: {
  poseA: Pose; poseB: Pose; accent: string; duration: number
}) {
  const kf  = (a: number, b: number) => [a, b, a]
  const tr  = { duration, repeat: Infinity, ease: "easeInOut" as const }
  const S   = { stroke: accent, strokeWidth: 4.5, strokeLinecap: "round" as const, fill: "none" }
  const S3  = { ...S, strokeWidth: 3 }

  // Helpers pour animer une ligne entre deux poses
  const L = (
    x1a: number, y1a: number, x2a: number, y2a: number,
    x1b: number, y1b: number, x2b: number, y2b: number,
    thin = false,
  ) => (
    <motion.line
      {...(thin ? S3 : S)}
      x1={x1a} y1={y1a} x2={x2a} y2={y2a}
      animate={{ x1: kf(x1a,x1b), y1: kf(y1a,y1b), x2: kf(x2a,x2b), y2: kf(y2a,y2b) }}
      transition={tr}
    />
  )

  return (
    <g>
      {/* Tête */}
      <motion.circle
        r={9} fill="none" stroke={accent} strokeWidth={3.5}
        animate={{ cx: kf(poseA.hx, poseB.hx), cy: kf(poseA.hy, poseB.hy) }}
        transition={tr}
      />
      {/* Cou */}
      {L(poseA.hx, poseA.hy+9, poseA.nx, poseA.ny,
         poseB.hx, poseB.hy+9, poseB.nx, poseB.ny, true)}
      {/* Clavicule gauche */}
      {L(poseA.nx, poseA.ny, poseA.lsx, poseA.lsy,
         poseB.nx, poseB.ny, poseB.lsx, poseB.lsy)}
      {/* Clavicule droite */}
      {L(poseA.nx, poseA.ny, poseA.rsx, poseA.rsy,
         poseB.nx, poseB.ny, poseB.rsx, poseB.rsy)}
      {/* Bras sup gauche */}
      {L(poseA.lsx, poseA.lsy, poseA.lex, poseA.ley,
         poseB.lsx, poseB.lsy, poseB.lex, poseB.ley)}
      {/* Avant-bras gauche */}
      {L(poseA.lex, poseA.ley, poseA.lhx, poseA.lhy,
         poseB.lex, poseB.ley, poseB.lhx, poseB.lhy)}
      {/* Bras sup droit */}
      {L(poseA.rsx, poseA.rsy, poseA.rex, poseA.rey,
         poseB.rsx, poseB.rsy, poseB.rex, poseB.rey)}
      {/* Avant-bras droit */}
      {L(poseA.rex, poseA.rey, poseA.rhx, poseA.rhy,
         poseB.rex, poseB.rey, poseB.rhx, poseB.rhy)}
      {/* Tronc */}
      {L(poseA.nx, poseA.ny, poseA.bx, poseA.by,
         poseB.nx, poseB.ny, poseB.bx, poseB.by)}
      {/* Hanche gauche */}
      {L(poseA.bx, poseA.by, poseA.lhipx, poseA.lhipy,
         poseB.bx, poseB.by, poseB.lhipx, poseB.lhipy)}
      {/* Hanche droite */}
      {L(poseA.bx, poseA.by, poseA.rhipx, poseA.rhipy,
         poseB.bx, poseB.by, poseB.rhipx, poseB.rhipy)}
      {/* Cuisse gauche */}
      {L(poseA.lhipx, poseA.lhipy, poseA.lkx, poseA.lky,
         poseB.lhipx, poseB.lhipy, poseB.lkx, poseB.lky)}
      {/* Jambe gauche */}
      {L(poseA.lkx, poseA.lky, poseA.lfx, poseA.lfy,
         poseB.lkx, poseB.lky, poseB.lfx, poseB.lfy)}
      {/* Cuisse droite */}
      {L(poseA.rhipx, poseA.rhipy, poseA.rkx, poseA.rky,
         poseB.rhipx, poseB.rhipy, poseB.rkx, poseB.rky)}
      {/* Jambe droite */}
      {L(poseA.rkx, poseA.rky, poseA.rfx, poseA.rfy,
         poseB.rkx, poseB.rky, poseB.rfx, poseB.rfy)}
    </g>
  )
}

/* ─── Composant public ───────────────────────────────────────────────── */
export default function ExerciseAvatar({
  exerciseName,
  accent = "#A78BFA",
  size = 130,
}: {
  exerciseName: string
  accent?: string
  size?: number
}) {
  const type = resolveExType(exerciseName)
  const [poseA, poseB] = POSES[type]

  // Vitesse : cardio = rapide, statique = lent, reste = normal
  const duration =
    type === "run"   ? 0.7  :
    type === "plank" ? 3.5  :
    type === "crunch"? 1.2  : 1.8

  // Ratio hauteur SVG (viewBox 100x140)
  const height = Math.round(size * 1.4)

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="rounded-2xl flex items-center justify-center relative overflow-hidden"
        style={{
          width: size,
          height: height,
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        {/* Halo doux derrière la figure */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse 60% 55% at 50% 48%, ${accent}18 0%, transparent 70%)`,
          }}
        />
        <svg
          viewBox="0 0 100 140"
          width={size - 20}
          height={height - 20}
          overflow="visible"
        >
          <defs>
            <linearGradient id={`ag-${type}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%"   stopColor={accent} stopOpacity="1"   />
              <stop offset="100%" stopColor={accent} stopOpacity="0.6" />
            </linearGradient>
          </defs>
          <AnimatedFigure
            poseA={poseA}
            poseB={poseB}
            accent={accent}
            duration={duration}
          />
        </svg>
      </div>

      {/* Label type */}
      <p
        className="text-[9px] font-semibold tracking-widest uppercase"
        style={{ color: `${accent}80` }}
      >
        {EX_LABELS[type]}
      </p>
    </div>
  )
}
