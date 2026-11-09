/* ─────────────────────────────────────────────────────────────────────
   Les pages de catégorie de la bibliothèque : /exercices/abdos,
   /exercices/pectoraux…

   Elles répondent aux recherches les plus fréquentes du domaine
   (« exercices abdos », « exercice pectoraux ») avec ce que le hub montre
   déjà, rangé pour une seule zone, plus une phrase qui dit ce qu'on y
   trouve. Les slugs de catégorie sont réservés depuis le pilote
   (`SLUGS_RESERVES`) : aucune fiche ne peut les prendre.

   ⚠️ Une catégorie n'a sa page qu'à partir de trois fiches publiées. En
   dessous, la page serait le hub en plus pauvre, et une page de catégorie
   qui montre une seule carte se lit comme un chantier.

   Les textes ne promettent rien sur le corps (ni « ventre plat », ni
   « gagner du volume ») : ils disent quels mouvements la page contient.
   ───────────────────────────────────────────────────────────────────── */

import {
  CATEGORIES,
  fichesPubliees,
  type CategoriePublique,
  type FicheResolue,
} from "@/lib/exercicesPublics";

export const SEUIL_PAGE_CATEGORIE = 3;

type TexteCategorie = {
  /** Ce qui suit « Exercices » dans le titre : « pour le dos », « de cardio ». */
  pour: string;
  /** La phrase d'ouverture, propre à la zone. */
  intro: string;
};

const TEXTES: Record<CategoriePublique, TexteCategorie> = {
  pectoraux: {
    pour: "pour les pectoraux",
    intro:
      "Développés, pompes et machine : les mouvements où l’on pousse devant soi, montrés en animation.",
  },
  dos: {
    pour: "pour le dos",
    intro:
      "Tractions, tirages, rowings et soulevés de terre : les mouvements où l’on tire vers soi ou où l’on redresse le buste, montrés en animation.",
  },
  epaules: {
    pour: "pour les épaules",
    intro:
      "Développé au-dessus de la tête, élévations sur les côtés et tirage vers le visage : les mouvements de l’épaule, montrés en animation.",
  },
  bras: {
    pour: "pour les bras",
    intro:
      "Curls pour les biceps, dips, extensions et pompes serrées pour les triceps : les mouvements du bras, montrés en animation.",
  },
  jambes: {
    pour: "pour les jambes et les fessiers",
    intro:
      "Squats, fentes, ponts, machines et mollets : les mouvements du bas du corps, avec ou sans matériel, montrés en animation.",
  },
  abdos: {
    pour: "pour les abdos",
    intro:
      "Gainage, crunchs, rotations et relevés de jambes : les mouvements du tronc, presque tous sans matériel, montrés en animation.",
  },
  cardio: {
    pour: "de cardio",
    intro:
      "Sauts sur place, corde à sauter et rameur : les mouvements qui font monter le cœur, montrés en animation.",
  },
};

export type PageCategorieExercices = TexteCategorie & {
  id: CategoriePublique;
  label: string;
  /** Le H1 : « Exercices pour les abdos ». */
  h1: string;
  fiches: FicheResolue[];
};

/** Les catégories qui ont leur page, dans l'ordre du hub. */
export function categoriesPubliees(): PageCategorieExercices[] {
  const publiees = fichesPubliees();
  return CATEGORIES.map((c) => ({
    id: c.id,
    label: c.label,
    ...TEXTES[c.id],
    h1: `Exercices ${TEXTES[c.id].pour}`,
    fiches: publiees.filter((f) => f.categorie === c.id),
  })).filter((c) => c.fiches.length >= SEUIL_PAGE_CATEGORIE);
}

export function categorieParSlug(slug: string): PageCategorieExercices | null {
  return categoriesPubliees().find((c) => c.id === slug) ?? null;
}

/** Le nom d'un exercice au milieu d'une phrase : « Développé couché »
    devient « développé couché ». Les noms de la bibliothèque n'ont pas de
    nom propre, donc la première lettre suffit. */
export function nomDansUnePhrase(nom: string): string {
  return nom.charAt(0).toLocaleLowerCase("fr") + nom.slice(1);
}

/** Le titre de l'onglet : « Exercices pour les abdos : 8 mouvements en
    animation ». Le nombre se compte, il n'est jamais écrit à la main. */
export function titreCategorie(c: PageCategorieExercices): string {
  return `${c.h1} : ${c.fiches.length} mouvements en animation`;
}

/** La description de la page, composée depuis les fiches : elle cite les
    premiers mouvements, donc elle reste vraie quand le catalogue change. */
export function descriptionCategorie(c: PageCategorieExercices): string {
  const noms = c.fiches.slice(0, 4).map((f) => nomDansUnePhrase(f.lib.name));
  const suite = c.fiches.length > 4 ? " et d’autres" : "";
  return `Les exercices ${c.pour} montrés en mouvement : ${noms.join(", ")}${suite}. La technique, les muscles et les erreurs fréquentes, sans compte.`;
}
