/* ════════════════════════════════════════════════════════════════════
   LES PROGRAMMES, CÔTÉ PUBLIC (vague 2 de la bibliothèque publique,
   décisions de Louis du 2026-11-08 : « on lit sans compte, on fait avec
   un compte », des pages vitrine et jamais des écrans de l'application,
   Vaiiya+ en aperçu).

   Le programme lui-même vit dans `lib/parcours.ts` : ses semaines, ses
   séances, son test. Ce fichier n'ajoute que ce qu'une page publique
   demande en plus : une adresse figée, un title et une description écrits
   à la main, la photo choisie pour la page, et un paragraphe qui dit à
   qui le programme s'adresse.

   ⚠️ Les slugs sont figés pour toujours à partir de la mise en ligne.
   ⚠️ Aucune promesse de résultat : un programme propose un chemin, il ne
   garantit pas d'arriver au bout (positionnement public, §14).
   ⚠️ Ce sont des programmes fixes, écrits par Vaiiya : ils ne s'adaptent
   pas tout seuls et l'IA ne les fabrique pas (positionnement, §4 et §5).
   ⚠️ Les phrases s'écrivent avec des espaces ordinaires : la page pose la
   typographie au rendu (`typoParcours`).
   ════════════════════════════════════════════════════════════════════ */
import { PROGRAMMES, type DefParcours, type IdParcours } from "./parcours";

export type ProgrammePublic = {
  /** Figé pour toujours. */
  slug: string;
  id: IdParcours;
  /** Le title de la balise, sans le suffixe « · Vaiiya » du gabarit. */
  title: string;
  description: string;
  /** La photo de la page, dans `public/entrainement`, sans extension.
      Choisie à la main : la règle de l'application (`resolveArt`) donne une
      photo de développé couché au programme « Cent pompes ». */
  photo: string;
  /** Le cadrage de la photo (`object-position`). */
  pos?: string;
  /** À qui il s'adresse et comment il avance, en deux ou trois phrases. */
  pourQui: string;
};

export const PROGRAMMES_PAGES: ProgrammePublic[] = [
  {
    slug: "premiere-traction",
    id: "premiere-traction",
    title: "Première traction : un programme de 6 semaines",
    description:
      "Six semaines, trois séances par semaine à la salle, pour aller de zéro traction à ta première traction stricte. Un test au départ, le même à la fin.",
    photo: "pull-traction",
    pos: "50% 30%",
    pourQui:
      "Pour qui n’arrive pas encore à faire une traction stricte, ou en fait une et veut aller plus loin. Deux séances alternent pendant six semaines : l’une construit le mouvement, l’autre renforce le dos.",
  },
  {
    slug: "reprendre-le-sport",
    id: "reprendre-le-sport",
    title: "Reprendre le sport : un programme de 4 semaines à la maison",
    description:
      "Quatre semaines, trois séances douces par semaine, à la maison et sans matériel, pour reprendre le sport. Un test au départ, le même à la fin.",
    photo: "cat-debuter",
    pos: "50% 40%",
    pourQui:
      "Pour reprendre après une longue pause, ou pour commencer. Les deux premières semaines remettent le corps en mouvement, les deux suivantes ajoutent un circuit, toujours chez soi et sans matériel.",
  },
  {
    slug: "cent-pompes",
    id: "cent-pompes",
    title: "Programme 100 pompes : 6 semaines sans matériel",
    description:
      "Six semaines sans matériel pour aller de tes premières pompes propres jusqu’aux cent pompes, dix par minute. Un test au départ, le même à la fin.",
    photo: "push-pompes",
    pos: "50% 55%",
    pourQui:
      "Pour qui fait déjà quelques pompes propres et veut en enchaîner beaucoup plus. D’abord la technique, puis une pyramide de pompes, puis la séance des cent pompes elle-même, dix par minute.",
  },
  {
    slug: "fessiers",
    id: "fessiers",
    title: "Programme fessiers : 6 semaines, de la maison aux haltères",
    description:
      "Six semaines pour des fessiers plus forts, à la maison puis avec une paire d’haltères : le volume monte, puis la charge. Un test au départ et à la fin.",
    photo: "legs-hipthrust",
    pos: "50% 50%",
    pourQui:
      "Pour renforcer les fessiers sans aller à la salle. Les quatre premières semaines font monter le volume au poids du corps, les deux dernières ajoutent une paire d’haltères.",
  },
  {
    slug: "abdos-solides",
    id: "abdos-solides",
    title: "Programme abdos : 4 semaines pour un tronc plus solide",
    description:
      "Quatre semaines sans matériel pour un tronc plus solide : des tenues d’abord, du mouvement ensuite. Un test de planche au départ, le même à la fin.",
    photo: "cat-sansmateriel",
    pos: "50% 60%",
    pourQui:
      "Pour un tronc plus solide, chez soi et sans matériel. Deux semaines de tenues, comme la planche, puis deux semaines où le mouvement s’ajoute.",
  },
  {
    slug: "force-5x5",
    id: "force-5x5",
    title: "Programme force 5 × 5 : 8 semaines à la salle",
    description:
      "Huit semaines à la salle sur le squat, le développé couché et le soulevé de terre, en cinq séries de cinq. Un test au squat au départ et à la fin.",
    photo: "cat-jambes",
    pos: "50% 40%",
    pourQui:
      "Pour poser une base de force sur les trois grands mouvements de la salle : le squat, le développé couché et le soulevé de terre. Cinq séries de cinq répétitions, et on monte la charge quand toutes les séries passent.",
  },
  {
    slug: "chaise-au-mur",
    id: "chaise-au-mur",
    title: "Chaise au mur : un programme de 4 semaines",
    description:
      "Quatre semaines contre un mur pour tenir la chaise plus longtemps : une tenue qui s’allonge, mesurée au début et à la fin.",
    photo: "legs-goblet",
    pos: "50% 55%",
    pourQui:
      "Pour tenir la chaise au mur plus longtemps, chez soi. La tenue s’allonge seule les deux premières semaines, puis une séance de tenues pour tout le corps vient s’ajouter.",
  },
  {
    slug: "prepa-ski",
    id: "prepa-ski",
    title: "Préparation au ski : un programme de 4 semaines",
    description:
      "Quatre semaines à la maison, sans matériel, pour préparer les cuisses, le souffle et le gainage avant le ski. Un test de chaise au mur au départ et à la fin.",
    photo: "legs-squat",
    pos: "50% 45%",
    pourQui:
      "Pour arriver au ski avec les cuisses, le souffle et le gainage prêts, en commençant environ un mois avant le départ. Trois séances tournent pendant quatre semaines, à la maison et sans matériel.",
  },
];

export type ProgrammeResolu = ProgrammePublic & { def: DefParcours };

/** Les programmes publiés, dans l'ordre de la rangée de l'application. */
export function programmesPublies(): ProgrammeResolu[] {
  return PROGRAMMES.map((def) => {
    const p = PROGRAMMES_PAGES.find((x) => x.id === def.id);
    return p ? { ...p, def } : null;
  }).filter((p): p is ProgrammeResolu => p !== null);
}

export function programmeParSlug(slug: string): ProgrammeResolu | null {
  return programmesPublies().find((p) => p.slug === slug) ?? null;
}

/** Le filet : un programme sans page, ou une page sans programme, ne se
    voit pas à l'écran. On le fait parler à la construction. */
export function verifierProgrammes(): string[] {
  const soucis: string[] = [];
  const vus = new Set<string>();
  for (const p of PROGRAMMES_PAGES) {
    if (vus.has(p.slug)) soucis.push(`slug en double : « ${p.slug} »`);
    vus.add(p.slug);
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(p.slug)) soucis.push(`slug mal formé : « ${p.slug} »`);
    if (!PROGRAMMES.some((d) => d.id === p.id)) soucis.push(`programme inconnu : « ${p.id} »`);
  }
  for (const d of PROGRAMMES) {
    if (!PROGRAMMES_PAGES.some((p) => p.id === d.id)) soucis.push(`programme sans page publique : « ${d.id} »`);
  }
  return soucis;
}
