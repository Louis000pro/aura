/* ════════════════════════════════════════════════════════════════════
   Personnages-guides des exercices — le petit bonhomme mi-3D / cartoon qui
   rejoue le geste dans le « tunnel » de séance (voir ExerciseGuide.tsx,
   affiché par WorkoutGuideModal pendant l'effort).

   PIPELINE DE PROD (ChatGPT → app)
   1. Génère 1 image par exo contenant 2-3 poses du MÊME personnage côte à
      côte (départ → milieu → fin du mouvement). Même génération = même
      perso garanti. Fond transparent.
   2. Découpe l'image en frames PNG transparentes de même cadrage/échelle.
   3. Dépose-les dans  public/entrainement/guides/  nommées
      <key>-1.png, <key>-2.png, … <key>-<frames>.png  (numérotées de 1).
   4. Ajoute une règle ci-dessous. L'app les enchaîne en fondu = le geste.

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
  // { re: /jump.?squat|squat.*saut/i, guide: { key: "jumpsquat", frames: 3 } },
  { re: /squat/i,                       guide: { key: "squat",     frames: 3 } },
  // { re: /pompe|push.?up/i,           guide: { key: "pompes",    frames: 3 } },
  // { re: /fente|lunge/i,              guide: { key: "fentes",    frames: 3 } },
  // { re: /traction|pull.?up|tirage/i, guide: { key: "traction",  frames: 3 } },
  // { re: /militaire|overhead|développé.*(épaul|militaire)/i, guide: { key: "militaire", frames: 3 } },
  // { re: /rowing/i,                   guide: { key: "rowing",    frames: 2 } },
  // { re: /hip.?thrust/i,              guide: { key: "hipthrust", frames: 2 } },
  // { re: /burpee/i,                   guide: { key: "burpee",    frames: 3 } },
  // { re: /mountain.?climber|climber/i, guide: { key: "climbers", frames: 2 } },
  // { re: /planche|plank|gainage/i,    guide: { key: "planche",   frames: 1 } },
];

/** Retourne le sprite du personnage-guide pour un exo, ou null (→ halo épuré). */
export function resolveGuide(name: string): Guide | null {
  const hay = name.toLowerCase();
  for (const r of GUIDE_RULES) if (r.re.test(hay)) return r.guide;
  return null;
}
