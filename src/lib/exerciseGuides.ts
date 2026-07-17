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

   ⚠️ LES RÈGLES S'ÉCRIVENT SANS ACCENT (/developpe.*couche/i) : resolveGuide
   retire les accents du nom avant de tester. Une regex accentuée ne matche
   plus rien — et l'échec est silencieux (l'exo retombe sur le halo).

   ⚠️ L'ORDRE COMPTE : la 1re regex qui matche le nom de l'exo gagne. Mettre
   les cas spécifiques AVANT les génériques (ex. /jump.?squat/ avant /squat/).
   Un même sprite peut couvrir plusieurs variantes d'un exo (toutes les
   déclinaisons de squat → le même « squat »).
   ════════════════════════════════════════════════════════════════════ */

/** Le personnage d'une frame : femme ou homme. */
export type Genre = "f" | "h";

/** `genres` = les versions QUI EXISTENT en fichiers, pas celles qu'on veut.
    Aujourd'hui un seul genre par exo ; le jour où on offre le choix à
    l'utilisateur, on ajoute la 2e planche + son genre ici, et c'est tout. */
export type Guide = { key: string; frames: number; genres: Genre[] };

/** Le genre à afficher : celui demandé s'il existe, sinon le seul qu'on a.
    Tant que personne ne passe `want`, ça retourne l'unique version. */
export function pickGenre(guide: Guide, want?: Genre): Genre {
  return want && guide.genres.includes(want) ? want : guide.genres[0];
}

/** Le chemin d'une frame. Seul endroit qui connaît la forme du nom. */
export function frameSrc(guide: Guide, genre: Genre, i: number): string {
  return `/entrainement/guides/${guide.key}-${genre}-${i + 1}.png`;
}

export const GUIDE_RULES: { re: RegExp; guide: Guide }[] = [
  // ── Vague 2 (2026-07-17) — machines & variantes ────────────────────
  // EN TÊTE volontairement : ces cas sont plus précis que les génériques de
  // la Vague 1 et doivent gagner. « pompes diamant » avant /pompe/, « planche
  // latérale » + « gainage dynamique » avant /planche|gainage/, « hip thrust
  // machine » avant /hip thrust/. (Piège : /velo/ matcherait « déVELOppé »
  // sans accents → on ancre \bvelo\b.)
  { re: /abducteur/i,                     guide: { key: "abducteursmachine",       frames: 2, genres: ["f"] } },
  { re: /developpe.*epaul.*machine/i,     guide: { key: "developpeepaulesmachine", frames: 2, genres: ["h"] } },
  { re: /hip.?thrust.*machine/i,          guide: { key: "hipthrustmachine",        frames: 2, genres: ["h"] } },
  { re: /dips?.*machine/i,                guide: { key: "dipsmachine",             frames: 2, genres: ["h"] } },
  { re: /face.?pull/i,                    guide: { key: "facepullpoulie",          frames: 2, genres: ["h"] } },
  { re: /curl.*marteau|hammer.?curl/i,    guide: { key: "curlmarteau",             frames: 2, genres: ["h"] } },
  { re: /curl.*(barre|\bez\b)/i,          guide: { key: "curlbarreez",             frames: 2, genres: ["h"] } },
  { re: /tirage.*menton|upright.?row/i,   guide: { key: "tiragementonhalteres",    frames: 2, genres: ["h"] } },
  { re: /rowing.*invers|invers.*row/i,    guide: { key: "rowinginverse",           frames: 2, genres: ["f"] } },
  { re: /rowing.*halt|one.?arm.?row|dumbbell.?row/i, guide: { key: "rowingunilateralhaltere", frames: 2, genres: ["h"] } },
  { re: /pompe.*diamant|diamond.?push/i,  guide: { key: "pompesdiamant",           frames: 2, genres: ["f"] } },
  { re: /pompe.*inclin|incline.?push.?up/i, guide: { key: "pompesinclinees",       frames: 2, genres: ["f"] } },
  { re: /planche.*lateral|gainage.*lateral|side.?plank/i, guide: { key: "planchelaterale", frames: 1, genres: ["f"] } },
  { re: /gainage.*dynamiq/i,              guide: { key: "gainagedynamique",        frames: 3, genres: ["f"] } },
  { re: /rameur|rowing.?machine/i,        guide: { key: "rameur",                  frames: 3, genres: ["h"] } },
  { re: /tapis|treadmill|course.*pied/i,  guide: { key: "coursetapis",             frames: 3, genres: ["f"] } },
  { re: /\bvelo\b|spinning|\bbike\b/i,    guide: { key: "veloappartement",         frames: 2, genres: ["f"] } },
  // ── Vague 1 — décommenter chaque règle quand ses PNG sont en place ──
  { re: /jump.?squat|squat.*saut/i,     guide: { key: "squatsaute", frames: 3, genres: ["f"] } },
  { re: /pike.*(push|pompe)|pompe.*pike/i, guide: { key: "pikepushups", frames: 3, genres: ["f"] } },
  { re: /bulgare|split.?squat/i,        guide: { key: "squatbulgare", frames: 2, genres: ["f"] } },
  { re: /squat/i,                       guide: { key: "squat",     frames: 3, genres: ["f"] } },
  { re: /pompe|push.?up/i,              guide: { key: "pompes",    frames: 3, genres: ["f"] } },
  { re: /fente.*saut|saut.*fente|jump.?lunge/i, guide: { key: "fentessautees", frames: 3, genres: ["f"] } },
  { re: /fente(?!.*saut)|lunge/i,       guide: { key: "fentes",    frames: 4, genres: ["f"] } },
  { re: /traction|pull.?up|chin.?up/i,  guide: { key: "tractions", frames: 3, genres: ["h"] } },
  { re: /militaire.*halt|developpe.*(epaul|militaire).*halt|dumbbell.*overhead/i, guide: { key: "militaire", frames: 3, genres: ["h"] } },
  { re: /developpe.*couche(?!.*halt)|bench.?press/i, guide: { key: "developpecouche", frames: 3, genres: ["h"] } },
  { re: /developpe.*inclin.*halt|incline.*bench/i, guide: { key: "developpeinclinehalteres", frames: 2, genres: ["h"] } },
  { re: /pec.?deck/i,                    guide: { key: "pecdeck",   frames: 2, genres: ["h"] } },
  { re: /extension.*triceps.*halt/i,     guide: { key: "extensiontricepshaltere", frames: 2, genres: ["h"] } },
  { re: /extension.*triceps.*poulie/i,   guide: { key: "extensiontricepspoulie", frames: 2, genres: ["h"] } },
  { re: /oiseau.*halt/i,                 guide: { key: "oiseauhalteres", frames: 2, genres: ["h"] } },
  { re: /rowing.*assis.*poulie/i,        guide: { key: "rowingassispoulie", frames: 2, genres: ["h"] } },
  { re: /tirage.*poitrine/i,             guide: { key: "tiragepoitrine", frames: 2, genres: ["h"] } },
  { re: /rowing.*barre|barbell.?row/i,   guide: { key: "rowing",    frames: 3, genres: ["h"] } },
  { re: /bicep.?curl|curl.*halt|curl biceps?/i, guide: { key: "curl", frames: 3, genres: ["h"] } },
  { re: /elevation.*lateral|lateral.?raise/i, guide: { key: "elevationslaterales", frames: 3, genres: ["h"] } },
  { re: /souleve.*terre.*roumain|romanian.?deadlift|deadlift.*roumain/i, guide: { key: "souleveterre", frames: 3, genres: ["h"] } },
  { re: /mollet|calf.?raise/i,           guide: { key: "mollets",   frames: 3, genres: ["h"] } },
  { re: /presse.*cuisse|leg.?press/i,   guide: { key: "pressecuisses", frames: 2, genres: ["h"] } },
  { re: /leg.?extension/i,              guide: { key: "legextension", frames: 2, genres: ["h"] } },
  { re: /leg.?curl.*assis/i,            guide: { key: "legcurlassis", frames: 2, genres: ["h"] } },
  { re: /leg.?curl.*allong/i,           guide: { key: "legcurlallonge", frames: 2, genres: ["h"] } },
  { re: /hip.?thrust|pont.?fessier/i,   guide: { key: "hipthrust", frames: 3, genres: ["f"] } },
  { re: /burpee/i,                      guide: { key: "burpees",   frames: 5, genres: ["f"] } },
  { re: /mountain.?climber|climber/i,   guide: { key: "mountainclimbers", frames: 3, genres: ["f"] } },
  { re: /jumping.?jack/i,               guide: { key: "jumpingjacks", frames: 3, genres: ["f"] } },
  { re: /montee.*genou|high.?knee/i,    guide: { key: "monteesgenoux", frames: 2, genres: ["f"] } },
  { re: /corde.*saut|saut.*corde|jump.?rope/i, guide: { key: "corde", frames: 3, genres: ["f"] } },
  { re: /dips?.*(chaise|banc)/i,        guide: { key: "dips",      frames: 3, genres: ["f"] } },
  { re: /bird.?dog/i,                   guide: { key: "birddog",   frames: 3, genres: ["f"] } },
  /* Les exclusions ci-dessous valent tant que l'exo n'a pas SON sprite :
     « Gainage dorsal » et « Fentes sautées » sont d'autres mouvements, et
     leur servir le ventral / la fente classique serait montrer un geste
     faux pendant l'effort. Le halo est plus honnête. Quand leur planche
     existe, sa règle se met AU-DESSUS et l'exclusion devient un filet. */
  { re: /planche|plank|gainage(?!.*dorsal)/i, guide: { key: "planche", frames: 1, genres: ["f"] } },
  { re: /chaise.*mur|wall.?sit/i,       guide: { key: "chaisemur", frames: 1, genres: ["f"] } },
  { re: /crunch/i,                      guide: { key: "crunch",     frames: 3, genres: ["f"] } },
  { re: /superman/i,                    guide: { key: "superman",   frames: 3, genres: ["f"] } },
];

/** Retourne le sprite du personnage-guide pour un exo, ou null (→ halo épuré). */
export function resolveGuide(name: string): Guide | null {
  /* Les accents tombent AVANT le test : « Développé couché » devient
     « developpe couche ». Les règles s'écrivent donc sans accent, une
     seule fois — sinon chacune doit épeler ses deux orthographes, et
     c'est la variante accentuée qu'on oublie (elle ne rate jamais bruyam-
     ment : l'exo retombe juste sur le halo, sans erreur). */
  const hay = name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  for (const r of GUIDE_RULES) if (r.re.test(hay)) return r.guide;
  return null;
}
