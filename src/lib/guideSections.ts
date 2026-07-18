/* ════════════════════════════════════════════════════════════════════
   Les personnages-guides, rangés par thème — SOURCE UNIQUE.

   Deux écrans lisent ce fichier :
     • la galerie /guides            (toutes les animations en grille)
     • les séances « Défi Animations » du catalogue (progression/page.tsx
       pour la fiche, WorkoutGuideModal.tsx pour le contenu)

   Ils avaient chacun leur copie de la liste, et elles ont divergé dès la
   vague suivante (la galerie est restée à 55 exos pendant que les séances
   montaient à 101). D'où ce module : on ajoute un sprite ICI, une fois,
   et les deux écrans suivent.

   Chaque libellé est un NOM D'EXO qui doit résoudre vers son sprite via
   les règles de src/lib/exerciseGuides.ts. Un nom qui n'y résout pas
   retombe sur le halo — donc on ne liste que des exos qui ont leur planche.

   ⚠️ Les séances « Défi » sont TEMPORAIRES : elles existent pour que Louis
   vérifie chaque vague d'animations sur mobile, dans le vrai tunnel. On les
   retire du catalogue à la mise à jour, une fois le site renouvelé. La
   galerie /guides, elle, reste.
   ════════════════════════════════════════════════════════════════════ */

export type GuideSection = {
  /** Suffixe de l'id de séance : « corps » → séance « defi-anim-corps ». */
  id: string;
  title: string;
  /** Le sous-titre de la fiche au catalogue. */
  subtitle: string;
  items: string[];
};

export const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: "corps",
    title: "Poids du corps & HIIT",
    subtitle: "Sans matériel — les gestes de base et l'explosif",
    items: [
      "Squat", "Pompes", "Fentes", "Squats sautés", "Fentes sautées",
      "Pike push-ups", "Pompes diamant", "Pompes inclinées", "Dips sur chaise",
      "Tractions", "Rowing inversé", "Burpees", "Mountain climbers",
      "Jumping jacks", "Montées de genoux", "Corde à sauter", "Chaise au mur",
      "Pompes explosives", "Box jump", "Skaters", "Sprint sur place",
      "Bear crawl", "Step up banc", "Donkey kick", "Dips barres parallèles",
    ],
  },
  {
    id: "abdos",
    title: "Gainage & abdos",
    subtitle: "Le centre du corps — tenues et mouvements",
    items: [
      "Gainage", "Planche latérale", "Gainage dynamique", "Crunch", "Superman",
      "Bird dog", "Dead bug", "Hollow hold", "Relevés de jambes", "Russian twist",
      "Sit-ups", "Reverse crunch", "Bicycle crunch", "V-ups",
      "Extensions lombaires banc",
    ],
  },
  {
    id: "machines",
    title: "Machines & cardio",
    subtitle: "Poulies, machines guidées et cardio de salle",
    items: [
      "Presse à cuisses", "Leg extension", "Leg curl assis", "Leg curl allongé",
      "Abducteurs machine", "Hip thrust machine", "Pont fessier", "Pec deck",
      "Développé épaules machine", "Dips machine", "Tirage poitrine",
      "Rowing assis poulie", "Face pull poulie", "Écarté à la poulie",
      "Mollets assis", "Kickback fessier poulie",
      "Rameur", "Tapis de course", "Vélo",
    ],
  },
  {
    id: "barre",
    title: "Haltères & barre",
    subtitle: "La fonte — des basiques aux variantes",
    items: [
      "Développé couché", "Développé incliné haltères", "Développé militaire haltères",
      "Oiseau haltères", "Élévations latérales", "Curl haltères", "Curl marteau",
      "Curl barre EZ", "Extension triceps haltère", "Extension triceps poulie",
      "Rowing barre", "Rowing haltère", "Tirage menton haltères",
      "Soulevé de terre roumain", "Mollets", "Squat bulgare",
      "Développé couché haltères", "Élévations frontales", "Kettlebell swing",
      "Rowing buste penché haltères", "Squat barre", "Overhead squat",
      "Goblet squat", "Soulevé de terre classique", "Développé Arnold",
      "Pullover haltère", "Thruster haltères",
    ],
  },
  {
    id: "mobilite",
    title: "Mobilité & étirements",
    subtitle: "La descente — s'ouvrir, relâcher, respirer",
    items: [
      "Cercles de hanches", "Cat-cow", "Downward dog / cobra", "Thread the needle",
      "World's greatest stretch", "Pigeon", "Papillon hanches", "Posture de l'enfant",
      "Torsion allongée", "Étirement chaîne postérieure", "Étirement quadriceps",
      "Étirement mollet au mur", "Étirement pectoraux au mur", "Ouverture des épaules",
      "Étirement du cou", "Cohérence cardiaque",
    ],
  },
];

/** L'id de séance d'une section — le catalogue et le tunnel s'accordent ici. */
export const sectionSessionId = (s: GuideSection) => `defi-anim-${s.id}`;

/** Tous les exos animés, tous thèmes confondus (pour un compteur). */
export const ALL_GUIDE_NAMES = GUIDE_SECTIONS.flatMap(s => s.items);
