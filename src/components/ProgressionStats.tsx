"use client";

/* ─────────────────────────────────────────────────────────────
   Bloc « Ta progression » du dashboard d'accueil.
   Composant autonome : récupère ses propres données (poids, volume
   hebdo, records, séances de la semaine) et branche les graphiques
   extraits dans charts/ProgressionCharts. Remplace l'ancien
   sous-onglet « Progression » (option B — stats remontées à l'accueil).
   ───────────────────────────────────────────────────────────── */

import { useState, useEffect, useCallback } from "react";
import {
  WeightChart, VolumeChart, PRChart, WorkoutWeekCard, type WeightEntry,
} from "@/components/charts/ProgressionCharts";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase";
import { localDateStr } from "@/lib/dates";

type PR = { id: string; exercise: string; value: number; unit: string; date: string };
type WeekVolume = { label: string; cals: number; sessions: number };
type WeekSession = {
  type: "workout";
  date: string;
  performance: { date?: string; metrics?: Array<{ label: string; value: string }> };
};

export default function ProgressionStats({ onToast }: { onToast?: (msg: string) => void }) {
  const { user } = useAuth();
  const toast = useCallback((m: string) => onToast?.(m), [onToast]);

  const [weights, setWeights]         = useState<WeightEntry[]>([]);
  const [weightRange, setWeightRange] = useState<"week" | "month">("week");
  const [weeklyVolume, setWeeklyVolume] = useState<WeekVolume[]>([]);
  const [prs, setPrs]                 = useState<PR[]>([]);
  const [weekSessions, setWeekSessions] = useState<WeekSession[]>([]);

  // Objectif fitness (prise de masse / perte de poids) depuis l'onboarding local
  const [fitnessGoal, setFitnessGoal] = useState<"masse" | "poids" | null>(null);
  useEffect(() => {
    try {
      const pseudo = user?.pseudo;
      if (!pseudo) return;
      const raw = localStorage.getItem(`aura_onboarding_${pseudo}`);
      if (!raw) return;
      const goals = (JSON.parse(raw) as { goals?: string[] }).goals ?? [];
      if (goals.includes("masse") && !goals.includes("poids")) setFitnessGoal("masse");
      else if (goals.includes("poids") && !goals.includes("masse")) setFitnessGoal("poids");
      else setFitnessGoal(null);
    } catch { /* ignore */ }
  }, [user?.pseudo]);

  // ── Poids (30 derniers jours) ──
  const fetchWeights = useCallback(async () => {
    if (!user) return;
    const supabase = createClient();
    const thirtyAgo = new Date(); thirtyAgo.setDate(thirtyAgo.getDate() - 29);
    const { data } = await supabase.from("weight_logs")
      .select("date, weight_kg")
      .eq("user_id", user.id).gte("date", localDateStr(thirtyAgo))
      .order("date", { ascending: true });
    if (data) setWeights(data.map((r: { date: string; weight_kg: number }) => ({ date: r.date, weight: r.weight_kg })));
  }, [user]);

  // ── Records perso ──
  const fetchPRs = useCallback(async () => {
    if (!user) return;
    const supabase = createClient();
    const { data } = await supabase.from("personal_records")
      .select("id, exercise, value, unit, date")
      .eq("user_id", user.id).order("date", { ascending: false }).limit(100);
    if (data) setPrs(data as PR[]);
  }, [user]);

  // ── Volume hebdomadaire (8 semaines) + séances de la semaine ──
  const fetchWorkouts = useCallback(async () => {
    if (!user) return;
    const supabase = createClient();
    const eightWeeksAgo = new Date();
    eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 55);
    const { data } = await supabase.from("workout_sessions")
      .select("started_at, duration_minutes, calories_burned")
      .eq("user_id", user.id)
      .gte("started_at", eightWeeksAgo.toISOString())
      .order("started_at", { ascending: true });
    if (!data) return;

    // Regroupe par semaine (lundi → dimanche)
    const weekMap = new Map<string, { cals: number; sessions: number }>();
    const recent: WeekSession[] = [];
    data.forEach((r: { started_at: string; duration_minutes: number; calories_burned: number }) => {
      const d = new Date(r.started_at);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d); monday.setDate(diff);
      const key = monday.toISOString().slice(0, 10);
      const cur = weekMap.get(key) ?? { cals: 0, sessions: 0 };
      weekMap.set(key, { cals: cur.cals + (r.calories_burned ?? 0), sessions: cur.sessions + 1 });
      recent.push({
        type: "workout",
        date: localDateStr(d),
        performance: {
          date: r.started_at,
          metrics: [
            { label: "Durée", value: String(r.duration_minutes ?? 0) },
            ...(r.calories_burned ? [{ label: "Calories", value: String(r.calories_burned) }] : []),
          ],
        },
      });
    });
    setWeekSessions(recent);

    const now = new Date();
    const result: WeekVolume[] = [];
    for (let i = 7; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i * 7);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d); monday.setDate(diff);
      const key = monday.toISOString().slice(0, 10);
      const label = monday.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
      result.push({ label, ...(weekMap.get(key) ?? { cals: 0, sessions: 0 }) });
    }
    setWeeklyVolume(result);
  }, [user]);

  useEffect(() => { fetchWeights(); }, [fetchWeights]);
  useEffect(() => { fetchPRs(); }, [fetchPRs]);
  useEffect(() => { fetchWorkouts(); }, [fetchWorkouts]);

  // ── Handlers poids ──
  const addWeight = async (kg: number) => {
    if (!user) { toast("Connecte-toi pour sauvegarder"); return; }
    const supabase = createClient();
    const today = localDateStr();
    const { error } = await supabase.from("weight_logs")
      .upsert({ user_id: user.id, date: today, weight_kg: kg }, { onConflict: "user_id,date" });
    if (!error) {
      setWeights(prev => {
        const filtered = prev.filter(w => w.date !== today);
        return [...filtered, { date: today, weight: kg }].sort((a, b) => a.date.localeCompare(b.date));
      });
      toast(`Poids enregistré : ${kg} kg ✓`);
    }
  };
  const deleteWeight = async (date: string) => {
    if (!user) return;
    const supabase = createClient();
    const { error } = await supabase.from("weight_logs").delete().eq("user_id", user.id).eq("date", date);
    if (!error) { setWeights(prev => prev.filter(w => w.date !== date)); toast("Entrée supprimée"); }
  };
  const updateWeight = async (date: string, kg: number) => {
    if (!user) return;
    const supabase = createClient();
    const { error } = await supabase.from("weight_logs").update({ weight_kg: kg }).eq("user_id", user.id).eq("date", date);
    if (!error) { setWeights(prev => prev.map(w => w.date === date ? { ...w, weight: kg } : w)); toast(`Poids mis à jour : ${kg} kg ✓`); }
  };

  // ── Handlers records ──
  const addPR = async (exercise: string, value: number, unit: string) => {
    if (!user) { toast("Connecte-toi pour sauvegarder"); return; }
    const supabase = createClient();
    const { error } = await supabase.from("personal_records")
      .insert({ user_id: user.id, exercise, value, unit, date: localDateStr() });
    if (!error) { toast("Record enregistré 🏆"); fetchPRs(); }
    else { toast("Enregistrement impossible, réessaie"); }
  };
  const deletePR = async (id: string) => {
    if (!user) return;
    const supabase = createClient();
    const { error } = await supabase.from("personal_records").delete().eq("id", id).eq("user_id", user.id);
    if (!error) { toast("Record supprimé"); fetchPRs(); }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <WeightChart
        data={weights}
        range={weightRange}
        onRangeChange={setWeightRange}
        onAdd={addWeight}
        onDelete={deleteWeight}
        onUpdate={updateWeight}
        goalType={fitnessGoal}
      />
      <WorkoutWeekCard sessions={weekSessions} />
      <PRChart prs={prs} onAdd={addPR} onDelete={deletePR} />
      <VolumeChart data={weeklyVolume} />
    </div>
  );
}
