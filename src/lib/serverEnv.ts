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
