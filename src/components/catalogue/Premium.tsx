/* ════════════════════════════════════════════════════════════════════
   PREMIUM, UNE SEULE FAÇON DE LE DESSINER : les dégradés, l'étincelle de
   la marque et le cadenas des cartes. Sortis de l'écran Entraînement le
   2026-11-01 pour que le catalogue (« Trouver ma séance ») et ses
   collections dessinent la même chose.
   ════════════════════════════════════════════════════════════════════ */

/* ── LES DEUX DÉGRADÉS DE PREMIUM ─────────────────────────────────────
   Ce sont EXACTEMENT ceux des missions de l'accueil (`.mission[data-premium]`
   et `.tagPremium` dans AccueilSignature.module.css), recopiés ici parce
   que cet écran s'écrit en styles en ligne. Il n'y a donc qu'une seule
   façon de dessiner Premium dans toute l'app : or clair → or → magenta.
   L'ancienne paire violet → or de cet écran en inventait une deuxième, et
   le violet est déjà pris : dans le système D, il veut dire « action ».
   Si l'un des deux change un jour, les deux changent ensemble. */
export const PREMIUM_PUCE = "linear-gradient(120deg,#FFD34E,#F5B120)";
/* Le cadre de la carte : le liseré or → magenta des missions, en anneau.
   ⚠️ SON ÉPAISSEUR ET LE RAYON INTÉRIEUR SONT LIÉS : `PREMIUM_RAYON` doit
   TOUJOURS valoir 20 (le rayon extérieur) moins `PREMIUM_CADRE_PX`, sinon
   l'anneau est plus épais dans les angles que sur les côtés, et c'est
   exactement le défaut que Louis a vu la première fois (« l'or dépasse un
   peu sur les cartes ») : le cadre était dessiné pour 3 px mais posé avec
   1 px de padding, donc les coins gardaient leur épaisseur d'origine.
   3 px n'est pas non plus un choix esthétique libre : en dessous, le
   dégradé n'a pas la place de se voir, surtout sur fond clair, et l'anneau
   redevient un filet uni. C'est la largeur du liseré des missions.

   ⚠️ ET L'OR NE S'ÉTALE PAS POUR AUTANT : il est saturé sur des formes
   étroites (cet anneau, la puce du bandeau, le cachet du cadenas), jamais
   en grande surface. Deux fonds dorés ont été refusés, même cause les deux
   fois, une carte ne fait que 150 px de large : la puce des missions
   étirée en aplat sur toute la largeur (« c'est nul »), puis le lavis
   or → magenta, qui sur une ligne large de 330 px s'éteint avant le bord
   mais qui sur une carte n'en montre que sa tranche la plus dense, donc un
   aplat crème dont les coins virent au jaune sale. Le bandeau porte la
   surface de l'app ; tout mettre en encre a été essayé aussi et manquait
   de couleur, d'où la puce. */
export const PREMIUM_CADRE_PX = 3;
export const PREMIUM_RAYON = 20 - PREMIUM_CADRE_PX;
export const PREMIUM_CADRE = "linear-gradient(180deg,#FFD34E,#F5B120 38%,#C13BC1)";
/* Le lavis or → magenta des lignes Premium de l'accueil. ⚠️ Il ne sert que
   sur des surfaces LARGES (la feuille d'aperçu), jamais sur une carte du
   carrousel : voir `PREMIUM_TRAIT` pour la raison. Exactement horizontal,
   comme sur les missions. */
export const PREMIUM_LAVIS = "linear-gradient(90deg,rgba(245,177,32,0.17),rgba(193,59,193,0.09) 62%,transparent)";
/* L'étincelle de la marque, telle qu'elle est dessinée sur l'affiche
   Premium de l'accueil (`.brandSpark`) : violet → or, deux barres. */
export const PREMIUM_SPARK = "linear-gradient(135deg,#8B5CF6,#F5B120)";

export function EtincellePremium({ taille = 11 }: { taille?: number }) {
  const barre = Math.max(2, Math.round(taille * 0.23));
  return (
    <span aria-hidden className="relative inline-block flex-shrink-0" style={{ width: taille, height: taille }}>
      <span className="absolute inset-0 m-auto rounded-full" style={{ width: barre, height: taille, background: PREMIUM_SPARK }} />
      <span className="absolute inset-0 m-auto rounded-full" style={{ width: taille, height: barre, background: PREMIUM_SPARK }} />
    </span>
  );
}

/* Le cadenas doré, posé là où vit le ⋯ des autres cartes, et seulement sur
   une séance ou un cours qu'on n'a pas encore. C'est le même cachet que sur
   les missions de l'accueil (`Cadenas` dans AccueilSignature.tsx) : un seul
   signe de verrou dans toute l'app, appris une fois.

   ⚠️ Un « + » a tenu la place pendant une journée, puis Louis est revenu au
   verrou : il ne se reconnaissait pas et ne donnait pas l'idée qu'on
   pouvait toucher. Ne pas refaire l'aller-retour.

   Il ne se touche pas : la carte entière ouvre déjà l'aperçu Premium, et
   deux boutons superposés au même endroit ne donneraient pas deux
   destinations, juste une cible à moitié fiable. */
export function Cadenas() {
  return (
    <span aria-hidden
      className="absolute bottom-2 right-2 w-7 h-7 rounded-full flex items-center justify-center pointer-events-none"
      style={{ background: PREMIUM_PUCE, color: "#3A2402", boxShadow: "0 3px 10px rgba(84,52,2,0.42)" }}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round">
        <rect x="4" y="10.5" width="16" height="11" rx="2.6" fill="currentColor" stroke="none" />
        <path d="M8.2 10.5V7.6a3.8 3.8 0 0 1 7.6 0v2.9" />
      </svg>
    </span>
  );
}
