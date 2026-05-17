"use client";

import { useState, useMemo, useRef, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Heart, MessageCircle, Share2, Send, Plus, ArrowLeft, BadgeCheck, UserPlus, UserCheck, MoreHorizontal, X, Camera, Check, Bookmark, Flag, EyeOff, Dumbbell, Compass, PenLine, Pencil, Repeat2, Play } from "lucide-react";
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
  profiles: { pseudo: string; full_name: string | null; avatar_url: string | null } | null;
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
  created_at: string;
  author: { pseudo: string; full_name?: string; avatar_url?: string; is_admin?: boolean } | null;
  post_likes: { user_id: string }[];
  post_comments: { id: string }[];
  post_reposts: { user_id: string }[];
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
        <img src={partner.avatar_url} alt={partner.pseudo} style={{ width: size, height: size, objectFit: "cover" }} />
      ) : initial}
    </div>
  );
}

// ── helpers pour le contenu d'une story ──────────────────────
function StoryCard({ story }: { story: RealStory }) {
  const d = story.content_data ?? {};

  // Photo ou vidéo — full screen dans le viewer
  if ((story.content_type === "photo" || story.content_type === "video") && story.media_url) {
    return (
      <motion.div
        key={story.id}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0"
        style={{ background: "#000" }}
      >
        {story.content_type === "video"
          ? <video src={story.media_url} className="w-full h-full object-cover" muted playsInline autoPlay loop />
          // eslint-disable-next-line @next/next/no-img-element
          : <img src={story.media_url} alt="" className="w-full h-full object-cover" />}
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
      style={{ background: "linear-gradient(160deg, #1A0A35 0%, #3D2F6B 60%, #2D1F50 100%)" }}
    >
      <div className="text-7xl mb-5">{(d.emoji as string) ?? "✨"}</div>
      <p className="text-2xl font-semibold leading-snug text-white">{(d.text as string) ?? (story.caption ?? "")}</p>
      {story.caption && story.caption !== (d.text as string) && (
        <p className="text-sm font-light mt-4" style={{ color: "rgba(212,192,255,0.7)" }}>{story.caption}</p>
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
    if (e) { setError(e.message); setStep("meal-input"); return; }
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
    setMediaPreview(URL.createObjectURL(file));
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
      if (uploadErr) { setError(uploadErr.message); setStep("photo-preview"); return; }
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      const mediaUrl = urlData.publicUrl + "?t=" + Date.now();
      const { data: inserted, error: e } = await supabase.from("stories").insert({
        user_id:      userId,
        content_type: mediaType,
        content_data: null,
        caption:      caption.trim() || null,
        media_url:    mediaUrl,
        media_type:   mediaType,
      }).select("id").single();
      if (e) { setError(e.message); setStep("photo-preview"); return; }
      setPublishedStoryId(inserted?.id ?? null);
      setPublishedMediaUrl(mediaUrl);
      setStep("success");
      onPublished();
    } catch (err) {
      setError(String(err));
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
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => { setStep("pick"); setMediaPreview(null); setMediaFile(null); }} className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer" style={{ background: "rgba(240,235,255,0.8)" }}>
                  <ArrowLeft size={14} strokeWidth={2} style={{ color: "#A0AEC0" }} />
                </motion.button>
                <h2 className="text-base font-light flex-1" style={{ color: "#2D3748" }}>Aperçu de ta story</h2>
              </div>

              <div className="rounded-2xl overflow-hidden mb-4" style={{ aspectRatio: "9/16", maxHeight: 280, background: "#000" }}>
                {mediaType === "video"
                  ? <video src={mediaPreview} className="w-full h-full object-cover" muted playsInline autoPlay loop />
                  // eslint-disable-next-line @next/next/no-img-element
                  : <img src={mediaPreview} alt="" className="w-full h-full object-cover" />}
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

// Share Modal
function ShareModal({ postCaption, onClose, onShareDM }: { postCaption?: string; onClose: () => void; onShareDM?: () => void }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    navigator.clipboard.writeText(url).catch(() => {});
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
          backdropFilter: "blur(12px)",
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
            { label: "DM", emoji: "💬", color: "linear-gradient(135deg, #D4C0FF 0%, #A78BFA 100%)", action: () => { onClose(); onShareDM?.(); } },
            { label: "Story", emoji: "✨", color: "linear-gradient(135deg, #F5E6A3 0%, #D4A843 100%)", action: onClose },
            { label: "Copier", emoji: copied ? "✓" : "🔗", color: "linear-gradient(135deg, #F0EBFF 0%, #FFFBF0 100%)", action: handleCopy },
            { label: "Aura", emoji: "✦", color: "linear-gradient(135deg, #D4C0FF 0%, #F5E6A3 100%)", action: onClose },
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
    </motion.div>
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
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 120); }, []);

  useEffect(() => {
    if (!search.trim()) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      const supabase = createClient();
      const { data } = await supabase.from("profiles").select("id, pseudo, full_name, avatar_url").ilike("pseudo", `%${search.trim()}%`).limit(10);
      setResults((data as DMPartner[]) ?? []);
      setLoading(false);
    }, 280);
    return () => clearTimeout(timer);
  }, [search]);

  const sendPost = async (partner: DMPartner) => {
    if (!user || sending) return;
    setSending(partner.id);
    const supabase = createClient();
    const title = post.performance_data?.title ?? "Performance";
    const msg = `[Post partagé] ${title}${post.caption ? ` — ${post.caption.slice(0, 80)}` : ""}`;
    await supabase.from("direct_messages").insert({ sender_id: user.id, receiver_id: partner.id, content: msg });
    setSending(null);
    onSent(partner);
    onClose();
  };

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
          {results.length === 0 && !search.trim() && (
            <p className="text-center text-xs py-5 font-light" style={{ color: "#C4C9D4" }}>Recherche un destinataire par pseudo</p>
          )}
          {results.length === 0 && search.trim() && !loading && (
            <p className="text-center text-xs py-5 font-light" style={{ color: "#A0AEC0" }}>Aucun résultat</p>
          )}
          {results.map((r) => (
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

// Comments Section (inline)
type RealComment = {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  author: { pseudo: string; avatar_url?: string | null } | null;
};

function CommentsSection({ postId, initialCount, onClose, onCommentAdded, postOwnerId }: { postId: string | number; initialCount: number; onClose: () => void; onCommentAdded?: () => void; postOwnerId?: string }) {
  const { user } = useAuth();
  const [comments, setComments]   = useState<RealComment[]>([]);
  const [loading, setLoading]     = useState(true);
  const [input, setInput]         = useState("");
  const [sending, setSending]     = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Charger les vrais commentaires
  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("post_comments")
      .select("id, content, created_at, user_id, author:profiles!user_id(pseudo, avatar_url)")
      .eq("post_id", String(postId))
      .order("created_at", { ascending: true })
      .limit(50)
      .then(({ data }) => {
        setComments((data as unknown as RealComment[]) ?? []);
        setLoading(false);
        setTimeout(() => inputRef.current?.focus(), 100);
      });
  }, [postId]);

  const handleSend = async () => {
    if (!input.trim() || !user || sending) return;
    const content = input.trim();
    setInput("");
    setSending(true);

    // Optimiste
    const tmpId = `tmp-${Date.now()}`;
    const optimistic: RealComment = {
      id: tmpId,
      content,
      created_at: new Date().toISOString(),
      user_id: user.id,
      author: { pseudo: user.pseudo, avatar_url: user.avatar ?? null },
    };
    setComments((prev) => [...prev, optimistic]);

    const supabase = createClient();
    // Insert seul (sans select chainé pour éviter les erreurs de join)
    const { error } = await supabase
      .from("post_comments")
      .insert({ post_id: String(postId), user_id: user.id, content });

    setSending(false);
    if (error) {
      setComments((prev) => prev.filter((c) => c.id !== tmpId));
      setInput(content);
      console.error("[CommentsSection] insert error:", error);
    } else {
      onCommentAdded?.();
      // Notif au propriétaire du post
      if (postOwnerId && postOwnerId !== user.id) {
        void supabase.from("notifications").insert({
          user_id: postOwnerId, from_user_id: user.id,
          from_pseudo: user.pseudo, from_avatar_url: user.avatar ?? null,
          type: "comment", post_id: String(postId),
        });
        fetch("/api/notifications/comment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ commenter_id: user.id, post_owner_id: postOwnerId, post_id: String(postId), comment_preview: content }),
        }).catch(() => {});
      }
    }
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

        {/* Liste */}
        <div className="flex flex-col gap-2.5 mb-3 max-h-52 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-3">
              <motion.div
                className="w-4 h-4 rounded-full border-2"
                style={{ borderColor: "rgba(167,139,250,0.2)", borderTopColor: "#A78BFA" }}
                animate={{ rotate: 360 }}
                transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
              />
            </div>
          ) : comments.length === 0 ? (
            <p className="text-xs text-center py-2" style={{ color: "#A0AEC0" }}>
              Sois le premier à commenter
            </p>
          ) : (
            comments.map((c, i) => {
              const pseudo  = c.author?.pseudo ?? "inconnu";
              const avatar  = c.author?.avatar_url;
              const timeStr = postTimeAgo(c.created_at);
              return (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i < 5 ? i * 0.04 : 0 }}
                  className="flex items-start gap-2"
                >
                  <Link href={`/profil/${pseudo}`} className="flex-shrink-0">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold overflow-hidden"
                      style={{ background: avatar ? "transparent" : "linear-gradient(135deg,#D4C0FF,#F5E6A3)", color: "#2D3748" }}
                    >
                      {avatar
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={avatar} alt={pseudo} className="w-full h-full object-cover" />
                        : pseudo[0]?.toUpperCase()}
                    </div>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs leading-relaxed" style={{ color: "#2D3748" }}>
                      <Link href={`/profil/${pseudo}`}>
                        <span className="font-semibold mr-1.5 hover:underline">{pseudo}</span>
                      </Link>
                      <span className="font-light">{c.content}</span>
                    </p>
                    <p className="text-[10px] mt-0.5" style={{ color: "#A0AEC0" }}>{timeStr}</p>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

        {/* Saisie */}
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
            placeholder={user ? "Ajouter un commentaire…" : "Connecte-toi pour commenter"}
            disabled={!user}
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
            disabled={!input.trim() || !user || sending}
            className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer flex-shrink-0"
            style={{
              background: input.trim() && user ? "linear-gradient(135deg, #D4C0FF 0%, #F5E6A3 100%)" : "rgba(240,235,255,0.5)",
              transition: "background 0.2s",
            }}
          >
            <Send size={12} strokeWidth={2} style={{ color: input.trim() && user ? "#2D3748" : "#A0AEC0" }} />
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

/* ─── TikTok Video Feed ─────────────────────────────────── */

// Panel commentaires style vidéo (overlay sombre slide-up)
function VideoCommentsPanel({ postId, postOwnerId, commentCount, onClose, onCommentAdded }: {
  postId: string; postOwnerId: string; commentCount: number;
  onClose: () => void; onCommentAdded: () => void;
}) {
  return (
    <motion.div
      initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 32, stiffness: 320 }}
      className="absolute inset-x-0 bottom-0 z-50 rounded-t-3xl overflow-hidden flex flex-col"
      style={{ background: "rgba(18,12,30,0.97)", backdropFilter: "blur(20px)", maxHeight: "72%", minHeight: 320 }}
      onClick={e => e.stopPropagation()}
    >
      {/* Poignée */}
      <div className="flex justify-center pt-3 pb-2 flex-shrink-0">
        <div className="w-10 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.25)" }} />
      </div>
      <div className="px-4 pb-3 flex items-center justify-between flex-shrink-0">
        <p className="text-white text-sm font-semibold">{commentCount} commentaire{commentCount !== 1 ? "s" : ""}</p>
        <motion.button whileTap={{ scale: 0.9 }} onClick={onClose}
          className="w-7 h-7 rounded-full flex items-center justify-center"
          style={{ background: "rgba(255,255,255,0.1)" }}>
          <X size={13} strokeWidth={2} style={{ color: "rgba(255,255,255,0.7)" }} />
        </motion.button>
      </div>

      {/* Contenu commentaires */}
      <div className="flex-1 overflow-hidden">
        <VideoCommentsList postId={postId} postOwnerId={postOwnerId} onCommentAdded={onCommentAdded} />
      </div>
    </motion.div>
  );
}

function VideoCommentsList({ postId, postOwnerId, onCommentAdded }: { postId: string; postOwnerId: string; onCommentAdded: () => void }) {
  const { user } = useAuth();
  type RealComment = { id: string; content: string; created_at: string; user_id: string; author: { pseudo: string; avatar_url?: string | null } | null };
  const [comments, setComments] = useState<RealComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.from("post_comments")
      .select("id, content, created_at, user_id, author:profiles!user_id(pseudo, avatar_url)")
      .eq("post_id", postId).order("created_at", { ascending: true }).limit(80)
      .then(({ data }) => { setComments((data as unknown as RealComment[]) ?? []); setLoading(false); });
  }, [postId]);

  const handleSend = async () => {
    if (!input.trim() || !user || sending) return;
    const content = input.trim();
    setInput(""); setSending(true);
    const tmpId = `tmp-${Date.now()}`;
    setComments(prev => [...prev, { id: tmpId, content, created_at: new Date().toISOString(), user_id: user.id, author: { pseudo: user.pseudo, avatar_url: user.avatar ?? null } }]);
    const supabase = createClient();
    const { error } = await supabase.from("post_comments").insert({ post_id: postId, user_id: user.id, content });
    setSending(false);
    if (error) { setComments(prev => prev.filter(c => c.id !== tmpId)); setInput(content); }
    else {
      onCommentAdded();
      if (postOwnerId && postOwnerId !== user.id) {
        void supabase.from("notifications").insert({ user_id: postOwnerId, from_user_id: user.id, from_pseudo: user.pseudo, from_avatar_url: user.avatar ?? null, type: "comment", post_id: postId });
      }
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 py-2 flex flex-col gap-3" style={{ scrollbarWidth: "none" }}>
        {loading ? (
          <div className="flex justify-center py-6">
            <motion.div className="w-5 h-5 rounded-full border-2" style={{ borderColor: "rgba(167,139,250,0.2)", borderTopColor: "#A78BFA" }} animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} />
          </div>
        ) : comments.length === 0 ? (
          <p className="text-center text-sm py-8" style={{ color: "rgba(255,255,255,0.35)" }}>Sois le premier à commenter</p>
        ) : (
          comments.map((c, i) => {
            const pseudo = c.author?.pseudo ?? "inconnu";
            const avatar = c.author?.avatar_url;
            const diff = Date.now() - new Date(c.created_at).getTime();
            const m = Math.floor(diff / 60000);
            const timeStr = m < 1 ? "À l'instant" : m < 60 ? `${m}min` : m < 1440 ? `${Math.floor(m/60)}h` : `${Math.floor(m/1440)}j`;
            return (
              <motion.div key={c.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i < 5 ? i * 0.04 : 0 }} className="flex items-start gap-2.5">
                <Link href={`/profil/${pseudo}`} className="flex-shrink-0">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold overflow-hidden"
                    style={{ background: avatar ? "transparent" : "linear-gradient(135deg,#D4C0FF,#F5E6A3)", color: "#2D3748" }}>
                    {avatar
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={avatar} alt={pseudo} className="w-full h-full object-cover" />
                      : pseudo[0]?.toUpperCase()}
                  </div>
                </Link>
                <div className="flex-1 min-w-0">
                  <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.9)" }}>
                    <span className="font-semibold mr-1.5" style={{ color: "#D4C0FF" }}>{pseudo}</span>
                    <span className="font-light">{c.content}</span>
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>{timeStr}</p>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
      {/* Input */}
      <div className="flex-shrink-0 px-4 pb-5 pt-3 flex items-center gap-2.5" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden"
          style={{ background: user?.avatar ? "transparent" : "linear-gradient(135deg,#D4C0FF,#F5E6A3)" }}>
          {user?.avatar
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={user.avatar} alt="" className="w-full h-full object-cover" />
            : <span className="text-[10px] font-bold" style={{ color: "#2D3748" }}>{user?.pseudo?.[0]?.toUpperCase() ?? "?"}</span>}
        </div>
        <input ref={inputRef} type="text" value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") handleSend(); }}
          placeholder={user ? "Ajouter un commentaire…" : "Connecte-toi pour commenter"}
          disabled={!user}
          className="flex-1 text-sm outline-none px-3 py-2.5 rounded-2xl"
          style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", color: "#fff" }} />
        <motion.button whileTap={{ scale: 0.9 }} onClick={handleSend} disabled={!input.trim() || !user || sending}
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 cursor-pointer"
          style={{ background: input.trim() && user ? "linear-gradient(135deg,#D4C0FF,#F5E6A3)" : "rgba(255,255,255,0.08)" }}>
          <Send size={13} strokeWidth={2} style={{ color: input.trim() && user ? "#2D3748" : "rgba(255,255,255,0.3)" }} />
        </motion.button>
      </div>
    </div>
  );
}

// Panel paramètres vidéo (vitesse, sous-titres, signaler)
function VideoSettingsPanel({ onClose, onSpeedChange, speed, captionsOn, onToggleCaptions, onReport }: {
  onClose: () => void; onSpeedChange: (s: number) => void;
  speed: number; captionsOn: boolean; onToggleCaptions: () => void; onReport: () => void;
}) {
  const speeds = [0.25, 0.5, 1, 1.5, 2];
  return (
    <motion.div
      initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 32, stiffness: 320 }}
      className="absolute inset-x-0 bottom-0 z-50 rounded-t-3xl pb-8"
      style={{ background: "rgba(18,12,30,0.97)", backdropFilter: "blur(20px)" }}
      onClick={e => e.stopPropagation()}
    >
      <div className="flex justify-center pt-3 pb-4">
        <div className="w-10 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.25)" }} />
      </div>
      <div className="px-5">
        <p className="text-white text-sm font-semibold mb-4">Paramètres vidéo</p>
        {/* Vitesse */}
        <div className="mb-5">
          <p className="text-[11px] font-semibold tracking-widest uppercase mb-3" style={{ color: "rgba(212,192,255,0.6)" }}>Vitesse de lecture</p>
          <div className="flex gap-2">
            {speeds.map(s => (
              <motion.button key={s} whileTap={{ scale: 0.93 }} onClick={() => onSpeedChange(s)}
                className="flex-1 py-2.5 rounded-2xl text-xs font-bold cursor-pointer"
                style={speed === s
                  ? { background: "linear-gradient(135deg,#D4C0FF,#F5E6A3)", color: "#2D3748", boxShadow: "0 2px 12px rgba(167,139,250,0.4)" }
                  : { background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)" }}>
                {s === 1 ? "×1" : `×${s}`}
              </motion.button>
            ))}
          </div>
        </div>
        {/* Sous-titres */}
        <motion.button whileTap={{ scale: 0.97 }} onClick={onToggleCaptions}
          className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl mb-2 cursor-pointer"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="flex items-center gap-3">
            <span className="text-lg">CC</span>
            <div>
              <p className="text-sm font-medium text-left" style={{ color: "#fff" }}>Sous-titres</p>
              <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>{captionsOn ? "Activés" : "Désactivés"}</p>
            </div>
          </div>
          <div className="w-11 h-6 rounded-full flex items-center px-1 transition-all" style={{ background: captionsOn ? "linear-gradient(135deg,#D4C0FF,#A78BFA)" : "rgba(255,255,255,0.15)" }}>
            <motion.div className="w-4 h-4 rounded-full bg-white" animate={{ x: captionsOn ? 20 : 0 }} transition={{ type: "spring", stiffness: 500, damping: 30 }} />
          </div>
        </motion.button>
        {/* Signaler */}
        <motion.button whileTap={{ scale: 0.97 }} onClick={onReport}
          className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl mt-2 cursor-pointer"
          style={{ background: "rgba(252,129,129,0.08)", border: "1px solid rgba(252,129,129,0.15)" }}>
          <Flag size={16} strokeWidth={1.5} style={{ color: "#FC8181" }} />
          <p className="text-sm font-medium" style={{ color: "#FC8181" }}>Signaler cette vidéo</p>
        </motion.button>
        {/* Fermer */}
        <motion.button whileTap={{ scale: 0.97 }} onClick={onClose}
          className="w-full py-3 mt-3 rounded-2xl text-sm font-medium cursor-pointer"
          style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}>
          Fermer
        </motion.button>
      </div>
    </motion.div>
  );
}

function VideoCard({ post, isActive }: { post: RealPost; isActive: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { user } = useAuth();

  // Interaction state
  const [liked, setLiked] = useState(() => post.post_likes?.some(l => l.user_id === (user?.id ?? "")) ?? false);
  const [likes, setLikes] = useState(post.post_likes?.length ?? 0);
  const [saved, setSaved] = useState(false);
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
  const [doubleTapHeart, setDoubleTapHeart] = useState(false);

  // Double-tap to like
  const lastTapRef = useRef(0);

  const authorPseudo = post.author?.pseudo ?? "utilisateur";
  const authorAvatar = post.author?.avatar_url;
  const authorCertified = post.author?.is_admin === true;

  // Play/pause on isActive
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isActive) {
      video.currentTime = 0;
      void video.play().catch(() => {});
      setPaused(false);
    } else {
      video.pause();
    }
  }, [isActive]);

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
      if (video.paused) { void video.play().catch(() => {}); setPaused(false); }
      else { video.pause(); setPaused(true); }
    }
    lastTapRef.current = now;
  };

  const triggerLike = async () => {
    if (!user) return;
    if (!liked) {
      setLiked(true); setLikes(l => l + 1);
      const supabase = createClient();
      await supabase.from("post_likes").upsert({ post_id: post.id, user_id: user.id }, { ignoreDuplicates: true });
      if (post.user_id !== user.id) {
        void supabase.from("notifications").insert({ user_id: post.user_id, from_user_id: user.id, from_pseudo: user.pseudo, from_avatar_url: user.avatar ?? null, type: "like", post_id: post.id });
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
      await supabase.from("post_likes").upsert({ post_id: post.id, user_id: user.id }, { ignoreDuplicates: true });
      if (post.user_id !== user.id) {
        const supabase2 = createClient();
        void supabase2.from("notifications").insert({ user_id: post.user_id, from_user_id: user.id, from_pseudo: user.pseudo, from_avatar_url: user.avatar ?? null, type: "like", post_id: post.id });
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
      await supabase.from("post_reposts").upsert({ post_id: post.id, user_id: user.id }, { ignoreDuplicates: true });
      if (post.user_id !== user.id) {
        void supabase.from("notifications").insert({ user_id: post.user_id, from_user_id: user.id, from_pseudo: user.pseudo, from_avatar_url: user.avatar ?? null, type: "repost", post_id: post.id });
      }
    }
  };

  const toggleFollow = async () => {
    if (!user || post.user_id === user.id) return;
    const supabase = createClient();
    if (following) {
      setFollowing(false);
      await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", post.user_id);
    } else {
      setFollowing(true);
      await supabase.from("follows").upsert({ follower_id: user.id, following_id: post.user_id }, { ignoreDuplicates: true });
    }
  };

  const handleShare = () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    navigator.clipboard.writeText(url).catch(() => {});
  };

  const handleReport = () => {
    setReported(true);
    setShowSettings(false);
  };

  const fmtCount = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`;

  return (
    <div className="w-full h-full flex items-center justify-center select-none relative overflow-hidden" style={{ background: "#0d0d0d" }}>

      {/* ── Fond flouté ── */}
      {post.media_url && (
        <video src={post.media_url}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          style={{ filter: "blur(28px) brightness(0.3)", transform: "scale(1.15)", zIndex: 0 }}
          muted playsInline preload="metadata" loop autoPlay />
      )}

      {/* ── Layout : vidéo centrée + sidebar droite ── */}
      <div className="flex items-end gap-5 h-full py-6 relative" style={{ maxHeight: "100%", zIndex: 1 }}>

        {/* ── Colonne vidéo ── */}
        <div className="flex flex-col justify-end h-full" style={{ width: 340 }}>

          {/* Conteneur vidéo 9/16 */}
          <div className="relative rounded-2xl overflow-hidden flex-shrink-0"
            style={{ width: 340, aspectRatio: "9/16", maxHeight: "calc(100% - 100px)", background: "#111", cursor: "pointer" }}
            onClick={handleVideoTap}>

            {post.media_url && (
              <video ref={videoRef} src={post.media_url}
                className="absolute inset-0 w-full h-full object-cover"
                muted={muted} playsInline preload="metadata" loop />
            )}

            {/* Gradient bas pour lisibilité du texte */}
            <div className="absolute inset-x-0 bottom-0 z-10 pointer-events-none"
              style={{ height: 160, background: "linear-gradient(to top, rgba(0,0,0,0.82) 0%, transparent 100%)" }} />

            {/* Pause indicator */}
            <AnimatePresence>
              {paused && (
                <motion.div initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                  className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)" }}>
                    <Play size={22} strokeWidth={1.5} style={{ color: "#fff", marginLeft: 3 }} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Double-tap heart */}
            <AnimatePresence>
              {doubleTapHeart && (
                <motion.div initial={{ opacity: 0, scale: 0.3, y: 0 }} animate={{ opacity: [0, 1, 1, 0], scale: [0.3, 1.4, 1.2, 0.8], y: -50 }}
                  transition={{ duration: 0.85, ease: "easeOut" }}
                  className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
                  <Heart size={80} strokeWidth={1} fill="#FF4458" style={{ color: "#FF4458", filter: "drop-shadow(0 0 24px rgba(255,68,88,0.8))" }} />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Bouton mute — coin haut droit */}
            <motion.button whileTap={{ scale: 0.9 }} onClick={e => { e.stopPropagation(); setMuted(m => !m); }}
              className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer"
              style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)" }}>
              <span className="text-sm">{muted ? "🔇" : "🔊"}</span>
            </motion.button>

            {/* Infos auteur + caption en overlay bas */}
            <div className="absolute bottom-0 inset-x-0 z-20 px-3 pb-3 pt-8 pointer-events-none">
              {/* Auteur row */}
              <div className="flex items-center gap-2 mb-1.5 pointer-events-auto">
                <Link href={`/profil/${authorPseudo}`} onClick={e => e.stopPropagation()}>
                  <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center text-xs font-bold border-2 border-white"
                    style={{ background: authorAvatar ? "transparent" : "linear-gradient(135deg,#D4C0FF,#F5E6A3)", color: "#2D3748" }}>
                    {authorAvatar
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={authorAvatar} alt={authorPseudo} className="w-full h-full object-cover" />
                      : authorPseudo[0]?.toUpperCase()}
                  </div>
                </Link>
                <Link href={`/profil/${authorPseudo}`} onClick={e => e.stopPropagation()}>
                  <span className="text-white text-sm font-semibold drop-shadow">{authorPseudo}</span>
                </Link>
                {authorCertified && (
                  <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: "linear-gradient(135deg,#A78BFA,#7C5CFA)" }}>
                    <svg width="8" height="8" viewBox="0 0 13 13" fill="none">
                      <path d="M2.5 6.5L5 9L10.5 4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                )}
                {user && post.user_id !== user.id && (
                  <motion.button whileTap={{ scale: 0.9 }} onClick={e => { e.stopPropagation(); toggleFollow(); }}
                    className="px-2.5 py-0.5 rounded-full text-[10px] font-bold cursor-pointer flex-shrink-0"
                    style={following
                      ? { background: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.3)" }
                      : { background: "linear-gradient(135deg,#D4C0FF,#F5E6A3)", color: "#2D3748" }}>
                    {following ? "Suivi" : "• Suivre"}
                  </motion.button>
                )}
              </div>
              {/* Caption */}
              {post.caption && (
                <p className="text-white text-xs font-light leading-snug line-clamp-2"
                  style={{ textShadow: "0 1px 4px rgba(0,0,0,0.9)" }}>
                  {post.caption}
                </p>
              )}
              {/* Badge vitesse */}
              {speed !== 1 && (
                <div className="mt-1.5 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold"
                  style={{ background: "linear-gradient(135deg,#D4C0FF,#F5E6A3)", color: "#2D3748" }}>
                  ×{speed}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Sidebar actions droite ── */}
        <div className="flex flex-col items-center gap-5 pb-6 flex-shrink-0" style={{ width: 52 }}>
          {/* Like */}
          <button onClick={() => toggleLike()} className="flex flex-col items-center gap-0.5 cursor-pointer">
            <motion.div whileTap={{ scale: 1.4 }} animate={liked ? { scale: [1, 1.4, 1] } : { scale: 1 }} transition={{ duration: 0.3 }}>
              <Heart size={28} strokeWidth={1.5} fill={liked ? "#FF4458" : "none"}
                style={{ color: liked ? "#FF4458" : "#fff" }} />
            </motion.div>
            <span className="text-white text-[11px] font-semibold">{fmtCount(likes)}</span>
          </button>

          {/* Commentaires */}
          <button onClick={() => { setShowComments(s => !s); setShowSettings(false); }} className="flex flex-col items-center gap-0.5 cursor-pointer">
            <MessageCircle size={26} strokeWidth={1.5} fill={showComments ? "rgba(167,139,250,0.35)" : "none"}
              style={{ color: showComments ? "#D4C0FF" : "#fff" }} />
            <span className="text-white text-[11px] font-semibold">{fmtCount(commentCount)}</span>
          </button>

          {/* Repartager */}
          <button onClick={() => toggleRepost()} className="flex flex-col items-center gap-0.5 cursor-pointer">
            <motion.div whileTap={{ scale: 1.3 }} animate={reposted ? { rotate: [0, 360] } : {}} transition={{ duration: 0.45 }}>
              <Repeat2 size={26} strokeWidth={1.5} style={{ color: reposted ? "#34D399" : "#fff" }} />
            </motion.div>
            <span className="text-white text-[11px] font-semibold">{fmtCount(reposts)}</span>
          </button>

          {/* Sauvegarder */}
          <button onClick={() => setSaved(s => !s)} className="flex flex-col items-center gap-0.5 cursor-pointer">
            <motion.div whileTap={{ scale: 1.3 }}>
              <Bookmark size={25} strokeWidth={1.5} fill={saved ? "#F5E6A3" : "none"}
                style={{ color: saved ? "#F5E6A3" : "#fff" }} />
            </motion.div>
            <span className="text-white text-[11px] font-semibold" style={{ opacity: saved ? 1 : 0.65 }}>Save</span>
          </button>

          {/* Partager */}
          <button onClick={() => handleShare()} className="flex flex-col items-center gap-0.5 cursor-pointer">
            <Share2 size={24} strokeWidth={1.5} style={{ color: "#fff" }} />
            <span className="text-white text-[11px] font-semibold" style={{ opacity: 0.65 }}>Share</span>
          </button>

          {/* Paramètres */}
          <button onClick={() => { setShowSettings(s => !s); setShowComments(false); }}
            className="flex flex-col items-center gap-0.5 cursor-pointer">
            <div className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: showSettings ? "rgba(212,192,255,0.25)" : "rgba(255,255,255,0.1)", border: showSettings ? "1px solid rgba(212,192,255,0.5)" : "1px solid rgba(255,255,255,0.12)" }}>
              <span className="text-sm">⚙️</span>
            </div>
          </button>
        </div>
      </div>

      {/* ── Signalé badge ── */}
      <AnimatePresence>
        {reported && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="absolute top-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl flex items-center gap-2"
            style={{ background: "rgba(252,129,129,0.15)", border: "1px solid rgba(252,129,129,0.3)", backdropFilter: "blur(12px)" }}>
            <Flag size={12} strokeWidth={2} style={{ color: "#FC8181" }} />
            <span className="text-xs font-medium" style={{ color: "#FC8181" }}>Vidéo signalée</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Panels overlay ── */}
      <AnimatePresence>
        {(showComments || showSettings) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-40"
            style={{ background: "rgba(0,0,0,0.5)" }}
            onClick={() => { setShowComments(false); setShowSettings(false); }} />
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
            onClose={() => setShowSettings(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function TikTokFeed({ posts }: { posts: RealPost[] }) {
  const videoPosts = posts.filter(p => p.media_type === "video" && p.media_url);
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onScroll = () => {
      const h = el.clientHeight;
      const idx = Math.round(el.scrollTop / h);
      setActiveIndex(idx);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  if (videoPosts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 px-6 text-center">
        <div className="text-5xl">🎬</div>
        <p className="text-base font-light" style={{ color: "#2D3748" }}>Aucune vidéo pour le moment</p>
        <p className="text-sm font-light" style={{ color: "#A0AEC0" }}>Publie une vidéo pour qu&apos;elle apparaisse ici</p>
      </div>
    );
  }

  return (
    <div ref={containerRef}
      className="overflow-y-scroll"
      style={{ height: "calc(100vh - 120px)", scrollSnapType: "y mandatory", scrollbarWidth: "none", overscrollBehavior: "contain" }}>
      {videoPosts.map((post, i) => (
        <div key={post.id} style={{ height: "calc(100vh - 120px)", scrollSnapAlign: "start", scrollSnapStop: "always" }}>
          <VideoCard post={post} isActive={i === activeIndex} />
        </div>
      ))}
    </div>
  );
}

function CommunautePageInner() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [view, setView] = useState<View>("feed");
  const [search, setSearch] = useState("");
  const [searchFilter, setSearchFilter] = useState<SearchFilter>("tous");
  const [realProfiles, setRealProfiles] = useState<{ id: string; pseudo: string; full_name?: string; bio?: string; avatar_url?: string }[]>([]);
  const [realSessions, setRealSessions] = useState<SessionResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  // followingIds = ensemble des IDs Supabase que l'utilisateur suit réellement
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [suggestedProfiles, setSuggestedProfiles] = useState<{ id: string; pseudo: string; full_name?: string; avatar_url?: string; bio?: string }[]>([]);

  /* Workout guide modal launched from a community post */
  const [communityWorkout, setCommunityWorkout] = useState<{
    sessionId: string; title: string; accent: string; duration: number;
    difficulty: string; category: string; exerciseList: Exercise[];
  } | null>(null);

  const [sharePost, setSharePost] = useState<{ caption?: string; post?: RealPost } | null>(null);
  const [shareToDMPost, setShareToDMPost] = useState<RealPost | null>(null);
  const [showNewDM, setShowNewDM] = useState(false);
  const [storyGroup, setStoryGroup] = useState<RealStory[] | null>(null);
  const [showAddStory, setShowAddStory] = useState(false);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [realStories, setRealStories] = useState<RealStory[]>([]);
  const [realFeedPosts, setRealFeedPosts] = useState<RealPost[]>([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedMode, setFeedMode] = useState<"algo" | "recent">("algo");
  const [feedTab, setFeedTab] = useState<"posts" | "videos">("posts");
  const [likedRealIds, setLikedRealIds] = useState<Set<string>>(new Set());
  const [hiddenRealIds, setHiddenRealIds] = useState<Set<string>>(new Set());
  const [openRealComments, setOpenRealComments] = useState<Set<string>>(new Set());
  const [savedRealIds, setSavedRealIds] = useState<Set<string>>(new Set());
  const [repostedRealIds, setRepostedRealIds] = useState<Set<string>>(new Set());
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
    const visible = realFeedPosts.filter(p => !hiddenRealIds.has(p.id));
    if (feedMode === "recent") return visible; // ordre chronologique (déjà trié par Supabase)
    return [...visible].sort((a, b) => getScore(b) - getScore(a));
  }, [realFeedPosts, hiddenRealIds, feedMode, getScore]);

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

  // Charger les suggestions de comptes à suivre
  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    supabase
      .from("profiles")
      .select("id, pseudo, full_name, avatar_url, bio")
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

  // Charger le feed réel depuis Supabase
  const loadFeed = useCallback(async () => {
    if (!user) return;
    setFeedLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("posts")
      .select(`
        id, type, caption, description, audience, performance_data, media_url, media_type, created_at, user_id,
        author:profiles!user_id(pseudo, full_name, avatar_url, is_admin),
        post_likes(user_id),
        post_comments(id),
        post_reposts(user_id)
      `)
      .order("created_at", { ascending: false })
      .limit(30);
    if (data) {
      setRealFeedPosts(data as unknown as RealPost[]);
      const liked = new Set<string>();
      const reposted = new Set<string>();
      (data as unknown as RealPost[]).forEach((p) => {
        if (p.post_likes.some((l) => l.user_id === user.id)) liked.add(p.id);
        if (p.post_reposts?.some((r) => r.user_id === user.id)) reposted.add(p.id);
      });
      setLikedRealIds(liked);
      setRepostedRealIds(reposted);
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
            id, type, caption, description, audience, performance_data, media_url, media_type, created_at, user_id,
            author:profiles!user_id(pseudo, full_name, avatar_url, is_admin),
            post_likes(user_id),
            post_comments(id),
            post_reposts(user_id)
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
      // Notification in-app (silencieuse)
      void Promise.resolve(supabase.from("notifications").insert({
        user_id: profile.id,
        from_user_id: user.id,
        from_pseudo: user.pseudo,
        from_avatar_url: user.avatar ?? null,
        type: "follow",
      })).then(() => {}).catch(() => {});
      // Email de notification (silencieux, authentifié)
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
        showToast(`Erreur : ${error.message}`);
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
      await supabase.from("post_likes").upsert({ post_id: postId, user_id: user.id }, { ignoreDuplicates: true });
      // Notif au propriétaire du post
      const post = realFeedPosts.find((p) => p.id === postId);
      if (post && post.user_id !== user.id) {
        void supabase.from("notifications").insert({
          user_id: post.user_id, from_user_id: user.id,
          from_pseudo: user.pseudo, from_avatar_url: user.avatar ?? null,
          type: "like", post_id: postId,
        });
        fetch("/api/notifications/like", {
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
      await supabase.from("post_reposts").upsert({ post_id: postId, user_id: user.id }, { ignoreDuplicates: true });
      showToast("Post boosté ! 🔄");
      // Notif au propriétaire du post
      const post = realFeedPosts.find((p) => p.id === postId);
      if (post && post.user_id !== user.id) {
        void supabase.from("notifications").insert({
          user_id: post.user_id, from_user_id: user.id,
          from_pseudo: user.pseudo, from_avatar_url: user.avatar ?? null,
          type: "repost", post_id: postId,
        });
        fetch("/api/notifications/repost", {
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
      .select("id, sender_id, receiver_id, content, created_at, read_at, reply_to_id")
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

      setDmMessages(msgs.map(m => ({
        ...m,
        reply_to_content: m.reply_to_id ? replyMap[m.reply_to_id] ?? null : null,
        reactions: reactionsMap[m.id] ?? [],
      })));

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
    return {
      realProfiles: searchFilter !== "seances" ? realProfiles : [],
      sessions:     searchFilter !== "compte"  ? realSessions : [],
      // Suggestions : comptes pas encore suivis (utilisé quand search est vide)
      suggestions:  suggestedProfiles.filter(p => !followingIds.has(p.id)).slice(0, 8),
    };
  }, [searchFilter, realProfiles, realSessions, suggestedProfiles, followingIds]);

  return (
    <div
      className="min-h-screen flex flex-col px-4 md:px-8 pt-8 pb-4 max-w-2xl mx-auto md:mx-0 md:max-w-4xl relative"
      onClick={() => { if (openRealMenu !== null) setOpenRealMenu(null); }}
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
                <div className="flex gap-3 overflow-x-auto pb-3 pt-2 -mx-4 md:-mx-8 px-4 md:px-8" style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}>

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
                      {user?.avatar ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={user.avatar} alt="moi" className="w-full h-full object-cover rounded-full" />
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
                              outline: "2.5px solid",
                              outlineColor: (group[0]?.content_type === "photo" || group[0]?.content_type === "video") ? "#A78BFA" : "#D4C0FF",
                              outlineOffset: 2,
                              color: "#2D3748",
                            }}
                          >
                            {/* Show photo thumbnail if first story is a photo */}
                            {(group[0]?.content_type === "photo" || group[0]?.content_type === "video") && group[0]?.media_url
                              // eslint-disable-next-line @next/next/no-img-element
                              ? <img src={group[0].media_url} alt={name} className="w-full h-full object-cover" />
                              : p?.avatar_url
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

                </div>
              );
            })()}

            {/* ── Tab Publications / Vidéos ── */}
            <div className="flex items-center gap-2 px-1">
              {([
                { key: "posts" as const, label: "📝 Publications" },
                { key: "videos" as const, label: "🎬 Vidéos" },
              ]).map(({ key, label }) => (
                <motion.button key={key} whileTap={{ scale: 0.94 }}
                  onClick={() => setFeedTab(key)}
                  className="px-4 py-2 rounded-2xl text-xs font-semibold transition-all"
                  style={feedTab === key
                    ? { background: "linear-gradient(135deg,#D4C0FF,#F5E6A3)", color: "#3D2F6B", boxShadow: "0 2px 10px rgba(167,139,250,0.25)" }
                    : { background: "rgba(240,235,255,0.5)", color: "#A0AEC0" }
                  }>
                  {label}
                </motion.button>
              ))}
            </div>

            {/* ── Toggle algorithme / récents (seulement sur Posts) ── */}
            {feedTab === "posts" && !feedLoading && (
              <div className="flex items-center gap-2 px-1">
                {(["algo", "recent"] as const).map((mode) => (
                  <motion.button
                    key={mode}
                    whileTap={{ scale: 0.94 }}
                    onClick={() => setFeedMode(mode)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl text-xs font-semibold transition-all"
                    style={feedMode === mode
                      ? { background: "linear-gradient(135deg,#D4C0FF,#F5E6A3)", color: "#3D2F6B", boxShadow: "0 2px 10px rgba(167,139,250,0.25)" }
                      : { background: "rgba(240,235,255,0.5)", color: "#A0AEC0" }
                    }
                  >
                    {mode === "algo" ? "🔥 Pour toi" : "🕐 Récents"}
                  </motion.button>
                ))}
              </div>
            )}

            {/* ── Feed Vidéos TikTok ── */}
            {feedTab === "videos" && (
              <TikTokFeed posts={sortedFeedPosts} />
            )}

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

            {feedTab === "posts" && !feedLoading && sortedFeedPosts.length === 0 && (
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

            {feedTab === "posts" && !feedLoading && sortedFeedPosts.map((post, postIdx) => {
              const liked = likedRealIds.has(post.id);
              const isMenuOpen = openRealMenu === post.id;
              const isSaved = savedRealIds.has(post.id);
              const isCommentsOpen = openRealComments.has(post.id);
              const likesCount = post.post_likes.length;
              const commentsCount = post.post_comments.length;
              const repostsCount = post.post_reposts?.length ?? 0;
              const authorPseudo = post.author?.pseudo ?? "utilisateur";
              const authorAvatar = post.author?.avatar_url;
              const authorCertified = post.author?.is_admin === true;
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
                      <div className="flex items-center gap-1.5 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: "#2D3748" }}>@{authorPseudo}</p>
                        {isHot && (
                          <span className="flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "linear-gradient(135deg,#FF6B35,#FF8C42)", color: "#fff", boxShadow: "0 1px 6px rgba(255,107,53,0.4)" }}>🔥 Trending</span>
                        )}
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
                              const supabase = createClient();
                              await supabase.from("posts").delete().eq("id", post.id);
                              setRealFeedPosts((prev) => prev.filter((p) => p.id !== post.id));
                              showToast("Post supprimé");
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
                      {post.caption}
                    </p>
                  )}

                  {/* Media (photo/vidéo) si présente */}
                  {post.media_url && (
                    <div className="mx-4 mb-3 rounded-2xl overflow-hidden">
                      {post.media_type === "video"
                        ? <VideoPlayer src={post.media_url} maxHeight={380} controls muted />
                        // eslint-disable-next-line @next/next/no-img-element
                        : <img src={post.media_url} alt="" className="w-full object-cover" style={{ maxHeight: 380 }} />
                      }
                    </div>
                  )}

                  {/* Bio / description — affichée après la photo */}
                  {post.description && (
                    <p className="px-4 pb-2 text-sm font-light leading-relaxed" style={{ color: "#718096" }}>
                      {post.description}
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
                  <div className="px-4 pt-2 pb-1">
                    {likesCount > 0 && (
                      <p className="text-sm font-semibold" style={{ color: "#2D3748" }}>
                        {likesCount} j&apos;aime{repostsCount > 0 ? ` · ${repostsCount} repartage${repostsCount > 1 ? "s" : ""}` : ""}
                      </p>
                    )}
                    <motion.p
                      whileHover={{ color: "#2D3748" }}
                      className="text-[11px] mt-1.5 cursor-pointer mb-3"
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
                        postOwnerId={post.user_id}
                        onClose={() => setOpenRealComments((p) => { const n = new Set(p); n.delete(post.id); return n; })}
                        onCommentAdded={() => setRealFeedPosts((prev) => prev.map((p) => p.id !== post.id ? p : { ...p, post_comments: [...p.post_comments, { id: `opt-${Date.now()}` }] }))}
                      />
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}

            {/* ── Floating Action Button : créer un post libre ── */}
            {user && (
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
                        <Link href={`/profil/${profile.pseudo}`} className="flex-shrink-0">
                          <div className="w-11 h-11 rounded-full flex items-center justify-center text-base font-semibold overflow-hidden"
                            style={{ background: profile.avatar_url ? "transparent" : "linear-gradient(135deg,#D4C0FF,#F5E6A3)", color: "#2D3748" }}>
                            {profile.avatar_url
                              // eslint-disable-next-line @next/next/no-img-element
                              ? <img src={profile.avatar_url} alt={profile.pseudo} className="w-full h-full object-cover" />
                              : (profile.pseudo?.[0] ?? "?").toUpperCase()}
                          </div>
                        </Link>
                        <Link href={`/profil/${profile.pseudo}`} className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate" style={{ color: "#2D3748" }}>{profile.full_name || profile.pseudo}</p>
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

            {!searchLoading && search.trim() && filteredResults.realProfiles.length === 0 && filteredResults.sessions.length === 0 && (
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
              style={{ minHeight: "calc(100vh - 200px)" }}
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
                        <Link href={`/profil/${activeDMPartner.pseudo}`} className="flex-shrink-0">
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
                            className="px-4 py-2.5 rounded-2xl text-sm font-light max-w-[260px]"
                            style={isMe
                              ? { background: "linear-gradient(135deg, #D4C0FF 0%, #F5E6A3 100%)", color: "#2D3748", borderBottomRightRadius: 6, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8)" }
                              : { background: "rgba(255,255,255,0.7)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.7)", color: "#2D3748", borderBottomLeftRadius: 6 }
                            }
                          >
                            {msg.content}
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

                        <p className={`text-[9px] mt-1 ${isMe ? "text-right" : ""}`} style={{ color: "#A0AEC0" }}>{timeStr}</p>
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
