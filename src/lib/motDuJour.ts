/* ─────────────────────────────────────────────────────────────────────
   LE MOT DU JOUR (Louis, 2026-10-17, page « Revenir chaque jour » ;
   recomposé sur une banque le 2026-10-18, GO sur la page « Le mot du
   jour » du canevas « Les rangs et le profil »).

   Chaque jour, le Guide laisse un mot sur l'accueil : une pastille sur
   son visage, « Sasha t'a laissé un mot », et on l'ouvre comme un
   message. Trois pièces, puis le mouvement du jour :
     ① une ACCROCHE, tirée par ce qui compte aujourd'hui ;
     ② les FAITS du jour : la flamme, puis le programme ;
     ③ un CONSEIL, dont la famille suit la journée.
   Les MOTS vivent dans `guides.ts` (`MATIN`, `CONSEILS_MATIN`). Ce
   fichier CHOISIT (pur, vérifié par `check:matin`) et garde sur
   l'appareil ce qui a été dit.

   ⚠️ L'ACCROCHE SUIT UN ORDRE, ET L'ORDRE EST LA RÈGLE : une nouvelle
   flamme (c'est alors elle, l'accroche), un retour, les débuts, un
   anniversaire, un rang à portée, le relais, la semaine, la saison, le
   mois, hier, puis le jour et l'heure.
   ⚠️ LE CONSEIL SUIT LA JOURNÉE : une séance prévue donne le geste d'un
   de ses mouvements, un repos donne la respiration ou la récup, le soir
   donne le sommeil, le dimanche donne la semaine, un retour donne une
   séance courte. Sa famille change d'un jour à l'autre.
   ⚠️ RIEN NE REVIENT TROP VITE : une accroche pas avant 30 jours, un
   conseil pas avant 60. Et le mot reste le même toute la journée, même
   ouvert trois fois : le choix du jour se garde à la première ouverture.
   Les FAITS, eux, se relisent à chaque fois : une séance faite à midi se
   dit le soir.
   ⚠️ « Rien de prévu » ne s'écrit qu'une fois la journée LUE : tant
   qu'elle charge, le mot n'a pas de ligne de programme.
   ⚠️ AUCUNE IA, AUCUN COÛT : les faits viennent de la base, les mots d'une
   banque relue.
   ───────────────────────────────────────────────────────────────────── */

import type { MomentAccueil } from "@/lib/momentAccueil";
import type { EtatJournee } from "@/lib/journee";
import type { EtatCoop } from "@/lib/defi";
import type { createClient } from "@/lib/supabase";
import { etatFlamme, type IdFlamme } from "@/lib/flammesSerie";
import { indexDuJour } from "@/lib/missionsAccueil";
import { trouverExercice } from "@/lib/exerciseLibrary";
import { MISSIONS } from "@/lib/aura";
import { parisDateStr, shiftDateStr } from "@/lib/dates";
import {
  CONSEILS_MATIN, MATIN, SEMAINE_MATIN, compteSemaine, direConseil, direMatin, typoMatin,
  type ConseilMatin, type ContexteMatin, type PieceMatin,
} from "@/lib/guides";

type SB = ReturnType<typeof createClient>;

/** Une même accroche ne revient pas avant 30 jours, un même conseil avant 60. */
export const FENETRE_ACCROCHE = 30;
export const FENETRE_CONSEIL = 60;
/** Au-delà, l'historique s'oublie : il ne sert qu'aux deux fenêtres. */
const GARDE_HISTORIQUE = 70;
/** L'accroche du jour où une flamme arrive : la flamme elle-même. */
export const ACCROCHE_FLAMME = "flamme";

export type FamilleConseil =
  | "geste" | "savais" | "sommeil" | "respire" | "recup"
  | "nutrition" | "defi" | "question" | "reprendre" | "semaine";

export type PlanDuJour = {
  etat: EtatJournee;
  /** La séance du jour (prévue ou faite), telle qu'elle s'affiche. */
  titre?: string | null;
  /** La prochaine étape du programme. */
  etape?: string | null;
  /** Le jour déjà donné à cette étape (« mardi 8 »), s'il y en a un. */
  jour?: string | null;
  /** Les mouvements de la séance proposée aujourd'hui (datée ou étape). */
  mouvements?: string[];
  /** La séance faite aujourd'hui : sa durée, quand on la connaît. */
  minutes?: number | null;
};

/** Ce que la base dit d'hier et de la semaine. `null` = pas lu. */
export type FaitsMot = {
  hier: { seances: number; titre: string | null; minutes: number | null; repas: number } | null;
  semaine: { lundi: string; valides: string[]; seances: number; repas: number } | null;
  /** Les jours depuis la création du compte, au jour parisien. */
  ageCompte: number | null;
};

export type HistoriqueMot = {
  /** Le dernier jour où chaque pièce a été dite. */
  pieces: Record<string, string>;
  /** La famille du conseil de chaque jour. */
  familles: Record<string, FamilleConseil>;
};

export type EntreeMot = {
  /** Le jour parisien. */
  jour: string;
  /** L'heure parisienne de la première ouverture. */
  heure: number;
  serie: number;
  /** Le mot que le Guide avait pour l'accueil aujourd'hui (`momentAccueil`). */
  moment: MomentAccueil | null;
  /** `null` tant que la journée n'est pas lue. */
  plan: PlanDuJour | null;
  faits: FaitsMot | null;
  relais: { quoi: EtatCoop["quoi"]; maillon?: number } | null;
  /** Vaiiya+ : les missions Premium de la semaine comptent. */
  premium: boolean;
  historique: HistoriqueMot;
  /** Les jokers de la série, tels que la base les compte. `null` (ou absent) :
   *  la base n'en pose pas encore, le mot n'en parle pas. */
  jokers?: { hierCouvert: boolean; restants: number } | null;
};

export type ChoixMot = {
  /** L'identifiant de la pièce, ou `ACCROCHE_FLAMME`. */
  accroche: string | null;
  conseil: { famille: FamilleConseil; id: string } | null;
};

/** Une ligne du mot. `flamme` : la ligne d'une nouvelle flamme, en gras. */
export type LigneMot = { id: string; texte: string; flamme?: IdFlamme };

export type JourSemaine = { date: string; lettre: string; valide: boolean; aujourdhui: boolean };

export type ConseilMot =
  | { famille: "geste"; id: string; mouvement: string; texte: string }
  | { famille: "savais" | "sommeil"; id: string; texte: string; nombre: string | null }
  | { famille: "respire"; id: string; texte: string; rythme: readonly [number, number, number, number]; mouvement: string | null }
  | { famille: "recup" | "nutrition" | "defi"; id: string; texte: string; mouvement: string | null }
  | { famille: "question"; id: string; texte: string }
  | { famille: "reprendre"; id: string; texte: string; debut: boolean }
  | { famille: "semaine"; id: string; jours: JourSemaine[]; compte: string; mission: string | null };

/* ── Les dates ── */

const ecart = (de: string, a: string) => indexDuJour(a) - indexDuJour(de);

/** 0 = lundi, 6 = dimanche. */
export function rangDuJour(jour: string): number {
  const [a, m, j] = jour.split("-").map(Number);
  return (new Date(Date.UTC(a, (m || 1) - 1, j || 1)).getUTCDay() + 6) % 7;
}

export function lundiDe(jour: string): string {
  return shiftDateStr(jour, -rangDuJour(jour));
}

function periode(heure: number): keyof typeof MATIN.moment {
  if (heure >= 5 && heure < 11) return "aube";
  if (heure >= 11 && heure < 14) return "midi";
  if (heure >= 14 && heure < 18) return "apresmidi";
  if (heure >= 18 && heure < 22) return "soir";
  return "nuit";
}

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

/** Les trois premiers jours d'une saison, et ceux de la rentrée. */
function saisonDu(jour: string): keyof typeof MATIN.saison | null {
  const [, m, j] = jour.split("-").map(Number);
  const dans = (mm: number, dd: number) => m === mm && j >= dd && j <= dd + 2;
  if (dans(9, 1)) return "rentree";
  if (dans(3, 20)) return "printemps";
  if (dans(6, 21)) return "ete";
  if (dans(9, 22)) return "automne";
  if (dans(12, 21)) return "hiver";
  return null;
}

/* ── Le tirage ── */

/** Dite dans la fenêtre, AVANT aujourd'hui : ce qui a été dit aujourd'hui
 *  même ne compte pas, sinon le choix du jour se contredirait en se relisant. */
function recent(h: HistoriqueMot, id: string, jour: string, fenetre: number): boolean {
  const vu = h.pieces[id];
  return !!vu && vu < jour && ecart(vu, jour) < fenetre;
}

/** La première pièce libre, en partant d'un point qui tourne avec le jour. */
function tirer<T extends { id: string }>(pool: readonly T[], jour: string, h: HistoriqueMot, fenetre: number): T | null {
  const n = pool.length;
  if (!n) return null;
  const depart = ((indexDuJour(jour) % n) + n) % n;
  for (let k = 0; k < n; k++) {
    const p = pool[(depart + k) % n];
    if (!recent(h, p.id, jour, fenetre)) return p;
  }
  return null;
}

/** La moins récemment dite (jamais dite d'abord). Le dernier recours. */
function lePlusAncien<T extends { id: string }>(pool: readonly T[], h: HistoriqueMot): T | null {
  let meilleure: T | null = null;
  let vuLe = "~";
  for (const p of pool) {
    const vu = h.pieces[p.id] ?? "";
    if (vu < vuLe) { meilleure = p; vuLe = vu; }
  }
  return meilleure;
}

const variante = <T,>(pool: readonly T[], jour: string, decalage = 0): T =>
  pool[(((indexDuJour(jour) + decalage) % pool.length) + pool.length) % pool.length];

const estRetour = (m?: MomentAccueil["cle"]) => m === "absence.longue" || m === "absence.courte";
const jourDeSerie = (n: number) => (Number.isFinite(n) ? Math.max(1, Math.floor(n)) : 1);

/* ── L'accroche ── */

function poolOrdinaire(e: EntreeMot): PieceMatin[] {
  return [...MATIN.jour[rangDuJour(e.jour)], ...MATIN.moment[periode(e.heure)]];
}

/** Les jours validés de la semaine viennent d'atteindre 3, 5 ou 7. */
function semaineAtteinte(e: EntreeMot): number | null {
  const s = e.faits?.semaine;
  if (!s) return null;
  const n = s.valides.length;
  if (n !== 3 && n !== 5 && n !== 7) return null;
  return s.valides.includes(shiftDateStr(e.jour, -1)) || s.valides.includes(e.jour) ? n : null;
}

export function choisirAccroche(e: EntreeMot): string | null {
  if (etatFlamme(jourDeSerie(e.serie)).nouvelle) return ACCROCHE_FLAMME;
  const m = e.moment?.cle;
  const files: { pool: readonly PieceMatin[]; fenetre: number }[] = [];
  const ajouter = (pool: readonly PieceMatin[] | undefined, fenetre = FENETRE_ACCROCHE) => {
    if (pool?.length) files.push({ pool, fenetre });
  };

  // Un joker a gardé la série cette nuit : c'est ce que le Guide dit d'abord.
  if (e.jokers?.hierCouvert) ajouter(MATIN.joker, 0);
  if (m === "absence.longue") ajouter(MATIN.retourLong);
  if (m === "absence.courte") ajouter(MATIN.retourCourt);
  if (m === "debut") ajouter(MATIN.debut);
  const age = e.faits?.ageCompte;
  const anniv = age != null ? MATIN.anniv[age] : undefined;
  if (anniv) ajouter([anniv], 0);
  if (m === "palier" && e.moment?.ctx?.manque && e.moment.ctx.rang) ajouter(MATIN.palier);
  if (e.relais) ajouter(MATIN.relais[e.relais.quoi]);
  const atteinte = semaineAtteinte(e);
  if (atteinte) ajouter(MATIN.semaine[atteinte]);
  const saison = saisonDu(e.jour);
  if (saison) ajouter(MATIN.saison[saison]);
  if (e.jour.endsWith("-01")) ajouter(MATIN.mois);
  const hier = e.faits?.hier;
  if (hier && hier.seances > 0) ajouter(hier.titre ? MATIN.hierSeance : MATIN.hierSeanceAnonyme);
  else if (hier && hier.repas > 0) ajouter(MATIN.hierRepas);
  const ordinaire = poolOrdinaire(e);
  ajouter(ordinaire);

  for (const f of files) {
    const p = tirer(f.pool, e.jour, e.historique, f.fenetre);
    if (p) return p.id;
  }
  return lePlusAncien(ordinaire, e.historique)?.id ?? null;
}

/* ── Le conseil ── */

const GENERAL: FamilleConseil[] = ["savais", "nutrition", "defi", "question", "recup"];

/** Les mouvements de la séance du jour qui ont leur fiche (et donc leur geste). */
export function gestesDuPlan(plan: PlanDuJour | null): string[] {
  if (!plan || (plan.etat !== "seance" && plan.etat !== "etape")) return [];
  const vus = new Set<string>();
  for (const nom of plan.mouvements ?? []) {
    const exo = trouverExercice(nom);
    if (exo?.tip) vus.add(exo.name);
  }
  return [...vus];
}

/** La question d'un jour qui compte : une flamme qui arrive, un anniversaire. */
function questionDuJour(e: EntreeMot): ConseilMatin | null {
  const f = etatFlamme(jourDeSerie(e.serie));
  if (f.nouvelle) {
    if (f.palier.id === "feu") return CONSEILS_MATIN.evenement.feu;
    if (f.palier.id === "brasier") return CONSEILS_MATIN.evenement.brasier;
    if (f.palier.id === "sacre") return CONSEILS_MATIN.evenement.sacre;
  }
  if (e.faits?.ageCompte === 30) return CONSEILS_MATIN.evenement.anniv30;
  if (e.faits?.ageCompte === 365) return CONSEILS_MATIN.evenement.anniv365;
  return null;
}

const POOLS: Record<"savais" | "sommeil" | "respire" | "recup" | "nutrition" | "defi", readonly ConseilMatin[]> = {
  savais: CONSEILS_MATIN.savais,
  sommeil: CONSEILS_MATIN.sommeil,
  respire: CONSEILS_MATIN.respire,
  recup: CONSEILS_MATIN.recup,
  nutrition: CONSEILS_MATIN.nutrition,
  defi: CONSEILS_MATIN.defi,
};

function tirerConseil(famille: FamilleConseil, e: EntreeMot, question: ConseilMatin | null): string | null {
  const { jour, historique: h } = e;
  switch (famille) {
    case "geste": {
      const pool = gestesDuPlan(e.plan).map((nom) => ({ id: `geste.${nom}` }));
      return tirer(pool, jour, h, FENETRE_CONSEIL)?.id ?? null;
    }
    case "semaine":
      return "semaine";
    case "reprendre": {
      // Un jour de retour garde sa séance courte, même si la phrase revient.
      const pool = e.moment?.cle === "debut" ? CONSEILS_MATIN.commencer : CONSEILS_MATIN.reprendre;
      return (tirer(pool, jour, h, FENETRE_CONSEIL) ?? variante(pool, jour)).id;
    }
    case "question": {
      if (question) return question.id;
      const debut = (e.faits?.ageCompte ?? Infinity) < 14
        ? tirer(CONSEILS_MATIN.questionDebut, jour, h, FENETRE_CONSEIL)
        : null;
      return (debut ?? tirer(CONSEILS_MATIN.question, jour, h, FENETRE_CONSEIL))?.id ?? null;
    }
    default:
      return tirer(POOLS[famille], jour, h, FENETRE_CONSEIL)?.id ?? null;
  }
}

export function choisirConseil(e: EntreeMot): ChoixMot["conseil"] {
  const plan = e.plan;
  const fait = plan?.etat === "done";
  const m = e.moment?.cle;

  // Les jours qui comptent passent avant la rotation.
  const evenements: FamilleConseil[] = [];
  if ((estRetour(m) || m === "debut") && !fait) evenements.push("reprendre");
  if (rangDuJour(e.jour) === 6 && (e.faits?.semaine?.valides.length ?? 0) > 0) evenements.push("semaine");
  const question = questionDuJour(e);
  if (question) evenements.push("question");

  // La journée propose, puis la rotation de fond.
  const contexte: FamilleConseil[] = [];
  if (gestesDuPlan(plan).length > 0) contexte.push("geste");
  if (plan?.etat === "repos") contexte.push("respire", "recup");
  if (e.heure >= 19 || e.heure < 5) contexte.push("sommeil", "respire");
  if (fait) contexte.push("recup", "nutrition");
  const d = indexDuJour(e.jour);
  const general = GENERAL.map((_, i) => GENERAL[(((i + d) % GENERAL.length) + GENERAL.length) % GENERAL.length]);
  const suite = [...new Set([...contexte, ...general])];
  // La famille d'hier ne revient pas, sauf s'il n'y en a pas d'autre.
  const hier = e.historique.familles[shiftDateStr(e.jour, -1)];
  const sansHier = suite.filter((f) => f !== hier);
  const ordre = [...new Set([...evenements, ...(sansHier.length ? sansHier : suite)])];

  for (const famille of ordre) {
    const id = tirerConseil(famille, e, question);
    if (id) return { famille, id };
  }
  const repli = lePlusAncien(CONSEILS_MATIN.savais, e.historique);
  return repli ? { famille: "savais", id: repli.id } : null;
}

/** Pure : ce que le Guide dira aujourd'hui. Se garde à la première ouverture. */
export function choisirMot(e: EntreeMot): ChoixMot {
  return { accroche: choisirAccroche(e), conseil: choisirConseil(e) };
}

/* ── Le rendu : les lignes et le conseil ── */

const ACCROCHES = new Map<string, PieceMatin>();
for (const pool of [
  ...MATIN.jour, ...Object.values(MATIN.moment),
  MATIN.hierSeance, MATIN.hierSeanceAnonyme, MATIN.hierRepas, MATIN.palier, MATIN.joker,
  MATIN.retourCourt, MATIN.retourLong, MATIN.debut, MATIN.mois,
  ...Object.values(MATIN.relais), ...Object.values(MATIN.saison), ...Object.values(MATIN.semaine),
  Object.values(MATIN.anniv),
]) for (const p of pool ?? []) if (p) ACCROCHES.set(p.id, p);

const CONSEILS = new Map<string, ConseilMatin>();
for (const pool of [
  CONSEILS_MATIN.savais, CONSEILS_MATIN.sommeil, CONSEILS_MATIN.respire, CONSEILS_MATIN.recup,
  CONSEILS_MATIN.nutrition, CONSEILS_MATIN.defi, CONSEILS_MATIN.question, CONSEILS_MATIN.questionDebut,
  CONSEILS_MATIN.reprendre, CONSEILS_MATIN.commencer, Object.values(CONSEILS_MATIN.evenement),
]) for (const c of pool) CONSEILS.set(c.id, c);

/** Les pièces de l'accroche et du conseil, pour le banc. */
export const PIECES_ACCROCHE: ReadonlyMap<string, PieceMatin> = ACCROCHES;
export const PIECES_CONSEIL: ReadonlyMap<string, ConseilMatin> = CONSEILS;

function contexteFlamme(serie: number): ContexteMatin {
  const f = etatFlamme(serie);
  return {
    serie, au: f.palier.au, le: f.palier.le,
    suivanteLe: f.suivant?.le, suivanteNom: f.suivant?.nom, restant: f.restant,
  };
}

function contexteAccroche(e: EntreeMot): ContexteMatin {
  const hier = e.faits?.hier;
  const [, mois] = e.jour.split("-").map(Number);
  return {
    titre: hier?.titre ?? undefined,
    minutes: hier?.minutes ?? undefined,
    repas: hier?.repas,
    manque: e.moment?.ctx?.manque,
    rang: e.moment?.ctx?.rang,
    maillon: e.relais?.maillon,
    mois: MOIS[(mois || 1) - 1],
    jokers: e.jokers?.restants,
  };
}

function lignePlan(e: EntreeMot, choix: ChoixMot): LigneMot | null {
  const plan = e.plan;
  if (!plan) return null;
  const geste = choix.conseil?.famille === "geste";
  const reprendre = choix.conseil?.famille === "reprendre";
  const courte = e.moment?.cle === "debut" ? MATIN.plan.commencer : MATIN.plan.retour;
  let pool: readonly PieceMatin[] | null = null;
  switch (plan.etat) {
    case "seance":
      pool = plan.titre ? (geste ? MATIN.plan.seanceGeste : MATIN.plan.seance) : null;
      break;
    case "etape":
      if (reprendre) pool = courte;
      else if (plan.etape) pool = plan.jour ? MATIN.plan.etapeJour : geste ? MATIN.plan.etapeGeste : MATIN.plan.etape;
      break;
    case "done":
      pool = MATIN.plan.fait;
      break;
    case "repos":
      pool = reprendre ? courte : MATIN.plan.repos;
      break;
    case "libre":
      pool = reprendre ? courte : MATIN.plan.libre;
      break;
    default:
      pool = null;
  }
  if (!pool) return null;
  const p = variante(pool, e.jour, 3);
  return {
    id: p.id,
    texte: direMatin(p, {
      titre: plan.titre ?? undefined, etape: plan.etape ?? undefined,
      jour: plan.jour ?? undefined, minutes: plan.minutes ?? undefined,
    }),
  };
}

/** Pure : les lignes du mot, dans l'ordre où le Guide les dit. */
export function lignesDuMot(e: EntreeMot, choix: ChoixMot): LigneMot[] {
  const lignes: LigneMot[] = [];
  const n = jourDeSerie(e.serie);
  const f = etatFlamme(n);
  const cf = contexteFlamme(n);

  // ① L'accroche. Le jour d'une nouvelle flamme, c'est elle.
  if (f.nouvelle) {
    const p = variante(MATIN.flamme.nouvelle, e.jour);
    lignes.push({ id: p.id, texte: direMatin(p, cf), flamme: f.palier.id });
  } else if (choix.accroche) {
    const p = ACCROCHES.get(choix.accroche);
    if (p) lignes.push({ id: p.id, texte: direMatin(p, contexteAccroche(e)) });
  }

  // ② La flamme.
  const flammes = f.nouvelle
    ? (f.suivant ? MATIN.flamme.suite : MATIN.flamme.sacre)
    : !f.suivant ? MATIN.flamme.sommet
    : n === 1 ? (estRetour(e.moment?.cle) ? MATIN.flamme.repart : MATIN.flamme.debut)
    : MATIN.flamme.courante;
  const pf = variante(flammes, e.jour);
  lignes.push({ id: pf.id, texte: direMatin(pf, cf) });

  // ③ Le programme, une fois la journée lue.
  const plan = lignePlan(e, choix);
  if (plan) lignes.push(plan);
  return lignes;
}

const LETTRES_JOURS = ["L", "M", "M", "J", "V", "S", "D"];

function semaineDuMot(e: EntreeMot): ConseilMot | null {
  const s = e.faits?.semaine;
  if (!s) return null;
  const jours = LETTRES_JOURS.map((lettre, i) => {
    const date = shiftDateStr(s.lundi, i);
    return { date, lettre, valide: s.valides.includes(date), aujourdhui: date === e.jour };
  });
  const n = s.valides.length;
  // Les missions de la semaine, lues dans le catalogue : leur titre, leur
  // EXP et leur seuil (« 3 jours validés cette semaine. »).
  const missions = MISSIONS
    .filter((m) => m.periode === "semaine" && (e.premium || !m.premium))
    .map((m) => ({ m, seuil: parseInt(m.condition, 10) }))
    .filter((x) => x.seuil > 0)
    .sort((a, b) => a.seuil - b.seuil);
  const faite = [...missions].reverse().find((x) => n >= x.seuil);
  // À portée d'une action aujourd'hui, et seulement si aujourd'hui n'est pas
  // encore validé : sinon la phrase promettrait un jour qui compte déjà.
  const enVue = s.valides.includes(e.jour) ? undefined : missions.find((x) => x.seuil === n + 1);
  return {
    famille: "semaine",
    id: "semaine",
    jours,
    compte: typoMatin(compteSemaine({ jours: n, seances: s.seances, repas: s.repas })),
    mission: enVue ? SEMAINE_MATIN.enVue(enVue.m.titre) : faite ? SEMAINE_MATIN.faite(faite.m.titre, faite.m.exp) : null,
  };
}

/** Pure : le conseil du jour, prêt à afficher. */
export function conseilDuMot(e: EntreeMot, choix: ChoixMot): ConseilMot | null {
  const c = choix.conseil;
  if (!c) return null;
  if (c.famille === "geste") {
    const exo = trouverExercice(c.id.slice("geste.".length));
    return exo ? { famille: "geste", id: c.id, mouvement: exo.name, texte: typoMatin(exo.tip) } : null;
  }
  if (c.famille === "semaine") return semaineDuMot(e);
  const p = CONSEILS.get(c.id);
  if (!p) return null;
  const texte = direConseil(p);
  switch (c.famille) {
    case "savais":
    case "sommeil":
      return { famille: c.famille, id: p.id, texte, nombre: p.nombre ? p.nombre.replace(/ /g, " ") : null };
    case "respire":
      return { famille: "respire", id: p.id, texte, rythme: p.rythme ?? [5, 0, 5, 0], mouvement: p.mouvement ?? null };
    case "question":
      return { famille: "question", id: p.id, texte };
    case "reprendre":
      return { famille: "reprendre", id: p.id, texte, debut: p.id.startsWith("commencer.") };
    default:
      return { famille: c.famille, id: p.id, texte, mouvement: p.mouvement ?? null };
  }
}

/* ── Ce que la base dit d'hier et de la semaine ── */

/** Une lecture qui échoue rend `null` au lieu de tout emporter. */
async function sur<T>(p: PromiseLike<T>): Promise<T | null> {
  try { return await p; } catch { return null; }
}

/** Les faits d'hier, de la semaine et l'âge du compte, en une vague de
 *  petites lectures. Chacune peut échouer seule : le mot se compose alors
 *  sans elle, il ne l'invente jamais. */
export async function lireFaitsMot(sb: SB, userId: string, jour: string): Promise<FaitsMot> {
  const hier = shiftDateStr(jour, -1);
  const lundi = lundiDe(jour);
  const minuit = (d: string) => new Date(`${d}T00:00:00`).toISOString();
  const [seancesHier, repasHier, credits, seancesSemaine, repasSemaine, session] = await Promise.all([
    sur(sb.from("workout_sessions")
      .select("title, duration_minutes, elapsed_seconds")
      .eq("user_id", userId)
      .gte("started_at", minuit(hier))
      .lt("started_at", minuit(jour))
      .order("started_at", { ascending: false })
      .limit(5)),
    sur(sb.from("nutrition_logs").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("date", hier)),
    // `aura_mission_credits` est en RLS propriétaire : ce sont MES lignes.
    // Un jour validé = une séance OU un repas, la seule définition du produit.
    sur(sb.from("aura_mission_credits")
      .select("period_key")
      .eq("user_id", userId)
      .eq("period_type", "day")
      .in("mission_id", ["seance", "repas"])
      .gte("period_key", lundi)
      .lte("period_key", jour)),
    sur(sb.from("workout_sessions").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("started_at", minuit(lundi))),
    sur(sb.from("nutrition_logs").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("date", lundi).lte("date", jour)),
    sur(sb.auth.getSession()),
  ]);

  const lignes = seancesHier && !seancesHier.error ? (seancesHier.data ?? []) : null;
  const derniere = lignes?.[0] as { title?: string | null; duration_minutes?: number | null; elapsed_seconds?: number | null } | undefined;
  const hierLu = lignes && repasHier && !repasHier.error
    ? {
      seances: lignes.length,
      titre: derniere?.title?.trim() || null,
      minutes: derniere
        ? (derniere.elapsed_seconds ? Math.max(1, Math.round(derniere.elapsed_seconds / 60)) : (derniere.duration_minutes ?? null))
        : null,
      repas: repasHier.count ?? 0,
    }
    : null;

  const semaineLue = credits && !credits.error && seancesSemaine && !seancesSemaine.error && repasSemaine && !repasSemaine.error
    ? {
      lundi,
      valides: [...new Set((credits.data ?? []).map((r) => r.period_key as string))].sort(),
      seances: seancesSemaine.count ?? 0,
      repas: repasSemaine.count ?? 0,
    }
    : null;

  const creeLe = session?.data?.session?.user?.created_at;
  const ageCompte = creeLe ? ecart(parisDateStr(new Date(creeLe)), jour) : null;

  return { hier: hierLu, semaine: semaineLue, ageCompte };
}

/* ── Sur l'appareil : le mot du jour, et ce qui a déjà été dit ── */

type Stocke = {
  jour: string;
  moment: MomentAccueil | null;
  lu: boolean;
  /** Le choix du jour, gardé à la première ouverture. */
  choix?: ChoixMot;
  /** Le mini-défi du jour coché (sans EXP, sur cet appareil). */
  defi?: boolean;
};
const cle = (userId: string) => `vaiiya_mot_du_jour_${userId}`;
const cleHistorique = (userId: string) => `vaiiya_mot_historique_${userId}`;

function lire(userId: string): Stocke | null {
  try {
    const brut = localStorage.getItem(cle(userId));
    return brut ? (JSON.parse(brut) as Stocke) : null;
  } catch {
    return null;
  }
}

function ecrire(userId: string, v: Stocke) {
  try {
    localStorage.setItem(cle(userId), JSON.stringify(v));
  } catch {
    /* Stockage refusé : le mot reviendra marqué non lu, sans autre suite. */
  }
}

/** Le mot d'aujourd'hui, ou un mot neuf : celui d'un autre jour ne compte pas. */
function duJour(userId: string, jour: string): Stocke {
  const v = lire(userId);
  return v && v.jour === jour ? v : { jour, moment: null, lu: false };
}

/** Le mot d'AUJOURD'HUI : un mot d'un autre jour ne compte pas. */
export function lireMot(userId: string, jour: string): { moment: MomentAccueil | null; lu: boolean } {
  const v = lire(userId);
  return v && v.jour === jour ? { moment: v.moment ?? null, lu: !!v.lu } : { moment: null, lu: false };
}

/** `momentAccueil` ne se calcule qu'une fois par jour : on le garde pour
 *  le mot, qu'on peut ouvrir plus tard dans la journée. */
export function noterMomentDuJour(userId: string, jour: string, moment: MomentAccueil) {
  ecrire(userId, { ...duJour(userId, jour), moment });
}

export function marquerMotLu(userId: string, jour: string) {
  ecrire(userId, { ...duJour(userId, jour), lu: true });
}

export function lireChoixDuJour(userId: string, jour: string): ChoixMot | null {
  const v = lire(userId);
  return v && v.jour === jour && v.choix ? v.choix : null;
}

export function lireHistorique(userId: string): HistoriqueMot {
  try {
    const brut = localStorage.getItem(cleHistorique(userId));
    const v = brut ? (JSON.parse(brut) as Partial<HistoriqueMot>) : null;
    return {
      pieces: v?.pieces && typeof v.pieces === "object" ? v.pieces : {},
      familles: v?.familles && typeof v.familles === "object" ? v.familles : {},
    };
  } catch {
    return { pieces: {}, familles: {} };
  }
}

/** Garde le choix du jour et le note dans l'historique, une seule fois. */
export function noterChoixDuJour(userId: string, jour: string, choix: ChoixMot) {
  const v = duJour(userId, jour);
  if (v.choix) return;
  ecrire(userId, { ...v, choix });

  const h = lireHistorique(userId);
  if (choix.accroche && choix.accroche !== ACCROCHE_FLAMME) h.pieces[choix.accroche] = jour;
  if (choix.conseil) {
    if (choix.conseil.famille !== "semaine") h.pieces[choix.conseil.id] = jour;
    h.familles[jour] = choix.conseil.famille;
  }
  const garde = (d: string) => ecart(d, jour) <= GARDE_HISTORIQUE;
  const elague: HistoriqueMot = {
    pieces: Object.fromEntries(Object.entries(h.pieces).filter(([, d]) => garde(d))),
    familles: Object.fromEntries(Object.entries(h.familles).filter(([d]) => garde(d))) as HistoriqueMot["familles"],
  };
  try {
    localStorage.setItem(cleHistorique(userId), JSON.stringify(elague));
  } catch {
    /* Sans historique, le mot tourne quand même avec le jour. */
  }
}

export function defiFait(userId: string, jour: string): boolean {
  return !!duJour(userId, jour).defi;
}

/** Coche ou décoche le mini-défi du jour. Rend le nouvel état. */
export function basculerDefi(userId: string, jour: string): boolean {
  const v = duJour(userId, jour);
  const defi = !v.defi;
  ecrire(userId, { ...v, defi });
  return defi;
}
