/* ════════════════════════════════════════════════════════════════════
   CE QUE CHAQUE MOUVEMENT SOLLICITE (maquette « Entraînement repensé »,
   lot 2, « J'ai une gêne ou une douleur »)

   La personne touche l'endroit qui fait mal sur une silhouette, de face
   et de dos : 39 zones (muscles et articulations, avec leur côté). Les
   mouvements qui sollicitent cet endroit passent « à éviter », « plus
   léger » ou « sans changement ».

   ⚠️ LA TABLE SE LIT SANS LE CÔTÉ. « Épaule droite » et « Épaule
   gauche » sollicitent les mêmes mouvements : `baseZone` retire le côté,
   et la table ne connaît que les 24 endroits.

   ⚠️ UNE ZONE = LES MUSCLES QUI TRAVAILLENT ET LES ARTICULATIONS QUI
   PORTENT. Les pompes sollicitent les poignets et les mains (on s'appuie
   dessus), un squat les chevilles et les genoux. Dans le doute, on
   inclut : écarter un mouvement de trop coûte une séance plus courte,
   en garder un de trop peut faire mal.

   ⚠️ UN NOM INCONNU REND `null`, JAMAIS `[]`. « Je ne sais pas ce qu'il
   sollicite » n'est pas « il ne sollicite rien » : l'écran le dit et
   laisse la personne décider.

   Ce n'est pas un avis médical, et l'écran le rappelle.
   ════════════════════════════════════════════════════════════════════ */

import { EXERCISE_LIBRARY, trouverExercice } from "@/lib/exerciseLibrary";

/** Les 24 endroits, sans le côté. */
export const ENDROITS = [
  "Cou", "Épaule", "Pectoraux", "Côtes", "Abdominaux", "Biceps", "Triceps", "Avant-bras",
  "Coude", "Poignet", "Main", "Haut du dos", "Milieu du dos", "Bas du dos", "Hanche",
  "Fessiers", "Cuisse", "Arrière de la cuisse", "Intérieur des cuisses", "Genou", "Tibia",
  "Mollet", "Cheville", "Pied",
] as const;
export type Endroit = (typeof ENDROITS)[number];

/** Les endroits qui ont un côté. Les autres (cou, pectoraux, dos…) n'en ont pas. */
export const AVEC_COTE: ReadonlySet<Endroit> = new Set<Endroit>([
  "Épaule", "Biceps", "Triceps", "Avant-bras", "Coude", "Poignet", "Main", "Hanche",
  "Cuisse", "Arrière de la cuisse", "Genou", "Tibia", "Mollet", "Cheville", "Pied",
]);

/** Les 39 zones de la silhouette : les endroits, avec leur côté quand ils en ont un. */
export const ZONES_SILHOUETTE: string[] = ENDROITS.flatMap((e) =>
  AVEC_COTE.has(e) ? [`${e} ${feminin(e) ? "droite" : "droit"}`, `${e} gauche`] : [e]);

function feminin(e: Endroit): boolean {
  return ["Épaule", "Main", "Hanche", "Cuisse", "Arrière de la cuisse", "Cheville"].includes(e);
}

/** « Épaule droite » → « Épaule ». Une zone inconnue rend `null`. */
export function baseZone(zone: string): Endroit | null {
  const b = zone.replace(/ (droite?|gauche)$/, "");
  return (ENDROITS as readonly string[]).includes(b) ? (b as Endroit) : null;
}

/** Comment dire « mon épaule », « mes pectoraux » sur le bouton. */
export const LE_MIEN: Record<Endroit, string> = {
  "Cou": "mon cou", "Épaule": "mon épaule", "Pectoraux": "mes pectoraux", "Côtes": "mes côtes",
  "Abdominaux": "mes abdominaux", "Biceps": "mon biceps", "Triceps": "mon triceps", "Avant-bras": "mon avant-bras",
  "Coude": "mon coude", "Poignet": "mon poignet", "Main": "ma main", "Haut du dos": "le haut de mon dos",
  "Milieu du dos": "le milieu de mon dos", "Bas du dos": "le bas de mon dos", "Hanche": "ma hanche",
  "Fessiers": "mes fessiers", "Cuisse": "ma cuisse", "Arrière de la cuisse": "l’arrière de ma cuisse",
  "Intérieur des cuisses": "l’intérieur de mes cuisses", "Genou": "mon genou", "Tibia": "mon tibia",
  "Mollet": "mon mollet", "Cheville": "ma cheville", "Pied": "mon pied",
};

const C: Record<string, Endroit> = {
  co: "Cou", ep: "Épaule", pe: "Pectoraux", cs: "Côtes", ab: "Abdominaux", bi: "Biceps", tr: "Triceps",
  av: "Avant-bras", cd: "Coude", po: "Poignet", ma: "Main", hd: "Haut du dos", md: "Milieu du dos",
  bd: "Bas du dos", ha: "Hanche", fe: "Fessiers", cu: "Cuisse", is: "Arrière de la cuisse",
  ad: "Intérieur des cuisses", ge: "Genou", ti: "Tibia", mo: "Mollet", ch: "Cheville", pi: "Pied",
};

/** Les 102 mouvements de la bibliothèque, par leur nom canonique. */
const TABLE: Record<string, string> = {
  "Squat": "cu fe ge ha ch ad bd pi",
  "Pompes": "pe ep tr cd po ma ab",
  "Fentes": "cu fe ge ha ad ch pi",
  "Squats sautés": "cu fe ge ha ch pi mo ti",
  "Fentes sautées": "cu fe ge ha ad ch pi mo ti",
  "Pike push-ups": "ep tr cd po ma hd co",
  "Pompes diamant": "tr pe ep cd po ma",
  "Pompes inclinées": "pe ep tr cd po ma",
  "Dips sur chaise": "tr ep cd po ma pe",
  "Tractions": "md bi av ma ep cd po ab cs",
  "Rowing inversé": "md hd bi av ma cd po ab",
  "Burpees": "pe ep tr cd po ma cu fe ge ha ch pi ab mo",
  "Mountain climbers": "ab ep po ma cd ha cu pe",
  "Jumping jacks": "mo ch pi ge ti ep",
  "Montées de genoux": "cu ha ge ch pi mo ti ab",
  "Corde à sauter": "mo ch pi ti ge po av",
  "Chaise au mur": "cu ge fe",
  "Pompes explosives": "pe ep tr cd po ma ab",
  "Box jump": "cu fe ge ha ch pi mo ti",
  "Skaters": "fe cu ge ha ad ch pi",
  "Sprint sur place": "cu is ha ge ch pi mo ti",
  "Bear crawl": "ep ab po ma cd cu ha pe",
  "Step up banc": "cu fe ge ha ch pi",
  "Donkey kick": "fe is ha bd po ma ge",
  "Dips barres parallèles": "tr pe ep cd po ma cs",
  "Gainage": "ab ep cs cd bd pe",
  "Planche latérale": "cs ab ep cd ha",
  "Gainage dynamique": "ab ep cd po ma cs",
  "Crunch": "ab co",
  "Superman": "bd fe hd is",
  "Bird dog": "ab bd fe ep po ma ge",
  "Dead bug": "ab bd ha",
  "Hollow hold": "ab ha cs",
  "Relevés de jambes": "ab ha bd",
  "Russian twist": "cs ab bd",
  "Sit-ups": "ab ha co bd",
  "Reverse crunch": "ab ha bd",
  "Bicycle crunch": "cs ab co ha",
  "V-ups": "ab ha bd cs",
  "Extensions lombaires banc": "bd fe is",
  "Presse à cuisses": "cu fe ge ha ad",
  "Leg extension": "cu ge",
  "Leg curl assis": "is ge mo",
  "Leg curl allongé": "is ge mo",
  "Abducteurs machine": "fe ha",
  "Hip thrust machine": "fe is ha bd",
  "Pont fessier": "fe is ha bd",
  "Pec deck": "pe ep",
  "Développé épaules machine": "ep tr cd po ma",
  "Dips machine": "tr pe ep cd po ma",
  "Tirage poitrine": "md bi av ma ep cd po",
  "Rowing assis poulie": "md hd bi av ma cd po bd",
  "Face pull poulie": "hd ep ma co",
  "Écarté à la poulie": "pe ep cd",
  "Mollets assis": "mo ch",
  "Kickback fessier poulie": "fe is ha ge ch",
  "Rameur": "md hd bi av ma cu fe ge ha bd po pi ch",
  "Tapis de course": "cu is fe ge ha ch pi mo ti",
  "Vélo": "cu ge ha mo fe",
  "Développé couché": "pe ep tr cd po ma cs",
  "Développé couché haltères": "pe ep tr cd po ma",
  "Développé incliné haltères": "pe ep tr cd po ma",
  "Développé militaire haltères": "ep tr cd po ma hd co bd ab",
  "Développé Arnold": "ep tr cd po ma hd",
  "Oiseau haltères": "hd ep md ma bd",
  "Élévations latérales": "ep hd co ma",
  "Élévations frontales": "ep pe ma po",
  "Tirage menton haltères": "ep hd co cd po ma",
  "Curl haltères": "bi av cd po ma",
  "Curl marteau": "bi av cd po ma",
  "Curl barre EZ": "bi av cd po ma",
  "Extension triceps haltère": "tr cd ep ma po",
  "Extension triceps poulie": "tr cd ma po",
  "Pullover haltère": "md pe ep tr cs cd ma",
  "Rowing barre": "md hd bd bi av ma cd po",
  "Rowing haltère": "md bi av ma bd cd cs",
  "Rowing buste penché haltères": "md hd bd bi av ma cd po",
  "Soulevé de terre classique": "bd is fe cu md hd av ma po ha ge",
  "Soulevé de terre roumain": "is fe bd ma av ha po",
  "Squat barre": "cu fe ge ha bd ch ad ab hd co pi",
  "Overhead squat": "cu fe ge ha ch ep hd tr po cd ab bd",
  "Goblet squat": "cu fe ge ha ch ad ab bi av po ma",
  "Squat bulgare": "cu fe ge ha ad ch pi",
  "Kettlebell swing": "fe is bd ha av ma po ab",
  "Thruster haltères": "cu fe ge ha ep tr cd po ma ch",
  "Mollets": "mo ch pi",
  "Cercles de hanches": "ha",
  "Cat-cow": "bd md hd ma po ge",
  "Downward dog / cobra": "ep po ma hd bd is mo ab",
  "Thread the needle": "hd md ep co",
  "World's greatest stretch": "ha ad is cu ma po",
  "Pigeon": "ha fe ge",
  "Papillon hanches": "ad ha",
  "Posture de l'enfant": "bd md ep ge",
  "Torsion allongée": "bd cs ha",
  "Étirement chaîne postérieure": "is bd mo",
  "Étirement quadriceps": "cu ge",
  "Étirement mollet au mur": "mo ch",
  "Étirement pectoraux au mur": "pe ep",
  "Ouverture des épaules": "ep pe hd",
  "Étirement du cou": "co hd",
  /* Une respiration assise ne sollicite aucun endroit : c'est une
     réponse (une liste vide), pas une absence de réponse. */
  "Cohérence cardiaque": "",
};

const PAR_NOM: Map<string, Endroit[]> = new Map(
  Object.entries(TABLE).map(([nom, codes]) => [nom, codes.split(" ").filter(Boolean).map((c) => C[c])]),
);

/** Les endroits qu'un mouvement sollicite. `null` = je ne sais pas. */
export function endroitsDe(nom: string): Endroit[] | null {
  const direct = PAR_NOM.get(nom);
  if (direct) return direct;
  const lib = trouverExercice(nom);
  return lib ? PAR_NOM.get(lib.name) ?? null : null;
}

/** Ce mouvement sollicite-t-il l'une de ces zones (avec ou sans côté) ? `null` = je ne sais pas. */
export function sollicite(nom: string, zones: string[]): boolean | null {
  const e = endroitsDe(nom);
  if (!e) return null;
  const visees = new Set(zones.map(baseZone).filter((z): z is Endroit => !!z));
  return e.some((x) => visees.has(x));
}

/** Pour le banc : chaque mouvement de la bibliothèque a sa ligne. */
export function mouvementsSansLigne(): string[] {
  return EXERCISE_LIBRARY.map((e) => e.name).filter((n) => !PAR_NOM.has(n));
}

/** Pour le banc : chaque code de la table désigne un endroit connu. */
export function codesInconnus(): string[] {
  return Object.values(TABLE).flatMap((s) => s.split(" ").filter(Boolean)).filter((c) => !C[c]);
}
