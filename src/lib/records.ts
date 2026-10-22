import { createClient } from "@/lib/supabase";

/* ════════════════════════════════════════════════════════════════════
   LES RECORDS (maquette « Les records Vaiiya », GO de Louis le 2026-10-22).

   Un record est le meilleur chiffre qu'on a DÉCLARÉ sur un mouvement,
   lu dans le journal des séries (`series_realisees`). Rien n'est estimé,
   rien n'est recompté ailleurs : ce module est la seule règle.

   • Répétitions : le plus grand nombre d'affilée sur une série.
   • Charge : le plus lourd, puis, à charge égale, le plus de répétitions.
     Un mouvement où une charge a été notée se mesure à la charge.
   • Gainage : le plus long au chrono.

   ⚠️ Gratuit, sans EXP, et jamais comparé à quelqu'un d'autre : un record
   ne se mesure qu'à soi.
   ⚠️ La première valeur notée est une marche, pas un « nouveau record » :
   on ne fête que ce qui dépasse un record qui existait déjà.
   ════════════════════════════════════════════════════════════════════ */

export type MesureRecord = "reps" | "charge" | "duree";

/** Une ligne du journal, réduite à ce dont un record a besoin. */
export type LigneRecord = {
  seance: string;
  cle: string | null;
  nom: string;
  mesure: "reps" | "duree";
  reps: number | null;
  dureeS: number | null;
  charge: number | null;
  /** ISO. */
  quand: string;
};

/** Une performance : la valeur principale, et les répétitions pour une charge. */
export type Perf = { valeur: number; reps: number | null };

export type Marche = Perf & { quand: string };

export type RecordMouvement = {
  cle: string;
  nom: string;
  mesure: MesureRecord;
  meilleur: Marche;
  /** Chaque fois que le record a monté, dans l'ordre (la première valeur comprise). */
  marches: Marche[];
  /** Le nombre de séances où ce mouvement a été noté. */
  seances: number;
};

/** Le plancher d'un gainage chronométré : en dessous, c'est une série abrégée. */
const DUREE_MIN_S = 5;

/** `a` dépasse-t-il `b` ? */
export function depasse(mesure: MesureRecord, a: Perf, b: Perf): boolean {
  if (mesure === "charge") {
    if (a.valeur !== b.valeur) return a.valeur > b.valeur;
    return (a.reps ?? 0) > (b.reps ?? 0);
  }
  return a.valeur > b.valeur;
}

/** La performance d'une ligne, selon la mesure du mouvement. `null` = rien de déclaré. */
export function perfDe(mesure: MesureRecord, l: Pick<LigneRecord, "reps" | "dureeS" | "charge">): Perf | null {
  if (mesure === "charge") return l.charge && l.charge > 0 ? { valeur: l.charge, reps: l.reps } : null;
  if (mesure === "duree") return l.dureeS && l.dureeS >= DUREE_MIN_S ? { valeur: l.dureeS, reps: null } : null;
  return l.reps && l.reps > 0 ? { valeur: l.reps, reps: null } : null;
}

/** La mesure d'un mouvement, vue sur toutes ses lignes. */
function mesureDe(lignes: LigneRecord[]): MesureRecord {
  if (lignes.some((l) => (l.charge ?? 0) > 0)) return "charge";
  if (lignes.some((l) => l.mesure === "duree")) return "duree";
  return "reps";
}

/** La clé d'un mouvement : sa clé figée, sinon son nom. */
function cleDe(l: Pick<LigneRecord, "cle" | "nom">): string {
  return l.cle ?? `nom:${l.nom.trim().toLowerCase()}`;
}

/** Les records, du plus récemment battu au plus ancien. */
export function recordsDepuisLignes(lignes: LigneRecord[]): RecordMouvement[] {
  const parCle = new Map<string, LigneRecord[]>();
  for (const l of lignes) {
    const k = cleDe(l);
    const liste = parCle.get(k);
    if (liste) liste.push(l); else parCle.set(k, [l]);
  }
  const sortie: RecordMouvement[] = [];
  for (const [cle, ls] of parCle) {
    const mesure = mesureDe(ls);
    /* Le meilleur de chaque séance, puis les séances dans l'ordre. */
    const parSeance = new Map<string, Marche>();
    for (const l of ls) {
      const p = perfDe(mesure, l);
      if (!p) continue;
      const deja = parSeance.get(l.seance);
      if (!deja || depasse(mesure, p, deja)) parSeance.set(l.seance, { ...p, quand: l.quand });
    }
    const chrono = [...parSeance.values()].sort((a, b) => a.quand.localeCompare(b.quand));
    if (chrono.length === 0) continue;
    const marches: Marche[] = [];
    for (const m of chrono) {
      const dernier = marches[marches.length - 1];
      if (!dernier || depasse(mesure, m, dernier)) marches.push(m);
    }
    const plusRecente = [...ls].sort((a, b) => b.quand.localeCompare(a.quand))[0];
    sortie.push({
      cle, nom: plusRecente.nom, mesure,
      meilleur: marches[marches.length - 1], marches, seances: chrono.length,
    });
  }
  return sortie.sort((a, b) => b.meilleur.quand.localeCompare(a.meilleur.quand));
}

/** Les records indexés par clé de mouvement (pour le tunnel). */
export function recordsParCle(records: RecordMouvement[]): Map<string, RecordMouvement> {
  return new Map(records.map((r) => [r.cle, r]));
}

/** La clé sous laquelle chercher le record d'un mouvement. */
export function cleRecord(cle: string | null, nom: string): string {
  return cleDe({ cle, nom });
}

/**
 * Le record battu par une performance, s'il y en avait un. La première
 * fois qu'on note un mouvement, il n'y a rien à battre : on ne fête rien.
 */
export function recordBattu(record: RecordMouvement | undefined, perf: Perf | null): { avant: Marche; apres: Perf } | null {
  if (!record || !perf) return null;
  return depasse(record.mesure, perf, record.meilleur) ? { avant: record.meilleur, apres: perf } : null;
}

/* ── L'écriture d'une valeur ───────────────────────────────────── */

function nombreFr(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toLocaleString("fr-FR", { maximumFractionDigits: 1 });
}

/** « 1:30 » pour une durée, sinon le nombre. */
export function valeurRecord(mesure: MesureRecord, p: Perf): string {
  if (mesure === "duree") {
    const s = Math.round(p.valeur);
    return s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` : String(s);
  }
  return nombreFr(p.valeur);
}

/** L'unité écrite à côté du chiffre. */
export function uniteRecord(mesure: MesureRecord, p: Perf): string {
  if (mesure === "charge") return p.reps ? `kg × ${p.reps}` : "kg";
  if (mesure === "duree") return p.valeur >= 60 ? "min" : "s";
  return p.valeur > 1 ? "répétitions" : "répétition";
}

/** « 15 d'affilée », « 16 kg × 10 », « 1:30 min » : la valeur dans une phrase. */
export function texteRecord(mesure: MesureRecord, p: Perf): string {
  if (mesure === "reps") return `${valeurRecord(mesure, p)} d’affilée`;
  return `${valeurRecord(mesure, p)} ${uniteRecord(mesure, p)}`;
}

/** « 12 octobre ». */
export function dateRecord(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const texte = d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", timeZone: "Europe/Paris" });
  return texte.replace(/^1 /, "1er ");
}

/** « 12 oct. », pour les marches de l'escalier. */
export function dateCourte(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "Europe/Paris" });
}

/**
 * La phrase du chemin : ce qui a été gagné depuis la première marche.
 * `null` sur un record qui n'a encore qu'une marche.
 */
export function phraseChemin(r: RecordMouvement): string | null {
  if (r.marches.length < 2) return null;
  const premiere = r.marches[0];
  const quand = dateRecord(premiere.quand);
  const seances = `en ${r.seances} séance${r.seances > 1 ? "s" : ""}`;
  if (r.mesure === "charge") {
    const ecart = r.meilleur.valeur - premiere.valeur;
    if (ecart > 0) return `${nombreFr(ecart)} kg de plus qu’au ${quand}, ${seances}.`;
    const reps = (r.meilleur.reps ?? 0) - (premiere.reps ?? 0);
    return `${reps} répétition${reps > 1 ? "s" : ""} de plus à la même charge qu’au ${quand}, ${seances}.`;
  }
  if (r.mesure === "duree") {
    const ecart = Math.round(r.meilleur.valeur - premiere.valeur);
    return `${ecart} secondes de plus qu’au ${quand}, ${seances}.`;
  }
  const ecart = r.meilleur.valeur - premiere.valeur;
  return `${ecart} répétition${ecart > 1 ? "s" : ""} de plus qu’au ${quand}, ${seances}.`;
}

/** L'écart affiché sur la carte de fin : « +1 », « +2,5 ». */
export function ecartRecord(mesure: MesureRecord, avant: Perf, apres: Perf): string {
  if (mesure === "charge" && apres.valeur === avant.valeur) return `+${(apres.reps ?? 0) - (avant.reps ?? 0)}`;
  return `+${nombreFr(Math.round((apres.valeur - avant.valeur) * 10) / 10)}`;
}

/* ── La lecture ────────────────────────────────────────────────── */

type ClientLike = ReturnType<typeof createClient>;

/**
 * Toutes les lignes qui portent un chiffre déclaré. `cles` restreint aux
 * mouvements d'une séance. `null` = lecture ratée, jamais « aucun record ».
 */
export async function lireRecords(userId: string, cles?: string[], client?: ClientLike): Promise<RecordMouvement[] | null> {
  try {
    const supabase = client ?? createClient();
    let q = supabase
      .from("series_realisees")
      .select("workout_session_id, exercice_cle, exercice_nom, mesure, reps_declarees, duree_s, charge, created_at")
      .eq("user_id", userId)
      .eq("statut", "terminee")
      .or(`reps_declarees.not.is.null,charge.not.is.null,duree_s.gte.${DUREE_MIN_S}`)
      .order("created_at", { ascending: true })
      .limit(5000);
    if (cles && cles.length > 0) q = q.in("exercice_cle", [...new Set(cles)]);
    const { data, error } = await q;
    if (error) { console.warn("[records] illisibles :", error.message); return null; }
    const lignes: LigneRecord[] = (data ?? []).map((r) => ({
      seance: String(r.workout_session_id),
      cle: (r.exercice_cle ?? null) as string | null,
      nom: String(r.exercice_nom ?? ""),
      mesure: r.mesure === "duree" ? "duree" : "reps",
      reps: r.reps_declarees == null ? null : Number(r.reps_declarees),
      dureeS: r.duree_s == null ? null : Number(r.duree_s),
      charge: r.charge == null ? null : Number(r.charge),
      quand: String(r.created_at),
    }));
    return recordsDepuisLignes(lignes);
  } catch (e) {
    console.warn("[records] illisibles :", e);
    return null;
  }
}
