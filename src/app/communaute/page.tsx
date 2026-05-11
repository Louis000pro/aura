"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Heart, MessageCircle, Share2, Send, Plus, ArrowLeft, BadgeCheck, UserPlus, UserCheck, MoreHorizontal, X, Camera, Check, Bookmark, Flag, EyeOff, Dumbbell } from "lucide-react";
import Link from "next/link";
import PerformanceCard, { type PerformanceData } from "@/components/PerformanceCard";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

type View = "feed" | "search" | "dms" | "thread";
type SearchFilter = "tous" | "compte" | "seances";

type SessionResult = {
  id: string;
  title: string;
  category: string;
  duration: number;
  difficulty: string;
  muscles: string[];
  accent: string;
  icon: string;
  user_id: string;
  author_pseudo?: string;
  author_avatar?: string;
  exercise_list?: unknown[];
};

type User = {
  handle: string;
  name: string;
  initial: string;
  gradient: string;
  verified?: boolean;
  followers?: string;
  bio?: string;
};

type RealStory = {
  id: string;
  user_id: string;
  content_type: "workout" | "meal" | "text";
  content_data: Record<string, unknown> | null;
  caption: string | null;
  created_at: string;
  expires_at: string;
  profiles: { pseudo: string; full_name: string | null; avatar_url: string | null } | null;
};

type RealPost = {
  id: string;
  user_id: string;
  type: "workout" | "meal" | "day";
  caption: string;
  audience: "public" | "friends" | "private";
  performance_data: PerformanceData;
  created_at: string;
  author: { pseudo: string; full_name?: string; avatar_url?: string } | null;
  post_likes: { user_id: string }[];
  post_comments: { id: string }[];
};

type DirectMessage = {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
};

type DMPartner = {
  id: string;
  pseudo: string;
  full_name?: string | null;
  avatar_url?: string | null;
};

type DMConversation = {
  partner: DMPartner;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
};

const users: User[] = [
  { handle: "sofia.m", name: "Sofia Martinez", initial: "S", gradient: "linear-gradient(135deg, #D4C0FF 0%, #A78BFA 100%)", verified: false },
  { handle: "leo.fit", name: "Léo Bertrand", initial: "L", gradient: "linear-gradient(135deg, #F5E6A3 0%, #D4A843 100%)", verified: false },
  { handle: "mia.rose", name: "Mia Rose", initial: "M", gradient: "linear-gradient(135deg, #D4C0FF 0%, #F5E6A3 100%)", verified: false },
  { handle: "antoine.b", name: "Antoine Blanc", initial: "A", gradient: "linear-gradient(135deg, #F0EBFF 0%, #D4C0FF 100%)" },
  { handle: "chloe.zen", name: "Chloé Zen", initial: "C", gradient: "linear-gradient(135deg, #FFFBF0 0%, #F5E6A3 100%)" },
];

const influencers: User[] = [
  { handle: "@coach.aura", name: "Coach Aura Officiel", initial: "✦", gradient: "linear-gradient(135deg, #D4C0FF 0%, #F5E6A3 100%)", verified: true, followers: "284k", bio: "Coach IA · Programmes premium" },
  { handle: "@sarah.wellness", name: "Sarah Wellness", initial: "S", gradient: "linear-gradient(135deg, #F0EBFF 0%, #A78BFA 100%)", verified: true, followers: "127k", bio: "Yoga · Nutrition · Mindfulness" },
  { handle: "@nico.strength", name: "Nico Strength", initial: "N", gradient: "linear-gradient(135deg, #FFFBF0 0%, #D4A843 100%)", verified: true, followers: "98k", bio: "Powerlifting · Mobilité" },
  { handle: "@elea.run", name: "Eléa Runner", initial: "E", gradient: "linear-gradient(135deg, #D4C0FF 0%, #F5E6A3 100%)", verified: true, followers: "61k", bio: "Marathon · Trail · Récupération" },
];

type FeedItem = {
  id: number;
  user: User;
  time: string;
  caption?: string;
  card: PerformanceData;
  likes: number;
  comments: number;
  liked: boolean;
};

const feedData: FeedItem[] = [
  {
    id: 1,
    user: users[0],
    time: "12 min",
    caption: "Nouveau record perso ! Le programme Aura me pousse à me dépasser ✦",
    card: {
      type: "workout",
      title: "Force · Haut du corps",
      date: "Aujourd'hui · 08:30",
      metrics: [
        { label: "Durée", value: "47", unit: "min" },
        { label: "Volume", value: "3.2", unit: "t" },
        { label: "Calories", value: "412", unit: "kcal" },
        { label: "Intensité", value: "8.4", unit: "/10" },
      ],
      highlight: "Record perso au développé couché : 70 kg",
    },
    likes: 84,
    comments: 12,
    liked: false,
  },
  {
    id: 2,
    user: users[1],
    time: "1 h",
    caption: "L'IA a parfaitement identifié les macros. Bluffant.",
    card: {
      type: "meal",
      title: "Bowl protéiné",
      date: "Aujourd'hui · 12:45",
      metrics: [
        { label: "Calories", value: "612", unit: "kcal" },
        { label: "Protéines", value: "48", unit: "g" },
        { label: "Glucides", value: "67", unit: "g" },
        { label: "Lipides", value: "18", unit: "g" },
      ],
      highlight: "Idéal pour la récupération musculaire",
    },
    likes: 41,
    comments: 7,
    liked: true,
  },
  {
    id: 3,
    user: users[2],
    time: "3 h",
    caption: "3 semaines de pratique, mon dos me remercie chaque matin.",
    card: {
      type: "day",
      title: "Bilan du mardi",
      date: "Hier",
      metrics: [
        { label: "Pas", value: "11.2k", unit: "" },
        { label: "Sommeil", value: "7h45", unit: "" },
        { label: "FC repos", value: "62", unit: "bpm" },
        { label: "Score", value: "94", unit: "/100" },
      ],
      highlight: "Récupération optimale",
    },
    likes: 132,
    comments: 24,
    liked: false,
  },
];

// stories array supprimé — remplacé par realStories depuis Supabase

// DMs — replaced by real Supabase data

type Comment = { id: number; user: string; text: string; time: string };

function Avatar({ user, size = 40, ring = false }: { user: User; size?: number; ring?: boolean }) {
  return (
    <div
      className="rounded-full flex items-center justify-center flex-shrink-0 font-semibold relative"
      style={{
        width: size,
        height: size,
        background: user.gradient,
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)",
        outline: ring ? "2px solid #D4C0FF" : undefined,
        outlineOffset: ring ? 2 : undefined,
        color: "#2D3748",
        fontSize: size * 0.4,
      }}
    >
      {user.initial}
      {user.verified && (
        <div
          className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #D4C0FF 0%, #F5E6A3 100%)", boxShadow: "0 2px 6px rgba(167,139,250,0.4)" }}
        >
          <BadgeCheck size={9} strokeWidth={3} style={{ color: "#FFFFFF" }} fill="#D4A843" />
        </div>
      )}
    </div>
  );
}

function ProfileAvatar({ partner, size = 40 }: { partner: DMPartner; size?: number }) {
  const initial = (partner.pseudo ?? "?")[0]?.toUpperCase() ?? "?";
  const gradients = [
    "linear-gradient(135deg, #D4C0FF 0%, #A78BFA 100%)",
    "linear-gradient(135deg, #F5E6A3 0%, #D4A843 100%)",
    "linear-gradient(135deg, #D4C0FF 0%, #F5E6A3 100%)",
    "linear-gradient(135deg, #F0EBFF 0%, #D4C0FF 100%)",
    "linear-gradient(135deg, #FFFBF0 0%, #F5E6A3 100%)",
  ];
  const gradient = gradients[partner.id.charCodeAt(0) % gradients.length];
  return (
    <div
      className="rounded-full flex items-center justify-center flex-shrink-0 font-semibold overflow-hidden"
      style={{ width: size, height: size, background: gradient, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)", color: "#2D3748", fontSize: size * 0.4 }}
    >
      {partner.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={partner.avatar_url} alt={partner.pseudo} style={{ width: size, height: size, objectFit: "cover" }} />
      ) : initial}
    </div>
  );
}

// ── helpers pour le contenu d'une story ──────────────────────
function StoryCard({ story }: { story: RealStory }) {
  const d = story.content_data ?? {};

  if (story.content_type === "workout") {
    const catGrad: Record<string, string> = {
      force:    "linear-gradient(135deg, #D4C0FF 0%, #A78BFA 100%)",
      cardio:   "linear-gradient(135deg, #FDE68A 0%, #F59E0B 100%)",
      mobilite: "linear-gradient(135deg, #A7F3D0 0%, #34D399 100%)",
      fullbody: "linear-gradient(135deg, #FCA5A5 0%, #EF4444 100%)",
    };
    const grad = catGrad[(d.category as string) ?? "force"] ?? "linear-gradient(135deg, #D4C0FF 0%, #F5E6A3 100%)";
    return (
      <motion.div
        key={story.id}
        initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", bounce: 0.3 }}
        className="w-full max-w-sm rounded-3xl p-8 text-center"
        style={{ background: grad, boxShadow: "0 20px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.4)" }}
      >
        <div className="text-6xl mb-4">🏋️</div>
        <p className="text-xl font-semibold mb-1" style={{ color: "#2D3748" }}>{(d.session_title as string) ?? "Séance"}</p>
        {story.caption && <p className="text-sm font-light mb-4" style={{ color: "#4A5568" }}>{story.caption}</p>}
        <div className="flex justify-center gap-6 mt-4">
          {(d.duration_minutes as number) > 0 && (
            <div className="text-center">
              <p className="text-2xl font-bold" style={{ color: "#2D3748" }}>{d.duration_minutes as number}</p>
              <p className="text-xs" style={{ color: "#718096" }}>min</p>
            </div>
          )}
          {(d.calories_burned as number) > 0 && (
            <div className="text-center">
              <p className="text-2xl font-bold" style={{ color: "#2D3748" }}>{d.calories_burned as number}</p>
              <p className="text-xs" style={{ color: "#718096" }}>kcal</p>
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  if (story.content_type === "meal") {
    return (
      <motion.div
        key={story.id}
        initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", bounce: 0.3 }}
        className="w-full max-w-sm rounded-3xl p-8 text-center"
        style={{ background: "linear-gradient(135deg, #D1FAE5 0%, #A7F3D0 100%)", boxShadow: "0 20px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.4)" }}
      >
        <div className="text-6xl mb-4">🥗</div>
        <p className="text-xl font-semibold mb-1" style={{ color: "#2D3748" }}>{(d.meal_title as string) ?? "Repas"}</p>
        {story.caption && <p className="text-sm font-light mb-4" style={{ color: "#4A5568" }}>{story.caption}</p>}
        <div className="flex justify-center gap-6 mt-4">
          {(d.calories as number) > 0 && (
            <div className="text-center">
              <p className="text-2xl font-bold" style={{ color: "#2D3748" }}>{d.calories as number}</p>
              <p className="text-xs" style={{ color: "#718096" }}>kcal</p>
            </div>
          )}
          {(d.proteins as number) > 0 && (
            <div className="text-center">
              <p className="text-2xl font-bold" style={{ color: "#2D3748" }}>{d.proteins as number}g</p>
              <p className="text-xs" style={{ color: "#718096" }}>protéines</p>
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      key={story.id}
      initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", bounce: 0.3 }}
      className="w-full max-w-sm rounded-3xl p-8 text-center"
      style={{ background: "linear-gradient(135deg, #F0EBFF 0%, #FFFBF0 100%)", boxShadow: "0 20px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.4)" }}
    >
      <div className="text-6xl mb-4">{(d.emoji as string) ?? "✨"}</div>
      <p className="text-lg font-medium leading-snug" style={{ color: "#2D3748" }}>{(d.text as string) ?? ""}</p>
      {story.caption && story.caption !== (d.text as string) && (
        <p className="text-sm font-light mt-3" style={{ color: "#718096" }}>{story.caption}</p>
      )}
    </motion.div>
  );
}

// Story Viewer — plusieurs stories d'un même utilisateur, navigation gauche/droite
function StoryViewer({ stories, onClose }: { stories: RealStory[]; onClose: () => void }) {
  const [idx, setIdx]       = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reply, setReply]   = useState("");

  // Refs pour distinguer tap court (navigation) vs hold (pause)
  const holdTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isHoldingRef    = useRef(false);
  const pointerDownPosRef = useRef<{ x: number; y: number } | null>(null);

  const story  = stories[idx];
  const profile = story?.profiles;
  const displayName = profile?.full_name || profile?.pseudo || "Utilisateur";
  const initial = (profile?.pseudo?.[0] ?? "?").toUpperCase();

  const relTime = (() => {
    if (!story) return "";
    const diff = Date.now() - new Date(story.created_at).getTime();
    const min  = Math.floor(diff / 60000);
    if (min < 1) return "À l'instant";
    if (min < 60) return `Il y a ${min} min`;
    return `Il y a ${Math.floor(min / 60)}h`;
  })();

  const goNext = useCallback(() => {
    if (idx < stories.length - 1) { setIdx(idx + 1); setProgress(0); }
    else onClose();
  }, [idx, stories.length, onClose]);

  const goPrev = useCallback(() => {
    if (idx > 0) { setIdx(idx - 1); setProgress(0); }
  }, [idx]);

  // Barre de progression auto (80 ms × 50 = 4 s par story)
  useEffect(() => {
    if (paused) return;
    const iv = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) { goNext(); return 0; }
        return p + 2;
      });
    }, 80);
    return () => clearInterval(iv);
  }, [paused, goNext]);

  // Reset de la progression quand on change de story
  useEffect(() => { setProgress(0); }, [idx]);

  // ── Gestion hold (pause) + tap (navigation) ──────────────────
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Ignorer les clics sur les zones interactives (header, reply bar)
    if ((e.target as HTMLElement).closest("[data-no-hold]")) return;
    isHoldingRef.current = false;
    pointerDownPosRef.current = { x: e.clientX, y: e.clientY };
    holdTimerRef.current = setTimeout(() => {
      isHoldingRef.current = true;
      setPaused(true);
    }, 180); // 180ms → pause
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("[data-no-hold]")) return;
    if (holdTimerRef.current) { clearTimeout(holdTimerRef.current); holdTimerRef.current = null; }
    if (isHoldingRef.current) {
      // C'était un hold → juste dépause, pas de navigation
      isHoldingRef.current = false;
      setPaused(false);
    } else {
      // C'était un tap court → navigation
      const start = pointerDownPosRef.current;
      if (!start) return;
      const dx = Math.abs(e.clientX - start.x);
      const dy = Math.abs(e.clientY - start.y);
      if (dx < 10 && dy < 10) { // petit mouvement = tap
        const rect = e.currentTarget.getBoundingClientRect();
        if (e.clientX - rect.left < rect.width / 2) goPrev();
        else goNext();
      }
    }
    pointerDownPosRef.current = null;
  };

  const handlePointerLeave = () => {
    if (holdTimerRef.current) { clearTimeout(holdTimerRef.current); holdTimerRef.current = null; }
    if (isHoldingRef.current) { isHoldingRef.current = false; setPaused(false); }
  };

  if (!story) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col select-none"
      style={{ background: "rgba(0,0,0,0.92)", backdropFilter: "blur(20px)", cursor: paused ? "default" : "pointer" }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
    >
      {/* Barres de progression — une par story */}
      <div className="flex gap-1 px-3 pt-5 pb-1 z-10" data-no-hold>
        {stories.map((_, i) => (
          <div key={i} className="flex-1 rounded-full overflow-hidden" style={{ height: 2, background: "rgba(255,255,255,0.25)" }}>
            <div
              className="h-full rounded-full"
              style={{
                background: "linear-gradient(90deg, #D4C0FF, #F5E6A3)",
                width: i < idx ? "100%" : i === idx ? `${progress}%` : "0%",
                transition: i === idx ? "none" : "width 0s",
              }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-3 pb-2 z-10" data-no-hold>
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden font-semibold text-sm"
          style={{
            background: profile?.avatar_url ? "transparent" : "linear-gradient(135deg, #D4C0FF 0%, #F5E6A3 100%)",
            outline: "2px solid rgba(255,255,255,0.6)",
            outlineOffset: 2,
            color: "#2D3748",
          }}
        >
          {profile?.avatar_url
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={profile.avatar_url} alt={displayName} className="w-full h-full object-cover" />
            : initial}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-semibold truncate">{displayName}</p>
          <p className="text-white/50 text-[11px]">{relTime}</p>
        </div>
        <motion.button
          data-no-hold
          whileTap={{ scale: 0.9 }}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="cursor-pointer"
        >
          <X size={20} strokeWidth={1.5} style={{ color: "rgba(255,255,255,0.8)" }} />
        </motion.button>
      </div>

      {/* Contenu */}
      <div className="flex-1 flex items-center justify-center px-6 pointer-events-none">
        <AnimatePresence mode="wait">
          <StoryCard key={story.id} story={story} />
        </AnimatePresence>
      </div>

      {/* Indicateur de navigation (si plusieurs stories) */}
      {stories.length > 1 && (
        <div className="flex justify-center gap-1.5 pb-3 z-10" data-no-hold>
          {stories.map((_, i) => (
            <div
              key={i}
              className="rounded-full transition-all duration-200"
              style={{
                width: i === idx ? 16 : 6,
                height: 6,
                background: i === idx ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.3)",
              }}
            />
          ))}
        </div>
      )}

      {/* Reply bar */}
      <div className="px-5 pb-10 z-10" data-no-hold>
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl" style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)" }}>
          <input
            type="text"
            value={reply}
            onChange={(e) => { setReply(e.target.value); }}
            onFocus={() => setPaused(true)}
            onBlur={() => setPaused(false)}
            placeholder={`Répondre à ${displayName.split(" ")[0]}…`}
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: "white" }}
          />
          <Send size={16} strokeWidth={1.5} style={{ color: reply ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.3)" }} />
        </div>
      </div>
    </motion.div>
  );
}

// Add Story Modal — enregistre vraiment dans Supabase
type AddStep = "pick" | "workout-list" | "workout-preview" | "text-input" | "loading" | "saving" | "success" | "no-session" | "db-error";
type WorkoutPreview = { session_title: string; duration_minutes: number; calories_burned: number; category: string; started_at?: string };

function AddStoryModal({ onClose, userId, onPublished }: {
  onClose: () => void;
  userId: string | null;
  onPublished: () => void;
}) {
  const [step, setStep]               = useState<AddStep>("pick");
  const [sessions, setSessions]       = useState<WorkoutPreview[]>([]);
  const [workoutData, setWorkoutData] = useState<WorkoutPreview | null>(null);
  const [caption, setCaption]         = useState("");
  const [textContent, setTextContent] = useState("");
  const [selectedEmoji, setSelectedEmoji] = useState("✨");
  const [error, setError]             = useState<string | null>(null);

  const EMOJIS = ["💪", "🥗", "🧘", "🔥", "🏃", "✨", "🏆", "😴"];

  // Catégorie → couleur de fond
  const catColors: Record<string, string> = {
    force:    "linear-gradient(135deg, #F0EBFF 0%, #E9D8FD 100%)",
    cardio:   "linear-gradient(135deg, #FFFBF0 0%, #FDE68A 100%)",
    mobilite: "linear-gradient(135deg, #ECFDF5 0%, #A7F3D0 100%)",
    fullbody: "linear-gradient(135deg, #FFF5F5 0%, #FED7D7 100%)",
  };

  // Charger toutes les séances passées (sans limite de temps)
  const handleWorkout = async () => {
    if (!userId) { setError("Connecte-toi pour publier"); return; }
    setStep("loading");
    const supabase = createClient();
    const { data, error: e } = await supabase
      .from("workout_sessions")
      .select("title, duration_minutes, calories_burned, category, started_at")
      .eq("user_id", userId)
      .order("started_at", { ascending: false })
      .limit(15);

    if (e) { setStep("db-error"); return; }
    if (!data || data.length === 0) { setStep("no-session"); return; }
    setSessions(data.map((d) => ({
      session_title:    d.title           ?? "Séance",
      duration_minutes: d.duration_minutes ?? 0,
      calories_burned:  d.calories_burned  ?? 0,
      category:         d.category         ?? "force",
      started_at:       d.started_at,
    })));
    setStep("workout-list");
  };

  const publishWorkout = async () => {
    if (!userId || !workoutData) return;
    setStep("saving");
    const supabase = createClient();
    const { error: e } = await supabase.from("stories").insert({
      user_id:      userId,
      content_type: "workout",
      content_data: {
        session_title:    workoutData.session_title,
        duration_minutes: workoutData.duration_minutes,
        calories_burned:  workoutData.calories_burned,
        category:         workoutData.category,
      },
      caption: caption.trim() || null,
    });
    if (e) { setError(e.message); setStep("workout-preview"); return; }
    setStep("success");
    onPublished();
  };

  const publishText = async () => {
    if (!userId || !textContent.trim()) return;
    setStep("saving");
    const supabase = createClient();
    const { error: e } = await supabase.from("stories").insert({
      user_id:      userId,
      content_type: "text",
      content_data: { text: textContent.trim(), emoji: selectedEmoji },
      caption:      null,
    });
    if (e) { setError(e.message); setStep("text-input"); return; }
    setStep("success");
    onPublished();
  };

  // Formate la date relative d'une séance
  const fmtDate = (iso?: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
    if (diffDays === 0) return "Aujourd'hui";
    if (diffDays === 1) return "Hier";
    if (diffDays < 7)  return `Il y a ${diffDays} j`;
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center px-4 pb-6 md:pb-0"
      style={{ background: "rgba(0,0,0,0.2)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 60, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.97 }}
        transition={{ type: "spring", bounce: 0.3, duration: 0.5 }}
        className="w-full max-w-sm rounded-3xl p-6"
        style={{
          background: "rgba(255,255,255,0.95)",
          backdropFilter: "blur(32px)",
          border: "1px solid rgba(255,255,255,0.9)",
          boxShadow: "0 20px 60px rgba(167,139,250,0.15), inset 0 1px 0 rgba(255,255,255,0.9)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <AnimatePresence mode="wait">

          {/* ── Choix du type ── */}
          {step === "pick" && (
            <motion.div key="pick" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-light" style={{ color: "#2D3748" }}>Ajouter une story</h2>
                <motion.button whileTap={{ scale: 0.9 }} onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer" style={{ background: "rgba(240,235,255,0.8)" }}>
                  <X size={14} strokeWidth={2} style={{ color: "#A0AEC0" }} />
                </motion.button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: Share2, label: "Ma séance", desc: "Choisir une perf",   action: handleWorkout },
                  { icon: Camera, label: "Texte",     desc: "Un message + emoji", action: () => setStep("text-input") },
                ].map(({ icon: Icon, label, desc, action }) => (
                  <motion.button
                    key={label}
                    whileHover={{ scale: 1.03, y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={action}
                    className="flex flex-col items-center gap-2 p-4 rounded-2xl cursor-pointer"
                    style={{ background: "linear-gradient(135deg, #F0EBFF 0%, #FFFBF0 100%)", border: "1px solid rgba(255,255,255,0.8)" }}
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.7)" }}>
                      <Icon size={18} strokeWidth={1.5} style={{ color: "#2D3748" }} />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium" style={{ color: "#2D3748" }}>{label}</p>
                      <p className="text-[10px]" style={{ color: "#A0AEC0" }}>{desc}</p>
                    </div>
                  </motion.button>
                ))}
              </div>
              {error && <p className="text-xs text-center mt-3" style={{ color: "#FC8181" }}>{error}</p>}
            </motion.div>
          )}

          {/* ── Liste des séances ── */}
          {step === "workout-list" && (
            <motion.div key="workout-list" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
              <div className="flex items-center gap-2 mb-4">
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => setStep("pick")} className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer flex-shrink-0" style={{ background: "rgba(240,235,255,0.8)" }}>
                  <ArrowLeft size={14} strokeWidth={2} style={{ color: "#A0AEC0" }} />
                </motion.button>
                <h2 className="text-base font-light" style={{ color: "#2D3748" }}>Quelle séance partager ?</h2>
              </div>

              <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-0.5" style={{ scrollbarWidth: "thin" }}>
                {sessions.map((s, i) => (
                  <motion.button
                    key={i}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => { setWorkoutData(s); setCaption(""); setStep("workout-preview"); }}
                    className="flex items-center gap-3 px-4 py-3 rounded-2xl text-left cursor-pointer"
                    style={{ background: catColors[s.category] ?? catColors.force, border: "1px solid rgba(255,255,255,0.8)" }}
                  >
                    <span className="text-2xl flex-shrink-0">🏋️</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: "#2D3748" }}>{s.session_title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {s.duration_minutes > 0 && (
                          <span className="text-[10px]" style={{ color: "#718096" }}>{s.duration_minutes} min</span>
                        )}
                        {s.calories_burned > 0 && (
                          <span className="text-[10px]" style={{ color: "#718096" }}>· {s.calories_burned} kcal</span>
                        )}
                      </div>
                    </div>
                    <span className="text-[10px] font-medium flex-shrink-0" style={{ color: "#A0AEC0" }}>{fmtDate(s.started_at)}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── Aperçu séance ── */}
          {step === "workout-preview" && workoutData && (
            <motion.div key="workout-preview" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
              <div className="flex items-center gap-2 mb-4">
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => setStep("workout-list")} className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer" style={{ background: "rgba(240,235,255,0.8)" }}>
                  <ArrowLeft size={14} strokeWidth={2} style={{ color: "#A0AEC0" }} />
                </motion.button>
                <h2 className="text-base font-light flex-1" style={{ color: "#2D3748" }}>Aperçu de ta story</h2>
              </div>

              <div className="rounded-2xl p-5 mb-4 text-center" style={{ background: catColors[workoutData.category] ?? catColors.force }}>
                <div className="text-4xl mb-2">🏋️</div>
                <p className="text-base font-semibold" style={{ color: "#2D3748" }}>{workoutData.session_title}</p>
                <div className="flex justify-center gap-6 mt-3">
                  {workoutData.duration_minutes > 0 && (
                    <div>
                      <p className="text-xl font-bold" style={{ color: "#2D3748" }}>{workoutData.duration_minutes}</p>
                      <p className="text-[10px]" style={{ color: "#718096" }}>min</p>
                    </div>
                  )}
                  {workoutData.calories_burned > 0 && (
                    <div>
                      <p className="text-xl font-bold" style={{ color: "#2D3748" }}>{workoutData.calories_burned}</p>
                      <p className="text-[10px]" style={{ color: "#718096" }}>kcal</p>
                    </div>
                  )}
                </div>
              </div>

              <input
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Ajouter une légende (optionnel)…"
                className="w-full text-sm outline-none px-4 py-3 rounded-xl mb-4"
                style={{ background: "rgba(240,235,255,0.5)", border: "1px solid rgba(212,192,255,0.5)", color: "#2D3748" }}
              />
              {error && <p className="text-xs mb-2" style={{ color: "#FC8181" }}>{error}</p>}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={publishWorkout}
                className="w-full py-3 rounded-2xl text-sm font-semibold cursor-pointer"
                style={{ background: "linear-gradient(135deg, #D4C0FF 0%, #F5E6A3 100%)", color: "#2D3748", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8)" }}
              >
                Publier la story
              </motion.button>
            </motion.div>
          )}

          {/* ── Saisie texte ── */}
          {step === "text-input" && (
            <motion.div key="text-input" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
              <div className="flex items-center gap-2 mb-4">
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => setStep("pick")} className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer" style={{ background: "rgba(240,235,255,0.8)" }}>
                  <ArrowLeft size={14} strokeWidth={2} style={{ color: "#A0AEC0" }} />
                </motion.button>
                <h2 className="text-base font-light flex-1" style={{ color: "#2D3748" }}>Créer une story</h2>
              </div>

              <div className="flex gap-2 mb-3 flex-wrap">
                {EMOJIS.map((e) => (
                  <motion.button
                    key={e}
                    whileTap={{ scale: 0.85 }}
                    onClick={() => setSelectedEmoji(e)}
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-xl cursor-pointer"
                    style={{
                      background: selectedEmoji === e ? "linear-gradient(135deg, #D4C0FF 0%, #F5E6A3 100%)" : "rgba(240,235,255,0.6)",
                      border: selectedEmoji === e ? "1px solid rgba(212,192,255,0.8)" : "1px solid transparent",
                    }}
                  >
                    {e}
                  </motion.button>
                ))}
              </div>

              <textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="Ton message…"
                rows={3}
                className="w-full text-sm outline-none px-4 py-3 rounded-xl resize-none mb-4"
                style={{ background: "rgba(240,235,255,0.5)", border: "1px solid rgba(212,192,255,0.5)", color: "#2D3748" }}
              />
              {error && <p className="text-xs mb-2" style={{ color: "#FC8181" }}>{error}</p>}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={publishText}
                className="w-full py-3 rounded-2xl text-sm font-semibold cursor-pointer transition-opacity"
                style={{
                  background: textContent.trim() ? "linear-gradient(135deg, #D4C0FF 0%, #F5E6A3 100%)" : "rgba(240,235,255,0.6)",
                  color: textContent.trim() ? "#2D3748" : "#A0AEC0",
                  boxShadow: textContent.trim() ? "inset 0 1px 0 rgba(255,255,255,0.8)" : "none",
                  cursor: textContent.trim() ? "pointer" : "not-allowed",
                }}
              >
                Publier
              </motion.button>
            </motion.div>
          )}

          {/* ── Aucune séance ── */}
          {step === "no-session" && (
            <motion.div key="no-session" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-4">
              <div className="text-4xl mb-3">🏋️</div>
              <p className="text-base font-light mb-1" style={{ color: "#2D3748" }}>Aucune séance enregistrée</p>
              <p className="text-sm font-light mb-5" style={{ color: "#A0AEC0" }}>Lance une séance depuis Progression pour la partager.</p>
              <div className="flex flex-col gap-2">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setStep("pick")}
                  className="px-6 py-2.5 rounded-xl text-sm font-medium cursor-pointer"
                  style={{ background: "rgba(240,235,255,0.8)", color: "#A0AEC0" }}
                >
                  Retour
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setStep("text-input")}
                  className="px-6 py-2.5 rounded-xl text-sm font-medium cursor-pointer"
                  style={{ background: "linear-gradient(135deg, #D4C0FF 0%, #F5E6A3 100%)", color: "#2D3748" }}
                >
                  Publier un texte à la place
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* ── Erreur base de données ── */}
          {step === "db-error" && (
            <motion.div key="db-error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-4">
              <div className="text-4xl mb-3">⚙️</div>
              <p className="text-base font-light mb-1" style={{ color: "#2D3748" }}>Table manquante</p>
              <p className="text-sm font-light mb-4" style={{ color: "#A0AEC0" }}>
                Exécute le SQL de migration <code className="text-xs px-1 rounded" style={{ background: "rgba(167,139,250,0.15)", color: "#7C3AED" }}>20260512_workout_sessions.sql</code> dans ton dashboard Supabase.
              </p>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => setStep("pick")}
                className="px-6 py-2.5 rounded-xl text-sm font-medium cursor-pointer"
                style={{ background: "rgba(240,235,255,0.8)", color: "#A0AEC0" }}
              >
                Retour
              </motion.button>
            </motion.div>
          )}

          {/* ── Chargement séances ── */}
          {step === "loading" && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center py-10 gap-4">
              <motion.div
                className="w-10 h-10 rounded-full border-2"
                style={{ borderColor: "rgba(167,139,250,0.2)", borderTopColor: "#A78BFA" }}
                animate={{ rotate: 360 }}
                transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
              />
              <p className="text-sm font-light" style={{ color: "#A0AEC0" }}>Chargement…</p>
            </motion.div>
          )}

          {/* ── Publication en cours ── */}
          {step === "saving" && (
            <motion.div key="saving" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center py-10 gap-4">
              <motion.div
                className="w-10 h-10 rounded-full border-2"
                style={{ borderColor: "rgba(167,139,250,0.2)", borderTopColor: "#A78BFA" }}
                animate={{ rotate: 360 }}
                transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
              />
              <p className="text-sm font-light" style={{ color: "#A0AEC0" }}>Publication…</p>
            </motion.div>
          )}

          {/* ── Succès ── */}
          {step === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center py-6 gap-3"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", bounce: 0.6, delay: 0.1 }}
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #D4C0FF 0%, #F5E6A3 100%)" }}
              >
                <Check size={28} strokeWidth={2.5} style={{ color: "#2D3748" }} />
              </motion.div>
              <p className="text-lg font-light" style={{ color: "#2D3748" }}>Story publiée !</p>
              <p className="text-sm text-center font-light" style={{ color: "#A0AEC0" }}>Visible pendant 24h par tes abonnés</p>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={onClose}
                className="mt-2 px-6 py-2.5 rounded-xl text-sm font-medium cursor-pointer"
                style={{ background: "linear-gradient(135deg, #D4C0FF 0%, #F5E6A3 100%)", color: "#2D3748" }}
              >
                Fermer
              </motion.button>
            </motion.div>
          )}

        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

// Options Menu (dropdown)
function OptionsMenu({ postId, saved, onSave, onHide, onReport, onClose }: {
  postId: string | number; saved: boolean;
  onSave: () => void; onHide: () => void; onReport: () => void; onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85, y: -8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.85, y: -8 }}
      transition={{ type: "spring", bounce: 0.35, duration: 0.3 }}
      className="absolute right-4 top-14 z-30 rounded-2xl overflow-hidden min-w-[180px]"
      style={{
        background: "rgba(255,255,255,0.9)",
        backdropFilter: "blur(10px)",
        border: "1px solid rgba(255,255,255,0.9)",
        boxShadow: "0 8px 32px rgba(167,139,250,0.2), inset 0 1px 0 rgba(255,255,255,0.9)",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {[
        { icon: saved ? Check : Bookmark, label: saved ? "Sauvegardé ✓" : "Sauvegarder", action: onSave, color: saved ? "#D4A843" : "#2D3748" },
        { icon: EyeOff, label: "Masquer ce post", action: onHide, color: "#2D3748" },
        { icon: Flag, label: "Signaler", action: onReport, color: "#A78BFA" },
      ].map(({ icon: Icon, label, action, color }, i) => (
        <div key={label}>
          <motion.button
            whileHover={{ background: "rgba(240,235,255,0.5)" }}
            whileTap={{ scale: 0.98 }}
            onClick={() => { action(); onClose(); }}
            className="w-full flex items-center gap-3 px-4 py-3 cursor-pointer text-left"
          >
            <Icon size={14} strokeWidth={1.5} style={{ color }} />
            <span className="text-sm font-medium" style={{ color }}>{label}</span>
          </motion.button>
          {i < 2 && <div className="h-px mx-3" style={{ background: "rgba(240,235,255,0.9)" }} />}
        </div>
      ))}
    </motion.div>
  );
}

// Share Modal
function ShareModal({ postCaption, onClose }: { postCaption?: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => { setCopied(false); onClose(); }, 1500);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center px-4 pb-6 md:pb-0"
      style={{ background: "rgba(0,0,0,0.2)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 60, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.97 }}
        transition={{ type: "spring", bounce: 0.3, duration: 0.5 }}
        className="w-full max-w-sm rounded-3xl p-6"
        style={{
          background: "rgba(255,255,255,0.9)",
          backdropFilter: "blur(32px)",
          border: "1px solid rgba(255,255,255,0.9)",
          boxShadow: "0 20px 60px rgba(167,139,250,0.15), inset 0 1px 0 rgba(255,255,255,0.9)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-light" style={{ color: "#2D3748" }}>Partager</h2>
          <motion.button whileTap={{ scale: 0.9 }} onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer" style={{ background: "rgba(240,235,255,0.8)" }}>
            <X size={14} strokeWidth={2} style={{ color: "#A0AEC0" }} />
          </motion.button>
        </div>

        <div className="grid grid-cols-4 gap-3 mb-5">
          {[
            { label: "DM", emoji: "💬", color: "linear-gradient(135deg, #D4C0FF 0%, #A78BFA 100%)" },
            { label: "Story", emoji: "✨", color: "linear-gradient(135deg, #F5E6A3 0%, #D4A843 100%)" },
            { label: "Copier", emoji: copied ? "✓" : "🔗", color: "linear-gradient(135deg, #F0EBFF 0%, #FFFBF0 100%)" },
            { label: "Aura", emoji: "✦", color: "linear-gradient(135deg, #D4C0FF 0%, #F5E6A3 100%)" },
          ].map(({ label, emoji, color }) => (
            <motion.button
              key={label}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={label === "Copier" ? handleCopy : onClose}
              className="flex flex-col items-center gap-2 cursor-pointer"
            >
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl" style={{ background: color, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8)" }}>
                {emoji}
              </div>
              <span className="text-[10px] font-medium" style={{ color: "#718096" }}>{label}</span>
            </motion.button>
          ))}
        </div>

        <AnimatePresence>
          {copied && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-center text-sm font-medium"
              style={{ color: "#D4A843" }}
            >
              Lien copié ! ✓
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

// Comments Section (inline)
function CommentsSection({ postId, initialCount, onClose }: { postId: string | number; initialCount: number; onClose: () => void }) {
  const [comments, setComments] = useState<Comment[]>([
    { id: 1, user: "leo.fit", text: "Incroyable ! Continue comme ça 💪", time: "Il y a 5 min" },
    { id: 2, user: "mia.rose", text: "Wow quel score 🔥", time: "Il y a 12 min" },
  ]);
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSend = () => {
    if (!input.trim()) return;
    setComments((prev) => [
      { id: Date.now(), user: "moi", text: input.trim(), time: "À l'instant" },
      ...prev,
    ]);
    setInput("");
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="overflow-hidden"
    >
      <div className="px-4 pb-4 pt-2 border-t" style={{ borderColor: "rgba(240,235,255,0.8)" }}>
        <div className="flex flex-col gap-2.5 mb-3">
          {comments.map((c) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-start gap-2"
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold flex-shrink-0"
                style={{ background: "linear-gradient(135deg, #D4C0FF, #F5E6A3)", color: "#2D3748" }}
              >
                {c.user.charAt(0).toUpperCase()}
              </div>
              <div>
                <span className="text-xs font-semibold mr-1.5" style={{ color: "#2D3748" }}>{c.user}</span>
                <span className="text-xs font-light" style={{ color: "#2D3748" }}>{c.text}</span>
                <p className="text-[10px] mt-0.5" style={{ color: "#A0AEC0" }}>{c.time}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
            placeholder="Ajouter un commentaire…"
            className="flex-1 text-xs outline-none px-3 py-2 rounded-xl"
            style={{
              background: "rgba(240,235,255,0.5)",
              border: "1px solid rgba(212,192,255,0.5)",
              color: "#2D3748",
            }}
          />
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleSend}
            className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer flex-shrink-0"
            style={{
              background: input.trim() ? "linear-gradient(135deg, #D4C0FF 0%, #F5E6A3 100%)" : "rgba(240,235,255,0.5)",
              transition: "background 0.2s",
            }}
          >
            <Send size={12} strokeWidth={2} style={{ color: input.trim() ? "#2D3748" : "#A0AEC0" }} />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

function postTimeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "À l'instant";
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}j`;
}

export default function CommunautePage() {
  const { user } = useAuth();
  const [view, setView] = useState<View>("feed");
  const [search, setSearch] = useState("");
  const [searchFilter, setSearchFilter] = useState<SearchFilter>("tous");
  const [realProfiles, setRealProfiles] = useState<{ id: string; pseudo: string; full_name?: string; bio?: string; avatar_url?: string }[]>([]);
  const [realSessions, setRealSessions] = useState<SessionResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [likedIds, setLikedIds] = useState<Set<number>>(new Set([2]));
  // followingIds = ensemble des IDs Supabase que l'utilisateur suit réellement
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [following, setFollowing] = useState<Set<string>>(new Set()); // pour influenceurs fictifs uniquement
  const [openComments, setOpenComments] = useState<Set<number>>(new Set());
  const [savedPosts, setSavedPosts] = useState<Set<number>>(new Set());
  const [hiddenPosts, setHiddenPosts] = useState<Set<number>>(new Set());
  const [openMenu, setOpenMenu] = useState<number | null>(null);
  const [sharePost, setSharePost] = useState<{ caption?: string } | null>(null);
  const [storyGroup, setStoryGroup] = useState<RealStory[] | null>(null);
  const [showAddStory, setShowAddStory] = useState(false);
  const [realStories, setRealStories] = useState<RealStory[]>([]);
  const [realFeedPosts, setRealFeedPosts] = useState<RealPost[]>([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [likedRealIds, setLikedRealIds] = useState<Set<string>>(new Set());
  const [hiddenRealIds, setHiddenRealIds] = useState<Set<string>>(new Set());
  const [openRealComments, setOpenRealComments] = useState<Set<string>>(new Set());
  const [savedRealIds, setSavedRealIds] = useState<Set<string>>(new Set());
  const [openRealMenu, setOpenRealMenu] = useState<string | null>(null);
  const [burstRealId, setBurstRealId] = useState<string | null>(null);
  const [dmConversations, setDmConversations] = useState<DMConversation[]>([]);
  const [dmsLoading, setDmsLoading] = useState(false);
  const [activeDMPartner, setActiveDMPartner] = useState<DMPartner | null>(null);
  const [dmMessages, setDmMessages] = useState<DirectMessage[]>([]);
  const [dmInput, setDmInput] = useState("");
  const [dmSending, setDmSending] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [burstPost, setBurstPost] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

  // Charger les abonnements réels depuis Supabase
  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    supabase
      .from("followers")
      .select("following_id")
      .eq("follower_id", user.id)
      .then(({ data }) => {
        if (data) setFollowingIds(new Set(data.map((r) => r.following_id as string)));
      });
  }, [user]);

  // Charger les stories actives (les miennes + celles des personnes que je suis)
  // Join manuel des profils car la FK stories.user_id → auth.users (pas public.profiles)
  const loadStories = useCallback(async () => {
    if (!user) return;
    const supabase = createClient();

    // 1. IDs à charger : moi + abonnements
    const { data: followedData } = await supabase
      .from("followers")
      .select("following_id")
      .eq("follower_id", user.id);
    const ids = [user.id, ...(followedData?.map((r) => r.following_id as string) ?? [])];

    // 2. Stories actives (sans join automatique)
    const { data: storiesData } = await supabase
      .from("stories")
      .select("id, user_id, content_type, content_data, caption, created_at, expires_at")
      .in("user_id", ids)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });

    if (!storiesData || storiesData.length === 0) {
      setRealStories([]);
      return;
    }

    // 3. Profils correspondants (requête séparée)
    const uniqueIds = [...new Set(storiesData.map((s) => s.user_id as string))];
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, pseudo, full_name, avatar_url")
      .in("id", uniqueIds);

    const profileMap: Record<string, { pseudo: string; full_name: string | null; avatar_url: string | null }> =
      Object.fromEntries((profilesData ?? []).map((p) => [p.id, p]));

    // 4. Merge
    setRealStories(
      storiesData.map((s) => ({
        ...s,
        profiles: profileMap[s.user_id as string] ?? null,
      })) as RealStory[]
    );
  }, [user]);

  useEffect(() => { loadStories(); }, [loadStories]);

  // Charger le feed réel depuis Supabase
  const loadFeed = useCallback(async () => {
    if (!user) return;
    setFeedLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("posts")
      .select(`
        id, type, caption, audience, performance_data, created_at, user_id,
        author:profiles!user_id(pseudo, full_name, avatar_url),
        post_likes(user_id),
        post_comments(id)
      `)
      .order("created_at", { ascending: false })
      .limit(30);
    if (data) {
      setRealFeedPosts(data as unknown as RealPost[]);
      const liked = new Set<string>();
      (data as unknown as RealPost[]).forEach((p) => {
        if (p.post_likes.some((l) => l.user_id === user.id)) liked.add(p.id);
      });
      setLikedRealIds(liked);
    }
    setFeedLoading(false);
  }, [user]);

  useEffect(() => { loadFeed(); }, [loadFeed]);

  // Realtime : nouveau post dans le feed
  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    const channel = supabase
      .channel("community-posts")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "posts" }, async (payload) => {
        const { data } = await supabase
          .from("posts")
          .select(`
            id, type, caption, audience, performance_data, created_at, user_id,
            author:profiles!user_id(pseudo, full_name, avatar_url),
            post_likes(user_id),
            post_comments(id)
          `)
          .eq("id", (payload.new as { id: string }).id)
          .maybeSingle();
        if (data) setRealFeedPosts((prev) => [data as unknown as RealPost, ...prev]);
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [user]);

  // Suivre / ne plus suivre un vrai profil Supabase
  const handleFollowReal = async (profile: { id: string; pseudo: string; avatar_url?: string }) => {
    if (!user) { showToast("Connecte-toi pour suivre"); return; }
    const supabase = createClient();
    const isNowFollowing = !followingIds.has(profile.id);

    // Mise à jour optimiste immédiate
    setFollowingIds((prev) => {
      const next = new Set(prev);
      isNowFollowing ? next.add(profile.id) : next.delete(profile.id);
      return next;
    });

    if (isNowFollowing) {
      const { error } = await supabase
        .from("followers")
        .upsert(
          { follower_id: user.id, following_id: profile.id },
          { onConflict: "follower_id,following_id", ignoreDuplicates: true }
        );
      if (error) {
        // Rollback optimiste
        setFollowingIds((prev) => { const n = new Set(prev); n.delete(profile.id); return n; });
        showToast(`Erreur : ${error.message}`);
        return;
      }
      // Notification (silencieuse)
      supabase.from("notifications").insert({
        user_id: profile.id,
        from_user_id: user.id,
        from_pseudo: user.pseudo,
        from_avatar_url: user.avatar ?? null,
        type: "follow",
      }).then(() => {}).catch(() => {});
      showToast(`Vous suivez @${profile.pseudo} 🎉`);
    } else {
      const { error } = await supabase
        .from("followers")
        .delete()
        .eq("follower_id", user.id)
        .eq("following_id", profile.id);
      if (error) {
        // Rollback optimiste
        setFollowingIds((prev) => { const n = new Set(prev); n.add(profile.id); return n; });
        showToast(`Erreur : ${error.message}`);
        return;
      }
      showToast("Abonnement annulé");
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [dmMessages]);

  const toggleLike = (id: number) => {
    setLikedIds((p) => {
      const n = new Set(p);
      const isNowLiked = !n.has(id);
      isNowLiked ? n.add(id) : n.delete(id);
      if (isNowLiked) {
        setBurstPost(id);
        setTimeout(() => setBurstPost(null), 700);
      }
      return n;
    });
  };

  const toggleRealLike = async (postId: string) => {
    if (!user) return;
    const supabase = createClient();
    const isLiked = likedRealIds.has(postId);
    setLikedRealIds((prev) => {
      const n = new Set(prev);
      isLiked ? n.delete(postId) : n.add(postId);
      return n;
    });
    setRealFeedPosts((prev) => prev.map((p) => p.id !== postId ? p : {
      ...p,
      post_likes: isLiked
        ? p.post_likes.filter((l) => l.user_id !== user.id)
        : [...p.post_likes, { user_id: user.id }],
    }));
    if (!isLiked) {
      setBurstRealId(postId);
      setTimeout(() => setBurstRealId(null), 700);
      await supabase.from("post_likes").upsert({ post_id: postId, user_id: user.id }, { ignoreDuplicates: true });
    } else {
      await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", user.id);
    }
  };

  const toggleFollow = (handle: string) => {
    setFollowing((p) => {
      const n = new Set(p);
      const isNowFollowing = !n.has(handle);
      n.has(handle) ? n.delete(handle) : n.add(handle);
      showToast(isNowFollowing ? `Vous suivez maintenant ${handle}` : `Vous ne suivez plus ${handle}`);
      return n;
    });
  };

  const toggleComments = (id: number) => {
    setOpenComments((p) => {
      const n = new Set(p);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  // ── Charger les conversations DM ──────────────────────────
  const loadDMConversations = useCallback(async () => {
    if (!user) return;
    setDmsLoading(true);
    const supabase = createClient();

    const { data: messages } = await supabase
      .from("direct_messages")
      .select("id, sender_id, receiver_id, content, created_at, read_at")
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order("created_at", { ascending: false })
      .limit(200);

    if (!messages) { setDmsLoading(false); return; }

    const byPartner = new Map<string, { msgs: DirectMessage[]; unread: number }>();
    (messages as DirectMessage[]).forEach((msg) => {
      const partnerId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
      if (!byPartner.has(partnerId)) byPartner.set(partnerId, { msgs: [], unread: 0 });
      const entry = byPartner.get(partnerId)!;
      entry.msgs.push(msg);
      if (msg.receiver_id === user.id && !msg.read_at) entry.unread++;
    });

    const partnerIds = [...byPartner.keys()];
    if (partnerIds.length === 0) { setDmConversations([]); setDmsLoading(false); return; }

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, pseudo, full_name, avatar_url")
      .in("id", partnerIds);

    const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id as string, p]));

    const convs: DMConversation[] = partnerIds
      .map((partnerId) => {
        const entry = byPartner.get(partnerId)!;
        const latest = entry.msgs[0];
        const profile = profileMap[partnerId];
        return {
          partner: { id: partnerId, pseudo: profile?.pseudo ?? "inconnu", full_name: profile?.full_name, avatar_url: profile?.avatar_url },
          lastMessage: latest.content,
          lastMessageTime: postTimeAgo(latest.created_at),
          unreadCount: entry.unread,
        };
      })
      .sort((a, b) => {
        const at = byPartner.get(a.partner.id)!.msgs[0].created_at;
        const bt = byPartner.get(b.partner.id)!.msgs[0].created_at;
        return bt.localeCompare(at);
      });

    setDmConversations(convs);
    setDmsLoading(false);
  }, [user]);

  // ── Charger les messages d'un thread ──────────────────────
  const loadDMThread = useCallback(async (partnerId: string) => {
    if (!user) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("direct_messages")
      .select("id, sender_id, receiver_id, content, created_at, read_at")
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${user.id})`)
      .order("created_at", { ascending: true })
      .limit(100);

    if (data) {
      setDmMessages(data as DirectMessage[]);
      // Marquer comme lus
      supabase.from("direct_messages")
        .update({ read_at: new Date().toISOString() })
        .eq("receiver_id", user.id)
        .eq("sender_id", partnerId)
        .is("read_at", null)
        .then(() => {});
    }
  }, [user]);

  // Charger les DMs quand on ouvre la vue
  useEffect(() => {
    if (view === "dms") loadDMConversations();
  }, [view, loadDMConversations]);

  // Charger le thread + realtime quand on ouvre une conversation
  useEffect(() => {
    if (!activeDMPartner || view !== "thread") return;
    loadDMThread(activeDMPartner.id);
    const supabase = createClient();
    const channel = supabase.channel(`dm-${activeDMPartner.id}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "direct_messages",
        filter: `receiver_id=eq.${user?.id}`,
      }, (payload) => {
        const msg = payload.new as DirectMessage;
        if (msg.sender_id === activeDMPartner.id) {
          setDmMessages((prev) => [...prev, msg]);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel).catch(() => {}); };
  }, [activeDMPartner, view]); // eslint-disable-line

  // ── Envoyer un DM ─────────────────────────────────────────
  const handleSendDM = async () => {
    if (!user || !activeDMPartner || !dmInput.trim() || dmSending) return;
    const content = dmInput.trim();
    setDmInput("");
    setDmSending(true);
    const supabase = createClient();
    const optimistic: DirectMessage = {
      id: `temp-${Date.now()}`,
      sender_id: user.id,
      receiver_id: activeDMPartner.id,
      content,
      created_at: new Date().toISOString(),
      read_at: null,
    };
    setDmMessages((prev) => [...prev, optimistic]);
    const { data, error } = await supabase
      .from("direct_messages")
      .insert({ sender_id: user.id, receiver_id: activeDMPartner.id, content })
      .select()
      .single();
    setDmSending(false);
    if (error) {
      setDmMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      showToast("Erreur d'envoi");
    } else if (data) {
      setDmMessages((prev) => prev.map((m) => m.id === optimistic.id ? (data as DirectMessage) : m));
    }
  };

  // Fetch real profiles from Supabase on search
  useEffect(() => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    const q = search.trim();
    if (!q) { setRealProfiles([]); setRealSessions([]); return; }
    searchDebounce.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const supabase = createClient();
        const [profileRes, sessionRes] = await Promise.all([
          searchFilter !== "seances"
            ? supabase.from("profiles").select("id, pseudo, full_name, bio, avatar_url").or(`pseudo.ilike.%${q}%,full_name.ilike.%${q}%`).limit(15)
            : { data: [] },
          searchFilter !== "compte"
            ? supabase.from("custom_sessions").select("id, title, category, duration, difficulty, muscles, accent, icon, user_id").eq("visibility", "public").ilike("title", `%${q}%`).limit(12)
            : { data: [] },
        ]);
        setRealProfiles((profileRes.data as typeof realProfiles) ?? []);
        setRealSessions((sessionRes.data as SessionResult[]) ?? []);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
  }, [search, searchFilter]); // eslint-disable-line

  const filteredResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    return {
      realProfiles: searchFilter !== "seances" ? realProfiles : [],
      influencers:  searchFilter !== "seances" ? influencers.filter(u => !q || u.name.toLowerCase().includes(q)) : [],
      sessions:     searchFilter !== "compte"  ? realSessions : [],
    };
  }, [search, searchFilter, realProfiles, realSessions]);

  return (
    <div
      className="min-h-screen flex flex-col px-4 md:px-8 pt-8 pb-4 max-w-2xl mx-auto md:mx-0 md:max-w-4xl relative overflow-x-hidden"
      onClick={() => { if (openMenu !== null) setOpenMenu(null); if (openRealMenu !== null) setOpenRealMenu(null); }}
    >
      {/* ── Contenu ── */}
      <div className="relative flex flex-col flex-1">
      {/* Top Bar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-between mb-5"
      >
        <h1 className="text-2xl font-extralight tracking-tight" style={{ color: "#2D3748" }}>
          {view === "thread" && activeDMPartner ? `@${activeDMPartner.pseudo}` : "Communauté"}
        </h1>
        <div className="flex items-center gap-2">
          {view === "thread" ? (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setView("dms")}
              className="lg-strong lg-highlight relative w-10 h-10 rounded-2xl flex items-center justify-center cursor-pointer"
              aria-label="Retour"
            >
              <ArrowLeft size={16} strokeWidth={1.5} style={{ color: "#2D3748" }} />
            </motion.button>
          ) : (
            <>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setView(view === "search" ? "feed" : "search")}
                className="lg-strong lg-highlight relative w-10 h-10 rounded-2xl flex items-center justify-center cursor-pointer"
                aria-label="Rechercher"
              >
                <Search size={16} strokeWidth={1.5} style={{ color: view === "search" ? "#A78BFA" : "#2D3748" }} />
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setView(view === "dms" ? "feed" : "dms")}
                className="lg-strong lg-highlight relative w-10 h-10 rounded-2xl flex items-center justify-center cursor-pointer"
                aria-label="Messages"
              >
                <Send size={15} strokeWidth={1.5} style={{ color: view === "dms" ? "#A78BFA" : "#2D3748" }} />
              </motion.button>
            </>
          )}
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        {/* ────── FEED ────── */}
        {view === "feed" && (
          <motion.div
            key="feed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col gap-5 pb-4"
          >
            {/* Stories */}
            {(() => {
              // Grouper TOUTES les stories par user (pas de déduplication)
              // Tri : oldest first pour la lecture dans l'ordre
              const byUser: Record<string, RealStory[]> = {};
              for (const s of realStories) {
                (byUser[s.user_id] ??= []).push(s);
              }
              Object.values(byUser).forEach((arr) =>
                arr.sort((a, b) => a.created_at.localeCompare(b.created_at))
              );

              const myGroup = user ? (byUser[user.id] ?? null) : null;
              // Groupes des autres utilisateurs
              const otherGroups = Object.entries(byUser)
                .filter(([uid]) => uid !== user?.id)
                .map(([, arr]) => arr);

              return (
                <div className="flex gap-3 overflow-x-auto pb-2 pt-2" style={{ scrollbarWidth: "none" }}>

                  {/* Bulle « Moi » — ouvre mes stories ou le modal ajout */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1, type: "spring", bounce: 0.4 }}
                    className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer"
                    onClick={() => myGroup ? setStoryGroup(myGroup) : setShowAddStory(true)}
                  >
                    <motion.div
                      whileHover={{ scale: 1.08, rotate: myGroup ? 0 : 5 }}
                      whileTap={{ scale: 0.92 }}
                      className="w-16 h-16 rounded-full flex items-center justify-center overflow-hidden relative"
                      style={myGroup
                        ? { outline: "2px solid #D4C0FF", outlineOffset: 2, background: "linear-gradient(135deg, #D4C0FF 0%, #F5E6A3 100%)" }
                        : { background: "linear-gradient(135deg, rgba(240,235,255,0.7) 0%, rgba(224,255,255,0.7) 100%)", border: "2px dashed rgba(167,139,250,0.5)" }
                      }
                    >
                      {user?.avatar
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={user.avatar} alt="moi" className="w-full h-full object-cover rounded-full" />
                        : myGroup
                          ? <span className="text-2xl font-semibold" style={{ color: "#2D3748" }}>{(user?.pseudo?.[0] ?? "M").toUpperCase()}</span>
                          : <Plus size={18} strokeWidth={1.5} style={{ color: "#A0AEC0" }} />
                      }
                      {!myGroup && (
                        <div className="absolute bottom-0 right-0 w-5 h-5 rounded-full flex items-center justify-center"
                          style={{ background: "linear-gradient(135deg, #D4C0FF, #F5E6A3)", border: "2px solid white" }}>
                          <Plus size={10} strokeWidth={3} style={{ color: "#2D3748" }} />
                        </div>
                      )}
                      {/* Badge count si plusieurs stories */}
                      {myGroup && myGroup.length > 1 && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
                          style={{ background: "linear-gradient(135deg, #D4C0FF, #F5E6A3)", border: "2px solid white", color: "#2D3748" }}>
                          {myGroup.length}
                        </div>
                      )}
                    </motion.div>
                    <span className="text-[10px] font-medium" style={{ color: myGroup ? "#2D3748" : "#A0AEC0" }}>
                      {myGroup ? "Ma story" : "Vous"}
                    </span>
                  </motion.div>

                  {/* Stories des autres utilisateurs */}
                  {otherGroups.map((group, i) => {
                    const p = group[0]?.profiles;
                    const name = p?.full_name?.split(" ")[0] ?? p?.pseudo ?? "…";
                    const initial = (p?.pseudo?.[0] ?? "?").toUpperCase();
                    return (
                      <motion.div
                        key={group[0].user_id}
                        initial={{ opacity: 0, scale: 0.7, x: -10 }}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        transition={{ delay: 0.12 + i * 0.07, type: "spring", bounce: 0.45 }}
                        whileHover={{ scale: 1.08, y: -2 }}
                        whileTap={{ scale: 0.92 }}
                        className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer"
                        onClick={() => setStoryGroup(group)}
                      >
                        <div className="relative">
                          <div
                            className="w-16 h-16 rounded-full flex items-center justify-center overflow-hidden font-semibold text-lg"
                            style={{
                              background: p?.avatar_url ? "transparent" : "linear-gradient(135deg, #D4C0FF 0%, #F5E6A3 100%)",
                              outline: "2px solid #D4C0FF",
                              outlineOffset: 2,
                              color: "#2D3748",
                            }}
                          >
                            {p?.avatar_url
                              // eslint-disable-next-line @next/next/no-img-element
                              ? <img src={p.avatar_url} alt={name} className="w-full h-full object-cover" />
                              : initial
                            }
                          </div>
                          {/* Badge count si plusieurs stories */}
                          {group.length > 1 && (
                            <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
                              style={{ background: "linear-gradient(135deg, #D4C0FF, #F5E6A3)", border: "2px solid white", color: "#2D3748" }}>
                              {group.length}
                            </div>
                          )}
                        </div>
                        <span className="text-[10px] font-medium max-w-[64px] truncate" style={{ color: "#2D3748" }}>
                          {name}
                        </span>
                      </motion.div>
                    );
                  })}

                  {/* Bouton ajouter une nouvelle story quand j'en ai déjà une */}
                  {myGroup && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.05, type: "spring", bounce: 0.4 }}
                      className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer"
                      onClick={() => setShowAddStory(true)}
                    >
                      <motion.div
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.92 }}
                        className="w-16 h-16 rounded-full flex items-center justify-center"
                        style={{ background: "rgba(240,235,255,0.6)", border: "2px dashed rgba(167,139,250,0.4)" }}
                      >
                        <Plus size={18} strokeWidth={1.5} style={{ color: "#A0AEC0" }} />
                      </motion.div>
                      <span className="text-[10px] font-medium" style={{ color: "#A0AEC0" }}>Nouvelle</span>
                    </motion.div>
                  )}
                </div>
              );
            })()}

            {/* Posts réels depuis Supabase */}
            {feedLoading && (
              <div className="flex justify-center py-10">
                <motion.div
                  className="w-6 h-6 rounded-full border-2"
                  style={{ borderColor: "rgba(167,139,250,0.2)", borderTopColor: "#A78BFA" }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                />
              </div>
            )}

            {!feedLoading && realFeedPosts.filter(p => !hiddenRealIds.has(p.id)).length === 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center py-14 gap-4">
                <div
                  className="w-16 h-16 rounded-3xl flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, rgba(212,192,255,0.3) 0%, rgba(245,230,163,0.25) 100%)", border: "1px solid rgba(167,139,250,0.15)" }}
                >
                  <Heart size={22} strokeWidth={1.3} style={{ color: "#A78BFA" }} />
                </div>
                <div className="text-center px-6">
                  <p className="text-base font-light" style={{ color: "#2D3748" }}>Aucun post pour l&apos;instant</p>
                  <p className="text-xs font-light mt-1.5 leading-relaxed" style={{ color: "#A0AEC0" }}>
                    Suis des personnes et partage tes performances depuis ton profil.
                  </p>
                </div>
              </motion.div>
            )}

            {!feedLoading && realFeedPosts.filter(p => !hiddenRealIds.has(p.id)).map((post, postIdx) => {
              const liked = likedRealIds.has(post.id);
              const isMenuOpen = openRealMenu === post.id;
              const isSaved = savedRealIds.has(post.id);
              const isCommentsOpen = openRealComments.has(post.id);
              const likesCount = post.post_likes.length;
              const commentsCount = post.post_comments.length;
              const authorPseudo = post.author?.pseudo ?? "utilisateur";
              const authorName = post.author?.full_name || authorPseudo;
              const authorAvatar = post.author?.avatar_url;

              return (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.4, delay: postIdx * 0.08, ease: [0.25, 0.46, 0.45, 0.94] }}
                  whileHover={{ y: -2, transition: { duration: 0.18 } }}
                  className="lg-surface lg-highlight relative rounded-3xl overflow-visible"
                >
                  {/* Header */}
                  <div className="flex items-center gap-3 px-4 pt-4 pb-3 relative">
                    <Link href={`/profil/${authorPseudo}`} className="flex-shrink-0">
                      <motion.div
                        whileHover={{ scale: 1.1 }}
                        transition={{ type: "spring", bounce: 0.4 }}
                        className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold overflow-hidden"
                        style={{ background: authorAvatar ? "transparent" : "linear-gradient(135deg, #D4C0FF 0%, #F5E6A3 100%)", color: "#2D3748" }}
                      >
                        {authorAvatar
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img src={authorAvatar} alt={authorPseudo} className="w-full h-full object-cover" />
                          : authorPseudo[0]?.toUpperCase()}
                      </motion.div>
                    </Link>
                    <Link href={`/profil/${authorPseudo}`} className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: "#2D3748" }}>{authorName}</p>
                      <p className="text-[10px]" style={{ color: "#A0AEC0" }}>@{authorPseudo} · {postTimeAgo(post.created_at)}</p>
                    </Link>
                    <div className="relative">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9, rotate: 90 }}
                        transition={{ duration: 0.2 }}
                        onClick={(e) => { e.stopPropagation(); setOpenRealMenu(isMenuOpen ? null : post.id); }}
                        className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer"
                        aria-label="Plus"
                      >
                        <MoreHorizontal size={16} strokeWidth={1.5} style={{ color: isMenuOpen ? "#A78BFA" : "#A0AEC0" }} />
                      </motion.button>
                      <AnimatePresence>
                        {isMenuOpen && (
                          <OptionsMenu
                            postId={post.id}
                            saved={isSaved}
                            onSave={() => {
                              setSavedRealIds((p) => { const n = new Set(p); n.has(post.id) ? n.delete(post.id) : n.add(post.id); return n; });
                              showToast(isSaved ? "Retiré des favoris" : "Sauvegardé ✓");
                            }}
                            onHide={() => {
                              setHiddenRealIds((p) => new Set([...p, post.id]));
                              showToast("Post masqué");
                            }}
                            onReport={() => showToast("Signalement envoyé. Merci !")}
                            onClose={() => setOpenRealMenu(null)}
                          />
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Performance Card */}
                  <div className="px-4">
                    <PerformanceCard data={post.performance_data} size="md" interactive />
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-4 px-4 pt-3">
                    <motion.button
                      whileTap={{ scale: 0.7 }}
                      onClick={() => toggleRealLike(post.id)}
                      className="relative flex items-center gap-1.5 cursor-pointer"
                    >
                      {burstRealId === post.id && [0, 1, 2, 3, 4].map((i) => (
                        <motion.div
                          key={`burst-${post.id}-${i}`}
                          className="absolute pointer-events-none"
                          style={{ width: 6, height: 6, borderRadius: "50%", background: i % 2 === 0 ? "#A78BFA" : "#D4A843" }}
                          initial={{ scale: 0, x: 0, y: 0, opacity: 1 }}
                          animate={{ scale: [0, 1.2, 0], x: [0, (i - 2) * 20], y: [0, -22 - i * 4], opacity: [1, 1, 0] }}
                          transition={{ duration: 0.55, delay: i * 0.04 }}
                        />
                      ))}
                      <motion.div animate={liked ? { scale: [1, 1.5, 0.9, 1.15, 1] } : { scale: 1 }} transition={{ duration: 0.5 }}>
                        <Heart size={20} strokeWidth={liked ? 0 : 1.5} fill={liked ? "#A78BFA" : "none"} style={{ color: liked ? "#A78BFA" : "#2D3748" }} />
                      </motion.div>
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.15 }}
                      whileTap={{ scale: 0.85, rotate: -15 }}
                      onClick={() => setOpenRealComments((p) => { const n = new Set(p); n.has(post.id) ? n.delete(post.id) : n.add(post.id); return n; })}
                      className="flex items-center cursor-pointer"
                      aria-label="Commenter"
                    >
                      <MessageCircle
                        size={20}
                        strokeWidth={1.5}
                        fill={isCommentsOpen ? "rgba(167,139,250,0.2)" : "none"}
                        style={{ color: isCommentsOpen ? "#A78BFA" : "#2D3748" }}
                      />
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.15, rotate: 15 }}
                      whileTap={{ scale: 0.85 }}
                      onClick={() => setSharePost({ caption: post.caption })}
                      className="flex items-center cursor-pointer"
                      aria-label="Partager"
                    >
                      <Share2 size={20} strokeWidth={1.5} style={{ color: "#2D3748" }} />
                    </motion.button>

                    {isSaved && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="ml-auto">
                        <Bookmark size={16} strokeWidth={1.5} fill="#F5E6A3" style={{ color: "#D4A843" }} />
                      </motion.div>
                    )}
                  </div>

                  {/* Stats + caption */}
                  <div className="px-4 pt-2 pb-1">
                    <p className="text-sm font-semibold" style={{ color: "#2D3748" }}>
                      {likesCount} mention{likesCount !== 1 ? "s" : ""} « j&apos;aime »
                    </p>
                    {post.caption && (
                      <p className="text-sm font-light leading-relaxed mt-1" style={{ color: "#2D3748" }}>
                        <span className="font-semibold mr-1.5">{authorPseudo}</span>
                        {post.caption}
                      </p>
                    )}
                    <motion.p
                      whileHover={{ color: "#2D3748" }}
                      className="text-[10px] mt-2 cursor-pointer mb-3"
                      style={{ color: "#A0AEC0" }}
                      onClick={() => setOpenRealComments((p) => { const n = new Set(p); n.has(post.id) ? n.delete(post.id) : n.add(post.id); return n; })}
                    >
                      {isCommentsOpen ? "Masquer les commentaires" : commentsCount > 0 ? `Voir les ${commentsCount} commentaires` : "Ajouter un commentaire"}
                    </motion.p>
                  </div>

                  <AnimatePresence>
                    {isCommentsOpen && (
                      <CommentsSection
                        postId={post.id}
                        initialCount={commentsCount}
                        onClose={() => setOpenRealComments((p) => { const n = new Set(p); n.delete(post.id); return n; })}
                      />
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {/* ────── SEARCH ────── */}
        {view === "search" && (
          <motion.div
            key="search"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col gap-5"
          >
            {/* Search bar */}
            <div className="lg-strong lg-highlight relative flex items-center gap-3 px-4 py-3 rounded-2xl">
              <Search size={16} strokeWidth={1.5} style={{ color: "#A0AEC0" }} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
                placeholder="Rechercher comptes, programmes, recettes…"
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-[#A0AEC0]"
                style={{ color: "#2D3748" }}
              />
              {search && (
                <button onClick={() => setSearch("")} className="cursor-pointer" aria-label="Effacer">
                  <X size={14} strokeWidth={2} style={{ color: "#A0AEC0" }} />
                </button>
              )}
            </div>

            {/* Filters */}
            <div className="flex gap-2">
              {(["tous", "compte", "seances"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setSearchFilter(f)}
                  className="px-4 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-all duration-150"
                  style={
                    searchFilter === f
                      ? { background: "linear-gradient(135deg, #D4C0FF 0%, #F5E6A3 100%)", color: "#2D3748", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8)" }
                      : { background: "rgba(255,255,255,0.55)", color: "#A0AEC0", border: "1px solid rgba(255,255,255,0.6)" }
                  }
                >
                  {f === "tous" ? "Tous" : f === "compte" ? "Personnes" : "Séances"}
                </button>
              ))}
            </div>

            {/* Influencers */}
            {filteredResults.influencers.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold tracking-widest uppercase mb-2 px-1" style={{ color: "#A0AEC0" }}>
                  Influenceurs vérifiés
                </p>
                <div className="flex flex-col gap-2">
                  {filteredResults.influencers.map((u) => {
                    const isFollowing = following.has(u.handle);
                    return (
                      <div key={u.handle} className="lg-surface lg-highlight relative flex items-center gap-3 px-4 py-3 rounded-2xl">
                        <Avatar user={u} size={44} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate" style={{ color: "#2D3748" }}>{u.name}</p>
                          <p className="text-[11px] font-light truncate" style={{ color: "#718096" }}>{u.bio}</p>
                          <p className="text-[10px]" style={{ color: "#A0AEC0" }}>{u.followers} abonnés</p>
                        </div>
                        <motion.button
                          whileTap={{ scale: 0.94 }}
                          onClick={() => toggleFollow(u.handle)}
                          className="text-[11px] font-semibold px-3 py-1.5 rounded-xl cursor-pointer transition-all"
                          style={isFollowing
                            ? { background: "rgba(255,255,255,0.6)", color: "#A0AEC0", border: "1px solid rgba(240,235,255,0.9)" }
                            : { background: "linear-gradient(135deg, #D4C0FF 0%, #F5E6A3 100%)", color: "#2D3748", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8)" }
                          }
                        >
                          {isFollowing ? "Suivi ✓" : "Suivre"}
                        </motion.button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Real users from Supabase */}
            {searchLoading && (
              <div className="flex justify-center py-6">
                <motion.div className="w-5 h-5 rounded-full border-2"
                  style={{ borderColor: "rgba(167,139,250,0.2)", borderTopColor: "#A78BFA" }}
                  animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} />
              </div>
            )}
            {!searchLoading && filteredResults.realProfiles.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold tracking-widest uppercase mb-2 px-1" style={{ color: "#A0AEC0" }}>
                  Comptes
                </p>
                <div className="flex flex-col gap-2">
                  {filteredResults.realProfiles.map((profile) => {
                    const isF = followingIds.has(profile.id);
                    return (
                      <div key={profile.id} className="lg-surface lg-highlight relative flex items-center gap-3 px-4 py-3 rounded-2xl">
                        {/* Avatar cliquable → profil */}
                        <Link href={`/profil/${profile.pseudo}`} className="flex-shrink-0">
                          <div className="w-11 h-11 rounded-full flex items-center justify-center text-base font-semibold overflow-hidden"
                            style={{ background: profile.avatar_url ? "transparent" : "linear-gradient(135deg,#D4C0FF,#F5E6A3)", color: "#2D3748" }}>
                            {profile.avatar_url
                              // eslint-disable-next-line @next/next/no-img-element
                              ? <img src={profile.avatar_url} alt={profile.pseudo} className="w-full h-full object-cover" />
                              : (profile.pseudo?.[0] ?? "?").toUpperCase()}
                          </div>
                        </Link>
                        {/* Infos cliquables */}
                        <Link href={`/profil/${profile.pseudo}`} className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate" style={{ color: "#2D3748" }}>{profile.full_name || profile.pseudo}</p>
                          <p className="text-[11px]" style={{ color: "#A78BFA" }}>@{profile.pseudo}</p>
                          {profile.bio && <p className="text-[10px] truncate mt-0.5" style={{ color: "#A0AEC0" }}>{profile.bio}</p>}
                        </Link>
                        {/* Bouton suivre connecté à Supabase */}
                        {user && user.id !== profile.id && (
                          <motion.button
                            whileTap={{ scale: 0.92 }}
                            onClick={() => handleFollowReal(profile)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer flex-shrink-0"
                            style={isF
                              ? { background: "rgba(240,235,255,0.7)", color: "#A78BFA", border: "1px solid rgba(167,139,250,0.2)" }
                              : { background: "linear-gradient(135deg, #D4C0FF 0%, #F5E6A3 100%)", color: "#2D3748", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8)" }
                            }
                            aria-label={isF ? "Ne plus suivre" : "Suivre"}
                          >
                            {isF
                              ? <><UserCheck size={13} strokeWidth={2} />Suivi</>
                              : <><UserPlus size={13} strokeWidth={2} />Suivre</>
                            }
                          </motion.button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Sessions publiques */}
            {filteredResults.sessions.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold tracking-widest uppercase mb-2 px-1" style={{ color: "#A0AEC0" }}>
                  Séances · {filteredResults.sessions.length} résultat{filteredResults.sessions.length > 1 ? "s" : ""}
                </p>
                <div className="flex flex-col gap-2">
                  {filteredResults.sessions.map((s) => {
                    const catColors: Record<string, string> = { force: "#A78BFA", cardio: "#FBBF24", mobilite: "#34D399", fullbody: "#FB923C" };
                    const accent = s.accent || catColors[s.category] || "#A78BFA";
                    const diffColor: Record<string, string> = { "Débutant": "#34D399", "Intermédiaire": "#FBBF24", "Avancé": "#A78BFA" };
                    return (
                      <motion.div
                        key={s.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileHover={{ y: -1 }}
                        className="lg-surface lg-highlight relative rounded-2xl overflow-hidden"
                      >
                        {/* Accent bar */}
                        <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl" style={{ background: accent }} />
                        <div className="flex items-center gap-3 px-4 py-3 pl-5">
                          <div
                            className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                            style={{ background: `${accent}20`, border: `1px solid ${accent}40` }}
                          >
                            <Dumbbell size={15} strokeWidth={1.5} style={{ color: accent }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate" style={{ color: "#2D3748" }}>{s.title}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] font-light" style={{ color: "#A0AEC0" }}>{s.duration} min</span>
                              <span className="w-px h-2.5" style={{ background: "rgba(0,0,0,0.1)" }} />
                              <span className="text-[10px] font-medium" style={{ color: diffColor[s.difficulty] ?? "#A0AEC0" }}>{s.difficulty}</span>
                              {s.muscles?.[0] && <>
                                <span className="w-px h-2.5" style={{ background: "rgba(0,0,0,0.1)" }} />
                                <span className="text-[10px] font-light truncate" style={{ color: "#A0AEC0" }}>{s.muscles.slice(0, 2).join(" · ")}</span>
                              </>}
                            </div>
                          </div>
                          <span
                            className="text-[9px] font-bold tracking-wider uppercase px-2 py-1 rounded-full flex-shrink-0"
                            style={{ background: `${accent}18`, color: accent }}
                          >
                            {s.category === "force" ? "Force" : s.category === "cardio" ? "Cardio" : s.category === "mobilite" ? "Mobilité" : "Full Body"}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Sessions empty state when filter = séances */}
            {!searchLoading && searchFilter === "seances" && search.trim() && filteredResults.sessions.length === 0 && (
              <div className="text-center py-8">
                <p className="text-sm font-light" style={{ color: "#A0AEC0" }}>
                  Aucune séance publique pour « {search} »
                </p>
                <p className="text-[11px] mt-1" style={{ color: "#A0AEC0" }}>
                  Les créateurs peuvent publier leurs séances depuis leur bibliothèque
                </p>
              </div>
            )}

            {!searchLoading && filteredResults.realProfiles.length === 0 && filteredResults.influencers.length === 0 && filteredResults.sessions.length === 0 && !(searchFilter === "seances" && search.trim()) && (
              <div className="text-center py-12">
                <p className="text-sm font-light" style={{ color: "#A0AEC0" }}>
                  {search ? `Aucun résultat pour « ${search} »` : "Tape quelque chose pour rechercher"}
                </p>
              </div>
            )}
          </motion.div>
        )}

        {/* ────── DMs LIST ────── */}
        {view === "dms" && (
          <motion.div
            key="dms"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col gap-2"
          >
            {dmsLoading ? (
              <div className="flex justify-center py-12">
                <motion.div
                  className="w-5 h-5 rounded-full border-2"
                  style={{ borderColor: "rgba(167,139,250,0.3)", borderTopColor: "#A78BFA" }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                />
              </div>
            ) : dmConversations.length === 0 ? (
              <div className="text-center py-16 flex flex-col items-center gap-3">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, rgba(240,235,255,0.8) 0%, rgba(255,251,240,0.8) 100%)" }}
                >
                  <Send size={20} strokeWidth={1.5} style={{ color: "#A0AEC0" }} />
                </div>
                <p className="text-sm font-light" style={{ color: "#A0AEC0" }}>Aucune conversation</p>
                <p className="text-xs font-light" style={{ color: "#C4C9D4" }}>
                  Envoie un message à quelqu'un depuis son profil
                </p>
              </div>
            ) : (
              dmConversations.map((conv) => (
                <motion.button
                  key={conv.partner.id}
                  whileHover={{ x: 2 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => { setActiveDMPartner(conv.partner); setDmMessages([]); setView("thread"); }}
                  className="lg-surface lg-highlight relative flex items-center gap-3 px-4 py-3 rounded-2xl cursor-pointer text-left"
                >
                  <ProfileAvatar partner={conv.partner} size={48} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold truncate" style={{ color: "#2D3748" }}>
                        {conv.partner.full_name ?? conv.partner.pseudo}
                      </p>
                      <span className="text-[10px] flex-shrink-0" style={{ color: "#A0AEC0" }}>{conv.lastMessageTime}</span>
                    </div>
                    <p className="text-xs font-light truncate mt-0.5" style={{ color: conv.unreadCount > 0 ? "#2D3748" : "#A0AEC0" }}>
                      {conv.lastMessage}
                    </p>
                  </div>
                  {conv.unreadCount > 0 && (
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                      style={{ background: "linear-gradient(135deg, #D4C0FF 0%, #A78BFA 100%)", color: "#FFFFFF", boxShadow: "0 2px 8px rgba(167,139,250,0.4)" }}
                    >
                      {conv.unreadCount}
                    </div>
                  )}
                </motion.button>
              ))
            )}
          </motion.div>
        )}

        {/* ────── THREAD ────── */}
        {view === "thread" && activeDMPartner && (
          <motion.div
            key="thread"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col flex-1"
            style={{ minHeight: "calc(100vh - 200px)" }}
          >
            <div className="flex flex-col gap-3 flex-1 pb-4 overflow-y-auto">
              {dmMessages.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 gap-2">
                  <ProfileAvatar partner={activeDMPartner} size={48} />
                  <p className="text-sm font-light mt-1" style={{ color: "#A0AEC0" }}>
                    Début de la conversation avec @{activeDMPartner.pseudo}
                  </p>
                </div>
              )}
              {dmMessages.map((msg, i) => {
                const isMe = msg.sender_id === user?.id;
                const timeStr = new Date(msg.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: i < 6 ? i * 0.04 : 0, type: "spring", bounce: 0.3 }}
                    className={`flex ${isMe ? "justify-end" : "justify-start"} items-end gap-2`}
                  >
                    {!isMe && <ProfileAvatar partner={activeDMPartner} size={28} />}
                    <div>
                      <div
                        className="px-4 py-2.5 rounded-2xl text-sm font-light max-w-[260px]"
                        style={isMe
                          ? { background: "linear-gradient(135deg, #D4C0FF 0%, #F5E6A3 100%)", color: "#2D3748", borderBottomRightRadius: 6, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8)" }
                          : { background: "rgba(255,255,255,0.7)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.7)", color: "#2D3748", borderBottomLeftRadius: 6 }
                        }
                      >
                        {msg.content}
                      </div>
                      <p className={`text-[9px] mt-1 ${isMe ? "text-right" : ""}`} style={{ color: "#A0AEC0" }}>{timeStr}</p>
                    </div>
                  </motion.div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className="lg-strong lg-highlight relative flex items-center gap-2 p-2.5 rounded-2xl mt-auto">
              <input
                type="text"
                value={dmInput}
                onChange={(e) => setDmInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSendDM(); }}
                placeholder="Message…"
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-[#A0AEC0] px-2"
                style={{ color: "#2D3748" }}
              />
              <motion.button
                whileHover={{ scale: dmInput.trim() ? 1.08 : 1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleSendDM}
                disabled={dmSending}
                className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer flex-shrink-0 transition-all duration-200"
                style={{
                  background: dmInput.trim() ? "linear-gradient(135deg, #D4C0FF 0%, #F5E6A3 100%)" : "rgba(240,235,255,0.5)",
                  boxShadow: dmInput.trim() ? "inset 0 1px 0 rgba(255,255,255,0.8)" : "none",
                }}
                aria-label="Envoyer"
              >
                <Send size={13} strokeWidth={2} style={{ color: dmInput.trim() ? "#2D3748" : "#A0AEC0" }} />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Modals */}
      <AnimatePresence>
        {sharePost && <ShareModal postCaption={sharePost.caption} onClose={() => setSharePost(null)} />}
        {showAddStory && (
          <AddStoryModal
            onClose={() => setShowAddStory(false)}
            userId={user?.id ?? null}
            onPublished={() => { loadStories(); }}
          />
        )}
        {storyGroup && <StoryViewer stories={storyGroup} onClose={() => setStoryGroup(null)} />}
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", bounce: 0.4, duration: 0.5 }}
            className="fixed bottom-32 md:bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl flex items-center gap-2"
            style={{
              background: "rgba(255,255,255,0.9)",
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(240,235,255,0.9)",
              boxShadow: "0 8px 32px rgba(167,139,250,0.2), inset 0 1px 0 rgba(255,255,255,0.9)",
              color: "#2D3748",
              whiteSpace: "nowrap",
            }}
          >
            <Check size={14} strokeWidth={2.5} style={{ color: "#D4A843" }} />
            <span className="text-sm font-medium">{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}
