/* ─────────────────────────────────────────────────────────────────────
   LE CATALOGUE DES CARTES (Louis, 2026-11-06, maquette « Les cartes
   Vaiiya » : « Oui, code-la »).

   Pur : aucune lecture, aucune horloge, aucun DOM. Il dit quelles cartes
   existent, lesquelles sont gagnées et ce que chacune écrit. Les écrans
   n'en décident rien, et `npm run check:cartes` le rejoue hors ligne.

   Quatre familles ici : les rangs, les flammes, les programmes, les
   relais. Les mouvements vivent dans `mouvements.ts`, pour que la vitrine
   du profil n'embarque pas la bibliothèque d'exercices.

   ⚠️ UNE CARTE GAGNÉE NE SE PERD JAMAIS. Le rang ne redescend pas, et une
   flamme tient compte de la plus longue série connue : ce n'est pas la
   flamme de l'accueil, qui suit la série en cours.
   ⚠️ CE QU'ON N'A PAS RESTE VISIBLE, ÉTEINT, AVEC SON NUMÉRO : aucun cadenas.
   ⚠️ RIEN N'EST DEVINÉ. Une carte sans date n'en écrit pas, et le Guide
   d'une carte de programme est celui de la personne, jamais un défaut.
   ───────────────────────────────────────────────────────────────────── */

import { dateLongue, donneesCarte, type CartesRang, type DonneesCarte } from "@/lib/cartesRang";
import { PALIERS_FLAMME, type IdFlamme } from "@/lib/flammesSerie";
import { SERIES } from "@/lib/defi";
import { PROGRAMMES, programmeParId, valeurCourte } from "@/lib/parcours";
import type { GuideId } from "@/lib/guides";
import {
  DOSSIER, LOGO_IRIS, LUEUR_FLAMME, MATIERES_RANG, MATIERES_RELAIS, MATIERE_PROGRAMME,
  type FaceVoulue, type FicheDos, type PochetteVoulue,
} from "./matieres";

const NBSP = String.fromCharCode(160);
const VIGNETTES = `${DOSSIER}v/`;

export type FamilleCarte = "rangs" | "flammes" | "programmes" | "relais" | "mouvements";

export type CarteDef = {
  /** Stable pour toujours : une pochette en attente s'y accroche. */
  id: string;
  famille: FamilleCarte;
  nom: string;
  lueur: string;
  gagnee: boolean;
  /** Sa place dans sa famille, et la taille de la famille. */
  place: number;
  surTotal: number;
  /** L'image cuite, sans nom ni date : `null` pour un mouvement. */
  vignette: string | null;
  face: FaceVoulue;
  fiche: FicheDos;
  /** `null` : cette famille n'a pas de pochette (décision de Louis). */
  pochette: PochetteVoulue | null;
  vignettePochette: string | null;
  /** Les poses d'un mouvement : la carte joue son geste. */
  poses?: readonly string[];
  titre: string;
  sous: string;
  /** Ce qu'un lecteur d'écran entend. */
  dit: string;
  /** Le jour où elle a été gagnée, `YYYY-MM-DD`, s'il se sait. */
  jour: string | null;
  /** L'étiquette de l'étui, dans la vitrine. */
  etiquette: readonly [string, string];
};

export type IdCartePublique = { public?: boolean };

/** « 28 SEPT. 2026 », la date telle qu'elle se grave sur une carte. */
export function dateGravee(jour?: string | null): string | null {
  if (!jour || !/^\d{4}-\d{2}-\d{2}$/.test(jour)) return null;
  const [a, m, j] = jour.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, j)).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).toUpperCase();
}

const pluriel = (n: number, s: string) => (n > 1 ? `${s}s` : s);
const membre = (numero: number | null | undefined) => (numero != null ? String(numero).padStart(3, "0") : null);
const titreDe = (nom: string, o?: IdCartePublique) => `${o?.public ? "Sa" : "Ta"} carte ${nom}`;

/* ── Les rangs ── */

export function carteRang(rangId: string, d: DonneesCarte, gagnee = true, o?: IdCartePublique): CarteDef {
  const r = MATIERES_RANG.find((x) => x.id === rangId) ?? MATIERES_RANG[0];
  const bronze = r.id === "bronze";
  const pseudo = d.pseudo.trim();
  const jour = (bronze ? d.inscritLe : d.atteintLe) ?? null;
  const long = dateLongue(jour);
  const numero = membre(d.numero);
  const faits: [string | number, string][] = [];
  if (!bronze && d.seances != null) faits.push([d.seances, pluriel(d.seances, "séance")]);
  if (!bronze && d.jours != null) faits.push([d.jours, pluriel(d.jours, "jour")]);
  if (numero) faits.push([numero, "membre"]);
  const ligne = bronze
    ? (long ? `Membre depuis le ${long}` : "Le point de départ")
    : (long ? `Rang ${r.nom}, atteint le ${long}` : `Rang ${r.nom}`);
  return {
    id: `rang-${r.id}`,
    famille: "rangs",
    nom: r.nom,
    lueur: r.lueur,
    gagnee,
    place: r.n,
    surTotal: MATIERES_RANG.length,
    vignette: `${VIGNETTES}rang-${r.id}.webp`,
    face: { genre: "rang", rang: r.id, pseudo, numero: d.numero ?? null, date: dateGravee(jour) },
    fiche: { pseudo, ligne, faits, pied: `Rang ${r.n} sur ${MATIERES_RANG.length}` },
    pochette: { art: r.art, m: r.m, lueur: r.lueur, encre: r.encre, iris: r.f[0], ir: r.ir, etoiles: r.n },
    vignettePochette: `${VIGNETTES}pochette-${r.id}.webp`,
    titre: titreDe(r.nom, o),
    sous: `${r.fini}, rang ${r.n} sur ${MATIERES_RANG.length}`,
    dit: `Carte ${r.nom}${pseudo ? ` de ${pseudo}` : ""}${long ? `, ${bronze ? "depuis le" : "atteinte le"} ${long}` : ""}`,
    jour,
    etiquette: [r.nom.toUpperCase(), numero ? `N°${numero}` : `${r.n}/${MATIERES_RANG.length}`],
  };
}

/* ── Les flammes ── */

export function carteFlamme(id: IdFlamme, d: { pseudo: string; numero?: number | null; jour?: string | null; gagnee: boolean }, o?: IdCartePublique): CarteDef {
  const i = PALIERS_FLAMME.findIndex((p) => p.id === id);
  const p = PALIERS_FLAMME[Math.max(0, i)];
  const n = Math.max(0, i) + 1;
  const pseudo = d.pseudo.trim();
  const numero = membre(d.numero);
  const jour = d.jour ?? null;
  return {
    id: `flamme-${p.id}`,
    famille: "flammes",
    nom: p.nom,
    lueur: LUEUR_FLAMME,
    gagnee: d.gagnee,
    place: n,
    surTotal: PALIERS_FLAMME.length,
    vignette: `${VIGNETTES}flamme-${p.id}.webp`,
    face: { genre: "flamme", flamme: p.id, jours: p.des, nom: p.nom, pseudo, date: dateGravee(jour) },
    fiche: {
      pseudo,
      ligne: `${p.des}${NBSP}${pluriel(p.des, "jour")} d’affilée`,
      faits: numero ? [[numero, "membre"]] : [],
      pied: `Flamme ${n} sur ${PALIERS_FLAMME.length}`,
    },
    pochette: null,
    vignettePochette: null,
    titre: titreDe(p.nom, o),
    sous: o?.public ? "Une flamme de sa série" : "Une flamme de ta série",
    dit: `Carte ${p.nom}${pseudo ? ` de ${pseudo}` : ""}, ${p.des} ${pluriel(p.des, "jour")} d’affilée`,
    jour,
    etiquette: [p.nom.toUpperCase(), `${p.des}${NBSP}J`],
  };
}

/* ── Les programmes ── */

/** Le titre gravé (sur deux lignes si besoin) et la pose du Guide. */
export const GRAVURES_PROGRAMME: Record<string, { titre: string; pose: string; court: string }> = {
  "premiere-traction": { titre: "PREMIÈRE\nTRACTION", pose: "fier", court: "TRACTION" },
  "reprendre-le-sport": { titre: "REPRENDRE\nLE SPORT", pose: "salut", court: "REPRISE" },
  "cent-pompes": { titre: "CENT\nPOMPES", pose: "approuve", court: "POMPES" },
  fessiers: { titre: "FESSIERS", pose: "montre", court: "FESSIERS" },
  "abdos-solides": { titre: "ABDOS\nSOLIDES", pose: "carnet", court: "ABDOS" },
  "force-5x5": { titre: `FORCE 5${NBSP}×${NBSP}5`, pose: "haltere", court: "FORCE" },
  "chaise-au-mur": { titre: "LA CHAISE\nAU MUR", pose: "fier", court: "CHAISE" },
  "prepa-ski": { titre: "PRÉPA SKI", pose: "haltere", court: "SKI" },
};

export type DetailProgramme = { id: string; finiLe: string | null; depart: number | null; fin: number | null };

export function carteProgramme(
  id: string,
  d: { pseudo: string; guide: GuideId | null; numero?: number | null; detail?: DetailProgramme | null; gagnee: boolean },
  o?: IdCartePublique,
): CarteDef {
  const def = programmeParId(id) ?? PROGRAMMES[0];
  const g = GRAVURES_PROGRAMME[def.id] ?? { titre: def.titre.toUpperCase(), pose: "fier", court: def.titre.toUpperCase() };
  const pseudo = d.pseudo.trim();
  const numero = membre(d.numero);
  const jour = d.detail?.finiLe ?? null;
  const place = PROGRAMMES.findIndex((p) => p.id === def.id) + 1;
  const semaines = `${def.semaines}${NBSP}semaines`;
  const faits: [string | number, string][] = d.detail?.depart != null && d.detail.fin != null
    ? [[valeurCourte(def.test.mesure, d.detail.depart), "au départ"], [valeurCourte(def.test.mesure, d.detail.fin), "à l’arrivée"]]
    : numero ? [[numero, "membre"]] : [];
  return {
    id: `prog-${def.id}`,
    famille: "programmes",
    nom: def.titre,
    lueur: MATIERE_PROGRAMME.lueur,
    gagnee: d.gagnee,
    place,
    surTotal: PROGRAMMES.length,
    vignette: `${VIGNETTES}prog-${def.id}-${d.guide ?? "sans"}.webp`,
    face: {
      genre: "programme",
      titre: g.titre,
      duree: semaines,
      // Sans Guide choisi, la carte ne montre personne : on ne choisit pas à sa place.
      pose: d.guide ? `${DOSSIER}pose-${d.guide}-${g.pose}.webp` : null,
      pseudo,
      date: dateGravee(jour),
    },
    fiche: { pseudo, ligne: `${def.titre}, ${semaines}`, faits, pied: "Programme terminé" },
    pochette: { art: `${DOSSIER}art-programme.webp`, m: MATIERE_PROGRAMME.m, lueur: MATIERE_PROGRAMME.lueur, encre: MATIERE_PROGRAMME.encre, iris: MATIERE_PROGRAMME.f[0], ir: LOGO_IRIS, etoiles: 3 },
    vignettePochette: `${VIGNETTES}pochette-programme.webp`,
    titre: titreDe(def.titre, o),
    sous: "Un programme terminé",
    dit: `Carte ${def.titre}${pseudo ? ` de ${pseudo}` : ""}, programme terminé`,
    jour,
    etiquette: [g.court, `${def.semaines}${NBSP}SEM`],
  };
}

/* ── Les relais ── */

export type DetailRelais = { serie: string; jour: string | null; duo: string | null; objectif: number | null; aDeux: boolean };

const SLUGS_SERIE = Object.keys(SERIES);

export function carteRelais(serie: string, d: { pseudo: string; detail?: DetailRelais | null; gagnee: boolean }, o?: IdCartePublique): CarteDef {
  const slug = SERIES[serie as keyof typeof SERIES] ? serie : SLUGS_SERIE[0];
  const s = SERIES[slug as keyof typeof SERIES];
  const n = SLUGS_SERIE.indexOf(slug) + 1;
  const duo = d.detail?.duo ?? d.pseudo.trim().toUpperCase();
  const jour = d.detail?.jour ?? null;
  const objectif = d.detail?.objectif ?? null;
  const m = MATIERES_RELAIS[slug];
  const aDeux = d.detail?.aDeux ?? true;
  return {
    id: `relais-${slug}`,
    famille: "relais",
    nom: s.nom,
    lueur: m.m[2],
    gagnee: d.gagnee,
    place: n,
    surTotal: SLUGS_SERIE.length,
    vignette: `${VIGNETTES}relais-${slug}.webp`,
    face: { genre: "relais", serie: slug, nom: s.nom, rang: `Relais${NBSP}${n}/${SLUGS_SERIE.length}`, duo, date: dateGravee(jour) },
    fiche: {
      pseudo: duo,
      ligne: aDeux ? "Relais gagné à deux" : "Relais gagné en groupe",
      faits: objectif ? [[objectif, "maillons"]] : [],
      pied: `Affiche ${n} sur ${SLUGS_SERIE.length}`,
    },
    pochette: { art: `${DOSSIER}art-relais-${slug}.webp`, m: m.m, lueur: "#FFD98A", encre: "#FFF7E6", iris: 0.5, ir: m.ir, etoiles: n },
    vignettePochette: `${VIGNETTES}pochette-relais-${slug}.webp`,
    titre: titreDe(s.nom, o),
    sous: aDeux ? "Un relais gagné à deux" : "Un relais gagné en groupe",
    dit: `Carte ${s.nom}, relais gagné${duo ? ` par ${duo}` : ""}`,
    jour,
    etiquette: [s.nom.toUpperCase(), `${n}/${SLUGS_SERIE.length}`],
  };
}

/* ── La collection d'un compte ── */

export type SourcesCollection = {
  pseudo: string;
  numero?: number | null;
  /** Le rang actuel, s'il est connu. */
  rangId: string | null;
  cartes?: CartesRang | null;
  /** La série en cours, la plus longue connue, le maximum vu sur cet appareil. */
  serie: number;
  record?: number | null;
  flammeMax?: number;
  datesFlammes?: Partial<Record<IdFlamme, string>>;
  slugs: ReadonlySet<string>;
  programmes?: readonly DetailProgramme[];
  relais?: readonly DetailRelais[];
  guide: GuideId | null;
  public?: boolean;
};

export type Collection = {
  rangs: CarteDef[];
  flammes: CarteDef[];
  programmes: CarteDef[];
  relais: CarteDef[];
};

/** La plus longue série que disent les badges, sur un profil public. */
function recordDesBadges(slugs: ReadonlySet<string>): number {
  let r = 0;
  for (const s of slugs) {
    const m = /^regularite-(\d+)$/.exec(s);
    if (m) r = Math.max(r, Number(m[1]));
  }
  return r;
}

/** Les jours qui comptent pour les flammes gagnées : le meilleur qu'on sache. */
export function joursFlammes(s: Pick<SourcesCollection, "serie" | "record" | "flammeMax" | "slugs">): number {
  return Math.max(s.serie || 0, s.record ?? 0, s.flammeMax ?? 0, recordDesBadges(s.slugs));
}

export function construireCollection(s: SourcesCollection): Collection {
  const o = { public: !!s.public };
  const numero = s.numero ?? s.cartes?.numero ?? null;
  const iRang = MATIERES_RANG.findIndex((m) => m.id === s.rangId);
  const rangs = MATIERES_RANG.map((m, i) => {
    const d = donneesCarte(s.cartes ?? null, m.id, s.pseudo);
    return carteRang(m.id, { ...d, numero }, i <= iRang, o);
  });
  const jours = joursFlammes(s);
  const flammes = PALIERS_FLAMME.map((p) => carteFlamme(p.id, {
    pseudo: s.pseudo,
    numero,
    jour: s.datesFlammes?.[p.id] ?? null,
    gagnee: jours >= p.des,
  }, o));
  const programmes = PROGRAMMES.map((p) => {
    const detail = s.programmes?.find((x) => x.id === p.id) ?? null;
    return carteProgramme(p.id, { pseudo: s.pseudo, guide: s.guide, numero, detail, gagnee: !!detail || s.slugs.has(`programme-${p.id}`) }, o);
  });
  const relais = SLUGS_SERIE.map((slug) => {
    const detail = s.relais?.find((x) => x.serie === slug) ?? null;
    return carteRelais(slug, { pseudo: s.pseudo, detail, gagnee: !!detail || s.slugs.has(`serie-${slug}`) }, o);
  });
  return { rangs, flammes, programmes, relais };
}

export const toutes = (c: Collection): CarteDef[] => [...c.rangs, ...c.flammes, ...c.programmes, ...c.relais];

const gagnees = (l: CarteDef[]) => l.filter((x) => x.gagnee);
const plusRecente = (l: CarteDef[]) => [...l].sort((a, b) => (b.jour ?? "").localeCompare(a.jour ?? ""))[0];

/** Les places de la vitrine. La base n'en garde pas plus (`profiles_vitrine_cartes_forme`). */
export const PLACES_VITRINE = 3;

/**
 * La vitrine. Les cartes choisies d'abord, dans leur ordre, puis les plus
 * belles cartes gagnées : le rang, puis ce qui se gagne le plus dur, une
 * famille à la fois tant qu'il y en a.
 *
 * ⚠️ UN CHOIX NE PROUVE RIEN : il s'écrit depuis le navigateur, n'importe qui
 * peut y poser une carte qu'il n'a pas. Seule une carte gagnée entre, et chez
 * un ami « gagnée » se calcule sur ce que la base dit de ce compte.
 *
 * `combler` : sur son propre profil, un étal vide ne dit rien, donc le rang
 * suivant attend à sa place, éteint. Chez un ami, on ne montre que ce qui
 * est gagné.
 */
export function vitrineDe(c: Collection, opts: { combler: boolean; choix?: readonly string[] | null }): CarteDef[] {
  const parId = new Map(toutes(c).map((x) => [x.id, x]));
  const choisies = (opts.choix ?? []).flatMap((id) => {
    const x = parId.get(id);
    return x?.gagnee ? [x] : [];
  });
  const rangs = gagnees(c.rangs).reverse();
  const flammes = gagnees(c.flammes).reverse();
  const ordre = [
    ...choisies,
    rangs[0], plusRecente(gagnees(c.relais)), plusRecente(gagnees(c.programmes)), flammes[0],
    ...rangs.slice(1), ...gagnees(c.relais), ...gagnees(c.programmes), ...flammes.slice(1),
  ].filter((x): x is CarteDef => !!x);
  const vus = new Set<string>();
  const trois: CarteDef[] = [];
  for (const x of ordre) {
    if (trois.length === PLACES_VITRINE) break;
    if (vus.has(x.id)) continue;
    vus.add(x.id);
    trois.push(x);
  }
  if (opts.combler) {
    for (const x of [...c.rangs.filter((r) => !r.gagnee), ...c.flammes.filter((f) => !f.gagnee)]) {
      if (trois.length === PLACES_VITRINE) break;
      trois.push(x);
    }
  }
  return trois;
}

/**
 * Ce qu'on peut poser dans sa vitrine, famille par famille, le plus haut
 * d'abord. Pas les mouvements : leur carnet vit sur l'appareil, donc personne
 * d'autre ne pourrait vérifier qu'ils sont gagnés.
 */
export function choixPossibles(c: Collection): { titre: string; cartes: CarteDef[] }[] {
  return [
    { titre: "Les rangs", cartes: gagnees(c.rangs).reverse() },
    { titre: "Les flammes", cartes: gagnees(c.flammes).reverse() },
    { titre: "Les programmes", cartes: gagnees(c.programmes) },
    { titre: "Les relais", cartes: gagnees(c.relais) },
  ].filter((f) => f.cartes.length > 0);
}

/** Toucher une carte : elle sort si elle y est, sinon elle entre. Places
 *  pleines, elle prend la dernière : un toucher n'est jamais refusé. */
export function basculerChoix(choix: readonly string[], id: string): string[] {
  if (choix.includes(id)) return choix.filter((x) => x !== id);
  const places = choix.length < PLACES_VITRINE ? choix : choix.slice(0, PLACES_VITRINE - 1);
  return [...places, id];
}

/** La dernière carte gagnée dont on connaît le jour. */
export function derniereCarte(c: Collection): CarteDef | null {
  const datees = toutes(c).filter((x) => x.gagnee && x.jour);
  return datees.length ? plusRecente(datees) : null;
}

export function compterGagnees(c: Collection): number {
  return toutes(c).filter((x) => x.gagnee).length;
}

/** Les cartes de mouvements. `check:cartes` le compare à la bibliothèque,
 *  que le profil ne charge pas pour un simple total. */
export const NOMBRE_MOUVEMENTS = 102;

/** La taille de la collection, mouvements compris. */
export function totalCollection(c: Collection): number {
  return toutes(c).length + NOMBRE_MOUVEMENTS;
}

/** Les cartes de rang gagnées, de la première à l'actuelle. */
export function rangsGagnes(rangId: string, cartes: CartesRang | null, pseudo: string, numero?: number | null): CarteDef[] {
  const i = MATIERES_RANG.findIndex((m) => m.id === rangId);
  return MATIERES_RANG.slice(0, Math.max(0, i) + 1).map((m) => {
    const d = donneesCarte(cartes, m.id, pseudo);
    return carteRang(m.id, { ...d, numero: numero ?? d.numero });
  });
}
