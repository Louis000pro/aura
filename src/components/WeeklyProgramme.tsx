"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, ChevronDown, ChevronUp, Dumbbell, Settings } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

/* ─── Types ─── */
type WorkoutDay = {
  jour: string;
  type: "Repos" | "Cardio" | "Force" | "Mobilité" | "HIIT" | "Endurance" | "Full Body" | "Haut du corps" | "Bas du corps" | string;
  titre: string;
  exercices: string[];
  duree: string;
};

type Programme = {
  semaine: WorkoutDay[];
};

type ProfileData = {
  onboarding_level: string | null;
  onboarding_sessions_week: number | null;
  onboarding_goals: string[] | null;
  onboarding_age: number | null;
  onboarding_weight: number | null;
};

/* ─── Badge styles by type ─── */
function getBadgeStyle(type: string): React.CSSProperties {
  const t = type.toLowerCase();
  if (t === "repos") return { background: "rgba(160,174,192,0.15)", color: "#718096", borderRadius: 999, padding: "2px 10px", fontSize: 11, fontWeight: 600 };
  if (t === "cardio" || t === "endurance") return { background: "rgba(96,165,250,0.15)", color: "#2563EB", borderRadius: 999, padding: "2px 10px", fontSize: 11, fontWeight: 600 };
  if (t === "force" || t === "haut du corps" || t === "bas du corps") return { background: "rgba(167,139,250,0.15)", color: "#7C3AED", borderRadius: 999, padding: "2px 10px", fontSize: 11, fontWeight: 600 };
  if (t === "hiit") return { background: "rgba(252,129,129,0.15)", color: "#DC2626", borderRadius: 999, padding: "2px 10px", fontSize: 11, fontWeight: 600 };
  if (t === "mobilité") return { background: "rgba(52,211,153,0.15)", color: "#059669", borderRadius: 999, padding: "2px 10px", fontSize: 11, fontWeight: 600 };
  if (t === "full body") return { background: "rgba(251,191,36,0.15)", color: "#D97706", borderRadius: 999, padding: "2px 10px", fontSize: 11, fontWeight: 600 };
  // default
  return { background: "rgba(167,139,250,0.15)", color: "#7C3AED", borderRadius: 999, padding: "2px 10px", fontSize: 11, fontWeight: 600 };
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

/* ─── Cache helpers ─── */
function getCacheKey(userId: string): string {
  const now = new Date();
  // ISO week number
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const week = Math.ceil(((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
  return `aura_programme_${userId}_w${week}_${now.getFullYear()}`;
}

function loadFromCache(key: string): Programme | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as Programme;
  } catch {
    return null;
  }
}

function saveToCache(key: string, data: Programme): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch { /* ignore */ }
}

/* ─── Skeleton card ─── */
function SkeletonCard() {
  return (
    <div
      className="rounded-2xl p-4 flex-shrink-0"
      style={{
        background: "rgba(255,255,255,0.7)",
        backdropFilter: "blur(12px)",
        boxShadow: "0 4px 24px rgba(167,139,250,0.1), inset 0 1px 0 rgba(255,255,255,0.8)",
        minWidth: 130,
        width: 130,
      }}
    >
      <motion.div
        className="rounded-full mb-3"
        style={{ height: 10, width: "55%", background: "rgba(167,139,250,0.12)" }}
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="rounded-full mb-2"
        style={{ height: 18, width: "70%", background: "rgba(167,139,250,0.09)" }}
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut", delay: 0.15 }}
      />
      <motion.div
        className="rounded-full"
        style={{ height: 10, width: "45%", background: "rgba(167,139,250,0.07)" }}
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
      />
    </div>
  );
}

/* ─── Day Card ─── */
function DayCard({ day, index }: { day: WorkoutDay; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const isRest = day.type.toLowerCase() === "repos";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 * index, type: "spring", bounce: 0.3 }}
      className="rounded-2xl p-4 flex-shrink-0 cursor-pointer select-none"
      style={{
        background: "rgba(255,255,255,0.7)",
        backdropFilter: "blur(12px)",
        boxShadow: expanded
          ? "0 6px 28px rgba(167,139,250,0.18), inset 0 1px 0 rgba(255,255,255,0.9)"
          : "0 4px 24px rgba(167,139,250,0.1), inset 0 1px 0 rgba(255,255,255,0.8)",
        minWidth: 130,
        width: 130,
        transition: "box-shadow 0.2s",
      }}
      onClick={() => !isRest && setExpanded((v) => !v)}
      whileHover={!isRest ? { y: -2, scale: 1.02, transition: { duration: 0.15 } } : {}}
      whileTap={!isRest ? { scale: 0.97, transition: { duration: 0.08 } } : {}}
    >
      {/* Day name */}
      <p
        className="text-[10px] font-semibold tracking-widest uppercase mb-2"
        style={{ color: "#A0AEC0" }}
      >
        {day.jour}
      </p>

      {/* Badge */}
      <span style={getBadgeStyle(day.type)}>{day.type}</span>

      {/* Title */}
      {!isRest && (
        <p
          className="text-xs font-medium mt-2 leading-snug"
          style={{ color: "#2D3748" }}
        >
          {day.titre}
        </p>
      )}

      {/* Duration */}
      {day.duree && !isRest && (
        <p className="text-[10px] mt-1.5" style={{ color: "#A0AEC0" }}>
          {day.duree}
        </p>
      )}

      {/* Expand hint */}
      {!isRest && (
        <div className="flex items-center justify-end mt-2">
          {expanded ? (
            <ChevronUp size={12} strokeWidth={2} style={{ color: "#A78BFA" }} />
          ) : (
            <ChevronDown size={12} strokeWidth={2} style={{ color: "#A0AEC0" }} />
          )}
        </div>
      )}

      {/* Exercises (expanded) */}
      <AnimatePresence>
        {expanded && !isRest && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            style={{ overflow: "hidden" }}
          >
            <div
              className="mt-3 pt-3"
              style={{ borderTop: "1px solid rgba(167,139,250,0.12)" }}
            >
              {day.exercices?.map((ex, i) => (
                <div key={i} className="flex items-start gap-1.5 mb-1.5">
                  <div
                    className="rounded-full flex-shrink-0 mt-1"
                    style={{ width: 4, height: 4, background: "#A78BFA", opacity: 0.7 }}
                  />
                  <p className="text-[10px] leading-snug" style={{ color: "#4A5568" }}>
                    {ex}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ─── Main Component ─── */
export default function WeeklyProgramme() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [programme, setProgramme] = useState<Programme | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ── Fetch profile ── */
  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    supabase
      .from("profiles")
      .select("onboarding_level, onboarding_sessions_week, onboarding_goals, onboarding_age, onboarding_weight")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data, error: err }) => {
        if (!err && data) {
          setProfile(data as ProfileData);
        }
        setProfileLoaded(true);
      });
  }, [user]);

  /* ── Generate programme ── */
  const generate = useCallback(
    async (force = false) => {
      if (!user || !profile) return;

      // Check cache first (unless forced)
      const cacheKey = getCacheKey(user.id);
      if (!force) {
        const cached = loadFromCache(cacheKey);
        if (cached) {
          setProgramme(cached);
          return;
        }
      }

      setLoading(true);
      setError(null);

      const level = profile.onboarding_level ?? "intermédiaire";
      const sessions = profile.onboarding_sessions_week ?? 3;
      const goals = (profile.onboarding_goals ?? [])
        .map((g) => goalLabels[g] ?? g)
        .join(", ") || "forme générale";

      const prompt = `Tu es un coach sportif expert. Génère un programme hebdomadaire personnalisé en JSON pour cet utilisateur:
- Niveau: ${level}
- Objectifs: ${goals}
- Séances/semaine: ${sessions}
Réponds UNIQUEMENT avec un JSON valide de cette forme:
{ "semaine": [ { "jour": "Lundi", "type": "Repos", "titre": "", "exercices": [], "duree": "" }, { "jour": "Mardi", "type": "Force", "titre": "Push Day", "exercices": ["Développé couché 4x8", "Pompes 3x12", "Élévations latérales 3x15"], "duree": "45 min" } ] }
Maximum 7 jours, exactement ${sessions} séances actives, le reste en Repos.
Pour les jours de repos: type "Repos", titre "", exercices [], duree "".`;

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [{ role: "user", content: prompt }],
          }),
        });

        if (!response.ok || !response.body) throw new Error("API error");

        // Consume the full stream
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          fullText += decoder.decode(value, { stream: true });
        }

        // Extract JSON from the response
        const match = fullText.match(/\{[\s\S]*\}/);
        if (!match) throw new Error("No JSON found in response");

        const parsed: Programme = JSON.parse(match[0]);

        // Validate basic structure
        if (!parsed.semaine || !Array.isArray(parsed.semaine)) {
          throw new Error("Invalid programme structure");
        }

        saveToCache(cacheKey, parsed);
        setProgramme(parsed);
      } catch (err) {
        console.error("Programme generation error:", err);
        setError("Impossible de générer le programme. Réessaie.");
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

  /* ── No profile data ── */
  const hasOnboardingData =
    profile &&
    (profile.onboarding_level ||
      profile.onboarding_sessions_week ||
      (profile.onboarding_goals && profile.onboarding_goals.length > 0));

  if (profileLoaded && !hasOnboardingData) {
    return (
      <div className="px-6 pb-4">
        <p
          className="text-lg font-light mb-3"
          style={{ color: "#2D3748" }}
        >
          Programme auto-généré
        </p>
        <div
          className="rounded-2xl p-5 flex items-center gap-4"
          style={{
            background: "rgba(255,255,255,0.7)",
            backdropFilter: "blur(12px)",
            boxShadow:
              "0 4px 24px rgba(167,139,250,0.1), inset 0 1px 0 rgba(255,255,255,0.8)",
          }}
        >
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(167,139,250,0.12)" }}
          >
            <Dumbbell size={18} strokeWidth={1.5} style={{ color: "#A78BFA" }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium mb-0.5" style={{ color: "#2D3748" }}>
              Complète ton profil pour obtenir ton programme
            </p>
            <p className="text-xs font-light" style={{ color: "#A0AEC0" }}>
              Niveau, objectifs et fréquence requis
            </p>
          </div>
          <Link href="/parametres">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl"
              style={{
                background: "linear-gradient(135deg,#D4C0FF 0%,#F5E6A3 100%)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)",
              }}
            >
              <Settings size={12} strokeWidth={2} style={{ color: "#2D3748" }} />
              <span className="text-xs font-semibold" style={{ color: "#2D3748" }}>
                Réglages
              </span>
            </motion.div>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 pb-4">
      {/* Section header */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-lg font-light" style={{ color: "#2D3748" }}>
          Programme auto-généré
        </p>
        {programme && !loading && (
          <motion.button
            whileHover={{ scale: 1.06, rotate: 15 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => generate(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl cursor-pointer"
            style={{
              background: "rgba(167,139,250,0.1)",
              border: "1px solid rgba(167,139,250,0.2)",
            }}
          >
            <RefreshCw size={11} strokeWidth={2.5} style={{ color: "#A78BFA" }} />
            <span
              className="text-[10px] font-semibold tracking-wide"
              style={{ color: "#A78BFA" }}
            >
              Régénérer
            </span>
          </motion.button>
        )}
      </div>

      {/* Error state */}
      {error && !loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-2xl p-4 mb-3 flex items-center justify-between"
          style={{
            background: "rgba(252,129,129,0.08)",
            border: "1px solid rgba(252,129,129,0.2)",
          }}
        >
          <p className="text-xs" style={{ color: "#DC2626" }}>
            {error}
          </p>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => generate(true)}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg cursor-pointer"
            style={{ background: "rgba(252,129,129,0.15)", color: "#DC2626" }}
          >
            Réessayer
          </motion.button>
        </motion.div>
      )}

      {/* Cards scroll area */}
      <div
        className="flex gap-3 overflow-x-auto pb-2"
        style={{ scrollbarWidth: "none" }}
      >
        {/* Loading skeletons */}
        {loading &&
          Array.from({ length: 7 }).map((_, i) => <SkeletonCard key={i} />)}

        {/* Programme cards */}
        {!loading &&
          programme?.semaine?.map((day, i) => (
            <DayCard key={`${day.jour}-${i}`} day={day} index={i} />
          ))}

        {/* Initial loading (profile loaded, no programme yet, not loading) */}
        {!loading && !programme && profileLoaded && hasOnboardingData && (
          Array.from({ length: 7 }).map((_, i) => <SkeletonCard key={i} />)
        )}
      </div>

      {/* Tap hint */}
      {programme && !loading && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-[10px] mt-1.5"
          style={{ color: "#A0AEC0" }}
        >
          Appuie sur une séance pour voir les exercices
        </motion.p>
      )}
    </div>
  );
}
