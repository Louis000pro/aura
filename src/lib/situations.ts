/* ════════════════════════════════════════════════════════════════════
   « EN CE MOMENT » · LES SITUATIONS (maquette « Entraînement repensé »,
   lot 2). PUR : aucune lecture, aucune écriture, aucune horloge.

   Ce que le planning sait de ta vie, pour une période :
   · moins de temps : chaque séance se raccourcit à N minutes (la règle
     de la version courte, `raccourcir`) ;
   · une gêne : les mouvements qui sollicitent l'endroit passent « à
     éviter », « plus léger » ou « sans changement » ; une séance qui
     garde moins de la moitié de ses mouvements se met en pause et les
     autres prennent sa place ;
   · moins d'énergie : chaque exercice perd une série ;
   · pas son matériel : les séances se composent pour un autre lieu ;
   · un événement (un match, une course) : la veille, une série de moins,
     et le jour même, pas de séance (l'événement est l'effort du jour) ;
   · un autre sport : ses jours de la semaine ne portent pas de séance ;
   · des jours qui changent pour un moment : d'autres jours de la semaine,
     le temps de la période, puis les jours choisis reviennent.
   Les trois derniers passent par le calendrier (`calendrierAvecSituations`) :
   ils ajoutent des jours retirés ou en plus, jamais écrits en base.
   L'absence a sa propre table (R9a) et ne passe pas par ici.

   ⚠️ UNE SITUATION NE MODIFIE JAMAIS LE PROGRAMME. Elle se lit au moment
   de préparer une séance ; à la date de fin, tout reprend sa forme sans
   une écriture. Une situation dont la fin est passée cesse d'agir à la
   lecture, même si sa ligne dit encore `active`.

   ⚠️ UN MOUVEMENT INCONNU N'EST JAMAIS ÉCARTÉ EN SILENCE NI GARDÉ EN
   SILENCE : il rejoint `inconnus`, et l'écran le dit.
   ════════════════════════════════════════════════════════════════════ */

import { sollicite } from "@/lib/zonesMouvements";
import type { Calendrier, ExceptionJour } from "@/lib/projection";

export type GenreSituation = "moins_de_temps" | "gene" | "energie" | "materiel" | "evenement" | "autre_sport" | "jours_moment";
export type EtatMouvement = "eviter" | "leger" | "garder";
export type ModeGene = "eviter" | "alleger" | "un";
export type LieuSituation = "poids" | "halteres";

export type ReglagesSituation =
  | { genre: "moins_de_temps"; minutes: number }
  | {
      genre: "gene";
      zones: string[];
      mode: ModeGene;
      /** « etapeId/nom du mouvement » → son état, quand on l'a choisi un par un. */
      choix?: Record<string, EtatMouvement>;
      /** etapeId → en pause (vrai) ou gardée malgré tout (faux). */
      pauses?: Record<string, boolean>;
    }
  | { genre: "energie"; mode: "leger" }
  | { genre: "materiel"; lieu: LieuSituation }
  /** Le jour de l'événement est la fin de la situation ; elle commence la veille. */
  | { genre: "evenement" }
  /** Les jours de la semaine pris par l'autre sport (1 = lundi). */
  | { genre: "autre_sport"; jours: number[] }
  /** Les jours d'entraînement le temps de la période (1 = lundi). */
  | { genre: "jours_moment"; jours: number[] };

export type Situation = {
  id: string;
  debut: string;
  fin: string;
  statut: "active" | "terminee";
  motif: string | null;
  reglages: ReglagesSituation;
};

export const MINUTES_MIN = 10;
export const MINUTES_MAX = 90;
/** « Je te dirai » : on refait le point dans quatre semaines. */
export const JOURS_REEVALUATION = 28;
export const JOURS_MAX = 120;

/** Des jours de la semaine propres : entiers de 1 à 7, sans doublon, triés. */
export function joursPropres(jours: unknown): number[] {
  if (!Array.isArray(jours)) return [];
  return [...new Set(jours.filter((j): j is number => Number.isInteger(j) && j >= 1 && j <= 7))].sort((a, b) => a - b);
}

/* ── Lecture ───────────────────────────────────────────────────────── */

/** Les situations qui agissent ce jour-là. La fin passée suffit à éteindre. */
export function situationsDuJour(liste: readonly Situation[], date: string): Situation[] {
  return liste.filter((s) => s.statut === "active" && s.debut <= date && date <= s.fin);
}

/** Les situations encore en cours ou à venir : ce que montrent les billets. */
export function situationsVisibles(liste: readonly Situation[], aujourdhui: string): Situation[] {
  return liste.filter((s) => s.statut === "active" && s.fin >= aujourdhui).sort((a, b) => a.debut.localeCompare(b.debut));
}

export function deGenre<G extends GenreSituation>(liste: readonly Situation[], genre: G): (Situation & { reglages: Extract<ReglagesSituation, { genre: G }> }) | null {
  return (liste.find((s) => s.reglages.genre === genre) as (Situation & { reglages: Extract<ReglagesSituation, { genre: G }> }) | undefined) ?? null;
}

/** Ce que la base rend → une situation, ou `null` si la forme est fausse
 *  (on ne devine pas un réglage). */
export function situationDeLigne(r: {
  id: string; genre: string; debut: string; fin: string; statut: string; motif: string | null; reglages: unknown;
}): Situation | null {
  const g = r.reglages as Record<string, unknown> | null;
  if (!g || typeof g !== "object") return null;
  const statut: Situation["statut"] | null = r.statut === "active" || r.statut === "terminee" ? r.statut : null;
  if (!statut) return null;
  const base = { id: r.id, debut: r.debut, fin: r.fin, statut, motif: r.motif };
  if (r.genre === "moins_de_temps" && typeof g.minutes === "number") return { ...base, reglages: { genre: "moins_de_temps", minutes: g.minutes } };
  if (r.genre === "energie" && g.mode === "leger") return { ...base, reglages: { genre: "energie", mode: "leger" } };
  if (r.genre === "materiel" && (g.lieu === "poids" || g.lieu === "halteres")) return { ...base, reglages: { genre: "materiel", lieu: g.lieu } };
  if (r.genre === "evenement") return { ...base, reglages: { genre: "evenement" } };
  if ((r.genre === "autre_sport" || r.genre === "jours_moment") && joursPropres(g.jours).length) {
    return { ...base, reglages: { genre: r.genre, jours: joursPropres(g.jours) } };
  }
  if (r.genre === "gene" && Array.isArray(g.zones) && (g.mode === "eviter" || g.mode === "alleger" || g.mode === "un")) {
    return {
      ...base,
      reglages: {
        genre: "gene", zones: g.zones.filter((z): z is string => typeof z === "string"), mode: g.mode,
        choix: (g.choix && typeof g.choix === "object" ? g.choix : {}) as Record<string, EtatMouvement>,
        pauses: (g.pauses && typeof g.pauses === "object" ? g.pauses : {}) as Record<string, boolean>,
      },
    };
  }
  return null;
}

/** Ce qui s'écrit en base : `reglages` sans le genre, que porte sa colonne. */
export function reglagesPourBase(r: ReglagesSituation): Record<string, unknown> {
  const { genre: _genre, ...reste } = r;
  void _genre;
  return reste;
}

/* ── Une gêne ──────────────────────────────────────────────────────── */

/** L'état d'un mouvement face à une gêne. `null` = je ne sais pas ce qu'il sollicite. */
export function etatMouvement(nom: string, etapeId: string | null, g: Extract<ReglagesSituation, { genre: "gene" }>): EtatMouvement | null {
  const touche = sollicite(nom, g.zones);
  if (touche === null) return null;
  if (!touche) return "garder";
  const choisi = etapeId ? g.choix?.[`${etapeId}/${nom}`] : undefined;
  if (choisi) return choisi;
  return g.mode === "alleger" ? "leger" : "eviter";
}

export type SeancePourGene = { id: string; nom: string; exercices: string[] };
export type EffetSeance = {
  id: string;
  nom: string;
  total: number;
  touches: { nom: string; etat: EtatMouvement }[];
  inconnus: string[];
  evites: number;
  legers: number;
  /** Ce qu'il reste à faire (les évités retirés). */
  reste: number;
  pause: boolean;
};

/**
 * Ce qu'une gêne change, séance par séance. Une séance qui garde moins de
 * la moitié de ses mouvements se met en pause (on peut la garder quand
 * même : `pauses[id] = false`) ; une séance sans aucun mouvement restant
 * est toujours en pause.
 */
export function effetGene(seances: readonly SeancePourGene[], g: Extract<ReglagesSituation, { genre: "gene" }>): EffetSeance[] {
  return seances.map((s) => {
    const touches: EffetSeance["touches"] = [];
    const inconnus: string[] = [];
    for (const nom of s.exercices) {
      const e = etatMouvement(nom, s.id, g);
      if (e === null) inconnus.push(nom);
      else if (e !== "garder" || sollicite(nom, g.zones)) touches.push({ nom, etat: e });
    }
    const evites = touches.filter((t) => t.etat === "eviter").length;
    const legers = touches.filter((t) => t.etat === "leger").length;
    const total = s.exercices.length;
    const reste = total - evites;
    const choisie = g.pauses?.[s.id];
    const pause = evites > 0 && (reste === 0 || (choisie ?? reste * 2 < total));
    return { id: s.id, nom: s.nom, total, touches, inconnus, evites, legers, reste, pause };
  });
}

/** Les pauses à écrire : celles que la règle décide, plus les choix faits à la main. */
export function pausesDecidees(effet: readonly EffetSeance[]): Record<string, boolean> {
  return Object.fromEntries(effet.filter((x) => x.evites > 0).map((x) => [x.id, x.pause]));
}

/** Les étapes mises en pause par une gêne ce jour-là. */
export function etapesEnPause(liste: readonly Situation[], date: string): Set<string> {
  const ids = new Set<string>();
  for (const s of situationsDuJour(liste, date)) {
    if (s.reglages.genre !== "gene") continue;
    for (const [id, p] of Object.entries(s.reglages.pauses ?? {})) if (p) ids.add(id);
  }
  return ids;
}

/* ── Appliquer à une séance qu'on lance ────────────────────────────── */

export type Appliquee<T> = {
  liste: T[];
  /** La durée visée (moins de temps), à passer à `raccourcir`. */
  minutes: number | null;
  /** Ce qui a changé, pour le dire. */
  notes: string[];
};

/**
 * Applique les situations du jour à une liste d'exercices. Générique : la
 * même règle sert pour une séance écrite (`name`, `sets`) et pour une
 * prescription (`exercice_nom`, `series`).
 *
 * ⚠️ ON NE RETIRE JAMAIS TOUT. Si une gêne écartait tous les mouvements,
 * la séance serait en pause et ne se lancerait pas d'ici ; par prudence,
 * une liste qui deviendrait vide est rendue telle quelle avec une note.
 */
export function appliquerSituations<T>(
  liste: readonly T[],
  situations: readonly Situation[],
  date: string,
  etapeId: string | null,
  acces: { nom: (x: T) => string; series: (x: T) => number; avecSeries: (x: T, n: number) => T },
): Appliquee<T> {
  const actives = situationsDuJour(situations, date);
  const notes: string[] = [];
  let sortie: T[] = [...liste];
  const gene = deGenre(actives, "gene");
  if (gene) {
    const gardes: T[] = [];
    let evites = 0, legers = 0;
    for (const x of sortie) {
      const e = etatMouvement(acces.nom(x), etapeId, gene.reglages);
      if (e === "eviter") { evites++; continue; }
      if (e === "leger" && acces.series(x) > 1) { legers++; gardes.push(acces.avecSeries(x, acces.series(x) - 1)); continue; }
      gardes.push(x);
    }
    if (gardes.length > 0) {
      sortie = gardes;
      if (evites) notes.push(`${evites} mouvement${evites > 1 ? "s" : ""} écarté${evites > 1 ? "s" : ""} pour ta gêne`);
      if (legers) notes.push(`${legers} mouvement${legers > 1 ? "s" : ""} en plus léger`);
    } else {
      notes.push("Tous les mouvements sollicitent l’endroit qui te gêne : vas-y doucement");
    }
  }
  /* La veille d'un événement : une série de moins. Jamais deux de moins si
     l'énergie en retire déjà une. */
  const veille = actives.some((x) => x.reglages.genre === "evenement" && date < x.fin);
  if (deGenre(actives, "energie") || veille) {
    sortie = sortie.map((x) => (acces.series(x) > 1 ? acces.avecSeries(x, acces.series(x) - 1) : x));
    notes.push(deGenre(actives, "energie") ? "Une série de moins par exercice" : "Une série de moins, la veille de ton événement");
  }
  const temps = deGenre(actives, "moins_de_temps");
  return { liste: sortie, minutes: temps ? temps.reglages.minutes : null, notes };
}

/** Le lieu imposé ce jour-là par « pas mon matériel », ou `null`. */
export function lieuDuJour(liste: readonly Situation[], date: string): LieuSituation | null {
  const m = deGenre(situationsDuJour(liste, date), "materiel");
  return m ? m.reglages.lieu : null;
}

/* ── Le calendrier ───────────────────────────────────────────────── */

function jourDe(date: string): number {
  const d = new Date(`${date}T00:00:00Z`).getUTCDay();
  return d === 0 ? 7 : d;
}
function lendemain(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}
function joursEntre(debut: string, fin: string): string[] {
  const out: string[] = [];
  for (let d = debut; d <= fin && out.length <= JOURS_MAX + 1; d = lendemain(d)) out.push(d);
  return out;
}

/**
 * Le calendrier vu à travers les situations : le jour d'un événement et
 * les jours d'un autre sport deviennent des jours sans séance, et des
 * jours qui changent remplacent la règle le temps de la période.
 *
 * ⚠️ UNE EXCEPTION ÉCRITE PAR LA PERSONNE L'EMPORTE TOUJOURS : on ne
 * pose rien sur un jour qui en porte déjà une. Rien ne s'écrit en base.
 */
export function calendrierAvecSituations(cal: Calendrier, situations: readonly Situation[]): Calendrier {
  const actives = situations.filter((s) => s.statut === "active");
  if (!actives.some((s) => s.reglages.genre === "evenement" || s.reglages.genre === "autre_sport" || s.reglages.genre === "jours_moment")) return cal;
  const posees = new Map<string, ExceptionJour>();
  for (const e of cal.exceptions) posees.set(e.date, e);
  const ajouts = new Map<string, ExceptionJour["genre"]>();
  const regle = joursPropres(cal.jours);
  /* Les jours qui changent d'abord : un événement ou un autre sport
     retirent ensuite un jour, quelle que soit la règle du moment. */
  for (const s of actives) {
    if (s.reglages.genre !== "jours_moment") continue;
    const nouveaux = s.reglages.jours;
    for (const d of joursEntre(s.debut, s.fin)) {
      const j = jourDe(d);
      const avant = regle.includes(j) && !(cal.effetLe && d < cal.effetLe);
      const apres = nouveaux.includes(j);
      if (avant && !apres) ajouts.set(d, "pas_de_seance");
      else if (!avant && apres) ajouts.set(d, "seance_en_plus");
    }
  }
  for (const s of actives) {
    const r = s.reglages;
    if (r.genre === "evenement") ajouts.set(s.fin, "pas_de_seance");
    else if (r.genre === "autre_sport") {
      for (const d of joursEntre(s.debut, s.fin)) if (r.jours.includes(jourDe(d))) ajouts.set(d, "pas_de_seance");
    }
  }
  const exceptions = [...cal.exceptions];
  for (const [date, genre] of ajouts) if (!posees.has(date)) exceptions.push({ date, genre, parSituation: true });
  return { ...cal, exceptions };
}

/* ── Les mots ─────────────────────────────────────────────────────── */

const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
export function dateCourte(d: string): string {
  return `${Number(d.slice(8, 10))} ${MOIS[Number(d.slice(5, 7)) - 1]}`;
}
export function periode(s: Pick<Situation, "debut" | "fin">, aujourdhui: string): string {
  if (s.debut <= aujourdhui) return `jusqu’au ${dateCourte(s.fin)}`;
  return s.debut === s.fin ? `le ${dateCourte(s.debut)}` : `du ${dateCourte(s.debut)} au ${dateCourte(s.fin)}`;
}

export const TITRE: Record<GenreSituation, string> = {
  moins_de_temps: "Moins de temps",
  gene: "Une gêne",
  energie: "Moins d’énergie",
  materiel: "Sans mon matériel",
  evenement: "Un événement",
  autre_sport: "Un autre sport",
  jours_moment: "D’autres jours",
};

const NOMS_JOURS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];
/** « le mardi et le jeudi », « le samedi ». */
export function lesJours(jours: readonly number[]): string {
  const n = joursPropres(jours).map((j) => NOMS_JOURS[j - 1]);
  if (n.length <= 1) return n.length ? `le ${n[0]}` : "aucun jour";
  return `le ${n.slice(0, -1).join(", le ")} et le ${n[n.length - 1]}`;
}

/** Ce que la situation change, en quelques mots (le billet). */
export function effetCourt(s: Situation, nomsEtapes: (id: string) => string | null): string {
  const r = s.reglages;
  switch (r.genre) {
    case "moins_de_temps": return `séances à ${r.minutes} min`;
    case "energie": return "une série de moins par exercice";
    case "materiel": return r.lieu === "halteres" ? "séances aux haltères" : "séances sans matériel";
    case "evenement": return `le ${dateCourte(s.fin)}, pas de séance`;
    case "autre_sport": return `pas de séance ${lesJours(r.jours)}`;
    case "jours_moment": return `séances ${lesJours(r.jours)}`;
    case "gene": {
      const pauses = Object.entries(r.pauses ?? {}).filter(([, p]) => p).map(([id]) => nomsEtapes(id)).filter((n): n is string => !!n);
      const base = r.mode === "alleger" ? "mouvements allégés" : "mouvements écartés";
      return pauses.length === 0 ? base : pauses.length === 1 ? `${pauses[0]} en pause, ${base}` : `${pauses.length} séances en pause, ${base}`;
    }
  }
}

/** Le nom d'une gêne : la zone, ou « 2 endroits ». */
export function nomGene(zones: readonly string[]): string {
  return zones.length === 1 ? zones[0] : `${zones.length} endroits`;
}
