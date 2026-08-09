import { resolveGuide, pickGenre, frameSrc, type Genre } from "@/lib/exerciseGuides";

/* ════════════════════════════════════════════════════════════════════
   L'ANIMATION D'UN EXERCICE SUR UNE PAGE PUBLIQUE

   Le composant du tunnel (`components/ExerciseGuide.tsx`) n'est pas
   réutilisable ici, et ce n'est pas un défaut de sa part : il est fait
   pour un autre métier. Trois différences, chacune décisive.

   1. Il est CLIENT et enchaîne ses poses avec un `setInterval` React.
      Pendant l'effort, personne ne regarde la page avant l'hydratation.
      Ici, l'animation est la première chose qu'on voit en arrivant de
      Google : elle doit tourner avant que le JavaScript existe. Celle-ci
      tourne en CSS pur (cf. `.vy-anim` dans globals.css), donc dès le
      premier octet de HTML. Zéro script, et zéro travail au fil du temps
      pour le navigateur.

   2. Il est `aria-hidden` avec des `alt=""`. C'était le bon choix : dans
      le tunnel, le nom de l'exercice est écrit en géant juste à côté, et
      faire lire trois fois la même image serait du bruit. Sur une page
      publique, l'animation EST le contenu. On décrit donc le GROUPE
      (`role="img"` + `aria-label`) et les poses restent décoratives
      individuellement, ce qu'elles sont : c'est exactement la solution
      retenue pour le personnage de l'accueil.

   3. Il ne pose ni dimensions ni priorité de chargement. Une image sans
      `width`/`height` déplace la page quand elle arrive, et le héros
      d'une fiche doit se charger avant tout le reste.

   Le composant interne n'est donc pas modifié : ces deux-là ne font pas
   le même travail. Ce qu'ils partagent, ils le partagent vraiment, à la
   source : `resolveGuide` (la règle nom → sprite) et `frameSrc` (la
   forme du chemin). Aucun chemin d'image n'est réécrit ici.

   Sans règle d'animation, on ne rend RIEN plutôt qu'une image hors
   sujet. C'est la règle verrouillée du tunnel, et elle vaut d'autant
   plus sur une page qui promet de montrer le mouvement. Les huit fiches
   pilotes sont toutes animées, `verifierFiches()` le garantit.
   ════════════════════════════════════════════════════════════════════ */

export default function AnimationExercice({
  nom,
  taille,
  label,
  priorite = false,
  className = "",
}: {
  /** Nom canonique de l'exercice (celui de `EXERCISE_LIBRARY`). */
  nom: string;
  /** Côté du carré. Le sprite est carré (1024×1024), donc une seule
      mesure suffit. Une chaîne CSS est acceptée pour les grilles qui
      veulent une case fluide (« 100% » dans un parent en aspect carré). */
  taille: number | string;
  /** Ce que l'animation montre, pour qui ne la voit pas. */
  label: string;
  /** Le héros de la fiche, et lui seul. */
  priorite?: boolean;
  className?: string;
}) {
  const guide = resolveGuide(nom);
  if (!guide) return null;

  const g: Genre = pickGenre(guide);

  return (
    <div
      className={`vy-anim ${className}`}
      data-poses={guide.frames}
      role="img"
      aria-label={label}
      style={{ width: taille, height: taille }}
    >
      {Array.from({ length: guide.frames }).map((_, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={i}
          src={frameSrc(guide, g, i)}
          alt=""
          width={1024}
          height={1024}
          decoding="async"
          /* `priorite` ne concerne QUE la première pose, celle qu'on voit
             avant que l'animation ait bougé. Les suivantes restent en
             `lazy`, et ce n'est pas un compromis : une image `lazy` déjà
             présente dans la fenêtre est chargée immédiatement de toute
             façon. On gagne donc le démarrage sans payer trois à cinq
             images bloquantes par vignette. */
          loading={priorite && i === 0 ? "eager" : "lazy"}
          fetchPriority={priorite && i === 0 ? "high" : undefined}
          /* Le décalage qui fait l'animation. Deux pièges s'annulent ici,
             et la formule tient les deux à la fois. Les deux ont été
             vérifiés en scrutant les opacités pose par pose dans un vrai
             navigateur, pas déduits.

             1. L'ORDRE. Un délai négatif AVANCE l'animation, il ne la
                retarde pas. Décaler la pose i de -i × 0,9 s la place donc
                plus loin dans son cycle que la pose précédente, et un
                mouvement à trois poses se joue 1, 3, 2 : sur un développé
                couché, la poussée passe avant la descente. Pour que la
                pose i prenne la main à i × 0,9 s, il faut au contraire la
                RETARDER de i × 0,9 s.

             2. LE PREMIER TOUR. Un délai franchement positif laisse la
                pose suivante à l'arrêt pendant que la précédente s'efface :
                au tout premier passage, le personnage s'estompe dans le
                vide avant que la suite n'apparaisse d'un coup.

             D'où `(i - poses) × 0,9` : le même décalage que le retard
             voulu, moins un cycle entier. Comme l'animation boucle, une
             période complète ne change rien au régime établi, mais le
             délai devient négatif, donc toutes les poses tournent déjà à
             la première image et les fondus se croisent dès la première
             transition. */
          style={{ animationDelay: `${(i - guide.frames) * 0.9}s` }}
        />
      ))}
    </div>
  );
}

/** La description par défaut d'une animation.
    Un mouvement se raconte pose après pose ; une position tenue ne se
    raconte pas, elle se montre. Écrire « pose après pose » sur une image
    unique serait faux, et un lecteur d'écran attendrait une suite qui
    n'arrive jamais. */
export function labelAnimation(nom: string): string {
  const guide = resolveGuide(nom);
  const minuscule = nom.charAt(0).toLowerCase() + nom.slice(1);
  return guide && guide.frames > 1
    ? `Personnage Vaiiya montrant le mouvement du ${minuscule}, pose après pose`
    : `Personnage Vaiiya en position de ${minuscule}`;
}
