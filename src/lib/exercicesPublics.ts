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
  /** Où le placer dans une séance. Court, concret, propre au mouvement. */
  placement: string;
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
  niveau: { de: NiveauPublic; a: NiveauPublic };
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
    niveau: { de: "debutant", a: "confirme" },
    title: "Développé couché : technique, muscles et erreurs",
    description:
      "Comment faire le développé couché à la barre : placement, exécution, muscles travaillés et les erreurs qui limitent la progression. Animation du mouvement.",
    contenu: {
      definition:
        "Allongé sur un banc, on descend une barre jusqu'au bas de la poitrine puis on la repousse à bout de bras. Le banc porte le buste, donc il n'y a pas d'équilibre à gérer : c'est l'une des raisons pour lesquelles on y manipule en général des charges plus élevées que sur les autres mouvements de poussée du haut du corps.",
      gabarit: "mouvement",
      etapes: [
        {
          titre: "S'installer",
          texte:
            "Allonge-toi les yeux à l'aplomb de la barre. Cinq appuis, et ils comptent : la tête, le haut du dos et les fessiers sur le banc, les deux pieds à plat au sol. Serre les omoplates l'une vers l'autre et garde-les serrées jusqu'à la fin de la série : c'est ce placement qui donne à l'épaule un appui stable. Prends la barre un peu plus large que les épaules, poignets dans l'axe des avant-bras.",
        },
        {
          titre: "Descendre",
          texte:
            "Sors la barre du rack et amène-la à l'aplomb des épaules, bras tendus. Descends lentement en gardant les coudes à environ 45 degrés du buste, vers le bas des pectoraux, dans l'amplitude où l'épaule reste confortable. Inspire pendant la descente. La barre se pose, elle ne s'écrase pas.",
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
            "L'élan prend une partie du travail à la place des pectoraux, et le contact devient brutal. Descends jusqu'au contact, marque un temps très court, puis repousse.",
        },
        {
          titre: "Ouvrir les coudes à 90 degrés",
          pourquoi:
            "Coudes complètement écartés, l'avant de l'épaule est davantage sollicité et fatigue souvent avant les pectoraux. Autour de 45 degrés du buste, la poussée se répartit mieux.",
        },
        {
          titre: "Décoller les fessiers du banc",
          pourquoi:
            "Cambrer permet souvent de pousser un peu plus lourd, mais une partie du travail quitte les pectoraux et le bas du dos se retrouve sollicité au passage. Si les fessiers se lèvent série après série, c'est en général le signe qu'il faut alléger.",
        },
      ],
      variantes: [
        {
          angle: "Au poids du corps",
          exercice: "Pompes",
          texte:
            "Le même schéma de poussée, sans matériel, avec une partie de ton poids de corps comme charge. Les appuis au sol demandent plus de gainage, et poser les genoux ou surélever les mains permet d'ajuster.",
        },
        {
          angle: "Avec deux haltères",
          exercice: "Développé couché haltères",
          texte:
            "Chaque bras porte sa charge et se stabilise seul, ce qui demande plus de contrôle. Les haltères laissent aussi les mains descendre un peu plus bas que la barre, qui s'arrête au contact de la poitrine, et ils se posent sur les côtés en fin de série.",
        },
      ],
      placement:
        "C'est un mouvement chargé et technique, dont l'exécution se dégrade vite une fois fatigué : on le place donc souvent tôt dans une séance de haut du corps, tant qu'on est frais. Ce qui vient après dépend de la séance et de l'objectif, mais le travail plus léger ou plus ciblé se garde en général pour la suite, une fois le gros du travail fait.",
      materiel: "Barre, banc et supports",
      materielCourt: "Barre",
      precaution:
        "Travaille avec un pareur, ou avec des barres de sécurité réglées à hauteur de poitrine. Une barre qu'on n'arrive plus à repousser reste au-dessus de soi, alors que des haltères se posent sur les côtés.",
    },
  },
  {
    slug: "squat",
    exercice: "Squat",
    categorie: "jambes",
    niveau: { de: "debutant", a: "confirme" },
    title: "Squat : le mouvement de base du bas du corps",
    description:
      "Le squat au poids du corps : placement des pieds, profondeur, respiration, et les erreurs qui font mal aux genoux. Animation du mouvement.",
  },
  {
    slug: "souleve-de-terre",
    exercice: "Soulevé de terre classique",
    categorie: "dos",
    niveau: { de: "intermediaire", a: "confirme" },
    title: "Soulevé de terre : technique et dos plat",
    description:
      "Le soulevé de terre à la barre : position de départ, ordre des mouvements, dos plat, et les erreurs à ne pas faire. Animation du mouvement.",
  },
  {
    slug: "rowing-barre",
    exercice: "Rowing barre",
    categorie: "dos",
    niveau: { de: "intermediaire", a: "confirme" },
    title: "Rowing barre : construire l'épaisseur du dos",
    description:
      "Le rowing barre buste penché : inclinaison, trajectoire de la barre, muscles travaillés et erreurs fréquentes. Animation du mouvement.",
  },
  {
    slug: "developpe-militaire-halteres",
    exercice: "Développé militaire haltères",
    categorie: "epaules",
    niveau: { de: "debutant", a: "confirme" },
    title: "Développé militaire haltères : épaules solides",
    description:
      "Le développé militaire aux haltères : gainage, trajectoire des bras, muscles travaillés et les erreurs qui cambrent le dos. Animation du mouvement.",
  },
  {
    slug: "curl-biceps-halteres",
    exercice: "Curl haltères",
    categorie: "bras",
    niveau: { de: "debutant", a: "confirme" },
    title: "Curl biceps haltères : le travail direct du bras",
    description:
      "Le curl haltères pour les biceps : position des coudes, tempo, amplitude, et pourquoi le balancier vous fait perdre le bénéfice. Animation du mouvement.",
  },
  {
    slug: "gainage",
    exercice: "Gainage",
    categorie: "abdos",
    niveau: { de: "debutant", a: "confirme" },
    title: "Gainage : la position, la durée, les erreurs",
    description:
      "Le gainage sur les coudes : alignement, respiration, combien de temps tenir, et les erreurs qui creusent le bas du dos. Animation de la position.",
  },
  {
    slug: "burpees",
    exercice: "Burpees",
    categorie: "cardio",
    niveau: { de: "intermediaire", a: "confirme" },
    title: "Burpees : le mouvement complet qui monte le cardio",
    description:
      "Comment faire un burpee proprement : enchaînement, rythme tenable, version allégée et erreurs fréquentes. Animation du mouvement.",
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
      soucis.push(`« ${f.exercice} » n'existe pas dans la bibliothèque (fiche ${f.slug})`);
      continue;
    }
    if (!resolveGuide(lib.name)) {
      soucis.push(`« ${f.exercice} » n'a pas d'animation (fiche ${f.slug})`);
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
