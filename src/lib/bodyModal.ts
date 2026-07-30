/* ════════════════════════════════════════════════════════════════════
   Masquage de la barre de nav du bas quand une modale plein écran est ouverte.

   Compteur de références : plusieurs modales peuvent se chevaucher (ex. une
   feuille « Je choisis » qui se ferme pendant que le lecteur de séance
   s'ouvre). Sans compteur, le nettoyage de la modale qui se ferme retirait la
   classe `modal-open` dont la modale encore ouverte a besoin → la nav
   réapparaissait par-dessus le bas de la modale.
   ════════════════════════════════════════════════════════════════════ */
let openCount = 0;

/** Verrouille (ajoute `modal-open`). Retourne la fonction de déverrouillage —
 *  à renvoyer directement depuis un `useEffect(() => lockBodyModal(), [])`. */
export function lockBodyModal(): () => void {
  openCount += 1;
  document.body.classList.add("modal-open");
  let released = false;
  return () => {
    if (released) return;
    released = true;
    openCount = Math.max(0, openCount - 1);
    if (openCount === 0) document.body.classList.remove("modal-open");
  };
}
