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

   Une surface applicative garde sa navigation, inchangée.

   ⚠️ Le rail desktop EST concerné, contrairement à ce que disait ce
   fichier. Il était rendu sans condition, donc une page vitrine
   affichait un rail applicatif à gauche d'un en-tête qui invite à créer
   un compte : les deux se contredisent exactement comme sur mobile.

   ── Pourquoi DEUX listes ────────────────────────────────────────────
   Parce que les pages n'ont pas toutes la même vie.

   Les pages vitrine (fiches d'exercices, pages SEO, /a-propos) rendent
   le même gabarit pour tout le monde : le serveur ne regarde pas qui
   demande, et elles n'ont aucune porte d'entrée depuis l'application,
   sinon le pied de page vitrine. Un membre qui y arrive en ressort par
   le logo de l'en-tête, qui pointe vers « / ». Elles sont donc vitrine
   quel que soit le visiteur, et c'est ce qui leur évite tout
   scintillement : leur réponse ne dépend pas d'une session à résoudre.

   Les autres sont à double vie. /premium se lit depuis Paramètres,
   les pages légales aussi, et « / » EST l'accueil de l'application dès
   qu'on a un compte. Leur retirer la navigation pour un membre le
   priverait de ses déplacements au milieu de son propre parcours, et
   /premium n'a même pas de bouton retour : dans la PWA installée, sans
   barre du bas ni chrome de navigateur, on y serait enfermé. Elles ne
   sont donc publiques que pour un visiteur non connecté, ce qui est
   exactement la personne pour qui ce chantier existe.

   ⚠️ /guides est volontairement absente : écran de revue interne
   (noindex), pas une surface publique.
   ⚠️ /rejoindre est volontairement absente : elle a déjà son propre
   traitement dans `Navigation` et `MainWrapper`, et le toucher demande
   un audit séparé du parcours d'invitation.
   ════════════════════════════════════════════════════════════════════ */

/** Vitrine pure, publique quel que soit le visiteur : ces pages passent toutes
    par `MarketingShell` ou `PageVitrine`, gabarits sans branche d'authentification. */
const PUBLIQUES_TOUJOURS = [
  "/exercices",
  "/a-propos",
  "/coach-ia",
  "/prise-de-masse",
  "/perte-de-poids",
  "/musculation-maison",
  "/nutrition-sportive",
];

/** À double vie : vitrine pour un visiteur, écran de l'app pour un membre. */
const PUBLIQUES_SI_ANONYME = [
  "/",
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

/** Vitrine pour tout le monde : la réponse ne dépend d'aucune session, donc
    elle est la même au rendu serveur et à chaque rendu client. C'est ce qui
    permet de ne rendre aucune chrome applicative du tout, sans scintillement. */
export function estVitrinePure(pathname: string): boolean {
  return couvre(PUBLIQUES_TOUJOURS, pathname);
}

/** À double vie. Le serveur ne peut pas savoir qui demande la page : il rend
    donc la version membre, et c'est la classe `a-session` (posée sur <html>
    avant le premier paint, voir le <head> du layout) qui la masque en CSS pour
    un visiteur anonyme. Même mécanique que la landing, et pour la même raison :
    trancher en JavaScript ferait apparaître le rail après coup. */
export function estVitrineSiAnonyme(pathname: string): boolean {
  return couvre(PUBLIQUES_SI_ANONYME, pathname);
}
