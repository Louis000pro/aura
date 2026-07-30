"use client";

/**
 * FondPresentation : le fond du haut de la page de présentation, figé.
 *
 * C'est la recette exacte du héros (LandingHero) : deux cercles pleins
 * fortement floutés plus une nappe chaude ancrée en bas. On garde les cercles
 * flous plutôt qu'un dégradé radial parce qu'un flou tient sa couleur sur tout
 * son cœur, là où un radial s'éteint dès le centre et rend le fond fade.
 *
 * Seule différence avec le héros : rien ne bouge. Derrière un formulaire, on ne
 * fait pas flotter des halos.
 */
export default function FondPresentation() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {/* Nappe chaude ancrée en bas, pleine largeur */}
      <div className="absolute inset-x-0 bottom-0"
        style={{ height: "58%", background: "linear-gradient(to top, rgba(var(--gold-rgb),0.20) 0%, rgba(var(--gold-rgb),0.07) 45%, transparent 100%)" }} />

      {/* Lueur violette, coin haut gauche */}
      <div className="absolute rounded-full"
        style={{ top: "-22%", left: "-14%", width: 720, height: 720, background: "rgba(var(--accent-rgb),0.26)", filter: "blur(110px)" }} />

      {/* Chaleur dorée, coin bas droit */}
      <div className="absolute rounded-full"
        style={{ bottom: "-24%", right: "-14%", width: 680, height: 680, background: "rgba(var(--gold-rgb),0.22)", filter: "blur(110px)" }} />
    </div>
  );
}
