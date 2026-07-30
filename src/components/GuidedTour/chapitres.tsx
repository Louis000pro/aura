"use client";

/* ════════════════════════════════════════════════════════════════════
   Les CHAPITRES de la visite — la source unique de son contenu.

   Ajouter / retirer / réordonner un chapitre = une entrée ici. La coque
   (GuidedTour.tsx) ne connaît rien du contenu : elle compte, elle anime,
   elle laisse passer. Aucune ancre DOM, aucune navigation de page : la
   visite ne peut plus se casser quand un écran de l'app change.

   Ton : on montre ce que l'appli FAIT, jamais ce que l'utilisateur DOIT
   faire. Zéro culpabilisation, une seule idée par écran, une phrase.

   L'accent de chaque chapitre respecte les 3 rôles du système D :
   violet = action / marque, orange = énergie, teal = corps & progrès.
   ════════════════════════════════════════════════════════════════════ */

import {
  SceneOuverture,
  SceneTunnel,
  SceneCatalogue,
  SceneAssistant,
  SceneNutrition,
  SceneRang,
  SceneRelais,
  SceneRepere,
  SceneFinal,
  VIOLET,
  MAGENTA,
  OR,
  OR_CLAIR,
  TEAL,
} from "@/components/GuidedTour/scenes";

export type Chapitre = {
  id: string;
  /** "ouverture" et "final" n'affichent ni surtitre ni compteur. */
  variante?: "ouverture" | "final";
  /** Surtitre court : où l'on se trouve dans Vaiiya. */
  surtitre?: string;
  titre: string;
  texte: string;
  /** Libellé du bouton d'avance (défaut : « Suivant »). */
  cta?: string;
  /** Dégradé du surtitre et du liseré de la scène. */
  accent: [string, string];
  Scene: (props: { pseudo: string }) => React.ReactNode;
};

export const CHAPITRES: Chapitre[] = [
  {
    id: "ouverture",
    variante: "ouverture",
    titre: "Voici ton espace",
    texte:
      "Une minute pour voir ce que Vaiiya sait faire. Tu peux passer, la visite t'attendra dans tes paramètres.",
    cta: "Faire le tour",
    accent: [VIOLET, OR_CLAIR],
    Scene: SceneOuverture,
  },

  {
    id: "seance",
    surtitre: "La séance",
    titre: "Elle se conduit toute seule",
    texte:
      "Le mouvement s'anime à l'écran, le compte à rebours part, le repos s'enchaîne. Tu n'as qu'à suivre. Cent-deux mouvements sont dessinés, pas un seul n'est une photo prise au hasard.",
    accent: [VIOLET, MAGENTA],
    Scene: SceneTunnel,
  },

  {
    id: "catalogue",
    surtitre: "Le catalogue",
    titre: "Cinquante-trois séances, et les tiennes",
    texte:
      "Sans matériel, à la salle, mobilité, cardio, récupération. Vingt-six mini-cours pour comprendre ce que tu fais. Et si rien ne te va, tu pioches parmi les mouvements animés pour composer la tienne.",
    accent: [VIOLET, MAGENTA],
    Scene: SceneCatalogue,
  },

  {
    id: "assistant",
    surtitre: "L'étincelle",
    titre: "Elle parle et elle agit",
    texte:
      "Demande-lui de poser une séance jeudi, de noter ton repas, de refaire ta semaine : elle le prépare dans la foulée. Rien ne s'enregistre tant que tu n'as pas touché la carte.",
    accent: [VIOLET, OR_CLAIR],
    Scene: SceneAssistant,
  },

  {
    id: "nutrition",
    surtitre: "La nutrition",
    titre: "On part de ta réalité",
    texte:
      "Pas de tableau à remplir : on te demande simplement où tu manges. À la maison, au resto, ou un sandwich acheté en chemin. Une photo de ton assiette suffit à estimer le reste.",
    accent: [OR, "#E8620C"],
    Scene: SceneNutrition,
  },

  {
    id: "rang",
    surtitre: "Ton rang",
    titre: "Chaque geste compte",
    texte:
      "Une présence, une séance, un repas : tout se transforme en EXP et fait monter ta gemme. On mesure ta constance, jamais ton corps, et il n'y a aucun classement.",
    accent: [TEAL, "#7DE8C4"],
    Scene: SceneRang,
  },

  {
    id: "relais",
    surtitre: "Le relais",
    titre: "Une affiche qui se gagne à deux",
    texte:
      "Invite quelqu'un, un maillon chacun son tour. À chaque séance l'image se dévoile un peu plus, jusqu'à être entière. Aucun score, et on ne nomme jamais celui qui a lâché.",
    accent: [OR_CLAIR, OR],
    Scene: SceneRelais,
  },

  {
    id: "repere",
    surtitre: "Ton repère",
    titre: "Tout tient dans la barre du bas",
    texte:
      "Ton accueil, tes entraînements, ta nutrition, tes discussions. Et l'étincelle au centre, disponible depuis n'importe quel écran.",
    accent: [VIOLET, MAGENTA],
    Scene: SceneRepere,
  },

  {
    id: "final",
    variante: "final",
    titre: "À toi de jouer",
    texte:
      "Commence par ce que tu veux. Si tu ne sais pas, touche l'étincelle et dis-lui simplement ce que tu as envie de faire aujourd'hui.",
    cta: "Entrer dans Vaiiya",
    accent: [VIOLET, OR_CLAIR],
    Scene: SceneFinal,
  },
];
