/* ════════════════════════════════════════════════════════════════════
   R1 · L'IDENTITÉ STABLE D'UN EXERCICE

   Le journal des séries a besoin de retrouver l'historique d'un exercice
   sans dépendre de son nom d'affichage : un nom se renomme, se traduit,
   s'écrit avec ou sans accent. La clé, elle, ne change jamais.

   ⚠️ LA TABLE EST FIGÉE, PAS CALCULÉE. Les valeurs sont les clés des
   personnages-guides (`exerciseGuides.ts`), qui identifient déjà les 102
   exercices de la bibliothèque un pour un. Mais elles sont RECOPIÉES ici
   en dur : une règle d'animation qu'on élargit un jour ne doit jamais
   déplacer l'historique de quelqu'un. `check:programme` vérifie que les
   deux restent d'accord et que chaque clé est unique.

   ⚠️ ON N'INVENTE PAS D'ÉQUIVALENCE. Seul un nom de la bibliothèque (à
   l'accent et à la casse près) reçoit une clé. Un exercice perso, ou un
   nom du catalogue qui n'est pas canonique, reste enregistrable avec son
   nom et une clé nulle : on ne calculera pas sa progression sur une
   correspondance devinée. R2 donnera une clé explicite à chaque exercice
   prescrit.

   Ajouter un exercice à la bibliothèque = ajouter sa ligne ici, sinon
   le contrôle échoue. Ne JAMAIS changer une clé existante.
   ════════════════════════════════════════════════════════════════════ */

import { aplatir } from "./exerciseLibrary";

export const CLES_EXERCICES: Readonly<Record<string, string>> = {
  "Squat": "squat",
  "Pompes": "pompes",
  "Fentes": "fentes",
  "Squats sautés": "squatsaute",
  "Fentes sautées": "fentessautees",
  "Pike push-ups": "pikepushups",
  "Pompes diamant": "pompesdiamant",
  "Pompes inclinées": "pompesinclinees",
  "Dips sur chaise": "dips",
  "Tractions": "tractions",
  "Rowing inversé": "rowinginverse",
  "Burpees": "burpees",
  "Mountain climbers": "mountainclimbers",
  "Jumping jacks": "jumpingjacks",
  "Montées de genoux": "monteesgenoux",
  "Corde à sauter": "corde",
  "Chaise au mur": "chaisemur",
  "Pompes explosives": "pompesexplosives",
  "Box jump": "boxjump",
  "Skaters": "skaters",
  "Sprint sur place": "sprintsurplace",
  "Bear crawl": "bearcrawl",
  "Step up banc": "stepupbanc",
  "Donkey kick": "donkeykick",
  "Dips barres parallèles": "dipsbarresparalleles",
  "Gainage": "planche",
  "Planche latérale": "planchelaterale",
  "Gainage dynamique": "gainagedynamique",
  "Crunch": "crunch",
  "Superman": "superman",
  "Bird dog": "birddog",
  "Dead bug": "deadbug",
  "Hollow hold": "hollowhold",
  "Relevés de jambes": "relevesjambes",
  "Russian twist": "russiantwist",
  "Sit-ups": "situps",
  "Reverse crunch": "reversecrunch",
  "Bicycle crunch": "bicyclecrunch",
  "V-ups": "vups",
  "Extensions lombaires banc": "extensionslombairesbanc",
  "Presse à cuisses": "pressecuisses",
  "Leg extension": "legextension",
  "Leg curl assis": "legcurlassis",
  "Leg curl allongé": "legcurlallonge",
  "Abducteurs machine": "abducteursmachine",
  "Hip thrust machine": "hipthrustmachine",
  "Pont fessier": "hipthrust",
  "Pec deck": "pecdeck",
  "Développé épaules machine": "developpeepaulesmachine",
  "Dips machine": "dipsmachine",
  "Tirage poitrine": "tiragepoitrine",
  "Rowing assis poulie": "rowingassispoulie",
  "Face pull poulie": "facepullpoulie",
  "Écarté à la poulie": "ecartepoulie",
  "Mollets assis": "molletsassis",
  "Kickback fessier poulie": "kickbackfessierpoulie",
  "Rameur": "rameur",
  "Tapis de course": "coursetapis",
  "Vélo": "veloappartement",
  "Développé couché": "developpecouche",
  "Développé couché haltères": "developpecouchehalteres",
  "Développé incliné haltères": "developpeinclinehalteres",
  "Développé militaire haltères": "militaire",
  "Développé Arnold": "developpearnold",
  "Oiseau haltères": "oiseauhalteres",
  "Élévations latérales": "elevationslaterales",
  "Élévations frontales": "elevationsfrontales",
  "Tirage menton haltères": "tiragementonhalteres",
  "Curl haltères": "curl",
  "Curl marteau": "curlmarteau",
  "Curl barre EZ": "curlbarreez",
  "Extension triceps haltère": "extensiontricepshaltere",
  "Extension triceps poulie": "extensiontricepspoulie",
  "Pullover haltère": "pulloverhaltere",
  "Rowing barre": "rowing",
  "Rowing haltère": "rowingunilateralhaltere",
  "Rowing buste penché haltères": "rowingbustepenchehalteres",
  "Soulevé de terre classique": "souleveterreclassique",
  "Soulevé de terre roumain": "souleveterre",
  "Squat barre": "squatbarre",
  "Overhead squat": "overheadsquat",
  "Goblet squat": "gobletsquat",
  "Squat bulgare": "squatbulgare",
  "Kettlebell swing": "kettlebellswing",
  "Thruster haltères": "thrusterhalteres",
  "Mollets": "mollets",
  "Cercles de hanches": "cercleshanches",
  "Cat-cow": "catcow",
  "Downward dog / cobra": "downwarddogcobra",
  "Thread the needle": "threadtheneedle",
  "World's greatest stretch": "worldsgreateststretch",
  "Pigeon": "pigeonyoga",
  "Papillon hanches": "papillonhanches",
  "Posture de l'enfant": "postureenfant",
  "Torsion allongée": "torsionallongee",
  "Étirement chaîne postérieure": "etirementchaineposterieure",
  "Étirement quadriceps": "etirementquadriceps",
  "Étirement mollet au mur": "etirementmolletmur",
  "Étirement pectoraux au mur": "etirementpectorauxmur",
  "Ouverture des épaules": "ouvertureepaules",
  "Étirement du cou": "etirementcou",
  "Cohérence cardiaque": "coherencecardiaque",
};

const PAR_NOM = new Map(Object.entries(CLES_EXERCICES).map(([nom, cle]) => [aplatir(nom), cle]));

/** La clé stable d'un exercice, ou `null` quand on ne la connaît pas avec certitude. */
export function cleExercice(nom: string): string | null {
  return PAR_NOM.get(aplatir(nom)) ?? null;
}
