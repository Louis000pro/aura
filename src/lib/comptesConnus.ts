/* ════════════════════════════════════════════════════════════════════
   Les comptes déjà connectés SUR CET APPAREIL (Louis, 2026-10-12).

   À la connexion, une fois l'email ou le pseudo reconnu, on montre la
   photo de profil de la personne au lieu d'une simple initiale.

   ⚠️ ON NE LA DEMANDE JAMAIS AU SERVEUR. Une route qui rendrait la photo
   pour un email tapé permettrait à n'importe qui de mettre un visage sur
   l'adresse de quelqu'un. On ne montre donc que ce que CET appareil a déjà
   vu : la photo est retenue quand quelqu'un y est connecté, et ressort
   seulement si l'on retape son email ou son pseudo.

   Le localStorage n'est qu'une commodité : s'il est vide ou bloqué, on
   retombe sur l'initiale.
   ════════════════════════════════════════════════════════════════════ */

type CompteConnu = { email: string; pseudo: string; avatar?: string };

const CLE = "vaiiya_comptes_connus";
const MAX = 5;

const norme = (v: string) => v.trim().toLowerCase();

function lire(): CompteConnu[] {
  try {
    const brut = localStorage.getItem(CLE);
    const liste = brut ? JSON.parse(brut) : [];
    return Array.isArray(liste) ? liste : [];
  } catch {
    return [];
  }
}

/** Retient le compte connecté (le plus récent en tête, cinq au plus). */
export function retenirCompte(c: CompteConnu): void {
  if (!c.email) return;
  try {
    const autres = lire().filter((x) => norme(x.email) !== norme(c.email));
    localStorage.setItem(CLE, JSON.stringify([c, ...autres].slice(0, MAX)));
  } catch { /* stockage bloqué : rien à retenir */ }
}

/** Le compte déjà vu sur cet appareil pour cet email OU ce pseudo. */
export function compteConnu(identifiant: string): CompteConnu | null {
  const id = norme(identifiant.replace(/^@/, ""));
  if (!id) return null;
  return lire().find((x) => norme(x.email) === id || norme(x.pseudo) === id) ?? null;
}
