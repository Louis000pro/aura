/* ════════════════════════════════════════════════════════════════════
   vueProgres.ts · ce que la vue Progrès calcule (lot 4, maquette
   « Entraînement repensé », GO de Louis le 2026-11-18).

   Pur : aucune lecture, aucune horloge, aucun DOM. Le jour d'aujourd'hui
   et les séances arrivent en arguments, donc tout se vérifie hors ligne
   (`check:programme`, bloc « Lot 4 »).

   Trois choses :
   - « Depuis le … » : une barre par semaine depuis l'inscription, et une
     phrase qui compte ce qui a été FAIT (jamais un pourcentage, jamais ce
     qui manque) ;
   - « Avant, maintenant » : la première valeur notée d'un mouvement et son
     record d'aujourd'hui (les records viennent de `records.ts`) ;
   - le bilan d'une semaine, calculé sans IA : séances, temps, jours, ce
     qui a progressé, ce qui a bougé, la semaine qui vient.

   ⚠️ Les semaines vont du lundi au dimanche, en jours LOCAUX (comme le
   planning). Une séance faite à 23 h reste dans son jour.
   ⚠️ Une semaine sans séance est un point discret : on ne la colorie pas,
   on ne la commente pas.
   ════════════════════════════════════════════════════════════════════ */

import { texteRecord, valeurRecord, type Marche, type RecordMouvement } from "./records";

/* ── Les dates, en chaînes YYYY-MM-DD ──────────────────────────── */

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const JOURS_COURTS = ["lun", "mar", "mer", "jeu", "ven", "sam", "dim"];

const dt = (s: string) => new Date(s + "T12:00:00Z");
const iso = (d: Date) => d.toISOString().slice(0, 10);

export function plusJours(s: string, n: number): string {
  const d = dt(s);
  d.setUTCDate(d.getUTCDate() + n);
  return iso(d);
}

/** Le lundi de la semaine d'un jour. */
export function lundiDe(s: string): string {
  const j = dt(s).getUTCDay(); // 0 = dimanche
  return plusJours(s, j === 0 ? -6 : 1 - j);
}

/** Le jour local d'un horodatage. */
export function jourLocal(isoDate: string): string {
  const d = new Date(isoDate);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** « 6 mai », « 1er novembre ». */
export function dateLongue(s: string): string {
  const d = dt(s);
  const n = d.getUTCDate();
  return `${n === 1 ? "1er" : n} ${MOIS[d.getUTCMonth()]}`;
}

/** « mai ». */
export function moisDe(s: string): string {
  return MOIS[dt(s).getUTCMonth()];
}

/** « du 2 au 8 novembre », « du 26 octobre au 1er novembre ». */
export function texteSemaine(lundi: string): string {
  const dim = plusJours(lundi, 6);
  const memeMois = dt(lundi).getUTCMonth() === dt(dim).getUTCMonth();
  const n = dt(lundi).getUTCDate();
  const debut = memeMois ? (n === 1 ? "1er" : String(n)) : dateLongue(lundi);
  return `du ${debut} au ${dateLongue(dim)}`;
}

/** « 45 min », « 3 h 05 ». */
export function texteDuree(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")}`;
}

/* ── Les séances faites ────────────────────────────────────────── */

export type SeanceFaite = {
  /** Le jour local (YYYY-MM-DD). */
  jour: string;
  minutes: number;
};

/** Une ligne de `workout_sessions` devenue une séance faite. `null` sans date. */
export function seanceDeLigne(r: { started_at?: string | null; elapsed_seconds?: number | null; duration_minutes?: number | null }): SeanceFaite | null {
  if (!r.started_at) return null;
  const minutes = r.elapsed_seconds ? Math.max(1, Math.round(r.elapsed_seconds / 60)) : Math.max(0, r.duration_minutes ?? 0);
  return { jour: jourLocal(r.started_at), minutes };
}

/* ── « Depuis le … » ───────────────────────────────────────────── */

export type Semaine = { lundi: string; seances: number; minutes: number };

/** Le relief ne montre jamais plus d'un an : au-delà, une barre fait moins d'un pixel. */
export const SEMAINES_MAX_RELIEF = 52;

/**
 * Une semaine par semaine depuis celle de l'inscription jusqu'à celle
 * d'aujourd'hui, comprises. Une séance d'avant l'inscription (import, test)
 * compte dans la première semaine.
 */
export function semainesDepuis(inscritLe: string, aujourdhui: string, seances: readonly SeanceFaite[]): Semaine[] {
  const premier = lundiDe(inscritLe <= aujourdhui ? inscritLe : aujourdhui);
  const dernier = lundiDe(aujourdhui);
  const semaines: Semaine[] = [];
  const index = new Map<string, Semaine>();
  for (let l = premier; l <= dernier; l = plusJours(l, 7)) {
    const s = { lundi: l, seances: 0, minutes: 0 };
    semaines.push(s);
    index.set(l, s);
  }
  for (const f of seances) {
    if (f.jour > plusJours(dernier, 6)) continue;
    const l = lundiDe(f.jour);
    const s = index.get(l < premier ? premier : l);
    if (!s) continue;
    s.seances += 1;
    s.minutes += f.minutes;
  }
  return semaines;
}

export type ResumeDepuis = {
  semaines: number;
  seances: number;
  minutes: number;
  /** Semaines avec au moins une séance. */
  actives: number;
  /** Semaines actives d'affilée, en finissant par la plus récente. La
   *  semaine en cours ne casse rien tant qu'elle n'a pas de séance. */
  suite: number;
};

export function resumeDepuis(semaines: readonly Semaine[]): ResumeDepuis {
  let seances = 0, minutes = 0, actives = 0;
  for (const s of semaines) { seances += s.seances; minutes += s.minutes; if (s.seances > 0) actives += 1; }
  let i = semaines.length - 1;
  if (i >= 0 && semaines[i].seances === 0) i -= 1;
  let suite = 0;
  for (; i >= 0 && semaines[i].seances > 0; i--) suite += 1;
  return { semaines: semaines.length, seances, minutes, actives, suite };
}

function heures(minutes: number): string {
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? "s" : ""}`;
  const h = Math.round(minutes / 60);
  return `${h} heure${h > 1 ? "s" : ""}`;
}

/**
 * La phrase sous le relief. Elle compte ce qui a été fait, jamais ce qui
 * manque. Les nombres sont marqués ⟦n⟧ pour l'écran (visage du chiffre).
 */
export function phraseDepuis(r: ResumeDepuis): string {
  if (r.seances === 0) return "Ta première séance s’affichera ici, sur la semaine où tu la fais.";
  const seances = `⟦${r.seances}⟧ séance${r.seances > 1 ? "s" : ""}`;
  const temps = r.minutes > 0 ? `, ${heures(r.minutes).replace(/^(\d+)/, "⟦$1⟧")}` : "";
  if (r.semaines <= 1) return `${seances}${temps} cette semaine.`;
  const tete = `${seances}${temps}.`;
  if (r.actives === r.semaines) return `${tete} Au moins une séance chaque semaine, depuis le début.`;
  const base = `${tete} Au moins une séance ⟦${r.actives}⟧ semaine${r.actives > 1 ? "s" : ""} sur ⟦${r.semaines}⟧`;
  if (r.suite >= 2) return `${base}, dont les ⟦${r.suite}⟧ dernières d’affilée.`;
  return `${base}.`;
}

/** Une barre du relief : sa hauteur (0 à 1), vide ou non, en cours ou non. */
export type Barre = { lundi: string; part: number; vide: boolean; enCours: boolean };

/**
 * Le relief : au plus un an de barres, la plus haute semaine fait toute la
 * hauteur (au moins quatre séances, pour qu'une seule séance ne remplisse
 * pas le cadre).
 */
export function barresRelief(semaines: readonly Semaine[], aujourdhui: string): Barre[] {
  const vues = semaines.slice(-SEMAINES_MAX_RELIEF);
  const max = Math.max(4, ...vues.map((s) => s.seances));
  const encours = lundiDe(aujourdhui);
  return vues.map((s) => ({ lundi: s.lundi, part: s.seances / max, vide: s.seances === 0, enCours: s.lundi === encours }));
}

/** Où tombe un jour sur le relief, de 0 à 1 (`null` s'il en sort). */
export function positionSurRelief(barres: readonly Barre[], jour: string): number | null {
  if (barres.length < 2) return null;
  const l = lundiDe(jour);
  const i = barres.findIndex((b) => b.lundi === l);
  if (i <= 0) return null;
  return i / barres.length;
}

/* ── « Avant, maintenant » ─────────────────────────────────────── */

export type AvantMaintenant = {
  record: RecordMouvement;
  /** `null` tant qu'il n'y a qu'une valeur notée. */
  avant: Marche | null;
  maintenant: Marche;
};

/**
 * Les mouvements qui ont monté d'abord (le plus récent record en tête),
 * puis ceux qui n'ont qu'une valeur.
 */
export function avantMaintenant(records: readonly RecordMouvement[]): AvantMaintenant[] {
  const lignes = records.map((r) => ({ record: r, avant: r.marches.length > 1 ? r.marches[0] : null, maintenant: r.meilleur }));
  return lignes.sort((a, b) => {
    if (!!a.avant !== !!b.avant) return a.avant ? -1 : 1;
    return b.maintenant.quand.localeCompare(a.maintenant.quand);
  });
}

/** Le mois de la plus ancienne première valeur, pour « depuis août ». */
export function depuisQuand(lignes: readonly AvantMaintenant[]): string | null {
  const premieres = lignes.filter((l) => l.avant).map((l) => l.avant!.quand).sort();
  return premieres.length ? moisDe(jourLocal(premieres[0])) : null;
}

/** L'unité sous le chiffre : « d'affilée », « kg, 5 répétitions », « tenu ». */
export function uniteAvantMaintenant(r: RecordMouvement): string {
  if (r.mesure === "reps") return "d’affilée";
  if (r.mesure === "duree") return "tenu";
  const reps = r.meilleur.reps;
  return reps ? `kg, ${reps} répétition${reps > 1 ? "s" : ""}` : "kg";
}

/* ── Le bilan d'une semaine ────────────────────────────────────── */

/**
 * La semaine que le bilan raconte : celle qui finit aujourd'hui le
 * dimanche (le bilan du dimanche), sinon la dernière semaine finie.
 */
export function semaineDuBilan(aujourdhui: string): string {
  const l = lundiDe(aujourdhui);
  return dt(aujourdhui).getUTCDay() === 0 ? l : plusJours(l, -7);
}

export type LigneProgres = { record: RecordMouvement; avant: Marche; apres: Marche };

/** Les records montés pendant la semaine : la valeur d'avant, la dernière de la semaine. */
export function progresDeLaSemaine(records: readonly RecordMouvement[], lundi: string): LigneProgres[] {
  const fin = plusJours(lundi, 7);
  const lignes: LigneProgres[] = [];
  for (const r of records) {
    const idx = r.marches.map((m, i) => ({ m, i })).filter(({ m, i }) => i > 0 && jourLocal(m.quand) >= lundi && jourLocal(m.quand) < fin);
    if (idx.length === 0) continue;
    lignes.push({ record: r, avant: r.marches[idx[0].i - 1], apres: idx[idx.length - 1].m });
  }
  return lignes.sort((a, b) => b.apres.quand.localeCompare(a.apres.quand));
}

/** « Tractions : 7 puis 8 d'affilée ». */
export function texteProgres(l: LigneProgres): { avant: string; apres: string } {
  return { avant: `${l.record.nom} : ${valeurRecord(l.record.mesure, l.avant)} puis `, apres: texteRecord(l.record.mesure, l.apres) };
}

export type ChangementSemaine = { texte: string; auteur: string };

export type Bilan = {
  lundi: string;
  seances: number;
  minutes: number;
  /** `null` quand rien n'était posé : on ne dit pas « sur 0 ». */
  prevues: number | null;
  /** Lundi à dimanche : une séance faite ce jour-là ? */
  jours: boolean[];
  progres: LigneProgres[];
  changements: ChangementSemaine[];
};

export function bilanSemaine(a: {
  lundi: string;
  seances: readonly SeanceFaite[];
  prevues: number;
  records: readonly RecordMouvement[];
  changements: readonly ChangementSemaine[];
}): Bilan {
  const fin = plusJours(a.lundi, 7);
  const dans = a.seances.filter((s) => s.jour >= a.lundi && s.jour < fin);
  const jours = Array.from({ length: 7 }, (_, i) => dans.some((s) => s.jour === plusJours(a.lundi, i)));
  return {
    lundi: a.lundi,
    seances: dans.length,
    minutes: dans.reduce((t, s) => t + s.minutes, 0),
    prevues: a.prevues > 0 ? a.prevues : null,
    jours,
    progres: progresDeLaSemaine(a.records, a.lundi),
    changements: [...a.changements],
  };
}

export { JOURS_COURTS };

/** Le grand chiffre du bilan : « séances sur 4 prévues », ou « séances ». */
export function libelleSeances(b: Bilan): string {
  const s = b.seances > 1 ? "séances" : "séance";
  if (b.prevues !== null && b.prevues >= b.seances) return `${s} sur ${b.prevues} prévue${b.prevues > 1 ? "s" : ""}`;
  return s;
}

/** La ligne de la carte : « 4 séances sur 4 », « 2 séances », « Une semaine calme ». */
export function titreBilan(b: Bilan): string {
  if (b.seances === 0) return "Une semaine calme";
  const s = `${b.seances} séance${b.seances > 1 ? "s" : ""}`;
  if (b.prevues !== null && b.prevues >= b.seances) return `${s} sur ${b.prevues}`;
  return s;
}

/** La seconde ligne de la carte : le premier progrès, sinon le temps. */
export function sousTitreBilan(b: Bilan): string {
  if (b.progres.length === 1) return `Un palier de plus : ${b.progres[0].record.nom.toLowerCase()}`;
  if (b.progres.length > 1) return `${b.progres.length} paliers de plus`;
  if (b.seances > 0) return texteDuree(b.minutes);
  return "Tout reprend quand tu veux";
}

/** La clé de la phrase du Guide (`bilan.*` dans `guides.ts`). */
export type CleBilan = "bilan.toutes" | "bilan.progres" | "bilan.seances" | "bilan.calme";

export function cleBilan(b: Bilan): CleBilan {
  if (b.seances === 0) return "bilan.calme";
  if (b.prevues !== null && b.seances >= b.prevues) return "bilan.toutes";
  if (b.progres.length > 0) return "bilan.progres";
  return "bilan.seances";
}

/** Les mots d'un nombre jusqu'à sept, au-delà le chiffre. */
export function enLettres(n: number): string {
  const L = ["zéro", "une", "deux", "trois", "quatre", "cinq", "six", "sept"];
  return n >= 0 && n < L.length ? L[n] : String(n);
}
