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

import { useSyncExternalStore } from "react";
import { indexRang, RANGS, type Rang } from "@/lib/aura";
import { publierEvenement } from "@/lib/evenementsFil";

export const EVENEMENT_RANG_MONTE = "aura:rang-monte";
/** Le rang mémorisé a changé (premier passage compris) : ce qui le montre se relit. */
export const EVENEMENT_RANG_CONNU = "aura:rang-connu";

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
  window.dispatchEvent(new Event(EVENEMENT_RANG_CONNU));

  if (vu === null) return; // premier passage : on mémorise, on ne fête pas
  // Rang mémorisé inconnu, ou descente : rien. Sans le premier test, un
  // identifiant inconnu valait -1, et même le Bronze passait pour une montée.
  if (indexRang(vu) < 0 || indexRang(rang.id) <= indexRang(vu)) return;

  // La montée se raconte aussi dans le fil des potes (une seule fois par rang).
  publierEvenement(userId, "rang", `rang:${rang.id}`, { rang: rang.id });

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

/**
 * Le dernier rang que CET appareil a vu pour ce compte, ou `null`.
 *
 * C'est ce que montrent les écrans qui n'ont pas l'aura sous la main : la
 * photo de l'accueil (son cadre) et la musique de fin de séance. Il est tenu
 * par `noterRang`, qu'appellent tous les écrans qui lisent l'aura en base :
 * jamais un rang deviné, au pire celui d'il y a quelques minutes.
 */
export function rangMemorise(userId: string | null | undefined): Rang | null {
  if (!userId || typeof window === "undefined") return null;
  try {
    const id = localStorage.getItem(cle(userId));
    return RANGS.find((r) => r.id === id) ?? null;
  } catch {
    return null;
  }
}

function abonner(rappel: () => void): () => void {
  window.addEventListener(EVENEMENT_RANG_CONNU, rappel);
  window.addEventListener("storage", rappel);
  return () => {
    window.removeEventListener(EVENEMENT_RANG_CONNU, rappel);
    window.removeEventListener("storage", rappel);
  };
}

/** Le rang mémorisé, suivi : `null` au rendu serveur et tant qu'aucun écran ne l'a lu. */
export function useRangMemorise(userId: string | null | undefined): Rang | null {
  const id = useSyncExternalStore(
    abonner,
    () => rangMemorise(userId)?.id ?? null,
    () => null,
  );
  return id ? RANGS.find((r) => r.id === id) ?? null : null;
}
