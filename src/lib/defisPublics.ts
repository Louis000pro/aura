/* ════════════════════════════════════════════════════════════════════
   LES DÉFIS, CÔTÉ PUBLIC (vague 2 de la bibliothèque publique).

   Dans l'application, ce sont « Les classiques » : la même séance, refaite
   d'un mois sur l'autre pour battre son score. Le mot que les gens tapent
   est « défi » : l'adresse et les titres le disent, la page garde le mot
   de l'application dans son texte.

   Le classique lui-même vit dans `lib/classiques.ts` (ses étapes, ses
   règles, sa façon de compter). Ce fichier n'ajoute qu'une adresse figée,
   un title et une description écrits à la main.

   ⚠️ L'adresse est /defis, au pluriel : /defi (singulier) est l'écran du
   relais dans l'application.
   ⚠️ Les slugs sont figés pour toujours à partir de la mise en ligne.
   ⚠️ Un score ne se compare qu'à soi : aucun classement, aucune moyenne,
   et le mot « record » ne désigne jamais une fonctionnalité (positionnement
   public, §14) ; il ne reste que dans le nom d'un classique.
   ════════════════════════════════════════════════════════════════════ */
import { CLASSIQUES, type Classique } from "./classiques";

export type DefiPublic = {
  /** Figé pour toujours. */
  slug: string;
  /** L'identifiant du classique au catalogue. */
  id: string;
  /** Le title de la balise, sans le suffixe « · Vaiiya » du gabarit. */
  title: string;
  description: string;
};

export const DEFIS_PAGES: DefiPublic[] = [
  {
    slug: "le-decompte",
    id: "decompte",
    title: "Le Décompte : défi burpees et squats de 10 à 1",
    description:
      "10 burpees et 10 squats, puis 9 et 9, jusqu’à 1 et 1, le plus vite possible : 110 répétitions sans matériel, et ton temps comme score.",
  },
  {
    slug: "escalier",
    id: "escalier",
    title: "L’Escalier : défi pompes et squats sans matériel",
    description:
      "Les pompes montent de 1 à 10 pendant que les squats descendent de 10 à 1 : 110 répétitions sans matériel, le plus vite possible.",
  },
  {
    slug: "le-centurion",
    id: "centurion",
    title: "Le Centurion : défi 100 abdos en quatre exercices",
    description:
      "25 crunchs, 25 bicycle crunchs, 25 reverse crunchs et 25 russian twists, le plus vite possible. Un défi abdos sans matériel, à refaire pour battre ton temps.",
  },
  {
    slug: "max-en-12-minutes",
    id: "max-12",
    title: "Le max en 12 minutes : pompes, squats et crunchs",
    description:
      "Le plus de tours possible en 12 minutes, avec 5 pompes, 10 squats et 15 crunchs par tour. Un AMRAP sans matériel, à refaire pour battre ton score.",
  },
  {
    slug: "cinq-minutes-de-burpees",
    id: "cinq-minutes-burpees",
    title: "Défi burpees : le plus possible en cinq minutes",
    description:
      "Le plus de burpees possible en cinq minutes, à ton rythme. Un défi court et sans matériel, que l’on refait pour battre son score.",
  },
  {
    slug: "record-de-la-chaise",
    id: "record-chaise",
    title: "Défi chaise au mur : tenir le plus longtemps possible",
    description:
      "Dos contre le mur, cuisses parallèles au sol : le temps tenu en une seule fois est ton score. Un défi de quelques minutes, avec un mur pour seul matériel.",
  },
  {
    slug: "une-de-plus-chaque-minute",
    id: "une-de-plus",
    title: "Défi burpees : un de plus chaque minute",
    description:
      "Un burpee la première minute, deux la deuxième, trois la troisième : le défi s’arrête à la première minute que tu ne finis pas. Sans matériel.",
  },
  {
    slug: "la-centaine",
    id: "la-centaine",
    title: "La Centaine : défi de 250 répétitions sans matériel",
    description:
      "100 squats, 75 crunchs, 50 pompes et 25 burpees, dans l’ordre et le plus vite possible. Un défi sans matériel, à découper comme tu veux.",
  },
  {
    slug: "500-repetitions",
    id: "cinq-cents",
    title: "Défi 500 répétitions : six exercices sans matériel",
    description:
      "100 squats, 100 crunchs, 100 fentes, 100 ponts fessiers, 50 pompes et 50 burpees, le plus vite possible. Un long défi sans matériel.",
  },
  {
    slug: "max-en-20-minutes-halteres",
    id: "max-20-halteres",
    title: "Le max en 20 minutes aux haltères",
    description:
      "Thrusters, rowings et fentes : le plus de tours possible en 20 minutes, avec la même paire d’haltères du début à la fin. Un AMRAP à refaire pour battre ton score.",
  },
  {
    slug: "kilometre-de-rameur",
    id: "kilometre-rameur",
    title: "Défi 1 000 mètres de rameur : ton meilleur temps",
    description:
      "1 000 mètres de rameur le plus vite possible, en quatre étapes de 250 mètres. Ton temps est ton score, à battre d’un mois sur l’autre.",
  },
];

export type DefiResolu = DefiPublic & { c: Classique };

/** Les défis publiés, dans l'ordre de l'application. */
export function defisPublies(): DefiResolu[] {
  return CLASSIQUES.map((c) => {
    const d = DEFIS_PAGES.find((x) => x.id === c.id);
    return d ? { ...d, c } : null;
  }).filter((d): d is DefiResolu => d !== null);
}

export function defiParSlug(slug: string): DefiResolu | null {
  return defisPublies().find((d) => d.slug === slug) ?? null;
}

/** Le slug public d'un classique, s'il a une page. */
export function slugDuClassique(id: string): string | null {
  return DEFIS_PAGES.find((d) => d.id === id)?.slug ?? null;
}

export function verifierDefis(): string[] {
  const soucis: string[] = [];
  const vus = new Set<string>();
  for (const d of DEFIS_PAGES) {
    if (vus.has(d.slug)) soucis.push(`slug en double : « ${d.slug} »`);
    vus.add(d.slug);
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(d.slug)) soucis.push(`slug mal formé : « ${d.slug} »`);
    if (!CLASSIQUES.some((c) => c.id === d.id)) soucis.push(`classique inconnu : « ${d.id} »`);
  }
  for (const c of CLASSIQUES) {
    if (!DEFIS_PAGES.some((d) => d.id === c.id)) soucis.push(`classique sans page publique : « ${c.id} »`);
  }
  return soucis;
}
