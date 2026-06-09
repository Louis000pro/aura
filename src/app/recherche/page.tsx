"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, X, ChevronRight, UserPlus, UserCheck,
  Hash, Clock, Zap, Dumbbell, Salad, Activity,
} from "lucide-react";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

/* ─── Types ─────────────────────────────────────────────────── */
type Profile = {
  id: string;
  pseudo: string;
  full_name?: string;
  bio?: string;
  avatar_url?: string;
};

type Session = {
  id: string;
  title: string;
  category: string;
  duration: number;
  difficulty: string;
  user_id: string;
};

type Tab = "tout" | "comptes" | "seances";

/* ─── Hardcoded trending tags ────────────────────────────────── */
const TRENDING_TAGS = [
  { tag: "#Force",     icon: <Dumbbell size={14} strokeWidth={1.5} />,  color: "#A78BFA" },
  { tag: "#Cardio",    icon: <Activity  size={14} strokeWidth={1.5} />,  color: "#F97316" },
  { tag: "#Nutrition", icon: <Salad     size={14} strokeWidth={1.5} />,  color: "#22C55E" },
  { tag: "#Mobilité",  icon: <Zap       size={14} strokeWidth={1.5} />,  color: "#EAB308" },
];

/* ─── Difficulty pill ────────────────────────────────────────── */
const DIFFICULTY_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  debutant:      { bg: "rgba(34,197,94,0.12)",  color: "#16A34A", label: "Débutant" },
  intermédiaire: { bg: "rgba(234,179,8,0.12)",  color: "#B45309", label: "Intermédiaire" },
  intermediaire: { bg: "rgba(234,179,8,0.12)",  color: "#B45309", label: "Intermédiaire" },
  avancé:        { bg: "rgba(239,68,68,0.12)",  color: "#DC2626", label: "Avancé" },
  avance:        { bg: "rgba(239,68,68,0.12)",  color: "#DC2626", label: "Avancé" },
};

function DifficultyPill({ difficulty }: { difficulty: string }) {
  const key = difficulty.toLowerCase();
  const style = DIFFICULTY_STYLE[key] ?? { bg: "rgba(167,139,250,0.12)", color: "#A78BFA", label: difficulty };
  return (
    <span
      className="text-[9px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full"
      style={{ background: style.bg, color: style.color }}
    >
      {style.label}
    </span>
  );
}

/* ─── Avatar ─────────────────────────────────────────────────── */
function ProfileAvatar({ profile }: { profile: Profile }) {
  return (
    <div
      className="w-11 h-11 rounded-full flex items-center justify-center text-lg font-semibold flex-shrink-0 overflow-hidden"
      style={{
        background: profile.avatar_url
          ? "transparent"
          : "linear-gradient(135deg,#D4C0FF 0%,#F5E6A3 100%)",
        boxShadow: "0 2px 8px rgba(167,139,250,0.2)",
        color: "#2D3748",
      }}
    >
      {profile.avatar_url
        // eslint-disable-next-line @next/next/no-img-element
        ? <img loading="lazy" decoding="async" src={profile.avatar_url} alt={profile.pseudo} className="w-full h-full object-cover" />
        : (profile.pseudo?.[0] ?? "?").toUpperCase()}
    </div>
  );
}

/* ─── Glass card wrapper ─────────────────────────────────────── */
const glassCard: React.CSSProperties = {
  background: "rgba(255,255,255,0.65)",
  backdropFilter: "blur(10px)",
  border: "1px solid rgba(255,255,255,0.75)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.85)",
};

/* ─── Follow button ──────────────────────────────────────────── */
function FollowButton({
  profileId,
  followingSet,
  onToggle,
}: {
  profileId: string;
  followingSet: Set<string>;
  onToggle: (id: string) => void;
}) {
  const isFollowing = followingSet.has(profileId);
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={(e) => { e.preventDefault(); onToggle(profileId); }}
      className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-medium cursor-pointer flex-shrink-0"
      style={
        isFollowing
          ? { background: "rgba(167,139,250,0.15)", color: "#A78BFA", border: "1px solid rgba(167,139,250,0.3)" }
          : { background: "linear-gradient(135deg,#D4C0FF 0%,#A78BFA 100%)", color: "#fff", border: "none" }
      }
    >
      {isFollowing
        ? <><UserCheck size={12} strokeWidth={2} /> Suivi</>
        : <><UserPlus  size={12} strokeWidth={2} /> Suivre</>}
    </motion.button>
  );
}

/* ─── Main page ──────────────────────────────────────────────── */
export default function RecherchePage() {
  const { user } = useAuth();

  const [query, setQuery]               = useState("");
  const [activeTab, setActiveTab]       = useState<Tab>("tout");
  const [profiles, setProfiles]         = useState<Profile[]>([]);
  const [sessions, setSessions]         = useState<Session[]>([]);
  const [loading, setLoading]           = useState(false);

  /* Empty-state data */
  const [suggested, setSuggested]       = useState<Profile[]>([]);
  const [suggestedLoading, setSuggestedLoading] = useState(false);

  /* Follow state: set of profile ids the current user follows */
  const [following, setFollowing]       = useState<Set<string>>(new Set());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Fetch suggested accounts & following list on mount */
  useEffect(() => {
    const supabase = createClient();
    setSuggestedLoading(true);

    supabase
      .from("profiles")
      .select("id, pseudo, full_name, bio, avatar_url")
      .order("created_at", { ascending: false })
      .limit(6)
      .then(({ data }) => {
        setSuggested((data ?? []) as Profile[]);
        setSuggestedLoading(false);
      });

    if (user) {
      supabase
        .from("followers")
        .select("following_id")
        .eq("follower_id", user.id)
        .then(({ data }) => {
          if (data) setFollowing(new Set(data.map((r) => r.following_id)));
        });
    }
  }, [user]);

  /* Search with debounce */
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();

    if (!q) {
      setProfiles([]);
      setSessions([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      const supabase = createClient();

      const [profilesRes, sessionsRes] = await Promise.all([
        (activeTab === "seances")
          ? Promise.resolve({ data: [] })
          : supabase
              .from("profiles")
              .select("id, pseudo, full_name, bio, avatar_url")
              .or(`pseudo.ilike.%${q}%,full_name.ilike.%${q}%`)
              .limit(20),
        (activeTab === "comptes")
          ? Promise.resolve({ data: [] })
          : supabase
              .from("custom_sessions")
              .select("id, title, category, duration, difficulty, user_id")
              .ilike("title", `%${q}%`)
              .eq("visibility", "public")
              .limit(20),
      ]);

      setProfiles((profilesRes.data ?? []) as Profile[]);
      setSessions((sessionsRes.data ?? []) as Session[]);
      setLoading(false);
    }, 300);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, activeTab]);

  /* Toggle follow */
  const toggleFollow = useCallback(async (profileId: string) => {
    if (!user) return;
    const supabase = createClient();
    const isFollowing = following.has(profileId);

    setFollowing((prev) => {
      const next = new Set(prev);
      if (isFollowing) next.delete(profileId); else next.add(profileId);
      return next;
    });

    if (isFollowing) {
      await supabase
        .from("followers")
        .delete()
        .eq("follower_id", user.id)
        .eq("following_id", profileId);
    } else {
      await supabase
        .from("followers")
        .insert({ follower_id: user.id, following_id: profileId });
    }
  }, [user, following]);

  const hasQuery = query.trim().length > 0;
  const showProfiles = activeTab !== "seances";
  const showSessions = activeTab !== "comptes";

  const visibleProfiles = showProfiles ? profiles : [];
  const visibleSessions = showSessions ? sessions : [];
  const hasResults = visibleProfiles.length > 0 || visibleSessions.length > 0;

  return (
    <div className="min-h-screen relative overflow-hidden px-6 pt-10 pb-32 md:pl-28 md:pr-10 md:pt-10 md:pb-10">
      <motion.div
        className="relative z-10 max-w-lg mx-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
      >
        {/* Title */}
        <div className="mb-6">
          <p className="text-[10px] font-semibold tracking-[0.2em] uppercase mb-1" style={{ color: "#A0AEC0" }}>
            Découvrir
          </p>
          <h1 className="text-2xl font-extralight" style={{ color: "#2D3748" }}>Recherche</h1>
        </div>

        {/* Search bar */}
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-2xl mb-4"
          style={{
            background: "rgba(255,255,255,0.75)",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255,255,255,0.8)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9), 0 4px 24px rgba(167,139,250,0.08)",
          }}
        >
          <Search size={16} strokeWidth={1.5} style={{ color: "#A0AEC0", flexShrink: 0 }} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Chercher un compte, une séance…"
            autoFocus
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-[#A0AEC0]"
            style={{ color: "#2D3748" }}
          />
          <AnimatePresence>
            {query && (
              <motion.button
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.7 }}
                onClick={() => setQuery("")}
                className="cursor-pointer flex-shrink-0"
              >
                <X size={14} strokeWidth={2} style={{ color: "#A0AEC0" }} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Tab pills */}
        <div className="flex gap-2 mb-5">
          {(["tout", "comptes", "seances"] as Tab[]).map((tab) => {
            const labels: Record<Tab, string> = { tout: "Tout", comptes: "Comptes", seances: "Séances" };
            const active = activeTab === tab;
            return (
              <motion.button
                key={tab}
                whileTap={{ scale: 0.94 }}
                onClick={() => setActiveTab(tab)}
                className="px-3.5 py-1.5 rounded-full text-[12px] font-medium cursor-pointer transition-all"
                style={
                  active
                    ? {
                        background: "linear-gradient(135deg,#D4C0FF 0%,#A78BFA 100%)",
                        color: "#fff",
                        boxShadow: "0 2px 8px rgba(167,139,250,0.35)",
                      }
                    : {
                        background: "rgba(255,255,255,0.65)",
                        color: "#A0AEC0",
                        border: "1px solid rgba(255,255,255,0.75)",
                      }
                }
              >
                {labels[tab]}
              </motion.button>
            );
          })}
        </div>

        {/* ── EMPTY QUERY STATE ── */}
        <AnimatePresence mode="popLayout">
          {!hasQuery && (
            <motion.div
              key="discover"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              {/* Trending tags */}
              <div className="mb-6">
                <p className="text-[10px] font-semibold tracking-[0.2em] uppercase mb-3" style={{ color: "#A0AEC0" }}>
                  Tendances
                </p>
                <div className="flex gap-2 flex-wrap">
                  {TRENDING_TAGS.map(({ tag, icon, color }) => (
                    <motion.button
                      key={tag}
                      whileHover={{ y: -1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setQuery(tag)}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl cursor-pointer"
                      style={{
                        background: "rgba(255,255,255,0.7)",
                        backdropFilter: "blur(16px)",
                        border: "1px solid rgba(255,255,255,0.8)",
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)",
                      }}
                    >
                      <Hash size={12} style={{ color }} />
                      <span className="text-[12px] font-medium" style={{ color }}>
                        {tag.slice(1)}
                      </span>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Suggested accounts */}
              <div>
                <p className="text-[10px] font-semibold tracking-[0.2em] uppercase mb-3" style={{ color: "#A0AEC0" }}>
                  Comptes suggérés
                </p>

                {suggestedLoading && (
                  <div className="flex justify-center py-8">
                    <motion.div
                      className="w-5 h-5 rounded-full border-2"
                      style={{ borderColor: "rgba(167,139,250,0.2)", borderTopColor: "#A78BFA" }}
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                    />
                  </div>
                )}

                {!suggestedLoading && suggested.length === 0 && (
                  <div className="flex flex-col items-center py-10 gap-3">
                    <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl"
                      style={{ background: "linear-gradient(135deg, rgba(240,235,255,0.8) 0%, rgba(255,251,240,0.8) 100%)", boxShadow: "0 4px 16px rgba(167,139,250,0.15)" }}>
                      🌱
                    </div>
                    <p className="text-sm font-light text-center" style={{ color: "#A0AEC0" }}>
                      La communauté grandit 💜<br />Reviens bientôt pour découvrir de nouveaux membres
                    </p>
                  </div>
                )}

                {!suggestedLoading && suggested.map((profile, i) => (
                  <motion.div
                    key={profile.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <Link href={`/profil/${encodeURIComponent(profile.pseudo)}`}>
                      <motion.div
                        whileHover={{ y: -2, transition: { duration: 0.15 } }}
                        whileTap={{ scale: 0.98 }}
                        className="flex items-center gap-3 px-4 py-3.5 rounded-2xl mb-2 cursor-pointer"
                        style={glassCard}
                      >
                        <ProfileAvatar profile={profile} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate" style={{ color: "#2D3748" }}>
                            {profile.full_name || profile.pseudo}
                          </p>
                          <p className="text-[11px] font-light truncate" style={{ color: "#A78BFA" }}>
                            @{profile.pseudo}
                          </p>
                        </div>
                        {user && user.id !== profile.id && (
                          <FollowButton
                            profileId={profile.id}
                            followingSet={following}
                            onToggle={toggleFollow}
                          />
                        )}
                      </motion.div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── LOADING STATE ── */}
          {loading && hasQuery && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex justify-center py-10">
              <motion.div
                className="w-6 h-6 rounded-full border-2"
                style={{ borderColor: "rgba(167,139,250,0.2)", borderTopColor: "#A78BFA" }}
                animate={{ rotate: 360 }}
                transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
              />
            </motion.div>
          )}

          {/* ── NO RESULTS ── */}
          {!loading && hasQuery && !hasResults && (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center py-16 gap-3">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl"
                style={{ background: "rgba(240,235,255,0.6)" }}>
                {activeTab === "seances" ? "🏋️" : "👤"}
              </div>
              <p className="text-sm font-light text-center" style={{ color: "#A0AEC0" }}>
                Aucun résultat pour «{" "}{query}{" "}»
              </p>
            </motion.div>
          )}

          {/* ── RESULTS ── */}
          {!loading && hasQuery && hasResults && (
            <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>

              {/* Profile results */}
              {visibleProfiles.length > 0 && (
                <div className="mb-5">
                  {activeTab === "tout" && (
                    <p className="text-[10px] font-semibold tracking-[0.2em] uppercase mb-2" style={{ color: "#A0AEC0" }}>
                      Comptes
                    </p>
                  )}
                  {visibleProfiles.map((profile, i) => (
                    <motion.div
                      key={profile.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ delay: i * 0.04, duration: 0.25 }}
                    >
                      <Link href={`/profil/${encodeURIComponent(profile.pseudo)}`}>
                        <motion.div
                          whileHover={{ y: -2, transition: { duration: 0.15 } }}
                          whileTap={{ scale: 0.98 }}
                          className="flex items-center gap-4 px-4 py-3.5 rounded-2xl mb-2 cursor-pointer"
                          style={glassCard}
                        >
                          <ProfileAvatar profile={profile} />

                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate" style={{ color: "#2D3748" }}>
                              {profile.full_name || profile.pseudo}
                            </p>
                            <p className="text-[11px] font-light truncate" style={{ color: "#A78BFA" }}>
                              @{profile.pseudo}
                            </p>
                            {profile.bio && (
                              <p className="text-[10px] truncate mt-0.5" style={{ color: "#A0AEC0" }}>
                                {profile.bio}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            {user && user.id !== profile.id && (
                              <FollowButton
                                profileId={profile.id}
                                followingSet={following}
                                onToggle={toggleFollow}
                              />
                            )}
                            <ChevronRight size={14} strokeWidth={1.5} style={{ color: "#A0AEC0" }} />
                          </div>
                        </motion.div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Session results */}
              {visibleSessions.length > 0 && (
                <div>
                  {activeTab === "tout" && (
                    <p className="text-[10px] font-semibold tracking-[0.2em] uppercase mb-2" style={{ color: "#A0AEC0" }}>
                      Séances
                    </p>
                  )}
                  {visibleSessions.map((session, i) => (
                    <motion.div
                      key={session.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ delay: i * 0.04, duration: 0.25 }}
                    >
                      <motion.div
                        whileHover={{ y: -2, transition: { duration: 0.15 } }}
                        whileTap={{ scale: 0.98 }}
                        className="flex items-center gap-4 px-4 py-3.5 rounded-2xl mb-2 cursor-pointer"
                        style={glassCard}
                      >
                        {/* Icon */}
                        <div
                          className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
                          style={{ background: "linear-gradient(135deg,rgba(212,192,255,0.4) 0%,rgba(245,230,163,0.4) 100%)" }}
                        >
                          <Dumbbell size={18} strokeWidth={1.5} style={{ color: "#A78BFA" }} />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate" style={{ color: "#2D3748" }}>
                            {session.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {session.category && (
                              <span
                                className="text-[9px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full"
                                style={{ background: "rgba(212,192,255,0.35)", color: "#A78BFA" }}
                              >
                                {session.category}
                              </span>
                            )}
                            {session.difficulty && <DifficultyPill difficulty={session.difficulty} />}
                            {session.duration > 0 && (
                              <span className="flex items-center gap-1 text-[10px]" style={{ color: "#A0AEC0" }}>
                                <Clock size={10} strokeWidth={1.5} />
                                {session.duration} min
                              </span>
                            )}
                          </div>
                        </div>

                        <ChevronRight size={14} strokeWidth={1.5} style={{ color: "#A0AEC0", flexShrink: 0 }} />
                      </motion.div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
