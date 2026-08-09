/* ════════════════════════════════════════════════════════════════════
   Les surfaces publiques : les routes qu'on sert à quelqu'un qui ne
   connaît pas encore Vaiiya.

   Une surface publique porte l'en-tête vitrine (logo + « Créer mon
   compte »), son contenu, son fil d'Ariane et son pied de page
   crawlable. Elle ne porte AUCUNE chrome applicative mobile : ni la
   barre du bas, ni la cloche flottante. Un visiteur arrivé depuis un
   moteur de recherche verrait sinon la navigation d'une application
   dans laquelle il n'est pas entré, juste sous un en-tête qui l'invite
   à créer un compte. Les deux se contredisent.

   Une surface applicative garde sa navigation, inchangée. Le rail
   desktop n'est jamais concerné : il ne s'agit ici que du mobile.

   ── Pourquoi DEUX listes ────────────────────────────────────────────
   Parce que les pages n'ont pas toutes la même vie.

   Les fiches d'exercices n'ont aucune porte d'entrée depuis
   l'application : personne n'y arrive en étant connecté, sinon par le
   pied de page vitrine. Elles sont publiques pour tout le monde.

   Les autres sont à double vie. /premium se lit depuis Paramètres,
   les pages légales aussi, et « / » EST l'accueil de l'application dès
   qu'on a un compte. Leur retirer la barre du bas pour un membre le
   priverait de sa navigation au milieu de son propre parcours, et
   /premium n'a pas de bouton retour : dans la PWA installée, sans barre
   du bas ni chrome de navigateur, on y serait enfermé. Elles ne sont
   donc publiques que pour un visiteur non connecté, ce qui est
   exactement la personne pour qui ce chantier existe.

   ⚠️ /guides est volontairement absente : écran de revue interne
   (noindex), pas une surface publique.
   ⚠️ /rejoindre est volontairement absente : elle a déjà son propre
   traitement dans `Navigation` et `MainWrapper`, et le toucher demande
   un audit séparé du parcours d'invitation.
   ════════════════════════════════════════════════════════════════════ */

/** Vitrine pure, publique quel que soit le visiteur. */
const PUBLIQUES_TOUJOURS = ["/exercices"];

/** À double vie : vitrine pour un visiteur, écran de l'app pour un membre. */
const PUBLIQUES_SI_ANONYME = [
  "/",
  "/coach-ia",
  "/prise-de-masse",
  "/perte-de-poids",
  "/musculation-maison",
  "/nutrition-sportive",
  "/premium",
  "/conditions",
  "/mentions-legales",
  "/confidentialite",
];

/** Une racine couvre ses sous-routes. « / » ne couvre que lui-même :
    `"/x".startsWith("//")` est faux, donc la racine du site ne peut pas
    avaler tout le reste par accident. */
function couvre(racines: string[], pathname: string): boolean {
  return racines.some((r) => pathname === r || pathname.startsWith(`${r}/`));
}

/** Vrai si ce chemin est servi au grand public plutôt qu'à l'application. */
export function estSurfacePublique(pathname: string, connecte: boolean): boolean {
  if (couvre(PUBLIQUES_TOUJOURS, pathname)) return true;
  return !connecte && couvre(PUBLIQUES_SI_ANONYME, pathname);
}
