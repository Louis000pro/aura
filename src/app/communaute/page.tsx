"use client";

import { useState, useMemo, useRef, useEffect, useCallback, memo, Suspense } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Heart, MessageCircle, Share2, Send, Plus, ArrowLeft, BadgeCheck, UserPlus, UserCheck, MoreHorizontal, X, Camera, Check, Bookmark, Flag, EyeOff, Dumbbell, Compass, PenLine, Pencil, Repeat2, Play, ChevronRight, ChevronLeft } from "lucide-react";
import VideoPlayer from "@/components/VideoPlayer";
import Link from "next/link";
import PerformanceCard, { type PerformanceData } from "@/components/PerformanceCard";
import WorkoutGuideModal, { type Exercise, resolveSessionId } from "@/components/WorkoutGuideModal";
import CreatePostModal from "@/components/CreatePostModal";
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


type RealStory = {
  id: string;
  user_id: string;
  content_type: "workout" | "meal" | "text" | "photo" | "video";
  content_data: Record<string, unknown> | null;
  caption: string | null;
  media_url?: string | null;
  media_type?: string | null;
  created_at: string;
  expires_at: string;
  profiles: { pseudo: string; full_name: string | null; avatar_url: string | null; is_admin?: boolean; is_certified?: boolean } | null;
};

type RealPost = {
  id: string;
  user_id: string;
  type: "workout" | "meal" | "day";
  caption: string;
  description?: string | null;
  audience: "public" | "friends" | "private";
  performance_data: PerformanceData;
  media_url?: string | null;
  media_type?: string | null;
  views?: number;
  created_at: string;
  author: { pseudo: string; full_name?: string; avatar_url?: string; is_admin?: boolean; is_certified?: boolean } | null;
  post_likes: { user_id: string }[];
  post_comments: { id: string }[];
  post_reposts: { user_id: string }[];
  post_saves: { user_id: string }[];
};

type DmReaction = {
  emoji: string;
  count: number;
  reacted: boolean; // current user reacted?
};

type DirectMessage = {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
  reply_to_id?: string | null;
  reply_to_content?: string | null; // fetched client-side
  post_id?: string | null;          // post partagé via DM
  shared_post?: {                   // données du post, fetched client-side
    id: string;
    caption?: string | null;
    media_url?: string | null;
    media_type?: string | null;
    type?: string;
  } | null;
  reactions?: DmReaction[];
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
        <img loading="lazy" decoding="async" src={partner.avatar_url} alt={partner.pseudo} style={{ width: size, height: size, objectFit: "cover" }} />
      ) : initial}
    </div>
  );
}

// ── helpers pour le contenu d'une story ──────────────────────
function StoryCard({ story }: { story: RealStory }) {
  const d = story.content_data ?? {};

  // Photo ou vidéo — full screen dans le viewer
  // "image" = ancien bug (content_type mal défini), accepté en fallback
  if ((story.content_type === "photo" || story.content_type === "video" || story.content_type === ("image" as string)) && story.media_url) {
    return (
      <motion.div
        key={story.id}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0"
        style={{ background: "#000" }}
      >
        {story.content_type === "video"
          ? <video src={story.media_url} className="w-full h-full object-cover" muted playsInline autoPlay loop preload="auto" />
          // eslint-disable-next-line @next/next/no-img-element
          : <img loading="lazy" decoding="async" src={story.media_url} alt="" className="w-full h-full object-cover" />}
        {story.caption && (
          <div className="absolute bottom-0 inset-x-0 px-6 pb-10 pt-16"
            style={{ background: "linear-gradient(to top, rgba(0,0,0,0.75), transparent)" }}>
            <p className="text-white text-base font-semibold">{story.caption}</p>
          </div>
        )}
      </motion.div>
    );
  }

  if (story.content_type === "workout") {
    return (
      <motion.div
        key={story.id}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        transition={{ duration: 0.25 }}
        className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center"
        style={{ background: "linear-gradient(160deg, #1A0A35 0%, #3D1A6B 50%, #2D1F50 100%)" }}
      >
        <div className="text-7xl mb-5">💪</div>
        <div className="inline-block px-4 py-1.5 rounded-full text-xs font-bold mb-5 tracking-widest uppercase"
          style={{ background: "rgba(167,139,250,0.2)", color: "rgba(212,192,255,0.9)", border: "1px solid rgba(167,139,250,0.3)" }}>
          Séance
        </div>
        <p className="text-2xl font-bold text-white mb-2">{(d.session_title as string) ?? "Séance"}</p>
        {story.caption && <p className="text-sm font-light mb-6" style={{ color: "rgba(255,255,255,0.65)" }}>{story.caption}</p>}
        <div className="flex justify-center gap-8 mt-2">
          {(d.duration_minutes as number) > 0 && (
            <div className="text-center">
              <p className="text-3xl font-bold text-white">{d.duration_minutes as number}</p>
              <p className="text-xs mt-1" style={{ color: "rgba(212,192,255,0.7)" }}>min</p>
            </div>
          )}
          {(d.calories_burned as number) > 0 && (
            <div className="text-center">
              <p className="text-3xl font-bold text-white">{d.calories_burned as number}</p>
              <p className="text-xs mt-1" style={{ color: "rgba(212,192,255,0.7)" }}>kcal</p>
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
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        transition={{ duration: 0.25 }}
        className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center"
        style={{ background: "linear-gradient(160deg, #0A2A1A 0%, #1A4A2A 50%, #0D2A1A 100%)" }}
      >
        <div className="text-7xl mb-5">🥗</div>
        <div className="inline-block px-4 py-1.5 rounded-full text-xs font-bold mb-5 tracking-widest uppercase"
          style={{ background: "rgba(52,211,153,0.15)", color: "rgba(110,231,183,0.9)", border: "1px solid rgba(52,211,153,0.25)" }}>
          Repas
        </div>
        <p className="text-2xl font-bold text-white mb-2">{(d.meal_title as string) ?? "Repas"}</p>
        {story.caption && <p className="text-sm font-light mb-6" style={{ color: "rgba(255,255,255,0.65)" }}>{story.caption}</p>}
        <div className="flex justify-center gap-8 mt-2">
          {(d.calories as number) > 0 && (
            <div className="text-center">
              <p className="text-3xl font-bold text-white">{d.calories as number}</p>
              <p className="text-xs mt-1" style={{ color: "rgba(110,231,183,0.7)" }}>kcal</p>
            </div>
          )}
          {(d.proteins as number) > 0 && (
            <div className="text-center">
              <p className="text-3xl font-bold text-white">{d.proteins as number}g</p>
              <p className="text-xs mt-1" style={{ color: "rgba(110,231,183,0.7)" }}>protéines</p>
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      key={story.id}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center"
      style={{ background: "radial-gradient(circle at 50% 34%, #FBF0C8 0%, #ECC766 46%, #CE9F38 100%)" }}
    >
      <div className="text-7xl mb-5">{(d.emoji as string) ?? "✨"}</div>
      <p className="text-2xl font-semibold leading-snug" style={{ color: "#4A3712" }}>{(d.text as string) ?? (story.caption ?? "")}</p>
      {story.caption && story.caption !== (d.text as string) && (
        <p className="text-sm font-light mt-4" style={{ color: "rgba(74,55,18,0.7)" }}>{story.caption}</p>
      )}
    </motion.div>
  );
}

// Story Viewer — plusieurs stories d'un même utilisateur, navigation gauche/droite
function StoryViewer({ stories, onClose }: { stories: RealStory[]; onClose: () => void }) {
  const { user } = useAuth();
  const [idx, setIdx]       = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reply, setReply]   = useState("");
  const [replySending, setReplySending] = useState(false);
  const [replySent, setReplySent] = useState(false);

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

  // L'auteur de la story = destinataire de la réponse (envoyée en DM)
  const isOwnStory = user?.id === story?.user_id;

  const sendReply = useCallback(async () => {
    const text = reply.trim();
    if (!text || !user || !story || isOwnStory || replySending) return;
    setReplySending(true);
    try {
      const supabase = createClient();
      const ownerName = story.profiles?.pseudo ?? "story";
      await supabase.from("direct_messages").insert({
        sender_id: user.id,
        receiver_id: story.user_id,
        content: `↩️ Réponse à ta story : ${text}`,
      });
      // Notification au propriétaire de la story
      void supabase.from("notifications").insert({
        user_id: story.user_id,
        from_user_id: user.id,
        from_pseudo: user.pseudo,
        from_avatar_url: user.avatar ?? null,
        type: "story_reply",
      });
      setReply("");
      setReplySent(true);
      setTimeout(() => setReplySent(false), 2200);
      void ownerName;
    } catch {
      /* silencieux */
    } finally {
      setReplySending(false);
    }
  }, [reply, user, story, isOwnStory, replySending]);

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
      className="fixed inset-0 z-[60] flex flex-col select-none"
      style={{ background: "rgba(0,0,0,0.92)", backdropFilter: "blur(10px)", cursor: paused ? "default" : "pointer" }}
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
            ? <img loading="lazy" decoding="async" src={profile.avatar_url} alt={displayName} className="w-full h-full object-cover" />
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
      <div className="relative flex-1 overflow-hidden pointer-events-none">
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

      {/* Reply bar — masquée sur sa propre story */}
      {!isOwnStory && (
        <div className="px-5 pb-10 z-10" data-no-hold>
          {replySent ? (
            <div className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl"
              style={{ background: "rgba(52,211,153,0.18)", border: "1px solid rgba(52,211,153,0.35)" }}>
              <Check size={16} strokeWidth={2} style={{ color: "#6EE7B7" }} />
              <span className="text-sm font-medium" style={{ color: "#6EE7B7" }}>Réponse envoyée</span>
            </div>
          ) : (
            <div className="flex items-center gap-3 px-4 py-3 rounded-2xl" style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)" }}>
              <input
                type="text"
                value={reply}
                onChange={(e) => { setReply(e.target.value); }}
                onFocus={() => setPaused(true)}
                onBlur={() => setPaused(false)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void sendReply(); } }}
                placeholder={`Répondre à ${displayName.split(" ")[0]}…`}
                className="flex-1 bg-transparent text-sm outline-none"
                style={{ color: "white" }}
              />
              <button
                onClick={() => void sendReply()}
                disabled={!reply.trim() || replySending}
                className="flex-shrink-0 cursor-pointer disabled:cursor-default"
                aria-label="Envoyer la réponse"
              >
                <Send size={18} strokeWidth={1.8} style={{ color: reply.trim() ? "#fff" : "rgba(255,255,255,0.3)" }} />
              </button>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

// Add Story Modal — enregistre vraiment dans Supabase
type AddStep = "pick" | "workout-list" | "workout-preview" | "text-input" | "meal-input" | "photo-pick" | "photo-preview" | "loading" | "saving" | "success" | "no-session" | "db-error";
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
  const [mealTitle, setMealTitle]   = useState("");
  const [mealCals, setMealCals]     = useState("");
  const [mealProts, setMealProts]   = useState("");
  const [error, setError]             = useState<string | null>(null);
  const [mediaFile, setMediaFile]     = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType]     = useState<"image" | "video">("image");
  const [publishedStoryId, setPublishedStoryId] = useState<string | null>(null);
  const [publishedMediaUrl, setPublishedMediaUrl] = useState<string | null>(null);
  const [savingToHL, setSavingToHL]   = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

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
    if (e) { console.error("publishWorkout:", e); setError("La publication a échoué, réessaie"); setStep("workout-preview"); return; }
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
    if (e) { console.error("publishText:", e); setError("La publication a échoué, réessaie"); setStep("text-input"); return; }
    setStep("success");
    onPublished();
  };

  const publishMeal = async () => {
    if (!userId || !mealTitle.trim()) return;
    setStep("saving");
    const supabase = createClient();
    const { error: e } = await supabase.from("stories").insert({
      user_id:      userId,
      content_type: "meal",
      content_data: {
        meal_title: mealTitle.trim(),
        calories:   mealCals ? parseInt(mealCals) || 0 : 0,
        proteins:   mealProts ? parseInt(mealProts) || 0 : 0,
      },
      caption: caption.trim() || null,
    });
    if (e) { console.error("publishMeal:", e); setError("La publication a échoué, réessaie"); setStep("meal-input"); return; }
    setStep("success");
    onPublished();
  };

  // Sélection d'un fichier photo/vidéo
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isVid = file.type.startsWith("video/");
    setMediaFile(file);
    setMediaType(isVid ? "video" : "image");
    const objUrl = URL.createObjectURL(file);
    setMediaPreview(prev => { if (prev) URL.revokeObjectURL(prev); return objUrl; });
    setStep("photo-preview");
  };

  // Publier la photo/vidéo comme story
  const publishMedia = async () => {
    if (!userId || !mediaFile) return;
    setStep("saving");
    try {
      const supabase = createClient();
      const ext  = mediaFile.name.split(".").pop();
      const path = `${userId}/story_${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("avatars").upload(path, mediaFile, { upsert: true });
      if (uploadErr) { console.error("publishMedia upload:", uploadErr); setError("L'envoi du média a échoué, réessaie"); setStep("photo-preview"); return; }
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      const mediaUrl = urlData.publicUrl + "?t=" + Date.now();
      const { data: inserted, error: e } = await supabase.from("stories").insert({
        user_id:      userId,
        content_type: mediaType === "image" ? "photo" : "video", // Fix: "photo" pas "image"
        content_data: null,
        caption:      caption.trim() || null,
        media_url:    mediaUrl,
        media_type:   mediaType,
      }).select("id").single();
      if (e) { console.error("publishMedia insert:", e); setError("La publication a échoué, réessaie"); setStep("photo-preview"); return; }
      setPublishedStoryId(inserted?.id ?? null);
      setPublishedMediaUrl(mediaUrl);
      setStep("success");
      onPublished();
    } catch (err) {
      console.error("publishMedia:", err);
      setError("Une erreur est survenue, réessaie");
      setStep("photo-preview");
    }
  };

  // Sauvegarder la story publiée dans une story à la une
  const saveToHighlight = async () => {
    if (!userId || !publishedMediaUrl) return;
    setSavingToHL(true);
    try {
      const supabase = createClient();
      // Fetch user's highlights
      const { data: hls } = await supabase.from("highlights").select("id, name").eq("user_id", userId).order("created_at", { ascending: true });
      if (!hls || hls.length === 0) {
        // Create a default highlight
        const { data: hl } = await supabase.from("highlights").insert({ user_id: userId, name: "Story", cover_url: publishedMediaUrl }).select("id").single();
        if (hl) {
          await supabase.from("highlight_items").insert({ highlight_id: hl.id, media_url: publishedMediaUrl, media_type: mediaType, story_id: publishedStoryId ?? null });
        }
      } else {
        // Add to first highlight (or could show picker — simplified here)
        const hl = hls[0];
        const { data: existing } = await supabase.from("highlight_items").select("id", { count: "exact", head: true }).eq("highlight_id", hl.id);
        const order = (existing as unknown as { count: number })?.count ?? 0;
        await supabase.from("highlight_items").insert({ highlight_id: hl.id, media_url: publishedMediaUrl, media_type: mediaType, story_id: publishedStoryId ?? null, display_order: order });
      }
    } finally { setSavingToHL(false); }
    onClose();
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
          backdropFilter: "blur(12px)",
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
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { emoji: "📷", label: "Photo / Vidéo", desc: "Depuis ta galerie", action: () => fileRef.current?.click() },
                  { emoji: "💪", label: "Ma séance",     desc: "Perf sportive",    action: handleWorkout },
                  { emoji: "🥗", label: "Mon repas",     desc: "Calories & protéines", action: () => setStep("meal-input") },
                  { emoji: "✍️", label: "Texte",         desc: "Message + emoji",  action: () => setStep("text-input") },
                ].map(({ emoji, label, desc, action }) => (
                  <motion.button
                    key={label}
                    whileHover={{ scale: 1.04, y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={action}
                    className="flex flex-col items-center gap-2 p-3.5 rounded-2xl cursor-pointer"
                    style={{ background: "linear-gradient(135deg, #F0EBFF 0%, #FFFBF0 100%)", border: "1px solid rgba(255,255,255,0.8)" }}
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-2xl" style={{ background: "rgba(255,255,255,0.7)" }}>
                      {emoji}
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-semibold" style={{ color: "#2D3748" }}>{label}</p>
                      <p className="text-[9px]" style={{ color: "#A0AEC0" }}>{desc}</p>
                    </div>
                  </motion.button>
                ))}
              </div>
              <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFileSelect} />
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

          {/* ── Saisie repas ── */}
          {step === "meal-input" && (
            <motion.div key="meal-input" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
              <div className="flex items-center gap-2 mb-5">
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => setStep("pick")} className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer" style={{ background: "rgba(240,235,255,0.8)" }}>
                  <ArrowLeft size={14} strokeWidth={2} style={{ color: "#A0AEC0" }} />
                </motion.button>
                <h2 className="text-base font-light flex-1" style={{ color: "#2D3748" }}>Mon repas 🥗</h2>
              </div>

              <div className="flex flex-col gap-3 mb-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: "#A0AEC0" }}>Nom du repas *</p>
                  <input
                    type="text"
                    value={mealTitle}
                    onChange={e => setMealTitle(e.target.value)}
                    placeholder="Ex : Bowl protéiné, Déjeuner…"
                    autoFocus
                    className="w-full text-sm outline-none px-4 py-3 rounded-xl"
                    style={{ background: "rgba(240,235,255,0.5)", border: "1px solid rgba(212,192,255,0.5)", color: "#2D3748" }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: "#A0AEC0" }}>Calories</p>
                    <input
                      type="number"
                      value={mealCals}
                      onChange={e => setMealCals(e.target.value)}
                      placeholder="kcal"
                      className="w-full text-sm outline-none px-3 py-2.5 rounded-xl"
                      style={{ background: "rgba(240,235,255,0.5)", border: "1px solid rgba(212,192,255,0.5)", color: "#2D3748" }}
                    />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: "#A0AEC0" }}>Protéines</p>
                    <input
                      type="number"
                      value={mealProts}
                      onChange={e => setMealProts(e.target.value)}
                      placeholder="grammes"
                      className="w-full text-sm outline-none px-3 py-2.5 rounded-xl"
                      style={{ background: "rgba(240,235,255,0.5)", border: "1px solid rgba(212,192,255,0.5)", color: "#2D3748" }}
                    />
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: "#A0AEC0" }}>Légende (optionnel)</p>
                  <input
                    type="text"
                    value={caption}
                    onChange={e => setCaption(e.target.value)}
                    placeholder="Ajoute une note…"
                    className="w-full text-sm outline-none px-4 py-2.5 rounded-xl"
                    style={{ background: "rgba(240,235,255,0.5)", border: "1px solid rgba(212,192,255,0.5)", color: "#2D3748" }}
                  />
                </div>
              </div>

              {error && <p className="text-xs mb-2" style={{ color: "#FC8181" }}>{error}</p>}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={publishMeal}
                className="w-full py-3 rounded-2xl text-sm font-semibold cursor-pointer transition-opacity"
                style={{
                  background: mealTitle.trim() ? "linear-gradient(135deg, #D4C0FF 0%, #F5E6A3 100%)" : "rgba(240,235,255,0.6)",
                  color: mealTitle.trim() ? "#2D3748" : "#A0AEC0",
                  boxShadow: mealTitle.trim() ? "inset 0 1px 0 rgba(255,255,255,0.8)" : "none",
                  cursor: mealTitle.trim() ? "pointer" : "not-allowed",
                }}
              >
                Publier la story
              </motion.button>
            </motion.div>
          )}

          {/* ── Aperçu photo/vidéo ── */}
          {step === "photo-preview" && mediaPreview && (
            <motion.div key="photo-preview" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
              <div className="flex items-center gap-2 mb-4">
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => { setStep("pick"); if (mediaPreview) URL.revokeObjectURL(mediaPreview); setMediaPreview(null); setMediaFile(null); }} className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer" style={{ background: "rgba(240,235,255,0.8)" }}>
                  <ArrowLeft size={14} strokeWidth={2} style={{ color: "#A0AEC0" }} />
                </motion.button>
                <h2 className="text-base font-light flex-1" style={{ color: "#2D3748" }}>Aperçu de ta story</h2>
              </div>

              <div className="rounded-2xl overflow-hidden mb-4" style={{ aspectRatio: "9/16", maxHeight: 280, background: "#000" }}>
                {mediaType === "video"
                  ? <video src={mediaPreview} className="w-full h-full object-cover" muted playsInline autoPlay loop />
                  // eslint-disable-next-line @next/next/no-img-element
                  : <img loading="lazy" decoding="async" src={mediaPreview} alt="" className="w-full h-full object-cover" />}
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
                onClick={publishMedia}
                className="w-full py-3 rounded-2xl text-sm font-semibold cursor-pointer"
                style={{ background: "linear-gradient(135deg, #D4C0FF 0%, #F5E6A3 100%)", color: "#2D3748", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8)" }}
              >
                Publier la story
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

              {/* Option sauvegarder dans highlight (pour photo/vidéo uniquement) */}
              {publishedMediaUrl && (
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={saveToHighlight}
                  disabled={savingToHL}
                  className="w-full py-3 rounded-2xl text-sm font-semibold cursor-pointer flex items-center justify-center gap-2"
                  style={{ background: "rgba(212,192,255,0.3)", color: "#5A4A8A", border: "1px solid rgba(167,139,250,0.3)" }}
                >
                  {savingToHL ? (
                    <>
                      <motion.div className="w-4 h-4 rounded-full border-2" style={{ borderColor: "rgba(167,139,250,0.3)", borderTopColor: "#A78BFA" }}
                        animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} />
                      Sauvegarde…
                    </>
                  ) : (
                    <>⭐ Sauvegarder dans une story à la une</>
                  )}
                </motion.button>
              )}

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={onClose}
                className="mt-1 px-6 py-2.5 rounded-xl text-sm font-medium cursor-pointer"
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
function OptionsMenu({ postId, saved, isOwn, canEdit, onSave, onHide, onReport, onDelete, onEdit, onClose }: {
  postId: string | number; saved: boolean; isOwn: boolean; canEdit: boolean;
  onSave: () => void; onHide: () => void; onReport: () => void; onDelete: () => void; onEdit: () => void; onClose: () => void;
}) {
  const items = isOwn
    ? [
        ...(canEdit ? [{ icon: Pencil, label: "Modifier le post", action: onEdit, color: "#A78BFA" }] : []),
        { icon: saved ? Check : Bookmark, label: saved ? "Sauvegardé ✓" : "Sauvegarder", action: onSave, color: saved ? "#D4A843" : "#2D3748" },
        { icon: X, label: "Supprimer le post", action: onDelete, color: "#EF4444" },
      ]
    : [
        { icon: saved ? Check : Bookmark, label: saved ? "Sauvegardé ✓" : "Sauvegarder", action: onSave, color: saved ? "#D4A843" : "#2D3748" },
        { icon: EyeOff, label: "Masquer ce post", action: onHide, color: "#2D3748" },
        { icon: Flag, label: "Signaler", action: onReport, color: "#A78BFA" },
      ];

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
      {items.map(({ icon: Icon, label, action, color }, i) => (
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

// Utilitaire copie robuste (clipboard API + fallback execCommand)
function copyToClipboard(text: string): Promise<void> {
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    return navigator.clipboard.writeText(text).catch(() => {
      // fallback
      const el = document.createElement("textarea");
      el.value = text; el.style.position = "fixed"; el.style.opacity = "0";
      document.body.appendChild(el); el.select();
      try { document.execCommand("copy"); } finally { document.body.removeChild(el); }
    });
  }
  return new Promise((resolve) => {
    const el = document.createElement("textarea");
    el.value = text; el.style.position = "fixed"; el.style.opacity = "0";
    document.body.appendChild(el); el.select();
    try { document.execCommand("copy"); } finally { document.body.removeChild(el); }
    resolve();
  });
}

// Share Modal
function ShareModal({ postCaption, onClose, onShareDM }: { postCaption?: string; onClose: () => void; onShareDM?: () => void }) {
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const handleCopy = () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    copyToClipboard(url).finally(() => {
      setCopied(true);
      setTimeout(() => { setCopied(false); onClose(); }, 1500);
    });
  };

  const handleNativeShare = async () => {
    if (typeof navigator === "undefined" || !("share" in navigator)) { handleCopy(); return; }
    try {
      await navigator.share({
        title: "Vaiiya — Performance partagée",
        text: postCaption ?? "Découvre cette performance sur Vaiiya !",
        url: window.location.href,
      });
      onClose();
    } catch {
      // User cancelled — ignore
    }
  };

  if (!mounted) return null;

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center px-4 pb-6 md:pb-0"
      style={{ background: "rgba(0,0,0,0.35)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 60, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.97 }}
        transition={{ type: "spring", bounce: 0.3, duration: 0.5 }}
        className="w-full max-w-sm rounded-3xl p-6"
        style={{
          background: "#FFFFFF",
          border: "1px solid rgba(212,192,255,0.3)",
          boxShadow: "0 24px 70px rgba(0,0,0,0.25), 0 4px 16px rgba(167,139,250,0.2)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold" style={{ color: "#2D3748" }}>Partager</h2>
          <motion.button whileTap={{ scale: 0.9 }} onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer" style={{ background: "rgba(240,235,255,0.8)" }}>
            <X size={14} strokeWidth={2} style={{ color: "#A0AEC0" }} />
          </motion.button>
        </div>

        <div className="grid grid-cols-4 gap-3 mb-5">
          {[
            { label: "DM", emoji: "💬", color: "linear-gradient(135deg, #D4C0FF 0%, #A78BFA 100%)", action: () => { onClose(); onShareDM?.(); } },
            { label: "Story", emoji: "✨", color: "linear-gradient(135deg, #F5E6A3 0%, #D4A843 100%)", action: onClose },
            { label: copied ? "Copié !" : "Copier", emoji: copied ? "✓" : "🔗", color: "linear-gradient(135deg, #F0EBFF 0%, #FFFBF0 100%)", action: handleCopy },
            { label: "Partager", emoji: "📤", color: "linear-gradient(135deg, #D4C0FF 0%, #F5E6A3 100%)", action: handleNativeShare },
          ].map(({ label, emoji, color, action }) => (
            <motion.button
              key={label}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={action}
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
    </motion.div>,
    document.body
  );
}

// ── Nouveau DM : rechercher un utilisateur ──────────────────
function NewDMModal({ onClose, onStartThread }: { onClose: () => void; onStartThread: (partner: DMPartner) => void }) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<DMPartner[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 120);
  }, []);

  useEffect(() => {
    if (!search.trim()) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      const supabase = createClient();
      const { data } = await supabase
        .from("profiles")
        .select("id, pseudo, full_name, avatar_url")
        .ilike("pseudo", `%${search.trim()}%`)
        .limit(10);
      setResults((data as DMPartner[]) ?? []);
      setLoading(false);
    }, 280);
    return () => clearTimeout(timer);
  }, [search]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center px-4 pb-6 md:pb-0"
      style={{ background: "rgba(0,0,0,0.25)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 60, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.97 }}
        transition={{ type: "spring", bounce: 0.3, duration: 0.5 }}
        className="w-full max-w-sm rounded-3xl p-5"
        style={{
          background: "rgba(255,255,255,0.95)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(255,255,255,0.9)",
          boxShadow: "0 20px 60px rgba(167,139,250,0.15), inset 0 1px 0 rgba(255,255,255,0.9)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold" style={{ color: "#2D3748" }}>Nouveau message</h2>
          <motion.button whileTap={{ scale: 0.9 }} onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer" style={{ background: "rgba(240,235,255,0.8)" }}>
            <X size={14} strokeWidth={2} style={{ color: "#A0AEC0" }} />
          </motion.button>
        </div>

        <div className="flex items-center gap-2 px-3 py-2.5 rounded-2xl mb-4" style={{ background: "rgba(240,235,255,0.6)", border: "1px solid rgba(167,139,250,0.15)" }}>
          <Search size={14} strokeWidth={1.5} style={{ color: "#A0AEC0", flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Rechercher par pseudo…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm outline-none placeholder:font-light"
            style={{ color: "#2D3748" }}
          />
          {loading && (
            <motion.div className="w-3.5 h-3.5 rounded-full border-2 flex-shrink-0" style={{ borderColor: "rgba(167,139,250,0.25)", borderTopColor: "#A78BFA" }} animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: "linear" }} />
          )}
        </div>

        <div className="flex flex-col gap-1 max-h-64 overflow-y-auto">
          {results.length === 0 && search.trim() && !loading && (
            <p className="text-center text-xs py-6 font-light" style={{ color: "#A0AEC0" }}>Aucun résultat pour « {search} »</p>
          )}
          {results.length === 0 && !search.trim() && (
            <p className="text-center text-xs py-6 font-light" style={{ color: "#C4C9D4" }}>Tape le pseudo d&apos;un utilisateur</p>
          )}
          {results.map((r) => (
            <motion.button
              key={r.id}
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => { onStartThread(r); onClose(); }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-2xl text-left cursor-pointer"
              style={{ background: "rgba(240,235,255,0.4)" }}
            >
              <ProfileAvatar partner={r} size={38} />
              <div>
                <p className="text-sm font-semibold leading-none" style={{ color: "#2D3748" }}>{r.full_name ?? r.pseudo}</p>
                <p className="text-xs font-light mt-0.5" style={{ color: "#A0AEC0" }}>@{r.pseudo}</p>
              </div>
            </motion.button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Partager un post vers un DM ─────────────────────────────
function ShareToDMModal({ post, onClose, onSent }: { post: RealPost; onClose: () => void; onSent: (partner: DMPartner) => void }) {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<DMPartner[]>([]);
  const [friends, setFriends] = useState<DMPartner[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Charger les amis (personnes que l'user suit) par défaut
  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    supabase
      .from("followers")
      .select("following_id, profiles!following_id(id, pseudo, full_name, avatar_url)")
      .eq("follower_id", user.id)
      .limit(20)
      .then(({ data }) => {
        if (data) {
          const list = data
            .map((d: { profiles: DMPartner }) => d.profiles)
            .filter(Boolean);
          setFriends(list);
        }
      });
  }, [user]);

  useEffect(() => {
    if (!search.trim()) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      const supabase = createClient();
      const { data } = await supabase
        .from("profiles")
        .select("id, pseudo, full_name, avatar_url")
        .ilike("pseudo", `%${search.trim()}%`)
        .neq("id", user?.id ?? "")
        .limit(10);
      setResults((data as DMPartner[]) ?? []);
      setLoading(false);
    }, 280);
    return () => clearTimeout(timer);
  }, [search, user]);

  const sendPost = async (partner: DMPartner) => {
    if (!user || sending) return;
    setSending(partner.id);
    const supabase = createClient();
    const caption = post.caption?.slice(0, 60) ?? "";
    const msg = caption ? `📎 ${caption}` : "📎 Post partagé";
    await supabase.from("direct_messages").insert({
      sender_id: user.id,
      receiver_id: partner.id,
      content: msg,
      post_id: post.id,
    });
    setSending(null);
    onSent(partner);
    onClose();
  };

  const displayList = search.trim() ? results : friends;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center px-4 pb-6 md:pb-0"
      style={{ background: "rgba(0,0,0,0.25)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 60, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 30, scale: 0.97 }}
        transition={{ type: "spring", bounce: 0.3, duration: 0.5 }}
        className="w-full max-w-sm rounded-3xl p-5"
        style={{ background: "rgba(255,255,255,0.95)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.9)", boxShadow: "0 20px 60px rgba(167,139,250,0.15), inset 0 1px 0 rgba(255,255,255,0.9)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold" style={{ color: "#2D3748" }}>Envoyer en DM</h2>
          <motion.button whileTap={{ scale: 0.9 }} onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer" style={{ background: "rgba(240,235,255,0.8)" }}>
            <X size={14} strokeWidth={2} style={{ color: "#A0AEC0" }} />
          </motion.button>
        </div>

        {/* Preview du post */}
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-2xl mb-3" style={{ background: "linear-gradient(135deg, rgba(212,192,255,0.15) 0%, rgba(245,230,163,0.1) 100%)", border: "1px solid rgba(167,139,250,0.12)" }}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base" style={{ background: "linear-gradient(135deg, #D4C0FF, #F5E6A3)" }}>
            {post.type === "workout" ? "🏋️" : post.type === "meal" ? "🥗" : "📊"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold truncate" style={{ color: "#2D3748" }}>{post.performance_data?.title ?? "Post"}</p>
            {post.caption && <p className="text-[10px] font-light truncate" style={{ color: "#A0AEC0" }}>{post.caption}</p>}
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-2.5 rounded-2xl mb-3" style={{ background: "rgba(240,235,255,0.6)", border: "1px solid rgba(167,139,250,0.15)" }}>
          <Search size={14} strokeWidth={1.5} style={{ color: "#A0AEC0", flexShrink: 0 }} />
          <input ref={inputRef} type="text" placeholder="Envoyer à…" value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 bg-transparent text-sm outline-none placeholder:font-light" style={{ color: "#2D3748" }} />
          {loading && <motion.div className="w-3.5 h-3.5 rounded-full border-2 flex-shrink-0" style={{ borderColor: "rgba(167,139,250,0.25)", borderTopColor: "#A78BFA" }} animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: "linear" }} />}
        </div>

        <div className="flex flex-col gap-1 max-h-52 overflow-y-auto">
          {!search.trim() && friends.length === 0 && (
            <p className="text-center text-xs py-5 font-light" style={{ color: "#C4C9D4" }}>Abonne-toi à des gens pour les envoyer en DM</p>
          )}
          {!search.trim() && friends.length > 0 && (
            <p className="text-[10px] font-semibold px-1 pb-1" style={{ color: "#A0AEC0" }}>Mes abonnements</p>
          )}
          {search.trim() && displayList.length === 0 && !loading && (
            <p className="text-center text-xs py-5 font-light" style={{ color: "#A0AEC0" }}>Aucun résultat</p>
          )}
          {displayList.map((r) => (
            <motion.button
              key={r.id}
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => sendPost(r)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-2xl text-left cursor-pointer"
              style={{ background: "rgba(240,235,255,0.4)" }}
            >
              <ProfileAvatar partner={r} size={36} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold leading-none truncate" style={{ color: "#2D3748" }}>{r.full_name ?? r.pseudo}</p>
                <p className="text-xs font-light mt-0.5" style={{ color: "#A0AEC0" }}>@{r.pseudo}</p>
              </div>
              {sending === r.id ? (
                <motion.div className="w-4 h-4 rounded-full border-2" style={{ borderColor: "rgba(167,139,250,0.25)", borderTopColor: "#A78BFA" }} animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: "linear" }} />
              ) : (
                <Send size={13} strokeWidth={1.5} style={{ color: "#A78BFA" }} />
              )}
            </motion.button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

// Comments shared type
type RealComment = {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  parent_id: string | null;
  author: { pseudo: string; avatar_url?: string | null; is_admin?: boolean; is_certified?: boolean } | null;
  comment_likes: { user_id: string }[];
};

const COMMENTS_SELECT = "id, content:text, created_at, user_id, parent_id, author:profiles!user_id(pseudo, avatar_url, is_admin, is_certified), comment_likes(user_id)";

// Rend le contenu d'un commentaire avec @mentions en violet
function renderMentions(text: string) {
  const parts = text.split(/(@\w+)/g);
  return parts.map((part, i) =>
    /^@\w+$/.test(part)
      ? (
        <Link key={i} href={`/profil/${encodeURIComponent(part.slice(1))}`} onClick={e => e.stopPropagation()}>
          <b style={{ color: "#A78BFA", fontWeight: 600, fontStyle: "normal" }}>{part}</b>
        </Link>
      )
      : part
  );
}

// Sous-composant ligne commentaire (utilisé dans les deux sections)
function CommentRow({
  c, user, dark, onReply, onLikeToggle, onDelete,
}: {
  c: RealComment; user: { id: string } | null; dark?: boolean;
  onReply: (id: string, pseudo: string) => void;
  onLikeToggle: (id: string, liked: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const pseudo = c.author?.pseudo ?? "inconnu";
  const avatar = c.author?.avatar_url;
  const certified = c.author?.is_certified === true || c.author?.is_admin === true;
  const timeStr = postTimeAgo(c.created_at);
  const liked = c.comment_likes?.some(l => l.user_id === (user?.id ?? "")) ?? false;
  const likeCount = c.comment_likes?.length ?? 0;
  const isOwn = user?.id === c.user_id;
  const txt = dark ? "rgba(255,255,255,0.88)" : "#2D3748";
  const sub = dark ? "rgba(255,255,255,0.38)" : "#A0AEC0";
  return (
    <div className="flex items-start gap-2 group">
      <Link href={`/profil/${encodeURIComponent(pseudo)}`} className="flex-shrink-0">
        <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold overflow-hidden"
          style={{ background: avatar ? "transparent" : "linear-gradient(135deg,#D4C0FF,#F5E6A3)", color: "#2D3748" }}>
          {avatar
            // eslint-disable-next-line @next/next/no-img-element
            ? <img loading="lazy" decoding="async" src={avatar} alt={pseudo} className="w-full h-full object-cover" />
            : pseudo[0]?.toUpperCase()}
        </div>
      </Link>
      <div className="flex-1 min-w-0">
        <p className="text-xs leading-relaxed" style={{ color: txt }}>
          <Link href={`/profil/${encodeURIComponent(pseudo)}`}>
            <span className="font-semibold" style={{ color: dark ? "#D4C0FF" : "#A78BFA" }}>{pseudo}</span>
          </Link>
          {certified && <BadgeCheck size={11} strokeWidth={2.5} className="inline-block align-text-bottom mx-0.5" style={{ color: "#A78BFA" }} />}
          <span className="font-light ml-1">{renderMentions(c.content)}</span>
        </p>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-[10px]" style={{ color: sub }}>{timeStr}</span>
          {/* Like commentaire */}
          <button onClick={() => onLikeToggle(c.id, liked)}
            className="flex items-center gap-0.5 cursor-pointer"
            style={{ color: liked ? "#FF4458" : sub }}>
            <Heart size={10} strokeWidth={2} fill={liked ? "#FF4458" : "none"} />
            {likeCount > 0 && <span className="text-[10px] font-medium">{likeCount}</span>}
          </button>
          {/* Répondre */}
          <button onClick={() => onReply(c.id, pseudo)}
            className="text-[10px] font-medium cursor-pointer" style={{ color: sub }}>
            Répondre
          </button>
          {/* Supprimer — uniquement pour l'auteur */}
          {isOwn && (
            <motion.button whileTap={{ scale: 0.85 }} onClick={() => onDelete(c.id)}
              className="text-[10px] cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ color: "#FC8181" }}>
              Supprimer
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
}

function CommentsSection({ postId, initialCount, onClose, onCommentAdded, postOwnerId }: { postId: string | number; initialCount: number; onClose: () => void; onCommentAdded?: () => void; postOwnerId?: string }) {
  const { user } = useAuth();
  const [comments, setComments]   = useState<RealComment[]>([]);
  const [loading, setLoading]     = useState(true);
  const [dbError, setDbError]     = useState(false);
  const [sendError, setSendError] = useState("");
  const [input, setInput]         = useState("");
  const [sending, setSending]     = useState(false);
  const [replyingTo, setReplyingTo] = useState<{ id: string; pseudo: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // @mention autocomplete
  const [mentionSearch, setMentionSearch] = useState<string | null>(null);
  const [mentionResults, setMentionResults] = useState<{ pseudo: string; avatar_url?: string | null }[]>([]);

  const loadComments = async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("post_comments").select(COMMENTS_SELECT)
      .eq("post_id", String(postId)).order("created_at", { ascending: true }).limit(80);
    if (error) {
      try {
        await fetch("/api/setup-db", { method: "POST" });
        const { data: d2, error: e2 } = await supabase
          .from("post_comments").select(COMMENTS_SELECT)
          .eq("post_id", String(postId)).order("created_at", { ascending: true }).limit(80);
        if (e2) setDbError(true);
        else setComments((d2 as unknown as RealComment[]) ?? []);
      } catch { setDbError(true); }
    } else {
      setComments((data as unknown as RealComment[]) ?? []);
    }
    setLoading(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  useEffect(() => { void loadComments(); }, [postId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch mention suggestions when user types @...
  useEffect(() => {
    if (mentionSearch === null) { setMentionResults([]); return; }
    const search = async () => {
      const supabase = createClient();
      const { data } = await supabase.from("profiles")
        .select("pseudo, avatar_url")
        .ilike("pseudo", `${mentionSearch}%`)
        .limit(5);
      setMentionResults((data as { pseudo: string; avatar_url?: string | null }[]) ?? []);
    };
    void search();
  }, [mentionSearch]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInput(val);
    const cursor = e.target.selectionStart ?? val.length;
    const textBeforeCursor = val.slice(0, cursor);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
    if (mentionMatch) {
      setMentionSearch(mentionMatch[1]);
    } else {
      setMentionSearch(null);
    }
  };

  const selectMention = (pseudo: string) => {
    const cursor = inputRef.current?.selectionStart ?? input.length;
    const before = input.slice(0, cursor).replace(/@\w*$/, `@${pseudo} `);
    const after = input.slice(cursor);
    setInput(before + after);
    setMentionSearch(null);
    setMentionResults([]);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleSend = async () => {
    if (!input.trim() || !user || sending) return;
    const content = input.trim();
    setInput(""); setReplyingTo(null); setSending(true);
    setMentionSearch(null); setMentionResults([]);
    const tmpId = `tmp-${Date.now()}`;
    setComments(prev => [...prev, {
      id: tmpId, content, created_at: new Date().toISOString(),
      user_id: user.id, parent_id: replyingTo?.id ?? null,
      author: { pseudo: user.pseudo, avatar_url: user.avatar ?? null },
      comment_likes: [],
    }]);
    const supabase = createClient();
    const { error } = await supabase.from("post_comments")
      .insert({ post_id: String(postId), user_id: user.id, text: content, parent_id: replyingTo?.id ?? null });
    setSending(false);
    if (error) {
      setComments(prev => prev.filter(c => c.id !== tmpId));
      setInput(content);
      console.error("comment send:", error);
      setSendError("Commentaire non envoyé, réessaie");
    } else {
      setSendError("");
      onCommentAdded?.();
      if (postOwnerId && postOwnerId !== user.id) {
        // Notif in-app + email + push via la route admin (bypass RLS)
        void fetch("/api/notifications/comment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ commenter_id: user.id, post_owner_id: postOwnerId, post_id: String(postId), comment_preview: content }),
        }).catch(() => {});
      }
    }
  };

  const handleLikeToggle = async (commentId: string, liked: boolean) => {
    if (!user) return;
    const supabase = createClient();
    setComments(prev => prev.map(c => c.id !== commentId ? c : {
      ...c,
      comment_likes: liked
        ? c.comment_likes.filter(l => l.user_id !== user.id)
        : [...c.comment_likes, { user_id: user.id }],
    }));
    if (liked) await supabase.from("comment_likes").delete().eq("comment_id", commentId).eq("user_id", user.id);
    else await supabase.from("comment_likes").upsert({ comment_id: commentId, user_id: user.id }, { ignoreDuplicates: true });
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!user) return;
    setComments(prev => prev.filter(c => c.id !== commentId));
    const supabase = createClient();
    await supabase.from("post_comments").delete().eq("id", commentId).eq("user_id", user.id);
  };

  // Grouper : top-level puis replies indentées
  const topLevel = comments.filter(c => !c.parent_id);
  const replies  = (parentId: string) => comments.filter(c => c.parent_id === parentId);

  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }} className="overflow-hidden">
      <div className="px-4 pb-4 pt-2 border-t" style={{ borderColor: "rgba(240,235,255,0.8)" }}>
        <div className="flex flex-col gap-3 mb-3 max-h-56 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
          {loading ? (
            <div className="flex justify-center py-3">
              <motion.div className="w-4 h-4 rounded-full border-2" style={{ borderColor: "rgba(167,139,250,0.2)", borderTopColor: "#A78BFA" }} animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} />
            </div>
          ) : dbError ? (
            <p className="text-xs text-center py-2" style={{ color: "#FC8181" }}>⚠️ Commentaires indisponibles</p>
          ) : topLevel.length === 0 ? (
            <p className="text-xs text-center py-2" style={{ color: "#A0AEC0" }}>Sois le premier à commenter</p>
          ) : topLevel.map((c, i) => (
            <motion.div key={c.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i < 5 ? i * 0.04 : 0 }}>
              <CommentRow c={c} user={user} onReply={(id, ps) => { setReplyingTo({ id, pseudo: ps }); inputRef.current?.focus(); }} onLikeToggle={handleLikeToggle} onDelete={handleDeleteComment} />
              {/* Replies indentées */}
              {replies(c.id).map(r => (
                <div key={r.id} className="ml-8 mt-2">
                  <CommentRow c={r} user={user} onReply={(id, ps) => { setReplyingTo({ id, pseudo: ps }); inputRef.current?.focus(); }} onLikeToggle={handleLikeToggle} onDelete={handleDeleteComment} />
                </div>
              ))}
            </motion.div>
          ))}
        </div>

        {/* Indicateur réponse */}
        {replyingTo && (
          <div className="flex items-center gap-1.5 mb-1.5 px-1">
            <span className="text-[10px]" style={{ color: "#A78BFA" }}>↩ Répondre à @{replyingTo.pseudo}</span>
            <button onClick={() => setReplyingTo(null)} className="text-[10px] cursor-pointer" style={{ color: "#A0AEC0" }}>✕</button>
          </div>
        )}
        {sendError && <p className="text-[10px] mb-1" style={{ color: "#FC8181" }}>{sendError}</p>}

        {/* Dropdown @mention */}
        {mentionResults.length > 0 && (
          <div className="mb-1.5 rounded-xl overflow-hidden shadow-md" style={{ background: "rgba(255,255,255,0.97)", border: "1px solid rgba(212,192,255,0.6)" }}>
            {mentionResults.map(profile => (
              <button key={profile.pseudo} onMouseDown={e => { e.preventDefault(); selectMention(profile.pseudo); }}
                className="flex items-center gap-2 w-full px-3 py-1.5 text-left hover:bg-purple-50 transition-colors cursor-pointer">
                <div className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden text-[9px] font-semibold"
                  style={{ background: profile.avatar_url ? "transparent" : "linear-gradient(135deg,#D4C0FF,#F5E6A3)", color: "#2D3748" }}>
                  {profile.avatar_url
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img loading="lazy" decoding="async" src={profile.avatar_url} alt={profile.pseudo} className="w-full h-full object-cover" />
                    : profile.pseudo[0]?.toUpperCase()}
                </div>
                <span className="text-xs font-medium" style={{ color: "#A78BFA" }}>@{profile.pseudo}</span>
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2">
          <input ref={inputRef} type="text" value={input} onChange={handleInputChange}
            onKeyDown={e => {
              if (e.key === "Enter" && mentionResults.length === 0) handleSend();
              if (e.key === "Escape") { setMentionSearch(null); setMentionResults([]); }
            }}
            placeholder={user ? (replyingTo ? `Répondre à @${replyingTo.pseudo}…` : "Ajouter un commentaire…") : "Connecte-toi pour commenter"}
            disabled={!user}
            className="flex-1 text-xs outline-none px-3 py-2 rounded-xl"
            style={{ background: "rgba(240,235,255,0.5)", border: "1px solid rgba(212,192,255,0.5)", color: "#2D3748" }}
          />
          <motion.button whileTap={{ scale: 0.9 }} onClick={handleSend} disabled={!input.trim() || !user || sending}
            className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer flex-shrink-0"
            style={{ background: input.trim() && user ? "linear-gradient(135deg,#D4C0FF,#F5E6A3)" : "rgba(240,235,255,0.5)" }}>
            <Send size={12} strokeWidth={2} style={{ color: input.trim() && user ? "#2D3748" : "#A0AEC0" }} />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Hashtag Videos Page — style Instagram ─────────────────── */
function HashtagVideosModal({ tag, onClose, onOpenVideo }: {
  tag: string;
  onClose: () => void;
  onOpenVideo: (postId: string) => void;
}) {
  const [videos, setVideos] = useState<RealPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const supabase = createClient();
    Promise.all([
      supabase.from("posts").select(`
        id, type, caption, description, media_url, media_type, views, created_at, user_id,
        author:profiles!user_id(pseudo, avatar_url, is_admin, is_certified),
        post_likes(user_id), post_comments(id), post_reposts(user_id), post_saves(user_id)
      `).eq("media_type", "video").ilike("caption", `%${tag}%`).limit(60),
      supabase.from("posts").select(`
        id, type, caption, description, media_url, media_type, views, created_at, user_id,
        author:profiles!user_id(pseudo, avatar_url, is_admin, is_certified),
        post_likes(user_id), post_comments(id), post_reposts(user_id), post_saves(user_id)
      `).eq("media_type", "video").ilike("description", `%${tag}%`).limit(60),
    ]).then(([capRes, descRes]) => {
      if (cancelled) return;
      const all = [...(capRes.data ?? []), ...(descRes.data ?? [])] as unknown as RealPost[];
      const seen = new Set<string>();
      const deduped = all.filter(p => { if (seen.has(p.id)) return false; seen.add(p.id); return true; });
      deduped.sort((a, b) => (b.views ?? 0) - (a.views ?? 0));
      setVideos(deduped);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [tag]);

  const fmtViews = (n?: number) => {
    if (!n || n === 0) return "0";
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
    return `${n}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 40 }}
      transition={{ type: "spring", damping: 30, stiffness: 280 }}
      className="fixed inset-y-0 right-0 left-0 md:left-[88px] pb-28 md:pb-0 z-[9999] flex flex-col"
      style={{ background: "#fff" }}
    >
      {/* Inner — same width as the video feed */}
      <div className="h-full flex flex-col mx-auto w-full" style={{ maxWidth: 560 }}>

      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-4 pt-6 pb-4 flex-shrink-0">
        <motion.button whileTap={{ scale: 0.9 }} onClick={onClose}
          className="cursor-pointer" style={{ color: "#2D3748" }}>
          <ArrowLeft size={22} strokeWidth={1.8} />
        </motion.button>
        <div>
          <h1 className="text-lg font-bold tracking-tight" style={{ color: "#2D3748" }}>{tag}</h1>
          {!loading && (
            <p className="text-[12px] font-light" style={{ color: "#A0AEC0" }}>
              {videos.length} vidéo{videos.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      </div>

      {/* ── Sous-tabs "Pour vous / Non personnalisé" ── */}
      <div className="flex flex-shrink-0" style={{ borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
        <button className="flex-1 py-2.5 text-[13px] font-semibold relative cursor-default"
          style={{ color: "#2D3748" }}>
          Pour vous
          <div className="absolute bottom-0 inset-x-0 h-0.5 rounded-full"
            style={{ background: "linear-gradient(90deg,#D4C0FF,#A78BFA)" }} />
        </button>
        <button className="flex-1 py-2.5 text-[13px] font-light cursor-default"
          style={{ color: "#A0AEC0" }}>
          Non personnalisé
        </button>
      </div>

      {/* ── Grille carrée 3 colonnes ── */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="grid grid-cols-3 p-2" style={{ gap: 6 }}>
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="aspect-[9/16] animate-pulse rounded-xl"
                style={{ background: "rgba(212,192,255,0.15)" }} />
            ))}
          </div>
        ) : videos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <span className="text-4xl">🎬</span>
            <p className="text-sm font-light" style={{ color: "#A0AEC0" }}>Aucune vidéo pour {tag}</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 p-2" style={{ gap: 6 }}>
            {videos.map(video => (
              <motion.div
                key={video.id}
                whileTap={{ opacity: 0.75, scale: 0.98 }}
                transition={{ duration: 0.12 }}
                className="relative aspect-[9/16] overflow-hidden cursor-pointer rounded-xl"
                style={{ background: "#111" }}
                onClick={() => onOpenVideo(video.id)}
              >
                {/* Thumbnail pleine hauteur — vidéo entière visible */}
                <video
                  src={video.media_url ?? undefined}
                  className="absolute inset-0 w-full h-full object-cover"
                  muted playsInline preload="metadata"
                  style={{ pointerEvents: "none" }}
                />

                {/* Gradient bas */}
                <div className="absolute inset-x-0 bottom-0 h-14 pointer-events-none"
                  style={{ background: "linear-gradient(to top,rgba(0,0,0,0.75) 0%,transparent 100%)" }} />

                {/* Icône play — coin haut droit */}
                <div className="absolute top-2 right-2 pointer-events-none">
                  <Play size={14} strokeWidth={0} fill="rgba(255,255,255,0.9)" />
                </div>

                {/* Vues — coin bas gauche, toujours affiché */}
                <div className="absolute bottom-2 left-2 flex items-center gap-1 pointer-events-none">
                  <Play size={10} strokeWidth={0} fill="white" />
                  <span className="text-[11px] font-bold text-white drop-shadow-sm">
                    {fmtViews(video.views)}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      </div>{/* end inner 560px */}
    </motion.div>
  );
}

/* ── Hashtag bottom sheet ──────────────────────────────────── */
function HashtagSheet({ tag, currentUserId, onClose }: {
  tag: string;
  currentUserId: string | null;
  onClose: () => void;
}) {
  const [posts, setPosts] = useState<RealPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setPosts([]);
    const supabase = createClient();
    // Two parallel ilike queries (caption + description) to avoid .or() encoding issues
    Promise.all([
      supabase.from("posts").select(`
        id, type, caption, description, media_url, media_type, created_at, user_id,
        author:profiles!user_id(pseudo, avatar_url, is_admin, is_certified),
        post_likes(user_id),
        post_comments(id),
        post_reposts(user_id),
        post_saves(user_id)
      `).ilike("caption", `%${tag}%`).order("created_at", { ascending: false }).limit(20),
      supabase.from("posts").select(`
        id, type, caption, description, media_url, media_type, created_at, user_id,
        author:profiles!user_id(pseudo, avatar_url, is_admin, is_certified),
        post_likes(user_id),
        post_comments(id),
        post_reposts(user_id),
        post_saves(user_id)
      `).ilike("description", `%${tag}%`).order("created_at", { ascending: false }).limit(20),
    ]).then(([capRes, descRes]) => {
      if (cancelled) return;
      const all = [...(capRes.data ?? []), ...(descRes.data ?? [])] as unknown as RealPost[];
      const seen = new Set<string>();
      const deduped = all.filter(p => { if (seen.has(p.id)) return false; seen.add(p.id); return true; });
      setPosts(deduped);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [tag]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 32, stiffness: 320 }}
        className="w-full max-w-lg rounded-t-3xl flex flex-col"
        style={{ background: "rgba(255,255,255,0.97)", maxHeight: "75vh" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full" style={{ background: "rgba(167,139,250,0.3)" }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 flex-shrink-0">
          <div>
            <span className="text-base font-semibold" style={{ color: "#A78BFA" }}>{tag}</span>
            {!loading && (
              <span className="ml-2 text-xs font-light" style={{ color: "#A0AEC0" }}>
                {posts.length} post{posts.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer"
            style={{ background: "rgba(240,235,255,0.8)" }}
          >
            <X size={14} strokeWidth={2} style={{ color: "#A0AEC0" }} />
          </motion.button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 pb-8" style={{ scrollbarWidth: "none" }}>
          {loading ? (
            <div className="flex justify-center py-12">
              <motion.div
                className="w-6 h-6 rounded-full border-2"
                style={{ borderColor: "rgba(167,139,250,0.2)", borderTopColor: "#A78BFA" }}
                animate={{ rotate: 360 }}
                transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
              />
            </div>
          ) : posts.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <span className="text-4xl">#</span>
              <p className="text-sm font-light" style={{ color: "#A0AEC0" }}>
                Aucun post avec {tag}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3 pt-1">
              {posts.map(p => {
                const pseudo = (p.author as { pseudo?: string } | null)?.pseudo ?? "utilisateur";
                const avatar = (p.author as { avatar_url?: string } | null)?.avatar_url;
                const liked = currentUserId ? p.post_likes.some(l => l.user_id === currentUserId) : false;
                return (
                  <div
                    key={p.id}
                    className="rounded-2xl overflow-hidden"
                    style={{ background: "rgba(240,235,255,0.4)", border: "1px solid rgba(212,192,255,0.3)" }}
                  >
                    {/* Author row */}
                    <div className="flex items-center gap-2.5 px-3 pt-3 pb-2">
                      <div
                        className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold overflow-hidden"
                        style={{ background: avatar ? "transparent" : "linear-gradient(135deg,#D4C0FF,#F5E6A3)", color: "#2D3748" }}
                      >
                        {avatar
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img loading="lazy" decoding="async" src={avatar} alt={pseudo} className="w-full h-full object-cover" />
                          : pseudo[0]?.toUpperCase()}
                      </div>
                      <span className="text-xs font-semibold" style={{ color: "#2D3748" }}>@{pseudo}</span>
                      <span className="text-[10px] ml-auto" style={{ color: "#A0AEC0" }}>{postTimeAgo(p.created_at)}</span>
                    </div>

                    {/* Caption */}
                    {p.caption && (
                      <p className="px-3 pb-2 text-sm font-medium leading-snug" style={{ color: "#2D3748" }}>
                        {p.caption}
                      </p>
                    )}

                    {/* Media thumbnail */}
                    {p.media_url && p.media_type === "image" && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img loading="lazy" decoding="async" src={p.media_url} alt="" className="w-full object-cover" style={{ maxHeight: 200 }} />
                    )}

                    {/* Stats */}
                    <div className="flex items-center gap-3 px-3 py-2.5">
                      <span className="flex items-center gap-1 text-[11px]" style={{ color: liked ? "#F43F5E" : "#A0AEC0" }}>
                        <Heart size={12} fill={liked ? "#F43F5E" : "none"} style={{ color: liked ? "#F43F5E" : "#A0AEC0" }} />
                        {p.post_likes.length}
                      </span>
                      <span className="flex items-center gap-1 text-[11px]" style={{ color: "#A0AEC0" }}>
                        <MessageCircle size={12} />
                        {p.post_comments.length}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Hashtag-aware caption renderer ───────────────────────── */
function CaptionText({ text, onHashtagClick }: { text: string; onHashtagClick: (tag: string) => void }) {
  if (!text.includes("#")) return <>{text}</>;
  // Simple split on #word — \w covers a-z A-Z 0-9 _
  const parts = text.split(/(#\w+)/);
  return (
    <>
      {parts.map((part, i) =>
        /^#\w+$/.test(part) ? (
          <b
            key={i}
            style={{ color: "#A78BFA", fontWeight: 700, cursor: "pointer", fontStyle: "normal" }}
            onClick={(e) => { e.stopPropagation(); onHashtagClick(part); }}
          >
            {part}
          </b>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
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

/* ─── TikTok Video Feed ─────────────────────────────────── */

// Panel commentaires style vidéo (overlay sombre slide-up)
function VideoCommentsPanel({ postId, postOwnerId, commentCount, onClose, onCommentAdded }: {
  postId: string; postOwnerId: string; commentCount: number;
  onClose: () => void; onCommentAdded: () => void;
}) {
  const [isDesktop, setIsDesktop] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  if (!mounted) return null;

  const panel = (
    <>
      {/* Voile cliquable pour fermer — léger sur desktop, sombre sur mobile */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9998]"
        style={{ background: isDesktop ? "transparent" : "rgba(0,0,0,0.5)" }}
        onClick={onClose}
      />
      <motion.div
        initial={isDesktop ? { x: "100%" } : { y: "100%" }}
        animate={isDesktop ? { x: 0 } : { y: 0 }}
        exit={isDesktop ? { x: "100%" } : { y: "100%" }}
        transition={{ type: "spring", damping: 32, stiffness: 320 }}
        className={
          isDesktop
            ? "fixed top-0 right-0 bottom-0 z-[9999] w-[400px] rounded-l-3xl overflow-hidden flex flex-col"
            : "fixed inset-x-0 bottom-0 z-[9999] rounded-t-3xl overflow-hidden flex flex-col"
        }
        style={
          isDesktop
            ? { background: "#FFFFFF", boxShadow: "-12px 0 48px rgba(0,0,0,0.18)" }
            : { background: "rgba(255,255,255,0.98)", backdropFilter: "blur(24px)", maxHeight: "72%", minHeight: 320, boxShadow: "0 -8px 40px rgba(167,139,250,0.18)" }
        }
        onClick={e => e.stopPropagation()}
      >
        {/* Poignée (mobile uniquement) */}
        {!isDesktop && (
          <div className="flex justify-center pt-3 pb-2 flex-shrink-0">
            <div className="w-10 h-1 rounded-full" style={{ background: "rgba(167,139,250,0.3)" }} />
          </div>
        )}
        <div className={`px-4 ${isDesktop ? "pt-5" : ""} pb-3 flex items-center justify-between flex-shrink-0`} style={{ borderBottom: "1px solid rgba(212,192,255,0.3)" }}>
          <p className="text-sm font-semibold" style={{ color: "#2D3748" }}>{isDesktop ? "Commentaires" : `${commentCount} commentaire${commentCount !== 1 ? "s" : ""}`}</p>
          <motion.button whileTap={{ scale: 0.9 }} onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: "rgba(240,235,255,0.8)" }}>
            <X size={13} strokeWidth={2} style={{ color: "#A0AEC0" }} />
          </motion.button>
        </div>

        {/* Contenu commentaires */}
        <div className="flex-1 overflow-hidden">
          <VideoCommentsList postId={postId} postOwnerId={postOwnerId} onCommentAdded={onCommentAdded} />
        </div>
      </motion.div>
    </>
  );

  return createPortal(panel, document.body);
}

function VideoCommentsList({ postId, postOwnerId, onCommentAdded }: { postId: string; postOwnerId: string; onCommentAdded: () => void }) {
  const { user } = useAuth();
  const [comments, setComments] = useState<RealComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [replyingTo, setReplyingTo] = useState<{ id: string; pseudo: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // @mention autocomplete
  const [mentionSearch, setMentionSearch] = useState<string | null>(null);
  const [mentionResults, setMentionResults] = useState<{ pseudo: string; avatar_url?: string | null }[]>([]);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data, error } = await supabase.from("post_comments").select(COMMENTS_SELECT)
        .eq("post_id", postId).order("created_at", { ascending: true }).limit(80);
      if (error) {
        try {
          await fetch("/api/setup-db", { method: "POST" });
          const { data: d2, error: e2 } = await supabase.from("post_comments").select(COMMENTS_SELECT)
            .eq("post_id", postId).order("created_at", { ascending: true }).limit(80);
          if (e2) setDbError(true);
          else setComments((d2 as unknown as RealComment[]) ?? []);
        } catch { setDbError(true); }
      } else {
        setComments((data as unknown as RealComment[]) ?? []);
      }
      setLoading(false);
    };
    void load();
  }, [postId]);

  // Fetch mention suggestions when user types @...
  useEffect(() => {
    if (mentionSearch === null) { setMentionResults([]); return; }
    const search = async () => {
      const supabase = createClient();
      const { data } = await supabase.from("profiles")
        .select("pseudo, avatar_url")
        .ilike("pseudo", `${mentionSearch}%`)
        .limit(5);
      setMentionResults((data as { pseudo: string; avatar_url?: string | null }[]) ?? []);
    };
    void search();
  }, [mentionSearch]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInput(val);
    const cursor = e.target.selectionStart ?? val.length;
    const textBeforeCursor = val.slice(0, cursor);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
    if (mentionMatch) {
      setMentionSearch(mentionMatch[1]);
    } else {
      setMentionSearch(null);
    }
  };

  const selectMention = (pseudo: string) => {
    const cursor = inputRef.current?.selectionStart ?? input.length;
    const before = input.slice(0, cursor).replace(/@\w*$/, `@${pseudo} `);
    const after = input.slice(cursor);
    setInput(before + after);
    setMentionSearch(null);
    setMentionResults([]);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleSend = async () => {
    if (!input.trim() || !user || sending) return;
    const content = input.trim();
    setSendError(""); setInput(""); setReplyingTo(null); setSending(true);
    setMentionSearch(null); setMentionResults([]);
    const tmpId = `tmp-${Date.now()}`;
    setComments(prev => [...prev, {
      id: tmpId, content, created_at: new Date().toISOString(),
      user_id: user.id, parent_id: replyingTo?.id ?? null,
      author: { pseudo: user.pseudo, avatar_url: user.avatar ?? null },
      comment_likes: [],
    }]);
    const supabase = createClient();
    const { error } = await supabase.from("post_comments")
      .insert({ post_id: postId, user_id: user.id, text: content, parent_id: replyingTo?.id ?? null });
    setSending(false);
    if (error) {
      setComments(prev => prev.filter(c => c.id !== tmpId));
      setInput(content);
      console.error("comment send:", error);
      setSendError("Commentaire non envoyé, réessaie");
    } else {
      onCommentAdded();
      if (postOwnerId && postOwnerId !== user.id) {
        void fetch("/api/notifications/comment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ commenter_id: user.id, post_owner_id: postOwnerId, post_id: postId, comment_preview: content }),
        }).catch(() => {});
      }
    }
  };

  const handleLikeToggle = async (commentId: string, liked: boolean) => {
    if (!user) return;
    const supabase = createClient();
    setComments(prev => prev.map(c => c.id !== commentId ? c : {
      ...c,
      comment_likes: liked ? c.comment_likes.filter(l => l.user_id !== user.id) : [...c.comment_likes, { user_id: user.id }],
    }));
    if (liked) await supabase.from("comment_likes").delete().eq("comment_id", commentId).eq("user_id", user.id);
    else await supabase.from("comment_likes").upsert({ comment_id: commentId, user_id: user.id }, { ignoreDuplicates: true });
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!user) return;
    setComments(prev => prev.filter(c => c.id !== commentId));
    const supabase = createClient();
    await supabase.from("post_comments").delete().eq("id", commentId).eq("user_id", user.id);
  };

  const topLevel = comments.filter(c => !c.parent_id);
  const replies  = (parentId: string) => comments.filter(c => c.parent_id === parentId);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 py-2 flex flex-col gap-3" style={{ scrollbarWidth: "none" }}>
        {loading ? (
          <div className="flex justify-center py-6">
            <motion.div className="w-5 h-5 rounded-full border-2" style={{ borderColor: "rgba(167,139,250,0.2)", borderTopColor: "#A78BFA" }} animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} />
          </div>
        ) : dbError ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <span className="text-2xl">⚠️</span>
            <p className="text-xs" style={{ color: "#FC8181" }}>Commentaires indisponibles</p>
          </div>
        ) : topLevel.length === 0 ? (
          <p className="text-center text-sm py-8" style={{ color: "#A0AEC0" }}>Sois le premier à commenter</p>
        ) : topLevel.map((c, i) => (
          <motion.div key={c.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i < 5 ? i * 0.04 : 0 }}>
            <CommentRow c={c} user={user} onReply={(id, ps) => { setReplyingTo({ id, pseudo: ps }); inputRef.current?.focus(); }} onLikeToggle={handleLikeToggle} onDelete={handleDeleteComment} />
            {replies(c.id).map(r => (
              <div key={r.id} className="ml-9 mt-2">
                <CommentRow c={r} user={user} onReply={(id, ps) => { setReplyingTo({ id, pseudo: ps }); inputRef.current?.focus(); }} onLikeToggle={handleLikeToggle} onDelete={handleDeleteComment} />
              </div>
            ))}
          </motion.div>
        ))}
      </div>

      {/* Indicateur réponse */}
      {replyingTo && (
        <div className="flex items-center gap-2 px-4 py-1.5" style={{ borderTop: "1px solid rgba(212,192,255,0.3)", background: "rgba(240,235,255,0.5)" }}>
          <span className="text-[11px]" style={{ color: "#A78BFA" }}>↩ Répondre à @{replyingTo.pseudo}</span>
          <button onClick={() => setReplyingTo(null)} className="text-[11px] cursor-pointer ml-auto" style={{ color: "#A0AEC0" }}>✕</button>
        </div>
      )}
      {sendError && <p className="px-4 pb-1 text-[11px] text-center" style={{ color: "#FC8181" }}>{sendError}</p>}

      {/* Dropdown @mention */}
      {mentionResults.length > 0 && (
        <div className="mx-4 mb-1 rounded-xl overflow-hidden shadow-lg" style={{ background: "rgba(255,255,255,0.97)", border: "1px solid rgba(212,192,255,0.6)" }}>
          {mentionResults.map(profile => (
            <button key={profile.pseudo} onMouseDown={e => { e.preventDefault(); selectMention(profile.pseudo); }}
              className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-purple-50 transition-colors cursor-pointer">
              <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden text-[10px] font-semibold"
                style={{ background: profile.avatar_url ? "transparent" : "linear-gradient(135deg,#D4C0FF,#F5E6A3)", color: "#2D3748" }}>
                {profile.avatar_url
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img loading="lazy" decoding="async" src={profile.avatar_url} alt={profile.pseudo} className="w-full h-full object-cover" />
                  : profile.pseudo[0]?.toUpperCase()}
              </div>
              <span className="text-sm font-medium" style={{ color: "#A78BFA" }}>@{profile.pseudo}</span>
            </button>
          ))}
        </div>
      )}

      <div className="flex-shrink-0 px-4 pb-5 pt-3 flex items-center gap-2.5" style={{ borderTop: "1px solid rgba(212,192,255,0.3)" }}>
        <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden"
          style={{ background: user?.avatar ? "transparent" : "linear-gradient(135deg,#D4C0FF,#F5E6A3)" }}>
          {user?.avatar
            // eslint-disable-next-line @next/next/no-img-element
            ? <img loading="lazy" decoding="async" src={user.avatar} alt="" className="w-full h-full object-cover" />
            : <span className="text-[10px] font-bold" style={{ color: "#2D3748" }}>{user?.pseudo?.[0]?.toUpperCase() ?? "?"}</span>}
        </div>
        <input ref={inputRef} type="text" value={input} onChange={handleInputChange}
          onKeyDown={e => {
            if (e.key === "Enter" && mentionResults.length === 0) handleSend();
            if (e.key === "Escape") { setMentionSearch(null); setMentionResults([]); }
          }}
          placeholder={user ? (replyingTo ? `↩ @${replyingTo.pseudo}…` : "Ajouter un commentaire…") : "Connecte-toi"}
          disabled={!user}
          className="flex-1 text-sm outline-none px-3 py-2.5 rounded-2xl"
          style={{ background: "rgba(240,235,255,0.5)", border: "1px solid rgba(212,192,255,0.5)", color: "#2D3748" }} />
        <motion.button whileTap={{ scale: 0.9 }} onClick={handleSend} disabled={!input.trim() || !user || sending}
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 cursor-pointer"
          style={{ background: input.trim() && user ? "linear-gradient(135deg,#D4C0FF,#F5E6A3)" : "rgba(240,235,255,0.5)" }}>
          <Send size={13} strokeWidth={2} style={{ color: input.trim() && user ? "#2D3748" : "#A0AEC0" }} />
        </motion.button>
      </div>
    </div>
  );
}

// Panel paramètres vidéo (vitesse, sous-titres, signaler)
function VideoSettingsPanel({ onClose, onSpeedChange, speed, captionsOn, onToggleCaptions, onReport, onDelete }: {
  onClose: () => void; onSpeedChange: (s: number) => void;
  speed: number; captionsOn: boolean; onToggleCaptions: () => void; onReport: () => void;
  onDelete?: () => void;
}) {
  const speeds = [0.25, 0.5, 1, 1.5, 2];
  return (
    <motion.div
      initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 32, stiffness: 320 }}
      className="absolute inset-x-0 bottom-0 z-50 rounded-t-3xl pb-8"
      style={{ background: "rgba(255,255,255,0.97)", backdropFilter: "blur(24px)", boxShadow: "0 -8px 40px rgba(167,139,250,0.18)" }}
      onClick={e => e.stopPropagation()}
    >
      <div className="pt-5" />
      <div className="px-5">
        <p className="text-sm font-semibold mb-4" style={{ color: "#2D3748" }}>Paramètres vidéo</p>
        {/* Vitesse */}
        <div className="mb-5">
          <p className="text-[11px] font-semibold tracking-widest uppercase mb-3" style={{ color: "#A0AEC0" }}>Vitesse de lecture</p>
          <div className="flex gap-2">
            {speeds.map(s => (
              <motion.button key={s} whileTap={{ scale: 0.93 }} onClick={() => onSpeedChange(s)}
                className="flex-1 py-2.5 rounded-2xl text-xs font-bold cursor-pointer"
                style={speed === s
                  ? { background: "linear-gradient(135deg,#D4C0FF,#F5E6A3)", color: "#2D3748", boxShadow: "0 2px 12px rgba(167,139,250,0.3)" }
                  : { background: "rgba(240,235,255,0.6)", color: "#A0AEC0", border: "1px solid rgba(212,192,255,0.4)" }}>
                {s === 1 ? "×1" : `×${s}`}
              </motion.button>
            ))}
          </div>
        </div>
        {/* Sous-titres */}
        <motion.button whileTap={{ scale: 0.97 }} onClick={onToggleCaptions}
          className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl mb-2 cursor-pointer"
          style={{ background: "rgba(240,235,255,0.5)", border: "1px solid rgba(212,192,255,0.4)" }}>
          <div className="flex items-center gap-3">
            <span className="text-base font-bold" style={{ color: "#A78BFA" }}>CC</span>
            <div>
              <p className="text-sm font-medium text-left" style={{ color: "#2D3748" }}>Sous-titres</p>
              <p className="text-[10px]" style={{ color: "#A0AEC0" }}>{captionsOn ? "Activés" : "Désactivés"}</p>
            </div>
          </div>
          <div className="w-11 h-6 rounded-full flex items-center px-1 transition-all" style={{ background: captionsOn ? "linear-gradient(135deg,#D4C0FF,#A78BFA)" : "rgba(212,192,255,0.3)" }}>
            <motion.div className="w-4 h-4 rounded-full bg-white shadow" animate={{ x: captionsOn ? 20 : 0 }} transition={{ type: "spring", stiffness: 500, damping: 30 }} />
          </div>
        </motion.button>
        {/* Signaler */}
        <motion.button whileTap={{ scale: 0.97 }} onClick={onReport}
          className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl mt-2 cursor-pointer"
          style={{ background: "rgba(252,129,129,0.07)", border: "1px solid rgba(252,129,129,0.2)" }}>
          <Flag size={16} strokeWidth={1.5} style={{ color: "#FC8181" }} />
          <p className="text-sm font-medium" style={{ color: "#FC8181" }}>Signaler cette vidéo</p>
        </motion.button>
        {/* Supprimer (auteur uniquement) */}
        {onDelete && (
          <motion.button whileTap={{ scale: 0.97 }} onClick={onDelete}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl mt-2 cursor-pointer"
            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)" }}>
            <X size={16} strokeWidth={2} style={{ color: "#EF4444" }} />
            <p className="text-sm font-semibold" style={{ color: "#EF4444" }}>Supprimer la vidéo</p>
          </motion.button>
        )}
        {/* Fermer */}
        <motion.button whileTap={{ scale: 0.97 }} onClick={onClose}
          className="w-full py-3 mt-3 rounded-2xl text-sm font-medium cursor-pointer"
          style={{ background: "rgba(240,235,255,0.6)", color: "#A0AEC0", border: "1px solid rgba(212,192,255,0.3)" }}>
          Fermer
        </motion.button>
      </div>
    </motion.div>
  );
}

const VideoCard = memo(function VideoCard({ post, isActive, eager, onHashtagClick, isScrollingRef, onDeletePost }: { post: RealPost; isActive: boolean; eager?: boolean; onHashtagClick?: (tag: string) => void; isScrollingRef?: React.RefObject<boolean>; onDeletePost?: (id: string) => Promise<boolean> | void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { user } = useAuth();

  // Interaction state
  const [liked, setLiked] = useState(() => post.post_likes?.some(l => l.user_id === (user?.id ?? "")) ?? false);
  const [likes, setLikes] = useState(post.post_likes?.length ?? 0);
  const [saved, setSaved] = useState(false);

  // Charger l'état "sauvegardé" depuis la DB
  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    supabase.from("post_saves").select("post_id").eq("post_id", post.id).eq("user_id", user.id).maybeSingle()
      .then(({ data }) => { if (data) setSaved(true); });
  }, [post.id, user]);

  const toggleSave = async () => {
    if (!user) return;
    const supabase = createClient();
    setSaved(s => !s); // optimiste
    if (saved) {
      await supabase.from("post_saves").delete().eq("post_id", post.id).eq("user_id", user.id);
    } else {
      await supabase.from("post_saves").upsert({ post_id: post.id, user_id: user.id }, { onConflict: "post_id,user_id", ignoreDuplicates: true });
    }
  };
  const [reposted, setReposted] = useState(() => post.post_reposts?.some(r => r.user_id === (user?.id ?? "")) ?? false);
  const [reposts, setReposts] = useState(post.post_reposts?.length ?? 0);
  const [commentCount, setCommentCount] = useState(post.post_comments?.length ?? 0);
  const [following, setFollowing] = useState(false);

  // UI state
  const [muted, setMuted] = useState(true);
  const [paused, setPaused] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [captionsOn, setCaptionsOn] = useState(false);
  const [reported, setReported] = useState(false);
  const [shared, setShared] = useState(false);
  const [doubleTapHeart, setDoubleTapHeart] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showShareToDM, setShowShareToDM] = useState(false);

  // Double-tap to like
  const lastTapRef = useRef(0);

  const authorPseudo = post.author?.pseudo ?? "utilisateur";
  const authorAvatar = post.author?.avatar_url;
  const authorCertified = post.author?.is_certified === true || post.author?.is_admin === true;

  // Play/pause on isActive + incrémenter les vues une fois par activation
  const viewCountedRef = useRef(false);
  const userPausedRef = useRef(false);   // true uniquement si l'user tape pour pause
  const isActiveRef = useRef(isActive);
  isActiveRef.current = isActive;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isActive) {
      userPausedRef.current = false;
      setPaused(false);
      // Pas de reset currentTime (évite la frame noire au scroll)
      const p = video.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
      if (!viewCountedRef.current) {
        viewCountedRef.current = true;
        void createClient().rpc("increment_post_views", { p_post_id: post.id });
      }
    } else {
      video.pause();
      viewCountedRef.current = false;
    }
  }, [isActive]); // eslint-disable-line react-hooks/exhaustive-deps

  // Anti-pause involontaire : pendant le scroll mobile, le navigateur met
  // parfois la vidéo active en pause. On la relance (sauf pause volontaire).
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onPause = () => {
      if (!isActiveRef.current || userPausedRef.current) return;
      requestAnimationFrame(() => {
        if (isActiveRef.current && !userPausedRef.current && video.paused) {
          const p = video.play();
          if (p && typeof p.catch === "function") p.catch(() => {});
        }
      });
    };
    // Joue dès que la vidéo a des données si elle est active (montage / swipe d'onglet)
    const tryPlayWhenReady = () => {
      if (isActiveRef.current && !userPausedRef.current && video.paused) {
        const p = video.play();
        if (p && typeof p.catch === "function") p.catch(() => {});
      }
    };
    video.addEventListener("pause", onPause);
    video.addEventListener("loadeddata", tryPlayWhenReady);
    video.addEventListener("canplay", tryPlayWhenReady);
    return () => {
      video.removeEventListener("pause", onPause);
      video.removeEventListener("loadeddata", tryPlayWhenReady);
      video.removeEventListener("canplay", tryPlayWhenReady);
    };
  }, []);

  // Playback rate
  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = speed;
  }, [speed]);

  // Captions via HTML track (if available)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const tracks = Array.from(video.textTracks);
    tracks.forEach(t => { t.mode = captionsOn ? "showing" : "hidden"; });
  }, [captionsOn]);

  const handleVideoTap = () => {
    // Ignorer les taps déclenchés par le scroll (swipe → click accidentel)
    if (isScrollingRef?.current) return;
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      // Double tap → like
      triggerLike();
      setDoubleTapHeart(true);
      setTimeout(() => setDoubleTapHeart(false), 900);
    } else {
      // Single tap → play/pause
      const video = videoRef.current;
      if (!video) return;
      if (video.paused) {
        userPausedRef.current = false;
        void video.play().catch(() => {});
        setPaused(false);
      } else {
        userPausedRef.current = true;
        video.pause();
        setPaused(true);
      }
    }
    lastTapRef.current = now;
  };

  const triggerLike = async () => {
    if (!user) return;
    if (!liked) {
      setLiked(true); setLikes(l => l + 1);
      const supabase = createClient();
      await supabase.from("post_likes").upsert({ post_id: post.id, user_id: user.id }, { onConflict: "post_id,user_id", ignoreDuplicates: true });
      if (post.user_id !== user.id) {
        void fetch("/api/notifications/like", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ liker_id: user.id, post_owner_id: post.user_id, post_id: post.id }),
        }).catch(() => {});
      }
    }
  };

  const toggleLike = async () => {
    if (!user) return;
    const supabase = createClient();
    if (liked) {
      setLiked(false); setLikes(l => l - 1);
      await supabase.from("post_likes").delete().eq("post_id", post.id).eq("user_id", user.id);
    } else {
      setLiked(true); setLikes(l => l + 1);
      await supabase.from("post_likes").upsert({ post_id: post.id, user_id: user.id }, { onConflict: "post_id,user_id", ignoreDuplicates: true });
      if (post.user_id !== user.id) {
        void fetch("/api/notifications/like", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ liker_id: user.id, post_owner_id: post.user_id, post_id: post.id }),
        }).catch(() => {});
      }
    }
  };

  const toggleRepost = async () => {
    if (!user) return;
    const supabase = createClient();
    if (reposted) {
      setReposted(false); setReposts(r => r - 1);
      await supabase.from("post_reposts").delete().eq("post_id", post.id).eq("user_id", user.id);
    } else {
      setReposted(true); setReposts(r => r + 1);
      await supabase.from("post_reposts").upsert({ post_id: post.id, user_id: user.id }, { onConflict: "post_id,user_id", ignoreDuplicates: true });
      if (post.user_id !== user.id) {
        void fetch("/api/notifications/repost", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reposter_id: user.id, post_owner_id: post.user_id, post_id: post.id }),
        }).catch(() => {});
      }
    }
  };

  const toggleFollow = async () => {
    if (!user || post.user_id === user.id) return;
    const supabase = createClient();
    if (following) {
      setFollowing(false);
      await supabase.from("followers").delete().eq("follower_id", user.id).eq("following_id", post.user_id);
    } else {
      setFollowing(true);
      await supabase.from("followers").upsert({ follower_id: user.id, following_id: post.user_id }, { ignoreDuplicates: true });
    }
  };

  const handleShare = () => setShowShareModal(true);

  const handleReport = () => {
    setReported(true);
    setShowSettings(false);
  };

  const fmtCount = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`;

  // ── Mobile = plein écran TikTok (boutons overlay), Desktop = carte + colonne ──
  // Init synchrone (pas de flash gris au montage de chaque vidéo au scroll)
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Couleurs des icônes : blanc (overlay) sur mobile, sombre sur desktop
  const icoColor = isMobile ? "#fff" : "#374151";
  const icoShadow = isMobile ? "drop-shadow(0 1px 3px rgba(0,0,0,0.6))" : "none";
  const labelColor = isMobile ? "rgba(255,255,255,0.95)" : "#6B7280";
  const labelShadow = isMobile ? { textShadow: "0 1px 3px rgba(0,0,0,0.6)" } : {};

  return (
    <div className="h-full flex items-center justify-center select-none relative"
      style={{ gap: isMobile ? 0 : 16, willChange: "transform", transform: "translateZ(0)" }}>

      {/* ══════════════════════════════════
          COLONNE VIDÉO (9:16)
      ══════════════════════════════════ */}
      <div className="relative flex-shrink-0 overflow-hidden"
        style={{ height: "100%", aspectRatio: isMobile ? undefined : "9/16", width: isMobile ? "100%" : undefined, maxWidth: isMobile ? "100%" : "calc(100% - 80px)", background: "#111", borderRadius: isMobile ? 0 : 18, boxShadow: isMobile ? "none" : "0 6px 28px rgba(0,0,0,0.22)", cursor: "pointer", willChange: "transform", transform: "translateZ(0)", backfaceVisibility: "hidden" }}
        onClick={handleVideoTap}>

        {/* Vidéo principale */}
        {post.media_url && (
          <video ref={videoRef} src={post.media_url}
            poster={(post.performance_data as { poster?: string } | null)?.poster ?? undefined}
            className="absolute inset-0 w-full h-full object-cover"
            muted={muted} playsInline autoPlay={isActive} preload={isActive || eager ? "auto" : "metadata"} loop
            style={{ pointerEvents: "none", zIndex: 0, willChange: "transform", transform: "translateZ(0)", imageRendering: "high-quality" as React.CSSProperties["imageRendering"], backgroundColor: "#000" }} />
        )}

        {/* Gradient bas — couvre caption + boutons */}
        <div className="absolute inset-x-0 bottom-0 z-10 pointer-events-none"
          style={{ height: 320, background: "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.55) 45%, rgba(0,0,0,0.15) 75%, transparent 100%)" }} />


        {/* Tap sur la vidéo = activer/couper le son (pas de bouton visible) */}

        {/* Signalé badge */}
        <AnimatePresence>
          {reported && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="absolute top-3 left-3 z-20 px-3 py-1.5 rounded-full flex items-center gap-1.5"
              style={{ background: "rgba(252,129,129,0.2)", border: "1px solid rgba(252,129,129,0.4)", backdropFilter: "blur(8px)" }}>
              <Flag size={11} strokeWidth={2} style={{ color: "#FC8181" }} />
              <span className="text-[10px] font-semibold" style={{ color: "#FC8181" }}>Signalé</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pause indicator */}
        <AnimatePresence>
          {paused && (
            <motion.div initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
              className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
              <div className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(10px)" }}>
                <Play size={24} strokeWidth={1.5} style={{ color: "#fff", marginLeft: 3 }} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Double-tap heart */}
        <AnimatePresence>
          {doubleTapHeart && (
            <motion.div initial={{ opacity: 0, scale: 0.3, y: 0 }} animate={{ opacity: [0, 1, 1, 0], scale: [0.3, 1.5, 1.2, 0.8], y: -60 }}
              transition={{ duration: 0.85, ease: "easeOut" }}
              className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
              <Heart size={90} strokeWidth={0} fill="#FF4458" style={{ filter: "drop-shadow(0 0 28px rgba(255,68,88,0.9))" }} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Badge vitesse */}
        {speed !== 1 && (
          <div className="absolute top-3 left-3 z-20 inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold pointer-events-none"
            style={{ background: "linear-gradient(135deg,#D4C0FF,#F5E6A3)", color: "#2D3748" }}>
            ×{speed}
          </div>
        )}

        {/* ══ AUTEUR + CAPTION (bas gauche, abaissé vers la nav) ══ */}
        <div className="absolute left-4 z-20" style={{ right: isMobile ? 72 : 16, bottom: isMobile ? "calc(70px + env(safe-area-inset-bottom))" : 18, pointerEvents: "none" }}>
          <Link href={post.user_id === user?.id ? "/profil" : `/profil/${encodeURIComponent(authorPseudo)}`} className="flex items-center gap-2 mb-2 w-fit" style={{ pointerEvents: "auto" }} onClick={e => e.stopPropagation()}>
            {authorAvatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img loading="lazy" decoding="async" src={authorAvatar} alt={authorPseudo}
                className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
            ) : (
              <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold"
                style={{ background: "linear-gradient(135deg,#D4C0FF,#A78BFA)", color: "#fff" }}>
                {authorPseudo[0]?.toUpperCase()}
              </div>
            )}
            <span className="flex items-center gap-1 min-w-0">
              <span className="text-white text-sm font-semibold leading-none drop-shadow-sm truncate">@{authorPseudo}</span>
              {authorCertified && (
                <span className="inline-flex items-center justify-center rounded-full flex-shrink-0"
                  style={{ width: 16, height: 16, background: "linear-gradient(135deg,#A78BFA,#7C5CFA)", boxShadow: "0 1px 5px rgba(124,92,250,0.55)" }}>
                  <svg width="9" height="9" viewBox="0 0 13 13" fill="none"><path d="M2.5 6.5L5 9L10.5 4" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </span>
              )}
            </span>
          </Link>
          {post.caption && (
            <p className="text-white text-[13px] leading-snug line-clamp-2" style={{ textShadow: "0 1px 5px rgba(0,0,0,0.85)", pointerEvents: "auto" }}>
              <CaptionText text={post.caption} onHashtagClick={(tag) => { onHashtagClick?.(tag); }} />
            </p>
          )}
        </div>

        {/* Panels overlay (commentaires & settings) */}
        <AnimatePresence>
          {showSettings && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 z-40"
              style={{ background: "rgba(0,0,0,0.55)" }}
              onClick={() => { setShowSettings(false); }} />
          )}
        </AnimatePresence>
        <AnimatePresence>
          {showComments && (
            <VideoCommentsPanel
              postId={post.id}
              postOwnerId={post.user_id}
              commentCount={commentCount}
              onClose={() => setShowComments(false)}
              onCommentAdded={() => setCommentCount(c => c + 1)}
            />
          )}
        </AnimatePresence>
        <AnimatePresence>
          {showSettings && (
            <VideoSettingsPanel
              speed={speed}
              onSpeedChange={s => setSpeed(s)}
              captionsOn={captionsOn}
              onToggleCaptions={() => setCaptionsOn(c => !c)}
              onReport={handleReport}
              onDelete={(user?.id === post.user_id || (user as { is_admin?: boolean } | null)?.is_admin) && onDeletePost
                ? async () => { setShowSettings(false); await onDeletePost(post.id); }
                : undefined}
              onClose={() => setShowSettings(false)}
            />
          )}
        </AnimatePresence>
      </div>{/* ── fin carte vidéo ── */}

      {/* ══════════════════════════════════
          COLONNE ACTIONS — overlay sur mobile, colonne à droite sur desktop
      ══════════════════════════════════ */}
      <div className={isMobile ? "absolute z-30 flex flex-col items-center" : "flex flex-col items-center flex-shrink-0"}
        style={isMobile
          ? { gap: 20, width: 52, right: 8, bottom: "calc(86px + env(safe-area-inset-bottom))" }
          : { gap: 22, width: 52, paddingBottom: 8 }}
        onClick={e => e.stopPropagation()}>

        {/* Like */}
        <button onClick={toggleLike} className="flex flex-col items-center gap-1 cursor-pointer">
          <motion.div whileTap={{ scale: 1.45 }} animate={liked ? { scale: [1, 1.45, 1] } : { scale: 1 }} transition={{ duration: 0.3 }}>
            <Heart size={30} strokeWidth={liked ? 0 : 2} fill={liked ? "#FF4458" : "none"}
              style={{ color: liked ? "#FF4458" : icoColor, filter: liked ? "drop-shadow(0 0 8px rgba(255,68,88,0.5))" : icoShadow }} />
          </motion.div>
          <span className="text-[11px] font-semibold" style={{ color: liked ? "#FF4458" : labelColor, ...labelShadow }}>{fmtCount(likes)}</span>
        </button>

        {/* Commentaires */}
        <button onClick={() => { setShowComments(s => !s); setShowSettings(false); }}
          className="flex flex-col items-center gap-1 cursor-pointer">
          <MessageCircle size={30} strokeWidth={2}
            style={{ color: showComments ? "#A78BFA" : icoColor, filter: icoShadow }} />
          <span className="text-[11px]" style={{ color: labelColor, ...labelShadow }}>{fmtCount(commentCount)}</span>
        </button>

        {/* Sauvegarder */}
        <button onClick={toggleSave} className="flex flex-col items-center cursor-pointer">
          <motion.div whileTap={{ scale: 1.3 }}>
            <Bookmark size={29} strokeWidth={2}
              fill={saved ? "#F5E6A3" : "none"}
              style={{ color: saved ? "#D4A843" : icoColor, filter: saved ? "drop-shadow(0 0 6px rgba(212,168,67,0.5))" : icoShadow }} />
          </motion.div>
        </button>

        {/* Partager */}
        <button onClick={handleShare} className="flex flex-col items-center cursor-pointer">
          <motion.div whileTap={{ scale: 1.3 }} animate={shared ? { scale: [1, 1.3, 1] } : {}} transition={{ duration: 0.3 }}>
            <Share2 size={28} strokeWidth={2} style={{ color: shared ? "#34D399" : icoColor, filter: icoShadow }} />
          </motion.div>
        </button>

        {/* Plus / settings */}
        <button onClick={() => { setShowSettings(s => !s); setShowComments(false); }}
          className="flex flex-col items-center cursor-pointer">
          <MoreHorizontal size={28} strokeWidth={2} style={{ color: icoColor, filter: icoShadow }} />
        </button>
      </div>{/* ── fin colonne actions ── */}

      {/* Share modals (position:fixed, échappent l'overflow) */}
      <AnimatePresence>
        {showShareModal && (
          <ShareModal
            postCaption={post.caption}
            onClose={() => setShowShareModal(false)}
            onShareDM={() => { setShowShareModal(false); setShowShareToDM(true); }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showShareToDM && (
          <ShareToDMModal
            post={post}
            onClose={() => setShowShareToDM(false)}
            onSent={(_partner) => {
              setShared(true);
              setTimeout(() => setShared(false), 2000);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
});

const TikTokFeed = memo(function TikTokFeed({ posts, initialPostId, onInitialScrolled, onHashtagClick, onActiveIndexChange, onScrollCollapse, feedHeight, onCreatePost, onDeletePost }: {
  posts: RealPost[];
  initialPostId?: string | null;
  onInitialScrolled?: () => void;
  onHashtagClick?: (tag: string) => void;
  onActiveIndexChange?: (idx: number) => void;
  onScrollCollapse?: (collapsed: boolean) => void;
  feedHeight?: number; // hauteur exacte mesurée depuis le parent
  onCreatePost?: () => void;
  onDeletePost?: (id: string) => Promise<boolean> | void;
}) {
  const videoPosts = posts.filter(p => p.media_type === "video" && p.media_url);
  const wrapperRef   = useRef<HTMLDivElement>(null);  // fallback measurement
  const containerRef = useRef<HTMLDivElement>(null);  // élément scrollable
  const isScrollingRef = useRef(false);               // true pendant le scroll → bloque handleVideoTap
  const [activeIndex, setActiveIndex] = useState(0);

  // ── Hauteur exacte en pixels via ResizeObserver ──────────────────
  // Évite les bugs de `height:100%` dans les flex children imbriqués
  // Priorité : hauteur mesurée depuis le parent (prop feedHeight)
  // Fallback : ResizeObserver local sur wrapperRef
  const [localSlotH, setLocalSlotH] = useState(0);
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const measure = () => {
      const h = el.getBoundingClientRect().height || el.clientHeight;
      if (h > 0) setLocalSlotH(Math.floor(h));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const slotH = (feedHeight && feedHeight > 0) ? feedHeight : localSlotH;
  const H = slotH > 0 ? `${slotH}px` : "100dvh";

  // ── Scroll léger : collapse header + flag "scrolling" (anti-tap accidentel) ──
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let rafId = 0;
    let lastCollapsed = false;
    let scrollStopTimer: ReturnType<typeof setTimeout>;

    const handleScroll = () => {
      isScrollingRef.current = true;
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const collapsed = el.scrollTop > 40;
        if (collapsed !== lastCollapsed) { lastCollapsed = collapsed; onScrollCollapse?.(collapsed); }
      });
      clearTimeout(scrollStopTimer);
      scrollStopTimer = setTimeout(() => { isScrollingRef.current = false; }, 150);
    };

    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", handleScroll);
      cancelAnimationFrame(rafId);
      clearTimeout(scrollStopTimer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onScrollCollapse]);

  // ── Vidéo active via IntersectionObserver (FIABLE sur mobile) ──────
  // Robuste aux changements de hauteur (barre d'URL qui se masque, dvh
  // variable) : on se base sur la VISIBILITÉ réelle, pas sur un calcul de
  // pixels qui dérape. La vidéo la plus visible (>50%) devient active.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || videoPosts.length === 0) return;
    const slots = Array.from(el.querySelectorAll("[data-slot]"));
    if (!slots.length) return;

    const ratios = new Map<number, number>();
    let lastIdx = -1;

    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        const idx = Number((e.target as HTMLElement).dataset.slot);
        ratios.set(idx, e.intersectionRatio);
      }
      let bestIdx = lastIdx, bestRatio = 0;
      ratios.forEach((r, i) => { if (r > bestRatio) { bestRatio = r; bestIdx = i; } });
      if (bestRatio >= 0.5 && bestIdx !== lastIdx && bestIdx >= 0) {
        lastIdx = bestIdx;
        setActiveIndex(bestIdx);
        onActiveIndexChange?.(bestIdx);
      }
    }, { root: el, threshold: [0, 0.25, 0.5, 0.75, 1] });

    slots.forEach((s) => io.observe(s));
    return () => io.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoPosts.length]);

  // ── Scroll vers le post partagé depuis un DM ────────────────────
  useEffect(() => {
    if (!initialPostId || !containerRef.current || videoPosts.length === 0 || slotH === 0) return;
    const idx = videoPosts.findIndex(p => p.id === initialPostId);
    if (idx < 0) return;
    requestAnimationFrame(() => {
      const el = containerRef.current;
      if (!el) return;
      el.scrollTop = idx * slotH;
      setActiveIndex(idx);
      onInitialScrolled?.();
    });
  }, [initialPostId, videoPosts, onInitialScrolled, slotH]);

  if (videoPosts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 px-6 text-center h-full">
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, rgba(212,192,255,0.35) 0%, rgba(245,230,163,0.3) 100%)", border: "1px solid rgba(167,139,250,0.2)", boxShadow: "0 8px 32px rgba(167,139,250,0.15)" }}
        >
          <Plus size={30} strokeWidth={1.4} style={{ color: "#A78BFA" }} />
        </div>
        <div>
          <p className="text-base font-medium" style={{ color: "#2D3748" }}>Aucune vidéo pour le moment</p>
          <p className="text-sm font-light mt-1.5 leading-relaxed" style={{ color: "#A0AEC0" }}>Publie ta première vidéo et lance la communauté 🎬</p>
        </div>
        {onCreatePost && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onCreatePost}
            className="mt-1 px-6 py-2.5 rounded-2xl text-[13px] font-semibold cursor-pointer"
            style={{ background: "linear-gradient(135deg,#D4C0FF 0%,#A78BFA 100%)", color: "#fff", boxShadow: "0 6px 20px rgba(167,139,250,0.3)" }}
          >
            Publier ma première vidéo
          </motion.button>
        )}
      </div>
    );
  }

  return (
    <div ref={wrapperRef} style={{ position: "absolute", inset: 0 }}>
      <div ref={containerRef}
        className="overflow-y-scroll mx-auto"
        style={{
          height: H,
          width: "100%",
          scrollSnapType: "y mandatory",
          scrollbarWidth: "none",
          overscrollBehavior: "contain",
          touchAction: "pan-y",
          WebkitOverflowScrolling: "touch" as never,
          willChange: "scroll-position",
          transform: "translateZ(0)",
        }}>
        {videoPosts.map((post, i) => {
          // ── Virtualisation : ne monter que les vidéos proches de l'écran ──
          // Fenêtre : précédente (1), active, et 2 suivantes (préchargées).
          // Hors fenêtre → placeholder vide (même hauteur) pour préserver scroll + snap.
          const dist = i - activeIndex;
          const inWindow = dist >= -1 && dist <= 2;
          return (
            <div key={post.id} data-slot={i} style={{ height: H, scrollSnapAlign: "start", scrollSnapStop: "always" }}>
              {inWindow ? (
                <VideoCard
                  post={post}
                  isActive={i === activeIndex}
                  eager={dist === 1 || dist === 2}
                  onHashtagClick={onHashtagClick}
                  isScrollingRef={isScrollingRef}
                  onDeletePost={onDeletePost}
                />
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Bouton retour en haut — visible dès la 2ème vidéo */}
      <AnimatePresence>
        {activeIndex > 0 && (
          <motion.button
            initial={{ opacity: 0, scale: 0.7, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.7, y: 10 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            onClick={() => {
              if (containerRef.current) {
                containerRef.current.scrollTo({ top: 0, behavior: "smooth" });
              }
            }}
            className="fixed bottom-28 right-4 md:bottom-8 md:right-8 z-50 w-11 h-11 rounded-full hidden md:flex items-center justify-center cursor-pointer"
            style={{
              background: "rgba(255,255,255,0.92)",
              backdropFilter: "blur(12px)",
              boxShadow: "0 4px 20px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.9)",
              border: "1px solid rgba(212,192,255,0.3)",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M9 14V4M9 4L4 9M9 4L14 9" stroke="#A78BFA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
});

// ── Cache module : le feed s'affiche INSTANTANÉMENT au retour sur Communauté ──
let __feedCache: RealPost[] = [];
let __likedCache = new Set<string>();
let __repostedCache = new Set<string>();

function CommunautePageInner() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [view, setView] = useState<View>("feed");
  const [search, setSearch] = useState("");
  const [searchFilter, setSearchFilter] = useState<SearchFilter>("tous");
  const [realProfiles, setRealProfiles] = useState<{ id: string; pseudo: string; full_name?: string; bio?: string; avatar_url?: string; is_admin?: boolean; is_certified?: boolean }[]>([]);
  const [realSessions, setRealSessions] = useState<SessionResult[]>([]);
  const [hashtagDbPosts, setHashtagDbPosts] = useState<RealPost[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  // followingIds = ensemble des IDs Supabase que l'utilisateur suit réellement
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  // mutualIds = amis réciproques (je les suis ET ils me suivent) → onglet "Amis"
  const [mutualIds, setMutualIds] = useState<Set<string>>(new Set());
  const [suggestedProfiles, setSuggestedProfiles] = useState<{ id: string; pseudo: string; full_name?: string; avatar_url?: string; bio?: string; is_admin?: boolean; is_certified?: boolean }[]>([]);

  /* Workout guide modal launched from a community post */
  const [communityWorkout, setCommunityWorkout] = useState<{
    sessionId: string; title: string; accent: string; duration: number;
    difficulty: string; category: string; exerciseList: Exercise[];
  } | null>(null);

  const [activeHashtag, setActiveHashtag] = useState<string | null>(null);
  // Modal plein écran hashtag vidéos
  const [hashtagVideosTag, setHashtagVideosTag] = useState<string | null>(null);
  // Header toujours visible (titre + stories + tabs), la vidéo prend le reste via flex
  const [headerCollapsed, setHeaderCollapsed] = useState(false);
  // Mobile = feed vidéo immersif plein écran (style Instagram Reels)
  const [isMobileView, setIsMobileView] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobileView(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  // Hauteur du feed container mesurée depuis le parent → passée à TikTokFeed
  const feedContainerRef = useRef<HTMLDivElement>(null);
  const [feedContainerH, setFeedContainerH] = useState(0);
  useEffect(() => {
    const el = feedContainerRef.current;
    if (!el) return;
    const measure = () => { const h = el.getBoundingClientRect().height; if (h > 0) setFeedContainerH(Math.floor(h)); };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const [sharePost, setSharePost] = useState<{ caption?: string; post?: RealPost } | null>(null);
  const [shareToDMPost, setShareToDMPost] = useState<RealPost | null>(null);
  const [showNewDM, setShowNewDM] = useState(false);
  const [storyGroup, setStoryGroup] = useState<RealStory[] | null>(null);
  const [showAddStory, setShowAddStory] = useState(false);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [realStories, setRealStories] = useState<RealStory[]>([]);
  const [realFeedPosts, setRealFeedPosts] = useState<RealPost[]>(() => __feedCache);
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedLoadingMore, setFeedLoadingMore] = useState(false);
  const [hasMoreFeed, setHasMoreFeed] = useState(true);
  const feedPageRef = useRef(0);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [feedMode, setFeedMode] = useState<"algo" | "amis">("algo");
  const [feedTab, setFeedTab] = useState<"posts" | "videos">("posts");
  // Mode vidéo immersif plein écran sur mobile (dépend de feedTab/view déclarés au-dessus)
  const immersiveVideo = isMobileView && feedTab === "videos" && view === "feed";

  // ── Swipe horizontal entre Publications (gauche) et Vidéos (droite) ──
  // Indicateur flèche : visible 5 s puis se cache (ne gêne pas les vidéos)
  const [swipeHint, setSwipeHint] = useState(true);
  useEffect(() => {
    setSwipeHint(true);
    const t = setTimeout(() => setSwipeHint(false), 5000);
    return () => clearTimeout(t);
  }, [feedTab, view]);
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const onFeedTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    swipeStart.current = { x: t.clientX, y: t.clientY };
  };
  const onFeedTouchEnd = (e: React.TouchEvent) => {
    if (!swipeStart.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - swipeStart.current.x;
    const dy = t.clientY - swipeStart.current.y;
    swipeStart.current = null;
    // Swipe clairement horizontal uniquement (ne gêne pas le scroll vertical)
    if (Math.abs(dx) < 55 || Math.abs(dx) < Math.abs(dy) * 1.4) return;
    if (dx < 0 && feedTab === "posts") setFeedTab("videos");      // doigt vers la gauche → Vidéos
    else if (dx > 0 && feedTab === "videos") setFeedTab("posts"); // doigt vers la droite → Publications
  };
  const [highlightVideoId, setHighlightVideoId] = useState<string | null>(null);
  const [likedRealIds, setLikedRealIds] = useState<Set<string>>(() => new Set(__likedCache));
  const [hiddenRealIds, setHiddenRealIds] = useState<Set<string>>(new Set());
  const [openRealComments, setOpenRealComments] = useState<Set<string>>(new Set());
  const [savedRealIds, setSavedRealIds] = useState<Set<string>>(new Set());
  const [repostedRealIds, setRepostedRealIds] = useState<Set<string>>(() => new Set(__repostedCache));
  const [openRealMenu, setOpenRealMenu] = useState<string | null>(null);
  const [burstRealId, setBurstRealId] = useState<string | null>(null);
  const [dmConversations, setDmConversations] = useState<DMConversation[]>([]);
  const [dmsLoading, setDmsLoading] = useState(false);
  const [activeDMPartner, setActiveDMPartner] = useState<DMPartner | null>(null);
  const [dmMessages, setDmMessages] = useState<DirectMessage[]>([]);
  const [dmInput, setDmInput] = useState("");
  const [dmSending, setDmSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState<DirectMessage | null>(null);
  const [activeMessageMenu, setActiveMessageMenu] = useState<string | null>(null);
  const dmInputRef = useRef<HTMLInputElement>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [editingPost, setEditingPost] = useState<{ id: string; caption: string; bio: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

  // ── Suppression d'un post (posts ET vidéos) via route serveur sécurisée ──
  const deleteRealPost = useCallback(async (postId: string): Promise<boolean> => {
    const supabase = createClient();
    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token;
    if (!token) { showToast("Session expirée, reconnecte-toi"); return false; }
    const res = await fetch("/api/posts/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ post_id: postId }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) { showToast(`Suppression impossible : ${json.error ?? res.status}`); return false; }
    setRealFeedPosts((prev) => prev.filter((p) => p.id !== postId));
    __feedCache = __feedCache.filter((p) => p.id !== postId);
    showToast("Post supprimé");
    return true;
  }, []);

  // ── Algorithme de ranking ────────────────────────────────────
  const getScore = useCallback((post: RealPost): number => {
    const likes    = post.post_likes.length;
    const comments = post.post_comments.length;
    const ageMs    = Date.now() - new Date(post.created_at).getTime();
    const ageH     = ageMs / (1000 * 60 * 60);

    // Bonus de récence : décroît avec le temps
    const recency = ageH < 1 ? 10 : ageH < 6 ? 5 : ageH < 24 ? 2 : ageH < 72 ? 0.5 : 0;

    // Bonus abonnement : posts des gens suivis remontent
    const followBonus = followingIds.has(post.user_id) ? 8 : 0;

    // Pénalité de fatigue : évite de revoir les posts déjà vus/masqués
    const hiddenPenalty = hiddenRealIds.has(post.id) ? -100 : 0;

    return likes * 3 + comments * 2 + recency + followBonus + hiddenPenalty;
  }, [followingIds, hiddenRealIds]);

  const sortedFeedPosts = useMemo(() => {
    let visible = realFeedPosts.filter(p => !hiddenRealIds.has(p.id));
    // Onglet "Amis" : uniquement les posts des follows mutuels (réciproques)
    if (feedMode === "amis") {
      visible = visible.filter(p => mutualIds.has(p.user_id));
      // Tri par récence (les plus récents d'abord)
      return [...visible].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return [...visible].sort((a, b) => getScore(b) - getScore(a));
  }, [realFeedPosts, hiddenRealIds, feedMode, getScore, mutualIds]);


  // Charger les abonnements réels depuis Supabase + calculer les amis mutuels
  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    (async () => {
      const [{ data: following }, { data: followers }] = await Promise.all([
        // Les gens que JE suis
        supabase.from("followers").select("following_id").eq("follower_id", user.id),
        // Les gens qui ME suivent
        supabase.from("followers").select("follower_id").eq("following_id", user.id),
      ]);
      const followingSet = new Set((following ?? []).map((r) => r.following_id as string));
      const followerSet = new Set((followers ?? []).map((r) => r.follower_id as string));
      setFollowingIds(followingSet);
      // Mutuels = présents dans les deux ensembles
      const mutual = new Set<string>();
      followingSet.forEach((id) => { if (followerSet.has(id)) mutual.add(id); });
      setMutualIds(mutual);
    })();
  }, [user]);

  // Ouvrir directement un DM si paramètre ?dm=userId&pseudo=xxx présent
  useEffect(() => {
    const dmId     = searchParams?.get("dm");
    const dmPseudo = searchParams?.get("pseudo");
    if (!dmId || !dmPseudo) return;

    const supabase = createClient();
    supabase
      .from("profiles")
      .select("id, pseudo, full_name, avatar_url")
      .eq("id", dmId)
      .maybeSingle()
      .then(({ data }) => {
        const partner: DMPartner = {
          id:         dmId,
          pseudo:     data?.pseudo   ?? dmPseudo,
          full_name:  data?.full_name ?? null,
          avatar_url: data?.avatar_url ?? null,
        };
        setActiveDMPartner(partner);
        setDmMessages([]);
        setView("thread");
      });
  }, [searchParams]); // eslint-disable-line

  // Ouvrir directement la VIDÉO du jour si ?video=<id> présent → onglet Vidéos + scroll dessus
  useEffect(() => {
    const vid = searchParams?.get("video");
    if (!vid) return;
    setView("feed");
    setFeedTab("videos");
    setHighlightVideoId(vid);
  }, [searchParams]); // eslint-disable-line

  // Charger les suggestions de comptes à suivre
  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    supabase
      .from("profiles")
      .select("id, pseudo, full_name, avatar_url, bio, is_admin, is_certified")
      .neq("id", user.id)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (data) setSuggestedProfiles(data as typeof suggestedProfiles);
      });
  }, [user]); // eslint-disable-line

  // Charger TOUTES les stories actives — visibles par tous les utilisateurs
  const loadStories = useCallback(async () => {
    if (!user) return;
    const supabase = createClient();

    // Toutes les stories actives (pas de filtre par following → visible par tous)
    const { data: storiesData } = await supabase
      .from("stories")
      .select("id, user_id, content_type, content_data, caption, media_url, media_type, created_at, expires_at")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(100);

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

  // Reset header collapse quand on change d'onglet
  useEffect(() => { setHeaderCollapsed(false); }, [feedTab]);

  // ── Lock du scroll de la page en mode Vidéos (seul le feed scrolle) ──
  useEffect(() => {
    const lock = feedTab === "videos" && view === "feed";
    if (lock) {
      const prevBody = document.body.style.overflow;
      const prevHtml = document.documentElement.style.overflow;
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prevBody;
        document.documentElement.style.overflow = prevHtml;
      };
    }
  }, [feedTab, view]);

  // Charger le feed réel depuis Supabase (paginé)
  const loadFeed = useCallback(async ({ append = false }: { append?: boolean } = {}) => {
    const PAGE_SIZE = 30;
    if (!user) return;
    if (append) {
      setFeedLoadingMore(true);
    } else {
      // Skeleton seulement si rien en cache (sinon refresh silencieux → affichage instantané)
      if (__feedCache.length === 0) setFeedLoading(true);
      feedPageRef.current = 0;
    }
    const offset = feedPageRef.current * PAGE_SIZE;
    const supabase = createClient();
    const { data } = await supabase
      .from("posts")
      .select(`
        id, type, caption, description, audience, performance_data, media_url, media_type, views, created_at, user_id,
        author:profiles!user_id(pseudo, full_name, avatar_url, is_admin, is_certified),
        post_likes(user_id),
        post_comments(id),
        post_reposts(user_id),
        post_saves(user_id)
      `)
      .order("created_at", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);
    if (data) {
      const newPosts = data as unknown as RealPost[];
      // ── Récup MES interactions via endpoint admin (bypass RLS, garanti retourner les vraies données) ──
      const meRes = await fetch(`/api/me/interactions?user_id=${user.id}`).then((r) => r.json()).catch((e) => ({ likes: [], reposts: [], saves: [], err: String(e) }));
      const myLikes    = new Set<string>(Array.isArray(meRes.likes)   ? meRes.likes   : []);
      const myReposts  = new Set<string>(Array.isArray(meRes.reposts) ? meRes.reposts : []);
      const mySaves    = new Set<string>(Array.isArray(meRes.saves)   ? meRes.saves   : []);
      if (meRes.errors) console.warn("[interactions] errors:", meRes.errors);

      if (append) {
        setRealFeedPosts((prev) => [...prev, ...newPosts]);
        setLikedRealIds((prev) => {
          const next = new Set(prev);
          myLikes.forEach((id) => next.add(id));
          return next;
        });
        setRepostedRealIds((prev) => {
          const next = new Set(prev);
          myReposts.forEach((id) => next.add(id));
          return next;
        });
      } else {
        setRealFeedPosts(newPosts);
        setLikedRealIds(myLikes);
        setRepostedRealIds(myReposts);
        // Mise en cache pour un affichage instantané au prochain retour
        __feedCache = newPosts;
        __likedCache = myLikes;
        __repostedCache = myReposts;
      }
      void mySaves; // available pour usages futurs
      const full = newPosts.length === PAGE_SIZE;
      setHasMoreFeed(full);
      if (full) feedPageRef.current += 1;
    }
    if (append) setFeedLoadingMore(false);
    else setFeedLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => { loadFeed(); }, [loadFeed]);

  // Callbacks stables passés à TikTokFeed → préserve sa mémoïsation (memo)
  const handleHashtagClick    = useCallback((tag: string) => setHashtagVideosTag(tag), []);
  const handleScrollCollapse  = useCallback((collapsed: boolean) => setHeaderCollapsed(collapsed), []);
  const handleInitialScrolled = useCallback(() => setHighlightVideoId(null), []);
  const handleCreatePost      = useCallback(() => setShowCreatePost(true), []);
  const handleActiveIndexChange = useCallback((idx: number) => {
    const total = sortedFeedPosts.filter((p) => p.media_type === "video" && p.media_url).length;
    if (idx >= total - 3 && hasMoreFeed && !feedLoading && !feedLoadingMore) {
      void loadFeed({ append: true });
    }
  }, [sortedFeedPosts, hasMoreFeed, feedLoading, feedLoadingMore, loadFeed]);

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
            id, type, caption, description, audience, performance_data, media_url, media_type, views, created_at, user_id,
            author:profiles!user_id(pseudo, full_name, avatar_url, is_admin, is_certified),
            post_likes(user_id),
            post_comments(id),
            post_reposts(user_id),
        post_saves(user_id)
          `)
          .eq("id", (payload.new as { id: string }).id)
          .maybeSingle();
        if (data) setRealFeedPosts((prev) => [data as unknown as RealPost, ...prev]);
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [user]);

  // Infinite scroll : charger la page suivante quand le sentinel devient visible
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreFeed && !feedLoading && !feedLoadingMore) {
          loadFeed({ append: true });
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMoreFeed, feedLoading, feedLoadingMore, loadFeed]);

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
        console.error("follow:", error);
        showToast("Impossible de suivre, réessaie");
        return;
      }
      // Notification in-app + email via route admin (insertion unique)
      void supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) return;
        fetch("/api/notifications/follow", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session.access_token}` },
          body: JSON.stringify({ follower_id: user.id, followed_id: profile.id }),
        }).catch(() => {});
      });
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
        console.error("unfollow:", error);
        showToast("Impossible de se désabonner, réessaie");
        return;
      }
      showToast("Abonnement annulé");
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [dmMessages]);

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
      const { error: likeErr } = await supabase.from("post_likes").upsert({ post_id: postId, user_id: user.id }, { onConflict: "post_id,user_id", ignoreDuplicates: true });
      // 409/23505 = doublon = like déjà existant → on garde l'état liké
      const isDupErr = likeErr && (likeErr.code === "23505" || (likeErr as { status?: number }).status === 409 || likeErr.message?.includes("duplicate"));
      if (likeErr && !isDupErr) {
        console.error("[LIKE] Supabase error:", likeErr);
        setLikedRealIds((prev) => { const n = new Set(prev); n.delete(postId); return n; });
        setRealFeedPosts((prev) => prev.map((p) => p.id !== postId ? p : { ...p, post_likes: p.post_likes.filter((l) => l.user_id !== user.id) }));
        return;
      }
      // Notif au propriétaire du post (via route admin)
      const post = realFeedPosts.find((p) => p.id === postId);
      if (post && post.user_id !== user.id) {
        void fetch("/api/notifications/like", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ liker_id: user.id, post_owner_id: post.user_id, post_id: postId }),
        }).catch(() => {});
      }
    } else {
      await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", user.id);
    }
  };

  const toggleRepost = async (postId: string) => {
    if (!user) return;
    const supabase = createClient();
    const isReposted = repostedRealIds.has(postId);
    setRepostedRealIds((prev) => {
      const n = new Set(prev);
      isReposted ? n.delete(postId) : n.add(postId);
      return n;
    });
    setRealFeedPosts((prev) => prev.map((p) => p.id !== postId ? p : {
      ...p,
      post_reposts: isReposted
        ? p.post_reposts.filter((r) => r.user_id !== user.id)
        : [...p.post_reposts, { user_id: user.id }],
    }));
    if (!isReposted) {
      await supabase.from("post_reposts").upsert({ post_id: postId, user_id: user.id }, { onConflict: "post_id,user_id", ignoreDuplicates: true });
      showToast("Post boosté ! 🔄");
      // Notif au propriétaire du post (via route admin)
      const post = realFeedPosts.find((p) => p.id === postId);
      if (post && post.user_id !== user.id) {
        void fetch("/api/notifications/repost", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reposter_id: user.id, post_owner_id: post.user_id, post_id: postId }),
        }).catch(() => {});
      }
    } else {
      await supabase.from("post_reposts").delete().eq("post_id", postId).eq("user_id", user.id);
    }
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
      .select("id, sender_id, receiver_id, content, created_at, read_at, reply_to_id, post_id")
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${user.id})`)
      .order("created_at", { ascending: true })
      .limit(100);

    if (data) {
      const msgs = data as (DirectMessage & { reply_to_id?: string | null })[];

      // Fetch reply_to content for messages that have a reply
      const replyIds = [...new Set(msgs.filter(m => m.reply_to_id).map(m => m.reply_to_id!))];
      let replyMap: Record<string, string> = {};
      if (replyIds.length > 0) {
        const { data: replyData } = await supabase
          .from("direct_messages")
          .select("id, content")
          .in("id", replyIds);
        if (replyData) {
          replyMap = Object.fromEntries(replyData.map((r: { id: string; content: string }) => [r.id, r.content]));
        }
      }

      // Fetch reactions for all messages
      const msgIds = msgs.map(m => m.id);
      let reactionsMap: Record<string, DmReaction[]> = {};
      if (msgIds.length > 0) {
        const { data: rxData } = await supabase
          .from("dm_reactions")
          .select("message_id, emoji, user_id")
          .in("message_id", msgIds);
        if (rxData) {
          const grouped: Record<string, { emoji: string; user_ids: string[] }[]> = {};
          for (const rx of rxData as { message_id: string; emoji: string; user_id: string }[]) {
            if (!grouped[rx.message_id]) grouped[rx.message_id] = [];
            const existing = grouped[rx.message_id].find(g => g.emoji === rx.emoji);
            if (existing) existing.user_ids.push(rx.user_id);
            else grouped[rx.message_id].push({ emoji: rx.emoji, user_ids: [rx.user_id] });
          }
          for (const [msgId, groups] of Object.entries(grouped)) {
            reactionsMap[msgId] = groups.map(g => ({
              emoji: g.emoji,
              count: g.user_ids.length,
              reacted: g.user_ids.includes(user.id),
            }));
          }
        }
      }

      // Fetch shared post data for messages that include a post_id
      const sharedPostIds = [...new Set(msgs.filter(m => m.post_id).map(m => m.post_id!))];
      let sharedPostMap: Record<string, DirectMessage["shared_post"]> = {};
      if (sharedPostIds.length > 0) {
        const { data: postData } = await supabase
          .from("posts")
          .select("id, caption, media_url, media_type, type")
          .in("id", sharedPostIds);
        if (postData) {
          sharedPostMap = Object.fromEntries(
            (postData as { id: string; caption?: string; media_url?: string; media_type?: string; type?: string }[])
              .map(p => [p.id, p])
          );
        }
      }

      setDmMessages(msgs.map(m => ({
        ...m,
        reply_to_content: m.reply_to_id ? replyMap[m.reply_to_id] ?? null : null,
        shared_post: m.post_id ? sharedPostMap[m.post_id] ?? null : null,
        reactions: reactionsMap[m.id] ?? [],
      })));

      // Marquer comme lus (DB + état local)
      const now = new Date().toISOString();
      supabase.from("direct_messages")
        .update({ read_at: now })
        .eq("receiver_id", user.id)
        .eq("sender_id", partnerId)
        .is("read_at", null)
        .then(() => {
          // Mettre à jour read_at localement pour afficher ✓✓ immédiatement
          setDmMessages((prev) =>
            prev.map((m) =>
              m.sender_id === partnerId && m.receiver_id === user.id && !m.read_at
                ? { ...m, read_at: now }
                : m
            )
          );
        });
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
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "direct_messages",
        filter: `sender_id=eq.${user?.id}`,
      }, (payload) => {
        const updated = payload.new as DirectMessage;
        if (updated.read_at) {
          // Le partenaire a lu nos messages → mettre à jour ✓✓
          setDmMessages((prev) =>
            prev.map((m) => m.id === updated.id ? { ...m, read_at: updated.read_at } : m)
          );
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel).catch(() => {}); };
  }, [activeDMPartner, view]); // eslint-disable-line

  // ── Envoyer un DM ─────────────────────────────────────────
  const handleSendDM = async () => {
    if (!user || !activeDMPartner || !dmInput.trim() || dmSending) return;
    const content = dmInput.trim();
    const replyId = replyingTo?.id ?? null;
    const replyContent = replyingTo?.content ?? null;
    setDmInput("");
    setReplyingTo(null);
    setDmSending(true);
    const supabase = createClient();
    const optimistic: DirectMessage = {
      id: `temp-${Date.now()}`,
      sender_id: user.id,
      receiver_id: activeDMPartner.id,
      content,
      created_at: new Date().toISOString(),
      read_at: null,
      reply_to_id: replyId,
      reply_to_content: replyContent,
      reactions: [],
    };
    setDmMessages((prev) => [...prev, optimistic]);
    const insertPayload: Record<string, unknown> = { sender_id: user.id, receiver_id: activeDMPartner.id, content };
    if (replyId) insertPayload.reply_to_id = replyId;
    const { data, error } = await supabase
      .from("direct_messages")
      .insert(insertPayload)
      .select()
      .single();
    setDmSending(false);
    if (error) {
      setDmMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      showToast("Erreur d'envoi");
    } else if (data) {
      setDmMessages((prev) => prev.map((m) => m.id === optimistic.id ? { ...(data as DirectMessage), reply_to_content: replyContent, reactions: [] } : m));
    }
  };

  // ── Réagir à un message ────────────────────────────────────
  const handleDmReaction = async (msgId: string, emoji: string) => {
    if (!user) return;
    setActiveMessageMenu(null);
    const supabase = createClient();

    setDmMessages(prev => prev.map(m => {
      if (m.id !== msgId) return m;
      const reactions = m.reactions ?? [];
      const existing = reactions.find(r => r.emoji === emoji);
      if (existing?.reacted) {
        // Retire la réaction
        return { ...m, reactions: reactions.map(r => r.emoji === emoji ? { ...r, count: r.count - 1, reacted: false } : r).filter(r => r.count > 0) };
      } else if (existing) {
        return { ...m, reactions: reactions.map(r => r.emoji === emoji ? { ...r, count: r.count + 1, reacted: true } : r) };
      } else {
        return { ...m, reactions: [...reactions, { emoji, count: 1, reacted: true }] };
      }
    }));

    // Check if already reacted
    const msg = dmMessages.find(m => m.id === msgId);
    const alreadyReacted = msg?.reactions?.find(r => r.emoji === emoji)?.reacted;

    if (alreadyReacted) {
      await supabase.from("dm_reactions").delete().eq("message_id", msgId).eq("user_id", user.id).eq("emoji", emoji);
    } else {
      await supabase.from("dm_reactions").upsert({ message_id: msgId, user_id: user.id, emoji }, { ignoreDuplicates: true });
    }
  };

  // Fetch real profiles / sessions / hashtag posts from Supabase on search
  useEffect(() => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    const q = search.trim();
    if (!q) { setRealProfiles([]); setRealSessions([]); setHashtagDbPosts([]); return; }
    const isHashtag = q.startsWith("#") && q.length > 1;
    searchDebounce.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const supabase = createClient();
        const [profileRes, sessionRes, postRes] = await Promise.all([
          !isHashtag && searchFilter !== "seances"
            ? supabase.from("profiles").select("id, pseudo, full_name, bio, avatar_url, is_admin, is_certified").or(`pseudo.ilike.%${q}%,full_name.ilike.%${q}%`).limit(15)
            : { data: [] },
          !isHashtag && searchFilter !== "compte"
            ? supabase.from("custom_sessions").select("id, title, category, duration, difficulty, muscles, accent, icon, user_id").eq("visibility", "public").ilike("title", `%${q}%`).limit(12)
            : { data: [] },
          isHashtag
            ? supabase.from("posts").select(`
                id, type, caption, description, audience, performance_data, media_url, media_type, created_at, user_id,
                author:profiles!user_id(pseudo, full_name, avatar_url, is_admin, is_certified),
                post_likes(user_id),
                post_comments(id),
                post_reposts(user_id),
        post_saves(user_id)
              `)
              .or(`caption.ilike.%${q}%,description.ilike.%${q}%`)
              .order("created_at", { ascending: false })
              .limit(30)
            : { data: [] },
        ]);
        setRealProfiles((profileRes.data as typeof realProfiles) ?? []);
        setRealSessions((sessionRes.data as SessionResult[]) ?? []);
        setHashtagDbPosts((postRes.data as unknown as RealPost[]) ?? []);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
  }, [search, searchFilter]); // eslint-disable-line

  const filteredResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    const isHashtag = q.startsWith("#") && q.length > 1;
    // Merge DB results + locally-loaded posts, deduplicated by id
    const localMatches = isHashtag
      ? realFeedPosts.filter(p =>
          p.caption?.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q)
        )
      : [];
    const dbIds = new Set(hashtagDbPosts.map(p => p.id));
    const merged = [
      ...hashtagDbPosts,
      ...localMatches.filter(p => !dbIds.has(p.id)),
    ];
    return {
      realProfiles: searchFilter !== "seances" ? realProfiles : [],
      sessions:     searchFilter !== "compte"  ? realSessions : [],
      // Suggestions : comptes pas encore suivis (utilisé quand search est vide)
      suggestions:  suggestedProfiles.filter(p => !followingIds.has(p.id)).slice(0, 8),
      // Posts trouvés par hashtag (DB + local cache)
      hashtagPosts: isHashtag ? merged : [],
    };
  }, [searchFilter, realProfiles, realSessions, suggestedProfiles, followingIds, search, realFeedPosts, hashtagDbPosts]);

  // Trending hashtags : extraire les #tags les plus fréquents des posts chargés
  const trendingHashtags = useMemo(() => {
    const counts = new Map<string, number>();
    const tagRe = /#\w+/g;
    realFeedPosts.forEach((p) => {
      const text = `${p.caption ?? ""} ${p.description ?? ""}`;
      const tags = text.match(tagRe);
      tags?.forEach((tag) => {
        const lower = tag.toLowerCase();
        counts.set(lower, (counts.get(lower) ?? 0) + 1);
      });
    });
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([tag, count]) => ({ tag, count }));
  }, [realFeedPosts]);

  return (
    <div
      className={`flex flex-col w-full mx-auto max-w-4xl relative ${
        immersiveVideo
          ? "fixed inset-0 z-20 h-dvh overflow-hidden px-0"
          : feedTab === "videos"
            ? "px-4 md:px-8 h-dvh overflow-hidden pb-0"
            : "px-4 md:px-8 min-h-screen"
      }`}
      style={
        immersiveVideo
          ? {}
          : feedTab === "videos" && !immersiveVideo
            ? {
                paddingTop: headerCollapsed ? 0 : 32,
                transition: "padding-top 0.3s cubic-bezier(0.4,0,0.2,1)",
              }
            : {
                // Feed Publications : safe-area en haut + dégagement de la barre du bas
                paddingTop: "calc(env(safe-area-inset-top) + 12px)",
                paddingBottom: "calc(7rem + env(safe-area-inset-bottom))",
              }
      }
      onClick={() => { if (openRealMenu !== null) setOpenRealMenu(null); }}
    >
      {/* ── Contenu ── */}
      <div className={`relative flex flex-col flex-1${feedTab === "videos" ? " min-h-0 overflow-hidden" : ""}`}>

      {/* Top Bar — caché en mode immersif mobile (vidéos) */}
      <div className={immersiveVideo ? "hidden" : ""} style={feedTab === "videos" && !immersiveVideo ? {
        maxHeight: headerCollapsed ? 0 : 90,
        overflow: "hidden",
        transition: "max-height 0.38s cubic-bezier(0.4,0,0.2,1), opacity 0.28s cubic-bezier(0.4,0,0.2,1)",
        opacity: headerCollapsed ? 0 : 1,
        flexShrink: 0,
        willChange: "max-height, opacity",
      } : {}}>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-between mb-5"
      >
        {view === "thread" && activeDMPartner ? (
          <Link href={`/profil/${encodeURIComponent(activeDMPartner.pseudo)}`} className="flex items-center gap-2.5 cursor-pointer group">
            {activeDMPartner.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img loading="lazy" decoding="async" src={activeDMPartner.avatar_url} alt={activeDMPartner.pseudo}
                className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                style={{ border: "1.5px solid rgba(167,139,250,0.4)" }} />
            ) : (
              <div className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold"
                style={{ background: "linear-gradient(135deg,#D4C0FF,#A78BFA)", color: "#fff" }}>
                {activeDMPartner.pseudo[0]?.toUpperCase()}
              </div>
            )}
            <h1 className="text-xl font-light tracking-tight group-hover:underline" style={{ color: "#2D3748" }}>
              @{activeDMPartner.pseudo}
            </h1>
          </Link>
        ) : (
          <h1 className="text-2xl font-extralight tracking-tight" style={{ color: "#2D3748" }}>
            Communauté
          </h1>
        )}
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
              <Link href="/decouverte" aria-label="Découvrir des comptes">
                <motion.div
                  whileTap={{ scale: 0.9 }}
                  className="lg-strong lg-highlight relative w-10 h-10 rounded-2xl flex items-center justify-center cursor-pointer"
                >
                  <Compass size={16} strokeWidth={1.5} style={{ color: "#2D3748" }} />
                </motion.div>
              </Link>
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
      </div>{/* end collapsible title wrapper */}

      <AnimatePresence mode="wait">
        {/* ────── FEED ────── */}
        {view === "feed" && (
          <motion.div
            key="feed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onTouchStart={onFeedTouchStart}
            onTouchEnd={onFeedTouchEnd}
            className={feedTab === "videos" ? "flex flex-col flex-1 min-h-0 overflow-hidden" : "flex flex-col gap-5 pb-4"}
          >
            {/* ── Indicateur swipe vers Vidéos (sur Publications) — blanc, auto-masqué 5s ── */}
            <AnimatePresence>
              {feedTab === "posts" && swipeHint && (
                <motion.button
                  onClick={() => setFeedTab("videos")}
                  aria-label="Voir les vidéos"
                  className="fixed top-1/2 -translate-y-1/2 right-2 z-40 flex items-center gap-1 pl-3 pr-2 py-2 rounded-full cursor-pointer"
                  style={{ background: "#fff", boxShadow: "0 6px 20px rgba(124,92,250,0.28)", border: "1px solid rgba(167,139,250,0.25)" }}
                  initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: [6, 0, 6] }} exit={{ opacity: 0, x: 18 }}
                  transition={{ opacity: { duration: 0.4 }, x: { duration: 1.6, repeat: Infinity, ease: "easeInOut" } }}
                >
                  <span className="text-[11px] font-bold" style={{ color: "#7C5CFA" }}>Vidéos</span>
                  <ChevronRight size={16} strokeWidth={2.6} color="#7C5CFA" />
                </motion.button>
              )}
            </AnimatePresence>
            {/* ── Retour vers Publications (sur Vidéos) — blanc, auto-masqué 5s ── */}
            <AnimatePresence>
              {feedTab === "videos" && view === "feed" && swipeHint && (
                <motion.button
                  onClick={() => setFeedTab("posts")}
                  aria-label="Voir les publications"
                  className="fixed top-1/2 -translate-y-1/2 left-2 md:left-[96px] z-40 flex items-center gap-1 pl-2 pr-3 py-2 rounded-full cursor-pointer"
                  style={{ background: "#fff", boxShadow: "0 6px 20px rgba(0,0,0,0.3)" }}
                  initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }}
                  transition={{ duration: 0.4 }}
                >
                  <ChevronLeft size={16} strokeWidth={2.6} color="#7C5CFA" />
                  <span className="text-[11px] font-bold" style={{ color: "#7C5CFA" }}>Publications</span>
                </motion.button>
              )}
            </AnimatePresence>

            {/* Stories — cachées en mode immersif mobile */}
            <div className={immersiveVideo ? "hidden" : ""} style={feedTab === "videos" && !immersiveVideo ? {
              maxHeight: headerCollapsed ? 0 : 150,
              overflow: "hidden",
              transition: "max-height 0.38s cubic-bezier(0.4,0,0.2,1), opacity 0.28s cubic-bezier(0.4,0,0.2,1)",
              opacity: headerCollapsed ? 0 : 1,
              flexShrink: 0,
              willChange: "max-height, opacity",
            } : {}}>
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
                <div className="flex gap-3 overflow-x-auto pb-3 pt-3 -mx-4 md:-mx-8 px-4 md:px-8" style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}>

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
                        ? { boxShadow: "0 0 0 2.5px white, 0 0 0 4.5px #D4C0FF", background: "linear-gradient(135deg, #D4C0FF 0%, #F5E6A3 100%)" }
                        : { background: "linear-gradient(135deg, rgba(240,235,255,0.7) 0%, rgba(224,255,255,0.7) 100%)", border: "2px dashed rgba(167,139,250,0.5)" }
                      }
                    >
                      {user?.avatar ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img loading="lazy" decoding="async" src={user.avatar} alt="moi" className="w-full h-full object-cover rounded-full" />
                          {/* Overlay "+" quand pas encore de story */}
                          {!myGroup && (
                            <div className="absolute inset-0 rounded-full flex items-center justify-center"
                              style={{ background: "rgba(0,0,0,0.38)" }}>
                              <Plus size={20} strokeWidth={2} style={{ color: "white" }} />
                            </div>
                          )}
                        </>
                      ) : myGroup ? (
                        <span className="text-2xl font-semibold" style={{ color: "#2D3748" }}>{(user?.pseudo?.[0] ?? "M").toUpperCase()}</span>
                      ) : (
                        <Plus size={22} strokeWidth={1.5} style={{ color: "#A78BFA" }} />
                      )}
                      {/* Badge count si plusieurs stories */}
                      {myGroup && myGroup.length > 1 && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
                          style={{ background: "linear-gradient(135deg, #D4C0FF, #F5E6A3)", border: "2px solid white", color: "#2D3748" }}>
                          {myGroup.length}
                        </div>
                      )}
                    </motion.div>
                    <span className="text-[10px] font-medium" style={{ color: myGroup ? "#2D3748" : "#A78BFA" }}>
                      Ma story
                    </span>
                  </motion.div>

                  {/* Bouton ajouter une nouvelle story — juste après "Ma story" quand j'en ai déjà une */}
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
                        <Plus size={18} strokeWidth={1.5} style={{ color: "#A78BFA" }} />
                      </motion.div>
                      <span className="text-[10px] font-medium" style={{ color: "#A78BFA" }}>Nouvelle</span>
                    </motion.div>
                  )}

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
                              boxShadow: `0 0 0 2px white, 0 0 0 4px ${(group[0]?.content_type === "photo" || group[0]?.content_type === "video" || group[0]?.content_type === ("image" as string)) ? "#A78BFA" : "#D4C0FF"}`,
                              color: "#2D3748",
                            }}
                          >
                            {/* Show photo thumbnail if first story is a photo */}
                            {(group[0]?.content_type === "photo" || group[0]?.content_type === "video" || group[0]?.content_type === ("image" as string)) && group[0]?.media_url
                              // eslint-disable-next-line @next/next/no-img-element
                              ? <img loading="lazy" decoding="async" src={group[0].media_url} alt={name} className="w-full h-full object-cover" />
                              : p?.avatar_url
                              // eslint-disable-next-line @next/next/no-img-element
                              ? <img loading="lazy" decoding="async" src={p.avatar_url} alt={name} className="w-full h-full object-cover" />
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

                </div>
              );
            })()}
            </div>{/* end stories absolute wrapper */}

            {/* ══════════════════════════════════════════════════════
                TABS + FEED — un seul container partagé 100vw
                Les boutons utilisent paddingRight=66px (sidebar 52 + gap 14)
                pour que leur centre visuel soit aligné avec le centre de la
                colonne vidéo (et non le centre vidéo+sidebar).
            ══════════════════════════════════════════════════════ */}
            <div style={{ width: "100vw", marginLeft: "calc(-50vw + 50%)", ...(feedTab === "videos" ? { flex: "1 1 0", minHeight: 0, display: "flex", flexDirection: "column" } : {}) }}>

              {/* ── Accès flottant (mobile immersif) : Découverte · Recherche · Messages ── */}
              {immersiveVideo && (
                <div className="absolute right-3 z-40 flex items-center gap-2"
                  style={{ top: "calc(env(safe-area-inset-top) + 10px)" }}>
                  <Link href="/decouverte" aria-label="Découvrir des comptes">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center cursor-pointer"
                      style={{ background: "rgba(0,0,0,0.38)", backdropFilter: "blur(6px)" }}>
                      <Compass size={18} strokeWidth={1.9} color="#fff" />
                    </div>
                  </Link>
                  <button onClick={() => setView("search")} aria-label="Rechercher"
                    className="w-9 h-9 rounded-full flex items-center justify-center cursor-pointer"
                    style={{ background: "rgba(0,0,0,0.38)", backdropFilter: "blur(6px)" }}>
                    <Search size={18} strokeWidth={1.9} color="#fff" />
                  </button>
                  <button onClick={() => setView("dms")} aria-label="Messages"
                    className="w-9 h-9 rounded-full flex items-center justify-center cursor-pointer"
                    style={{ background: "rgba(0,0,0,0.38)", backdropFilter: "blur(6px)" }}>
                    <Send size={17} strokeWidth={1.9} color="#fff" />
                  </button>
                </div>
              )}

              {/* ── Flou + dégradé en bas (derrière la barre de navigation) ── */}
              {immersiveVideo && (
                <div className="fixed bottom-0 left-0 right-0 z-20 pointer-events-none"
                  style={{
                    height: "calc(104px + env(safe-area-inset-bottom))",
                    backdropFilter: "blur(12px)",
                    WebkitBackdropFilter: "blur(12px)",
                    background: "linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.2) 55%, transparent 100%)",
                    WebkitMaskImage: "linear-gradient(to top, black 42%, transparent 100%)",
                    maskImage: "linear-gradient(to top, black 42%, transparent 100%)",
                  }} />
              )}


              {/* ── Toggle algo / récents (Posts uniquement) — même cadrage que les tabs ── */}
              {feedTab === "posts" && !feedLoading && (
                <div className="flex items-center justify-center gap-2 py-1"
                  style={{ maxWidth: 560, margin: "0 auto" }}>
                  {(["algo", "amis"] as const).map((mode) => (
                    <motion.button
                      key={mode}
                      whileTap={{ scale: 0.94 }}
                      onClick={() => setFeedMode(mode)}
                      className="py-1.5 rounded-2xl text-xs font-semibold transition-all text-center"
                      style={{
                        width: 105,
                        ...(feedMode === mode
                          ? { background: "linear-gradient(135deg,#A78BFA,#7C5CFA)", color: "#fff", boxShadow: "0 2px 12px rgba(124,92,250,0.35)" }
                          : { background: "rgba(240,235,255,0.5)", color: "#A0AEC0" })
                      }}
                    >
                      {mode === "algo" ? "Pour toi" : "Amis"}
                    </motion.button>
                  ))}
                </div>
              )}

              {/* ── Feed Vidéos TikTok ── */}
              {feedTab === "videos" && (
                <div ref={feedContainerRef} style={{ flex: "1 1 0", minHeight: 0, overflow: "hidden", position: "relative" }}>
                  <TikTokFeed
                    posts={sortedFeedPosts}
                    initialPostId={highlightVideoId}
                    onInitialScrolled={handleInitialScrolled}
                    onHashtagClick={handleHashtagClick}
                    onScrollCollapse={handleScrollCollapse}
                    onActiveIndexChange={handleActiveIndexChange}
                    feedHeight={feedContainerH}
                    onCreatePost={handleCreatePost}
                    onDeletePost={deleteRealPost}
                  />
                </div>
              )}
            </div>

            {/* Posts réels depuis Supabase */}
            {feedTab === "posts" && feedLoading && (
              <div className="flex flex-col gap-4">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className="rounded-3xl overflow-hidden"
                    style={{ background: "rgba(255,255,255,0.85)", border: "1px solid rgba(255,255,255,0.9)", boxShadow: "0 4px 24px rgba(167,139,250,0.08)" }}
                  >
                    {/* Header skeleton */}
                    <div className="flex items-center gap-3 px-4 pt-4 pb-3">
                      <div className="w-9 h-9 rounded-full animate-pulse" style={{ background: "linear-gradient(90deg, rgba(212,192,255,0.3) 25%, rgba(212,192,255,0.5) 50%, rgba(212,192,255,0.3) 75%)", backgroundSize: "200% 100%", animation: "shimmer-x 1.5s infinite" }} />
                      <div className="flex flex-col gap-1.5 flex-1">
                        <div className="h-3 w-24 rounded-full" style={{ background: "linear-gradient(90deg, rgba(212,192,255,0.3) 25%, rgba(212,192,255,0.5) 50%, rgba(212,192,255,0.3) 75%)", backgroundSize: "200% 100%", animation: "shimmer-x 1.5s infinite" }} />
                        <div className="h-2 w-14 rounded-full" style={{ background: "linear-gradient(90deg, rgba(212,192,255,0.2) 25%, rgba(212,192,255,0.35) 50%, rgba(212,192,255,0.2) 75%)", backgroundSize: "200% 100%", animation: "shimmer-x 1.5s infinite 0.1s" }} />
                      </div>
                    </div>
                    {/* Content skeleton */}
                    <div className="px-4 pb-2 flex flex-col gap-2">
                      <div className="h-3 w-3/4 rounded-full" style={{ background: "linear-gradient(90deg, rgba(212,192,255,0.25) 25%, rgba(212,192,255,0.4) 50%, rgba(212,192,255,0.25) 75%)", backgroundSize: "200% 100%", animation: "shimmer-x 1.5s infinite 0.05s" }} />
                      <div className="h-3 w-1/2 rounded-full" style={{ background: "linear-gradient(90deg, rgba(212,192,255,0.2) 25%, rgba(212,192,255,0.35) 50%, rgba(212,192,255,0.2) 75%)", backgroundSize: "200% 100%", animation: "shimmer-x 1.5s infinite 0.1s" }} />
                    </div>
                    {/* Image skeleton */}
                    <div className="mx-4 mb-3 h-48 rounded-2xl" style={{ background: "linear-gradient(90deg, rgba(212,192,255,0.2) 25%, rgba(212,192,255,0.35) 50%, rgba(212,192,255,0.2) 75%)", backgroundSize: "200% 100%", animation: "shimmer-x 1.5s infinite 0.15s" }} />
                    {/* Action bar skeleton */}
                    <div className="flex items-center gap-4 px-4 pb-4">
                      {[20, 20, 20, 20].map((w, j) => (
                        <div key={j} className="h-5 rounded-full" style={{ width: w, background: "linear-gradient(90deg, rgba(212,192,255,0.2) 25%, rgba(212,192,255,0.35) 50%, rgba(212,192,255,0.2) 75%)", backgroundSize: "200% 100%", animation: `shimmer-x 1.5s infinite ${j * 0.05}s` }} />
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {feedTab === "posts" && !feedLoading && sortedFeedPosts.length === 0 && feedMode === "amis" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center py-14 gap-4">
                <div
                  className="w-16 h-16 rounded-3xl flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, rgba(212,192,255,0.3) 0%, rgba(245,230,163,0.25) 100%)", border: "1px solid rgba(167,139,250,0.15)" }}
                >
                  <Heart size={22} strokeWidth={1.3} style={{ color: "#A78BFA" }} />
                </div>
                <div className="text-center px-6">
                  <p className="text-base font-light" style={{ color: "#2D3748" }}>Pas encore de posts d&apos;amis</p>
                  <p className="text-xs font-light mt-1.5 leading-relaxed" style={{ color: "#A0AEC0" }}>
                    Tu verras ici les posts des personnes que tu suis et qui te suivent en retour. Abonne-toi et reste connecté pour remplir ton fil
                  </p>
                </div>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setFeedMode("algo")}
                  className="px-6 py-2.5 rounded-2xl text-[13px] font-semibold cursor-pointer"
                  style={{ background: "linear-gradient(135deg,#D4C0FF 0%,#A78BFA 100%)", color: "#fff", boxShadow: "0 6px 20px rgba(167,139,250,0.3)" }}
                >
                  Découvrir « Pour toi »
                </motion.button>
              </motion.div>
            )}

            {feedTab === "posts" && !feedLoading && sortedFeedPosts.length === 0 && feedMode === "algo" && (
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
                    Sois le premier à partager une performance et inspire la communauté 💪
                  </p>
                </div>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowCreatePost(true)}
                  className="px-6 py-2.5 rounded-2xl text-[13px] font-semibold cursor-pointer"
                  style={{ background: "linear-gradient(135deg,#D4C0FF 0%,#A78BFA 100%)", color: "#fff", boxShadow: "0 6px 20px rgba(167,139,250,0.3)" }}
                >
                  Créer un post
                </motion.button>
              </motion.div>
            )}

            {feedTab === "posts" && !feedLoading && sortedFeedPosts.map((post, postIdx) => {
              const liked = likedRealIds.has(post.id);
              const isMenuOpen = openRealMenu === post.id;
              const isSaved = savedRealIds.has(post.id);
              const isCommentsOpen = openRealComments.has(post.id);
              const likesCount = post.post_likes.length;
              const commentsCount = post.post_comments.length;
              const repostsCount = post.post_reposts?.length ?? 0;
              const savesCount = post.post_saves?.length ?? 0;
              const authorPseudo = post.author?.pseudo ?? "utilisateur";
              const authorAvatar = post.author?.avatar_url;
              const authorCertified = post.author?.is_certified === true || post.author?.is_admin === true;
              const postScore = feedMode === "algo" ? getScore(post) : 0;
              const isHot = feedMode === "algo" && postScore >= 15;

              return (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.4, delay: postIdx * 0.08, ease: [0.25, 0.46, 0.45, 0.94] }}
                  whileHover={{ y: -2, transition: { duration: 0.18 } }}
                  className="lg-surface lg-highlight relative rounded-3xl overflow-visible cv-auto"
                >
                  {/* Header */}
                  <div className="flex items-center gap-3 px-4 pt-4 pb-3 relative">
                    <Link href={`/profil/${encodeURIComponent(authorPseudo)}`} className="flex-shrink-0">
                      <motion.div
                        whileHover={{ scale: 1.1 }}
                        transition={{ type: "spring", bounce: 0.4 }}
                        className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold overflow-hidden"
                        style={{ background: authorAvatar ? "transparent" : "linear-gradient(135deg, #D4C0FF 0%, #F5E6A3 100%)", color: "#2D3748" }}
                      >
                        {authorAvatar
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img loading="lazy" decoding="async" src={authorAvatar} alt={authorPseudo} className="w-full h-full object-cover" />
                          : authorPseudo[0]?.toUpperCase()}
                      </motion.div>
                    </Link>
                    <Link href={`/profil/${encodeURIComponent(authorPseudo)}`} className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: "#2D3748" }}>@{authorPseudo}</p>
                        {authorCertified && (
                          <div className="flex-shrink-0 flex items-center justify-center rounded-full"
                            style={{ width: 16, height: 16, background: "linear-gradient(135deg,#A78BFA,#7C5CFA)", boxShadow: "0 1px 6px rgba(124,92,250,0.4)" }}>
                            <svg width="9" height="9" viewBox="0 0 13 13" fill="none">
                              <path d="M2.5 6.5L5 9L10.5 4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </div>
                        )}
                      </div>
                      <p className="text-[10px]" style={{ color: "#A0AEC0" }}>{postTimeAgo(post.created_at)}</p>
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
                            isOwn={post.user_id === user?.id}
                            canEdit={post.user_id === user?.id}
                            onEdit={() => { setEditingPost({ id: post.id, caption: post.caption ?? "", bio: post.description ?? "" }); setOpenRealMenu(null); }}
                            onSave={() => {
                              setSavedRealIds((p) => { const n = new Set(p); n.has(post.id) ? n.delete(post.id) : n.add(post.id); return n; });
                              showToast(isSaved ? "Retiré des favoris" : "Sauvegardé ✓");
                            }}
                            onHide={() => {
                              setHiddenRealIds((p) => new Set([...p, post.id]));
                              showToast("Post masqué");
                            }}
                            onReport={() => showToast("Signalement envoyé. Merci !")}
                            onDelete={async () => {
                              const ok = await deleteRealPost(post.id);
                              if (ok) setOpenRealMenu(null);
                            }}
                            onClose={() => setOpenRealMenu(null)}
                          />
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Titre — affiché en haut avant la photo */}
                  {post.caption && (
                    <p className="px-4 pb-2 text-sm font-semibold leading-snug" style={{ color: "#2D3748" }}>
                      <CaptionText text={post.caption} onHashtagClick={(tag) => setActiveHashtag(tag)} />
                    </p>
                  )}

                  {/* Media (photo/vidéo) si présente */}
                  {post.media_url && (
                    <div className="mx-4 mb-3 rounded-2xl overflow-hidden">
                      {post.media_type === "video"
                        ? <VideoPlayer src={post.media_url} maxHeight={380} autoPlayOnScroll loop controls={false} />
                        // eslint-disable-next-line @next/next/no-img-element
                        : <img loading="lazy" decoding="async" src={post.media_url} alt="" className="w-full object-cover" style={{ maxHeight: 380 }} />
                      }
                    </div>
                  )}

                  {/* Bio / description — affichée après la photo */}
                  {post.description && (
                    <p className="px-4 pb-2 text-sm font-light leading-relaxed" style={{ color: "#718096" }}>
                      <CaptionText text={post.description} onHashtagClick={(tag) => setActiveHashtag(tag)} />
                    </p>
                  )}

                  {/* Performance Card — seulement si performance_data a un type reconnu */}
                  {post.performance_data && (["workout", "meal", "day"] as const).includes(
                    (post.performance_data as { type?: string }).type as "workout" | "meal" | "day"
                  ) && (
                    <div className="px-4">
                      <PerformanceCard data={post.performance_data} size="md" interactive />
                    </div>
                  )}

                  {/* "Faire cette séance" — visible sur tous les posts workout */}
                  {post.type === "workout" && (() => {
                    const pd = post.performance_data as PerformanceData & { exercise_list?: unknown[]; category?: string };
                    const exList = (Array.isArray(pd?.exercise_list) ? pd.exercise_list : []) as Exercise[];
                    const durMetric = pd?.metrics?.find(m => m.label === "Durée");
                    const dur = durMetric ? parseInt(durMetric.value) || 30 : 30;
                    const builtinId = resolveSessionId(pd?.title ?? "");
                    const hasEmbedded = exList.length > 0;
                    const hasBuiltin  = !!builtinId;
                    const unavailable = !hasEmbedded && !hasBuiltin;
                    return (
                      <div className="px-4 pt-4 pb-1">
                        {unavailable ? (
                          <div className="w-full py-2.5 rounded-2xl flex items-center justify-center gap-2 text-xs"
                            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#4A5568" }}>
                            <Play size={13} strokeWidth={2} style={{ color: "#4A5568" }} />
                            Séance perso — partage les exercices pour la rendre rejouable
                          </div>
                        ) : (
                          <motion.button
                            whileTap={{ scale: 0.97 }}
                            onClick={() => setCommunityWorkout({
                              sessionId:    hasEmbedded ? "community" : builtinId!,
                              title:        pd?.title ?? "Séance",
                              accent:       "#A78BFA",
                              duration:     dur,
                              difficulty:   "Intermédiaire",
                              category:     pd?.category ?? "force",
                              exerciseList: exList,
                            })}
                            className="w-full py-2.5 rounded-2xl flex items-center justify-center gap-2 text-xs font-semibold cursor-pointer"
                            style={{
                              background: "linear-gradient(135deg,rgba(167,139,250,0.15) 0%,rgba(212,192,255,0.1) 100%)",
                              border: "1px solid rgba(167,139,250,0.25)",
                              color: "#A78BFA",
                            }}
                          >
                            <Play size={13} strokeWidth={2} style={{ color: "#A78BFA" }} />
                            Faire cette séance
                          </motion.button>
                        )}
                      </div>
                    );
                  })()}

                  {/* ── Actions ── */}
                  <div className="flex items-center gap-4 px-4 pt-3">
                    {/* Like */}
                    <motion.button
                      whileTap={{ scale: 0.7 }}
                      onClick={() => toggleRealLike(post.id)}
                      className="relative flex items-center cursor-pointer"
                    >
                      {burstRealId === post.id && [0, 1, 2, 3, 4].map((i) => (
                        <motion.div
                          key={`burst-${post.id}-${i}`}
                          className="absolute pointer-events-none"
                          style={{ width: 6, height: 6, borderRadius: "50%", background: i % 2 === 0 ? "#F43F5E" : "#FB7185" }}
                          initial={{ scale: 0, x: 0, y: 0, opacity: 1 }}
                          animate={{ scale: [0, 1.2, 0], x: [0, (i - 2) * 20], y: [0, -22 - i * 4], opacity: [1, 1, 0] }}
                          transition={{ duration: 0.55, delay: i * 0.04 }}
                        />
                      ))}
                      <motion.div animate={liked ? { scale: [1, 1.5, 0.9, 1.15, 1] } : { scale: 1 }} transition={{ duration: 0.5 }}>
                        <Heart size={20} strokeWidth={liked ? 0 : 1.5} fill={liked ? "#F43F5E" : "none"} style={{ color: liked ? "#F43F5E" : "#2D3748" }} />
                      </motion.div>
                    </motion.button>

                    {/* Commentaire */}
                    <motion.button
                      whileHover={{ scale: 1.15 }}
                      whileTap={{ scale: 0.85, rotate: -15 }}
                      onClick={() => setOpenRealComments((p) => { const n = new Set(p); n.has(post.id) ? n.delete(post.id) : n.add(post.id); return n; })}
                      className="flex items-center cursor-pointer"
                      aria-label="Commenter"
                    >
                      <MessageCircle size={20} strokeWidth={1.5}
                        fill={isCommentsOpen ? "rgba(167,139,250,0.2)" : "none"}
                        style={{ color: isCommentsOpen ? "#A78BFA" : "#2D3748" }} />
                    </motion.button>

                    {/* Repartage / Boost */}
                    <motion.button
                      whileHover={{ scale: 1.15 }}
                      whileTap={{ scale: 0.85 }}
                      onClick={() => toggleRepost(post.id)}
                      className="flex items-center cursor-pointer"
                      aria-label="Repartager"
                    >
                      <motion.div animate={repostedRealIds.has(post.id) ? { rotate: [0, 360], scale: [1, 1.3, 1] } : { rotate: 0 }} transition={{ duration: 0.45 }}>
                        <Repeat2 size={20} strokeWidth={1.5} style={{ color: repostedRealIds.has(post.id) ? "#34D399" : "#2D3748" }} />
                      </motion.div>
                    </motion.button>

                    {/* Partager */}
                    <motion.button
                      whileHover={{ scale: 1.15, rotate: 15 }}
                      whileTap={{ scale: 0.85 }}
                      onClick={() => setSharePost({ caption: post.caption, post })}
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

                  {/* Stats */}
                  <div className="px-4 pt-2 pb-3 flex flex-col gap-1.5">
                    {/* Compteurs */}
                    <div className="flex items-center gap-3 flex-wrap">
                      {likesCount > 0 && (
                        <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: liked ? "#F43F5E" : "#718096" }}>
                          <Heart size={12} strokeWidth={liked ? 0 : 1.5} fill={liked ? "#F43F5E" : "none"} style={{ color: liked ? "#F43F5E" : "#718096" }} />
                          {likesCount} j&apos;aime
                        </span>
                      )}
                      {commentsCount > 0 && (
                        <motion.span
                          whileHover={{ color: "#2D3748" }}
                          className="flex items-center gap-1 text-xs cursor-pointer"
                          style={{ color: "#718096" }}
                          onClick={() => setOpenRealComments((p) => { const n = new Set(p); n.has(post.id) ? n.delete(post.id) : n.add(post.id); return n; })}
                        >
                          <MessageCircle size={12} strokeWidth={1.5} />
                          {commentsCount} commentaire{commentsCount > 1 ? "s" : ""}
                        </motion.span>
                      )}
                      {savesCount > 0 && (
                        <span className="flex items-center gap-1 text-xs" style={{ color: isSaved ? "#D4A843" : "#718096" }}>
                          <Bookmark size={12} strokeWidth={1.5} fill={isSaved ? "#F5E6A3" : "none"} style={{ color: isSaved ? "#D4A843" : "#718096" }} />
                          {savesCount} favori{savesCount > 1 ? "s" : ""}
                        </span>
                      )}
                      {repostsCount > 0 && (
                        <span className="flex items-center gap-1 text-xs" style={{ color: repostedRealIds.has(post.id) ? "#34D399" : "#718096" }}>
                          <Repeat2 size={12} strokeWidth={1.5} style={{ color: repostedRealIds.has(post.id) ? "#34D399" : "#718096" }} />
                          {repostsCount} partage{repostsCount > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                    {/* Lien commentaires */}
                    {commentsCount === 0 && (
                      <motion.p
                        whileHover={{ color: "#2D3748" }}
                        className="text-[11px] cursor-pointer"
                        style={{ color: "#A0AEC0" }}
                        onClick={() => setOpenRealComments((p) => { const n = new Set(p); n.has(post.id) ? n.delete(post.id) : n.add(post.id); return n; })}
                      >
                        Ajouter un commentaire
                      </motion.p>
                    )}
                    {isCommentsOpen && commentsCount > 0 && (
                      <motion.p
                        whileHover={{ color: "#2D3748" }}
                        className="text-[11px] cursor-pointer"
                        style={{ color: "#A0AEC0" }}
                        onClick={() => setOpenRealComments((p) => { const n = new Set(p); n.has(post.id) ? n.delete(post.id) : n.add(post.id); return n; })}
                      >
                        Masquer les commentaires
                      </motion.p>
                    )}
                  </div>

                  <AnimatePresence>
                    {isCommentsOpen && (
                      <CommentsSection
                        postId={post.id}
                        initialCount={commentsCount}
                        postOwnerId={post.user_id}
                        onClose={() => setOpenRealComments((p) => { const n = new Set(p); n.delete(post.id); return n; })}
                        onCommentAdded={() => setRealFeedPosts((prev) => prev.map((p) => p.id !== post.id ? p : { ...p, post_comments: [...p.post_comments, { id: `opt-${Date.now()}` }] }))}
                      />
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}

            {/* ── Infinite scroll sentinel ── */}
            {feedTab === "posts" && !feedLoading && (
              <>
                {hasMoreFeed && (
                  <div ref={sentinelRef} className="h-10 flex items-center justify-center">
                    {feedLoadingMore && (
                      <motion.div
                        className="w-5 h-5 rounded-full border-2"
                        style={{ borderColor: "rgba(167,139,250,0.2)", borderTopColor: "#A78BFA" }}
                        animate={{ rotate: 360 }}
                        transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                      />
                    )}
                  </div>
                )}
                {!hasMoreFeed && sortedFeedPosts.length >= 30 && (
                  <p className="text-center text-xs py-5 font-light" style={{ color: "#A0AEC0" }}>
                    🎉 Tu as tout vu !
                  </p>
                )}
              </>
            )}

            {/* ── Floating Action Button : créer un post libre ── */}
            {user && feedTab === "posts" && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", bounce: 0.4, delay: 0.3 }}
                whileHover={{ scale: 1.08, boxShadow: "0 12px 32px rgba(167,139,250,0.45)" }}
                whileTap={{ scale: 0.93 }}
                onClick={() => setShowCreatePost(true)}
                className="fixed bottom-24 right-4 md:bottom-8 md:right-8 z-40 w-14 h-14 rounded-full flex items-center justify-center cursor-pointer"
                style={{
                  background: "linear-gradient(135deg, #A78BFA 0%, #D4C0FF 60%, #F5E6A3 100%)",
                  boxShadow: "0 8px 24px rgba(167,139,250,0.4), inset 0 1px 0 rgba(255,255,255,0.5)",
                }}
                aria-label="Créer un post"
              >
                <PenLine size={22} strokeWidth={1.8} style={{ color: "#2D3748" }} />
              </motion.button>
            )}
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

            {/* ── Trending hashtags (quand search est vide) ── */}
            {!search.trim() && trendingHashtags.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold tracking-widest uppercase mb-2 px-1" style={{ color: "#A0AEC0" }}>
                  Tendances
                </p>
                <div className="flex flex-wrap gap-2">
                  {trendingHashtags.map(({ tag, count }) => (
                    <motion.button
                      key={tag}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setSearch(tag)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer"
                      style={{ background: "linear-gradient(135deg,rgba(167,139,250,0.12),rgba(212,192,255,0.18))", color: "#A78BFA", border: "1px solid rgba(167,139,250,0.2)" }}
                    >
                      {tag}
                      <span className="text-[9px] font-normal opacity-70">{count}</span>
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            {/* Suggestions — comptes à découvrir (quand search est vide) */}
            {!search.trim() && filteredResults.suggestions.length > 0 && searchFilter !== "seances" && (
              <div>
                <p className="text-[10px] font-semibold tracking-widest uppercase mb-2 px-1" style={{ color: "#A0AEC0" }}>
                  Suggestions
                </p>
                <div className="flex flex-col gap-2">
                  {filteredResults.suggestions.map((profile) => {
                    const isF = followingIds.has(profile.id);
                    return (
                      <div key={profile.id} className="lg-surface lg-highlight relative flex items-center gap-3 px-4 py-3 rounded-2xl">
                        <Link href={`/profil/${encodeURIComponent(profile.pseudo)}`} className="flex-shrink-0">
                          <div className="w-11 h-11 rounded-full flex items-center justify-center text-base font-semibold overflow-hidden"
                            style={{ background: profile.avatar_url ? "transparent" : "linear-gradient(135deg,#D4C0FF,#F5E6A3)", color: "#2D3748" }}>
                            {profile.avatar_url
                              // eslint-disable-next-line @next/next/no-img-element
                              ? <img loading="lazy" decoding="async" src={profile.avatar_url} alt={profile.pseudo} className="w-full h-full object-cover" />
                              : (profile.pseudo?.[0] ?? "?").toUpperCase()}
                          </div>
                        </Link>
                        <Link href={`/profil/${encodeURIComponent(profile.pseudo)}`} className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate flex items-center gap-1" style={{ color: "#2D3748" }}>
                            <span className="truncate">{profile.full_name || profile.pseudo}</span>
                            {(profile.is_certified || profile.is_admin) && <BadgeCheck size={13} strokeWidth={2.5} className="flex-shrink-0" style={{ color: "#A78BFA" }} />}
                          </p>
                          <p className="text-[11px]" style={{ color: "#A78BFA" }}>@{profile.pseudo}</p>
                          {profile.bio && <p className="text-[10px] truncate mt-0.5" style={{ color: "#A0AEC0" }}>{profile.bio}</p>}
                        </Link>
                        {user && user.id !== profile.id && (
                          <motion.button
                            whileTap={{ scale: 0.92 }}
                            onClick={() => handleFollowReal(profile)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer flex-shrink-0"
                            style={isF
                              ? { background: "rgba(240,235,255,0.7)", color: "#A78BFA", border: "1px solid rgba(167,139,250,0.2)" }
                              : { background: "linear-gradient(135deg, #D4C0FF 0%, #F5E6A3 100%)", color: "#2D3748", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8)" }
                            }
                          >
                            {isF ? <><UserCheck size={12} strokeWidth={2} /> Suivi</> : <><UserPlus size={12} strokeWidth={2} /> Suivre</>}
                          </motion.button>
                        )}
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
                        <Link href={`/profil/${encodeURIComponent(profile.pseudo)}`} className="flex-shrink-0">
                          <div className="w-11 h-11 rounded-full flex items-center justify-center text-base font-semibold overflow-hidden"
                            style={{ background: profile.avatar_url ? "transparent" : "linear-gradient(135deg,#D4C0FF,#F5E6A3)", color: "#2D3748" }}>
                            {profile.avatar_url
                              // eslint-disable-next-line @next/next/no-img-element
                              ? <img loading="lazy" decoding="async" src={profile.avatar_url} alt={profile.pseudo} className="w-full h-full object-cover" />
                              : (profile.pseudo?.[0] ?? "?").toUpperCase()}
                          </div>
                        </Link>
                        {/* Infos cliquables */}
                        <Link href={`/profil/${encodeURIComponent(profile.pseudo)}`} className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate flex items-center gap-1" style={{ color: "#2D3748" }}>
                            <span className="truncate">{profile.full_name || profile.pseudo}</span>
                            {(profile.is_certified || profile.is_admin) && <BadgeCheck size={13} strokeWidth={2.5} className="flex-shrink-0" style={{ color: "#A78BFA" }} />}
                          </p>
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

            {/* ── Hashtag posts ── */}
            {!searchLoading && filteredResults.hashtagPosts.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold tracking-widest uppercase mb-2 px-1" style={{ color: "#A78BFA" }}>
                  Posts · {filteredResults.hashtagPosts.length} résultat{filteredResults.hashtagPosts.length > 1 ? "s" : ""}
                </p>
                <div className="flex flex-col gap-2">
                  {filteredResults.hashtagPosts.map((p) => {
                    const pseudo = p.author?.pseudo ?? "utilisateur";
                    const avatar = p.author?.avatar_url;
                    return (
                      <motion.button
                        key={p.id}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => { setSearch(""); setView("feed"); }}
                        className="lg-surface lg-highlight relative flex items-start gap-3 px-4 py-3 rounded-2xl text-left cursor-pointer"
                      >
                        <div
                          className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-semibold overflow-hidden mt-0.5"
                          style={{ background: avatar ? "transparent" : "linear-gradient(135deg,#D4C0FF,#F5E6A3)", color: "#2D3748" }}
                        >
                          {avatar
                            // eslint-disable-next-line @next/next/no-img-element
                            ? <img loading="lazy" decoding="async" src={avatar} alt={pseudo} className="w-full h-full object-cover" />
                            : pseudo[0]?.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-semibold" style={{ color: "#A78BFA" }}>@{pseudo}</p>
                          <p className="text-xs font-light line-clamp-2 mt-0.5" style={{ color: "#2D3748" }}>{p.caption || p.description}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px]" style={{ color: "#A0AEC0" }}>{p.post_likes.length} ❤️</span>
                            <span className="text-[10px]" style={{ color: "#A0AEC0" }}>{p.post_comments.length} 💬</span>
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            )}

            {!searchLoading && search.trim() && filteredResults.realProfiles.length === 0 && filteredResults.sessions.length === 0 && filteredResults.hashtagPosts.length === 0 && (
              <div className="text-center py-12">
                <p className="text-sm font-light" style={{ color: "#A0AEC0" }}>
                  Aucun résultat pour « {search} »
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
            {/* En-tête : "Messages" + bouton nouveau DM */}
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: "#A0AEC0" }}>Messages</p>
              <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowNewDM(true)}
                className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer"
                style={{ background: "linear-gradient(135deg, #D4C0FF 0%, #F5E6A3 100%)", boxShadow: "0 2px 8px rgba(167,139,250,0.3), inset 0 1px 0 rgba(255,255,255,0.9)" }}
                aria-label="Nouveau message"
              >
                <Plus size={14} strokeWidth={2.5} style={{ color: "#2D3748" }} />
              </motion.button>
            </div>
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
        {view === "thread" && activeDMPartner && (() => {
          const DM_EMOJIS = ["❤️", "😂", "🔥", "👍", "😮", "😢"];
          return (
            <motion.div
              key="thread"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col flex-1"
              style={{ minHeight: "calc(100dvh - 200px)" }}
              onClick={() => setActiveMessageMenu(null)}
            >
              <div className="flex flex-col gap-1 flex-1 pb-4 overflow-y-auto">
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
                  const showMenu = activeMessageMenu === msg.id;
                  const hasReactions = (msg.reactions ?? []).length > 0;
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ delay: i < 6 ? i * 0.04 : 0, type: "spring", bounce: 0.3 }}
                      className={`flex ${isMe ? "justify-end" : "justify-start"} items-end gap-2 relative`}
                      style={{ marginBottom: hasReactions ? 8 : 0 }}
                    >
                      {!isMe && (
                        <Link href={`/profil/${encodeURIComponent(activeDMPartner.pseudo)}`} className="flex-shrink-0">
                          <motion.div whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}>
                            <ProfileAvatar partner={activeDMPartner} size={28} />
                          </motion.div>
                        </Link>
                      )}
                      <div className="relative">
                        {/* Emoji picker popup */}
                        <AnimatePresence>
                          {showMenu && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.85, y: 6 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.85, y: 6 }}
                              transition={{ type: "spring", bounce: 0.3, duration: 0.2 }}
                              className={`absolute z-50 flex items-center gap-1 px-2 py-1.5 rounded-2xl ${isMe ? "right-0" : "left-0"}`}
                              style={{ bottom: "calc(100% + 6px)", background: "rgba(255,255,255,0.95)", backdropFilter: "blur(20px)", boxShadow: "0 4px 24px rgba(0,0,0,0.12)", border: "1px solid rgba(240,235,255,0.8)" }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {DM_EMOJIS.map(emoji => (
                                <motion.button
                                  key={emoji}
                                  whileHover={{ scale: 1.3 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() => handleDmReaction(msg.id, emoji)}
                                  className="text-lg leading-none p-1 rounded-lg cursor-pointer"
                                  style={{ background: msg.reactions?.find(r => r.emoji === emoji)?.reacted ? "rgba(167,139,250,0.15)" : "transparent" }}
                                >
                                  {emoji}
                                </motion.button>
                              ))}
                              {/* Séparateur + bouton répondre */}
                              <div style={{ width: 1, height: 20, background: "rgba(0,0,0,0.08)", margin: "0 2px" }} />
                              <motion.button
                                whileHover={{ scale: 1.15 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={(e) => { e.stopPropagation(); setReplyingTo(msg); setActiveMessageMenu(null); setTimeout(() => dmInputRef.current?.focus(), 50); }}
                                className="p-1 rounded-lg cursor-pointer text-xs"
                                style={{ color: "#A78BFA", fontWeight: 600 }}
                              >
                                ↩
                              </motion.button>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Bulle */}
                        <motion.div
                          whileTap={{ scale: 0.97 }}
                          onContextMenu={(e) => { e.preventDefault(); setActiveMessageMenu(showMenu ? null : msg.id); }}
                          onClick={(e) => { e.stopPropagation(); setActiveMessageMenu(showMenu ? null : msg.id); }}
                        >
                          {/* Reply preview dans la bulle */}
                          {msg.reply_to_content && (
                            <div
                              className="mb-1 px-3 py-1.5 rounded-xl text-xs truncate max-w-[220px]"
                              style={{ background: isMe ? "rgba(255,255,255,0.35)" : "rgba(167,139,250,0.1)", borderLeft: "2px solid #A78BFA", color: "#718096" }}
                            >
                              {msg.reply_to_content.slice(0, 60)}{msg.reply_to_content.length > 60 ? "…" : ""}
                            </div>
                          )}
                          <div
                            className="rounded-2xl text-sm font-light max-w-[260px] overflow-hidden"
                            style={isMe
                              ? { background: "linear-gradient(135deg, #D4C0FF 0%, #F5E6A3 100%)", color: "#2D3748", borderBottomRightRadius: 6, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8)" }
                              : { background: "rgba(255,255,255,0.7)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.7)", color: "#2D3748", borderBottomLeftRadius: 6 }
                            }
                          >
                            {/* Mini-carte si le message contient un post partagé */}
                            {msg.shared_post ? (
                              <div>
                                {msg.shared_post.media_url && (
                                  // Clic → ouvre l'onglet Vidéos et scrolle sur ce post
                                  <div
                                    className="relative cursor-pointer"
                                    style={{ height: 160, background: "#000" }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (msg.post_id) {
                                        setHighlightVideoId(msg.post_id);
                                        setFeedTab("videos");
                                        setView("feed");
                                      }
                                    }}
                                  >
                                    {msg.shared_post.media_type === "video"
                                      ? <video
                                          src={msg.shared_post.media_url}
                                          className="w-full h-full object-cover"
                                          muted playsInline
                                          style={{ maxHeight: 160, pointerEvents: "none" }}
                                        />
                                      // eslint-disable-next-line @next/next/no-img-element
                                      : <img loading="lazy" decoding="async" src={msg.shared_post.media_url} alt="" className="w-full h-full object-cover" />
                                    }
                                    {/* Overlay play */}
                                    <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.25)" }}>
                                      <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(6px)" }}>
                                        <svg width="12" height="14" viewBox="0 0 12 14" fill="white"><path d="M1 1l10 6L1 13V1z"/></svg>
                                      </div>
                                    </div>
                                  </div>
                                )}
                                {/* Caption — affiché UNE seule fois depuis shared_post */}
                                {msg.shared_post.caption && (
                                  <div className="px-3 py-2">
                                    <p className="text-xs font-light line-clamp-2" style={{ color: "#2D3748" }}>
                                      {msg.shared_post.caption}
                                    </p>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="px-4 py-2.5">{msg.content}</div>
                            )}
                          </div>
                        </motion.div>

                        {/* Réactions */}
                        {hasReactions && (
                          <div className={`flex gap-1 mt-1 flex-wrap ${isMe ? "justify-end" : "justify-start"}`}>
                            {(msg.reactions ?? []).map(r => (
                              <motion.button
                                key={r.emoji}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => handleDmReaction(msg.id, r.emoji)}
                                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs cursor-pointer"
                                style={{ background: r.reacted ? "rgba(167,139,250,0.2)" : "rgba(0,0,0,0.05)", border: r.reacted ? "1px solid rgba(167,139,250,0.4)" : "1px solid transparent", color: "#4A5568" }}
                              >
                                <span>{r.emoji}</span>
                                {r.count > 1 && <span style={{ fontSize: 10, color: "#718096" }}>{r.count}</span>}
                              </motion.button>
                            ))}
                          </div>
                        )}

                        <div className={`flex items-center gap-0.5 mt-1 ${isMe ? "justify-end" : ""}`}>
                          <span className="text-[9px]" style={{ color: "#A0AEC0" }}>{timeStr}</span>
                          {isMe && (
                            <span
                              className="text-[9px] font-bold"
                              style={{ color: msg.read_at ? "#A78BFA" : "#C4C9D4", lineHeight: 1 }}
                              title={msg.read_at ? "Lu" : "Envoyé"}
                            >
                              {msg.read_at ? "✓✓" : "✓"}
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply bar */}
              <AnimatePresence>
                {replyingTo && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl mb-2"
                    style={{ background: "rgba(167,139,250,0.08)", borderLeft: "3px solid #A78BFA" }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-semibold" style={{ color: "#A78BFA" }}>
                        {replyingTo.sender_id === user?.id ? "Toi" : `@${activeDMPartner.pseudo}`}
                      </p>
                      <p className="text-xs font-light truncate" style={{ color: "#718096" }}>
                        {replyingTo.content.slice(0, 60)}{replyingTo.content.length > 60 ? "…" : ""}
                      </p>
                    </div>
                    <motion.button whileTap={{ scale: 0.9 }} onClick={() => setReplyingTo(null)} className="flex-shrink-0 cursor-pointer" style={{ color: "#A0AEC0" }}>
                      <X size={14} />
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="lg-strong lg-highlight relative flex items-center gap-2 p-2.5 rounded-2xl mt-auto">
                <input
                  ref={dmInputRef}
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
          );
        })()}
      </AnimatePresence>

      {/* Hashtag Videos Modal (plein écran, depuis onglet vidéos) */}
      <AnimatePresence>
        {hashtagVideosTag && (
          <HashtagVideosModal
            tag={hashtagVideosTag}
            onClose={() => setHashtagVideosTag(null)}
            onOpenVideo={(postId) => {
              setHashtagVideosTag(null);
              setFeedTab("videos");
              setHighlightVideoId(postId);
            }}
          />
        )}
      </AnimatePresence>

      {/* Hashtag bottom sheet (depuis onglet publications) */}
      <AnimatePresence>
        {activeHashtag && (
          <HashtagSheet
            tag={activeHashtag}
            currentUserId={user?.id ?? null}
            onClose={() => setActiveHashtag(null)}
          />
        )}
      </AnimatePresence>

      {/* Global Modals */}
      <AnimatePresence>
        {sharePost && (
          <ShareModal
            postCaption={sharePost.caption}
            onClose={() => setSharePost(null)}
            onShareDM={() => { if (sharePost.post) setShareToDMPost(sharePost.post); }}
          />
        )}
        {shareToDMPost && (
          <ShareToDMModal
            post={shareToDMPost}
            onClose={() => setShareToDMPost(null)}
            onSent={(partner) => {
              setActiveDMPartner(partner);
              setDmMessages([]);
              setView("thread");
              showToast(`Post envoyé à @${partner.pseudo} !`);
            }}
          />
        )}
        {showNewDM && (
          <NewDMModal
            onClose={() => setShowNewDM(false)}
            onStartThread={(partner) => {
              setActiveDMPartner(partner);
              setDmMessages([]);
              setView("thread");
            }}
          />
        )}
        {showAddStory && (
          <AddStoryModal
            onClose={() => setShowAddStory(false)}
            userId={user?.id ?? null}
            onPublished={() => { loadStories(); }}
          />
        )}
        {showCreatePost && (
          <CreatePostModal
            onClose={() => setShowCreatePost(false)}
            onSuccess={() => {
              loadFeed();
              showToast("Post publié ✓");
            }}
            suggestedTags={trendingHashtags.map((h) => h.tag)}
          />
        )}
        {storyGroup && <StoryViewer stories={storyGroup} onClose={() => setStoryGroup(null)} />}

        {/* Edit post modal */}
        {editingPost && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
            style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)" }}
            onClick={() => setEditingPost(null)}
          >
            <motion.div
              initial={{ y: 80, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 80, opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", bounce: 0.25 }}
              className="w-full max-w-md rounded-t-3xl md:rounded-3xl p-6 flex flex-col gap-4"
              style={{
                background: "rgba(255,255,255,0.97)",
                boxShadow: "0 -8px 40px rgba(167,139,250,0.25)",
                border: "1px solid rgba(255,255,255,0.9)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black" style={{ color: "#2D3748" }}>Modifier le post</h3>
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => setEditingPost(null)}>
                  <X size={18} strokeWidth={2} style={{ color: "#A0AEC0" }} />
                </motion.button>
              </div>

              {/* Titre */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold tracking-widest uppercase" style={{ color: "#A0AEC0" }}>Titre</label>
                <input
                  type="text"
                  value={editingPost.caption}
                  onChange={(e) => setEditingPost((p) => p ? { ...p, caption: e.target.value } : p)}
                  maxLength={200}
                  className="w-full rounded-2xl px-4 py-3 text-sm outline-none"
                  style={{
                    background: "rgba(240,235,255,0.5)",
                    border: "1px solid rgba(212,192,255,0.6)",
                    color: "#2D3748",
                  }}
                  placeholder="Titre du post..."
                  autoFocus
                />
              </div>

              {/* Bio / description */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold tracking-widest uppercase" style={{ color: "#A0AEC0" }}>Bio</label>
                <textarea
                  value={editingPost.bio ?? ""}
                  onChange={(e) => setEditingPost((p) => p ? { ...p, bio: e.target.value } : p)}
                  rows={3}
                  maxLength={500}
                  className="w-full resize-none rounded-2xl px-4 py-3 text-sm outline-none leading-relaxed"
                  style={{
                    background: "rgba(240,235,255,0.5)",
                    border: "1px solid rgba(212,192,255,0.6)",
                    color: "#2D3748",
                  }}
                  placeholder="Description du post..."
                />
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={async () => {
                  const supabase = createClient();
                  const newCaption = editingPost.caption.trim();
                  const newBio = (editingPost.bio ?? "").trim() || null;

                  // 1. Update caption (always works)
                  const { error: captionErr } = await supabase
                    .from("posts")
                    .update({ caption: newCaption })
                    .eq("id", editingPost.id);

                  if (captionErr) {
                    showToast("Erreur lors de la sauvegarde");
                    return;
                  }

                  // 2. Update description separately (nécessite la migration SQL)
                  await supabase
                    .from("posts")
                    .update({ description: newBio })
                    .eq("id", editingPost.id);

                  // Mise à jour du feed en local
                  setRealFeedPosts((prev) =>
                    prev.map((p) => p.id === editingPost.id
                      ? { ...p, caption: newCaption, description: newBio }
                      : p)
                  );
                  showToast("Post modifié ✓");
                  setEditingPost(null);
                }}
                className="w-full py-3 rounded-2xl text-sm font-bold"
                style={{
                  background: "linear-gradient(135deg,#D4C0FF 0%,#F5E6A3 100%)",
                  color: "#3D2F6B",
                  boxShadow: "0 4px 16px rgba(167,139,250,0.3)",
                }}
              >
                Sauvegarder
              </motion.button>
            </motion.div>
          </motion.div>
        )}

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
        {/* Workout guide launched from a community post */}
        {communityWorkout && (
          <WorkoutGuideModal
            sessionId={communityWorkout.sessionId}
            title={communityWorkout.title}
            accent={communityWorkout.accent}
            duration={communityWorkout.duration}
            difficulty={communityWorkout.difficulty}
            category={communityWorkout.category}
            exerciseList={communityWorkout.exerciseList}
            onClose={() => setCommunityWorkout(null)}
          />
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}

export default function CommunautePage() {
  return <Suspense fallback={null}><CommunautePageInner /></Suspense>;
}
