/* ════════════════════════════════════════════════════════════════════
   Les personnages-guides, rangés par thème.

   Deux écrans lisent ce fichier :
     • la galerie /guides            (toutes les animations en grille)
     • les séances « Défi Animations » (progression/page.tsx pour la fiche,
       WorkoutGuideModal.tsx pour le contenu), retirées du catalogue public
       le 2026-07-26 mais conservées comme source de revue.

   Les noms ne sont PLUS écrits ici : ils viennent de EXERCISE_LIBRARY
   (src/lib/exerciseLibrary.ts), la bibliothèque que l’on parcourt aussi en
   créant une séance perso. C’est la suite logique de la leçon écrite ici
   même : ce fichier existait déjà parce que la liste avait été recopiée
   dans deux écrans et avait divergé (la galerie figée à 55 exos pendant
   que les séances montaient à 101). Une troisième copie pour l’écran de
   création aurait refait exactement la même chose.

   Ajouter un sprite = `npm run guides`, sa règle dans exerciseGuides.ts,
   puis son entrée dans exerciseLibrary.ts. Les trois écrans suivent.
   ════════════════════════════════════════════════════════════════════ */

import { EXERCISE_LIBRARY, type SectionGuide } from "./exerciseLibrary";

export type GuideSection = {
  /** Suffixe de l'id de séance : « corps » → séance « defi-anim-corps ». */
  id: string;
  title: string;
  /** Le sous-titre de la fiche au catalogue. */
  subtitle: string;
  items: string[];
};

const nomsDe = (sec: SectionGuide) =>
  EXERCISE_LIBRARY.filter(e => e.section === sec).map(e => e.name);

export const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: "corps",
    title: "Poids du corps & HIIT",
    subtitle: "Sans matériel, les gestes de base et l’explosif",
    items: nomsDe("corps"),
  },
  {
    id: "abdos",
    title: "Gainage & abdos",
    subtitle: "Le centre du corps, tenues et mouvements",
    items: nomsDe("abdos"),
  },
  {
    id: "machines",
    title: "Machines & cardio",
    subtitle: "Poulies, machines guidées et cardio de salle",
    items: nomsDe("machines"),
  },
  {
    id: "barre",
    title: "Haltères & barre",
    subtitle: "La fonte, des basiques aux variantes",
    items: nomsDe("barre"),
  },
  {
    id: "mobilite",
    title: "Mobilité & étirements",
    subtitle: "La descente : s’ouvrir, relâcher, respirer",
    items: nomsDe("mobilite"),
  },
];

/** L'id de séance d'une section, le catalogue et le tunnel s'accordent ici. */
export const sectionSessionId = (s: GuideSection) => `defi-anim-${s.id}`;
