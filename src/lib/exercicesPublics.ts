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
  {
    slug: "pont-fessier",
    exercice: "Pont fessier",
    categorie: "jambes",
    title: "Pont fessier : position, montée et erreurs",
    description:
      "Comment faire un pont fessier : placement des pieds, montée du bassin, contraction en haut, erreurs fréquentes et variantes. Le mouvement en animation.",
    contenu: {
      definition:
        "Au pont fessier, on est allongé sur le dos, pieds au sol, et on soulève le bassin jusqu’à former une ligne des genoux aux épaules : ce sont les fessiers qui font monter les hanches, aidés par l’arrière des cuisses. Le haut du dos reste posé pendant toute la série, et le mouvement se fait n’importe où, sans charge.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "S’installer",
          texte:
            "Allongé sur le dos, genoux pliés, pieds à plat à largeur de hanches, assez près des fesses pour que tes doigts effleurent tes talons. Les bras reposent le long du corps, paumes au sol.",
        },
        {
          titre: "Monter le bassin",
          texte:
            "Pousse dans les talons et monte le bassin jusqu’à ce que les genoux, les hanches et les épaules forment une ligne. En haut, serre les fessiers une seconde : ce sont eux qui tiennent la position, pas le bas du dos.",
        },
        {
          titre: "Redescendre",
          texte:
            "Redescends en déroulant le bassin jusqu’à frôler le sol, sans t’y reposer complètement entre deux répétitions, puis repars.",
        },
      ],
      erreurs: [
        {
          titre: "Cambrer en haut du mouvement",
          pourquoi:
            "Monter au-delà de la ligne genoux-épaules en creusant le bas du dos donne l’impression d’aller plus loin, mais ce sont les lombaires qui finissent le trajet. Arrête la montée quand le corps est aligné, et serre les fessiers.",
        },
        {
          titre: "Pousser sur la pointe des pieds",
          pourquoi:
            "Quand les talons se décollent, l’avant des cuisses prend le relais. Garde le poids sur les talons, au besoin en relevant légèrement les orteils.",
        },
        {
          titre: "Poser les pieds trop loin du bassin",
          pourquoi:
            "Plus les pieds s’éloignent, plus l’arrière des cuisses prend part au mouvement, au point parfois de déclencher une crampe. Rapproche-les jusqu’à sentir le travail dans les fessiers.",
        },
      ],
      variantes: [
        {
          angle: "Dos sur un appui, charge réglable",
          exercice: "Hip thrust machine",
          texte:
            "Le haut du dos repose sur un appui et la charge se règle sur la machine. L’extension de hanches est la même, avec un peu plus d’amplitude et un poids que le corps seul ne donne pas.",
        },
        {
          angle: "À quatre pattes, une jambe à la fois",
          exercice: "Donkey kick",
          texte:
            "À quatre pattes, on pousse un talon vers le plafond, genou plié. Le fessier travaille d’un côté à la fois, sans appui sur le dos.",
        },
        {
          angle: "Debout, à la poulie",
          exercice: "Kickback fessier poulie",
          texte:
            "Debout face à la machine, la jambe part vers l’arrière contre la résistance d’un câble. La tension reste présente pendant tout le trajet, une jambe à la fois.",
        },
      ],
      titreVariantes: "Variantes et mouvements proches",
      muscles: ["Fessiers", "Ischio-jambiers"],
      placement:
        "Le pont fessier se glisse facilement dans un échauffement, pour réveiller les fessiers avant des squats ou des fentes. Il peut aussi finir une séance de bas du corps, en séries longues, une fois les mouvements lourds terminés.",
      materiel: "Aucun, un tapis si tu en as un",
      materielCourt: "Sans matériel",
      nomDansLeTitre: "un pont fessier",
    },
  },
  {
    slug: "crunch",
    exercice: "Crunch",
    categorie: "abdos",
    title: "Crunch : le geste, la nuque et les erreurs",
    description:
      "Comment faire un crunch : la position, l’enroulement du dos, la respiration, les erreurs qui tirent sur la nuque et les variantes. Le mouvement en animation.",
    contenu: {
      definition:
        "Le crunch est un mouvement court : allongé sur le dos, on enroule seulement le haut du tronc, jusqu’à décoller les omoplates du sol, pendant que le bas du dos reste posé. Ce petit trajet suffit à faire travailler le grand droit de l’abdomen, le muscle qui rapproche les côtes du bassin.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "Se placer",
          texte:
            "Allongé sur le dos, genoux pliés, pieds à plat. Les mains se posent sur la poitrine, ou derrière les oreilles sans croiser les doigts derrière la tête.",
        },
        {
          titre: "Enrouler",
          texte:
            "Souffle et enroule le haut du dos, comme pour rapprocher les côtes du bassin, jusqu’à ce que les omoplates quittent le sol. Garde l’espace d’un poing entre le menton et la poitrine.",
        },
        {
          titre: "Redescendre",
          texte:
            "Redescends sans te laisser tomber, les abdominaux toujours serrés, jusqu’à ce que les épaules effleurent le sol, puis repars.",
        },
      ],
      erreurs: [
        {
          titre: "Tirer sur la nuque",
          pourquoi:
            "Les mains derrière la tête finissent souvent par tirer la tête vers l’avant, et c’est le cou qui travaille. Pose les doigts derrière les oreilles sans les croiser, ou garde les mains sur la poitrine.",
        },
        {
          titre: "Monter jusqu’à s’asseoir",
          pourquoi:
            "Se redresser jusqu’en haut transforme le crunch en sit-up : les muscles de la hanche prennent le relais sur la fin du trajet. Le crunch s’arrête quand les omoplates ont décollé.",
        },
        {
          titre: "Enchaîner avec de l’élan",
          pourquoi:
            "Rebondir sur le sol et lancer le buste fait monter le compteur, mais c’est l’élan qui fait une partie du trajet. Marque un temps en haut, et redescends plus lentement que tu n’es monté.",
        },
      ],
      variantes: [
        {
          angle: "Le bassin vient vers les côtes",
          exercice: "Reverse crunch",
          texte:
            "Le haut du dos reste au sol et c’est le bassin qui s’enroule vers la poitrine, jambes pliées. La nuque n’intervient pas du tout.",
        },
        {
          angle: "Avec une rotation",
          exercice: "Bicycle crunch",
          texte:
            "Un coude va vers le genou opposé pendant que l’autre jambe s’allonge, en alternance. La rotation fait travailler les obliques en plus du grand droit.",
        },
        {
          angle: "Jusqu’à la position assise",
          exercice: "Sit-ups",
          texte:
            "Le buste se déroule jusqu’à s’asseoir, puis redescend vertèbre par vertèbre. L’amplitude est plus grande, et les muscles de la hanche participent à la fin du trajet.",
        },
      ],
      placement:
        "Le crunch trouve sa place en fin de séance, une fois terminés les mouvements qui demandent un tronc solide, comme le squat ou le soulevé de terre : les fatiguer avant ne servirait pas ces mouvements-là. Il se combine bien avec un exercice de gainage, qui travaille le tronc sans le plier.",
      materiel: "Aucun, un tapis pour le confort",
      materielCourt: "Sans matériel",
      nomDansLeTitre: "un crunch",
    },
  },
  {
    slug: "elevations-laterales",
    exercice: "Élévations latérales",
    categorie: "epaules",
    title: "Élévations latérales : technique, hauteur et erreurs",
    description:
      "Comment faire des élévations latérales : position, hauteur des bras, rythme, erreurs fréquentes et variantes. Le mouvement en animation.",
    contenu: {
      definition:
        "Aux élévations latérales, les bras s’écartent sur les côtés jusqu’à l’horizontale, un haltère dans chaque main : c’est le faisceau du milieu de l’épaule, le deltoïde latéral, qui fait le travail. Le bras levé de côté forme un long levier, donc des charges légères suffisent : quelques kilos deviennent vite exigeants.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "Se placer",
          texte:
            "Debout, pieds à largeur de hanches, un haltère dans chaque main le long des cuisses. Les coudes sont très légèrement pliés et le restent jusqu’à la fin de la série.",
        },
        {
          titre: "Monter",
          texte:
            "Écarte les bras sur les côtés jusqu’à ce que les mains arrivent à hauteur des épaules, pas plus haut. Imagine que tu pousses les haltères vers les murs plutôt que vers le plafond.",
        },
        {
          titre: "Redescendre lentement",
          texte:
            "Redescends plus lentement que tu n’es monté, sans laisser les haltères retomber contre les cuisses, puis repars.",
        },
      ],
      erreurs: [
        {
          titre: "Hausser les épaules",
          pourquoi:
            "Quand les épaules montent vers les oreilles, ce sont les trapèzes qui soulèvent les haltères. Garde les épaules basses et arrête la montée à l’horizontale.",
        },
        {
          titre: "Prendre de l’élan",
          pourquoi:
            "Un coup de reins ou de genoux pour lancer les haltères permet de passer une charge trop lourde pour l’épaule. Si tu ne peux plus monter sans balancer le buste, prends des haltères plus légers.",
        },
        {
          titre: "Plier les coudes en cours de série",
          pourquoi:
            "Des coudes qui se plient de plus en plus raccourcissent le levier, et le mouvement s’allège sans qu’on s’en rende compte. Fixe l’angle des coudes au départ et garde-le.",
        },
      ],
      variantes: [
        {
          angle: "Bras devant soi",
          exercice: "Élévations frontales",
          texte:
            "Les haltères montent devant soi jusqu’à hauteur des yeux. Le travail passe sur l’avant de l’épaule, déjà sollicité par les mouvements de poussée.",
        },
        {
          angle: "Buste penché",
          exercice: "Oiseau haltères",
          texte:
            "Penché en avant, dos plat, on ouvre les bras sur les côtés. C’est l’arrière de l’épaule qui travaille, avec le haut du dos.",
        },
      ],
      titreVariantes: "Pour l’avant et l’arrière de l’épaule",
      placement:
        "Les élévations latérales se placent après les mouvements de poussée au-dessus de la tête, comme le développé militaire, quand l’épaule est chaude. Elles fatiguent peu le reste du corps, ce qui permet de les ajouter facilement à une séance de haut du corps, en séries longues.",
      materiel: "Une paire d’haltères légers",
      materielCourt: "Haltères",
      promesse: "Les bras s’écartent jusqu’à l’horizontale, un haltère dans chaque main : le milieu de l’épaule fait le travail.",
      nomDansLeTitre: "des élévations latérales",
    },
  },
  {
    slug: "rowing-haltere",
    exercice: "Rowing haltère",
    categorie: "dos",
    title: "Rowing haltère : appui, tirage et erreurs",
    description:
      "Comment faire un rowing haltère à un bras : appui sur le banc, dos plat, trajet du coude, erreurs fréquentes et variantes. Le mouvement en animation.",
    contenu: {
      definition:
        "Le rowing haltère se fait un bras à la fois, un genou et une main en appui sur un banc : le dos reste plat et l’haltère monte vers la hanche, tiré par le grand dorsal et le milieu du dos. L’appui soulage le bas du dos, qui n’a pas à tenir seul le buste penché, et travailler un côté après l’autre montre si l’un tire moins bien que l’autre.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "S’installer",
          texte:
            "Pose le genou et la main du même côté sur un banc, l’autre pied au sol un peu en retrait. Le dos est plat, à peu près parallèle au sol, et l’haltère pend sous l’épaule, bras tendu.",
        },
        {
          titre: "Tirer",
          texte:
            "Tire le coude vers la hanche, près du corps, jusqu’à ce que l’haltère arrive au niveau des côtes. Les épaules restent alignées : c’est le bras qui monte, le buste ne tourne pas.",
        },
        {
          titre: "Redescendre",
          texte:
            "Redescends jusqu’au bras tendu en laissant l’épaule s’allonger légèrement vers le sol, puis enchaîne. Fais toutes les répétitions d’un côté avant de changer.",
        },
      ],
      erreurs: [
        {
          titre: "Tourner le buste pour monter l’haltère",
          pourquoi:
            "Quand l’épaule s’ouvre vers le plafond, la rotation du tronc fait une partie du trajet. Si tu ne peux plus monter sans pivoter, la charge est trop lourde pour la série.",
        },
        {
          titre: "Tirer vers l’épaule",
          pourquoi:
            "Un haltère qui monte droit vers l’épaule, coude écarté, déplace le travail vers l’arrière de l’épaule et les trapèzes. Vise la hanche : le coude passe près des côtes.",
        },
        {
          titre: "Arrondir le dos",
          pourquoi:
            "Un dos qui s’arrondit au départ de chaque répétition perd la position que l’appui sur le banc devait rendre facile à tenir. Garde la poitrine ouverte et le dos plat du début à la fin.",
        },
      ],
      variantes: [
        {
          angle: "À deux mains, à la barre",
          exercice: "Rowing barre",
          texte:
            "Les deux bras tirent ensemble, buste penché sans appui : le bas du dos tient la position pendant toute la série, et la charge peut être plus lourde.",
        },
        {
          angle: "Deux haltères, buste penché",
          exercice: "Rowing buste penché haltères",
          texte:
            "Les deux haltères montent en même temps, sans appui sur un banc. Le tirage est le même, mais le dos doit tenir seul l’inclinaison.",
        },
        {
          angle: "Assis, à la poulie",
          exercice: "Rowing assis poulie",
          texte:
            "Assis, pieds calés, on tire une poignée vers le ventre. Le buste reste droit et la charge se règle sur la machine.",
        },
      ],
      placement:
        "Dans une séance de dos, le rowing haltère vient souvent après un tirage vertical, comme les tractions ou le tirage poitrine. Comme il se fait un côté après l’autre, il prend environ deux fois plus de temps qu’un rowing à deux mains : à prévoir quand la séance est courte.",
      materiel: "Un haltère et un banc plat",
      materielCourt: "Haltère et banc",
      nomDansLeTitre: "un rowing haltère",
    },
  },
  {
    slug: "tirage-poitrine",
    exercice: "Tirage poitrine",
    categorie: "dos",
    title: "Tirage poitrine : prise, trajet et erreurs",
    description:
      "Comment faire le tirage poitrine à la poulie haute : réglage, prise, trajet de la barre, erreurs fréquentes et variantes. Le mouvement en animation.",
    contenu: {
      definition:
        "Au tirage poitrine, on est assis sous une poulie haute, cuisses bloquées sous des boudins, et on tire une barre vers le haut de la poitrine : c’est le geste des tractions, mais la charge se choisit sur la machine au lieu d’être celle du corps entier. Le grand dorsal fait l’essentiel du travail, avec l’aide des biceps et du milieu du dos.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "Régler et s’installer",
          texte:
            "Règle les boudins pour que les cuisses soient bloquées, pieds à plat. Prends la barre un peu plus large que les épaules, paumes vers l’avant, et assieds-toi bras tendus, le buste très légèrement incliné en arrière.",
        },
        {
          titre: "Tirer",
          texte:
            "Tire les coudes vers le bas et vers les côtes, jusqu’à ce que la barre arrive en haut de la poitrine. La poitrine monte à la rencontre de la barre, les épaules restent basses.",
        },
        {
          titre: "Remonter sous contrôle",
          texte:
            "Laisse remonter la barre jusqu’aux bras tendus, plus lentement que tu ne l’as tirée, sans que les plaques ne viennent claquer sur la pile.",
        },
      ],
      erreurs: [
        {
          titre: "Se pencher en arrière pour tirer",
          pourquoi:
            "Le buste qui bascule loin en arrière transforme le tirage en rowing et se sert du poids du corps pour faire descendre la barre. Une légère inclinaison suffit, et elle reste la même pendant toute la série.",
        },
        {
          titre: "Tirer derrière la nuque",
          pourquoi:
            "Amener la barre derrière la tête oblige à pencher la tête en avant et à ouvrir l’épaule loin en arrière. Tire devant toi, vers le haut de la poitrine.",
        },
        {
          titre: "Tirer avec les mains",
          pourquoi:
            "Quand les mains tirent et que les coudes restent en arrière, les biceps finissent le mouvement à la place du dos. Pense à descendre les coudes : les mains ne font que tenir la barre.",
        },
      ],
      variantes: [
        {
          angle: "Suspendu, au poids du corps",
          exercice: "Tractions",
          texte:
            "Le corps monte vers la barre au lieu de faire descendre la barre vers soi. Le geste est le même, avec tout son poids à soulever et aucun réglage possible.",
        },
        {
          angle: "Tirage horizontal, à la poulie",
          exercice: "Rowing assis poulie",
          texte:
            "Assis face à la machine, on tire une poignée vers le ventre. Le tirage se fait vers l’arrière plutôt que vers le bas, et le milieu du dos prend une plus grande part.",
        },
        {
          angle: "Bras tendus, allongé sur un banc",
          exercice: "Pullover haltère",
          texte:
            "Allongé, on fait passer un haltère derrière la tête puis on le ramène au-dessus de la poitrine, bras presque tendus. Le grand dorsal travaille sans que les coudes se plient.",
        },
      ],
      titreVariantes: "Variantes et mouvements proches",
      placement:
        "En salle, le tirage poitrine ouvre souvent une séance de dos, parce que sa charge se règle au kilo près. Il remplace les tractions tant qu’elles ne passent pas encore, ou les complète quand elles sont faites, en séries plus longues.",
      materiel: "Une machine de tirage à poulie haute",
      materielCourt: "Poulie haute",
      promesse: "Assis sous une poulie haute, on tire une barre vers le haut de la poitrine : le grand dorsal travaille, avec une charge qui se règle.",
      nomDansLeTitre: "le tirage poitrine",
    },
  },
  {
    slug: "mountain-climbers",
    exercice: "Mountain climbers",
    categorie: "cardio",
    title: "Mountain climbers : position, rythme et erreurs",
    description:
      "Comment faire des mountain climbers : position de planche, mouvement des genoux, rythme, erreurs fréquentes et alternatives. Le mouvement en animation.",
    contenu: {
      definition:
        "Les mountain climbers se font en position de planche, mains au sol : les genoux viennent vers la poitrine l’un après l’autre, comme si on courait sur place à l’horizontale. Les épaules et le ventre tiennent la position pendant que les jambes vont vite, et le rythme cardiaque monte sans qu’on se relève une seule fois.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "Se mettre en planche",
          texte:
            "Mains au sol sous les épaules, bras tendus, corps en ligne des talons à la tête. Serre le ventre avant même de bouger les jambes.",
        },
        {
          titre: "Ramener les genoux",
          texte:
            "Amène un genou vers la poitrine, repose le pied, puis l’autre, en alternance. Les pieds touchent le sol légèrement, sans taper.",
        },
        {
          titre: "Trouver le rythme",
          texte:
            "Accélère seulement tant que les hanches restent à la hauteur des épaules. Sur une série chronométrée, un rythme régulier du début à la fin vaut mieux qu’un départ rapide qui s’effondre.",
        },
      ],
      erreurs: [
        {
          titre: "Monter les fesses",
          pourquoi:
            "Quand les hanches remontent vers le plafond, le corps forme un V et les genoux passent plus facilement, mais le ventre ne gaine plus. Garde les hanches à hauteur des épaules, quitte à ralentir.",
        },
        {
          titre: "Laisser les épaules reculer derrière les mains",
          pourquoi:
            "Si les épaules passent en arrière des poignets, la position s’affaisse et les bras soutiennent moins bien le corps. Garde les épaules au-dessus des mains pendant toute la série.",
        },
        {
          titre: "Sacrifier l’amplitude à la vitesse",
          pourquoi:
            "Des genoux qui ne viennent qu’à mi-chemin font de petits pas sur place. Ramène vraiment le genou sous la poitrine, et accélère seulement si l’amplitude tient.",
        },
      ],
      variantes: [
        {
          angle: "Sans mouvement des jambes",
          exercice: "Gainage dynamique",
          texte:
            "On passe de la planche sur les coudes à la planche sur les mains, et retour. Le tronc travaille de la même façon, et ce sont les bras qui bougent à la place des jambes.",
        },
        {
          angle: "En avançant à quatre pattes",
          exercice: "Bear crawl",
          texte:
            "Genoux à quelques centimètres du sol, on avance en déplaçant un bras et la jambe opposée. Le gainage est le même, avec un déplacement et un rythme plus lent.",
        },
        {
          angle: "Avec un retour debout",
          exercice: "Burpees",
          texte:
            "On passe par la planche, puis on se relève à chaque répétition. Le corps entier change de position, et le rythme cardiaque monte davantage.",
        },
      ],
      titreVariantes: "Alternatives proches",
      muscles: ["Abdominaux", "Épaules", "Jambes"],
      placement:
        "Les mountain climbers trouvent leur place dans un circuit, entre deux exercices de renforcement, ou dans un échauffement pour faire monter le rythme cardiaque. Comme ils sollicitent les poignets et les épaules, mieux vaut ne pas les placer juste avant des pompes ou un développé.",
      materiel: "Aucun, le sol suffit",
      materielCourt: "Sans matériel",
      nomDansLeTitre: "des mountain climbers",
    },
  },
  {
    slug: "presse-a-cuisses",
    exercice: "Presse à cuisses",
    categorie: "jambes",
    title: "Presse à cuisses : réglage, amplitude et erreurs",
    description:
      "Comment utiliser la presse à cuisses : placement des pieds, amplitude, position du dos, erreurs fréquentes et variantes. Le mouvement en animation.",
    contenu: {
      definition:
        "À la presse à cuisses, on est assis dans un siège incliné et on pousse une plateforme chargée avec les pieds : cuisses et fessiers font le travail d’un squat, sans charge sur le dos ni équilibre à tenir. La place des pieds sur la plateforme change la répartition : plus bas, les quadriceps travaillent davantage ; plus haut, les fessiers et l’arrière des cuisses prennent une plus grande part.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "S’installer",
          texte:
            "Assieds-toi le dos et le bassin bien calés contre le dossier. Pose les pieds à plat au milieu de la plateforme, à largeur de hanches, puis déverrouille les sécurités.",
        },
        {
          titre: "Descendre",
          texte:
            "Laisse la plateforme descendre en pliant les genoux, jusqu’à environ l’angle droit, ou un peu plus bas tant que le bassin reste collé au dossier. Les genoux suivent la direction des pieds.",
        },
        {
          titre: "Pousser",
          texte:
            "Pousse dans tout le pied pour remonter, sans verrouiller les genoux en haut : ils restent très légèrement pliés entre deux répétitions.",
        },
      ],
      erreurs: [
        {
          titre: "Laisser le bassin décoller",
          pourquoi:
            "En descendant trop bas, le bassin s’enroule et le bas du dos quitte le dossier. Arrête la descente juste avant : c’est elle qui fixe ton amplitude, plus que l’angle des genoux.",
        },
        {
          titre: "Verrouiller les genoux en haut",
          pourquoi:
            "Tendre complètement les jambes à chaque répétition fait reposer la charge sur les articulations plutôt que sur les muscles. Garde une légère flexion en haut du mouvement.",
        },
        {
          titre: "Charger plus que tu ne contrôles",
          pourquoi:
            "La machine permet de pousser lourd sur une toute petite amplitude, ce qui fait grimper les chiffres sans faire travailler les jambes sur tout le trajet. Choisis la charge qui te laisse descendre jusqu’au bout.",
        },
      ],
      variantes: [
        {
          angle: "Debout, sans machine",
          exercice: "Squat",
          texte:
            "Le même travail des cuisses et des fessiers, debout : le tronc et l’équilibre entrent en jeu, et le mouvement se fait partout.",
        },
        {
          angle: "Debout, un haltère contre la poitrine",
          exercice: "Goblet squat",
          texte:
            "On descend en squat en tenant un haltère contre la poitrine. La charge reste modeste, et le buste a tendance à rester droit de lui-même.",
        },
        {
          angle: "Le genou seul, à la machine",
          exercice: "Leg extension",
          texte:
            "Assis, on tend la jambe contre un boudin. Seul le genou bouge, donc le travail se concentre sur l’avant des cuisses.",
        },
      ],
      titreVariantes: "Variantes et mouvements proches",
      placement:
        "La presse à cuisses vient souvent après un squat dans une séance de jambes, pour continuer à travailler les cuisses quand le dos et l’équilibre commencent à fatiguer. Elle peut aussi être le mouvement principal pour quelqu’un qui ne squatte pas encore avec une barre.",
      materiel: "Une machine de presse à cuisses",
      materielCourt: "Machine",
      promesse: "Assis, dos calé, on pousse une plateforme chargée avec les jambes : cuisses et fessiers travaillent sans équilibre à tenir.",
      nomDansLeTitre: "la presse à cuisses",
    },
  },
  {
    slug: "squat-bulgare",
    exercice: "Squat bulgare",
    categorie: "jambes",
    title: "Squat bulgare : distance, descente et erreurs",
    description:
      "Comment faire un squat bulgare : la distance au banc, la descente à la verticale, l’équilibre, les erreurs fréquentes et les variantes. Le mouvement en animation.",
    contenu: {
      definition:
        "Au squat bulgare, le pied arrière repose sur un banc et ne bouge plus : toute la série se fait sur la jambe avant, qui descend et remonte en portant l’essentiel du poids du corps. C’est une fente qu’on ne quitte pas, où la jambe de devant fait seule le travail que deux jambes se partagent dans un squat.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "Trouver la distance",
          texte:
            "Dos au banc, pose le dessus du pied arrière dessus. Avance le pied avant d’un grand pas : en bas du mouvement, le talon avant doit rester au sol. Fais un essai sans charge pour régler la distance.",
        },
        {
          titre: "Descendre",
          texte:
            "Descends à la verticale en pliant la jambe avant, le buste droit ou légèrement penché vers l’avant, jusqu’à ce que le genou arrière approche du sol.",
        },
        {
          titre: "Remonter",
          texte:
            "Pousse dans le talon et le milieu du pied avant pour remonter, sans t’aider de la jambe arrière. Termine toutes les répétitions d’un côté avant de changer.",
        },
      ],
      erreurs: [
        {
          titre: "Un pied avant trop près du banc",
          pourquoi:
            "Le talon avant se décolle en bas et le poids part sur les orteils. Avance le pied jusqu’à pouvoir descendre talon au sol.",
        },
        {
          titre: "Pousser avec la jambe arrière",
          pourquoi:
            "La jambe posée sur le banc ne sert qu’à l’équilibre. Si elle pousse, c’est elle qui aide le corps à remonter, et la jambe avant travaille moins.",
        },
        {
          titre: "Aligner les pieds comme sur une corde",
          pourquoi:
            "Un pied avant placé juste devant le pied arrière rend la position instable et le bassin vacille. Décale-le de la largeur des hanches, comme pour une fente.",
        },
      ],
      variantes: [
        {
          angle: "Le pied arrière au sol",
          exercice: "Fentes",
          texte:
            "Les deux pieds restent au sol et on peut changer de jambe à chaque répétition. La jambe arrière participe un peu plus, et l’équilibre se trouve plus facilement.",
        },
        {
          angle: "En montant sur le banc",
          exercice: "Step up banc",
          texte:
            "Au lieu de descendre, on monte sur le banc d’une jambe, puis on redescend. Le travail reste une jambe à la fois, avec une montée qui ressemble à un escalier.",
        },
      ],
      titreVariantes: "Variantes et mouvements proches",
      placement:
        "À la maison, sans barre, le squat bulgare suffit souvent à rendre une séance de jambes exigeante avec une simple chaise : il en devient alors le mouvement principal. En salle, il vient après le squat ou la presse, des haltères en main si le poids du corps ne suffit plus.",
      materiel: "Un banc ou une chaise stable, des haltères si tu veux charger",
      materielCourt: "Banc",
      promesse: "Le pied arrière posé sur un banc, on descend sur la jambe avant : cuisse et fessier travaillent une jambe à la fois.",
      nomDansLeTitre: "un squat bulgare",
    },
  },
  {
    slug: "souleve-de-terre-roumain",
    exercice: "Soulevé de terre roumain",
    categorie: "jambes",
    title: "Soulevé de terre roumain : technique et erreurs",
    description:
      "Comment faire un soulevé de terre roumain : charnière de hanches, dos plat, barre près des cuisses, amplitude et erreurs fréquentes. Le mouvement en animation.",
    contenu: {
      definition:
        "Le soulevé de terre roumain part debout, la charge en main, une barre ou deux haltères, et descend en poussant les hanches vers l’arrière, jambes presque tendues : l’arrière des cuisses et les fessiers travaillent, étirés en bas puis contractés pour revenir. Contrairement au soulevé de terre classique, la charge ne repose jamais au sol entre deux répétitions.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "Se placer",
          texte:
            "Debout, pieds à largeur de hanches, la barre ou les haltères tenus juste devant les cuisses, bras tendus. Les genoux sont très légèrement fléchis, et ils le restent pendant toute la série.",
        },
        {
          titre: "Descendre en reculant les hanches",
          texte:
            "Pousse les hanches vers l’arrière, comme pour fermer une porte avec les fesses, et laisse le buste s’incliner. La charge glisse le long des cuisses puis des tibias, le dos reste plat. Descends jusqu’à sentir l’étirement à l’arrière des cuisses, souvent vers le milieu des tibias.",
        },
        {
          titre: "Remonter",
          texte:
            "Ramène les hanches vers l’avant en serrant les fessiers, jusqu’à te retrouver debout. La charge reste près des jambes à la montée comme à la descente.",
        },
      ],
      erreurs: [
        {
          titre: "Plier les genoux comme pour un squat",
          pourquoi:
            "Si les genoux avancent et que les hanches descendent, le mouvement devient un soulevé de terre classique raccourci, et l’arrière des cuisses n’est plus étiré. Le geste se fait par les hanches, les genoux bougent à peine.",
        },
        {
          titre: "Arrondir le dos pour descendre plus bas",
          pourquoi:
            "La bonne amplitude s’arrête là où le dos reste plat. Gagner quelques centimètres en enroulant le dos déplace l’effort vers le bas du dos au lieu de l’arrière des cuisses.",
        },
        {
          titre: "Laisser la charge s’éloigner des jambes",
          pourquoi:
            "Une charge qui part vers l’avant allonge le levier et tire sur le bas du dos. Garde-la près des cuisses, presque à les frôler.",
        },
      ],
      variantes: [
        {
          angle: "Depuis le sol, à chaque répétition",
          exercice: "Soulevé de terre classique",
          texte:
            "La barre repart du sol à chaque répétition, et les genoux plient davantage : les jambes poussent aussi, et la charge peut être plus lourde.",
        },
        {
          angle: "Une poussée de hanches explosive",
          exercice: "Kettlebell swing",
          texte:
            "La même charnière de hanches, mais rapide : les hanches projettent la kettlebell vers l’avant, et le rythme cardiaque monte avec.",
        },
        {
          angle: "L’arrière des cuisses seul, à la machine",
          exercice: "Leg curl allongé",
          texte:
            "Allongé, on plie les genoux contre un boudin. Seul le genou bouge : l’arrière des cuisses travaille sans charnière de hanches ni charge sur le dos.",
        },
      ],
      titreVariantes: "Variantes et mouvements proches",
      placement:
        "Dans une séance de jambes, le soulevé de terre roumain vient souvent après un squat ou une presse, pour l’arrière des cuisses que ces mouvements travaillent moins. Il peut aussi ouvrir une séance de bas du corps centrée sur les fessiers et l’arrière des cuisses.",
      materiel: "Une barre chargée, ou deux haltères",
      materielCourt: "Barre ou haltères",
      nomDansLeTitre: "un soulevé de terre roumain",
    },
  },
  {
    slug: "developpe-incline-halteres",
    exercice: "Développé incliné haltères",
    categorie: "pectoraux",
    title: "Développé incliné haltères : réglage et technique",
    description:
      "Comment faire le développé incliné aux haltères : inclinaison du banc, placement, trajectoire, amplitude et erreurs fréquentes. Le mouvement en animation.",
    contenu: {
      definition:
        "Le développé incliné se fait allongé sur un banc relevé, un haltère dans chaque main : on pousse vers le haut, et le haut des pectoraux prend une plus grande part qu’à plat. Avec des haltères, chaque bras pousse seul, et les mains peuvent descendre un peu plus bas qu’avec une barre.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "Régler le banc et s’installer",
          texte:
            "Incline le dossier autour de 30 degrés. Assieds-toi les haltères posés sur les cuisses, puis allonge-toi en les ramenant à hauteur de poitrine. Pieds à plat, omoplates serrées contre le dossier.",
        },
        {
          titre: "Descendre",
          texte:
            "Descends les haltères de chaque côté du haut de la poitrine, poignets au-dessus des coudes, jusqu’à sentir un léger étirement à l’avant des épaules et des pectoraux.",
        },
        {
          titre: "Pousser",
          texte:
            "Pousse les haltères vers le haut en les rapprochant légèrement, sans les cogner l’un contre l’autre. Les poignets restent droits du début à la fin.",
        },
      ],
      erreurs: [
        {
          titre: "Un banc trop relevé",
          pourquoi:
            "Au-delà de 45 degrés, le mouvement se rapproche d’un développé militaire : les épaules prennent le relais sur les pectoraux. Autour de 30 degrés, la poitrine reste le moteur.",
        },
        {
          titre: "Décoller les fesses du banc",
          pourquoi:
            "Cambrer jusqu’à soulever le bassin aplatit l’inclinaison et permet de passer une charge trop lourde. Les fesses restent sur le banc, les pieds au sol.",
        },
        {
          titre: "Écarter les coudes à l’horizontale",
          pourquoi:
            "Des coudes alignés avec les épaules placent l’avant de l’épaule en première ligne. Garde-les un peu plus bas, entre le corps et l’horizontale.",
        },
      ],
      variantes: [
        {
          angle: "À plat, à la barre",
          exercice: "Développé couché",
          texte:
            "Le banc à plat et une barre : les deux bras poussent ensemble, le milieu des pectoraux travaille davantage, et la charge se règle par disques.",
        },
        {
          angle: "À plat, aux haltères",
          exercice: "Développé couché haltères",
          texte:
            "Le même geste sur un banc plat : l’inclinaison disparaît, et chaque bras pousse toujours seul.",
        },
        {
          angle: "Bras ouverts, à la poulie",
          exercice: "Écarté à la poulie",
          texte:
            "Les bras restent presque tendus et se referment devant la poitrine contre la résistance d’un câble : les pectoraux travaillent sans l’aide des triceps.",
        },
      ],
      titreVariantes: "Variantes et mouvements proches",
      placement:
        "Le développé incliné se place en début ou en milieu de séance de poussée, juste après le développé couché, ou à sa place une séance sur deux. Les mouvements plus légers comme les écartés viennent après.",
      materiel: "Un banc inclinable et deux haltères",
      materielCourt: "Haltères et banc",
      nomDansLeTitre: "le développé incliné aux haltères",
    },
  },
  {
    slug: "extension-triceps-poulie",
    exercice: "Extension triceps poulie",
    categorie: "bras",
    title: "Extension triceps à la poulie : technique et erreurs",
    description:
      "Comment faire l’extension des triceps à la poulie : la position des coudes, l’extension complète, le rythme et les erreurs fréquentes. Le mouvement en animation.",
    contenu: {
      definition:
        "À l’extension des triceps à la poulie, on se tient debout face à une poulie haute et on pousse une corde ou une barre vers le bas en tendant les bras, coudes immobiles contre le corps : le triceps fait tout le travail. Le câble garde de la résistance jusqu’aux bras tendus, là où un haltère n’en offre presque plus.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "Se placer",
          texte:
            "Face à la poulie, pieds à largeur de hanches, la corde ou la barre en main. Coudes collés au corps, avant-bras à peu près à l’horizontale, buste très légèrement penché vers l’avant.",
        },
        {
          titre: "Tendre les bras",
          texte:
            "Pousse vers le bas jusqu’à ce que les bras soient complètement tendus. Avec une corde, écarte un peu les mains en bas du mouvement.",
        },
        {
          titre: "Remonter sous contrôle",
          texte:
            "Laisse remonter les mains jusqu’à ce que les avant-bras reviennent à l’horizontale, lentement, sans que les coudes ne quittent les côtes.",
        },
      ],
      erreurs: [
        {
          titre: "Laisser les coudes bouger",
          pourquoi:
            "Des coudes qui avancent et reculent transforment le mouvement en tirage, et les épaules viennent aider. Imagine-les vissés contre tes côtes : seuls les avant-bras bougent.",
        },
        {
          titre: "Se pencher sur la poulie",
          pourquoi:
            "Le poids du corps qui appuie sur la corde fait descendre une charge trop lourde pour les triceps seuls. Garde le buste presque droit, et allège si tu dois te jeter dessus.",
        },
        {
          titre: "S’arrêter avant l’extension complète",
          pourquoi:
            "Les derniers centimètres, bras tendus, sont ceux où le triceps est le plus contracté. Va jusqu’en bas à chaque répétition.",
        },
      ],
      variantes: [
        {
          angle: "Aux haltères, bras au-dessus de la tête",
          exercice: "Extension triceps haltère",
          texte:
            "Le bras monte au-dessus de la tête et l’avant-bras descend derrière : la longue portion du triceps travaille en position étirée.",
        },
        {
          angle: "Au poids du corps",
          exercice: "Dips barres parallèles",
          texte:
            "Le corps entier descend entre deux barres : les triceps poussent avec les pectoraux et les épaules, et la charge est celle du corps.",
        },
        {
          angle: "Mains serrées, au sol",
          exercice: "Pompes diamant",
          texte:
            "Des pompes mains jointes sous la poitrine : les coudes restent près du corps et les triceps prennent une grande part du travail, sans aucun matériel.",
        },
      ],
      titreVariantes: "Variantes et mouvements proches",
      placement:
        "L’extension à la poulie se place en fin de séance de poussée ou de bras, après les mouvements qui sollicitent déjà les triceps, comme le développé couché ou les dips. Facile à doser, elle se prête bien aux séries longues.",
      materiel: "Une poulie haute, avec une corde ou une barre",
      materielCourt: "Poulie",
      nomDansLeTitre: "l’extension des triceps à la poulie",
    },
  },
  {
    slug: "planche-laterale",
    exercice: "Planche latérale",
    categorie: "abdos",
    title: "Planche latérale : la position et les erreurs",
    description:
      "Comment faire la planche latérale : l’appui sur le coude, l’alignement, les hanches hautes, la respiration et les erreurs fréquentes. Le placement illustré.",
    contenu: {
      definition:
        "La planche latérale se tient sur un seul appui, l’avant-bras ou la main, et sur le côté d’un pied, le corps de profil : ce sont les muscles du côté du tronc, les obliques, qui empêchent les hanches de tomber. On la tient d’un côté puis de l’autre, et l’écart entre les deux côtés se sent souvent dès la première fois.",
      gabarit: "tenue",
      etapes: [
        {
          titre: "Se placer",
          texte:
            "Allongé sur le côté, en appui sur l’avant-bras, coude juste sous l’épaule. La version sur la main, bras tendu comme sur l’animation, se place de la même façon, la main sous l’épaule. Jambes tendues, pieds posés l’un sur l’autre, ou décalés pour plus de stabilité.",
        },
        {
          titre: "Monter les hanches",
          texte:
            "Pousse le sol avec ton appui et soulève les hanches jusqu’à former une ligne de la tête aux pieds. La main libre se pose sur la hanche, ou le bras se tend vers le plafond.",
        },
        {
          titre: "Tenir et respirer",
          texte:
            "Respire normalement, sans bloquer. La série dure tant que les hanches restent hautes : quand elles s’affaissent, change de côté, même si le chronomètre n’a pas fini.",
        },
      ],
      erreurs: [
        {
          titre: "Laisser les hanches s’affaisser",
          pourquoi:
            "Quand le bassin descend vers le sol, ce sont l’épaule et les articulations qui portent le corps, et les obliques travaillent moins. Remonte les hanches, ou raccourcis la tenue.",
        },
        {
          titre: "Placer l’appui loin de l’épaule",
          pourquoi:
            "Un coude, ou une main, décalé devant ou derrière l’épaule met l’appui en porte-à-faux. Il se place à l’aplomb de l’épaule.",
        },
        {
          titre: "Pivoter vers le sol ou vers le plafond",
          pourquoi:
            "Un corps qui tourne trouve une position plus facile à tenir, et le côté du tronc se relâche. Les hanches et les épaules restent de profil, empilées l’une sur l’autre.",
        },
      ],
      variantes: [
        {
          angle: "Face au sol, sur les deux coudes",
          exercice: "Gainage",
          texte:
            "La planche classique, sur les deux avant-bras : le travail se répartit sur tout l’avant du tronc au lieu d’un seul côté.",
        },
        {
          angle: "Avec du mouvement",
          exercice: "Gainage dynamique",
          texte:
            "On passe de la planche sur les coudes à la planche sur les mains, et retour : le tronc tient la position pendant que les bras bougent.",
        },
        {
          angle: "En rotation, assis",
          exercice: "Russian twist",
          texte:
            "Assis, buste incliné, on tourne les épaules d’un côté puis de l’autre : les obliques travaillent en mouvement plutôt qu’en tenue.",
        },
      ],
      titreVariantes: "Variantes et mouvements proches",
      muscles: ["Obliques", "Abdominaux", "Épaules"],
      placement:
        "La planche latérale se glisse en fin de séance avec le gainage, ou dans un échauffement pour réveiller le tronc avant des mouvements debout. Comme elle se fait d’un côté puis de l’autre, une série compte les deux côtés.",
      materiel: "Aucun, un tapis pour le confort",
      materielCourt: "Sans matériel",
      nomDansLeTitre: "la planche latérale",
    },
  },
  {
    slug: "russian-twist",
    exercice: "Russian twist",
    categorie: "abdos",
    title: "Russian twist : la rotation et les erreurs",
    description:
      "Comment faire le russian twist : la position assise, la rotation des épaules, le rythme, les erreurs fréquentes et les variantes. Le mouvement en animation.",
    contenu: {
      definition:
        "Au russian twist, on est assis, le buste incliné vers l’arrière, et on tourne les épaules d’un côté puis de l’autre : les obliques, sur les côtés du ventre, font la rotation pendant que le reste du tronc tient l’inclinaison. Il se fait les mains jointes, ou avec un poids tenu contre la poitrine pour le rendre plus exigeant.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "S’installer",
          texte:
            "Assis au sol, genoux pliés, talons posés ou légèrement décollés. Incline le buste vers l’arrière, dos droit, jusqu’à sentir le ventre travailler pour tenir la position.",
        },
        {
          titre: "Tourner",
          texte:
            "Tourne les épaules et le buste d’un côté, les mains jointes devant toi, jusqu’à ce qu’elles passent à côté de la hanche. Le regard suit les mains.",
        },
        {
          titre: "Changer de côté",
          texte:
            "Repasse par le centre et tourne de l’autre côté. Chaque côté touché compte pour une répétition.",
        },
      ],
      erreurs: [
        {
          titre: "Ne bouger que les bras",
          pourquoi:
            "Des mains qui balaient de gauche à droite pendant que les épaules restent face à l’avant ne font presque pas tourner le tronc. Ce sont les épaules qui tournent, les bras suivent.",
        },
        {
          titre: "Arrondir le dos",
          pourquoi:
            "Un dos qui s’enroule fait perdre l’inclinaison et tire sur le bas du dos. Garde la poitrine ouverte, quitte à moins t’incliner.",
        },
        {
          titre: "Aller trop vite",
          pourquoi:
            "Un rythme rapide transforme la rotation en balancement, et l’élan fait le travail. Tourne de façon contrôlée, avec un léger temps de chaque côté.",
        },
      ],
      variantes: [
        {
          angle: "Allongé, en pédalant",
          exercice: "Bicycle crunch",
          texte:
            "Allongé sur le dos, on amène un coude vers le genou opposé pendant que l’autre jambe s’allonge : la rotation s’ajoute à l’enroulement du buste.",
        },
        {
          angle: "En tenue, sur un côté",
          exercice: "Planche latérale",
          texte:
            "Les obliques travaillent sans bouger : on tient le corps de profil sur un appui, hanches hautes.",
        },
        {
          angle: "Sans rotation",
          exercice: "Crunch",
          texte:
            "Allongé, on enroule seulement le haut du dos : le grand droit de l’abdomen travaille, sans tourner.",
        },
      ],
      titreVariantes: "Variantes et mouvements proches",
      muscles: ["Obliques", "Abdominaux"],
      placement:
        "Le russian twist se place en fin de séance, avec les autres exercices d’abdos, souvent après un exercice de gainage. Il se glisse aussi dans un circuit au poids du corps, entre deux mouvements de jambes.",
      materiel: "Aucun, un poids léger si tu veux charger",
      materielCourt: "Sans matériel",
      nomDansLeTitre: "le russian twist",
    },
  },
  {
    slug: "curl-marteau",
    exercice: "Curl marteau",
    categorie: "bras",
    title: "Curl marteau : technique et erreurs",
    description:
      "Comment faire le curl marteau : la prise neutre, les coudes fixes, la montée, la descente contrôlée et les erreurs fréquentes. Le mouvement en animation.",
    contenu: {
      definition:
        "Le curl marteau se fait les paumes tournées l’une vers l’autre, comme on tiendrait un marteau : en pliant les coudes, le biceps travaille avec le brachial et les muscles de l’avant-bras. Cette prise neutre est souvent plus confortable pour les poignets que la prise paumes vers le haut.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "Se placer",
          texte:
            "Debout, un haltère dans chaque main le long du corps, paumes tournées vers les cuisses. Coudes près des côtes, épaules basses.",
        },
        {
          titre: "Monter",
          texte:
            "Plie les coudes pour monter les haltères vers les épaules, en gardant les paumes face à face du début à la fin. Les coudes restent à la même place.",
        },
        {
          titre: "Redescendre",
          texte:
            "Redescends lentement jusqu’aux bras tendus, sans laisser les haltères tomber. Les deux bras peuvent travailler ensemble ou en alternance.",
        },
      ],
      erreurs: [
        {
          titre: "Balancer le buste",
          pourquoi:
            "Un coup de reins lance les haltères et fait passer une charge trop lourde pour les bras. Le buste reste immobile : si tu dois te balancer, prends plus léger.",
        },
        {
          titre: "Avancer les coudes",
          pourquoi:
            "Des coudes qui partent vers l’avant à la montée font travailler l’avant de l’épaule. Ils restent collés aux côtes.",
        },
        {
          titre: "Lâcher la descente",
          pourquoi:
            "La descente compte autant que la montée. Laisser tomber les haltères fait perdre une bonne partie du travail.",
        },
      ],
      variantes: [
        {
          angle: "Paumes vers le haut",
          exercice: "Curl haltères",
          texte:
            "La prise classique, paumes tournées vers le haut : le biceps travaille davantage, l’avant-bras un peu moins.",
        },
        {
          angle: "À la barre coudée",
          exercice: "Curl barre EZ",
          texte:
            "Les deux mains sur une barre coudée : la charge peut être plus lourde qu’aux haltères, et les poignets restent dans l’axe.",
        },
      ],
      placement:
        "Le curl marteau se place en fin de séance de bras ou de tirage, après les mouvements de dos qui sollicitent déjà les biceps. Il se combine bien avec un curl classique, pour varier la prise.",
      materiel: "Une paire d’haltères",
      materielCourt: "Haltères",
      promesse: "Les paumes face à face, on plie les coudes : le biceps et l’avant-bras travaillent ensemble.",
      nomDansLeTitre: "le curl marteau",
    },
  },
  {
    slug: "goblet-squat",
    exercice: "Goblet squat",
    categorie: "jambes",
    title: "Goblet squat : technique et erreurs",
    description:
      "Comment faire le goblet squat : la prise de l’haltère, la descente entre les pieds, le buste droit et les erreurs fréquentes. Le mouvement en animation.",
    contenu: {
      definition:
        "Au goblet squat, on tient un haltère ou une kettlebell contre la poitrine, comme une coupe, et on descend en squat : le poids placé devant aide à garder le buste droit et à descendre entre les pieds. C’est souvent la première façon de charger un squat, avant de passer à la barre.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "Se placer",
          texte:
            "Debout, pieds un peu plus larges que les hanches, pointes légèrement ouvertes. Tiens l’haltère contre la poitrine, les mains sous sa tête, coudes vers le bas.",
        },
        {
          titre: "Descendre",
          texte:
            "Descends en pliant les genoux et les hanches, comme pour t’asseoir entre tes talons. Le buste reste droit, et les coudes passent à l’intérieur des genoux en bas.",
        },
        {
          titre: "Remonter",
          texte:
            "Pousse dans tout le pied pour remonter, genoux dans l’axe des pieds, jusqu’à te retrouver debout.",
        },
      ],
      erreurs: [
        {
          titre: "Laisser l’haltère s’éloigner",
          pourquoi:
            "Un haltère qui part vers l’avant tire le buste avec lui. Garde-le collé à la poitrine pendant toute la série.",
        },
        {
          titre: "Laisser les genoux rentrer",
          pourquoi:
            "Des genoux qui se rapprochent en remontant perdent l’alignement avec les pieds. Pousse-les légèrement vers l’extérieur, dans la direction des orteils.",
        },
        {
          titre: "Décoller les talons",
          pourquoi:
            "Les talons qui se lèvent en bas font basculer le poids sur l’avant du pied. Garde tout le pied au sol, quitte à descendre un peu moins bas.",
        },
      ],
      variantes: [
        {
          angle: "Au poids du corps",
          exercice: "Squat",
          texte:
            "Le même geste sans charge : les bras tendus devant aident à l’équilibre, et le mouvement se fait partout.",
        },
        {
          angle: "La barre sur le dos",
          exercice: "Squat barre",
          texte:
            "La charge passe sur le haut du dos : elle peut être bien plus lourde, et le mouvement demande plus de technique.",
        },
        {
          angle: "Sur une jambe",
          exercice: "Squat bulgare",
          texte:
            "Le pied arrière posé sur un banc : la jambe avant porte l’essentiel du poids, une jambe à la fois.",
        },
      ],
      placement:
        "À la maison, le goblet squat peut être le mouvement principal d’une séance de jambes avec un seul haltère. En salle, il sert d’échauffement avant le squat à la barre, ou de deuxième mouvement après lui.",
      materiel: "Un haltère ou une kettlebell",
      materielCourt: "Haltère",
      promesse: "Un haltère tenu contre la poitrine, on descend en squat : le poids devant aide à garder le buste droit.",
      nomDansLeTitre: "un goblet squat",
    },
  },
  {
    slug: "face-pull",
    exercice: "Face pull poulie",
    categorie: "epaules",
    title: "Face pull à la poulie : technique et erreurs",
    description:
      "Comment faire le face pull : la hauteur de la poulie, la prise de la corde, le tirage vers le visage et les erreurs fréquentes. Le mouvement en animation.",
    contenu: {
      definition:
        "Au face pull, on tire une corde fixée à une poulie haute vers le visage, en écartant les mains : l’arrière des épaules et le haut du dos travaillent, des muscles que les mouvements de poussée sollicitent peu. Le tirage finit coudes hauts, mains à hauteur des tempes.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "Régler la poulie",
          texte:
            "Place la poulie à hauteur du visage, avec une corde. Saisis les deux bouts et recule d’un pas, pour que les bras soient tendus devant toi.",
        },
        {
          titre: "Tirer vers le visage",
          texte:
            "Tire la corde vers ton visage en écartant les mains, coudes hauts, jusqu’à ce que les mains arrivent à côté des tempes. Serre les omoplates en fin de mouvement.",
        },
        {
          titre: "Revenir",
          texte:
            "Laisse revenir la corde jusqu’aux bras tendus, lentement, sans laisser la charge t’entraîner vers l’avant.",
        },
      ],
      erreurs: [
        {
          titre: "Tirer coudes bas",
          pourquoi:
            "Des coudes qui descendent transforment le face pull en rowing, et le milieu du dos prend le relais sur l’arrière des épaules. Garde les coudes à hauteur des épaules.",
        },
        {
          titre: "Se pencher en arrière",
          pourquoi:
            "Basculer le buste pour tirer fait travailler le dos et le poids du corps à la place des épaules. Reste droit, et allège la charge si besoin.",
        },
        {
          titre: "Charger trop lourd",
          pourquoi:
            "Trop lourd, le mouvement se raccourcit et les épaules remontent vers les oreilles. Une charge modérée et un tirage contrôlé suffisent.",
        },
      ],
      variantes: [
        {
          angle: "Aux haltères, buste penché",
          exercice: "Oiseau haltères",
          texte:
            "Penché en avant, on ouvre les bras sur les côtés : l’arrière des épaules travaille, sans poulie.",
        },
        {
          angle: "Bras sur les côtés",
          exercice: "Élévations latérales",
          texte:
            "Debout, on monte les bras sur les côtés jusqu’à l’horizontale : c’est le milieu de l’épaule qui travaille.",
        },
        {
          angle: "Assis, vers le ventre",
          exercice: "Rowing assis poulie",
          texte:
            "On tire une poignée vers le ventre, coudes bas : le milieu du dos prend la plus grande part.",
        },
      ],
      titreVariantes: "Variantes et mouvements proches",
      placement:
        "Le face pull se place en fin de séance de poussée ou d’épaules, pour équilibrer les mouvements où l’on pousse devant soi. Avec une charge légère, il sert aussi d’échauffement des épaules avant un développé.",
      materiel: "Une poulie haute avec une corde",
      materielCourt: "Poulie",
      nomDansLeTitre: "le face pull",
    },
  },
  {
    slug: "chaise-au-mur",
    exercice: "Chaise au mur",
    categorie: "jambes",
    title: "Chaise au mur : la position et les erreurs",
    description:
      "Comment faire la chaise au mur : le dos plaqué, l’angle des genoux, la position des pieds, la respiration et les erreurs fréquentes. La position illustrée.",
    contenu: {
      definition:
        "La chaise au mur se tient sans bouger : le dos plaqué contre un mur, on descend jusqu’à avoir les cuisses parallèles au sol, comme assis sur une chaise invisible, et on reste dans cette position. Les cuisses travaillent pendant toute la tenue, sans aucun saut ni impact, et sans autre matériel qu’un mur.",
      gabarit: "tenue",
      etapes: [
        {
          titre: "Se placer",
          texte:
            "Dos contre le mur, pieds écartés de la largeur des hanches et avancés d’environ un pas. Laisse-toi glisser le long du mur en pliant les genoux.",
        },
        {
          titre: "Trouver l’angle",
          texte:
            "Arrête-toi quand les cuisses sont parallèles au sol, les genoux au-dessus des chevilles. Si c’est trop dur au début, reste un peu plus haut : l’angle se gagne avec les semaines.",
        },
        {
          titre: "Tenir et respirer",
          texte:
            "Le dos et la tête restent collés au mur, les bras le long du corps. Respire calmement, sans bloquer, jusqu’à la fin de la tenue, puis remonte en poussant dans les talons.",
        },
      ],
      erreurs: [
        {
          titre: "Placer les pieds trop près du mur",
          pourquoi:
            "Des pieds trop proches font passer les genoux devant les orteils et chargent l’avant du genou. Avance-les jusqu’à ce que les genoux se trouvent au-dessus des chevilles.",
        },
        {
          titre: "Pousser avec les mains",
          pourquoi:
            "Des mains posées sur les cuisses soulagent les jambes et raccourcissent le travail. Laisse les bras le long du corps, ou croisés sur la poitrine.",
        },
        {
          titre: "Bloquer la respiration",
          pourquoi:
            "Retenir son souffle fait monter la tension et écourte la tenue. Une respiration lente et régulière aide à tenir plus longtemps.",
        },
      ],
      variantes: [
        {
          angle: "En mouvement, debout",
          exercice: "Squat",
          texte:
            "Le même angle, mais on descend et on remonte sans mur : les cuisses et les fessiers travaillent en mouvement.",
        },
        {
          angle: "Assis, à la machine",
          exercice: "Leg extension",
          texte:
            "Assis, on tend les jambes contre un rouleau chargé : l’avant des cuisses travaille seul, sans le reste du corps.",
        },
        {
          angle: "Une jambe à la fois",
          exercice: "Fentes",
          texte:
            "Un grand pas, puis on descend le genou arrière vers le sol : chaque jambe travaille à son tour, avec plus d’équilibre à trouver.",
        },
      ],
      titreVariantes: "Variantes et mouvements proches",
      placement:
        "La chaise au mur se place en fin de séance de jambes, quand les cuisses sont déjà chaudes, ou dans un circuit au poids du corps entre deux mouvements. Elle se fait aussi à la maison, partout où il y a un mur libre.",
      materiel: "Un mur",
      materielCourt: "Sans matériel",
      promesse: "Le dos contre le mur, les cuisses à l’horizontale, on tient : les cuisses travaillent sans aucun impact.",
      nomDansLeTitre: "la chaise au mur",
    },
  },
  {
    slug: "releves-de-jambes",
    exercice: "Relevés de jambes",
    categorie: "abdos",
    title: "Relevés de jambes : technique et erreurs",
    description:
      "Comment faire les relevés de jambes au sol : la position, la montée des jambes, la descente contrôlée, le dos plaqué et les erreurs fréquentes. En animation.",
    contenu: {
      definition:
        "Aux relevés de jambes, on est allongé sur le dos et on monte les jambes tendues jusqu’à la verticale, puis on les redescend lentement : les abdominaux travaillent pour garder le bas du dos au sol pendant que les jambes bougent. Plus les jambes descendent près du sol, plus le travail est intense.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "S’installer",
          texte:
            "Allongé sur le dos, jambes tendues et serrées, bras le long du corps, paumes au sol. Plaque le bas du dos contre le sol avant de commencer.",
        },
        {
          titre: "Monter les jambes",
          texte:
            "Monte les jambes tendues jusqu’à ce qu’elles soient à la verticale, au-dessus des hanches, sans élan.",
        },
        {
          titre: "Redescendre lentement",
          texte:
            "Redescends en contrôlant, jusqu’à frôler le sol, ou moins bas si le bas du dos décolle. C’est le dos plaqué qui fixe l’amplitude, pas le sol.",
        },
      ],
      erreurs: [
        {
          titre: "Laisser le bas du dos se creuser",
          pourquoi:
            "Quand les jambes descendent trop bas pour le ventre, le bas du dos décolle et se cambre. Arrête la descente plus haut, ou plie légèrement les genoux.",
        },
        {
          titre: "Prendre de l’élan",
          pourquoi:
            "Des jambes lancées vers le haut puis lâchées font travailler l’élan à la place du ventre. Monte et descends au même rythme, sans à-coup.",
        },
        {
          titre: "Pousser sur les mains",
          pourquoi:
            "Appuyer fort sur les paumes soulage les abdominaux. Les mains restent posées pour l’équilibre, sans pousser le sol.",
        },
      ],
      variantes: [
        {
          angle: "Genoux pliés, bassin qui s’enroule",
          exercice: "Reverse crunch",
          texte:
            "On ramène les genoux vers la poitrine en décollant légèrement le bassin : le mouvement est plus court, le bas du dos moins sollicité.",
        },
        {
          angle: "En tenue",
          exercice: "Hollow hold",
          texte:
            "Jambes et épaules décollées du sol, on tient la position sans bouger, le bas du dos plaqué.",
        },
        {
          angle: "Jambes et buste ensemble",
          exercice: "V-ups",
          texte:
            "On monte les jambes et le buste en même temps pour toucher les pieds : tout l’avant du tronc travaille d’un coup.",
        },
      ],
      titreVariantes: "Variantes et mouvements proches",
      placement:
        "Les relevés de jambes se placent en fin de séance, avec les autres exercices d’abdos, ou dans un circuit au poids du corps. Un tapis rend la position plus confortable pour le dos.",
      materiel: "Aucun, un tapis pour le confort",
      materielCourt: "Sans matériel",
      promesse: "Allongé, on monte les jambes tendues puis on les redescend lentement : le ventre travaille pour garder le dos au sol.",
      nomDansLeTitre: "des relevés de jambes",
    },
  },
  {
    slug: "jumping-jacks",
    exercice: "Jumping jacks",
    categorie: "cardio",
    title: "Jumping jacks : le mouvement et les erreurs",
    description:
      "Comment faire les jumping jacks : le saut pieds écartés, les bras au-dessus de la tête, la réception souple, le rythme et les erreurs fréquentes. En animation.",
    contenu: {
      definition:
        "Le jumping jack est un saut sur place : on écarte les pieds en levant les bras au-dessus de la tête, puis on revient pieds joints, bras le long du corps, et on enchaîne. Il fait monter le cœur et réveille tout le corps en quelques secondes, c’est pour ça qu’on le trouve si souvent au début d’un échauffement.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "Se placer",
          texte:
            "Debout, pieds joints, bras le long du corps, genoux légèrement fléchis.",
        },
        {
          titre: "Sauter en écartant",
          texte:
            "Saute en écartant les pieds un peu plus large que les épaules, pendant que les bras montent sur les côtés jusqu’au-dessus de la tête.",
        },
        {
          titre: "Revenir",
          texte:
            "Saute de nouveau pour revenir pieds joints, bras le long du corps, et enchaîne. Le rythme reste régulier, du début à la fin de la série.",
        },
      ],
      erreurs: [
        {
          titre: "Atterrir jambes tendues",
          pourquoi:
            "Retomber genoux bloqués, sur les talons, fait encaisser le choc par les articulations. Reçois-toi sur l’avant du pied, genoux souples.",
        },
        {
          titre: "Lever les bras à moitié",
          pourquoi:
            "Des bras qui s’arrêtent à hauteur d’épaules réduisent le mouvement et le travail du cœur. Ils montent jusqu’au-dessus de la tête à chaque saut.",
        },
        {
          titre: "Partir trop vite",
          pourquoi:
            "Un départ très rapide essouffle en quelques secondes et casse le rythme de la série. Commence à une allure que tu peux tenir, puis accélère si tu veux.",
        },
      ],
      variantes: [
        {
          angle: "Sur place, genoux hauts",
          exercice: "Montées de genoux",
          texte:
            "On court sur place en montant les genoux à hauteur des hanches : le travail se concentre sur les jambes et le souffle.",
        },
        {
          angle: "Avec une corde",
          exercice: "Corde à sauter",
          texte:
            "De petits sauts réguliers, les poignets font tourner la corde : il faut un peu de coordination, et le rythme s’installe vite.",
        },
        {
          angle: "Avec un passage au sol",
          exercice: "Burpees",
          texte:
            "On ajoute une descente en planche entre deux sauts : tout le corps travaille, et le souffle monte plus vite.",
        },
      ],
      titreVariantes: "Variantes et mouvements proches",
      placement:
        "Les jumping jacks ouvrent souvent un échauffement, une ou deux minutes avant les premiers mouvements. Ils trouvent aussi leur place dans un circuit cardio, en alternance avec des mouvements au sol. Sur un sol dur ou en appartement, des baskets qui amortissent rendent les sauts plus confortables.",
      materiel: "Aucun",
      materielCourt: "Sans matériel",
      nomDansLeTitre: "des jumping jacks",
    },
  },
  {
    slug: "dips-sur-chaise",
    exercice: "Dips sur chaise",
    categorie: "bras",
    title: "Dips sur chaise : technique et erreurs",
    description:
      "Comment faire des dips sur une chaise : la position des mains, la descente coudes vers l’arrière, la remontée et les erreurs fréquentes. Le mouvement en animation.",
    contenu: {
      definition:
        "Les dips sur chaise se font dos à une chaise, les mains posées sur le bord de l’assise : en pliant les coudes, on fait descendre le corps, puis on remonte en tendant les bras. Ce sont surtout les triceps, à l’arrière du bras, qui font le travail, avec un simple meuble stable à la maison.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "Se placer",
          texte:
            "Dos à une chaise stable, calée contre un mur si possible, mains posées sur le bord de l’assise, doigts vers l’avant. Avance les pieds : jambes pliées pour commencer, tendues comme sur l’animation quand le mouvement devient facile.",
        },
        {
          titre: "Descendre",
          texte:
            "Plie les coudes vers l’arrière pour faire descendre le corps, le dos proche de la chaise, jusqu’à ce que les bras forment un angle droit.",
        },
        {
          titre: "Remonter",
          texte:
            "Pousse dans les paumes pour tendre les bras et remonter, épaules basses, loin des oreilles.",
        },
      ],
      erreurs: [
        {
          titre: "Ouvrir les coudes sur les côtés",
          pourquoi:
            "Des coudes qui s’écartent font passer le travail des triceps vers les épaules. Ils pointent vers l’arrière pendant toute la descente.",
        },
        {
          titre: "Descendre trop bas",
          pourquoi:
            "Au-delà de l’angle droit, l’avant de l’épaule se retrouve très étiré. Arrête-toi quand les bras forment un angle droit.",
        },
        {
          titre: "S’éloigner de la chaise",
          pourquoi:
            "Un bassin qui part vers l’avant fait basculer le poids sur les épaules. Garde le dos près du bord de l’assise, presque à le frôler.",
        },
      ],
      variantes: [
        {
          angle: "Aux barres parallèles",
          exercice: "Dips barres parallèles",
          texte:
            "Le corps entier est suspendu entre deux barres : tout le poids passe dans les bras, et les pectoraux participent davantage.",
        },
        {
          angle: "Au sol, mains serrées",
          exercice: "Pompes diamant",
          texte:
            "Une pompe les mains rapprochées sous la poitrine : les triceps travaillent beaucoup, et le sol suffit.",
        },
        {
          angle: "Avec un haltère",
          exercice: "Extension triceps haltère",
          texte:
            "L’haltère descend derrière la tête puis remonte bras tendus : les triceps travaillent seuls, sans le poids du corps.",
        },
      ],
      titreVariantes: "Variantes et mouvements proches",
      placement:
        "Les dips sur chaise se placent en fin de séance de haut du corps, après les pompes, ou dans un circuit au poids du corps à la maison. Ils se combinent bien avec des pompes, pour enchaîner poussée et triceps.",
      materiel: "Une chaise stable ou un banc",
      materielCourt: "Une chaise",
      promesse: "Les mains sur le bord d’une chaise, on plie les coudes vers l’arrière : les triceps travaillent avec un simple meuble.",
      nomDansLeTitre: "des dips sur chaise",
    },
  },
  {
    slug: "kettlebell-swing",
    exercice: "Kettlebell swing",
    categorie: "jambes",
    title: "Kettlebell swing : technique et erreurs",
    description:
      "Comment faire le kettlebell swing : la charnière de hanche, l’impulsion des fessiers, les bras qui guident, le dos droit et les erreurs fréquentes. En animation.",
    contenu: {
      definition:
        "Au kettlebell swing, on balance une kettlebell entre les jambes puis devant soi, jusqu’à hauteur de poitrine, en poussant les hanches vers l’avant : ce sont les fessiers et l’arrière des cuisses qui la font monter, les bras ne font que la tenir. Le mouvement s’enchaîne sans pause, et le souffle monte vite.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "Se placer",
          texte:
            "Pieds un peu plus larges que les hanches, la kettlebell posée au sol devant toi. Penche le buste en poussant les fesses vers l’arrière, dos droit, et saisis la poignée à deux mains.",
        },
        {
          titre: "Lancer avec les hanches",
          texte:
            "Fais passer la kettlebell entre tes jambes, puis tends vivement les hanches vers l’avant : elle monte devant toi jusqu’à hauteur de poitrine, bras tendus et relâchés.",
        },
        {
          titre: "Laisser redescendre",
          texte:
            "Laisse-la retomber entre tes jambes en repoussant les fesses vers l’arrière, dos droit, et enchaîne le lancer suivant sans t’arrêter.",
        },
      ],
      erreurs: [
        {
          titre: "Soulever avec les bras",
          pourquoi:
            "Des bras qui tirent la kettlebell vers le haut transforment le mouvement en élévation d’épaules. Ce sont les hanches qui la lancent : les bras restent tendus et relâchés.",
        },
        {
          titre: "Faire un squat",
          pourquoi:
            "Plier beaucoup les genoux fait travailler les cuisses à la place des fessiers. Les genoux restent souples, et ce sont les fesses qui partent vers l’arrière.",
        },
        {
          titre: "Arrondir le dos en bas",
          pourquoi:
            "Un dos qui s’enroule quand la kettlebell passe entre les jambes met la charge sur le bas du dos. Garde la poitrine ouverte et le regard un peu devant toi.",
        },
      ],
      variantes: [
        {
          angle: "La même charnière, lentement",
          exercice: "Soulevé de terre roumain",
          texte:
            "On descend la charge le long des jambes en poussant les fesses vers l’arrière, puis on remonte, sans élan : la charnière de hanche s’apprend en douceur.",
        },
        {
          angle: "En pliant les genoux",
          exercice: "Goblet squat",
          texte:
            "La même kettlebell tenue contre la poitrine, on descend en squat : les cuisses travaillent davantage que l’arrière des jambes.",
        },
        {
          angle: "Les hanches qui poussent, sans élan",
          exercice: "Hip thrust machine",
          texte:
            "Le dos posé sur un appui, on monte le bassin contre une charge guidée : les fessiers travaillent, sans le balancier.",
        },
      ],
      titreVariantes: "Variantes et mouvements proches",
      placement:
        "Le kettlebell swing se place en début de séance, quand on est frais pour apprendre le geste, ou dans un circuit cardio, en séries courtes. Il demande de la place devant soi.",
      materiel: "Une kettlebell",
      materielCourt: "Kettlebell",
      precaution:
        "Apprends le mouvement avec une kettlebell légère : tant que les bras tirent pour la faire monter, elle est trop lourde. Garde aussi de la place devant toi, la kettlebell passe à hauteur de poitrine.",
      promesse: "Les hanches lancent la kettlebell, les bras la guident : les fessiers, l’arrière des cuisses et le souffle travaillent ensemble.",
      nomDansLeTitre: "le kettlebell swing",
    },
  },
  {
    slug: "superman",
    exercice: "Superman",
    categorie: "dos",
    title: "Superman : l’exercice du bas du dos et ses erreurs",
    description:
      "Comment faire le superman : allongé sur le ventre, décoller bras et jambes, le regard vers le sol, la respiration et les erreurs fréquentes. En animation.",
    contenu: {
      definition:
        "Au superman, on est allongé sur le ventre, bras tendus devant soi, et on décolle en même temps les bras, la poitrine et les jambes de quelques centimètres, avant de reposer : les muscles du bas du dos et les fessiers travaillent. Le mouvement est petit, et c’est voulu : il ne s’agit pas de se cambrer au maximum.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "S’installer",
          texte:
            "Allongé sur le ventre, bras tendus devant toi, jambes tendues, le front ou le nez tourné vers le sol.",
        },
        {
          titre: "Décoller",
          texte:
            "Soulève en même temps les bras, la poitrine et les jambes de quelques centimètres, en serrant les fessiers. Le regard reste vers le sol, la nuque dans le prolongement du dos.",
        },
        {
          titre: "Reposer",
          texte:
            "Marque une courte pause en haut, puis repose bras et jambes doucement, sans les laisser tomber, avant la répétition suivante.",
        },
      ],
      erreurs: [
        {
          titre: "Monter trop haut",
          pourquoi:
            "Chercher la plus grande hauteur possible creuse fortement le bas du dos. Quelques centimètres suffisent : c’est la tenue en haut qui fait le travail.",
        },
        {
          titre: "Relever la tête",
          pourquoi:
            "Regarder devant soi plie la nuque vers l’arrière. Le regard reste vers le sol, la tête dans l’alignement du dos.",
        },
        {
          titre: "Aller trop vite",
          pourquoi:
            "Des répétitions enchaînées par à-coups laissent l’élan faire le mouvement. Monte, tiens une seconde, et repose lentement.",
        },
      ],
      variantes: [
        {
          angle: "À quatre pattes, en croisé",
          exercice: "Bird dog",
          texte:
            "À quatre pattes, on tend un bras et la jambe opposée : le dos travaille aussi, avec de l’équilibre en plus.",
        },
        {
          angle: "Sur un banc",
          exercice: "Extensions lombaires banc",
          texte:
            "Les hanches calées sur un banc à lombaires, on descend le buste puis on le remonte dans l’alignement des jambes : l’amplitude est plus grande.",
        },
        {
          angle: "Sur le dos, bassin qui monte",
          exercice: "Pont fessier",
          texte:
            "Allongé sur le dos, on monte le bassin en poussant dans les talons : les fessiers prennent la plus grande part du travail.",
        },
      ],
      titreVariantes: "Variantes et mouvements proches",
      placement:
        "Le superman se place en fin de séance, avec les exercices d’abdos, pour faire travailler aussi l’arrière du tronc. Il se glisse bien dans une séance à la maison, sur un tapis.",
      materiel: "Aucun, un tapis pour le confort",
      materielCourt: "Sans matériel",
      promesse: "Allongé sur le ventre, on décolle bras et jambes de quelques centimètres : le bas du dos et les fessiers travaillent.",
      nomDansLeTitre: "le superman",
    },
  },
  {
    slug: "pompes-diamant",
    exercice: "Pompes diamant",
    categorie: "bras",
    title: "Pompes diamant : technique et erreurs",
    description:
      "Comment faire les pompes diamant : les mains jointes sous la poitrine, les coudes le long du corps, la descente et les erreurs fréquentes. En animation.",
    contenu: {
      definition:
        "La pompe diamant se fait les mains rapprochées sous la poitrine, pouces et index qui se touchent en formant un losange : avec cette prise serrée, les triceps, à l’arrière du bras, prennent une plus grande part du travail qu’à la pompe classique. Elle demande aussi plus de force.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "Se placer",
          texte:
            "En planche sur les mains, corps aligné des épaules aux talons. Rapproche les mains sous la poitrine, pouces et index qui se touchent.",
        },
        {
          titre: "Descendre",
          texte:
            "Plie les coudes en les gardant le long du corps, vers l’arrière, et descends la poitrine vers tes mains, le corps toujours aligné.",
        },
        {
          titre: "Remonter",
          texte:
            "Pousse dans les mains pour tendre les bras et remonter, sans laisser le bassin descendre ou monter.",
        },
      ],
      erreurs: [
        {
          titre: "Ouvrir les coudes",
          pourquoi:
            "Des coudes qui partent sur les côtés font travailler davantage les épaules et les pectoraux. Ils restent serrés, le long du corps.",
        },
        {
          titre: "Laisser le bassin s’affaisser",
          pourquoi:
            "Un ventre qui descend vers le sol cambre le bas du dos. Le corps reste droit comme une planche, du début à la fin.",
        },
        {
          titre: "Raccourcir le mouvement",
          pourquoi:
            "Ne descendre que de quelques centimètres réduit beaucoup le travail. Si la pompe complète est trop dure, pose les genoux au sol plutôt que de raccourcir.",
        },
      ],
      variantes: [
        {
          angle: "Les mains plus écartées",
          exercice: "Pompes",
          texte:
            "La pompe classique, mains un peu plus larges que les épaules : les pectoraux travaillent davantage.",
        },
        {
          angle: "Les mains sur un support",
          exercice: "Pompes inclinées",
          texte:
            "Les mains posées sur un banc ou une table : une plus petite part du poids du corps passe dans les bras.",
        },
        {
          angle: "Dos à une chaise",
          exercice: "Dips sur chaise",
          texte:
            "Les mains sur le bord d’une chaise derrière soi, on plie les coudes vers l’arrière : les triceps travaillent aussi.",
        },
      ],
      titreVariantes: "Variantes et mouvements proches",
      placement:
        "Les pompes diamant se placent après les pompes classiques dans une séance de haut du corps, ou en fin de séance pour les triceps. Elles se font partout, sans matériel.",
      materiel: "Aucun",
      materielCourt: "Sans matériel",
      promesse: "Une pompe les mains jointes sous la poitrine : les triceps prennent une plus grande part du travail.",
      nomDansLeTitre: "des pompes diamant",
    },
  },
  {
    slug: "mollets-debout",
    exercice: "Mollets",
    categorie: "jambes",
    title: "Mollets debout : la montée sur pointe et les erreurs",
    description:
      "Comment faire les mollets debout : la montée sur la pointe des pieds, la descente lente, l’amplitude complète et les erreurs fréquentes. En animation.",
    contenu: {
      definition:
        "Pour travailler les mollets debout, on monte sur la pointe des pieds le plus haut possible, puis on redescend lentement : les muscles de l’arrière de la jambe, sous le genou, font tout le travail. Le mouvement se fait au sol, sur une marche pour plus d’amplitude, ou avec une charge dans les mains.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "Se placer",
          texte:
            "Debout, pieds écartés de la largeur des hanches, jambes tendues sans bloquer les genoux. Une main contre un mur aide à garder l’équilibre.",
        },
        {
          titre: "Monter",
          texte:
            "Monte sur la pointe des pieds le plus haut possible, en poussant dans le gros orteil, et marque une seconde en haut.",
        },
        {
          titre: "Redescendre",
          texte:
            "Redescends lentement jusqu’à poser les talons, ou plus bas que la marche si tu travailles sur une marche, puis remonte.",
        },
      ],
      erreurs: [
        {
          titre: "Rebondir",
          pourquoi:
            "Des répétitions rapides, qui rebondissent sur les talons, laissent l’élastique des tendons faire le travail. Monte, tiens une seconde, redescends lentement.",
        },
        {
          titre: "Monter à moitié",
          pourquoi:
            "S’arrêter à mi-hauteur réduit le travail des mollets. Va chercher la pointe la plus haute à chaque répétition.",
        },
        {
          titre: "Basculer vers l’extérieur du pied",
          pourquoi:
            "Un poids qui part sur le bord extérieur du pied fragilise la cheville. Pousse dans le gros orteil, les chevilles bien droites.",
        },
      ],
      variantes: [
        {
          angle: "Assis, à la machine",
          exercice: "Mollets assis",
          texte:
            "Genoux pliés, une charge posée sur les cuisses : le travail passe davantage sur le muscle profond du mollet.",
        },
        {
          angle: "En sautant",
          exercice: "Corde à sauter",
          texte:
            "De petits sauts sur l’avant du pied : les mollets travaillent à chaque rebond, avec le souffle en plus.",
        },
        {
          angle: "Pour étirer ensuite",
          exercice: "Étirement mollet au mur",
          texte:
            "Les mains contre un mur, une jambe tendue derrière, talon au sol : le mollet s’étire après la série.",
        },
      ],
      titreVariantes: "Variantes et mouvements proches",
      placement:
        "Les mollets se travaillent en fin de séance de jambes, ou à la maison, entre deux autres mouvements : il suffit d’un sol plat, ou d’une marche.",
      materiel: "Aucun, une marche pour plus d’amplitude",
      materielCourt: "Sans matériel",
      nomDansLeTitre: "les mollets debout",
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

/** Les autres exercices de la même catégorie publique, pour la rangée de
    fin de fiche. La catégorie, pas la zone de la bibliothèque : le titre de
    la rangée dit « Les autres exercices jambes », et le pont fessier, rangé
    « fessiers » dans la bibliothèque, n’y aurait trouvé aucun voisin.

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
    .filter((f) => f.slug !== fiche.slug && f.categorie === fiche.categorie)
    .slice(0, max);
}
