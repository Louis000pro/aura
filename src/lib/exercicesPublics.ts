/* ════════════════════════════════════════════════════════════════════
   LES FICHES PUBLIQUES D'EXERCICES · contenu éditorial de /exercices

   ── POURQUOI CE FICHIER EXISTE À CÔTÉ DE exerciseLibrary.ts ──────────
   `exerciseLibrary.ts` est lu par treize modules, dont la génération de
   séance par l'IA (`api/workout/generate`), qui lui demande une liste
   FERMÉE de noms à recopier mot pour mot. Toucher ce fichier, c'est
   toucher au cœur de l'app. Le contenu marketing d'une page publique n'a
   rien à y faire : il change souvent, il ne sert qu'au web, et une faute
   de frappe dedans ne doit jamais pouvoir casser une séance.

   D'où la séparation :

     exerciseLibrary.ts   la VÉRITÉ DU MOUVEMENT
                          nom canonique, muscles, matériel, séries, reps,
                          repos, consigne (`tip`), bénéfice, animation.
                          Ce fichier n'est PAS modifié par le chantier SEO.

     exercicesPublics.ts  la PAGE
                          slug figé, title, description, définition,
                          étapes, erreurs, variantes, placement.

   ── LA CLÉ DE JOINTURE ──────────────────────────────────────────────
   `exercice` porte le nom canonique exact de l'entrée de la bibliothèque.
   Ce n'est pas un choix par défaut : ce nom EST déjà la clé de jointure de
   toute l'application. `resolveGuide()` s'en sert pour trouver l'animation,
   `trouverExercice()` pour retrouver l'entrée, et l'IA le recopie tel quel
   pour composer une séance. Il est donc de fait immuable, et c'est
   documenté comme tel dans AGENTS.md (« on ajoute, on ne renomme rien »).

   Réponse à la question posée : NON, il n'y a pas de raison technique de
   mettre le slug dans `exerciseLibrary.ts`. Le seul argument aurait été
   d'éviter une résolution de nom au rendu, mais elle coûte une lecture de
   Map, une fois, côté serveur, au build. En échange, la bibliothèque
   applicative reste vierge de toute notion d'URL. Si un jour l'app doit
   afficher « voir la fiche publique » depuis un écran connecté, elle
   importera `slugDeLExercice()` d'ici, et le sens de la dépendance restera
   le bon : le public connaît l'app, l'app n'a pas à connaître le public.

   ── LA JOINTURE EST VÉRIFIÉE, PAS SUPPOSÉE ──────────────────────────
   Une clé qui ne résout pas produirait une page à moitié vide, en
   silence. `verifierFiches()` (appelée par le hub et par chaque fiche au
   rendu serveur) refuse une fiche dont le nom n'existe pas dans la
   bibliothèque. C'est la même leçon que les règles d'animation : un
   échec muet est pire qu'une erreur.

   ── LES SLUGS SONT FIGÉS, POUR TOUJOURS ─────────────────────────────
   Ils sont écrits à la main, jamais calculés depuis le nom. Un slug
   calculé change le jour où quelqu'un corrige une faute dans le nom, et
   une URL indexée qui change est une URL perdue. Ils sont aussi vérifiés
   contre `SLUGS_RESERVES` : les catégories vivront un jour sur le même
   segment (`/exercices/pectoraux`), aucun exercice ne peut leur voler
   leur mot.

   ── AJOUTER UNE FICHE ───────────────────────────────────────────────
   ⚠️ LIRE D'ABORD `docs/lot-seo-3-fiches-exercices.md`. C'est le contrat
   éditorial du lot, et il n'est pas décoratif : il dit notamment qu'il
   n'y a AUCUN quota de mots, que le développé couché est un modèle
   visuel et pas un modèle éditorial à recopier, et qu'une variante ne se
   classe jamais en « plus facile » ou « plus difficile ». Il contient
   aussi le brief de chacune des sept fiches restantes.

   1. une entrée ici, avec un slug qu'on n'aura plus jamais le droit de
      changer, et `contenu` rédigé à la main ;
   2. c'est tout. Sans `contenu`, la fiche est connue mais pas publiée :
      elle n'a pas de route, pas d'entrée de sitemap, et le hub l'annonce
      comme à venir. C'est ce qui permet de lancer un pilote sans mentir.
   ════════════════════════════════════════════════════════════════════ */

import { trouverExercice, type LibExercise } from "./exerciseLibrary";
import { resolveGuide } from "./exerciseGuides";

/* ─────────────────────────── Catégories ───────────────────────────
   Elles ne sont PAS publiées au pilote : avec huit fiches, une page
   « épaules » afficherait un seul exercice, ce qui ne rend service à
   personne et donne au moteur une page maigre à indexer. Elles sont
   déclarées ici pour deux raisons concrètes : réserver leurs mots dans
   l'espace des slugs dès maintenant, et donner à chaque fiche son fil
   d'Ariane, qui lui, existe déjà.                                    */

export type CategoriePublique =
  | "pectoraux" | "dos" | "epaules" | "bras" | "jambes" | "abdos" | "cardio";

export const CATEGORIES: { id: CategoriePublique; label: string }[] = [
  { id: "pectoraux", label: "Pectoraux" },
  { id: "dos",       label: "Dos" },
  { id: "epaules",   label: "Épaules" },
  { id: "bras",      label: "Bras" },
  { id: "jambes",    label: "Jambes" },
  { id: "abdos",     label: "Abdos" },
  { id: "cardio",    label: "Cardio" },
];

/** Les mots que la catégorie s'est réservés sur le segment `/exercices/…`.
    Un slug d'exercice ne peut jamais en prendre un : le jour où on publie
    `/exercices/pectoraux`, il n'y aura rien à arbitrer. */
export const SLUGS_RESERVES: string[] = CATEGORIES.map((c) => c.id);

export function libelleCategorie(id: CategoriePublique): string {
  return CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

/* ──────────────────────────── Le contenu ─────────────────────────── */

/** À qui le mouvement s'adresse. Volontairement grossier : trois marches
    suffisent, et une échelle plus fine serait une promesse qu'on ne sait
    pas tenir. */
export type NiveauPublic = "debutant" | "intermediaire" | "confirme";

const LIBELLE_NIVEAU: Record<NiveauPublic, string> = {
  debutant: "débutant",
  intermediaire: "intermédiaire",
  confirme: "confirmé",
};

export function libelleNiveau(de: NiveauPublic, a: NiveauPublic): string {
  const mot = de === a ? LIBELLE_NIVEAU[de] : `${LIBELLE_NIVEAU[de]} à ${LIBELLE_NIVEAU[a]}`;
  return mot.charAt(0).toUpperCase() + mot.slice(1);
}

/** Une étape d'exécution. `titre` nomme le temps du mouvement, il ne
    numérote pas : le numéro est posé par l'affichage. */
export type Etape = { titre: string; texte: string };

/** Une erreur fréquente. `pourquoi` dit ce qu'elle coûte, sinon la
    consigne devient un ordre sans raison, et personne ne la retient. */
export type Erreur = { titre: string; pourquoi: string };

/** Une variante. `exercice` pointe vers un nom canonique de la
    bibliothèque, donc la carte peut afficher sa vraie animation. Si cet
    exercice a lui aussi une fiche publiée, l'affichage en fait un lien ;
    sinon la carte reste informative. Jamais de lien mort.

    ⚠️ `angle` dit EN QUOI la variante diffère, jamais si elle est plus
    facile ou plus difficile. Les deux premières fiches montraient les
    pompes comme « plus facile » et les haltères comme « plus difficile » :
    c'est faux pour beaucoup de gens. Des pompes tenues proprement sont
    exigeantes, et des haltères légers sont plus abordables qu'une barre
    chargée. On décrit donc la vraie différence (poids du corps, matériel,
    stabilité, amplitude) et on laisse le lecteur juger de ce qui est dur
    pour lui. */
export type Variante = {
  angle: string;
  exercice: string;
  texte: string;
};

/** Le corps rédigé de la fiche. Son absence signifie « pas encore écrite »,
    et c'est le seul interrupteur de publication : il n'y a pas de booléen
    à oublier de basculer. */
export type ContenuFiche = {
  /** La phrase d'ouverture. RÈGLE : elle doit contenir une information
      qu'on ne pourrait pas écrire pour un autre exercice. Si elle marche
      aussi bien pour le squat, elle est à réécrire. */
  definition: string;
  /** « mouvement » = un geste qui va et vient, on décrit ses temps.
      « tenue » = une position à tenir (gainage, étirements), où parler de
      descente et de poussée produirait du vide. Quinze exercices de la
      bibliothèque n'ont qu'une seule pose : ce sont eux. */
  gabarit: "mouvement" | "tenue";
  etapes: Etape[];
  erreurs: Erreur[];
  variantes: Variante[];
  /** Le titre de la section des variantes, quand « Variantes et
      progressions » serait inexact.

      Les burpees n'ont pas de variante dans la bibliothèque : les squats
      sautés et les mountain climbers sont des mouvements voisins qu'on
      choisit à leur place, pas des versions du burpee. Le soulevé de
      terre mélange les deux cas, avec un vrai dérivé (le roumain) et un
      mouvement proche qui partage sa charnière de hanches (le swing).
      Laisser « progressions » sur ces deux fiches ferait passer une
      alternative pour une marche à monter. */
  titreVariantes?: string;
  /** Où le placer dans une séance. Court, concret, propre au mouvement. */
  placement: string;
  /** Les pastilles du héros, quand celles de la bibliothèque ne peuvent
      pas être servies telles quelles.

      `lib.muscles` est une liste d'étiquettes d'écran : elle range côte à
      côte des muscles (« Biceps »), des régions (« Dos ») et des
      catégories d'effort (« Cardio », « Corps entier »). C'est cohérent
      pour un filtre dans l'application, où elles servent à trier. Sur une
      page publique lue par quelqu'un qui cherche ce qu'un exercice
      travaille, « Cardio » posé au milieu de noms de muscles n'est pas
      une réponse. Cette liste, quand elle est là, remplace la sienne. */
  muscles?: string[];
  /** Le matériel en clair, quand le libellé de famille de la bibliothèque
      est trop vague pour une page publique : « Haltères & barre » est un
      filtre d'écran correct, mais un visiteur veut savoir qu'il lui faut
      un banc. Absent, on retombe sur le libellé de famille. */
  materiel?: string;
  /** Le même matériel en un ou deux mots, pour le surtitre du héros.

      Il en faut un séparé, et pas seulement une troncature : le surtitre
      annonçait « PECTORAUX · HALTÈRES & BARRE » sur une fiche qui décrit
      le développé couché À LA BARRE. Le libellé de famille de la
      bibliothèque range les deux ensemble, ce qui est juste pour un
      filtre d'écran et ambigu en tête de page. Absent, on retombe sur le
      libellé de famille. */
  materielCourt?: string;
  /** Facultatif : la précaution qui mérite d'être dite. Rien de médical,
      rien d'alarmiste, et surtout pas sur toutes les fiches, sinon elle
      devient un bandeau qu'on ne lit plus. */
  precaution?: string;
  /** La phrase du héros, quand celle de la bibliothèque ne peut pas être
      servie au public.

      Par défaut c'est `lib.benefit` qui parle, et c'est très bien : elle
      est déjà écrite par exercice. Mais elle a été écrite pour un écran
      d'application, où l'emphase est sans conséquence. Le soulevé de
      terre y est « le mouvement le plus complet de toute la salle » : un
      superlatif, exactement ce que le contrat éditorial interdit sur une
      page publique. Plutôt que de corriger `exerciseLibrary.ts`, que
      treize modules lisent, la fiche peut dire la sienne. */
  promesse?: string;
  /** Le nom tel qu'il doit apparaître dans « Comment faire … ».

      L'affichage déduit l'article du nom, et sa règle est bonne dans la
      plupart des cas. Elle se trompe sur tout nom qui finit par
      « haltères » : elle y lit un pluriel et écrit « comment faire LES
      développé militaire haltères ». Le nom est aussi parfois plus long
      que ce qu'on dit à l'oral (« soulevé de terre classique »). Cette
      valeur, quand elle est là, remplace la déduction. */
  nomDansLeTitre?: string;
};

export type FichePublique = {
  /** Figé pour toujours. Ne jamais recalculer depuis le nom. */
  slug: string;
  /** Nom canonique EXACT d'une entrée de `EXERCISE_LIBRARY`. */
  exercice: string;
  categorie: CategoriePublique;
  /** ⚠️ AUCUNE FICHE NE DOIT LE REMPLIR AUJOURD'HUI. Règle durable, posée
      par Louis le 2026-08-09 et écrite dans le contrat éditorial
      (`docs/lot-seo-3-fiches-exercices.md`, section 3) :

        On n'attribue pas de niveau public à un exercice tant que Vaiiya ne
        possède pas une taxonomie de difficulté ou de niveau explicitement
        définie et validée comme donnée produit. On n'invente jamais cette
        valeur fiche par fiche pour remplir le héros.

      Ce champ a été créé pour ce chantier alors qu'aucune donnée de
      difficulté n'existe dans `exerciseLibrary.ts` (le type `Raw` n'en a
      pas de champ). Résultat : cinq fiches sur huit ont affiché « Débutant
      à confirmé », c'est-à-dire tout le monde, et les trois autres un
      jugement écrit pour la page seule. Sur les burpees, un mouvement au
      poids du corps que beaucoup de débutants pratiquent, « Intermédiaire
      à confirmé » fermait une porte qu'aucune donnée ne nous autorisait à
      fermer.

      Il reste déclaré, facultatif et inutilisé, pour le jour où la
      taxonomie existera. Le héros s'en passe par construction :
      `lignesDuHero` saute la ligne absente, et on ne met RIEN à sa
      place. */
  niveau?: { de: NiveauPublic; a: NiveauPublic };
  /** Le title de la balise, sans le suffixe « · Vaiiya » que le gabarit
      racine ajoute (9 caractères). Écrit à la main : un gabarit produirait
      huit titres jumeaux, ce qui est exactement le défaut qu'on évite. */
  title: string;
  description: string;
  contenu?: ContenuFiche;
};

/* ═══════════════════════ LES HUIT FICHES PILOTES ═══════════════════════
   Sélection arrêtée avec Louis à partir de données Bing France mesurées
   sur trois mois. Ces chiffres sont des impressions Bing, ils ne disent
   rien des volumes Google et ne doivent pas être présentés comme tels.
   Les slugs ci-dessous sont définitifs à partir de leur mise en ligne. */

export const FICHES: FichePublique[] = [
  {
    slug: "developpe-couche",
    exercice: "Développé couché",
    categorie: "pectoraux",
    title: "Développé couché : technique, muscles et erreurs",
    description:
      "Comment faire le développé couché à la barre : placement, exécution, muscles travaillés et les erreurs qui limitent la progression. Animation du mouvement.",
    contenu: {
      definition:
        "Allongé sur un banc, on descend une barre jusqu’au bas de la poitrine puis on la repousse à bout de bras. Le banc porte le buste, donc il n’y a pas d’équilibre à gérer : c’est l’une des raisons pour lesquelles on y manipule en général des charges plus élevées que sur les autres mouvements de poussée du haut du corps.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "S’installer",
          texte:
            "Allonge-toi les yeux à l’aplomb de la barre. Cinq appuis, et ils comptent : la tête, le haut du dos et les fessiers sur le banc, les deux pieds à plat au sol. Serre les omoplates l’une vers l’autre et garde-les serrées jusqu’à la fin de la série : c’est ce placement qui donne à l’épaule un appui stable. Prends la barre un peu plus large que les épaules, poignets dans l’axe des avant-bras.",
        },
        {
          titre: "Descendre",
          texte:
            "Sors la barre du rack et amène-la à l’aplomb des épaules, bras tendus. Descends lentement en gardant les coudes à environ 45 degrés du buste, vers le bas des pectoraux, dans l’amplitude où l’épaule reste confortable. Inspire pendant la descente. La barre se pose, elle ne s’écrase pas.",
        },
        {
          titre: "Pousser",
          texte:
            "Repousse la barre vers le haut, légèrement en direction des épaules, en poussant aussi le sol avec les pieds. Souffle au moment où ça devient dur. Tends les bras sans claquer les coudes en fin de mouvement.",
        },
      ],
      erreurs: [
        {
          titre: "Faire rebondir la barre sur la poitrine",
          pourquoi:
            "L’élan prend une partie du travail à la place des pectoraux, et le contact devient brutal. Descends jusqu’au contact, marque un temps très court, puis repousse.",
        },
        {
          titre: "Ouvrir les coudes à 90 degrés",
          pourquoi:
            "Coudes complètement écartés, l’avant de l’épaule est davantage sollicité et fatigue souvent avant les pectoraux. Autour de 45 degrés du buste, la poussée se répartit mieux.",
        },
        {
          titre: "Décoller les fessiers du banc",
          pourquoi:
            "Cambrer permet souvent de pousser un peu plus lourd, mais une partie du travail quitte les pectoraux et le bas du dos se retrouve sollicité au passage. Si les fessiers se lèvent série après série, c’est en général le signe qu’il faut alléger.",
        },
      ],
      variantes: [
        {
          angle: "Au poids du corps",
          exercice: "Pompes",
          texte:
            "Le même schéma de poussée, sans matériel, avec une partie de ton poids de corps comme charge. Les appuis au sol demandent plus de gainage, et poser les genoux ou surélever les mains permet d’ajuster.",
        },
        {
          angle: "Avec deux haltères",
          exercice: "Développé couché haltères",
          texte:
            "Chaque bras porte sa charge et se stabilise seul, ce qui demande plus de contrôle. Les haltères laissent aussi les mains descendre un peu plus bas que la barre, qui s’arrête au contact de la poitrine, et ils se posent sur les côtés en fin de série.",
        },
      ],
      placement:
        "C’est un mouvement chargé et technique, dont l’exécution se dégrade vite une fois fatigué : on le place donc souvent tôt dans une séance de haut du corps, tant qu’on est frais. Ce qui vient après dépend de la séance et de l’objectif, mais le travail plus léger ou plus ciblé se garde en général pour la suite, une fois le gros du travail fait.",
      materiel: "Barre, banc et supports",
      materielCourt: "Barre",
      precaution:
        "Travaille avec un pareur, ou avec des barres de sécurité réglées à hauteur de poitrine. Une barre qu’on n’arrive plus à repousser reste au-dessus de soi, alors que des haltères se posent sur les côtés.",
    },
  },
  {
    slug: "squat",
    exercice: "Squat",
    categorie: "jambes",
    title: "Squat : technique, muscles et erreurs fréquentes",
    description:
      "Le squat au poids du corps : placement des pieds, profondeur, remontée et les erreurs fréquentes. Le mouvement en animation.",
    contenu: {
      definition:
        "S’accroupir puis se relever, les deux pieds au sol. C’est un geste qu’on retrouve dans la vie courante, quand on se lève d’une chaise ou qu’on ramasse quelque chose au sol. Les cuisses et les fessiers fournissent l’effort, pendant que le tronc et le dos tiennent la position du buste, dont l’inclinaison varie selon la morphologie et la version du squat.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "Placer les pieds",
          texte:
            "Debout, pieds à peu près à largeur d’épaules, pointes légèrement ouvertes vers l’extérieur. L’écartement exact n’est pas le même pour tout le monde : la mobilité des hanches et des chevilles change ce qui est confortable. Cherche la position où tu peux descendre en gardant les talons au sol, et garde-la.",
        },
        {
          titre: "Descendre",
          texte:
            "Pousse les hanches vers l’arrière et plie les genoux en même temps, comme pour t’asseoir sur une chaise basse. Les genoux suivent la direction des pointes de pieds. Garde la poitrine ouverte et le regard devant. Inspire pendant la descente.",
        },
        {
          titre: "Trouver sa profondeur",
          texte:
            "Descends jusqu’où tu gardes le contrôle : talons au sol, bas du dos qui ne s’arrondit pas, remontée possible sans à-coup. Ce point est plus bas chez certains que chez d’autres, et il bouge avec le temps. Une descente moins profonde mais tenue vaut mieux qu’une descente basse dans laquelle tu t’effondres.",
        },
        {
          titre: "Remonter",
          texte:
            "Pousse dans tout le pied et remonte, hanches et poitrine ensemble. Souffle au moment où ça devient dur. En haut, tends les jambes sans verrouiller sèchement les genoux, et enchaîne.",
        },
      ],
      erreurs: [
        {
          titre: "Chercher la profondeur avant le contrôle",
          pourquoi:
            "Passé un certain point, propre à chacun, le bassin bascule et le bas du dos s’arrondit en fin de descente. La profondeur utile est celle où la position tient encore. Descends un peu moins bas, et laisse l’amplitude venir avec les semaines.",
        },
        {
          titre: "Laisser les genoux rentrer franchement vers l’intérieur",
          pourquoi:
            "Quand les genoux se rapprochent nettement l’un de l’autre pendant la remontée, c’est en général que l’effort dépasse ce que les hanches contrôlent à ce moment-là. Pense à écarter légèrement les genoux vers l’extérieur en poussant, et allège si ça revient à chaque répétition.",
        },
        {
          titre: "Laisser le buste s’effondrer",
          pourquoi:
            "Une certaine inclinaison du buste est normale, et elle n’est pas la même selon la morphologie et selon la version du squat. Ce qui pose problème, c’est la perte de position : le buste qui plonge d’un coup pendant la descente, ou qui se casse vers l’avant au moment de repousser. Cherche une inclinaison qui reste la même du début à la fin de la répétition, et allège ou réduis l’amplitude dès qu’elle se dégrade en cours de série.",
        },
      ],
      variantes: [
        {
          angle: "Avec une charge tenue devant",
          exercice: "Goblet squat",
          texte:
            "Un haltère ou une kettlebell tenue contre la poitrine. Le poids placé devant a tendance à redresser le buste, ce qui aide beaucoup de gens à descendre plus droit. C’est aussi la façon d’ajouter de la charge qui demande le moins de matériel : ni barre, ni rack.",
        },
        {
          angle: "Sur une seule jambe",
          exercice: "Squat bulgare",
          texte:
            "Le pied arrière posé sur un banc, l’essentiel du poids passe sur la jambe avant. L’équilibre fait alors partie du travail, et chaque jambe est chargée séparément, ce qui rend visible une différence entre les deux côtés.",
        },
      ],
      placement:
        "Le squat demande peu d’installation et sollicite beaucoup de muscles à la fois : au poids du corps, il tient aussi bien en échauffement qu’au milieu d’un circuit, où l’intérêt devient le volume et le rythme. Chargé, il se place plutôt en début de séance de jambes, tant que la coordination est fraîche, parce que c’est elle qui part en premier.",
      /* Ni `materiel` ni `materielCourt` : la famille de la bibliothèque
         dit déjà « Sans matériel », ce qui est exact et se lit bien. On
         ne redit pas ce que la donnée sait. */
    },
  },
  {
    slug: "souleve-de-terre",
    exercice: "Soulevé de terre classique",
    categorie: "dos",
    title: "Soulevé de terre : installation, tension, exécution",
    description:
      "Le soulevé de terre à la barre : la position de départ, la tension à créer avant de décoller, la coordination de la montée et les erreurs fréquentes. Le mouvement en animation.",
    contenu: {
      promesse:
        "Un mouvement qui met une grande partie du corps en jeu d’un coup : dos, fessiers, arrière des cuisses et tronc, sur chaque répétition.",
      definition:
        "Dans la version classique montrée ici, la barre part du sol : on la ramasse, on se relève avec, puis on la repose. La première chose à réussir est donc la position de départ, qu’on ne peut plus rattraper une fois la barre en l’air, et c’est ce qui rend l’installation aussi importante que l’effort lui-même.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "Installer la barre et les appuis",
          texte:
            "Barre au-dessus du milieu du pied, presque au contact des tibias. Pieds à largeur de bassin. Penche-toi en poussant les hanches vers l’arrière, plie les genoux et attrape la barre juste à l’extérieur des jambes, bras tendus.",
        },
        {
          titre: "Créer la tension avant de décoller",
          texte:
            "Avant que la barre ne quitte le sol, installe le buste et les hanches dans une position stable, serre le tronc, puis tire sur la barre juste assez pour en enlever le jeu. La hauteur exacte des hanches au départ n’est pas la même pour tout le monde : cherche celle que tu peux tenir pendant toute la montée. On ne décolle jamais d’un corps relâché.",
        },
        {
          titre: "Se relever",
          texte:
            "Pousse le sol avec les jambes et redresse le buste en même temps : les hanches et les épaules montent ensemble, pas l’une après l’autre. La barre reste proche des jambes pendant la montée, tibias puis cuisses. Souffle en fin de montée.",
        },
        {
          titre: "Verrouiller, puis reposer",
          texte:
            "Debout, les hanches finissent tendues sous les épaules. Il n’y a rien à ajouter à ce moment-là. Pour reposer, refais le chemin en sens inverse : pousse les hanches vers l’arrière, laisse la barre glisser le long des cuisses, et plie les genoux une fois qu’elle les a dépassés.",
        },
      ],
      erreurs: [
        {
          titre: "Laisser la barre s’éloigner des jambes",
          pourquoi:
            "Plus la barre s’écarte du corps, plus le buste doit tenir un levier long, à charge identique. Le mouvement devient nettement plus difficile sans que rien n’ait changé sur les disques. Garde-la proche des tibias, puis des cuisses.",
        },
        {
          titre: "Décoller d’un corps relâché",
          pourquoi:
            "Partir sans tension fait presque toujours monter les hanches en premier, et le buste se retrouve seul à finir le travail dans une position qu’il n’a pas choisie. Prends le temps de te tendre avant chaque répétition, y compris au milieu d’une série.",
        },
        {
          titre: "Basculer en arrière en fin de mouvement",
          pourquoi:
            "Le verrouillage se fait en tendant les hanches, pas en penchant le buste vers l’arrière. Une fois debout, bassin sous les épaules, le mouvement est terminé : continuer n’ajoute rien.",
        },
        {
          titre: "Enchaîner les répétitions en rebond",
          pourquoi:
            "Laisser tomber la barre et repartir sur le rebond fait perdre l’installation, et chaque répétition démarre alors d’une position un peu moins bonne que la précédente. Repose, replace-toi, repars.",
        },
      ],
      variantes: [
        {
          angle: "Sans revenir au sol",
          exercice: "Soulevé de terre roumain",
          texte:
            "La barre part du haut et descend le long des jambes jusqu’à mi-tibia, sans se reposer entre les répétitions. Les genoux restent peu fléchis : le mouvement se concentre sur la bascule des hanches et l’étirement de l’arrière des cuisses.",
        },
        {
          angle: "En balancier, avec une kettlebell",
          exercice: "Kettlebell swing",
          texte:
            "La même bascule de hanches, mais rapide et sans temps d’arrêt : la charge passe entre les jambes puis remonte par l’impulsion des hanches. C’est un travail de rythme et de vitesse, pas de charge maximale.",
        },
      ],
      titreVariantes: "Variantes et mouvements proches",
      placement:
        "Le soulevé de terre est souvent placé tôt dans la séance, quand il en est le mouvement prioritaire : il demande une position précise que la fatigue dégrade vite, et il sollicite à son tour une bonne partie de ce qui sert ensuite, du dos aux avant-bras. Son emplacement dépend malgré tout de la séance et de ce qu’on veut y faire passer.",
      materiel: "Une barre et des disques",
      materielCourt: "Barre",
      nomDansLeTitre: "le soulevé de terre",
      precaution:
        "La charge se monte par paliers, et le repère utile est observable : si la charge ou la fatigue t’oblige à abandonner la position que tu cherchais, c’est le signal pour arrêter la série ou réduire la difficulté, plutôt que pour tenter une répétition de plus.",
    },
  },
  {
    slug: "rowing-barre",
    exercice: "Rowing barre",
    categorie: "dos",
    title: "Rowing barre : technique, posture et erreurs fréquentes",
    description:
      "Le rowing barre buste penché : inclinaison, trajectoire de la barre, contrôle de la descente et erreurs fréquentes. Le mouvement en animation.",
    contenu: {
      definition:
        "Buste penché vers l’avant, on tire une barre vers le bas du torse puis on la laisse redescendre bras tendus. La difficulté est double : le dos tire, pendant que tout le reste du corps tient une position penchée qui demande déjà un effort. C’est ce qui sépare ce mouvement des autres tirages de la bibliothèque, où l’on est assis sur un siège ou en appui d’un genou sur un banc.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "Se placer",
          texte:
            "Pieds à largeur de bassin, barre au-dessus du milieu du pied. Plie légèrement les genoux, pousse les hanches vers l’arrière et penche le buste vers l’avant en gardant le dos plat. Prends la barre un peu plus large que les épaules. Autour de quarante-cinq degrés est un bon repère de départ : plus tu te rapproches de l’horizontale, plus la position elle-même devient coûteuse à tenir.",
        },
        {
          titre: "Tirer",
          texte:
            "Amène la barre vers le haut du ventre ou le bas du torse en menant avec les coudes, qui partent vers l’arrière plutôt que vers l’extérieur. Les omoplates se rapprochent en fin de tirage. Souffle sur cette partie.",
        },
        {
          titre: "Contrôler la descente",
          texte:
            "Laisse la barre redescendre jusqu’à bras tendus, sans la lâcher. Le buste, lui, reste exactement à la même hauteur qu’au départ : c’est le repère qui dit si la série est encore propre.",
        },
      ],
      erreurs: [
        {
          titre: "Se redresser à chaque répétition",
          pourquoi:
            "Un buste qui remonte pendant le tirage aide la barre à monter, mais l’amplitude réellement parcourue par le dos diminue d’autant. C’est une erreur difficile à sentir soi-même : une vidéo de profil la rend évidente en dix secondes.",
        },
        {
          titre: "Tirer avec un coup de reins",
          pourquoi:
            "Une impulsion des hanches à chaque répétition permet de mettre plus lourd, et le travail se déplace vers cette impulsion. Garde le bassin immobile et ralentis volontairement la descente : c’est le meilleur moyen de voir la charge réellement gérable.",
        },
        {
          titre: "Laisser le haut du dos s’enrouler sous la charge",
          pourquoi:
            "Quand la barre devient trop lourde pour la position penchée, le dos s’arrondit progressivement, série après série, souvent sans qu’on le décide. C’est le signal pour alléger plutôt que pour finir la série.",
        },
      ],
      variantes: [
        {
          angle: "À un bras, buste soutenu",
          exercice: "Rowing haltère",
          texte:
            "Un genou et une main en appui sur un banc : il n’y a plus de position penchée à tenir, ce qui déplace tout l’effort vers le tirage. Chaque côté travaille seul, et une différence entre les deux devient visible.",
        },
        {
          angle: "Au poids du corps",
          exercice: "Rowing inversé",
          texte:
            "Suspendu sous une barre basse, corps gainé, on tire la poitrine vers la barre. La charge est une fraction du poids du corps et se règle en changeant l’inclinaison du corps plutôt qu’en ajoutant des disques.",
        },
      ],
      placement:
        "Comme le buste reste penché pendant toute la série, le rowing barre demande aussi un effort de maintien du tronc : on le place donc plutôt tôt dans une séance de dos, avant les tirages où l’on est assis ou soutenu et où la fatigue du tronc compte moins. Placé après un soulevé de terre, il part avec une chaîne postérieure déjà bien sollicitée, ce qui limite en général ce qu’on peut y mettre.",
      materiel: "Une barre et des disques",
      materielCourt: "Barre",
    },
  },
  {
    slug: "developpe-militaire-halteres",
    exercice: "Développé militaire haltères",
    categorie: "epaules",
    title: "Développé militaire haltères : technique et trajectoire",
    description:
      "Le développé militaire aux haltères : position de départ, trajectoire de la charge, tenue du tronc et erreurs fréquentes. Le mouvement en animation.",
    contenu: {
      definition:
        "On pousse deux haltères depuis les épaules jusqu’au-dessus de la tête, bras tendus. À la différence des poussées faites allongé sur un banc, rien ne soutient le buste : le tronc participe aussi à stabiliser la position pendant que les épaules et les triceps poussent les haltères.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "Prendre la position",
          texte:
            "Debout, pieds sous les hanches et bien ancrés, ou assis sur un banc à dossier haut. Monte les haltères à hauteur d’épaules, coudes sous les poignets. Paumes vers l’avant ou légèrement tournées vers l’intérieur : les deux prises se pratiquent, garde celle où ton épaule est à l’aise. Serre le ventre et les fessiers avant de pousser.",
        },
        {
          titre: "Pousser",
          texte:
            "Monte les haltères vers le haut en gardant les poignets dans l’axe des avant-bras. La trajectoire passe près de la tête plutôt que loin devant. Souffle pendant la poussée. En haut, les bras sont tendus sans claquer les coudes, et les haltères se retrouvent à l’aplomb des épaules.",
        },
        {
          titre: "Redescendre en contrôlant",
          texte:
            "Ramène les haltères à hauteur d’épaules sans les laisser tomber. Inspire pendant la descente. Descends jusqu’où l’épaule reste confortable : le point bas n’est pas le même pour tout le monde, et le chercher à tout prix ne rend pas le mouvement meilleur.",
        },
      ],
      erreurs: [
        {
          titre: "Cambrer le bas du dos pour finir la poussée",
          pourquoi:
            "Quand les épaules n’ont plus de marge, le réflexe est de basculer le buste en arrière : le mouvement ressemble alors à un développé incliné fait debout, et le bas du dos travaille pour compenser. Serre le ventre avant chaque répétition, et allège si la cambrure revient à chaque série.",
        },
        {
          titre: "Pousser loin devant soi",
          pourquoi:
            "Des haltères qui montent en avant du visage obligent à terminer bras tendus vers l’avant, ce qui rend la fin de la poussée plus difficile qu’elle ne devrait l’être. Fais passer la charge près de la tête et termine à l’aplomb des épaules.",
        },
        {
          titre: "Donner une impulsion avec les jambes",
          pourquoi:
            "Un petit fléchissement suivi d’une poussée des jambes fait passer le point dur. C’est un mouvement à part entière quand on le fait exprès, mais ici il remplace le travail des épaules sans qu’on s’en aperçoive. Si l’élan devient nécessaire pour finir, la série est finie.",
        },
      ],
      variantes: [
        {
          angle: "Avec une rotation des mains",
          exercice: "Développé Arnold",
          texte:
            "On part paumes tournées vers soi et les mains pivotent pendant la montée. L’épaule passe par une amplitude plus large, et la charge utilisée est en général plus légère que sur un développé classique.",
        },
        {
          angle: "Sur machine",
          exercice: "Développé épaules machine",
          texte:
            "La trajectoire est imposée et le dossier soutient le buste. Il ne reste qu’à pousser : plus besoin de stabiliser deux charges indépendantes ni de tenir le tronc, ce qui change beaucoup ce que l’exercice demande.",
        },
      ],
      placement:
        "Comme la charge se déplace au-dessus de la tête sans appui du buste, le mouvement demande de la coordination et un tronc stable. Il est donc souvent placé avant les mouvements d’isolation des épaules. Après un développé couché, l’avant d’épaule et les triceps sont déjà sollicités : c’est un choix possible dans une séance de poussée, mais les performances peuvent y être un peu plus basses.",
      materiel: "Deux haltères",
      materielCourt: "Haltères",
      nomDansLeTitre: "le développé militaire aux haltères",
    },
  },
  {
    slug: "curl-biceps-halteres",
    exercice: "Curl haltères",
    categorie: "bras",
    title: "Curl biceps haltères : technique et erreurs fréquentes",
    description:
      "Le curl aux haltères : position des coudes, amplitude, contrôle de la descente et les erreurs fréquentes. Le mouvement en animation.",
    contenu: {
      definition:
        "Le mouvement principal du curl se fait au coude : le biceps fléchit l’avant-bras pendant que l’épaule et le reste du corps servent surtout à stabiliser la position. C’est ce qui le rend simple à comprendre et facile à dénaturer, puisque tout ce qui bouge en plus du coude retire du travail au biceps.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "Se placer",
          texte:
            "Debout, pieds sous les hanches, un haltère dans chaque main le long du corps, paumes vers l’avant. Coudes près du buste, épaules basses et ventre légèrement serré.",
        },
        {
          titre: "Monter",
          texte:
            "Plie les coudes et amène les haltères vers les épaules. Souffle en montant. Monte tant que les coudes restent stables : inutile de chercher à rapprocher les haltères au maximum des épaules si cela oblige à avancer les coudes.",
        },
        {
          titre: "Redescendre lentement",
          texte:
            "Redescends jusqu’à bras presque tendus, plus lentement que tu n’es monté. C’est la moitié du mouvement que l’on abandonne le plus souvent, et celle qui distingue une série faite d’une série expédiée.",
        },
      ],
      erreurs: [
        {
          titre: "Balancer le buste pour lancer la charge",
          pourquoi:
            "Le corps recule puis avance pour donner l’impulsion, et le biceps se contente d’accompagner. Si le balancier devient nécessaire pour finir la série, la série est finie.",
        },
        {
          titre: "Avancer les coudes en fin de montée",
          pourquoi:
            "Quand les coudes partent vers l’avant, l’épaule prend le relais et le haut du mouvement devient facile. Garde les coudes à côté du buste du début à la fin, même si la charge doit baisser.",
        },
        {
          titre: "Laisser tomber les haltères à la descente",
          pourquoi:
            "Si tu laisses simplement la gravité ramener la charge, tu perds une partie du contrôle de la répétition. Accompagne le retour jusqu’à avoir les bras presque tendus.",
        },
      ],
      variantes: [
        {
          angle: "Paumes face à face",
          exercice: "Curl marteau",
          texte:
            "Les mains restent tournées vers l’intérieur pendant tout le mouvement. Cette prise sollicite davantage l’avant-bras, et beaucoup de gens la trouvent plus confortable pour le poignet.",
        },
        {
          angle: "Les deux bras sur une même barre",
          exercice: "Curl barre EZ",
          texte:
            "Les deux bras travaillent ensemble, ce qui permet en général plus de charge totale. La barre coudée laisse les poignets légèrement tournés, une position souvent plus agréable qu’une barre droite.",
        },
      ],
      placement:
        "Le curl est un mouvement d’isolation : il ne prépare rien et fatigue les biceps, dont on se sert sur tous les tirages. Dans une séance qui contient de gros tirages, il est donc souvent placé après eux. En fin de séance, ou dans une séance de bras, la question ne se pose pas.",
      materiel: "Deux haltères",
      materielCourt: "Haltères",
      nomDansLeTitre: "le curl aux haltères",
    },
  },
  {
    slug: "gainage",
    exercice: "Gainage",
    categorie: "abdos",
    title: "Gainage : la position, la durée, les erreurs",
    description:
      "Le gainage sur les coudes : l’alignement, la tension à créer, la respiration et le temps de maintien. Le placement illustré.",
    contenu: {
      definition:
        "Le gainage ne va nulle part, et c’est tout son principe. En appui sur les avant-bras et la pointe des pieds, le travail consiste à empêcher le corps de bouger : le bassin ne descend pas, ne monte pas, ne tourne pas. Les abdominaux et les muscles profonds du tronc y résistent au mouvement au lieu d’en produire un, ce qui explique qu’on le compte en secondes et non en répétitions.",
      gabarit: "tenue",
      etapes: [
        {
          titre: "Se placer",
          texte:
            "Coudes au sol, juste sous les épaules, avant-bras parallèles. Pieds à largeur de bassin, en appui sur la pointe. La tête reste dans le prolongement du dos : regarde le sol un peu en avant de tes mains plutôt que tes pieds.",
        },
        {
          titre: "Créer la tension",
          texte:
            "Rentre très légèrement le bassin pour que le bas du dos ne se creuse pas, et pousse le sol avec les avant-bras comme pour éloigner tes épaules de tes coudes. Crée une tension volontaire dans le tronc et les fessiers, et continue à respirer normalement pendant que tu la tiens.",
        },
        {
          titre: "Tenir et respirer",
          texte:
            "Respire normalement, sans bloquer. La bonne durée est celle où l’alignement tient : dès que le bassin descend ou remonte, la série est finie, même si le chronomètre dit autre chose. Plusieurs séries courtes et propres valent mieux qu’une longue qui s’affaisse au milieu.",
        },
      ],
      erreurs: [
        {
          titre: "Laisser le bassin descendre vers le sol",
          pourquoi:
            "Quand le bassin s’affaisse, le tronc ne tient plus la ligne et la position se creuse au niveau du bas du dos. C’est le signal que la série est terminée, pas qu’il faut serrer les dents dix secondes de plus.",
        },
        {
          titre: "Monter le bassin en pointe",
          pourquoi:
            "La position devient nettement plus confortable, parce qu’une partie du poids repose sur les bras et les jambes au lieu du tronc. On tient plus longtemps en travaillant moins. Vise la ligne des talons à la tête, quitte à afficher un temps plus court.",
        },
        {
          titre: "Bloquer volontairement sa respiration",
          pourquoi:
            "Tu n’as pas besoin de retenir ton souffle pour tenir la position. Garde une respiration régulière pendant toute la série.",
        },
      ],
      variantes: [
        {
          angle: "Sur le côté",
          exercice: "Planche latérale",
          texte:
            "En appui sur un seul avant-bras, corps de profil. Ce sont les muscles du côté du tronc qui empêchent le bassin de tomber vers le sol, un travail que le gainage face au sol ne demande pas. Une position par côté.",
        },
        {
          angle: "Avec des appuis qui changent",
          exercice: "Gainage dynamique",
          texte:
            "Même position de départ, mais on passe des avant-bras aux mains tendues, puis retour. Il faut tenir l’alignement pendant que les appuis bougent, ce qui ajoute les épaules et les bras au travail du tronc.",
        },
      ],
      muscles: ["Abdominaux", "Muscles profonds du tronc"],
      placement:
        "Le gainage n’a pas de place obligée. En début de séance, il réveille le tronc avant des mouvements où il devra tenir seul. En fin de séance, il se fait sans matériel et sans installation, ce qui en fait un dernier exercice commode. Le seul moment discutable, c’est juste avant un mouvement chargé où le tronc doit rester solide : un tronc déjà fatigué change la façon dont on tient la position.",
    },
  },
  {
    slug: "burpees",
    exercice: "Burpees",
    categorie: "cardio",
    title: "Burpees : la séquence, le rythme, les erreurs",
    description:
      "Comment faire un burpee : la séquence décomposée, le rythme qu’on peut tenir, les adaptations possibles et les erreurs fréquentes. Le mouvement en animation.",
    contenu: {
      definition:
        "Un burpee enchaîne quatre choses sans s’arrêter : on descend au sol, on envoie les pieds en arrière pour se retrouver en planche, on les ramène sous soi, on se relève. Le corps entier change de position à chaque répétition, et c’est ce qui fait monter le rythme cardiaque aussi vite avec si peu de matériel.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "Descendre au sol",
          texte:
            "De debout, accroupis-toi et pose les mains au sol devant tes pieds, à peu près à largeur d’épaules. Les mains touchent le sol avant que les pieds ne bougent : c’est ce qui empêche de partir en avant.",
        },
        {
          titre: "Passer en planche",
          texte:
            "Envoie les deux pieds vers l’arrière d’un seul coup. Pendant la fraction de seconde où tu es en position de planche, le corps forme une ligne : ventre et fessiers serrés, bassin ni creusé ni en l’air.",
        },
        {
          titre: "Revenir sous soi",
          texte:
            "Ramène les deux pieds vers les mains, pieds à plat si ta mobilité le permet. C’est le temps où l’enchaînement se casse le plus souvent, parce que c’est celui qui coûte le plus quand la fatigue monte. Garde-le fluide, quitte à ralentir l’ensemble.",
        },
        {
          titre: "Se relever et enchaîner",
          texte:
            "Redresse-toi et repars. Avec ou sans saut en fin de mouvement, selon ce que tu cherches : le saut ajoute de l’intensité, la version sans saut permet de tenir des séries plus longues. Reçois-toi sur l’avant du pied puis le talon, genoux souples.",
        },
      ],
      erreurs: [
        {
          titre: "Partir trop vite sur les premières répétitions",
          pourquoi:
            "Un burpee coûte cher, et un départ lancé oblige presque toujours à ralentir ou à s’arrêter au milieu de la série. Choisis d’emblée un rythme que tu peux tenir jusqu’à la dernière répétition, sans dégrader les transitions.",
        },
        {
          titre: "Laisser le bassin s’affaisser en position de planche",
          pourquoi:
            "Quand les pieds partent en arrière et que le ventre lâche, le bas du dos encaisse l’arrivée. Serre le ventre et les fessiers avant d’envoyer les jambes, même si le passage ne dure qu’un instant.",
        },
        {
          titre: "Sacrifier le placement pour gagner du temps",
          pourquoi:
            "Mains mal posées, pieds à moitié ramenés, dos rond au moment de se relever : la vitesse gagnée se paie sur la qualité de chaque répétition, et le mouvement devient désagréable bien avant d’être efficace. Compte tes répétitions, pas tes secondes.",
        },
      ],
      variantes: [
        {
          angle: "Sans passage au sol",
          exercice: "Squats sautés",
          texte:
            "L’enchaînement se réduit au bas du corps : on garde l’impulsion et le rythme, on retire la planche et le retour au sol. Utile quand les poignets ou les épaules ne suivent pas, ou pour garder le cardio haut sans changer de position à chaque répétition.",
        },
        {
          angle: "En restant au sol",
          exercice: "Mountain climbers",
          texte:
            "On tient la position de planche et ce sont les genoux qui viennent vers la poitrine, en alternance. Le rythme cardiaque monte de la même façon, les épaules travaillent en continu, et il n’y a plus ni saut ni réception.",
        },
      ],
      /* Ni les squats sautés ni les mountain climbers ne sont des versions
         du burpee : ce sont des mouvements qu'on choisit à sa place. La
         bibliothèque ne contient aucune vraie variante de burpee, donc on
         nomme la section pour ce qu'elle est plutôt que de faire passer
         une alternative pour une progression. */
      titreVariantes: "Alternatives proches",
      muscles: ["Jambes", "Épaules", "Abdominaux"],
      placement:
        "Les burpees servent rarement de plat principal. Ils viennent en général dans un circuit, entre deux exercices de renforcement, ou en fin de séance sur un format court et minuté. Comme ils fatiguent le corps entier d’un coup, les placer avant un mouvement technique ou chargé peut réduire la qualité de ce qui suit.",
    },
  },
  {
    slug: "pompes",
    exercice: "Pompes",
    categorie: "pectoraux",
    title: "Pompes : position, amplitude et erreurs fréquentes",
    description:
      "Comment faire des pompes : position des mains, corps gainé, amplitude, trajet des coudes, erreurs fréquentes et variantes. Le mouvement en animation.",
    contenu: {
      definition:
        "Une pompe ressemble à un développé couché retourné : les mains restent au sol et c’est le corps entier qui monte et descend, poussé par les pectoraux, les triceps et l’avant des épaules. Le tronc travaille pendant toute la série, parce qu’il doit garder le corps droit comme une planche pendant que les bras poussent.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "Se placer",
          texte:
            "Mains au sol un peu plus larges que les épaules, doigts vers l’avant. Pieds joints ou légèrement écartés. Serre le ventre et les fessiers : des talons à la tête, le corps forme une ligne.",
        },
        {
          titre: "Descendre",
          texte:
            "Plie les coudes et laisse la poitrine descendre vers le sol, les coudes orientés en diagonale vers l’arrière plutôt qu’à l’horizontale. Descends jusqu’à frôler le sol avec la poitrine, ou aussi bas que tu peux en gardant la ligne du corps.",
        },
        {
          titre: "Pousser",
          texte:
            "Pousse le sol pour revenir bras tendus. Le corps remonte d’un seul bloc : les épaules et le bassin arrivent en haut en même temps.",
        },
      ],
      erreurs: [
        {
          titre: "Laisser le bassin s’affaisser",
          pourquoi:
            "Le milieu du corps descend vers le sol et le bas du dos se creuse : le corps ne monte plus d’un seul bloc. Serre les fessiers et le ventre, et si la ligne lâche, pose les genoux plutôt que de continuer.",
        },
        {
          titre: "Écarter les coudes à l’horizontale",
          pourquoi:
            "Quand les coudes partent sur les côtés, perpendiculaires au corps, l’avant des épaules encaisse une grande part de l’effort. Vu de dessus, le corps doit dessiner une flèche plutôt qu’un T.",
        },
        {
          titre: "Raccourcir l’amplitude",
          pourquoi:
            "Des pompes qui s’arrêtent à mi-chemin se comptent vite, mais elles laissent de côté le bas du mouvement, là où les pectoraux travaillent le plus étirés. Mieux vaut moins de répétitions jusqu’en bas, quitte à surélever les mains pour y arriver.",
        },
      ],
      variantes: [
        {
          angle: "Mains surélevées",
          exercice: "Pompes inclinées",
          texte:
            "Les mains sur un banc ou une marche, le corps incliné. Une partie du poids passe sur les pieds : les bras poussent moins lourd, avec exactement le même geste. Plus les mains sont hautes, plus la part des pieds grandit.",
        },
        {
          angle: "Mains rapprochées",
          exercice: "Pompes diamant",
          texte:
            "Les mains se touchent sous la poitrine, les pouces et les index dessinent un losange. Les coudes restent près du corps, et les triceps prennent une plus grande part du travail.",
        },
        {
          angle: "Avec une impulsion",
          exercice: "Pompes explosives",
          texte:
            "On pousse assez fort pour que les mains quittent le sol un instant. Le mouvement devient un travail de puissance, et la réception demande des poignets et des épaules habitués.",
        },
      ],
      placement:
        "À la maison, les pompes sont souvent le mouvement de poussée principal de la séance : elles se placent alors tôt, quand les bras sont frais. Dans une séance de salle qui commence par le développé couché, elles servent plutôt de finition. Elles se glissent aussi dans un circuit, entre un exercice de jambes et un exercice de tirage.",
      materiel: "Aucun, le sol suffit",
      materielCourt: "Sans matériel",
      nomDansLeTitre: "des pompes",
    },
  },
  {
    slug: "tractions",
    exercice: "Tractions",
    categorie: "dos",
    title: "Tractions : la prise, le tirage, les erreurs",
    description:
      "Comment faire une traction : la prise, le départ bras tendus, le trajet des coudes, la descente contrôlée et les erreurs fréquentes. Le mouvement en animation.",
    contenu: {
      definition:
        "Une traction hisse tout le corps jusqu’à une barre fixe, sans appui sous les pieds : le grand dorsal tire les coudes vers les côtes, les biceps et les avant-bras aident à plier les bras. On soulève son propre poids en entier, ce qui rend le mouvement exigeant même sans aucune charge.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "S’accrocher",
          texte:
            "Mains sur la barre paumes vers l’avant, un peu plus larges que les épaules. Pars suspendu bras tendus, puis, sans plier les bras, tire légèrement les épaules vers le bas pour ne pas rester affaissé dans les articulations.",
        },
        {
          titre: "Tirer",
          texte:
            "Tire les coudes vers les côtes, comme pour les ranger dans tes poches, et monte jusqu’à ce que le menton passe au-dessus de la barre. Les jambes peuvent être tendues ou croisées, mais elles restent calmes : elles ne lancent rien.",
        },
        {
          titre: "Redescendre sous contrôle",
          texte:
            "Redescends jusqu’aux bras tendus, plus lentement que tu n’es monté. Une traction se compte du bas jusqu’en haut : repartir à mi-chemin, c’est s’arrêter avant la partie la plus dure.",
        },
      ],
      erreurs: [
        {
          titre: "Lancer les jambes pour monter",
          pourquoi:
            "Le balancement donne un élan qui fait passer la barre sans que le dos ait fait le travail. Si tu ne montes plus qu’en te balançant, la série est terminée, ou c’est le moment de prendre une assistance.",
        },
        {
          titre: "Partir les bras à moitié pliés",
          pourquoi:
            "Commencer et finir chaque répétition à mi-hauteur retire la partie basse du mouvement, celle où le dos travaille le plus. Repars bras tendus, épaules engagées, à chaque répétition.",
        },
        {
          titre: "Tendre le cou vers la barre",
          pourquoi:
            "Le menton passe la barre en avançant la tête, et le corps, lui, n’est pas monté plus haut. Regarde devant toi et laisse la poitrine venir vers la barre.",
        },
      ],
      variantes: [
        {
          angle: "À la machine",
          exercice: "Tirage poitrine",
          texte:
            "Assis, cuisses calées, on tire une barre vers le haut de la poitrine. Le geste ressemble à la traction, mais la charge se règle : on peut travailler le mouvement avec moins que son propre poids.",
        },
        {
          angle: "Pieds au sol, tirage horizontal",
          exercice: "Rowing inversé",
          texte:
            "Allongé sous une barre basse, talons au sol, on tire la poitrine vers la barre. Le corps reste incliné, une partie du poids repose sur les pieds, et le tirage se fait vers l’avant plutôt que vers le haut.",
        },
      ],
      titreVariantes: "Alternatives proches",
      placement:
        "La traction demande de la fraîcheur : tôt dans une séance de dos, avant les rowings et les exercices plus légers, elle se fait mieux qu’en fin de séance. Comme elle fatigue aussi les biceps et les avant-bras, elle passe avant les curls plutôt qu’après.",
      materiel: "Une barre de traction fixe",
      materielCourt: "Barre fixe",
      promesse: "Un tirage vertical au poids du corps : le dos et les biceps te hissent jusqu’à la barre.",
      nomDansLeTitre: "une traction",
    },
  },
  {
    slug: "fentes",
    exercice: "Fentes",
    categorie: "jambes",
    title: "Fentes : le pas, la descente et les erreurs",
    description:
      "Comment faire des fentes : la longueur du pas, la descente à la verticale, le genou avant, la poussée et les erreurs fréquentes. Le mouvement en animation.",
    contenu: {
      definition:
        "Dans une fente, une jambe avance d’un grand pas et le corps descend entre les deux pieds : la jambe de devant porte l’essentiel du poids, celle de derrière sert d’appui et d’équilibre. On travaille une jambe à la fois, et c’est souvent là qu’on découvre qu’un côté est plus fort ou plus stable que l’autre.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "Faire le pas",
          texte:
            "Debout, pieds sous les hanches, avance un pied d’un grand pas. Assez long pour pouvoir descendre avec le pied avant bien à plat, sans te retrouver en grand écart. Garde un écart de la largeur des hanches entre les deux pieds, comme sur deux rails.",
        },
        {
          titre: "Descendre à la verticale",
          texte:
            "Descends en pliant les deux genoux, le buste droit, comme si tu t’asseyais entre tes pieds. Le genou arrière vient frôler le sol sans s’y poser lourdement, et le genou avant suit la direction des orteils.",
        },
        {
          titre: "Pousser pour revenir",
          texte:
            "Pousse dans le talon et le milieu du pied avant pour remonter et ramener la jambe. Change de jambe à chaque répétition, ou fais toute la série d’un côté puis de l’autre.",
        },
      ],
      erreurs: [
        {
          titre: "Un pas trop court",
          pourquoi:
            "Le talon avant se décolle et la jambe de devant travaille en déséquilibre, sur la pointe du pied. Allonge le pas jusqu’à pouvoir descendre avec le pied à plat.",
        },
        {
          titre: "Les deux pieds sur une même ligne",
          pourquoi:
            "Avec les pieds alignés comme sur une corde, l’équilibre devient la principale difficulté et le bassin vacille. Garde la largeur des hanches entre les pieds, du début à la fin de la série.",
        },
        {
          titre: "Plonger le buste pour se relever",
          pourquoi:
            "Le buste part en avant pour aider à remonter, et la jambe de devant pousse moins. Garde la poitrine haute et pousse dans le pied avant.",
        },
      ],
      variantes: [
        {
          angle: "Avec un saut",
          exercice: "Fentes sautées",
          texte:
            "On change de jambe en l’air, d’un saut, et on se réceptionne directement en fente. Le mouvement devient dynamique et fait monter le rythme cardiaque, et la réception demande du contrôle.",
        },
        {
          angle: "Pied arrière surélevé",
          exercice: "Squat bulgare",
          texte:
            "Le pied de derrière repose sur un banc et ne bouge plus. La jambe avant porte une part encore plus grande du poids, et on reste sur la même jambe pendant toute la série.",
        },
        {
          angle: "En montant sur un banc",
          exercice: "Step up banc",
          texte:
            "Au lieu d’avancer, on monte sur un banc d’une jambe, puis on redescend. Le travail reste une jambe à la fois, avec une montée qui ressemble davantage à un escalier.",
        },
      ],
      titreVariantes: "Variantes et mouvements proches",
      placement:
        "En salle, les fentes viennent souvent après le mouvement principal de jambes, un squat ou une presse, pour travailler chaque côté séparément. À la maison, sans charge, elles peuvent être le cœur de la séance. Comme elles demandent de l’équilibre, mieux vaut ne pas les garder pour le moment où les jambes ne tiennent plus.",
      materiel: "Aucun, des haltères si tu veux charger",
      materielCourt: "Sans matériel",
      nomDansLeTitre: "des fentes",
    },
  },
  {
    slug: "dips",
    exercice: "Dips barres parallèles",
    categorie: "bras",
    title: "Dips aux barres parallèles : technique et erreurs",
    description:
      "Comment faire des dips aux barres parallèles : position de départ, profondeur, épaules, inclinaison du buste et erreurs fréquentes. Le mouvement en animation.",
    contenu: {
      definition:
        "Aux dips, le corps est en appui entre deux barres, bras tendus, et descend en pliant les coudes avant de remonter : les triceps, le bas des pectoraux et l’avant des épaules poussent ensemble tout le poids du corps. L’inclinaison du buste change la répartition : plus droit, les triceps travaillent davantage ; légèrement penché vers l’avant, les pectoraux prennent une plus grande part.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "Se mettre en appui",
          texte:
            "Mains sur les barres, bras tendus, épaules basses et loin des oreilles. Les jambes pendent ou se croisent derrière toi, et le corps reste calme avant de descendre.",
        },
        {
          titre: "Descendre",
          texte:
            "Plie les coudes et laisse le corps descendre, coudes dirigés vers l’arrière. Descends jusqu’à ce que les bras forment à peu près un angle droit, ou moins bas si la position n’est plus confortable pour tes épaules.",
        },
        {
          titre: "Pousser",
          texte:
            "Pousse les barres vers le bas pour remonter jusqu’aux bras tendus, sans donner de coup sec dans les coudes en haut du mouvement.",
        },
      ],
      erreurs: [
        {
          titre: "Laisser les épaules remonter vers les oreilles",
          pourquoi:
            "Les épaules s’enfoncent et la position devient instable au point le plus bas. Garde-les basses et pousse les barres comme pour t’en éloigner, du début à la fin.",
        },
        {
          titre: "Descendre plus bas que l’épaule ne l’accepte",
          pourquoi:
            "Forcer la profondeur ne rend pas la répétition meilleure si l’avant de l’épaule tire. L’angle droit des coudes est un repère raisonnable : adapte-le à ce que tu contrôles.",
        },
        {
          titre: "Battre des jambes pour remonter",
          pourquoi:
            "Les jambes qui battent donnent un élan qui fait le travail à la place des bras. Si la remontée n’est plus possible sans élan, la série est finie.",
        },
      ],
      variantes: [
        {
          angle: "Sur une chaise",
          exercice: "Dips sur chaise",
          texte:
            "Les mains sur le bord d’une chaise ou d’un banc derrière soi, pieds au sol. Une partie du poids reste sur les jambes, et le mouvement se fait sans matériel spécial.",
        },
        {
          angle: "À la machine",
          exercice: "Dips machine",
          texte:
            "Assis, on pousse deux poignées vers le bas avec une charge réglable. Le geste reste le même, sans avoir à porter tout son poids ni à tenir l’équilibre.",
        },
      ],
      muscles: ["Triceps", "Pectoraux", "Épaules"],
      placement:
        "Dans une séance de poussée, les dips trouvent leur place après le développé couché ou les pompes, avant les exercices d’isolation des triceps. Placés en premier, ils fatigueraient les triceps dont le développé couché a besoin.",
      materiel: "Des barres parallèles ou une station de dips",
      materielCourt: "Barres parallèles",
      promesse: "Le corps descend entre deux barres et remonte à la force des bras : triceps, pectoraux et épaules poussent ensemble.",
      nomDansLeTitre: "des dips",
    },
  },
];

/* ──────────────────────────── Accès ──────────────────────────────── */

/** Une fiche prête pour l'affichage : le contenu rédigé, garanti présent,
    et l'entrée de bibliothèque déjà résolue. Les pages ne manipulent que
    ça, elles ne refont jamais la jointure elles-mêmes. */
export type FicheResolue = FichePublique & {
  contenu: ContenuFiche;
  lib: LibExercise;
};

const PAR_SLUG = new Map(FICHES.map((f) => [f.slug, f]));

/** Les fiches réellement publiables, dans l'ordre du fichier. */
export function fichesPubliees(): FicheResolue[] {
  return FICHES.map(resoudre).filter((f): f is FicheResolue => f !== null);
}

/* `fichesAVenir()` a existé et a été SUPPRIMÉE : le hub s'en servait pour
   afficher les fiches non rédigées en « fiche en préparation ». Décision de
   Louis, et elle vaut pour toute la suite : le public ne voit jamais un
   chantier. Une fiche sans contenu reste dans la donnée, elle tient son slug
   et son title, mais rien ne l'expose. Ne pas la ressusciter pour « montrer
   ce qui arrive » : le jour où le pilote est complet, la question ne se pose
   plus, et d'ici là une case grise dit surtout que le produit n'est pas
   fini. */

export function ficheParSlug(slug: string): FicheResolue | null {
  const f = PAR_SLUG.get(slug);
  return f ? resoudre(f) : null;
}

/** Le slug public d'un exercice, s'il en a une fiche PUBLIÉE. Sert à
    transformer une variante en lien sans jamais produire de lien mort. */
export function slugDeLExercice(nom: string): string | null {
  const f = FICHES.find((x) => x.exercice === nom);
  return f && f.contenu ? f.slug : null;
}

function resoudre(f: FichePublique): FicheResolue | null {
  if (!f.contenu) return null;
  const lib = trouverExercice(f.exercice);
  if (!lib) return null;
  return { ...f, contenu: f.contenu, lib };
}

/* ──────────────────── Le filet : on vérifie, on ne suppose pas ───────
   Trois erreurs sont possibles en écrivant une fiche, et les trois sont
   silencieuses à l'exécution : un nom d'exercice mal orthographié, deux
   slugs identiques, un slug qui vole son mot à une catégorie. Elles
   produiraient une page à moitié vide ou une route qui en masque une
   autre. On les fait donc parler, au rendu serveur, à la construction. */

export function verifierFiches(): string[] {
  const soucis: string[] = [];
  const vus = new Set<string>();

  for (const f of FICHES) {
    if (vus.has(f.slug)) soucis.push(`slug en double : « ${f.slug} »`);
    vus.add(f.slug);

    if (SLUGS_RESERVES.includes(f.slug)) {
      soucis.push(`le slug « ${f.slug} » est réservé à une catégorie`);
    }
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(f.slug)) {
      soucis.push(`slug mal formé : « ${f.slug} »`);
    }

    const lib = trouverExercice(f.exercice);
    if (!lib) {
      soucis.push(`« ${f.exercice} » n’existe pas dans la bibliothèque (fiche ${f.slug})`);
      continue;
    }
    if (!resolveGuide(lib.name)) {
      soucis.push(`« ${f.exercice} » n’a pas d’animation (fiche ${f.slug})`);
    }
    for (const v of f.contenu?.variantes ?? []) {
      if (!trouverExercice(v.exercice)) {
        soucis.push(`variante inconnue « ${v.exercice} » dans la fiche ${f.slug}`);
      }
    }
  }
  return soucis;
}

/** Les autres exercices de la même zone, pour la rangée de fin de fiche.

    On ne pioche QUE dans les fiches publiées. La première version allait
    chercher dans toute la bibliothèque, en se disant qu'un mouvement animé
    reste intéressant même sans fiche : c'était une erreur de jugement. Une
    rangée où trois vignettes sur quatre ne mènent nulle part se lit comme
    un catalogue en travaux, pas comme une profondeur de contenu.

    Conséquence assumée : tant qu'une zone n'a qu'une fiche, la rangée est
    vide et la page masque toute la section. Mieux vaut une fiche qui
    s'arrête net qu'une fiche qui promet une suite inexistante. */
export function voisinsPublies(fiche: FicheResolue, max = 4): FicheResolue[] {
  return fichesPubliees()
    .filter((f) => f.slug !== fiche.slug && f.lib.zone === fiche.lib.zone)
    .slice(0, max);
}
