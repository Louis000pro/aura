/* ════════════════════════════════════════════════════════════════════
   Les chiffres que la landing affiche au public.

   Ils étaient écrits en dur dans l’ancienne `LandingStory`, avec un TODO qui demandait
   de les dériver. Deux des trois le sont maintenant, et le troisième ne peut
   pas l'être proprement. Le détail compte, parce qu'un chiffre faux sur la
   page d'accueil est le pire endroit où se tromper.

   ⚠️ Ce module importe les tableaux de données complets (les mini-cours
   contiennent le texte intégral des articles). Il ne doit donc JAMAIS être
   importé depuis un composant client : il vit dans la coquille serveur de
   l'accueil (`app/page.tsx`), qui passe les nombres en props. Les données
   restent côté serveur, seuls trois entiers traversent.
   ════════════════════════════════════════════════════════════════════ */

import { ADVICE_ARTICLES } from "./adviceArticles";
import { workoutSessions } from "./catalogueSeances";
import { COURS } from "./coursNutrition";
import { EXERCISE_LIBRARY } from "./exerciseLibrary";
import { RECIPES } from "./recipeBank";
import { fichesPubliees } from "./exercicesPublics";

/**
 * Les séances du catalogue, comptées sur `workoutSessions`
 * (lib/catalogueSeances.ts). Il était écrit à la main (53, recompté le
 * 2026-08-10) tant que le catalogue vivait dans l'écran Entraînement ; il
 * en est sorti, donc il se compte. Les mini-cours étalés dans le même
 * tableau n'y entrent pas : ils ont leur propre chiffre ci-dessous.
 * 80 séances le 2026-10-27, avec les séances par zone (vague 7), puis 111
 * le 2026-10-28 avec les formats (vague 8).
 */
const SEANCES_CATALOGUE = workoutSessions.filter((s) => s.contentType !== "article").length;

export type ChiffresPublics = {
  /** Séances guidées du catalogue permanent. Compté à la main, voir ci-dessus. */
  seances: number;
  /** Mini-cours : ceux de « Conseils & progresser » (21 au 2026-10-26 : 13 gratuits,
   *  8 Vaiiya+) et les cours de nutrition (62 : 43 gratuits, 19 Vaiiya+). L'index
   *  des cours de nutrition ne porte pas leurs textes : il ne pèse rien ici. */
  miniCours: number;
  /** Mouvements de la bibliothèque, tous animés par un personnage-guide. */
  mouvements: number;
  /** Recettes écrites et photographiées de la banque. */
  recettes: number;
  /** Fiches d'exercices publiques réellement rédigées et publiées. */
  fiches: number;
};

export const CHIFFRES_PUBLICS: ChiffresPublics = {
  seances: SEANCES_CATALOGUE,
  miniCours: ADVICE_ARTICLES.length + COURS.length,
  mouvements: EXERCISE_LIBRARY.length,
  recettes: RECIPES.length,
  fiches: fichesPubliees().length,
};
