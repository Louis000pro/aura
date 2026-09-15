/**
 * Lecture des variables d'environnement côté serveur.
 *
 * Pourquoi ce fichier existe : `cleanEnv` était recopié à l'identique dans
 * sept routes API. Le nettoyage n'est pas cosmétique, il répare un vrai
 * incident : une valeur collée depuis un tableau de bord traîne souvent un
 * espace insécable, un retour à la ligne ou un guillemet typographique, et la
 * clé refusée n'a alors AUCUN symptôme lisible (juste un 401 du fournisseur).
 * On ne garde donc que l'ASCII imprimable, et on coupe les bords.
 */

/** Valeur d'environnement débarrassée des caractères invisibles. */
export function cleanEnv(val: string | undefined): string {
  return (val ?? "").replace(/[^\x20-\x7E]/g, "").trim();
}

/**
 * Secret de signature des codes à usage unique (OTP).
 *
 * Il ne sert PAS à next-auth : Vaiiya s'authentifie via Supabase. C'est la clé
 * HMAC qui scelle le jeton d'un code envoyé par e-mail, pour que
 * `verify-otp` sache que le code vient bien de `send-otp` et n'a pas été
 * fabriqué. Sans elle on ne signe rien, donc on refuse de démarrer.
 */
export function getAuthSecret(): Buffer {
  const secret = cleanEnv(process.env.AUTH_SECRET);
  if (!secret) throw new Error("AUTH_SECRET manquant, configuration serveur requise");
  return Buffer.from(secret, "utf8");
}

/**
 * L'adresse publique de Vaiiya, pour tout ce qui doit fabriquer un lien absolu
 * côté serveur (e-mails, retours Stripe, appel de notre propre route de push).
 *
 * ⚠️ IL Y AVAIT QUATRE LECTURES DE `NEXT_PUBLIC_APP_URL` ET TROIS REPLIS
 * DIFFÉRENTS, dont deux faux. Le pire partait chez de vrais utilisateurs :
 * l'e-mail de demande d'ami retombait sur `https://aura.app`, un domaine qui
 * n'est pas le nôtre, donc ses deux liens étaient morts. Le second,
 * `http://localhost:3000` dans `sendPushToUser`, fait que la notification
 * d'évènement s'envoie à une adresse injoignable depuis un serveur, et la
 * fonction avale son échec : plus aucun push, sans un mot. Les deux routes
 * Stripe, elles, avaient le bon repli. Un seul endroit désormais.
 */
export function appUrl(): string {
  const url = cleanEnv(process.env.NEXT_PUBLIC_APP_URL);
  if (url) return url.replace(/\/+$/, "");
  /* Hors production, c'est bien la machine de développement qu'on veut joindre :
     un lien d'e-mail comme un appel à notre propre route de push doivent rester
     locaux, sinon un serveur de développement enverrait ses notifications à la
     production. C'est le seul repli que `sendPushToUser` avait de juste ; on le
     garde, mais borné à ce cas au lieu de valoir partout. */
  return process.env.NODE_ENV === "production" ? "https://vaiiya.fr" : "http://localhost:3000";
}

/**
 * Le contact que les services de push (Google, Apple, Mozilla) voient dans nos
 * requêtes VAPID, et par lequel ils nous joignent en cas d'abus.
 *
 * ⚠️ Deux replis coexistaient pour la même chose : le rappel du soir donnait
 * `bonjour@vaiiya.fr`, la route de push `contact@aura.app` — une adresse qui
 * n'existe pas, sur un domaine qui n'est pas le nôtre. Deux identités pour un
 * même émetteur, dont une injoignable, c'est exactement ce qui fait
 * déprioriser des notifications sans qu'on sache pourquoi.
 */
export function sujetVapid(): string {
  return cleanEnv(process.env.VAPID_SUBJECT) || "mailto:bonjour@vaiiya.fr";
}
