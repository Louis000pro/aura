// ============================================================
// LA SAISON — règles & types du système communauté
// (duel de camps, éclats, rangs, exploits, vagues fondateur)
//
// ⚠️ Zéro interface ici : ce fichier est la MACHINE. Les écrans
// (QG, fil, cérémonie, progression, finale) ne sont que des
// habillages par-dessus — on doit pouvoir les redessiner sans
// toucher à ce fichier. Tables : supabase/migrations/
// 20260718_communaute_saison.sql.
// ============================================================

// ── Types (miroir des tables) ───────────────────────────────

export type CampKey = "a" | "b";

export interface Season {
  id: string;
  scope: "global" | "circle";
  circle_id: string | null;
  name: string;
  camp_a_name: string;
  camp_a_emblem: string;
  camp_b_name: string;
  camp_b_emblem: string;
  starts_on: string; // date ISO (yyyy-mm-dd)
  ends_on: string;   // inclus
  winner: CampKey | "draw" | null;
}

export interface SeasonScore {
  season_id: string;
  camp: CampKey;
  points: number;
  members: number;
}

export interface Exploit {
  id: string;
  scope: "global" | "circle";
  circle_id: string | null;
  title: string;
  badge_name: string;
  badge_emoji: string;
  reward_eclats: number;
  starts_on: string;
  ends_on: string;
}

export interface Circle {
  id: string;
  name: string;
  emoji: string;
  owner_id: string;
}

export type CommunityEventType =
  | "duel_lead"     // le duel bascule
  | "rank_up"       // promotion de rang
  | "streak"        // série de jours
  | "exploit_done"  // exploit réussi
  | "season_start"
  | "season_end";

export interface CommunityEvent {
  id: string;
  type: CommunityEventType;
  actor_id: string | null;
  season_id: string | null;
  payload: Record<string, unknown>;
  created_at: string;
}

// ── L'éclat : combien rapporte quoi ─────────────────────────
// La CONSTANCE, jamais le corps ni la perf. Un exploit paie
// plus qu'une séance mais moins que deux : on ne farme pas.

export const ECLATS = {
  seance: 35,        // séance terminée
  serieJour: 15,     // bonus par jour de série à partir du 3e consécutif
  duelGagne: 100,    // ton camp remporte la saison
} as const;

// ── Les 6 rangs ─────────────────────────────────────────────
// Seuils pensés pour un mois : ~3 séances/sem ≈ Or,
// ~4-5/sem + exploits ≈ Diamant, Étincelle = le mois parfait.

export interface Rank {
  key: "bronze" | "argent" | "or" | "platine" | "diamant" | "etincelle";
  name: string;
  numeral: string;   // affiché dans l'hexagone
  min: number;       // éclats requis
}

export const RANKS: Rank[] = [
  { key: "bronze",    name: "Bronze",    numeral: "I",   min: 0 },
  { key: "argent",    name: "Argent",    numeral: "II",  min: 200 },
  { key: "or",        name: "Or",        numeral: "III", min: 450 },
  { key: "platine",   name: "Platine",   numeral: "IV",  min: 750 },
  { key: "diamant",   name: "Diamant",   numeral: "V",   min: 1100 },
  { key: "etincelle", name: "Étincelle", numeral: "✦",  min: 1500 },
];

/** Rang atteint pour un total d'éclats. */
export function rankFor(eclats: number): Rank {
  let r = RANKS[0];
  for (const rank of RANKS) if (eclats >= rank.min) r = rank;
  return r;
}

/** Prochain rang (null si Étincelle) et éclats restants. */
export function nextRank(eclats: number): { rank: Rank; missing: number } | null {
  const next = RANKS.find((r) => r.min > eclats);
  return next ? { rank: next, missing: next.min - eclats } : null;
}

/** Progression 0→1 dans le palier courant (pour la barre d'XP). */
export function rankProgress(eclats: number): number {
  const cur = rankFor(eclats);
  const next = RANKS.find((r) => r.min > eclats);
  if (!next) return 1;
  return Math.min(1, Math.max(0, (eclats - cur.min) / (next.min - cur.min)));
}

// Reset doux : au début d'une nouvelle saison globale, tout le
// monde repart au seuil d'Argent (jamais plus bas), le meilleur
// rang atteint reste gravé côté profil.
export const SOFT_RESET_ECLATS = RANKS[1].min;

// ── Vagues fondateur ────────────────────────────────────────

export interface FounderWave {
  name: string;
  maxMember: number; // numéro de membre maximum inclus
  emoji: string;
}

export const FOUNDER_WAVES: FounderWave[] = [
  { name: "Fondateur", maxMember: 100,  emoji: "✦" },
  { name: "Pionnier",  maxMember: 500,  emoji: "🌅" },
  { name: "Éclaireur", maxMember: 2000, emoji: "🧭" },
];

export function founderWave(memberNumber: number | null | undefined): FounderWave | null {
  if (!memberNumber || memberNumber < 1) return null;
  return FOUNDER_WAVES.find((w) => memberNumber <= w.maxMember) ?? null;
}

// ── Helpers de saison ───────────────────────────────────────

/** La saison couvre-t-elle cette date ? (bornes incluses) */
export function seasonIsActive(s: Season, now: Date = new Date()): boolean {
  const day = now.toISOString().slice(0, 10);
  return s.starts_on <= day && day <= s.ends_on;
}

/** Jours restants (0 = dernier jour). */
export function seasonDaysLeft(s: Season, now: Date = new Date()): number {
  const end = new Date(s.ends_on + "T23:59:59");
  return Math.max(0, Math.floor((end.getTime() - now.getTime()) / 86_400_000));
}

export function campName(s: Season, camp: CampKey): string {
  return camp === "a" ? s.camp_a_name : s.camp_b_name;
}
export function campEmblem(s: Season, camp: CampKey): string {
  return camp === "a" ? s.camp_a_emblem : s.camp_b_emblem;
}

/** Camp en tête (null si égalité) — sert aussi à détecter une bascule. */
export function leadingCamp(scores: SeasonScore[]): CampKey | null {
  const a = scores.find((x) => x.camp === "a")?.points ?? 0;
  const b = scores.find((x) => x.camp === "b")?.points ?? 0;
  if (a === b) return null;
  return a > b ? "a" : "b";
}

// ── Le vivier de camps ──────────────────────────────────────
// Chaque saison oppose 2 NOUVELLES équipes (rééquilibrage
// naturel). Ton : astral ou élémentaire, jamais lié à des
// mouvements. Sert de suggestion à l'admin et aux duels de
// cercle — libre d'inventer d'autres paires.

export interface CampPair {
  a: { name: string; emblem: string };
  b: { name: string; emblem: string };
}

export const CAMP_PAIRS: CampPair[] = [
  { a: { name: "Solaire",  emblem: "☀" },  b: { name: "Lunaire", emblem: "☾" } },
  { a: { name: "Braise",   emblem: "🔥" }, b: { name: "Marée",   emblem: "🌊" } },
  { a: { name: "Tonnerre", emblem: "⚡" }, b: { name: "Givre",   emblem: "❄" } },
  { a: { name: "Aurore",   emblem: "🌅" }, b: { name: "Comète",  emblem: "☄️" } },
  { a: { name: "Roc",      emblem: "⛰" },  b: { name: "Sève",    emblem: "🌿" } },
];
