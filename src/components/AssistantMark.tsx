/* ════════════════════════════════════════════════════════════════════
   AssistantMark : l'identité visuelle de l'assistant Vaiiya, partagée.

   L'étincelle ✦ = géométrie EXACTE de lucide « sparkles », en bicolore :
   étoile violette (action) + petits éclats dorés. Hérite des couleurs du
   thème → mode sombre automatique, nette à toutes les tailles.

   UNE seule source pour toute l'app :
   • `AssistantSpark`  : l'étincelle nue, posée dans la barre de nav (NavOrb).
   • `AssistantAvatar` : l'étincelle dans une pastille ronde teintée : le
     « visage » du chat (en-tête, avatars de messages, écran d'accueil).
   • `VisageGuide`     : le visage de Nora ou de Sasha, dans la même
     pastille. C'est LUI qu'on voit dans la conversation depuis le
     2026-08-19 : dans un chat, c'est une personne qui parle, pas une
     marque. Sans Guide résolu, il retombe sur `AssistantAvatar`, donc
     l'app d'avant reste intacte tant que personne n'a choisi.
   • `BusteGuide`      : le grand personnage de la feuille vide.
   • `ReflexionGuide`  : le personnage à mi-taille, pendant l'attente.
   • `CelebrationGuide`: le personnage de la fin de séance.

   ── QUATRE TAILLES, QUATRE FICHIERS, ZÉRO RECADRAGE CSS ────────────
   Chaque emplacement a SON fichier, taillé par `npm run portraits` :
   `<guide>-<état>-avatar-v1.webp` (256 carré), `<guide>-buste-v1.webp`
   (512 x 640), `<guide>-think-reflexion-v1.webp` (320 x 400) et
   `<guide>-encourage-celebration-v1.webp` (448 x 560). Un même
   fichier étiré puis recadré au CSS pour trois usages, c'est ce qui
   avait coupé la mèche de Nora dans le questionnaire : le CSS ne sait ni
   où est la tête, ni quelle largeur elle fait. Ici les fenêtres sont
   posées sur la tête MESURÉE, et le CSS n'a qu'à remplir sa boîte.

   ⚠️ NE JAMAIS METTRE UN PORTRAIT DANS UNE BOÎTE QUI N'A PAS SON RATIO.
   Les avatars sont carrés, le buste, la réflexion et la célébration sont
   en 4:5, comme leurs fichiers. Un autre ratio ferait rogner `cover`, et il rognerait
   d'abord l'air garanti au-dessus du crâne.

   ⚠️ ✦ RESTE L'IDENTITÉ DE VAIIYA, pas celle d'une personne : l'orbe de
   navigation, la marque et le chrome gardent l'étincelle. Nora et Sasha
   vivent dans la conversation et dans l'accompagnement. Ne pas remplacer
   l'étincelle de `NavOrb` par un visage.

   Remplace partout l'ancien PNG orbe photoréaliste (qui jurait avec la DA).
   ════════════════════════════════════════════════════════════════════ */

import type { CSSProperties } from "react";
import type { EtatGuide, GuideId, GuideRef } from "@/lib/guides";

export function AssistantSpark({ px }: { px: number }) {
  return (
    <svg width={px} height={px} viewBox="0 0 24 24" fill="none"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
      /* Marque figée : en mode « couleurs forcées » (contraste élevé / couleurs
         imposées par le navigateur), on refuse le repeint système : l'étincelle
         garde SON violet + or, partout où elle apparaît. */
      style={{ forcedColorAdjust: "none" }}>
      <path
        d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"
        style={{ stroke: "var(--accent)", fill: "rgba(var(--accent-rgb),0.13)" }} />
      <path d="M20 2v4" style={{ stroke: "var(--gold)" }} />
      <path d="M22 4h-4" style={{ stroke: "var(--gold)" }} />
      <circle cx="4" cy="20" r="2" style={{ stroke: "var(--gold)" }} />
    </svg>
  );
}

export function AssistantAvatar({ size, className = "" }: { size: number; className?: string }) {
  return (
    <span className={`inline-flex items-center justify-center rounded-full flex-shrink-0 select-none ${className}`}
      style={{
        width: size, height: size,
        background: "rgba(var(--accent-rgb),0.12)",
        border: "1px solid rgba(var(--accent-rgb),0.18)",
        forcedColorAdjust: "none",
      }}>
      <AssistantSpark px={Math.round(size * 0.56)} />
    </span>
  );
}

/** Le fondu du bas, en pixels et jamais en pourcentage : selon l'écran la
 *  boîte n'a pas toujours la hauteur du dessin, et un pourcentage mangerait
 *  beaucoup plus de personnage sur les petites. Même raison, même forme que
 *  dans le questionnaire de /bienvenue. */
const fondu = (bande: number) => `linear-gradient(to bottom, #000 calc(100% - ${bande}px), transparent 100%)`;

/** Le visage du Guide, à la taille d'un avatar de conversation (28 et 36 px
 *  aujourd'hui). Le fichier est un carré déjà cadré sur la tête à la
 *  génération : la pastille ronde n'a qu'à le laisser remplir sa boîte.
 *
 *  `etat` choisit lequel des cinq portraits s'affiche. Il vaut `explain` par
 *  défaut, qui est le visage d'un Guide en train de répondre : c'est le cas
 *  le plus courant, et jamais un cas trompeur. */
export function VisageGuide({
  guide,
  etat = "explain",
  size,
  className = "",
}: {
  guide: GuideRef;
  etat?: EtatGuide;
  size: number;
  className?: string;
}) {
  // Pas de Guide (choix pas fait, SQL pas collé, hors ligne) : la marque
  // reprend la place, exactement comme avant ce chantier.
  if (!guide) return <AssistantAvatar size={size} className={className} />;

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full flex-shrink-0 select-none overflow-hidden ${className}`}
      style={{
        width: size,
        height: size,
        // Le dessin est détouré : la teinte se voit dans les coins ronds et
        // sert de fond au personnage, comme pour l'étincelle.
        background: "rgba(var(--accent-rgb),0.12)",
        border: "1px solid rgba(var(--accent-rgb),0.18)",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/guides/${guide}-${etat}-avatar-v1.webp`}
        alt=""
        width={size}
        height={size}
        decoding="async"
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    </span>
  );
}

/* ── LES DEUX GRANDS FORMATS ───────────────────────────────────────────
   ⚠️ NI CARTE, NI CADRE, NI PASTILLE, NI MÉDAILLON. C'est la règle posée
   le 2026-08-18 sur /bienvenue, sur retour de Louis (« enfermés dans une
   zone pâle qui fait post-it »), et elle vaut ici aussi. Deux moyens y
   concourent, et aucun ne dessine une forme : le bas du personnage se
   DISSOUT dans la page, et la lumière autour de lui est une ambiance
   large, pas un disque.

   Ne pas remonter l'opacité de la lumière « pour mieux détacher le
   Guide » : c'est le geste qui redessine la pastille. Sur fond sombre,
   ce sont les mèches violettes et le haut lilas de l'illustration qui
   font le détachement. */
const LUMIERE: CSSProperties = {
  position: "absolute",
  left: "50%",
  top: "46%",
  width: "188%",
  height: "130%",
  transform: "translate(-50%, -50%)",
  pointerEvents: "none",
  filter: "blur(22px)",
  background:
    "radial-gradient(40% 34% at 50% 30%, rgba(var(--accent-rgb),0.20) 0%, rgba(var(--accent-rgb),0) 100%)," +
    "radial-gradient(54% 44% at 50% 60%, rgba(var(--accent-rgb),0.085) 0%, rgba(var(--accent-rgb),0) 100%)",
};

function Portrait({ guide, fichier, hauteur, bande }: { guide: GuideId; fichier: string; hauteur: number | string; bande: number }) {
  return (
    <span
      aria-hidden="true"
      className="relative block flex-shrink-0 select-none"
      // La hauteur commande, la largeur suit : 4:5, le ratio du fichier.
      // Le respecter est ce qui garantit que `cover` ne rogne rien, et
      // surtout pas l'air au-dessus du crâne. `hauteur` accepte une valeur
      // CSS pour que la feuille puisse la faire respirer avec l'écran.
      style={{ height: hauteur, width: "auto", aspectRatio: "4 / 5" }}
    >
      <span style={LUMIERE} />
      {/* ⚠️ `<img>` et pas `next/image` : ces fichiers sont déjà en WebP, à
          la taille exacte de leur usage, et servis en statique. Même choix
          que les sprites d'exercice et le portrait de /bienvenue. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/guides/${guide}-${fichier}-v1.webp`}
        alt=""
        decoding="async"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "50% 0",
          WebkitMaskImage: fondu(bande),
          maskImage: fondu(bande),
        }}
      />
    </span>
  );
}

/** Le grand personnage de la feuille vide. Il remplace l'étincelle géante
 *  qui y trônait : avant le premier message, la seule chose à dire est
 *  « voilà qui te parle ». */
export function BusteGuide({ guide, hauteur }: { guide: GuideRef; hauteur: number | string }) {
  // Sans Guide, la feuille retrouve exactement l'écran d'avant : l'étincelle
  // au centre, à la taille qu'elle avait.
  if (!guide) return <AssistantAvatar size={80} />;
  return <Portrait guide={guide} fichier="buste" hauteur={hauteur} bande={30} />;
}

/** Le personnage à mi-taille, pendant que le Guide travaille. C'est le SEUL
 *  cadrage où la pose se lit (la tête n'y occupe que 44 % de la hauteur, donc
 *  on voit les bras), et le seul moment de la conversation où un personnage
 *  plus grand apporte quelque chose : une attente de plusieurs secondes.
 *  Partout ailleurs, l'avatar compact suffit. */
export function ReflexionGuide({ guide, hauteur }: { guide: GuideRef; hauteur: number | string }) {
  // Sans Guide, rien : la bulle d'attente garde son seul rond qui tourne,
  // comme avant. Mieux vaut pas de personnage qu'une place vide.
  if (!guide) return null;
  return <Portrait guide={guide} fichier="think-reflexion" hauteur={hauteur} bande={16} />;
}

/** Le personnage de la FIN DE SÉANCE, et de nulle part ailleurs. C'est le
 *  moment le plus fort de l'app : le Guide y est franchement présent.
 *
 *  Son fichier est cadré comme la réflexion (la tête n'occupe que 44 % de la
 *  hauteur) et non comme un buste, pour une raison mesurée et pas esthétique :
 *  le poing levé de la pose `encourage` élargit la bande de la tête, donc un
 *  cadrage de buste faisait sortir la fenêtre de la toile et le script
 *  refusait. Ce cadrage large a l'avantage de montrer le geste, qui est
 *  justement ce qu'on vient célébrer. */
export function CelebrationGuide({ guide, hauteur }: { guide: GuideRef; hauteur: number | string }) {
  // Sans Guide, rien : l'écran de fin garde son médaillon teal, comme avant.
  if (!guide) return null;
  return <Portrait guide={guide} fichier="encourage-celebration" hauteur={hauteur} bande={22} />;
}

/** ── LE PRÉCHARGEMENT ─────────────────────────────────────────────────
 *  Les cinq visages se relaient dans la même pastille, au fil de la
 *  conversation. Sans préchargement, le premier passage à `think` déclenche
 *  un téléchargement PENDANT le fondu : la pastille se vide, puis le visage
 *  apparaît d'un coup. Les six fichiers pèsent ensemble une centaine de Ko,
 *  ils sont statiques et mis en cache par le navigateur : on les demande une
 *  fois, à l'ouverture de la feuille. */
export function prechargerGuide(guide: GuideRef) {
  if (!guide || typeof window === "undefined") return;
  const etats: EtatGuide[] = ["welcome", "listen", "think", "explain", "encourage"];
  for (const e of etats) new Image().src = `/guides/${guide}-${e}-avatar-v1.webp`;
  new Image().src = `/guides/${guide}-think-reflexion-v1.webp`;
  new Image().src = `/guides/${guide}-buste-v1.webp`;
}
