"use client";

// ============================================================
// useGlobalSeason — l'état « saison » prêt à afficher.
// Un seul hook pour tous les écrans (QG, cérémonie, progression…) :
// la machine reste ici, les écrans ne sont que des habillages.
// ============================================================

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  chooseCamp as apiChooseCamp,
  fetchActiveExploit,
  fetchActiveGlobalSeason,
  fetchCampCounts,
  fetchExploitCompletions,
  fetchMyCamp,
  fetchMyEclats,
  fetchSeasonScores,
} from "@/lib/seasonApi";
import {
  rankFor,
  nextRank,
  rankProgress,
  type CampKey,
  type Exploit,
  type Rank,
  type Season,
  type SeasonScore,
} from "@/lib/season";

export interface GlobalSeasonState {
  loading: boolean;
  season: Season | null;          // null = aucune saison active (l'UI se replie)
  scores: SeasonScore[];
  myCamp: CampKey | null;         // null = la cérémonie doit se montrer
  campCounts: Record<CampKey, number>;
  eclats: number;
  rank: Rank;
  next: { rank: Rank; missing: number } | null;
  progress: number;               // 0→1 dans le palier courant
  exploit: Exploit | null;
  exploitDoneBy: string[];        // user_ids (facepile + « déjà réussi ? »)
  exploitDone: boolean;           // par moi
  chooseCamp: (camp: CampKey) => Promise<boolean>;
  refresh: () => Promise<void>;
}

export function useGlobalSeason(): GlobalSeasonState {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [season, setSeason] = useState<Season | null>(null);
  const [scores, setScores] = useState<SeasonScore[]>([]);
  const [myCamp, setMyCamp] = useState<CampKey | null>(null);
  const [campCounts, setCampCounts] = useState<Record<CampKey, number>>({ a: 0, b: 0 });
  const [eclats, setEclats] = useState(0);
  const [exploit, setExploit] = useState<Exploit | null>(null);
  const [exploitDoneBy, setExploitDoneBy] = useState<string[]>([]);

  const refresh = useCallback(async () => {
    if (!user) return;
    const s = await fetchActiveGlobalSeason();
    setSeason(s);
    if (s) {
      const [sc, camp, counts, ec, ex] = await Promise.all([
        fetchSeasonScores(s.id),
        fetchMyCamp(s.id, user.id),
        fetchCampCounts(s.id),
        fetchMyEclats(s.id, user.id),
        fetchActiveExploit(),
      ]);
      setScores(sc);
      setMyCamp(camp);
      setCampCounts(counts);
      setEclats(ec);
      setExploit(ex);
      setExploitDoneBy(ex ? await fetchExploitCompletions(ex.id) : []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    void refresh();
  }, [user, refresh]);

  const chooseCamp = useCallback(
    async (camp: CampKey): Promise<boolean> => {
      if (!user || !season) return false;
      const ok = await apiChooseCamp(season.id, user.id, camp);
      if (ok) {
        setMyCamp(camp);
        setCampCounts((c) => ({ ...c, [camp]: c[camp] + 1 }));
      }
      return ok;
    },
    [user, season],
  );

  return {
    loading,
    season,
    scores,
    myCamp,
    campCounts,
    eclats,
    rank: rankFor(eclats),
    next: nextRank(eclats),
    progress: rankProgress(eclats),
    exploit,
    exploitDoneBy,
    exploitDone: !!user && exploitDoneBy.includes(user.id),
    chooseCamp,
    refresh,
  };
}
