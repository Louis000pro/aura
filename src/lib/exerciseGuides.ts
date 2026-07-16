/* ════════════════════════════════════════════════════════════════════
   Personnages-guides des exercices — le petit bonhomme mi-3D / cartoon qui
   rejoue le geste dans le « tunnel » de séance (voir ExerciseGuide.tsx,
   affiché par WorkoutGuideModal pendant l'effort).

   PIPELINE DE PROD (ChatGPT → app) — 3 gestes, pas une heure de Python
   1. Génère 1 image par exo contenant 2-3 poses du MÊME personnage côte à
      côte (départ → milieu → fin du mouvement). Même génération = même
      perso garanti. Fond uni (vert de préf.) ou transparent, et les poses
      ne doivent pas se toucher — c'est le trou entre elles qui les sépare.
   2. Dépose la planche dans  guides-src/<clé>.png  (dossier gitignoré).
   3. `npm run guides` : détoure, découpe, met tout sur un canevas commun,
      écrit public/entrainement/guides/<clé>-<n>.png et te dicte la règle
      à coller ci-dessous. L'app enchaîne les frames en fondu = le geste.
      (voir scripts/build-guides.mjs pour les options --loop / --tol)

   Exo STATIQUE (planche, gainage) = 1 seule frame → { frames: 1 } (pas d'anim).
   Tant qu'un exo n'a AUCUNE règle ici, le tunnel affiche un halo épuré
   (jamais de photo hors-sujet — c'est le fallback validé).

   ⚠️ L'ORDRE COMPTE : la 1re regex qui matche le nom de l'exo gagne. Mettre
   les cas spécifiques AVANT les génériques (ex. /jump.?squat/ avant /squat/).
   Un même sprite peut couvrir plusieurs variantes d'un exo (toutes les
   déclinaisons de squat → le même « squat »).
   ════════════════════════════════════════════════════════════════════ */

export type Guide = { key: string; frames: number };

export const GUIDE_RULES: { re: RegExp; guide: Guide }[] = [
  // ── Vague 1 — décommenter chaque règle quand ses PNG sont en place ──
  { re: /jump.?squat|squat.*saut/i,     guide: { key: "squatsaute", frames: 3 } },
  { re: /pike.*(push|pompe)|pompe.*pike/i, guide: { key: "pikepushups", frames: 3 } },
  { re: /squat/i,                       guide: { key: "squat",     frames: 3 } },
  { re: /pompe|push.?up/i,              guide: { key: "pompes",    frames: 3 } },
  { re: /fente|lunge/i,                 guide: { key: "fentes",    frames: 3 } },
  { re: /traction|pull.?up|chin.?up/i,  guide: { key: "tractions", frames: 3 } },
  { re: /militaire.*halt|développé.*(épaul|militaire).*halt|dumbbell.*overhead/i, guide: { key: "militaire", frames: 3 } },
  { re: /développé.*couché(?!.*halt)|developpe.*couche(?!.*halt)|bench.?press/i, guide: { key: "developpecouche", frames: 3 } },
  { re: /rowing.*barre|barbell.?row/i,   guide: { key: "rowing",    frames: 3 } },
  { re: /bicep.?curl|curl.*halt|curl biceps?/i, guide: { key: "curl", frames: 3 } },
  { re: /élévation.*latéral|elevation.*lateral|lateral.?raise/i, guide: { key: "elevationslaterales", frames: 3 } },
  { re: /soulevé.*terre.*roumain|souleve.*terre.*roumain|romanian.?deadlift|deadlift.*roumain/i, guide: { key: "souleveterre", frames: 3 } },
  { re: /mollet|calf.?raise/i,           guide: { key: "mollets",   frames: 3 } },
  { re: /hip.?thrust|pont.?fessier/i,   guide: { key: "hipthrust", frames: 3 } },
  { re: /burpee/i,                      guide: { key: "burpees",   frames: 5 } },
  { re: /mountain.?climber|climber/i,   guide: { key: "mountainclimbers", frames: 3 } },
  { re: /jumping.?jack/i,               guide: { key: "jumpingjacks", frames: 3 } },
  { re: /corde.*saut|saut.*corde|jump.?rope/i, guide: { key: "corde", frames: 3 } },
  { re: /dips?.*(chaise|banc)/i,        guide: { key: "dips",      frames: 3 } },
  { re: /bird.?dog/i,                   guide: { key: "birddog",   frames: 3 } },
  { re: /planche|plank|gainage/i,       guide: { key: "planche",   frames: 1 } },
  { re: /crunch/i,                      guide: { key: "crunch",     frames: 3 } },
  { re: /superman/i,                    guide: { key: "superman",   frames: 3 } },
];

/** Retourne le sprite du personnage-guide pour un exo, ou null (→ halo épuré). */
export function resolveGuide(name: string): Guide | null {
  const hay = name.toLowerCase();
  for (const r of GUIDE_RULES) if (r.re.test(hay)) return r.guide;
  return null;
}
