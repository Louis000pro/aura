// ============================================================
// LA SAISON — accès données (client Supabase, zéro React, zéro UI)
// Les écrans passent par useSeason.ts ; les endroits non-React
// (fin de séance…) appellent directement ces fonctions.
// ============================================================

import { createClient } from "@/lib/supabase";
import {
  ECLATS,
  rankFor,
  type CampKey,
  type Exploit,
  type Season,
  type SeasonScore,
} from "@/lib/season";

const today = () => new Date().toISOString().slice(0, 10);

/** La saison globale active (null si aucune — l'UI se replie en silence). */
export async function fetchActiveGlobalSeason(): Promise<Season | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("seasons")
    .select("id, scope, circle_id, name, camp_a_name, camp_a_emblem, camp_b_name, camp_b_emblem, starts_on, ends_on, winner")
    .eq("scope", "global")
    .lte("starts_on", today())
    .gte("ends_on", today())
    .is("winner", null)
    .order("starts_on", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as Season | null) ?? null;
}

/** Les duels de cercle actifs de l'utilisateur (RLS filtre déjà par appartenance). */
export async function fetchMyCircleSeasons(): Promise<Season[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("seasons")
    .select("id, scope, circle_id, name, camp_a_name, camp_a_emblem, camp_b_name, camp_b_emblem, starts_on, ends_on, winner")
    .eq("scope", "circle")
    .lte("starts_on", today())
    .gte("ends_on", today())
    .is("winner", null);
  return (data as Season[] | null) ?? [];
}

export async function fetchSeasonScores(seasonId: string): Promise<SeasonScore[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("season_scores")
    .select("season_id, camp, points, members")
    .eq("season_id", seasonId);
  return (data as SeasonScore[] | null) ?? [];
}

export async function fetchMyCamp(seasonId: string, userId: string): Promise<CampKey | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("season_camps")
    .select("camp")
    .eq("season_id", seasonId)
    .eq("user_id", userId)
    .maybeSingle();
  return (data?.camp as CampKey | undefined) ?? null;
}

/** Nombre de joueurs par camp (révélé APRÈS le choix, jamais avant). */
export async function fetchCampCounts(seasonId: string): Promise<Record<CampKey, number>> {
  const supabase = createClient();
  const { data } = await supabase
    .from("season_camps")
    .select("camp")
    .eq("season_id", seasonId);
  const counts: Record<CampKey, number> = { a: 0, b: 0 };
  for (const row of data ?? []) counts[row.camp as CampKey]++;
  return counts;
}

/** Sceller son camp. Renvoie false si déjà choisi (le choix ne se change pas). */
export async function chooseCamp(seasonId: string, userId: string, camp: CampKey): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from("season_camps")
    .insert({ season_id: seasonId, user_id: userId, camp });
  return !error;
}

export async function fetchMyEclats(seasonId: string, userId: string): Promise<number> {
  const supabase = createClient();
  const { data } = await supabase
    .from("season_eclats")
    .select("eclats")
    .eq("season_id", seasonId)
    .eq("user_id", userId)
    .maybeSingle();
  return data?.eclats ?? 0;
}

/** Totaux d'éclats d'un groupe d'utilisateurs (classement entre amis). */
export async function fetchEclatsFor(seasonId: string, userIds: string[]): Promise<Map<string, number>> {
  const supabase = createClient();
  const map = new Map<string, number>();
  if (userIds.length === 0) return map;
  const { data } = await supabase
    .from("season_eclats")
    .select("user_id, eclats")
    .eq("season_id", seasonId)
    .in("user_id", userIds);
  for (const row of data ?? []) map.set(row.user_id as string, row.eclats as number);
  return map;
}

/**
 * Créditer des éclats + publier l'événement « rank_up » si le crédit
 * fait franchir un palier. Idempotent via l'index unique (kind, ref).
 */
async function awardEclats(
  userId: string,
  seasonId: string,
  kind: "seance" | "exploit" | "serie" | "bonus",
  amount: number,
  refId: string,
): Promise<boolean> {
  const supabase = createClient();
  const before = await fetchMyEclats(seasonId, userId);
  const { error } = await supabase.from("eclat_events").insert({
    user_id: userId,
    season_id: seasonId,
    kind,
    amount,
    ref_id: refId,
  });
  if (error) return false; // déjà crédité (double-crédit rejeté par l'index)
  const beforeRank = rankFor(before);
  const afterRank = rankFor(before + amount);
  if (afterRank.key !== beforeRank.key) {
    await pushCommunityEvent("rank_up", userId, seasonId, {
      rank_key: afterRank.key,
      rank_name: afterRank.name,
    });
  }
  return true;
}

/**
 * Crédite les éclats d'une séance terminée (idempotent).
 * Fire-and-forget depuis la fin de séance — ne doit JAMAIS bloquer l'UX.
 */
export async function creditSeanceEclats(userId: string, workoutSessionId: string): Promise<void> {
  try {
    const season = await fetchActiveGlobalSeason();
    if (!season) return;
    await awardEclats(userId, season.id, "seance", ECLATS.seance, workoutSessionId);
  } catch {
    // silencieux : les éclats se rattraperont, la séance est déjà sauvée
  }
}

/** L'exploit global de la semaine (null hors fenêtre). */
export async function fetchActiveExploit(): Promise<Exploit | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("exploits")
    .select("id, scope, circle_id, title, badge_name, badge_emoji, reward_eclats, starts_on, ends_on")
    .eq("scope", "global")
    .lte("starts_on", today())
    .gte("ends_on", today())
    .order("starts_on", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as Exploit | null) ?? null;
}

export async function fetchExploitCompletions(exploitId: string): Promise<string[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("exploit_completions")
    .select("user_id")
    .eq("exploit_id", exploitId);
  return (data ?? []).map((r) => r.user_id as string);
}

/** Valider un exploit (sur l'honneur) : badge + éclats + événement du fil. */
export async function completeExploit(exploit: Exploit, userId: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from("exploit_completions")
    .insert({ exploit_id: exploit.id, user_id: userId });
  if (error) return false; // déjà validé
  const season = await fetchActiveGlobalSeason();
  if (season) {
    await awardEclats(userId, season.id, "exploit", exploit.reward_eclats, exploit.id);
    await pushCommunityEvent("exploit_done", userId, season.id, {
      exploit_id: exploit.id,
      title: exploit.title,
      badge_name: exploit.badge_name,
      badge_emoji: exploit.badge_emoji,
    });
  }
  return true;
}

export interface LeaderboardEntry {
  user_id: string;
  pseudo: string;
  avatar_url: string | null;
  eclats: number;
  isMe: boolean;
}

/** Classement de saison ENTRE AMIS (moi + ceux que je suis) — jamais global. */
export async function fetchFriendsLeaderboard(seasonId: string, userId: string): Promise<LeaderboardEntry[]> {
  const supabase = createClient();
  const { data: follows } = await supabase
    .from("followers")
    .select("following_id")
    .eq("follower_id", userId);
  const ids = [...new Set([userId, ...(follows ?? []).map((f) => f.following_id as string)])];
  const [eclatsMap, { data: profs }] = await Promise.all([
    fetchEclatsFor(seasonId, ids),
    supabase.from("profiles").select("id, pseudo, avatar_url").in("id", ids),
  ]);
  return (profs ?? [])
    .map((p) => ({
      user_id: p.id as string,
      pseudo: (p.pseudo as string) ?? "?",
      avatar_url: (p.avatar_url as string | null) ?? null,
      eclats: eclatsMap.get(p.id as string) ?? 0,
      isMe: p.id === userId,
    }))
    .sort((a, b) => b.eclats - a.eclats)
    .slice(0, 10);
}

export interface EarnedBadge {
  badge_name: string;
  badge_emoji: string;
  title: string;
  completed_at: string;
}

/** Les badges d'exploit gagnés (à vie), du plus récent au plus ancien. */
export async function fetchMyBadges(userId: string): Promise<EarnedBadge[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("exploit_completions")
    .select("completed_at, exploits(badge_name, badge_emoji, title)")
    .eq("user_id", userId)
    .order("completed_at", { ascending: false });
  return (data ?? []).flatMap((row) => {
    const ex = row.exploits as unknown as { badge_name: string; badge_emoji: string; title: string } | null;
    if (!ex) return [];
    return [{ badge_name: ex.badge_name, badge_emoji: ex.badge_emoji, title: ex.title, completed_at: row.completed_at as string }];
  });
}

/** Numéro de membre (badge Fondateur par vagues). */
export async function fetchMemberNumber(userId: string): Promise<number | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("profiles")
    .select("member_number")
    .eq("id", userId)
    .maybeSingle();
  return (data?.member_number as number | undefined) ?? null;
}

export interface FeedEvent {
  id: string;
  type: string;
  actor_id: string | null;
  actorPseudo: string | null;
  payload: Record<string, unknown>;
  created_at: string;
}

/** Les derniers événements du fil/ticker, pseudos résolus. */
export async function fetchRecentEvents(limit = 12): Promise<FeedEvent[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("community_events")
    .select("id, type, actor_id, payload, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  const events = (data ?? []) as Omit<FeedEvent, "actorPseudo">[];
  const ids = [...new Set(events.map((e) => e.actor_id).filter((x): x is string => !!x))];
  const pseudos = new Map<string, string>();
  if (ids.length > 0) {
    const { data: profs } = await supabase.from("profiles").select("id, pseudo").in("id", ids);
    for (const p of profs ?? []) pseudos.set(p.id as string, p.pseudo as string);
  }
  return events.map((e) => ({ ...e, actorPseudo: e.actor_id ? pseudos.get(e.actor_id) ?? null : null }));
}

export async function pushCommunityEvent(
  type: string,
  actorId: string | null,
  seasonId: string | null,
  payload: Record<string, unknown>,
): Promise<void> {
  try {
    const supabase = createClient();
    await supabase.from("community_events").insert({
      type,
      actor_id: actorId,
      season_id: seasonId,
      payload,
    });
  } catch {
    // le fil est décoratif : jamais bloquant
  }
}
