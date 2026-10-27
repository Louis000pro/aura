/* ════════════════════════════════════════════════════════════════════
   LA MÉMOIRE DE SESSION : CE QU'UN ÉCRAN A DÉJÀ MONTRÉ, IL LE REMONTRE.

   Louis, 2026-10-27 : « quand on change de page, ça manque de fluidité ».
   Mesuré dans le code : chaque onglet repartait de zéro en y revenant.
   L'accueil relisait sa journée (cinq allers-retours à la base, l'un après
   l'autre) et montrait son squelette jusqu'à une seconde et demie ;
   Nutrition reposait « Aujourd'hui » vide le temps d'une requête ; la liste
   des discussions aussi. Rien n'avait changé entre-temps, il fallait
   seulement le relire.

   Ce module garde, EN MÉMOIRE et pour la session seulement, la dernière
   chose qu'un écran a publiée. En y revenant, l'écran part de là au lieu
   d'un écran vide, et ses lectures habituelles partent quand même : ce qui
   a changé arrive par-dessus, exactement comme avant.

   ⚠️ CE N'EST PAS UNE SOURCE DE VÉRITÉ, ET ÇA N'EN DEVIENDRA PAS UNE.
   · Rien n'est écrit sur l'appareil : un rechargement repart de la base.
   · Une clé porte toujours le compte (et le jour quand l'écran en dépend) :
     un autre compte, ou le lendemain, ne voit jamais la mémoire d'un autre.
   · Un écran qui écrit garde sa règle d'avant (relire avant d'agir) : la
     mémoire ne sert qu'à l'affichage.
   · Une écriture faite AILLEURS (fin de séance, le Guide, un repas noté
     depuis la conversation) efface la mémoire concernée par son évènement
     (`oublierMemoire`) : on ne remontre pas un écran qu'on sait périmé, on
     revient alors au chargement d'avant.
   ════════════════════════════════════════════════════════════════════ */

const memoire = new Map<string, unknown>();

/** Ce que l'écran a publié en dernier sous cette clé, ou `undefined`. */
export function lireMemoire<T>(cle: string | null | undefined): T | undefined {
  if (!cle) return undefined;
  return memoire.get(cle) as T | undefined;
}

/** Garde ce que l'écran vient de publier. */
export function ecrireMemoire<T>(cle: string | null | undefined, valeur: T): void {
  if (!cle) return;
  memoire.set(cle, valeur);
}

/** Oublie tout ce qui commence par ce préfixe (un écran entier). */
export function oublierMemoire(prefixe: string): void {
  for (const cle of [...memoire.keys()]) {
    if (cle.startsWith(prefixe)) memoire.delete(cle);
  }
}

/** Branche l'oubli d'un écran sur les évènements qui le rendent périmé.
 *  Appelée au niveau du module de l'écran : une seule fois par session, et
 *  avant même que l'écran soit monté (c'est justement le cas utile). */
export function oublierSur(prefixe: string, evenements: string[]): void {
  if (typeof window === "undefined") return;
  for (const nom of evenements) window.addEventListener(nom, () => oublierMemoire(prefixe));
}
