"use client";

/* ════════════════════════════════════════════════════════════════════
   Les CHAPITRES de la visite — la source unique de son contenu.

   Ajouter / retirer / réordonner un chapitre = une entrée ici. La coque
   (GuidedTour.tsx) ne connaît rien du contenu : elle compte, elle anime,
   elle laisse passer. Aucune ancre DOM, aucune navigation de page : la
   visite ne peut plus se casser quand un écran de l'app change.

   Ton : on montre ce que l'appli FAIT, jamais ce que l'utilisateur DOIT
   faire. Zéro culpabilisation, une seule idée par écran, une phrase.

   ⚠️ LE TEXTE D'UN CHAPITRE N'EST PAS ICI, IL EST DANS `guides.ts`.
   C'est le Guide qui fait la visite depuis le 2026-08-29 : le mot
   « guidée » était dans le nom depuis toujours, et pourtant neuf
   chapitres parlaient d'une voix qui n'appartenait à personne, juste
   après qu'on ait choisi Nora ou Sasha. La clé se DÉDUIT de l'id
   (`visite.<id>`), donc un chapitre sans phrase ne compile pas, et
   personne ne peut réintroduire un texte en dur dans l'écran.

   Ce qui reste ici : la STRUCTURE de la visite (quels chapitres, dans
   quel ordre, avec quelle scène, quel accent et quel visage). Le
   surtitre et le titre restent aussi : ce sont des en-têtes d'écran, les
   mêmes pour les deux Guides, et rien n'y varie.

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
import type { CleVoix, EtatGuide, GuideRef } from "@/lib/guides";

/** L'id d'un chapitre EST la fin de sa clé de phrase. Le type l'exige :
 *  ajouter un chapitre sans écrire sa réplique dans `guides.ts` est une
 *  erreur de compilation, pas une découverte en production. */
type Court<T> = T extends `visite.${infer S}` ? S : never;

export type Chapitre = {
  id: Court<CleVoix>;
  /** "ouverture" et "final" n'affichent ni surtitre ni compteur. */
  variante?: "ouverture" | "final";
  /** Surtitre court : où l'on se trouve dans Vaiiya. */
  surtitre?: string;
  titre: string;
  /** Le visage du Guide pendant ce chapitre. Il est DÉCLARÉ, jamais
   *  déduit du texte : une visite est une présentation, donc `explain`
   *  partout, sauf l'accueil (`welcome`) et la sortie (`encourage`). */
  visage: EtatGuide;
  /** Libellé du bouton d'avance (défaut : « Suivant »). */
  cta?: string;
  /** Dégradé du surtitre et du liseré de la scène. */
  accent: [string, string];
  Scene: (props: { pseudo: string; guide: GuideRef }) => React.ReactNode;
};

export const CHAPITRES: Chapitre[] = [
  {
    id: "ouverture",
    visage: "welcome",
    variante: "ouverture",
    titre: "Voici ton espace",
    cta: "Faire le tour",
    accent: [VIOLET, OR_CLAIR],
    Scene: SceneOuverture,
  },

  {
    id: "seance",
    visage: "explain",
    surtitre: "La séance",
    titre: "Elle se conduit toute seule",
    accent: [VIOLET, MAGENTA],
    Scene: SceneTunnel,
  },

  {
    id: "catalogue",
    visage: "explain",
    surtitre: "Le catalogue",
    titre: "Cinquante-trois séances, et les tiennes",
    accent: [VIOLET, MAGENTA],
    Scene: SceneCatalogue,
  },

  {
    id: "assistant",
    visage: "explain",
    surtitre: "L'étincelle",
    titre: "Elle parle et elle agit",
    accent: [VIOLET, OR_CLAIR],
    Scene: SceneAssistant,
  },

  {
    id: "nutrition",
    visage: "explain",
    surtitre: "La nutrition",
    titre: "On part de ta réalité",
    accent: [OR, "#E8620C"],
    Scene: SceneNutrition,
  },

  {
    id: "rang",
    visage: "explain",
    surtitre: "Ton rang",
    titre: "Chaque geste compte",
    accent: [TEAL, "#7DE8C4"],
    Scene: SceneRang,
  },

  {
    id: "relais",
    visage: "explain",
    surtitre: "Le relais",
    titre: "Une affiche qui se gagne à deux",
    accent: [OR_CLAIR, OR],
    Scene: SceneRelais,
  },

  {
    id: "repere",
    visage: "explain",
    surtitre: "Ton repère",
    titre: "Tout tient dans la barre du bas",
    accent: [VIOLET, MAGENTA],
    Scene: SceneRepere,
  },

  {
    id: "final",
    visage: "encourage",
    variante: "final",
    titre: "À toi de jouer",
    cta: "Entrer dans Vaiiya",
    accent: [VIOLET, OR_CLAIR],
    Scene: SceneFinal,
  },
];
