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
 * `true` si l'envoi est permis, `false` s'il faut refuser (429).
 * Chaque appel autorisé consomme un jeton.
 *
 * `usage` sépare les compteurs : demander trois codes de connexion ne doit pas
 * empêcher de demander ensuite une réinitialisation de mot de passe. Ce sont
 * deux besoins légitimes différents, chacun a son quota.
 */
export function autoriserEnvoiEmail(usage: string, email: string, maxParHeure = 3): boolean {
  const maintenant = Date.now();
  balayer(maintenant);

  const cle = `${usage}:${email.toLowerCase().trim()}`;
  const seau = seaux.get(cle);
  if (!seau || maintenant > seau.finFenetre) {
    seaux.set(cle, { envois: 1, finFenetre: maintenant + FENETRE_MS });
    return true;
  }
  if (seau.envois >= maxParHeure) return false;
  seau.envois++;
  return true;
}
