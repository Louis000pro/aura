"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Dumbbell, Flame, Droplets, Users, TrendingUp, Zap, Star, Trophy, Heart, Target, Award } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

/* ─── Types ─────────────────────────────────────────────── */
type BadgeCategory = "workout" | "nutrition" | "social" | "streak";

type BadgeDef = {
  id: string;
  name: string;
  description: string;
  icon: string | typeof Dumbbell;
  conditionLabel: string;
  category: BadgeCategory;
  rarity: "common" | "rare" | "epic" | "legendary";
};

type UnlockedBadge = {
  badgeId: string;
  unlockedAt: string;
};

/* ─── Badge definitions ─────────────────────────────────── */
const BADGES: BadgeDef[] = [
  // Workout
  {
    id: "first-session",
    name: "Première séance",
    description: "Tu as complété ta toute première séance d'entraînement.",
    icon: "🏋️",
    conditionLabel: "Compléter 1 séance",
    category: "workout",
    rarity: "common",
  },
  {
    id: "ten-sessions",
    name: "En forme",
    description: "10 séances complétées. L'habitude commence à se former.",
    icon: Dumbbell,
    conditionLabel: "Compléter 10 séances",
    category: "workout",
    rarity: "common",
  },
  {
    id: "fifty-sessions",
    name: "Athlète confirmé",
    description: "50 séances au compteur. Tu es sérieux dans ta démarche.",
    icon: "💪",
    conditionLabel: "Compléter 50 séances",
    category: "workout",
    rarity: "rare",
  },
  {
    id: "cardio-king",
    name: "Cardio King",
    description: "10 séances de cardio complétées. Ton cœur te remercie.",
    icon: Flame,
    conditionLabel: "10 séances cardio",
    category: "workout",
    rarity: "common",
  },
  {
    id: "force-brute",
    name: "Force Brute",
    description: "10 séances de musculation. Tu soulèves plus lourd chaque semaine.",
    icon: "🦾",
    conditionLabel: "10 séances musculation",
    category: "workout",
    rarity: "common",
  },
  {
    id: "perfect-week",
    name: "Semaine parfaite",
    description: "7 séances en 7 jours. Une discipline admirable.",
    icon: Star,
    conditionLabel: "7 séances en 7 jours",
    category: "workout",
    rarity: "rare",
  },
  {
    id: "fire-month",
    name: "Mois de feu",
    description: "20 séances en un seul mois. Tu es en feu !",
    icon: "🔥",
    conditionLabel: "20 séances en un mois",
    category: "workout",
    rarity: "rare",
  },
  {
    id: "pr-hunter",
    name: "Record Perso",
    description: "Premier record personnel enregistré. Le début d'une progression.",
    icon: TrendingUp,
    conditionLabel: "1 record personnel",
    category: "workout",
    rarity: "common",
  },
  {
    id: "pr-champion",
    name: "Champion",
    description: "10 records personnels. Tu repousses tes limites en permanence.",
    icon: Trophy,
    conditionLabel: "10 records personnels",
    category: "workout",
    rarity: "epic",
  },
  {
    id: "centurion",
    name: "Centurion",
    description: "100 séances complétées. Un vrai guerrier du quotidien.",
    icon: "⚔️",
    conditionLabel: "Compléter 100 séances",
    category: "workout",
    rarity: "legendary",
  },
  // Nutrition
  {
    id: "nutritionniste",
    name: "Nutritionniste",
    description: "30 journées nutritionnelles enregistrées. Tu sais ce que tu manges.",
    icon: "🥗",
    conditionLabel: "30 logs nutrition",
    category: "nutrition",
    rarity: "common",
  },
  {
    id: "hydrate",
    name: "Hydraté",
    description: "Eau consommée 7 jours de suite. La base de tout.",
    icon: Droplets,
    conditionLabel: "Eau loggée 7 jours d'affilée",
    category: "nutrition",
    rarity: "common",
  },
  {
    id: "macro-master",
    name: "Maître des macros",
    description: "Objectifs caloriques atteints 14 jours de suite.",
    icon: Target,
    conditionLabel: "Objectif calorique 14 jours",
    category: "nutrition",
    rarity: "rare",
  },
  {
    id: "nutrition-centurion",
    name: "Discipline alimentaire",
    description: "100 journées nutritionnelles enregistrées. Une vraie routine.",
    icon: "🏆",
    conditionLabel: "100 logs nutrition",
    category: "nutrition",
    rarity: "epic",
  },
  // Social
  {
    id: "hundred-followers",
    name: "Populaire",
    description: "100 abonnés sur Vaiiya. La communauté t'apprécie.",
    icon: Users,
    conditionLabel: "100 abonnés",
    category: "social",
    rarity: "rare",
  },
  {
    id: "influencer",
    name: "Influenceur",
    description: "500 abonnés. Tu inspires une vraie communauté.",
    icon: "⭐",
    conditionLabel: "500 abonnés",
    category: "social",
    rarity: "epic",
  },
  {
    id: "sharer",
    name: "Partageur",
    description: "10 posts publiés. Tu partages ton parcours avec générosité.",
    icon: Heart,
    conditionLabel: "10 posts publiés",
    category: "social",
    rarity: "common",
  },
  {
    id: "viral",
    name: "Viral",
    description: "Un post a reçu 100 likes. Ta motivation est contagieuse.",
    icon: Zap,
    conditionLabel: "Un post avec 100+ likes",
    category: "social",
    rarity: "epic",
  },
  // Streak
  {
    id: "streak-7",
    name: "Série de 7",
    description: "7 jours d'entraînement consécutifs. La régularité paie.",
    icon: "🔥",
    conditionLabel: "7 jours de streak",
    category: "streak",
    rarity: "common",
  },
  {
    id: "streak-30",
    name: "Mois d'acier",
    description: "30 jours consécutifs d'entraînement. Une volonté de fer.",
    icon: Award,
    conditionLabel: "30 jours de streak",
    category: "streak",
    rarity: "legendary",
  },
  {
    id: "early-bird",
    name: "Lève-tôt",
    description: "5 séances avant 8h du matin. Tu attaques la journée fort.",
    icon: "🌅",
    conditionLabel: "5 séances avant 8h",
    category: "streak",
    rarity: "rare",
  },
  {
    id: "night-owl",
    name: "Oiseau de nuit",
    description: "5 séances après 21h. Même le soir, tu t'entraînes.",
    icon: "🦉",
    conditionLabel: "5 séances après 21h",
    category: "streak",
    rarity: "rare",
  },
];

/* ─── Rarity config ─────────────────────────────────────── */
const rarityConfig = {
  common:    { label: "Commun",    color: "var(--text-3)", glow: "rgba(160,174,192,0.4)",  gradient: "linear-gradient(135deg, rgba(240,240,240,0.9), rgba(220,220,220,0.9))" },
  rare:      { label: "Rare",      color: "var(--accent)", glow: "rgba(var(--accent-rgb),0.5)",  gradient: "linear-gradient(135deg, rgba(var(--violet-mid-rgb),0.9), rgba(var(--accent-rgb),0.7))" },
  epic:      { label: "Épique",    color: "var(--gold)", glow: "rgba(var(--gold-rgb),0.5)",   gradient: "linear-gradient(135deg, rgba(var(--cream-mid-rgb),0.9), rgba(var(--gold-rgb),0.7))" },
  legendary: { label: "Légendaire",color: "#E8620C", glow: "rgba(249,115,22,0.55)",  gradient: "linear-gradient(135deg, rgba(254,215,170,0.9), rgba(249,115,22,0.7))" },
};

/* ─── Category tabs ─────────────────────────────────────── */
const CATEGORY_TABS: { id: BadgeCategory | "all"; label: string }[] = [
  { id: "all",       label: "Tous" },
  { id: "workout",   label: "Séances" },
  { id: "nutrition", label: "Nutrition" },
  { id: "social",    label: "Social" },
  { id: "streak",    label: "Séries" },
];

/* ─── BadgeCard ─────────────────────────────────────────── */
function BadgeCard({ badge, unlockedAt }: { badge: BadgeDef; unlockedAt?: string }) {
  const isUnlocked = !!unlockedAt;
  const rarity = rarityConfig[badge.rarity];
  const IconComp = typeof badge.icon !== "string" ? badge.icon : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.88 }}
      transition={{ type: "spring", stiffness: 340, damping: 28 }}
      className="relative flex flex-col items-center gap-2 p-4 rounded-3xl overflow-hidden"
      style={{
        background: isUnlocked
          ? "rgba(var(--surface-rgb),0.85)"
          : "rgba(var(--surface-rgb),0.45)",
        backdropFilter: "blur(10px)",
        border: isUnlocked
          ? `1px solid ${rarity.color}40`
          : "1px solid rgba(var(--surface-rgb),0.6)",
        boxShadow: isUnlocked
          ? `0 4px 24px ${rarity.glow}, inset 0 1px 0 rgba(var(--surface-rgb),0.95)`
          : "inset 0 1px 0 rgba(var(--surface-rgb),0.7)",
      }}
    >
      {/* Shimmer for locked badges */}
      {!isUnlocked && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "linear-gradient(105deg, transparent 40%, rgba(var(--surface-rgb),0.45) 50%, transparent 60%)",
            backgroundSize: "200% 100%",
          }}
          animate={{ backgroundPosition: ["200% 0", "-200% 0"] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "linear", repeatDelay: 1.2 }}
        />
      )}

      {/* Glow ring for unlocked */}
      {isUnlocked && (
        <motion.div
          className="absolute inset-0 rounded-3xl pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
          style={{
            background: `radial-gradient(ellipse at 50% 20%, ${rarity.glow}, transparent 70%)`,
          }}
        />
      )}

      {/* Icon */}
      <div
        className="relative w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
        style={{
          background: isUnlocked ? rarity.gradient : "rgba(200,200,200,0.3)",
          boxShadow: isUnlocked ? `0 4px 16px ${rarity.glow}` : "none",
          filter: isUnlocked ? "none" : "grayscale(1) opacity(0.45)",
        }}
      >
        {!isUnlocked && (
          <div className="absolute inset-0 rounded-2xl flex items-center justify-center z-10"
            style={{ background: "rgba(var(--surface-rgb),0.55)", backdropFilter: "blur(2px)" }}>
            <Lock size={16} strokeWidth={2} style={{ color: "var(--text-3)" }} />
          </div>
        )}
        {IconComp
          ? <IconComp size={22} strokeWidth={1.6} style={{ color: isUnlocked ? "#fff" : "var(--text-3)" }} />
          : <span className="text-2xl leading-none">{badge.icon as string}</span>
        }
      </div>

      {/* Name */}
      <p
        className="text-xs font-semibold text-center leading-tight"
        style={{ color: isUnlocked ? "var(--text-1)" : "var(--text-3)" }}
      >
        {badge.name}
      </p>

      {/* Rarity pill */}
      <span
        className="text-[9px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-full"
        style={{
          background: isUnlocked ? `${rarity.color}18` : "rgba(200,200,200,0.2)",
          color: isUnlocked ? rarity.color : "#C0C0C0",
        }}
      >
        {rarity.label}
      </span>

      {/* Unlock date or condition */}
      <p className="text-[9px] text-center font-light leading-tight" style={{ color: "var(--text-3)" }}>
        {isUnlocked
          ? `Débloqué le ${new Date(unlockedAt!).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}`
          : badge.conditionLabel
        }
      </p>

      {/* Entry animation for newly unlocked */}
      {isUnlocked && (
        <motion.div
          className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 600, damping: 18 }}
          style={{ background: rarity.gradient, boxShadow: `0 2px 8px ${rarity.glow}` }}
        >
          <span className="text-[8px]">✓</span>
        </motion.div>
      )}
    </motion.div>
  );
}

/* ─── Main Badges component ─────────────────────────────── */
export default function Badges() {
  const { user } = useAuth();
  const [activeCategory, setActiveCategory] = useState<BadgeCategory | "all">("all");
  const [unlockedMap, setUnlockedMap] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    void checkUnlocks(user.id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function checkUnlocks(userId: string) {
    setLoading(true);
    const supabase = createClient();
    const now = new Date();
    const map = new Map<string, string>();

    try {
      // Fetch all needed data in parallel
      const [
        sessionsRes,
        prsRes,
        nutritionRes,
        waterRes,
        followersRes,
        postsRes,
        postLikesRes,
      ] = await Promise.all([
        supabase.from("workout_sessions").select("id, category, started_at").eq("user_id", userId),
        supabase.from("personal_records").select("id").eq("user_id", userId),
        supabase.from("nutrition_logs").select("id, date").eq("user_id", userId),
        supabase.from("nutrition_logs").select("date").eq("user_id", userId).not("water_ml", "is", null).gt("water_ml", 0),
        supabase.from("followers").select("follower_id").eq("following_id", userId),
        supabase.from("posts").select("id, created_at, likes_count").eq("user_id", userId),
        supabase.from("posts").select("id, likes_count").eq("user_id", userId).gte("likes_count", 100),
      ]);

      const sessions = sessionsRes.data ?? [];
      const prs = prsRes.data ?? [];
      const nutritionLogs = nutritionRes.data ?? [];
      const waterLogs = waterRes.data ?? [];
      const followers = followersRes.data ?? [];
      const posts = postsRes.data ?? [];
      const viralPosts = postLikesRes.data ?? [];

      const sessionCount = sessions.length;
      const followerCount = followers.length;
      const postCount = posts.length;
      const prCount = prs.length;
      const nutritionCount = nutritionLogs.length;

      const cardioSessions = sessions.filter(s => (s.category as string)?.toLowerCase().includes("cardio"));
      const muscleSessions = sessions.filter(s => {
        const cat = (s.category as string)?.toLowerCase() ?? "";
        return cat.includes("force") || cat.includes("musculation") || cat.includes("muscu");
      });

      // Streak calculation (consecutive days with at least 1 session)
      const sessionDates = new Set(sessions.map(s => (s.started_at as string).split("T")[0]));
      let maxStreak = 0;
      let currentStreak = 0;
      const today = new Date();
      for (let i = 0; i < 365; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
        if (sessionDates.has(dateStr)) {
          currentStreak++;
          if (currentStreak > maxStreak) maxStreak = currentStreak;
        } else if (i > 0) {
          break;
        }
      }

      // Perfect week: 7 sessions in last 7 days
      const last7 = new Set<string>();
      for (let i = 0; i < 7; i++) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        last7.add(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`);
      }
      const sessionsLast7 = sessions.filter(s => last7.has((s.started_at as string).split("T")[0]));
      const uniqueDaysLast7 = new Set(sessionsLast7.map(s => (s.started_at as string).split("T")[0])).size;

      // Fire month: 20+ sessions in any single calendar month
      const monthMap: Record<string, number> = {};
      sessions.forEach(s => {
        const monthKey = (s.started_at as string).slice(0, 7); // "YYYY-MM"
        monthMap[monthKey] = (monthMap[monthKey] ?? 0) + 1;
      });
      const maxMonth = Math.max(0, ...Object.values(monthMap));

      // Water streak: 7 consecutive days with water logged
      const waterDates = new Set(waterLogs.map(w => (w.date as string)));
      let waterStreak = 0;
      for (let i = 0; i < 30; i++) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        const ds = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
        if (waterDates.has(ds)) { waterStreak++; } else break;
      }

      // Early bird / Night owl
      const earlyBird = sessions.filter(s => {
        const h = new Date(s.started_at as string).getHours();
        return h < 8;
      }).length;
      const nightOwl = sessions.filter(s => {
        const h = new Date(s.started_at as string).getHours();
        return h >= 21;
      }).length;

      // Helper to set badge if condition met
      const maybeUnlock = (id: string, condition: boolean, date?: string) => {
        if (condition) {
          const ts = date ?? now.toISOString();
          map.set(id, ts);
        }
      };

      // First session date for time-based badges
      const firstSessionAt = sessions.length > 0
        ? sessions.sort((a, b) => (a.started_at as string).localeCompare(b.started_at as string))[0].started_at as string
        : undefined;

      maybeUnlock("first-session",          sessionCount >= 1,   firstSessionAt);
      maybeUnlock("ten-sessions",           sessionCount >= 10);
      maybeUnlock("fifty-sessions",         sessionCount >= 50);
      maybeUnlock("centurion",              sessionCount >= 100);
      maybeUnlock("cardio-king",            cardioSessions.length >= 10);
      maybeUnlock("force-brute",            muscleSessions.length >= 10);
      maybeUnlock("perfect-week",           uniqueDaysLast7 >= 7);
      maybeUnlock("fire-month",             maxMonth >= 20);
      maybeUnlock("pr-hunter",              prCount >= 1);
      maybeUnlock("pr-champion",            prCount >= 10);
      maybeUnlock("nutritionniste",         nutritionCount >= 30);
      maybeUnlock("hydrate",                waterStreak >= 7);
      maybeUnlock("nutrition-centurion",    nutritionCount >= 100);
      maybeUnlock("hundred-followers",      followerCount >= 100);
      maybeUnlock("influencer",             followerCount >= 500);
      maybeUnlock("sharer",                 postCount >= 10);
      maybeUnlock("viral",                  viralPosts.length >= 1);
      maybeUnlock("streak-7",              maxStreak >= 7);
      maybeUnlock("streak-30",             maxStreak >= 30);
      maybeUnlock("early-bird",            earlyBird >= 5);
      maybeUnlock("night-owl",             nightOwl >= 5);
    } catch {
      // silently fail — show locked badges
    }

    setUnlockedMap(map);
    setLoading(false);
  }

  const filteredBadges = activeCategory === "all"
    ? BADGES
    : BADGES.filter(b => b.category === activeCategory);

  const unlockedCount = BADGES.filter(b => unlockedMap.has(b.id)).length;

  return (
    <div className="flex flex-col gap-5">
      {/* Header stats */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl p-5 flex items-center justify-between"
        style={{
          background: "linear-gradient(135deg, rgba(var(--violet-mid-rgb),0.45) 0%, rgba(var(--cream-mid-rgb),0.45) 100%)",
          border: "1px solid rgba(var(--surface-rgb),0.8)",
          boxShadow: "inset 0 1px 0 rgba(var(--surface-rgb),0.9)",
        }}
      >
        <div>
          <p className="text-[10px] font-bold tracking-[0.18em] uppercase" style={{ color: "var(--text-3)" }}>
            Badges débloqués
          </p>
          <div className="flex items-end gap-1.5 mt-0.5">
            <span className="text-[2.2rem] font-extralight leading-none" style={{ color: "var(--text-0)" }}>
              {unlockedCount}
            </span>
            <span className="text-base font-light mb-0.5" style={{ color: "var(--text-3)" }}>
              / {BADGES.length}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-3xl leading-none">🏆</span>
          <div
            className="h-1.5 rounded-full overflow-hidden"
            style={{ width: 80, background: "rgba(var(--surface-rgb),0.5)" }}
          >
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.round((unlockedCount / BADGES.length) * 100)}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="h-full rounded-full"
              style={{ background: "linear-gradient(90deg, var(--violet-mid), var(--cream-mid))" }}
            />
          </div>
          <p className="text-[9px] font-semibold" style={{ color: "var(--text-3)" }}>
            {Math.round((unlockedCount / BADGES.length) * 100)}% complété
          </p>
        </div>
      </motion.div>

      {/* Category tabs */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="flex gap-2 overflow-x-auto pb-0.5"
        style={{ scrollbarWidth: "none" }}
      >
        {CATEGORY_TABS.map(({ id, label }) => {
          const count = id === "all"
            ? BADGES.filter(b => unlockedMap.has(b.id)).length
            : BADGES.filter(b => b.category === id && unlockedMap.has(b.id)).length;
          const total = id === "all" ? BADGES.length : BADGES.filter(b => b.category === id).length;
          return (
            <button
              key={id}
              onClick={() => setActiveCategory(id)}
              className="flex-shrink-0 px-4 py-2 rounded-2xl text-xs font-semibold cursor-pointer transition-all"
              style={
                activeCategory === id
                  ? { background: "linear-gradient(135deg, var(--violet-mid) 0%, var(--cream-mid) 100%)", color: "var(--text-1)", boxShadow: "inset 0 1px 0 rgba(var(--surface-rgb),0.9)" }
                  : { background: "rgba(var(--surface-rgb),0.5)", color: "var(--text-3)", border: "1px solid rgba(var(--surface-rgb),0.6)" }
              }
            >
              {label}
              <span className="ml-1.5 text-[9px] opacity-70">{count}/{total}</span>
            </button>
          );
        })}
      </motion.div>

      {/* Badge grid */}
      {loading ? (
        <div className="flex justify-center py-16">
          <motion.div
            className="w-6 h-6 rounded-full border-2"
            style={{ borderColor: "rgba(var(--accent-rgb),0.3)", borderTopColor: "var(--accent)" }}
            animate={{ rotate: 360 }}
            transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
          />
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          <motion.div
            key={activeCategory}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-2 sm:grid-cols-3 gap-3"
          >
            {filteredBadges
              .sort((a, b) => {
                // Unlocked first, then by rarity
                const aU = unlockedMap.has(a.id) ? 0 : 1;
                const bU = unlockedMap.has(b.id) ? 0 : 1;
                if (aU !== bU) return aU - bU;
                const rarityOrder = { legendary: 0, epic: 1, rare: 2, common: 3 };
                return rarityOrder[a.rarity] - rarityOrder[b.rarity];
              })
              .map(badge => (
                <BadgeCard
                  key={badge.id}
                  badge={badge}
                  unlockedAt={unlockedMap.get(badge.id)}
                />
              ))
            }
          </motion.div>
        </AnimatePresence>
      )}

      {/* Footer hint */}
      <p className="text-[10px] text-center font-light pb-2" style={{ color: "#C0C0C0" }}>
        Les badges se mettent à jour automatiquement selon ton activité
      </p>
    </div>
  );
}
