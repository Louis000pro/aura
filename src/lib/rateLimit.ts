/**
 * Limite d'envois d'e-mail par adresse, en mémoire du serveur.
 *
 * Le compteur vit dans le processus : un redémarrage ou une seconde instance
 * Vercel repart de zéro. C'est assumé, ce n'est PAS une frontière de sécurité.
 * Le but est d'éviter qu'un formulaire cliqué en boucle (ou un script bête)
 * n'inonde une boîte mail et ne brûle le quota Resend, pas d'arrêter une
 * attaque distribuée. Le vrai garde-fou d'une attaque, c'est le fournisseur.
 *
 * Les entrées expirées sont balayées au passage, sinon la Map grossit sans
 * fin sur un serveur qui tourne longtemps.
 */

const FENETRE_MS = 60 * 60 * 1000; // une heure

type Seau = { envois: number; finFenetre: number };
const seaux = new Map<string, Seau>();
let dernierBalayage = 0;

function balayer(maintenant: number) {
  if (maintenant - dernierBalayage < FENETRE_MS) return;
  dernierBalayage = maintenant;
  for (const [cle, seau] of seaux) if (seau.finFenetre < maintenant) seaux.delete(cle);
}

/**
 * Le compteur générique. `true` si l'appel est permis, `false` s'il faut
 * refuser. Chaque appel autorisé consomme un jeton.
 *
 * `usage` sépare les compteurs : demander trois codes de connexion ne doit pas
 * empêcher de demander ensuite une réinitialisation de mot de passe. Ce sont
 * deux besoins légitimes différents, chacun a son quota.
 *
 * `cle` est ce qu'on compte (une adresse e-mail, une IP). Elle n'est ni
 * journalisée ni renvoyée, elle ne sert qu'à indexer le seau en mémoire.
 */
export function autoriserRafale(
  usage: string,
  cle: string,
  max: number,
  fenetreMs: number = FENETRE_MS,
): boolean {
  const maintenant = Date.now();
  balayer(maintenant);

  const index = `${usage}:${cle}`;
  const seau = seaux.get(index);
  if (!seau || maintenant > seau.finFenetre) {
    seaux.set(index, { envois: 1, finFenetre: maintenant + fenetreMs });
    return true;
  }
  if (seau.envois >= max) return false;
  seau.envois++;
  return true;
}

/**
 * Envoi d'e-mail : le cas historique, inchangé (même seau, même fenêtre d'une
 * heure, même normalisation de l'adresse).
 */
export function autoriserEnvoiEmail(usage: string, email: string, maxParHeure = 3): boolean {
  return autoriserRafale(usage, email.toLowerCase().trim(), maxParHeure, FENETRE_MS);
}
