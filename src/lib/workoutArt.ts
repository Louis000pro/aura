/* ════════════════════════════════════════════════════════════════════
   workoutArt — résolution de la PHOTO d'une séance (banque public/entrainement).

   Source UNIQUE : /progression ET le lanceur global (WorkoutLaunchContext)
   choisissent la même image pour une séance donnée. Ne pas re-dupliquer ces
   règles ailleurs — importer d'ici.

   Les photos sont NATURELLES (aucun filtre) : la cohérence vient du cadrage
   portrait + scrim + typo, pas d'une couleur plaquée. Les familles servent
   seulement à choisir la bonne image (et l'ambiance des widgets in-app).
   ════════════════════════════════════════════════════════════════════ */

import type { WorkoutCategory } from "@/lib/assistantActions";

export type Family = "push" | "pull" | "legs" | "core" | "full" | "cardio";

export const FAMILY: Record<Family, { label: string; base: string; glow: string; variants: string[] }> = {
  push:   { label: "Poussée",   base: "#E8481F", glow: "#FF7A4D", variants: ["push-couche-v5", "push-militaire", "push-dips", "push-pompes", "push-halteres", "push-ecarte"] },
  pull:   { label: "Tirage",    base: "#1E5FD0", glow: "#4C93FF", variants: ["pull-traction", "pull-rowing", "pull-curl", "pull-poulie", "pull-horizontal", "pull-marteau"] },
  legs:   { label: "Jambes",    base: "#0E9E56", glow: "#2FD98A", variants: ["legs-squat", "legs-fentes", "legs-souleve", "legs-goblet", "legs-presse", "legs-hipthrust"] },
  core:   { label: "Gainage",   base: "#0F8E86", glow: "#2BD4A0", variants: ["core-planche", "core-abdos", "core-lateral", "core-releve", "core-roue", "core-twist"] },
  full:   { label: "Full body", base: "#8B3FD6", glow: "#C46BFF", variants: ["full-burpee", "full-epaule", "full-kettlebell", "full-slam", "full-sandbag", "full-thruster"] },
  cardio: { label: "Cardio",    base: "#D81E63", glow: "#FF5A8D", variants: ["cardio-ropes", "cardio-sprint", "cardio-rameur", "cardio-saut", "cardio-bike", "cardio-stepper"] },
};

/** Le « cerveau » : muscle / mouvement nommé → image précise. Sinon repli famille. */
const IMG_RULES: { re: RegExp; img: string; fam: Family }[] = [
  // « Haut du corps » a sa photo : la traction de Nora et Sasha (Louis,
  // 2026-10-23). Sans Guide résolu, `haut-corps` est la photo d'avant.
  // Famille « full » comme avant : l'équilibre de la semaine ne bouge pas.
  // Une séance de récup (« relâché ») garde sa photo calme.
  { re: /haut du corps(?! rel)|upper body/,                                  img: "haut-corps",    fam: "full" },
  { re: /pector|\bpec|couch|bench/,                                          img: "push-couche-v5",   fam: "push" },
  { re: /dips?/,                                                             img: "push-dips",     fam: "push" },
  { re: /épaule|epaule|deltoï|deltoi|militaire|overhead|shoulder/,           img: "push-militaire",fam: "push" },
  { re: /\bpush\b|poussé|pousse/,                                            img: "push-couche-v5",   fam: "push" },
  { re: /traction|pull[- ]?up|tirage vertical|dorsaux|grand dorsal|\blats?\b/, img: "pull-traction", fam: "pull" },
  { re: /rowing|\brow\b|tirage horizontal|rhombo|trapèze|trapeze/,           img: "pull-rowing",   fam: "pull" },
  { re: /biceps|\bcurl/,                                                     img: "pull-curl",     fam: "pull" },
  { re: /\bpull\b|\bdos\b/,                                                  img: "pull-traction", fam: "pull" },
  { re: /squat|quadri|\bquad/,                                              img: "legs-squat",    fam: "legs" },
  { re: /fente|lunge/,                                                       img: "legs-fentes",   fam: "legs" },
  { re: /soulevé|souleve|deadlift|\bterre\b|ischio|fessier|hip thrust|hanche/, img: "legs-souleve",  fam: "legs" },
  { re: /bas du corps|\bjambe|\bleg\b|mollet/,                               img: "legs-squat",    fam: "legs" },
  { re: /planche|\bplank|gainage/,                                           img: "core-planche",  fam: "core" },
  { re: /abdo|crunch|sit[- ]?up|oblique|lombaire|\bcore\b|sangle/,           img: "core-abdos",    fam: "core" },
  { re: /burpee/,                                                            img: "full-burpee",   fam: "full" },
  { re: /kettlebell|\bswing|snatch|arraché|arrache/,                         img: "full-kettlebell",fam: "full" },
  { re: /haut du corps|corps entier|full[- ]?body|complet|thruster|clean|épaulé/, img: "full-epaule", fam: "full" },
  { re: /corde|\brope|battle/,                                              img: "cardio-ropes",  fam: "cardio" },
  { re: /rameur|rower|\berg\b|aviron/,                                       img: "cardio-rameur", fam: "cardio" },
  { re: /sprint|course|\brun\b|vélo|velo|\bbike|assault|cardio|endurance|hiit/, img: "cardio-sprint", fam: "cardio" },
];

/** Les séances du catalogue dont les règles tombent à côté (« Bras sans
 *  matériel » lisait « pectoraux » dans ses muscles et montrait un
 *  développé couché). Le titre décide alors, avant toute règle, même suivi
 *  du type de séance comme dans la semaine. Titres en minuscules, et une
 *  photo d'une des familles ci-dessus, sinon la famille est inconnue. */
export const PHOTO_PAR_TITRE: Record<string, string> = {
  "abdos sans tirer sur la nuque": "core-releve",
  "le tronc dans tous les sens": "core-twist",
  "esprit pilates": "core-lateral",
  "fessiers, l’essentiel": "legs-goblet",
  "le pont, quatre façons": "legs-hipthrust",
  "fessiers lourds": "legs-hipthrust",
  "fessiers aux haltères": "legs-goblet",
  "tabata fessiers": "legs-fentes",
  "pecs à la maison": "push-pompes",
  "pecs aux haltères": "push-halteres",
  "cent élévations": "push-halteres",
  "bras sans matériel": "push-dips",
  "bras lourds": "push-dips",
  /* Lot 3 : les routines et les séances douces tombaient sur un kettlebell. */
  "chambre d’hôtel": "legs-squat",
  "après un long trajet": "core-twist",
  "réveil en 5 minutes": "cardio-saut",
  "matin tonique": "push-pompes",
  "trois minutes pour le cœur": "cardio-sprint",
  "pause bureau": "cardio-stepper",
  "cinq minutes avant de dormir": "core-releve",
  "pas la forme aujourd’hui": "core-lateral",
  "respirer, cinq minutes": "core-twist",
  "le grand dimanche": "legs-fentes",
  "après une mauvaise journée": "cardio-ropes",
  "vider la tête": "full-slam",
  "le banc du parc": "push-dips",
  /* Lot 6 : « corps entier » et « haut du corps » visaient une barre. */
  "corps entier, deux haltères": "legs-goblet",
  "le complexe": "full-thruster",
  "haut du corps aux haltères": "push-halteres",
  "bas du corps aux haltères": "legs-souleve",
  /* Lot 4 : les récupérations n'ont pas de règle, et « hanches » visait
     un soulevé de terre. */
  "après ta sortie": "cardio-sprint",
  "pliométrie du coureur": "cardio-saut",
  "explosivité terrain": "full-burpee",
  "lendemain de match": "core-releve",
  "renfo du cycliste": "cardio-bike",
  "ouvrir les hanches après le vélo": "core-twist",
  "cuisses de skieur": "legs-squat",
  "après la journée de ski": "core-lateral",
};

/** La famille d'une photo de la banque. */
function familleDePhoto(img: string): Family | null {
  return (Object.keys(FAMILY) as Family[]).find((f) => FAMILY[f].variants.includes(img)) ?? null;
}

const CAT_FAMILY: Record<WorkoutCategory, Family> = {
  force: "push", fullbody: "full", cardio: "cardio", mobilite: "core",
};

function artHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export type Art = { img: string; base: string; glow: string; label: string; fam: Family };

/** Résout l'ambiance d'une séance depuis son titre / ses muscles / sa catégorie.
    Le TITRE prime : « Dos de Fer » reste Tirage même si les muscles listent
    les épaules — c'est le nom que l'utilisateur a choisi. */
export function resolveArt(input: { title?: string; category?: WorkoutCategory; muscles?: string[] }): Art {
  const titre = (input.title ?? "").toLowerCase();
  const exacte = Object.entries(PHOTO_PAR_TITRE).find(([t]) => titre === t || titre.startsWith(`${t} `));
  const famExacte = exacte ? familleDePhoto(exacte[1]) : null;
  if (exacte && famExacte) {
    const f = FAMILY[famExacte];
    return { img: exacte[1], base: f.base, glow: f.glow, label: f.label, fam: famExacte };
  }
  const hays = [titre, (input.muscles ?? []).join(" ").toLowerCase()];
  for (const hay of hays) {
    if (!hay) continue;
    for (const r of IMG_RULES) {
      if (r.re.test(hay)) {
        const f = FAMILY[r.fam];
        return { img: r.img, base: f.base, glow: f.glow, label: f.label, fam: r.fam };
      }
    }
  }
  const fam: Family = input.category ? CAT_FAMILY[input.category] : "full";
  const f = FAMILY[fam];
  const img = f.variants[artHash(input.title || fam) % f.variants.length];
  return { img, base: f.base, glow: f.glow, label: f.label, fam };
}

/** Chemin webp complet de la photo d'une séance (pour heroImage). */
export function heroImageForSeance(input: { title?: string; category?: WorkoutCategory; muscles?: string[] }): string {
  return `/entrainement/${resolveArt(input).img}.webp`;
}
