"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, TrendingUp, Sparkles, UserPlus, UserCheck, ArrowLeft, Swords, Hash } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

/* ─── Profile type ──────────────────────────────────────── */
type Profile = {
  id: string;
  pseudo: string;
  full_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  mutual_count?: number;
  follower_count?: number;
};

/* ─── Challenge type ────────────────────────────────────── */
type ChallengeCategory = "musculation" | "cardio" | "yoga" | "nutrition" | "mobilite" | "course";
type ChallengeDifficulty = "facile" | "moyen" | "difficile";
type ChallengeDuration = "7j" | "14j" | "30j";

type Challenge = {
  id: string;
  title: string;
  description: string;
  participants: number;
  category: ChallengeCategory;
  difficulty: ChallengeDifficulty;
  duration: ChallengeDuration;
  gradient: string;
  emoji: string;
};

/* ─── Hardcoded challenges ──────────────────────────────── */
const CHALLENGES: Challenge[] = [
  {
    id: "30j-squat",
    title: "30 Jours de Squats",
    description: "Commence à 20 squats le jour 1 et progresse jusqu'à 200 à la fin du mois. Un défi qui transforme les jambes.",
    participants: 1243,
    category: "musculation",
    difficulty: "moyen",
    duration: "30j",
    gradient: "linear-gradient(135deg, var(--accent) 0%, #7C3AED 100%)",
    emoji: "🏋️",
  },
  {
    id: "7j-planche",
    title: "Défi Planche 7 Jours",
    description: "Tiens la planche chaque jour, en augmentant de 15 secondes. Renforce ton core en une semaine.",
    participants: 876,
    category: "musculation",
    difficulty: "facile",
    duration: "7j",
    gradient: "linear-gradient(135deg, var(--cream-mid) 0%, var(--gold) 100%)",
    emoji: "💪",
  },
  {
    id: "30j-course",
    title: "Run Every Day",
    description: "Cours au moins 20 minutes chaque jour pendant 30 jours. Peu importe l'allure — l'essentiel est de sortir.",
    participants: 2187,
    category: "course",
    difficulty: "moyen",
    duration: "30j",
    gradient: "linear-gradient(135deg, #38BDF8 0%, #0369A1 100%)",
    emoji: "🏃",
  },
  {
    id: "7j-yoga",
    title: "Semaine Yoga Flow",
    description: "Une séance de yoga de 20 min chaque matin pendant 7 jours. Flexibilité et sérénité garanties.",
    participants: 534,
    category: "yoga",
    difficulty: "facile",
    duration: "7j",
    gradient: "linear-gradient(135deg, #6EE7B7 0%, #059669 100%)",
    emoji: "🧘",
  },
  {
    id: "14j-hiit",
    title: "HIIT 14 Jours",
    description: "Un circuit HIIT de 25 minutes tous les deux jours. 7 séances pour brûler un maximum et booster ton cardio.",
    participants: 689,
    category: "cardio",
    difficulty: "difficile",
    duration: "14j",
    gradient: "linear-gradient(135deg, #FCA5A5 0%, #DC2626 100%)",
    emoji: "🔥",
  },
  {
    id: "30j-proteines",
    title: "Protéines Challenge",
    description: "Atteins ton objectif protéique chaque jour pendant 30 jours. Log ta nutrition et vois tes muscles se définir.",
    participants: 412,
    category: "nutrition",
    difficulty: "moyen",
    duration: "30j",
    gradient: "linear-gradient(135deg, #FDE68A 0%, #F59E0B 100%)",
    emoji: "🥩",
  },
  {
    id: "7j-mobilite",
    title: "Mobilité Matinale",
    description: "10 minutes de mobilité au réveil pendant 7 jours. Articulations souples, journée légère.",
    participants: 298,
    category: "mobilite",
    difficulty: "facile",
    duration: "7j",
    gradient: "linear-gradient(135deg, #C4B5FD 0%, #8B5CF6 100%)",
    emoji: "🌅",
  },
  {
    id: "30j-pull",
    title: "100 Tractions en 30 Jours",
    description: "Passe de 0 à 100 tractions en un mois. Programme progressif inclus. Le dos de tes rêves t'attend.",
    participants: 1056,
    category: "musculation",
    difficulty: "difficile",
    duration: "30j",
    gradient: "linear-gradient(135deg, #818CF8 0%, #4338CA 100%)",
    emoji: "🦵",
  },
];

/* ─── Style helpers ─────────────────────────────────────── */
const categoryConfig: Record<ChallengeCategory, { label: string; color: string; bg: string }> = {
  // Système D — musculation = violet, cardio/course = orange (énergie), yoga/mobilité/nutrition = teal (corps/bien-être)
  musculation: { label: "Musculation", color: "#8B5CF6", bg: "rgba(139,92,246,0.15)" },
  cardio:      { label: "Cardio",      color: "#E8620C", bg: "rgba(232,98,12,0.15)"  },
  yoga:        { label: "Yoga",        color: "#2BD4A0", bg: "rgba(43,212,160,0.15)" },
  nutrition:   { label: "Nutrition",   color: "#2BD4A0", bg: "rgba(43,212,160,0.15)" },
  mobilite:    { label: "Mobilité",    color: "#2BD4A0", bg: "rgba(43,212,160,0.15)" },
  course:      { label: "Course",      color: "#E8620C", bg: "rgba(232,98,12,0.15)"  },
};

const difficultyConfig: Record<ChallengeDifficulty, { label: string; color: string; bg: string }> = {
  // Système D — échelle d'intensité : facile = teal, moyen = orange, difficile = rouge (danger conservé)
  facile:    { label: "Facile",    color: "#2BD4A0", bg: "rgba(43,212,160,0.15)"  },
  moyen:     { label: "Moyen",     color: "#E8620C", bg: "rgba(232,98,12,0.15)"   },
  difficile: { label: "Difficile", color: "#F87171", bg: "rgba(248,113,113,0.15)" },
};

const sectionGradients = [
  "linear-gradient(135deg, var(--violet-mid) 0%, var(--accent) 100%)",
  "linear-gradient(135deg, var(--cream-mid) 0%, var(--gold) 100%)",
  "linear-gradient(135deg, var(--violet-mid) 0%, var(--cream-mid) 100%)",
  "linear-gradient(135deg, #F0EBFF 0%, var(--violet-mid) 100%)",
  "linear-gradient(135deg, #FFFBF0 0%, var(--cream-mid) 100%)",
];

function avatarGradient(id: string) {
  return sectionGradients[id.charCodeAt(0) % sectionGradients.length];
}

/* ─── ProfileCard ───────────────────────────────────────── */
function ProfileCard({
  profile,
  isFollowing,
  onFollow,
  showMutual = false,
}: {
  profile: Profile;
  isFollowing: boolean;
  onFollow: (profile: Profile) => void;
  showMutual?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="lg-surface lg-highlight relative flex items-center gap-3 px-4 py-3 rounded-2xl"
    >
      <Link href={`/profil/${encodeURIComponent(profile.pseudo)}`} className="flex-shrink-0">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center font-semibold text-base overflow-hidden"
          style={{ background: profile.avatar_url ? "transparent" : avatarGradient(profile.id), color: "var(--text-1)", boxShadow: "inset 0 1px 0 rgba(var(--surface-rgb),0.9)" }}
        >
          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img loading="lazy" decoding="async" src={profile.avatar_url} alt={profile.pseudo} className="w-full h-full object-cover" />
          ) : (
            (profile.pseudo?.[0] ?? "?").toUpperCase()
          )}
        </div>
      </Link>

      <Link href={`/profil/${encodeURIComponent(profile.pseudo)}`} className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate" style={{ color: "var(--text-1)" }}>
          {profile.full_name || profile.pseudo}
        </p>
        <p className="text-[11px]" style={{ color: "var(--accent)" }}>@{profile.pseudo}</p>
        {showMutual && (profile.mutual_count ?? 0) > 0 ? (
          <p className="text-[10px] mt-0.5" style={{ color: "var(--text-3)" }}>
            {profile.mutual_count} ami{(profile.mutual_count ?? 0) > 1 ? "s" : ""} en commun
          </p>
        ) : profile.bio ? (
          <p className="text-[10px] truncate mt-0.5" style={{ color: "var(--text-3)" }}>{profile.bio}</p>
        ) : null}
      </Link>

      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => onFollow(profile)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer flex-shrink-0"
        style={
          isFollowing
            ? { background: "rgba(var(--tint-violet-rgb),0.7)", color: "var(--accent)", border: "1px solid rgba(var(--accent-rgb),0.2)" }
            : { background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", color: "#fff", boxShadow: "inset 0 1px 0 rgba(var(--surface-rgb),0.8)" }
        }
      >
        {isFollowing
          ? <><UserCheck size={12} strokeWidth={2} /> Suivi</>
          : <><UserPlus size={12} strokeWidth={2} /> Suivre</>}
      </motion.button>
    </motion.div>
  );
}

/* ─── ChallengeCard ─────────────────────────────────────── */
function ChallengeCard({ challenge }: { challenge: Challenge }) {
  const [joined, setJoined] = useState(false);
  const [count, setCount] = useState(challenge.participants);
  const cat = categoryConfig[challenge.category];
  const diff = difficultyConfig[challenge.difficulty];

  const handleJoin = () => {
    setJoined(j => !j);
    setCount(c => joined ? c - 1 : c + 1);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl overflow-hidden flex flex-col cv-auto"
      style={{
        background: "rgba(var(--surface-rgb),0.8)",
        backdropFilter: "blur(10px)",
        border: "1px solid rgba(var(--surface-rgb),0.88)",
        boxShadow: "inset 0 1px 0 rgba(var(--surface-rgb),0.95), 0 4px 24px rgba(0,0,0,0.05)",
      }}
    >
      {/* Gradient header */}
      <div
        className="px-4 pt-4 pb-3 flex items-start gap-3"
        style={{ backgroundImage: challenge.gradient }}
      >
        <div
          className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 text-2xl leading-none"
          style={{ background: "rgba(var(--surface-rgb),0.3)", backdropFilter: "blur(6px)", boxShadow: "inset 0 1px 0 rgba(var(--surface-rgb),0.6)" }}
        >
          {challenge.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold leading-tight" style={{ color: "#fff", textShadow: "0 1px 3px rgba(0,0,0,0.2)" }}>
            {challenge.title}
          </h3>
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            <span
              className="text-[9px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-full"
              style={{ background: "rgba(255,255,255,0.25)", color: "#fff", backdropFilter: "blur(4px)" }}
            >
              {cat.label}
            </span>
            <span
              className="text-[9px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-full"
              style={{ background: "rgba(255,255,255,0.25)", color: "#fff", backdropFilter: "blur(4px)" }}
            >
              {diff.label}
            </span>
            <span
              className="text-[9px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-full"
              style={{ background: "rgba(255,255,255,0.25)", color: "#fff", backdropFilter: "blur(4px)" }}
            >
              {challenge.duration}
            </span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 py-3 flex flex-col gap-3">
        <p className="text-xs font-light leading-relaxed" style={{ color: "var(--text-body)" }}>
          {challenge.description}
        </p>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center"
              style={{ background: cat.bg }}
            >
              <Users size={10} strokeWidth={2} style={{ color: cat.color }} />
            </div>
            <span className="text-[11px] font-semibold" style={{ color: "var(--text-2)" }}>
              {count.toLocaleString("fr-FR")} participant{count > 1 ? "s" : ""}
            </span>
          </div>

          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={handleJoin}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer"
            style={
              joined
                ? { background: "rgba(var(--tint-violet-rgb),0.8)", color: "var(--accent)", border: "1px solid rgba(var(--accent-rgb),0.25)" }
                : { background: challenge.gradient, color: "#fff", boxShadow: "0 3px 12px rgba(0,0,0,0.15)" }
            }
          >
            {joined ? (
              <><UserCheck size={12} strokeWidth={2} /> Rejoint</>
            ) : (
              <><Swords size={12} strokeWidth={2} /> Rejoindre</>
            )}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── HashtagChip ───────────────────────────────────────── */
function HashtagChip({ tag, count }: { tag: string; count: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileTap={{ scale: 0.95 }}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl cursor-pointer flex-shrink-0"
      style={{
        background: "rgba(var(--surface-rgb),0.7)",
        border: "1px solid rgba(var(--surface-rgb),0.85)",
        boxShadow: "inset 0 1px 0 rgba(var(--surface-rgb),0.9)",
      }}
    >
      <Hash size={10} strokeWidth={2.5} style={{ color: "var(--accent)" }} />
      <span className="text-[11px] font-semibold" style={{ color: "var(--text-1)" }}>{tag}</span>
      <span
        className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
        style={{ background: "rgba(var(--accent-rgb),0.12)", color: "var(--accent)" }}
      >
        {count}
      </span>
    </motion.div>
  );
}

/* ─── Tabs ──────────────────────────────────────────────── */
type Tab = "reseau" | "populaires" | "nouveaux" | "defis";

const tabs: { id: Tab; label: string; icon: typeof Users }[] = [
  { id: "reseau",      label: "Réseau",      icon: Users },
  { id: "populaires",  label: "Populaires",  icon: TrendingUp },
  { id: "nouveaux",    label: "Nouveaux",    icon: Sparkles },
  { id: "defis",       label: "Défis",       icon: Swords },
];

/* ─── Page ──────────────────────────────────────────────── */
export default function DecouvertePage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("reseau");
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [reseauProfiles, setReseauProfiles]         = useState<Profile[]>([]);
  const [populairesProfiles, setPopulairesProfiles] = useState<Profile[]>([]);
  const [nouveauxProfiles, setNouveauxProfiles]     = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [trendingHashtags, setTrendingHashtags]     = useState<{ tag: string; count: number }[]>([]);
  const [hashtagsLoading, setHashtagsLoading]       = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  // Load existing follows
  useEffect(() => {
    if (!user) return;
    createClient()
      .from("followers")
      .select("following_id")
      .eq("follower_id", user.id)
      .then(({ data }) => {
        if (data) setFollowingIds(new Set(data.map((r) => r.following_id as string)));
      });
  }, [user]);

  // Load trending hashtags when réseau tab is active
  useEffect(() => {
    if (activeTab !== "reseau" || trendingHashtags.length > 0) return;
    setHashtagsLoading(true);
    const supabase = createClient();
    supabase
      .from("posts")
      .select("content")
      .not("content", "is", null)
      .limit(200)
      .then(({ data }) => {
        if (!data) { setHashtagsLoading(false); return; }
        const tagCount: Record<string, number> = {};
        data.forEach((row) => {
          const content = (row.content as string) ?? "";
          const matches = content.match(/#[\wÀ-ÿ]+/g) ?? [];
          matches.forEach((m) => {
            const tag = m.slice(1).toLowerCase();
            if (tag.length > 1) tagCount[tag] = (tagCount[tag] ?? 0) + 1;
          });
        });
        const sorted = Object.entries(tagCount)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8)
          .map(([tag, count]) => ({ tag, count }));
        setTrendingHashtags(sorted);
        setHashtagsLoading(false);
      });
  }, [activeTab, trendingHashtags.length]);

  // Load tab content
  const loadTab = useCallback(async (tab: Tab) => {
    if (!user || tab === "defis") return;
    setLoading(true);
    const supabase = createClient();

    if (tab === "reseau") {
      const { data } = await supabase.rpc("get_suggested_users", {
        p_user_id: user.id,
        p_limit: 20,
      });
      setReseauProfiles((data as Profile[]) ?? []);

    } else if (tab === "populaires") {
      const { data } = await supabase
        .from("profiles")
        .select("id, pseudo, full_name, avatar_url, bio")
        .neq("id", user.id)
        .order("created_at", { ascending: true })
        .limit(40);

      if (data) {
        const ids = (data as Profile[]).map((p) => p.id);
        const { data: counts } = await supabase
          .from("followers")
          .select("following_id")
          .in("following_id", ids);

        const countMap: Record<string, number> = {};
        (counts ?? []).forEach((r) => {
          const id = r.following_id as string;
          countMap[id] = (countMap[id] ?? 0) + 1;
        });

        const sorted = (data as Profile[])
          .map((p) => ({ ...p, follower_count: countMap[p.id] ?? 0 }))
          .sort((a, b) => (b.follower_count ?? 0) - (a.follower_count ?? 0))
          .slice(0, 20);

        setPopulairesProfiles(sorted);
      }

    } else {
      const { data } = await supabase
        .from("profiles")
        .select("id, pseudo, full_name, avatar_url, bio")
        .neq("id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      setNouveauxProfiles((data as Profile[]) ?? []);
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadTab(activeTab);
  }, [activeTab, loadTab]);

  const handleFollow = async (profile: Profile) => {
    if (!user) return;
    const supabase = createClient();
    const isF = followingIds.has(profile.id);

    setFollowingIds((prev) => {
      const n = new Set(prev);
      isF ? n.delete(profile.id) : n.add(profile.id);
      return n;
    });

    if (isF) {
      await supabase.from("followers").delete().eq("follower_id", user.id).eq("following_id", profile.id);
      showToast(`Abonnement annulé`);
    } else {
      const { error } = await supabase
        .from("followers")
        .upsert({ follower_id: user.id, following_id: profile.id }, { onConflict: "follower_id,following_id", ignoreDuplicates: true });
      if (error) {
        setFollowingIds((prev) => { const n = new Set(prev); n.delete(profile.id); return n; });
        showToast("Erreur");
        return;
      }
      void supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) return;
        fetch("/api/notifications/follow", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session.access_token}` },
          body: JSON.stringify({ follower_id: user.id, followed_id: profile.id }),
        }).catch(() => {});
      });
      showToast(`Vous suivez @${profile.pseudo} 🎉`);
    }
  };

  const currentProfiles = activeTab === "reseau"
    ? reseauProfiles
    : activeTab === "populaires"
    ? populairesProfiles
    : nouveauxProfiles;

  const displayed = currentProfiles;

  return (
    <div className="min-h-screen px-4 md:px-8 pt-8 pb-28 w-full max-w-3xl mx-auto relative">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-between mb-6"
      >
        <div>
          <p className="text-[10px] font-semibold tracking-widest uppercase mb-1" style={{ color: "var(--text-3)" }}>
            Communauté
          </p>
          <h1 className="text-2xl font-extralight tracking-tight" style={{ color: "var(--text-1)" }}>
            Découverte
          </h1>
        </div>
        <Link href="/communaute">
          <motion.div
            whileTap={{ scale: 0.9 }}
            className="lg-strong lg-highlight relative w-10 h-10 rounded-2xl flex items-center justify-center cursor-pointer"
            aria-label="Retour"
          >
            <ArrowLeft size={16} strokeWidth={1.5} style={{ color: "var(--text-1)" }} />
          </motion.div>
        </Link>
      </motion.div>

      {/* Tabs — 2×2 grid on small screens */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-4 gap-1.5 mb-5"
      >
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className="flex flex-col items-center justify-center gap-1 py-2.5 rounded-2xl text-[10px] font-semibold cursor-pointer transition-all"
            style={
              activeTab === id
                ? { background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", color: "#fff", boxShadow: "inset 0 1px 0 rgba(var(--surface-rgb),0.9)" }
                : { background: "rgba(var(--surface-rgb),0.5)", color: "var(--text-3)", border: "1px solid rgba(var(--surface-rgb),0.6)" }
            }
          >
            <Icon size={13} strokeWidth={activeTab === id ? 2 : 1.5} />
            {label}
          </button>
        ))}
      </motion.div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="flex flex-col gap-2"
        >
          {/* ── Réseau tab ── */}
          {activeTab === "reseau" && (
            <>
              {/* Trending hashtags */}
              <div className="mb-3">
                <div className="flex items-center gap-2 mb-2 px-1">
                  <TrendingUp size={13} strokeWidth={2} style={{ color: "var(--accent)" }} />
                  <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-3)" }}>
                    Hashtags tendance
                  </p>
                </div>
                {hashtagsLoading ? (
                  <div className="flex gap-2">
                    {[80, 96, 72, 88].map((w, i) => (
                      <div
                        key={i}
                        className="h-7 rounded-2xl animate-pulse"
                        style={{ width: w, background: "rgba(var(--accent-rgb),0.12)" }}
                      />
                    ))}
                  </div>
                ) : trendingHashtags.length > 0 ? (
                  <div className="flex gap-2 overflow-x-auto pb-0.5" style={{ scrollbarWidth: "none" }}>
                    {trendingHashtags.map((item, i) => (
                      <motion.div key={item.tag} transition={{ delay: i * 0.04 }}>
                        <HashtagChip tag={item.tag} count={item.count} />
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] font-light px-1" style={{ color: "#C0C0C0" }}>
                    Aucun hashtag pour l&apos;instant
                  </p>
                )}
              </div>

              {/* Divider */}
              <div style={{ height: 1, background: "rgba(var(--accent-rgb),0.1)", marginBottom: 8 }} />

              <p className="text-[11px] font-light px-1 mb-1" style={{ color: "var(--text-3)" }}>
                Personnes suivies par ceux que tu suis déjà
              </p>

              {loading ? (
                <div className="flex justify-center py-16">
                  <motion.div
                    className="w-6 h-6 rounded-full border-2"
                    style={{ borderColor: "rgba(var(--accent-rgb),0.3)", borderTopColor: "var(--accent)" }}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                  />
                </div>
              ) : displayed.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg, rgba(var(--tint-violet-rgb),0.8) 0%, rgba(255,251,240,0.8) 100%)" }}>
                    <Users size={22} strokeWidth={1.5} style={{ color: "var(--text-3)" }} />
                  </div>
                  <p className="text-sm font-light" style={{ color: "var(--text-3)" }}>
                    Suis des personnes pour voir leurs connexions
                  </p>
                </div>
              ) : (
                displayed.map((profile, i) => (
                  <motion.div
                    key={profile.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03, type: "spring", bounce: 0.2 }}
                  >
                    <ProfileCard
                      profile={profile}
                      isFollowing={followingIds.has(profile.id)}
                      onFollow={handleFollow}
                      showMutual
                    />
                  </motion.div>
                ))
              )}
            </>
          )}

          {/* ── Populaires / Nouveaux tabs ── */}
          {(activeTab === "populaires" || activeTab === "nouveaux") && (
            <>
              <p className="text-[11px] font-light px-1 mb-1" style={{ color: "var(--text-3)" }}>
                {activeTab === "populaires"
                  ? "Les comptes les plus suivis sur Vaiiya"
                  : "Membres qui ont rejoint Vaiiya récemment"}
              </p>

              {loading ? (
                <div className="flex justify-center py-16">
                  <motion.div
                    className="w-6 h-6 rounded-full border-2"
                    style={{ borderColor: "rgba(var(--accent-rgb),0.3)", borderTopColor: "var(--accent)" }}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                  />
                </div>
              ) : displayed.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg, rgba(var(--tint-violet-rgb),0.8) 0%, rgba(255,251,240,0.8) 100%)" }}>
                    {activeTab === "populaires"
                      ? <TrendingUp size={22} strokeWidth={1.5} style={{ color: "var(--text-3)" }} />
                      : <Sparkles size={22} strokeWidth={1.5} style={{ color: "var(--text-3)" }} />}
                  </div>
                  <p className="text-sm font-light" style={{ color: "var(--text-3)" }}>
                    {activeTab === "populaires"
                      ? "Aucun compte pour l'instant"
                      : "Aucun nouveau membre récemment"}
                  </p>
                </div>
              ) : (
                displayed.map((profile, i) => (
                  <motion.div
                    key={profile.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03, type: "spring", bounce: 0.2 }}
                  >
                    <ProfileCard
                      profile={profile}
                      isFollowing={followingIds.has(profile.id)}
                      onFollow={handleFollow}
                      showMutual={false}
                    />
                  </motion.div>
                ))
              )}
            </>
          )}

          {/* ── Défis tab (en maintenance) ── */}
          {activeTab === "defis" && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center text-center py-16 px-6 gap-4"
            >
              <div className="w-16 h-16 rounded-3xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, rgba(var(--cream-mid-rgb),0.45), rgba(var(--gold-rgb),0.25))", border: "1px solid rgba(var(--gold-rgb),0.25)" }}>
                <Swords size={26} strokeWidth={1.4} style={{ color: "var(--gold)" }} />
              </div>
              <div>
                <p className="text-lg font-light" style={{ color: "var(--text-1)" }}>Défis en maintenance</p>
                <p className="text-xs font-light mt-1.5 leading-relaxed" style={{ color: "var(--text-3)" }}>
                  On peaufine cette section pour te proposer des défis au top.<br />Reviens très vite ✨
                </p>
              </div>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", bounce: 0.4, duration: 0.5 }}
            className="fixed bottom-32 md:bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl flex items-center gap-2"
            style={{
              background: "rgba(var(--surface-rgb),0.9)",
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(var(--tint-violet-rgb),0.9)",
              boxShadow: "0 8px 32px rgba(var(--accent-rgb),0.2), inset 0 1px 0 rgba(var(--surface-rgb),0.9)",
              color: "var(--text-1)",
              whiteSpace: "nowrap",
            }}
          >
            <span className="text-sm font-medium">{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
