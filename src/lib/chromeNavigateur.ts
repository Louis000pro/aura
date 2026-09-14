/* ════════════════════════════════════════════════════════════════════
   La couleur du CHROME du navigateur (`<meta name="theme-color">`).

   C'est la bande que le système peint autour de l'app : la barre
   d'adresse de Chrome, et la zone d'état d'une PWA installée sur
   Android. Elle était figée à `#FFFFFF`, donc en mode sombre Vaiiya
   s'affichait sur fond noir avec une bande BLANCHE au-dessus.

   ⚠️ ET UNE MÉDIA-REQUÊTE CSS NE PEUT PAS FAIRE CE TRAVAIL ICI, même si
   c'est la solution habituelle (`themeColor` accepte une liste avec
   `prefers-color-scheme`). Le thème de Vaiiya ne suit PAS le téléphone :
   son défaut est CLAIR, et seule la préférence « Auto » suit le système
   (voir `readPreference` dans `hooks/useTheme.ts`). Sur un téléphone en
   sombre, quelqu'un qui n'a rien choisi a donc une app claire : une
   média-requête lui donnerait une bande noire au-dessus d'un écran clair,
   c'est-à-dire le défaut inverse. La couleur doit suivre le thème
   RÉSOLU, pas le réglage du système.

   Les deux valeurs sont celles de `--html-bg` dans `globals.css`, qui est
   le fond réellement peint sous la page : le chrome et la page ne
   peuvent donc pas montrer deux couleurs différentes. Si l'une des deux
   change là-bas, elle change ici.

   Trois consommateurs, une seule source :
     · `viewport.themeColor` (layout) écrit la valeur claire dans le HTML,
       ce qui couvre le cas sans JavaScript ;
     · le script d'avant-paint du <head> la corrige en sombre s'il le faut,
       pour qu'il n'y ait aucun clignotement ;
     · `applyTheme` (useTheme) la repose à chaque changement de thème.
   ════════════════════════════════════════════════════════════════════ */

/** Thème clair — identique à `--html-bg` de `:root`. */
export const CHROME_CLAIR = "#F5F3FF";

/** Thème sombre — identique à `--html-bg` de `[data-theme="dark"]`. */
export const CHROME_SOMBRE = "#000000";

/**
 * Pose la couleur du chrome pour le thème résolu.
 *
 * ⚠️ On MET À JOUR la balise existante, on n'en ajoute pas une seconde :
 * quand plusieurs `theme-color` s'appliquent, le navigateur retient la
 * dernière, donc en empiler une reviendrait à parier sur l'ordre du
 * `<head>`. Vérifié dans le HTML rendu : celle de `viewport.themeColor`
 * est écrite bien avant le script d'avant-paint, donc elle est toujours là
 * quand on la cherche. Si elle manquait malgré tout, on la crée.
 */
export function poserChrome(sombre: boolean): void {
  if (typeof document === "undefined") return;
  const couleur = sombre ? CHROME_SOMBRE : CHROME_CLAIR;
  const balises = document.querySelectorAll('meta[name="theme-color"]');
  if (balises.length === 0) {
    const meta = document.createElement("meta");
    meta.setAttribute("name", "theme-color");
    meta.setAttribute("content", couleur);
    document.head.appendChild(meta);
    return;
  }
  balises.forEach((b) => b.setAttribute("content", couleur));
}
