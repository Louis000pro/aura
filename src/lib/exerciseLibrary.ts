/* ════════════════════════════════════════════════════════════════════
   LA BIBLIOTHÈQUE D'EXERCICES · source unique du « choisir un exercice ».

   Pourquoi ce fichier : quand on créait une séance perso, on tapait le nom
   de l'exo à la main. Un nom approximatif ne résout aucune règle de
   exerciseGuides.ts, donc le tunnel affichait le halo au lieu du
   personnage animé. Résultat : les séances perso n'avaient jamais
   d'animation, alors que le catalogue en a partout.

   Ici, chaque entrée porte un nom CANONIQUE qui résout vers son sprite
   (les 102 noms viennent de guideSections.ts, qui est la liste vérifiée
   des planches livrées). Choisir dans la bibliothèque = animation garantie
   dans le tunnel, plus les vraies consignes, les muscles et des réglages
   de départ crédibles.

   Ajouter un exercice ici n'a de sens qu'une fois sa planche livrée
   (`npm run guides` + sa règle dans exerciseGuides.ts). Sinon la carte
   promet une animation qui n'existe pas : `estAnime()` le dit, et l'écran
   range l'exo dans « sans animation ».
   ════════════════════════════════════════════════════════════════════ */

import { resolveGuide } from "./exerciseGuides";

/** Le filtre principal de l'écran : par zone du corps. */
export type Zone =
  | "pectoraux" | "dos" | "epaules" | "bras"
  | "jambes" | "fessiers" | "abdos" | "cardio" | "mobilite";

/** Le second filtre : ce qu'il faut avoir sous la main. */
export type Equip = "corps" | "fonte" | "machine" | "cardio";

/** Un exo se compte en répétitions, ou se tient dans le temps. */
export type RepMode = "reps" | "temps";

/** Le rangement historique des planches, relu par guideSections.ts (galerie
    /guides et ateliers de revue). Il ne sert pas aux filtres de l'écran. */
export type SectionGuide = "corps" | "abdos" | "machines" | "barre" | "mobilite";

export type LibExercise = {
  name: string;
  section: SectionGuide;
  zone: Zone;
  muscles: string[];
  equip: Equip;
  mode: RepMode;
  /** Réglages de départ, modifiables ensuite dans la séance. */
  sets: number;
  reps: number;
  /** Durée d'une série tenue, en secondes (mode « temps »). */
  seconds: number;
  rest: number;
  /** Suffixe des reps : « 10 par jambe » plutôt que « 10 reps ». */
  unite: string;
  tip: string;
  benefit: string;
};

export const ZONES: { id: Zone; label: string }[] = [
  { id: "pectoraux", label: "Pectoraux" },
  { id: "dos",       label: "Dos" },
  { id: "epaules",   label: "Épaules" },
  { id: "bras",      label: "Bras" },
  { id: "jambes",    label: "Jambes" },
  { id: "fessiers",  label: "Fessiers" },
  { id: "abdos",     label: "Abdos & gainage" },
  { id: "cardio",    label: "Cardio" },
  { id: "mobilite",  label: "Mobilité" },
];

export const EQUIPS: { id: Equip; label: string }[] = [
  { id: "corps",   label: "Sans matériel" },
  { id: "fonte",   label: "Haltères & barre" },
  { id: "machine", label: "Machines & poulies" },
  { id: "cardio",  label: "Cardio de salle" },
];

/** Les muscles proposés à la main quand on veut compléter la liste déduite. */
export const ALL_MUSCLES = [
  "Pectoraux", "Dos", "Épaules", "Biceps", "Triceps", "Avant-bras",
  "Abdominaux", "Obliques", "Core", "Lombaires", "Trapèzes",
  "Quadriceps", "Ischio-jambiers", "Fessiers", "Adducteurs", "Mollets",
  "Hanches", "Mobilité", "Cardio",
];

/* ── Écriture compacte : on ne répète pas les valeurs par défaut ────── */
type Raw = {
  n: string; z: Zone; m: string[];
  e?: Equip; mode?: RepMode;
  s?: number; r?: number; sec?: number; rest?: number; u?: string;
  tip: string; ben: string;
};

const CORPS: Raw[] = [
  { n: "Squat", z: "jambes", m: ["Quadriceps", "Fessiers"], r: 12,
    tip: "Pieds largeur d’épaules, talons ancrés. Descends à l’amplitude qui reste confortable.",
    ben: "Le geste de base du bas du corps : cuisses, fessiers et gainage travaillent ensemble." },
  { n: "Pompes", z: "pectoraux", m: ["Pectoraux", "Triceps", "Épaules"], r: 10,
    tip: "Corps aligné des talons à la tête, coudes à 45°. Pose les genoux pour alléger sans perdre le geste.",
    ben: "Développe la poussée du haut du corps et la stabilité des épaules." },
  { n: "Fentes", z: "jambes", m: ["Quadriceps", "Fessiers"], r: 10, u: "par jambe",
    tip: "Un pas assez long pour garder le genou avant stable, puis pousse dans le talon.",
    ben: "Renforce chaque jambe séparément et travaille l’équilibre." },
  { n: "Squats sautés", z: "jambes", m: ["Quadriceps", "Fessiers", "Cardio"], r: 10, rest: 45,
    tip: "Descends en squat, pousse fort, et reçois-toi genoux souples.",
    ben: "Ajoute de l’explosivité au squat et fait monter le rythme cardiaque." },
  { n: "Fentes sautées", z: "jambes", m: ["Quadriceps", "Fessiers", "Cardio"], r: 8, u: "par jambe", rest: 45,
    tip: "Change de jambe en l’air et amortis en gardant le buste droit.",
    ben: "Travaille la puissance des jambes et la coordination." },
  { n: "Pike push-ups", z: "epaules", m: ["Épaules", "Triceps"], r: 8,
    tip: "Hanches hautes, tête entre les bras. Descends le front vers le sol.",
    ben: "Prépare les épaules à la poussée verticale, sans matériel." },
  { n: "Pompes diamant", z: "bras", m: ["Triceps", "Pectoraux"], r: 8,
    tip: "Mains jointes sous la poitrine, coudes serrés le long du corps.",
    ben: "Concentre l’effort sur les triceps et l’intérieur des pectoraux." },
  { n: "Pompes inclinées", z: "pectoraux", m: ["Pectoraux", "Triceps"], r: 12,
    tip: "Mains sur un banc ou une table : plus c’est haut, plus c’est accessible.",
    ben: "La version qui permet de faire de vraies séries propres." },
  { n: "Dips sur chaise", z: "bras", m: ["Triceps", "Épaules"], r: 10,
    tip: "Coudes vers l’arrière, épaules basses. Descends jusqu’à l’angle droit.",
    ben: "Cible les triceps avec un simple appui à la maison." },
  { n: "Tractions", z: "dos", m: ["Dos", "Biceps"], r: 6, rest: 90,
    tip: "Pars bras tendus, tire les coudes vers les côtes, menton au-dessus de la barre.",
    ben: "Le meilleur mouvement de tirage vertical pour le dos." },
  { n: "Rowing inversé", z: "dos", m: ["Dos", "Biceps"], r: 10,
    tip: "Corps gainé sous la barre, tire la poitrine vers elle sans casser les hanches.",
    ben: "Un tirage horizontal accessible, idéal avant les tractions." },
  { n: "Burpees", z: "cardio", m: ["Corps entier", "Cardio"], r: 10, rest: 45,
    tip: "Trouve un rythme que tu peux tenir sur toute la série, sans t’arrêter à mi-parcours.",
    ben: "Fait travailler tout le corps et monte le cardio très vite." },
  { n: "Mountain climbers", z: "cardio", m: ["Core", "Cardio"], mode: "temps", sec: 30, rest: 30,
    tip: "Mains sous les épaules, ramène les genoux sans laisser les hanches monter.",
    ben: "Cardio et gainage dans le même mouvement." },
  { n: "Jumping jacks", z: "cardio", m: ["Cardio"], mode: "temps", sec: 40, rest: 20,
    tip: "Reste souple sur les appuis, les bras montent jusqu’au-dessus de la tête.",
    ben: "Réveille le corps entier et sert d’échauffement fiable." },
  { n: "Montées de genoux", z: "cardio", m: ["Cardio", "Quadriceps"], mode: "temps", sec: 30, rest: 30,
    tip: "Genoux à hauteur de hanches, appuis légers, buste droit.",
    ben: "Fait monter le rythme sans impact violent." },
  { n: "Corde à sauter", z: "cardio", m: ["Cardio", "Mollets"], e: "cardio", mode: "temps", sec: 60, rest: 45,
    tip: "Petits sauts, poignets qui font tourner la corde, pas les bras.",
    ben: "Beaucoup de cardio en très peu de place." },
  { n: "Chaise au mur", z: "jambes", m: ["Quadriceps"], mode: "temps", sec: 45, rest: 45,
    tip: "Dos plaqué au mur, cuisses parallèles au sol, respire calmement.",
    ben: "Renforce les cuisses en isométrie, sans aucun impact." },
  { n: "Pompes explosives", z: "pectoraux", m: ["Pectoraux", "Triceps"], r: 6, rest: 60,
    tip: "Descends contrôlé, puis pousse assez fort pour décoller les mains.",
    ben: "Ajoute de la vitesse et de la puissance à la poussée." },
  { n: "Box jump", z: "jambes", m: ["Quadriceps", "Fessiers", "Cardio"], r: 8, rest: 60,
    tip: "Choisis une hauteur où tu retombes en douceur, et redescends en marchant.",
    ben: "Travaille l’explosivité des jambes en limitant l’impact à la réception." },
  { n: "Skaters", z: "cardio", m: ["Fessiers", "Cardio"], mode: "temps", sec: 40, rest: 30,
    tip: "Saute d’un pied sur l’autre en largeur, amortis sur la jambe d’appui.",
    ben: "Cardio latéral qui sollicite les fessiers et l’équilibre." },
  { n: "Sprint sur place", z: "cardio", m: ["Cardio"], mode: "temps", sec: 20, rest: 40,
    tip: "Vingt secondes vraiment rapides, puis récupère complètement.",
    ben: "Format court et intense pour travailler la capacité cardiaque." },
  { n: "Bear crawl", z: "cardio", m: ["Core", "Épaules", "Cardio"], mode: "temps", sec: 30, rest: 30,
    tip: "Genoux à deux centimètres du sol, avance bras et jambe opposés.",
    ben: "Gaine tout le tronc pendant que le cardio monte." },
  { n: "Step up banc", z: "jambes", m: ["Quadriceps", "Fessiers"], r: 10, u: "par jambe",
    tip: "Pose tout le pied sur le banc et pousse dans le talon, sans t’aider de l’élan.",
    ben: "Renforce chaque jambe avec un geste du quotidien." },
  { n: "Donkey kick", z: "fessiers", m: ["Fessiers"], r: 12, u: "par jambe",
    tip: "À quatre pattes, monte le talon vers le plafond sans cambrer le bas du dos.",
    ben: "Cible le fessier avec un mouvement simple et sûr." },
  { n: "Dips barres parallèles", z: "bras", m: ["Triceps", "Pectoraux"], r: 8, rest: 90,
    tip: "Épaules basses, descends jusqu’à l’angle droit puis pousse.",
    ben: "Mouvement de poussée complet pour triceps et bas des pectoraux." },

];

const ABDOS: Raw[] = [
  { n: "Gainage", z: "abdos", m: ["Core", "Abdominaux"], mode: "temps", sec: 40, rest: 45,
    tip: "Coudes sous les épaules, fessiers serrés, une ligne des talons à la tête.",
    ben: "Construit la stabilité du tronc, utile dans tous les autres exos." },
  { n: "Planche latérale", z: "abdos", m: ["Obliques", "Core"], mode: "temps", sec: 30, rest: 30,
    tip: "Un côté après l’autre. Hanches hautes, épaule à l’aplomb du coude.",
    ben: "Renforce les côtés du tronc, souvent laissés de côté." },
  { n: "Gainage dynamique", z: "abdos", m: ["Core", "Épaules"], mode: "temps", sec: 30, rest: 40,
    tip: "Passe des coudes aux mains sans balancer les hanches.",
    ben: "Ajoute du mouvement au gainage et fait travailler les épaules." },
  { n: "Crunch", z: "abdos", m: ["Abdominaux"], r: 15, rest: 45,
    tip: "Décolle les omoplates sans tirer sur la nuque, souffle en montant.",
    ben: "Le travail direct de la sangle abdominale." },
  { n: "Superman", z: "abdos", m: ["Lombaires", "Fessiers"], r: 12, rest: 45,
    tip: "Décolle bras et jambes de quelques centimètres, regard vers le sol.",
    ben: "Renforce le bas du dos, l’équilibre indispensable des abdos." },
  { n: "Bird dog", z: "abdos", m: ["Core", "Lombaires"], r: 10, u: "par côté",
    tip: "Bras et jambe opposés, sans laisser le bassin tourner.",
    ben: "Apprend au tronc à rester stable pendant que les membres bougent." },
  { n: "Dead bug", z: "abdos", m: ["Core", "Abdominaux"], r: 10, u: "par côté",
    tip: "Garde le bas du dos au sol pendant que bras et jambe opposés s’éloignent.",
    ben: "Stabilise le tronc sans mettre de tension dans le dos." },
  { n: "Hollow hold", z: "abdos", m: ["Abdominaux", "Core"], mode: "temps", sec: 25, rest: 40,
    tip: "Bas du dos collé au sol : monte les jambes si ça décolle.",
    ben: "Position de référence pour un tronc solide." },
  { n: "Relevés de jambes", z: "abdos", m: ["Abdominaux"], r: 12, rest: 45,
    tip: "Descends les jambes seulement jusqu’où le dos reste plaqué.",
    ben: "Cible le bas des abdominaux." },
  { n: "Russian twist", z: "abdos", m: ["Obliques"], r: 20, rest: 45,
    tip: "Buste incliné, tourne les épaules, pas seulement les bras.",
    ben: "Travaille la rotation et les obliques." },
  { n: "Sit-ups", z: "abdos", m: ["Abdominaux"], r: 15, rest: 45,
    tip: "Déroule le dos vertèbre par vertèbre à la montée comme à la descente.",
    ben: "Mouvement complet de flexion du tronc." },
  { n: "Reverse crunch", z: "abdos", m: ["Abdominaux"], r: 12, rest: 45,
    tip: "Enroule le bassin vers toi, sans lancer les jambes.",
    ben: "Le bas des abdos travaille sans forcer sur la nuque." },
  { n: "Bicycle crunch", z: "abdos", m: ["Obliques", "Abdominaux"], r: 20, rest: 45,
    tip: "Coude vers le genou opposé, lentement, sans tirer sur la tête.",
    ben: "Combine flexion et rotation pour toute la sangle." },
  { n: "V-ups", z: "abdos", m: ["Abdominaux", "Core"], r: 10, rest: 45,
    tip: "Monte bras et jambes en même temps, plie les genoux si besoin.",
    ben: "Version complète et exigeante du crunch." },
  { n: "Extensions lombaires banc", z: "abdos", m: ["Lombaires", "Fessiers"], e: "machine", r: 12,
    tip: "Remonte jusqu’à l’alignement du corps, sans partir en arrière.",
    ben: "Renforce le bas du dos et la chaîne postérieure." },

];

const MACHINES: Raw[] = [
  { n: "Presse à cuisses", z: "jambes", m: ["Quadriceps", "Fessiers"], e: "machine", r: 12, rest: 90,
    tip: "Descends jusqu’à l’angle droit sans décoller le bas du dos du dossier.",
    ben: "Charge les jambes en sécurité, sans gérer l’équilibre." },
  { n: "Leg extension", z: "jambes", m: ["Quadriceps"], e: "machine", r: 12,
    tip: "Marque une seconde en haut, redescends lentement.",
    ben: "Isole les quadriceps en fin de séance." },
  { n: "Leg curl assis", z: "jambes", m: ["Ischio-jambiers"], e: "machine", r: 12,
    tip: "Ramène les talons sous le siège, contrôle le retour.",
    ben: "Travaille l’arrière des cuisses, l’équilibre des quadriceps." },
  { n: "Leg curl allongé", z: "jambes", m: ["Ischio-jambiers"], e: "machine", r: 12,
    tip: "Hanches collées au banc, pas de coup de rein pour finir la série.",
    ben: "Cible les ischio-jambiers en position allongée." },
  { n: "Abducteurs machine", z: "fessiers", m: ["Fessiers", "Hanches"], e: "machine", r: 15,
    tip: "Buste légèrement penché en avant, ouvre sans à-coups.",
    ben: "Renforce le côté du fessier, utile pour la stabilité du bassin." },
  { n: "Hip thrust machine", z: "fessiers", m: ["Fessiers"], e: "machine", r: 12, rest: 75,
    tip: "Menton rentré, monte jusqu’à l’alignement cuisses-buste et serre en haut.",
    ben: "Le mouvement le plus direct pour les fessiers." },
  { n: "Pont fessier", z: "fessiers", m: ["Fessiers"], r: 15,
    tip: "Pieds près des fesses, monte le bassin sans cambrer.",
    ben: "La version au sol du hip thrust, faisable partout." },
  { n: "Pec deck", z: "pectoraux", m: ["Pectoraux"], e: "machine", r: 12,
    tip: "Coudes à hauteur d’épaules, serre lentement sans claquer les bras.",
    ben: "Isole les pectoraux avec une trajectoire guidée." },
  { n: "Développé épaules machine", z: "epaules", m: ["Épaules", "Triceps"], e: "machine", r: 12,
    tip: "Ne verrouille pas les coudes en haut, garde la tension.",
    ben: "Poussée verticale pour les épaules, dos soutenu." },
  { n: "Dips machine", z: "bras", m: ["Triceps", "Pectoraux"], e: "machine", r: 12,
    tip: "Coudes le long du corps, descends jusqu’à l’angle droit.",
    ben: "Le geste des dips, avec la charge que tu choisis." },
  { n: "Tirage poitrine", z: "dos", m: ["Dos", "Biceps"], e: "machine", r: 12,
    tip: "Tire la barre vers le haut de la poitrine, coudes vers le bas.",
    ben: "Construit la largeur du dos avant de passer aux tractions." },
  { n: "Rowing assis poulie", z: "dos", m: ["Dos", "Trapèzes"], e: "machine", r: 12,
    tip: "Buste droit, tire aux côtes, laisse les omoplates se rapprocher.",
    ben: "Épaissit le milieu du dos et améliore la posture." },
  { n: "Face pull poulie", z: "epaules", m: ["Épaules", "Trapèzes"], e: "machine", r: 15,
    tip: "Poulie à hauteur de visage, tire les mains vers les tempes.",
    ben: "Renforce l’arrière d’épaule, précieux pour équilibrer les poussées." },
  { n: "Écarté à la poulie", z: "pectoraux", m: ["Pectoraux"], e: "machine", r: 12,
    tip: "Léger fléchissement des coudes, tenu tout le long du mouvement.",
    ben: "Étire et contracte les pectoraux avec une tension continue." },
  { n: "Mollets assis", z: "jambes", m: ["Mollets"], e: "machine", r: 15, rest: 45,
    tip: "Amplitude complète : bien bas, bien haut, sans rebondir.",
    ben: "Cible le mollet profond, celui qui travaille genou plié." },
  { n: "Kickback fessier poulie", z: "fessiers", m: ["Fessiers"], e: "machine", r: 12, u: "par jambe",
    tip: "Buste stable, la jambe part vers l’arrière sans cambrer le dos.",
    ben: "Isole le fessier avec une tension constante." },
  { n: "Rameur", z: "cardio", m: ["Corps entier", "Cardio"], e: "cardio", mode: "temps", s: 1, sec: 300, rest: 60,
    tip: "Jambes, puis buste, puis bras. Et l’inverse au retour.",
    ben: "Cardio complet qui fait travailler tout le corps sans impact." },
  { n: "Tapis de course", z: "cardio", m: ["Cardio", "Jambes"], e: "cardio", mode: "temps", s: 1, sec: 600, rest: 60,
    tip: "Une allure où tu peux encore parler par phrases courtes.",
    ben: "Construit l’endurance de base, celle qui tient dans la durée." },
  { n: "Vélo", z: "cardio", m: ["Cardio", "Quadriceps"], e: "cardio", mode: "temps", s: 1, sec: 600, rest: 60,
    tip: "Cadence régulière, résistance qui te laisse tourner sans forcer.",
    ben: "Cardio doux pour les articulations, facile à doser." },

];

const BARRE: Raw[] = [
  { n: "Développé couché", z: "pectoraux", m: ["Pectoraux", "Triceps", "Épaules"], e: "fonte", r: 10, rest: 90,
    tip: "Omoplates serrées, barre au niveau du bas des pectoraux, pieds ancrés.",
    ben: "La référence de la poussée horizontale pour le haut du corps." },
  { n: "Développé couché haltères", z: "pectoraux", m: ["Pectoraux", "Triceps"], e: "fonte", r: 10, rest: 90,
    tip: "Descends jusqu’à sentir l’étirement, sans que les coudes plongent trop bas.",
    ben: "Plus d’amplitude qu’à la barre, et chaque côté travaille seul." },
  { n: "Développé incliné haltères", z: "pectoraux", m: ["Pectoraux", "Épaules"], e: "fonte", r: 10, rest: 90,
    tip: "Banc à trente degrés environ : au-delà, ce sont les épaules qui prennent.",
    ben: "Insiste sur le haut des pectoraux." },
  { n: "Développé militaire haltères", z: "epaules", m: ["Épaules", "Triceps"], e: "fonte", r: 10, rest: 75,
    tip: "Gaine le ventre pour ne pas cambrer quand les bras montent.",
    ben: "Construit des épaules solides et un tronc stable." },
  { n: "Développé Arnold", z: "epaules", m: ["Épaules"], e: "fonte", r: 10, rest: 75,
    tip: "Tourne les paumes pendant la montée, sans accélérer.",
    ben: "Balaie toute l’épaule en un seul mouvement." },
  { n: "Oiseau haltères", z: "epaules", m: ["Épaules", "Dos"], e: "fonte", r: 15, rest: 45,
    tip: "Buste penché, ouvre les bras sur les côtés sans monter les épaules.",
    ben: "Travaille l’arrière d’épaule, souvent le maillon faible." },
  { n: "Élévations latérales", z: "epaules", m: ["Épaules"], e: "fonte", r: 15, rest: 45,
    tip: "Monte jusqu’à l’horizontale, coudes légèrement fléchis, sans élan.",
    ben: "Dessine la largeur des épaules." },
  { n: "Élévations frontales", z: "epaules", m: ["Épaules"], e: "fonte", r: 12, rest: 45,
    tip: "Monte devant toi jusqu’aux yeux, descends lentement.",
    ben: "Cible l’avant de l’épaule." },
  { n: "Tirage menton haltères", z: "epaules", m: ["Épaules", "Trapèzes"], e: "fonte", r: 12,
    tip: "Coudes qui montent en premier, jusqu’à hauteur d’épaules seulement.",
    ben: "Associe épaules et trapèzes dans un même tirage." },
  { n: "Curl haltères", z: "bras", m: ["Biceps"], e: "fonte", r: 12, rest: 45,
    tip: "Coudes collés au corps, pas de balancier avec le dos.",
    ben: "Le travail direct du biceps." },
  { n: "Curl marteau", z: "bras", m: ["Biceps", "Avant-bras"], e: "fonte", r: 12, rest: 45,
    tip: "Paumes face à face du début à la fin.",
    ben: "Épaissit le bras et renforce l’avant-bras." },
  { n: "Curl barre EZ", z: "bras", m: ["Biceps"], e: "fonte", r: 10, rest: 60,
    tip: "La barre coudée ménage les poignets : garde-les dans l’axe.",
    ben: "Permet de charger le biceps plus lourd qu’aux haltères." },
  { n: "Extension triceps haltère", z: "bras", m: ["Triceps"], e: "fonte", r: 12, rest: 45,
    tip: "Coudes serrés vers l’avant, seul l’avant-bras bouge.",
    ben: "Cible la longue portion du triceps." },
  { n: "Extension triceps poulie", z: "bras", m: ["Triceps"], e: "machine", r: 15, rest: 45,
    tip: "Coudes fixes le long du corps, tends complètement en bas.",
    ben: "Tension continue sur le triceps, facile à doser." },
  { n: "Pullover haltère", z: "dos", m: ["Dos", "Pectoraux"], e: "fonte", r: 12, rest: 60,
    tip: "Descends derrière la tête aussi loin que l’épaule reste confortable.",
    ben: "Ouvre la cage et relie le dos aux pectoraux." },
  { n: "Rowing barre", z: "dos", m: ["Dos", "Biceps"], e: "fonte", r: 10, rest: 90,
    tip: "Buste penché à quarante-cinq degrés, dos plat, tire vers le nombril.",
    ben: "Construit l’épaisseur du dos." },
  { n: "Rowing haltère", z: "dos", m: ["Dos", "Biceps"], e: "fonte", r: 10, u: "par bras", rest: 60,
    tip: "Un genou sur le banc, tire le coude vers la hanche sans tourner le buste.",
    ben: "Travaille chaque côté du dos séparément." },
  { n: "Rowing buste penché haltères", z: "dos", m: ["Dos", "Biceps"], e: "fonte", r: 12, rest: 75,
    tip: "Dos plat, tire les deux haltères aux côtes en même temps.",
    ben: "Renforce le milieu du dos et la posture." },
  { n: "Soulevé de terre classique", z: "dos", m: ["Dos", "Fessiers", "Ischio-jambiers"], e: "fonte", r: 6, rest: 120,
    tip: "Barre contre les tibias, dos plat, pousse le sol avec les jambes.",
    ben: "Le mouvement le plus complet de toute la salle." },
  { n: "Soulevé de terre roumain", z: "jambes", m: ["Ischio-jambiers", "Fessiers"], e: "fonte", r: 10, rest: 90,
    tip: "Jambes presque tendues, pousse les hanches vers l’arrière, barre proche des cuisses.",
    ben: "Étire et renforce l’arrière des cuisses et les fessiers." },
  { n: "Squat barre", z: "jambes", m: ["Quadriceps", "Fessiers", "Core"], e: "fonte", r: 8, rest: 120,
    tip: "Barre calée sur les trapèzes, descends entre les pieds, poitrine haute.",
    ben: "La base de la force du bas du corps." },
  { n: "Overhead squat", z: "jambes", m: ["Quadriceps", "Épaules", "Core"], e: "fonte", r: 8, rest: 90,
    tip: "Barre à la verticale des pieds, épaules actives tout le long.",
    ben: "Exige et développe mobilité, gainage et coordination." },
  { n: "Goblet squat", z: "jambes", m: ["Quadriceps", "Fessiers"], e: "fonte", r: 12, rest: 60,
    tip: "Haltère contre la poitrine, coudes à l’intérieur des genoux en bas.",
    ben: "Apprend le bon squat en gardant le buste droit naturellement." },
  { n: "Squat bulgare", z: "jambes", m: ["Quadriceps", "Fessiers"], r: 10, u: "par jambe", rest: 60,
    tip: "Pied arrière surélevé, descends à la verticale sans partir en avant.",
    ben: "Très efficace sur une jambe, même sans charge lourde." },
  { n: "Kettlebell swing", z: "fessiers", m: ["Fessiers", "Ischio-jambiers", "Cardio"], e: "fonte", r: 15, rest: 45,
    tip: "Le mouvement vient des hanches, pas des bras. La kettlebell monte toute seule.",
    ben: "Puissance des hanches et cardio dans le même geste." },
  { n: "Thruster haltères", z: "cardio", m: ["Corps entier", "Cardio"], e: "fonte", r: 12, rest: 60,
    tip: "Enchaîne le squat et la poussée en un seul mouvement fluide.",
    ben: "Fait travailler tout le corps et grimper le cardio." },
  { n: "Mollets", z: "jambes", m: ["Mollets"], r: 20, rest: 45,
    tip: "Monte le plus haut possible sur la pointe, redescends lentement.",
    ben: "Renforce les mollets, utiles à chaque pas et chaque saut." },

];

const MOBILITE: Raw[] = [
  { n: "Cercles de hanches", z: "mobilite", m: ["Hanches", "Mobilité"], mode: "temps", s: 1, sec: 30, rest: 15,
    tip: "Grands cercles lents, dans un sens puis dans l’autre.",
    ben: "Réveille les hanches avant l’effort." },
  { n: "Cat-cow", z: "mobilite", m: ["Dos", "Mobilité"], mode: "temps", s: 1, sec: 40, rest: 15,
    tip: "Laisse la respiration mener le mouvement de la colonne.",
    ben: "Remet la colonne et les épaules en mouvement, en douceur." },
  { n: "Downward dog / cobra", z: "mobilite", m: ["Dos", "Mobilité"], mode: "temps", s: 1, sec: 40, rest: 15,
    tip: "Passe d’une position à l’autre sans forcer, au rythme du souffle.",
    ben: "Ouvre l’avant du corps et étire l’arrière des jambes." },
  { n: "Thread the needle", z: "mobilite", m: ["Dos", "Épaules"], mode: "temps", s: 1, sec: 30, rest: 15,
    tip: "Un côté après l’autre. Le bras glisse sous le corps, l’épaule se pose.",
    ben: "Détend le haut du dos et les épaules." },
  { n: "World's greatest stretch", z: "mobilite", m: ["Hanches", "Mobilité"], mode: "temps", s: 1, sec: 40, rest: 15,
    tip: "Fente avant, coude vers le sol, puis ouvre le buste vers le plafond.",
    ben: "Un seul étirement qui touche hanches, dos et épaules." },
  { n: "Pigeon", z: "mobilite", m: ["Hanches", "Fessiers"], mode: "temps", s: 1, sec: 45, rest: 15,
    tip: "Cherche la sensation d’étirement, jamais la douleur. Respire lentement.",
    ben: "Relâche le fessier et l’avant de la hanche opposée." },
  { n: "Papillon hanches", z: "mobilite", m: ["Hanches", "Adducteurs"], mode: "temps", s: 1, sec: 45, rest: 15,
    tip: "Plantes de pieds jointes, laisse les genoux descendre sans les pousser.",
    ben: "Ouvre l’intérieur des cuisses et les hanches." },
  { n: "Posture de l'enfant", z: "mobilite", m: ["Dos", "Mobilité"], mode: "temps", s: 1, sec: 45, rest: 15,
    tip: "Genoux écartés, bras loin devant, front posé au sol.",
    ben: "Position de retour au calme qui relâche tout le dos." },
  { n: "Torsion allongée", z: "mobilite", m: ["Dos", "Obliques"], mode: "temps", s: 1, sec: 40, rest: 15,
    tip: "Épaules au sol, laisse les genoux tomber d’un côté, puis de l’autre.",
    ben: "Détend la colonne et le bas du dos." },
  { n: "Étirement chaîne postérieure", z: "mobilite", m: ["Ischio-jambiers", "Dos"], mode: "temps", s: 1, sec: 40, rest: 15,
    tip: "Jambes tendues sans bloquer les genoux, descends jusqu’où c’est confortable.",
    ben: "Étire l’arrière des jambes et le bas du dos." },
  { n: "Étirement quadriceps", z: "mobilite", m: ["Quadriceps"], mode: "temps", s: 1, sec: 30, rest: 15,
    tip: "Talon vers la fesse, genoux côte à côte, bassin légèrement rentré.",
    ben: "Relâche l’avant des cuisses après le travail des jambes." },
  { n: "Étirement mollet au mur", z: "mobilite", m: ["Mollets"], mode: "temps", s: 1, sec: 30, rest: 15,
    tip: "Pointe de pied au mur, talon au sol, avance doucement la hanche.",
    ben: "Détend le mollet et gagne de la mobilité de cheville." },
  { n: "Étirement pectoraux au mur", z: "mobilite", m: ["Pectoraux"], mode: "temps", s: 1, sec: 30, rest: 15,
    tip: "Avant-bras contre le mur, tourne le buste dans l’autre sens.",
    ben: "Ouvre la poitrine, surtout après une journée assise." },
  { n: "Ouverture des épaules", z: "mobilite", m: ["Épaules", "Mobilité"], mode: "temps", s: 1, sec: 30, rest: 15,
    tip: "Grands cercles lents, laisse les omoplates suivre le mouvement.",
    ben: "Prépare les épaules aux poussées et aux tirages." },
  { n: "Étirement du cou", z: "mobilite", m: ["Mobilité"], mode: "temps", s: 1, sec: 30, rest: 15,
    tip: "Incline la tête sur le côté, sans tirer avec la main.",
    ben: "Relâche la nuque et le haut des trapèzes." },
  { n: "Cohérence cardiaque", z: "mobilite", m: ["Respiration"], mode: "temps", s: 1, sec: 120, rest: 0,
    tip: "Inspire cinq secondes, souffle cinq secondes. Rien d’autre à faire.",
    ben: "Fait redescendre le rythme cardiaque et clôt la séance au calme." },
];

/* Une seule liste, cinq rangements. La galerie /guides et les ateliers de
   revue lisent la même chose que l'écran de création : c'est exactement ce
   que guideSections.ts avait déjà appris à ses dépens (deux copies de la
   liste avaient divergé, l'une figée à 55 exos quand l'autre en avait 101). */
const RAW: (Raw & { grp: SectionGuide })[] = [
  ...CORPS.map(x => ({ ...x, grp: "corps" as const })),
  ...ABDOS.map(x => ({ ...x, grp: "abdos" as const })),
  ...MACHINES.map(x => ({ ...x, grp: "machines" as const })),
  ...BARRE.map(x => ({ ...x, grp: "barre" as const })),
  ...MOBILITE.map(x => ({ ...x, grp: "mobilite" as const })),
];

export const EXERCISE_LIBRARY: LibExercise[] = RAW.map(x => ({
  name: x.n,
  section: x.grp,
  zone: x.z,
  muscles: x.m,
  equip: x.e ?? "corps",
  mode: x.mode ?? "reps",
  sets: x.s ?? 3,
  reps: x.r ?? 12,
  seconds: x.sec ?? 40,
  rest: x.rest ?? 60,
  unite: x.u ?? "reps",
  tip: x.tip,
  benefit: x.ben,
}));

/* ── Helpers ───────────────────────────────────────────────────────── */

/** Minuscules sans accent : « Développé couché » devient « developpe couche ». */
export function aplatir(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}

/** Le personnage-guide existe-t-il pour ce nom ? (mis en avant dans l'écran) */
export function estAnime(name: string): boolean {
  return resolveGuide(name) !== null;
}

const PAR_NOM = new Map(EXERCISE_LIBRARY.map(e => [aplatir(e.name), e]));

/** Retrouve l'exo de la bibliothèque derrière un nom saisi à la main. */
export function trouverExercice(name: string): LibExercise | undefined {
  return PAR_NOM.get(aplatir(name));
}

/** Le libellé des reps tel qu'il part dans la séance : « 12 reps », « 45s », « 5 min ». */
export function libelleReps(mode: RepMode, reps: number, seconds: number, unite: string): string {
  if (mode === "temps") {
    return seconds >= 60 && seconds % 60 === 0 ? `${seconds / 60} min` : `${seconds}s`;
  }
  return `${reps} ${unite}`;
}

/** La recherche de l'écran : texte libre + zone + matériel, animés en tête. */
export function chercherExercices(opts: { texte?: string; zone?: Zone | null; equip?: Equip | null }): LibExercise[] {
  const q = aplatir(opts.texte ?? "");
  return EXERCISE_LIBRARY.filter(e => {
    if (opts.zone && e.zone !== opts.zone) return false;
    if (opts.equip && e.equip !== opts.equip) return false;
    if (!q) return true;
    return aplatir(e.name).includes(q) || e.muscles.some(m => aplatir(m).includes(q));
  });
}

/* ── Deviner la séance derrière une poignée d'exercices ────────────────
   Quand on arrive dans la création depuis la bibliothèque, les exercices
   sont déjà là : il serait absurde de redemander « c'est quoi, du cardio
   ou de la force ? » alors que la réponse est dans la sélection. On
   propose donc un nom et un type, tous deux corrigeables. */

const HAUT: Zone[] = ["pectoraux", "dos", "epaules", "bras"];
const BAS: Zone[] = ["jambes", "fessiers"];

/** Zone la plus représentée, avec le compte de chaque famille. */
function repartition(exos: LibExercise[]) {
  const parZone = new Map<Zone, number>();
  exos.forEach(e => parZone.set(e.zone, (parZone.get(e.zone) ?? 0) + 1));
  const compte = (zs: Zone[]) => zs.reduce((n, z) => n + (parZone.get(z) ?? 0), 0);
  let dominante: Zone | null = null;
  let max = 0;
  parZone.forEach((n, z) => { if (n > max) { max = n; dominante = z; } });
  return {
    dominante: dominante as Zone | null,
    haut: compte(HAUT),
    bas: compte(BAS),
    mobilite: parZone.get("mobilite") ?? 0,
    cardio: parZone.get("cardio") ?? 0,
    abdos: parZone.get("abdos") ?? 0,
    total: exos.length,
  };
}

/** Un nom de séance plausible, à partir de ce qui a été choisi. */
export function titreDepuisExercices(exos: LibExercise[]): string {
  if (!exos.length) return "";
  const r = repartition(exos);
  const moitie = r.total / 2;
  if (r.mobilite > moitie) return "Ma séance mobilité";
  if (r.cardio > moitie) return "Ma séance cardio";
  if (r.haut > 0 && r.bas > 0) return "Ma séance full body";
  if (r.bas > 0 && r.bas >= r.haut) return "Mon bas du corps";
  if (r.haut > 0) return "Mon haut du corps";
  if (r.abdos > 0) return "Mes abdos";
  return "Ma séance";
}

/** Le type de séance déduit de la sélection (l'utilisateur peut le changer). */
export function categorieDepuisExercices(
  exos: LibExercise[],
): "force" | "cardio" | "mobilite" | "fullbody" {
  if (!exos.length) return "force";
  const r = repartition(exos);
  const moitie = r.total / 2;
  if (r.mobilite > moitie) return "mobilite";
  if (r.cardio > moitie) return "cardio";
  if (r.haut > 0 && r.bas > 0) return "fullbody";
  return "force";
}
