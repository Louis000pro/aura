// ─────────────────────────────────────────────────────────────────────────────
// La célébration de passage de rang
//
// Zéro backend : le dernier rang VU est mémorisé en localStorage, par compte
// (appareil partagé). Chaque écran qui calcule déjà l'aura appelle `noterRang`
// avec le rang frais ; si c'est une montée, un évènement part et l'overlay monté
// dans le layout (`CelebrationRang`) joue la scène. Rien de plus.
//
// Deux garde-fous qui comptent :
//   • pas de flag mémorisé (premier passage après la mise en ligne) → on écrit
//     en silence, on ne fête rien. Sinon TOUT LE MONDE recevrait une célébration
//     à sa première ouverture, pour un rang gagné il y a des semaines.
//   • on ne fête QUE la montée. Une EXP qui redescend (donnée corrigée, action
//     supprimée) n'est pas un évènement, et sûrement pas un reproche.
// ─────────────────────────────────────────────────────────────────────────────

import { indexRang, type Rang } from "@/lib/aura";

export const EVENEMENT_RANG_MONTE = "aura:rang-monte";

export type DetailRangMonte = { rangId: string };

/** Clé par compte : sur un appareil partagé, le rang de l'un ne fête pas l'autre. */
const cle = (userId: string) => `aura_rang_vu_${userId}`;

/**
 * Enregistre le rang courant et, si c'est une montée par rapport au dernier rang
 * vu, déclenche la célébration. Sans effet côté serveur, sans effet au premier
 * passage. À appeler avec le rang FRAIS (pas une valeur de cache d'affichage).
 */
export function noterRang(userId: string, rang: Rang): void {
  if (typeof window === "undefined") return;

  let vu: string | null;
  try {
    vu = localStorage.getItem(cle(userId));
  } catch {
    return; // stockage refusé (navigation privée) : on ne fête rien, on ne casse rien
  }

  if (vu === rang.id) return;

  try {
    localStorage.setItem(cle(userId), rang.id);
  } catch {
    /* ignore */
  }

  if (vu === null) return; // premier passage : on mémorise, on ne fête pas
  if (indexRang(rang.id) <= indexRang(vu)) return; // descente ou rang inconnu : rien

  window.dispatchEvent(
    new CustomEvent<DetailRangMonte>(EVENEMENT_RANG_MONTE, { detail: { rangId: rang.id } }),
  );
}

/**
 * Rejoue la scène sans toucher au rang mémorisé (revue admin). Un délai laisse
 * la feuille des rangs finir sa fermeture avant que la célébration n'arrive.
 */
export function rejouerCelebration(rangId: string): void {
  if (typeof window === "undefined") return;
  window.setTimeout(() => {
    window.dispatchEvent(
      new CustomEvent<DetailRangMonte>(EVENEMENT_RANG_MONTE, { detail: { rangId } }),
    );
  }, 260);
}
