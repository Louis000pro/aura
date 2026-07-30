/* ════════════════════════════════════════════════════════════════════
   Le récap de mise à jour : qui l'a vu, et comment le rouvrir.

   Tout est CÔTÉ CLIENT, comme les annonces de la cloche : rien en base,
   aucune ligne par utilisateur, donc rien à coller dans Supabase et
   aucun risque RLS. Le repère est posé PAR COMPTE, parce que deux
   personnes peuvent se connecter sur le même téléphone.

   Pour la vague suivante : changer ID_VAGUE. Ne JAMAIS réutiliser la
   clé précédente, sinon ceux qui ont vu celle-ci rateraient la suivante.
   ════════════════════════════════════════════════════════════════════ */

export const ID_VAGUE = "2026_07";

const CLE = `vaiiya_maj_vue_${ID_VAGUE}`;
export const EVENEMENT_OUVRIR = "vaiiya:ouvrir-nouveautes";

function comptes(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const brut = window.localStorage.getItem(CLE);
    return brut ? (JSON.parse(brut) as string[]) : [];
  } catch {
    return [];
  }
}

/** Ce compte a-t-il déjà vu le récap de cette vague ? */
export function dejaVue(userId: string): boolean {
  return comptes().includes(userId);
}

/** Le récap a été vu : la croix et le bouton appellent tous les deux ceci.
 *  Un popup qui revient parce qu'on l'a fermé par la croix serait pire
 *  que pas de popup du tout. */
export function marquerVue(userId: string): void {
  if (typeof window === "undefined") return;
  try {
    const liste = comptes();
    if (liste.includes(userId)) return;
    window.localStorage.setItem(CLE, JSON.stringify([...liste, userId]));
  } catch {
    /* stockage privé bloqué : le récap se remontrera, ce n'est pas grave */
  }
}

/** Rouvrir le récap à la demande (Paramètres, carte de la cloche). */
export function ouvrirNouveautes(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(EVENEMENT_OUVRIR));
}
