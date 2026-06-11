"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, Utensils, Settings } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

/* ─── Types ─── */
type MealItem = {
  type: string; // petit-dejeuner | dejeuner | gouter | diner
  nom: string;
  calories: number;
};

type MealDay = {
  jour: string;
  repas: MealItem[];
};

type MealPlan = {
  semaine: MealDay[];
};

type ProfileData = {
  onboarding_level: string | null;
  onboarding_sessions_week: number | null;
  onboarding_goals: string[] | null;
  onboarding_age: number | null;
  onboarding_weight: number | null;
  onboarding_meals_day: number | null;
};

/* ─── Meal type meta ─── */
const MEAL_EMOJI: Record<string, string> = {
  "petit-dejeuner": "🥐",
  "dejeuner": "🍽️",
  "gouter": "🍪",
  "diner": "🍲",
  "collation": "🥤",
};
const MEAL_LABEL: Record<string, string> = {
  "petit-dejeuner": "Petit-déj",
  "dejeuner": "Déjeuner",
  "gouter": "Goûter",
  "diner": "Dîner",
  "collation": "Collation",
};

/* ─── Quels repas proposer selon le nombre choisi par l'utilisateur ─── */
function mealTypesForCount(n: number): string[] {
  switch (n) {
    case 2:  return ["dejeuner", "diner"];
    case 3:  return ["petit-dejeuner", "dejeuner", "diner"];
    case 5:  return ["petit-dejeuner", "collation", "dejeuner", "gouter", "diner"];
    case 6:  return ["petit-dejeuner", "collation", "dejeuner", "gouter", "diner", "collation"];
    case 4:
    default: return ["petit-dejeuner", "dejeuner", "gouter", "diner"];
  }
}

/* ─── Goal labels ─── */
const goalLabels: Record<string, string> = {
  masse: "prise de masse",
  prise_de_masse: "prise de masse",
  poids: "perte de poids",
  perte_de_poids: "perte de poids",
  force: "force",
  endurance: "endurance",
  sante: "santé générale",
  sante_generale: "santé générale",
  souplesse: "souplesse",
};

/* ─── Cache helpers (clé hebdomadaire, comme le programme) ─── */
function getCacheKey(userId: string, mealsCount: number): string {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const week = Math.ceil(((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
  // mealsCount + version dans la clé → régénère si le nb de repas ou le style change
  return `aura_repas_v2_${userId}_m${mealsCount}_w${week}_${now.getFullYear()}`;
}
function loadFromCache(key: string): MealPlan | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as MealPlan;
  } catch {
    return null;
  }
}
function saveToCache(key: string, data: MealPlan): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch { /* ignore */ }
}

const DAY_LABELS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

/* ─── Skeleton ─── */
function SkeletonMeals() {
  return (
    <div className="flex flex-col gap-2 pt-1">
      {[70, 90, 65, 85].map((w, i) => (
        <motion.div key={i} className="rounded-2xl"
          style={{ height: 44, width: `${w}%`, background: "rgba(212,168,67,0.1)" }}
          animate={{ opacity: [0.4, 0.9, 0.4] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut", delay: i * 0.12 }} />
      ))}
    </div>
  );
}

/* ─── Day meals panel ─── */
function DayMeals({ day }: { day: MealDay }) {
  const total = (day.repas ?? []).reduce((s, m) => s + (m.calories || 0), 0);
  return (
    <motion.div key={day.jour}
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2, ease: "easeOut" }}
      className="flex flex-col gap-2">
      {total > 0 && (
        <p className="text-[10px] font-semibold self-end" style={{ color: "#D4A843" }}>
          ~{total} kcal / jour
        </p>
      )}
      {(day.repas ?? []).map((m, i) => (
        <div key={i} className="flex items-center gap-3 rounded-2xl px-3 py-2.5"
          style={{ background: "rgba(255,255,255,0.7)", border: "1px solid rgba(212,192,255,0.25)" }}>
          <span className="text-lg flex-shrink-0">{MEAL_EMOJI[m.type] ?? "🍽️"}</span>
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-semibold tracking-widest uppercase" style={{ color: "#A0AEC0" }}>
              {MEAL_LABEL[m.type] ?? "Repas"}
            </p>
            <p className="text-[13px] font-medium leading-snug" style={{ color: "#2D3748" }}>{m.nom}</p>
          </div>
          {m.calories > 0 && (
            <span className="text-[11px] font-semibold flex-shrink-0" style={{ color: "#A78BFA" }}>
              {m.calories} kcal
            </span>
          )}
        </div>
      ))}
    </motion.div>
  );
}

/* ─── Main Component ─── */
export default function RecommendedMeals() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [plan, setPlan] = useState<MealPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const todayIndex = (() => { const d = new Date().getDay(); return d === 0 ? 6 : d - 1; })();
  const [selectedDay, setSelectedDay] = useState(todayIndex);

  /* ── Fetch profile ── */
  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    supabase
      .from("profiles")
      .select("onboarding_level, onboarding_sessions_week, onboarding_goals, onboarding_age, onboarding_weight, onboarding_meals_day")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data, error: err }) => {
        if (!err && data) setProfile(data as ProfileData);
        setProfileLoaded(true);
      });
  }, [user]);

  /* ── Generate meal plan ── */
  const generate = useCallback(
    async (force = false) => {
      if (!user || !profile) return;

      // Nombre de repas/jour choisi par l'utilisateur (défaut 4)
      const mealsCount = profile.onboarding_meals_day && profile.onboarding_meals_day >= 2
        ? Math.min(6, profile.onboarding_meals_day)
        : 4;

      const cacheKey = getCacheKey(user.id, mealsCount);
      if (!force) {
        const cached = loadFromCache(cacheKey);
        if (cached) { setPlan(cached); return; }
      }

      setLoading(true);
      setError(null);

      const level = profile.onboarding_level ?? "intermédiaire";
      const weight = profile.onboarding_weight ? `${profile.onboarding_weight} kg` : "non précisé";
      const age = profile.onboarding_age ? `${profile.onboarding_age} ans` : "non précisé";
      const goals = (profile.onboarding_goals ?? [])
        .map((g) => goalLabels[g] ?? g)
        .join(", ") || "forme générale";

      const mealTypes = mealTypesForCount(mealsCount);
      const exampleRepas = mealTypes
        .map((t) => `{ "type": "${t}", "nom": "Plat exemple", "calories": 400 }`)
        .join(", ");

      const prompt = `Tu es un nutritionniste sportif expert. Génère un plan alimentaire hebdomadaire personnalisé en JSON pour cet utilisateur:
- Niveau sportif: ${level}
- Objectifs: ${goals}
- Poids: ${weight}
- Âge: ${age}
- Nombre de repas par jour: ${mealsCount}
Pour chaque jour, propose EXACTEMENT ${mealsCount} repas, dans cet ordre et avec ces types exacts : ${mealTypes.join(", ")}. Des plats CONCRETS, équilibrés et adaptés à l'objectif, avec une estimation de calories réaliste.
TRÈS IMPORTANT : propose UNIQUEMENT des plats SIMPLES et CONNUS DE TOUS, qu'on mange au quotidien (ex : pâtes bolognaise, poulet riz haricots verts, omelette, steak frites, salade de pâtes, yaourt + fruits, tartines, riz cantonais, sandwich poulet, pâtes au saumon, porridge avoine, œufs au plat, soupe). PAS de plats exotiques, compliqués ou rares.
IMPORTANT : noms de plats COURTS (4-6 mots max, sans détails superflus) pour garder une réponse compacte.
Réponds UNIQUEMENT avec un JSON valide de cette forme:
{ "semaine": [ { "jour": "Lundi", "repas": [ ${exampleRepas} ] } ] }
Exactement 7 jours (Lundi à Dimanche), ${mealsCount} repas par jour. Varie les plats d'un jour à l'autre.`;

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          // Plan 7 jours × 4 repas → besoin de plus de tokens pour un JSON complet
          body: JSON.stringify({ messages: [{ role: "user", content: prompt }], maxTokens: 4000 }),
        });
        if (!response.ok || !response.body) throw new Error("API error");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          fullText += decoder.decode(value, { stream: true });
        }

        const match = fullText.match(/\{[\s\S]*\}/);
        if (!match) throw new Error("No JSON found in response");

        const parsed: MealPlan = JSON.parse(match[0]);
        if (!parsed.semaine || !Array.isArray(parsed.semaine)) {
          throw new Error("Invalid plan structure");
        }

        saveToCache(cacheKey, parsed);
        setPlan(parsed);
      } catch (err) {
        console.error("Meal plan generation error:", err);
        setError("Impossible de générer les plats. Réessaie.");
      } finally {
        setLoading(false);
      }
    },
    [user, profile]
  );

  /* ── Auto-generate on profile load ── */
  useEffect(() => {
    if (profileLoaded && profile && profile.onboarding_level) {
      generate(false);
    }
  }, [profileLoaded, profile, generate]);

  /* ── Refs ── */
  const trackRef = useRef<HTMLDivElement>(null);
  const nameRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // ⚠️ Tous les hooks AVANT tout return conditionnel (Rules of Hooks)
  useEffect(() => {
    nameRefs.current[selectedDay]?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [selectedDay]);

  const hasOnboardingData =
    profile &&
    (profile.onboarding_level ||
      profile.onboarding_sessions_week ||
      (profile.onboarding_goals && profile.onboarding_goals.length > 0));

  if (profileLoaded && !hasOnboardingData) {
    return (
      <div className="px-1 pb-2">
        <div className="rounded-2xl p-5 flex items-center gap-4"
          style={{ background: "rgba(255,255,255,0.7)", backdropFilter: "blur(12px)", boxShadow: "0 4px 24px rgba(212,168,67,0.1)" }}>
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(212,168,67,0.12)" }}>
            <Utensils size={18} strokeWidth={1.5} style={{ color: "#D4A843" }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium mb-0.5" style={{ color: "#2D3748" }}>
              Complète ton profil pour tes plats recommandés
            </p>
            <p className="text-xs font-light" style={{ color: "#A0AEC0" }}>Objectifs et poids requis</p>
          </div>
          <Link href="/parametres">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl"
              style={{ background: "linear-gradient(135deg,#D4C0FF 0%,#F5E6A3 100%)" }}>
              <Settings size={12} strokeWidth={2} style={{ color: "#2D3748" }} />
              <span className="text-xs font-semibold" style={{ color: "#2D3748" }}>Réglages</span>
            </motion.div>
          </Link>
        </div>
      </div>
    );
  }

  const currentDay = plan?.semaine?.[selectedDay];

  const getDayFromX = (clientX: number): number => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return selectedDay;
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    return Math.min(6, Math.floor((x / rect.width) * 7));
  };
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setSelectedDay(getDayFromX(e.clientX));
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    setSelectedDay(getDayFromX(e.clientX));
  };

  const pct = ((selectedDay + 0.5) / 7) * 100;

  return (
    <div className="flex flex-col gap-3">
      {/* ── Slider jour ── */}
      <div className="flex flex-col gap-2">
        <div className="flex overflow-x-auto gap-4 pb-0.5" style={{ scrollbarWidth: "none" }}>
          {DAY_LABELS.map((label, i) => (
            <button key={label}
              ref={el => { nameRefs.current[i] = el; }}
              onClick={() => setSelectedDay(i)}
              className="flex-shrink-0 cursor-pointer select-none"
              style={{
                color: i === selectedDay ? "#2D3748" : "#A0AEC0",
                fontWeight: i === selectedDay ? 600 : 400,
                fontSize: 12,
                transition: "color 0.15s, font-weight 0.15s",
                background: "none", border: "none", padding: 0,
              }}>
              {label}
            </button>
          ))}
        </div>

        <div ref={trackRef}
          className="relative rounded-full cursor-pointer select-none touch-none"
          style={{ height: 5, background: "rgba(212,168,67,0.12)" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}>
          <div className="absolute left-0 top-0 h-full rounded-full pointer-events-none"
            style={{ width: `${pct}%`, background: "linear-gradient(90deg, #D4A843, #A78BFA)", transition: "width 0.12s ease" }} />
        </div>

        {plan && !loading && (
          <div className="flex justify-end">
            <button onClick={() => generate(true)}
              className="flex items-center gap-1 cursor-pointer" style={{ color: "#A0AEC0", background: "none", border: "none", padding: 0 }}>
              <RefreshCw size={10} strokeWidth={2.5} />
              <span className="text-[9px] font-medium">Régénérer</span>
            </button>
          </div>
        )}
      </div>

      {/* ── Repas du jour sélectionné ── */}
      <div className="min-h-[100px]">
        {error && !loading && (
          <div className="rounded-2xl p-3 flex items-center justify-between"
            style={{ background: "rgba(252,129,129,0.08)", border: "1px solid rgba(252,129,129,0.18)" }}>
            <p className="text-xs" style={{ color: "#DC2626" }}>{error}</p>
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => generate(true)}
              className="text-[10px] font-semibold px-2.5 py-1 rounded-lg cursor-pointer"
              style={{ background: "rgba(252,129,129,0.15)", color: "#DC2626" }}>
              Réessayer
            </motion.button>
          </div>
        )}

        {(loading || (!plan && profileLoaded && hasOnboardingData)) && <SkeletonMeals />}

        <AnimatePresence mode="wait">
          {!loading && currentDay && <DayMeals key={selectedDay} day={currentDay} />}
        </AnimatePresence>
      </div>
    </div>
  );
}
