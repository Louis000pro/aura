/* ════════════════════════════════════════════════════════════════════
   Les chiffres que la landing affiche au public.

   Ils étaient écrits en dur dans `LandingStory`, avec un TODO qui demandait
   de les dériver. Deux des trois le sont maintenant, et le troisième ne peut
   pas l'être proprement. Le détail compte, parce qu'un chiffre faux sur la
   page d'accueil est le pire endroit où se tromper.

   ⚠️ Ce module importe les tableaux de données complets (les 26 mini-cours
   contiennent le texte intégral des articles). Il ne doit donc JAMAIS être
   importé depuis un composant client : il vit dans la coquille serveur de
   l'accueil (`app/page.tsx`), qui passe les nombres en props. Les données
   restent côté serveur, seuls trois entiers traversent.
   ════════════════════════════════════════════════════════════════════ */

import { ADVICE_ARTICLES } from "./adviceArticles";
import { EXERCISE_LIBRARY } from "./exerciseLibrary";
import { RECIPES } from "./recipeBank";
import { fichesPubliees } from "./exercicesPublics";

/**
 * Le catalogue de séances, lui, n'est pas dérivable aujourd'hui : il vit dans
 * `workoutSessions`, un tableau interne à `app/progression/page.tsx` qui n'est
 * pas exporté, dans un composant de page de 2 800 lignes. L'importer depuis
 * ailleurs tirerait tout l'écran Entraînement dans la landing.
 *
 * Le nombre a donc été recompté sur la source, le 2026-08-10 : **53 `id`
 * uniques** dans le tableau littéral `workoutSessions`. Les 26 mini-cours n'y
 * sont pas comptés : ils arrivent par un `...ADVICE_ARTICLES` étalé dans le
 * même tableau, et ils ont leur propre chiffre ci-dessous.
 *
 * Pour le revérifier : isoler le tableau depuis `const workoutSessions:
 * WorkoutSession[] = [` jusqu'à son crochet fermant (en comptant les
 * crochets, pas en cherchant le premier `]` : l'annotation de type en
 * contient un), puis compter les `id: "…"` distincts.
 *
 * À revérifier à chaque vague de contenu. Le jour où le catalogue sortira de
 * la page vers un module de données, cette constante devra disparaître au
 * profit d'un `.length`.
 */
const SEANCES_CATALOGUE = 53;

export type ChiffresPublics = {
  /** Séances guidées du catalogue permanent. Compté à la main, voir ci-dessus. */
  seances: number;
  /** Mini-cours de « Conseils & progresser » : 16 gratuits + 10 Premium. */
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
  miniCours: ADVICE_ARTICLES.length,
  mouvements: EXERCISE_LIBRARY.length,
  recettes: RECIPES.length,
  fiches: fichesPubliees().length,
};
