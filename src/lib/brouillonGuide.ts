/* Une phrase posée dans la saisie de la conversation, SANS être envoyée.

   Le Planning ouvre la conversation sur une phrase déjà écrite (« Pour
   jeudi, ma séance Pull : … ») que la personne complète et envoie
   elle-même. `open(prefill)` de l'assistant, lui, ENVOIE : il appellerait
   le Guide à l'ouverture, ce que Louis refuse (2026-11-09).

   La feuille de la conversation prend la phrase à son ouverture, une
   seule fois. Elle vit en mémoire, jamais sur l'appareil. */

export const EVT_BROUILLON_GUIDE = "vaiiya:brouillon-guide";

let enAttente: string | null = null;

export function poserBrouillonGuide(phrase: string) {
  enAttente = phrase;
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVT_BROUILLON_GUIDE));
}

/** Rend la phrase en attente et l'oublie. */
export function prendreBrouillonGuide(): string | null {
  const p = enAttente;
  enAttente = null;
  return p;
}
