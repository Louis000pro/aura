"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Heart, MessageCircle, Share2, Send, Plus, ArrowLeft, BadgeCheck, UserPlus, MoreHorizontal, X, Camera, Check, Bookmark, Flag, EyeOff } from "lucide-react";
import PerformanceCard, { type PerformanceData } from "@/components/PerformanceCard";

type View = "feed" | "search" | "dms" | "thread";

type User = {
  handle: string;
  name: string;
  initial: string;
  gradient: string;
  verified?: boolean;
  followers?: string;
  bio?: string;
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

const stories = users.slice(0, 5).map((u, i) => ({ ...u, active: i % 2 === 0 }));

type DM = { id: number; user: User; preview: string; time: string; unread: number };
const dms: DM[] = [
  { id: 1, user: users[0], preview: "Super séance ce matin ! 💪", time: "09:14", unread: 2 },
  { id: 2, user: users[1], preview: "Tu as essayé le scan posture ?", time: "Hier", unread: 0 },
  { id: 3, user: users[2], preview: "Merci pour tes conseils 🙏", time: "Lun", unread: 0 },
  { id: 4, user: influencers[0], preview: "Bienvenue sur Aura Marie !", time: "Dim", unread: 0 },
];

type Message = { from: "me" | "other"; text: string; time: string };
const initialThreadMessages: Message[] = [
  { from: "other", text: "Super séance ce matin !", time: "09:12" },
  { from: "me", text: "Merci ! Toi aussi tu t'en sors bien", time: "09:14" },
  { from: "other", text: "Le scan posture est vraiment bluffant 😊", time: "09:15" },
  { from: "me", text: "Oui ! Le retour IA est super précis", time: "09:16" },
];

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

// Story Viewer Overlay
function StoryViewer({ user, onClose }: { user: User; onClose: () => void }) {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((p) => (p >= 100 ? 100 : p + 2));
    }, 60);
    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
    if (progress >= 100) onClose();
  }, [progress, onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: "rgba(0,0,0,0.92)", backdropFilter: "blur(20px)" }}
      onClick={onClose}
    >
      {/* Progress bar */}
      <div className="absolute top-0 left-0 right-0 h-0.5 z-10" style={{ background: "rgba(255,255,255,0.2)" }}>
        <motion.div
          className="h-full"
          style={{ background: "linear-gradient(90deg, #D4C0FF, #F5E6A3)", width: `${progress}%` }}
        />
      </div>

      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-8 pb-3 z-10" onClick={(e) => e.stopPropagation()}>
        <Avatar user={user} size={36} ring />
        <div className="flex-1">
          <p className="text-white text-sm font-semibold">{user.name}</p>
          <p className="text-white/50 text-[11px]">Il y a 12 min</p>
        </div>
        <motion.button whileTap={{ scale: 0.9 }} onClick={onClose} className="cursor-pointer">
          <X size={20} strokeWidth={1.5} style={{ color: "rgba(255,255,255,0.8)" }} />
        </motion.button>
      </div>

      {/* Story content */}
      <div className="flex-1 flex items-center justify-center px-6" onClick={(e) => e.stopPropagation()}>
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", bounce: 0.3 }}
          className="w-full max-w-sm rounded-3xl p-8 text-center"
          style={{
            background: user.gradient,
            boxShadow: "0 20px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.4)",
          }}
        >
          <div className="text-6xl mb-4" style={{ filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.1))" }}>
            {user.initial === "S" ? "💪" : user.initial === "L" ? "🥗" : user.initial === "M" ? "🧘" : "✦"}
          </div>
          <p className="text-lg font-semibold" style={{ color: "#2D3748" }}>{user.name}</p>
          <p className="text-sm font-light mt-2" style={{ color: "#718096" }}>
            {user.initial === "S" ? "Séance du matin terminée ! 🔥" :
             user.initial === "L" ? "Bowl protéiné du midi 🥗" :
             "Récupération active · Yoga 30min"}
          </p>
        </motion.div>
      </div>

      {/* Reply bar */}
      <div className="px-5 pb-10 z-10" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl" style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)" }}>
          <input
            type="text"
            placeholder={`Répondre à ${user.name.split(" ")[0]}…`}
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: "white" }}
          />
          <Send size={16} strokeWidth={1.5} style={{ color: "rgba(255,255,255,0.5)" }} />
        </div>
      </div>
    </motion.div>
  );
}

// Add Story Modal
function AddStoryModal({ onClose }: { onClose: () => void }) {
  const [shared, setShared] = useState(false);

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
        <AnimatePresence mode="wait">
          {!shared ? (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-light" style={{ color: "#2D3748" }}>Ajouter une story</h2>
                <motion.button whileTap={{ scale: 0.9 }} onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer" style={{ background: "rgba(240,235,255,0.8)" }}>
                  <X size={14} strokeWidth={2} style={{ color: "#A0AEC0" }} />
                </motion.button>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-5">
                {[
                  { icon: Camera, label: "Photo", desc: "Capturer un moment" },
                  { icon: Share2, label: "Ma séance", desc: "Partager ma perf du jour" },
                ].map(({ icon: Icon, label, desc }) => (
                  <motion.button
                    key={label}
                    whileHover={{ scale: 1.03, y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setShared(true)}
                    className="flex flex-col items-center gap-2 p-4 rounded-2xl cursor-pointer"
                    style={{
                      background: "linear-gradient(135deg, #F0EBFF 0%, #FFFBF0 100%)",
                      border: "1px solid rgba(255,255,255,0.8)",
                    }}
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
            </motion.div>
          ) : (
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
              <p className="text-sm text-center font-light" style={{ color: "#A0AEC0" }}>Visible pendant 24h par vos amis</p>
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
  postId: number; saved: boolean;
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
function CommentsSection({ postId, initialCount, onClose }: { postId: number; initialCount: number; onClose: () => void }) {
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

export default function CommunautePage() {
  const [view, setView] = useState<View>("feed");
  const [activeThread, setActiveThread] = useState<User | null>(null);
  const [search, setSearch] = useState("");
  const [likedIds, setLikedIds] = useState<Set<number>>(new Set([2]));
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [openComments, setOpenComments] = useState<Set<number>>(new Set());
  const [savedPosts, setSavedPosts] = useState<Set<number>>(new Set());
  const [hiddenPosts, setHiddenPosts] = useState<Set<number>>(new Set());
  const [openMenu, setOpenMenu] = useState<number | null>(null);
  const [sharePost, setSharePost] = useState<FeedItem | null>(null);
  const [storyUser, setStoryUser] = useState<User | null>(null);
  const [showAddStory, setShowAddStory] = useState(false);
  const [threadInput, setThreadInput] = useState("");
  const [threadMessages, setThreadMessages] = useState<Message[]>(initialThreadMessages);
  const [toast, setToast] = useState<string | null>(null);
  const [burstPost, setBurstPost] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [particles, setParticles] = useState<{id:number,x:number,y:number,size:number,delay:number,duration:number,opacity:number}[]>([]);
  useEffect(() => {
    setParticles(Array.from({ length: 10 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: i < 3 ? 12 + Math.random() * 10 : i < 6 ? 5 + Math.random() * 4 : 3 + Math.random() * 2,
      delay: Math.random() * 6,
      duration: 9 + Math.random() * 8,
      opacity: 0.72 + Math.random() * 0.22,
    })));
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [threadMessages]);

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

  const handleSendMessage = () => {
    if (!threadInput.trim()) return;
    const now = new Date();
    const time = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
    setThreadMessages((prev) => [...prev, { from: "me", text: threadInput.trim(), time }]);
    setThreadInput("");

    // Simulate reply after 1.2s
    setTimeout(() => {
      const replies = [
        "Super ! 💪",
        "Haha oui exactement !",
        "Tu verras, ça marche vraiment bien",
        "On s'entraîne ensemble bientôt ?",
      ];
      const reply = replies[Math.floor(Math.random() * replies.length)];
      const replyTime = `${now.getHours().toString().padStart(2, "0")}:${(now.getMinutes() + 1).toString().padStart(2, "0")}`;
      setThreadMessages((prev) => [...prev, { from: "other", text: reply, time: replyTime }]);
    }, 1200);
  };

  const filteredResults = useMemo(() => {
    if (!search.trim()) return { friends: users, influencers };
    const q = search.toLowerCase();
    return {
      friends: users.filter((u) => u.name.toLowerCase().includes(q) || u.handle.toLowerCase().includes(q)),
      influencers: influencers.filter((u) => u.name.toLowerCase().includes(q) || u.handle.toLowerCase().includes(q)),
    };
  }, [search]);

  const visibleFeed = feedData.filter((p) => !hiddenPosts.has(p.id));

  return (
    <div
      className="min-h-screen flex flex-col px-4 md:px-8 pt-8 pb-4 max-w-2xl mx-auto md:mx-0 md:max-w-4xl relative overflow-x-hidden"
      style={{ background: "linear-gradient(135deg, #f2eeff 0%, #fffef5 50%, #f2eeff 100%)" }}
      onClick={() => openMenu !== null && setOpenMenu(null)}
    >
      {/* ── Calque déco : blobs · anneaux · particules ── */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" }}>
        {/* Blobs statiques */}
        <div className="absolute rounded-full"
          style={{ top: "-5%", left: "-8%", width: 580, height: 580, background: "rgba(147,112,219,0.65)", filter: "blur(80px)" }} />
        <div className="absolute rounded-full"
          style={{ bottom: "-5%", right: "-8%", width: 540, height: 540, background: "rgba(200,155,50,0.55)", filter: "blur(80px)" }} />
        {/* Rings — GPU composited */}
        {[500, 370, 260].map((size, i) => (
          <motion.div key={size} className="absolute rounded-full"
            style={{
              width: size, height: size,
              border: `1px solid rgba(167,139,250,${i === 0 ? 0.30 : i === 1 ? 0.42 : 0.30})`,
              top: "50%", left: "50%", marginLeft: -size / 2, marginTop: -size / 2,
              willChange: "transform",
            }}
            animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
            transition={{ duration: 60 + i * 20, repeat: Infinity, ease: "linear" }}
          />
        ))}
        {particles.map((p) => (
          <motion.div key={p.id} className="absolute rounded-full"
            style={{
              left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size,
              background: p.id % 3 === 0 ? `rgba(167,139,250,${p.opacity})` : p.id % 3 === 1 ? `rgba(212,192,255,${p.opacity})` : `rgba(212,168,67,${p.opacity * 0.85})`,
              willChange: "transform",
            }}
            animate={{ y: ["-15px", "15px", "-15px"] }}
            transition={{ duration: p.duration, repeat: Infinity, delay: p.delay, ease: "easeInOut" }}
          />
        ))}
      </div>
      {/* ── Contenu ── */}
      <div className="relative flex flex-col flex-1" style={{ zIndex: 1 }}>
      {/* Top Bar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-between mb-5"
      >
        <h1 className="text-2xl font-extralight tracking-tight" style={{ color: "#2D3748" }}>
          {view === "thread" && activeThread ? activeThread.name : "Communauté"}
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
            <div className="flex gap-3 overflow-x-auto pb-2 pt-2" style={{ scrollbarWidth: "none" }}>
              {/* Add Story */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1, type: "spring", bounce: 0.4 }}
                className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer"
                onClick={() => setShowAddStory(true)}
              >
                <motion.div
                  whileHover={{ scale: 1.08, rotate: 5 }}
                  whileTap={{ scale: 0.92 }}
                  className="w-16 h-16 rounded-full flex items-center justify-center"
                  style={{
                    background: "linear-gradient(135deg, rgba(240,235,255,0.7) 0%, rgba(224,255,255,0.7) 100%)",
                    border: "2px dashed rgba(167,139,250,0.5)",
                  }}
                >
                  <Plus size={18} strokeWidth={1.5} style={{ color: "#A0AEC0" }} />
                </motion.div>
                <span className="text-[10px] font-medium" style={{ color: "#A0AEC0" }}>Vous</span>
              </motion.div>

              {/* Story avatars */}
              {stories.map((u, i) => (
                <motion.div
                  key={u.handle}
                  initial={{ opacity: 0, scale: 0.7, x: -10 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  transition={{ delay: 0.12 + i * 0.07, type: "spring", bounce: 0.45 }}
                  whileHover={{ scale: 1.08, y: -2 }}
                  whileTap={{ scale: 0.92 }}
                  className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer"
                  onClick={() => setStoryUser(u)}
                >
                  <div className="relative">
                    <Avatar user={u} size={64} ring={u.active} />
                  </div>
                  <span className="text-[10px] font-medium max-w-[64px] truncate" style={{ color: u.active ? "#2D3748" : "#A0AEC0" }}>
                    {u.name.split(" ")[0]}
                  </span>
                </motion.div>
              ))}
            </div>

            {/* Posts */}
            {visibleFeed.length === 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
                <p className="text-4xl mb-3">👁</p>
                <p className="text-sm font-light" style={{ color: "#A0AEC0" }}>Aucun post à afficher</p>
              </motion.div>
            )}

            {visibleFeed.map((post, postIdx) => {
              const liked = likedIds.has(post.id);
              const isMenuOpen = openMenu === post.id;
              const isSaved = savedPosts.has(post.id);
              const isCommentsOpen = openComments.has(post.id);

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
                    <motion.div whileHover={{ scale: 1.1 }} transition={{ type: "spring", bounce: 0.4 }}>
                      <Avatar user={post.user} size={36} />
                    </motion.div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold" style={{ color: "#2D3748" }}>{post.user.name}</p>
                      <p className="text-[10px]" style={{ color: "#A0AEC0" }}>@{post.user.handle} · {post.time}</p>
                    </div>
                    <div className="relative">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9, rotate: 90 }}
                        transition={{ duration: 0.2 }}
                        onClick={(e) => { e.stopPropagation(); setOpenMenu(isMenuOpen ? null : post.id); }}
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
                              setSavedPosts((p) => { const n = new Set(p); n.has(post.id) ? n.delete(post.id) : n.add(post.id); return n; });
                              showToast(isSaved ? "Retiré des favoris" : "Sauvegardé dans vos favoris ✓");
                            }}
                            onHide={() => {
                              setHiddenPosts((p) => new Set([...p, post.id]));
                              showToast("Post masqué");
                            }}
                            onReport={() => showToast("Signalement envoyé. Merci !")}
                            onClose={() => setOpenMenu(null)}
                          />
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Performance Card */}
                  <div className="px-4">
                    <PerformanceCard data={post.card} size="md" interactive />
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-4 px-4 pt-3">
                    {/* Like */}
                    <motion.button
                      whileTap={{ scale: 0.7 }}
                      onClick={() => toggleLike(post.id)}
                      className="relative flex items-center gap-1.5 cursor-pointer"
                    >
                      {burstPost === post.id && [0, 1, 2, 3, 4].map((i) => (
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

                    {/* Comment */}
                    <motion.button
                      whileHover={{ scale: 1.15 }}
                      whileTap={{ scale: 0.85, rotate: -15 }}
                      onClick={() => toggleComments(post.id)}
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

                    {/* Share */}
                    <motion.button
                      whileHover={{ scale: 1.15, rotate: 15 }}
                      whileTap={{ scale: 0.85 }}
                      onClick={() => setSharePost(post)}
                      className="flex items-center cursor-pointer"
                      aria-label="Partager"
                    >
                      <Share2 size={20} strokeWidth={1.5} style={{ color: "#2D3748" }} />
                    </motion.button>

                    {/* Save indicator */}
                    {isSaved && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="ml-auto"
                      >
                        <Bookmark size={16} strokeWidth={1.5} fill="#F5E6A3" style={{ color: "#D4A843" }} />
                      </motion.div>
                    )}
                  </div>

                  {/* Stats + caption */}
                  <div className="px-4 pt-2 pb-1">
                    <p className="text-sm font-semibold" style={{ color: "#2D3748" }}>
                      {post.likes + (liked && !post.liked ? 1 : !liked && post.liked ? -1 : 0)} mentions « j&apos;aime »
                    </p>
                    {post.caption && (
                      <p className="text-sm font-light leading-relaxed mt-1" style={{ color: "#2D3748" }}>
                        <span className="font-semibold mr-1.5">{post.user.handle}</span>
                        {post.caption}
                      </p>
                    )}
                    <motion.p
                      whileHover={{ color: "#2D3748" }}
                      className="text-[10px] mt-2 cursor-pointer mb-3"
                      style={{ color: "#A0AEC0" }}
                      onClick={() => toggleComments(post.id)}
                    >
                      {isCommentsOpen ? "Masquer les commentaires" : `Voir les ${post.comments} commentaires`}
                    </motion.p>
                  </div>

                  {/* Comments Section */}
                  <AnimatePresence>
                    {isCommentsOpen && (
                      <CommentsSection
                        postId={post.id}
                        initialCount={post.comments}
                        onClose={() => toggleComments(post.id)}
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
            <div className="lg-strong lg-highlight relative flex items-center gap-3 px-4 py-3 rounded-2xl">
              <Search size={16} strokeWidth={1.5} style={{ color: "#A0AEC0" }} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
                placeholder="Rechercher amis ou influenceurs…"
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-[#A0AEC0]"
                style={{ color: "#2D3748" }}
              />
              {search && (
                <button onClick={() => setSearch("")} className="cursor-pointer" aria-label="Effacer">
                  <span className="text-xs" style={{ color: "#A0AEC0" }}>Effacer</span>
                </button>
              )}
            </div>

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

            {filteredResults.friends.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold tracking-widest uppercase mb-2 px-1" style={{ color: "#A0AEC0" }}>
                  Amis & Suggestions
                </p>
                <div className="flex flex-col gap-2">
                  {filteredResults.friends.map((u) => {
                    const isFollowing = following.has(u.handle);
                    return (
                      <div key={u.handle} className="lg-surface lg-highlight relative flex items-center gap-3 px-4 py-3 rounded-2xl">
                        <Avatar user={u} size={40} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: "#2D3748" }}>{u.name}</p>
                          <p className="text-[11px]" style={{ color: "#A0AEC0" }}>@{u.handle}</p>
                        </div>
                        <motion.button
                          whileTap={{ scale: 0.94 }}
                          onClick={() => toggleFollow(u.handle)}
                          className="w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer"
                          style={{
                            background: isFollowing ? "rgba(255,255,255,0.6)" : "linear-gradient(135deg, #D4C0FF 0%, #F5E6A3 100%)",
                            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8)",
                          }}
                          aria-label={isFollowing ? "Ne plus suivre" : "Suivre"}
                        >
                          <UserPlus size={14} strokeWidth={1.5} style={{ color: isFollowing ? "#A0AEC0" : "#2D3748" }} />
                        </motion.button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {filteredResults.friends.length === 0 && filteredResults.influencers.length === 0 && (
              <div className="text-center py-12">
                <p className="text-sm font-light" style={{ color: "#A0AEC0" }}>Aucun résultat pour « {search} »</p>
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
            {dms.map((dm) => (
              <motion.button
                key={dm.id}
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => { setActiveThread(dm.user); setView("thread"); setThreadMessages(initialThreadMessages); }}
                className="lg-surface lg-highlight relative flex items-center gap-3 px-4 py-3 rounded-2xl cursor-pointer text-left"
              >
                <Avatar user={dm.user} size={48} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold truncate" style={{ color: "#2D3748" }}>{dm.user.name}</p>
                    <span className="text-[10px] flex-shrink-0" style={{ color: "#A0AEC0" }}>{dm.time}</span>
                  </div>
                  <p className="text-xs font-light truncate mt-0.5" style={{ color: dm.unread ? "#2D3748" : "#A0AEC0" }}>
                    {dm.preview}
                  </p>
                </div>
                {dm.unread > 0 && (
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                    style={{ background: "linear-gradient(135deg, #D4C0FF 0%, #A78BFA 100%)", color: "#FFFFFF", boxShadow: "0 2px 8px rgba(167,139,250,0.4)" }}
                  >
                    {dm.unread}
                  </div>
                )}
              </motion.button>
            ))}
          </motion.div>
        )}

        {/* ────── THREAD ────── */}
        {view === "thread" && activeThread && (
          <motion.div
            key="thread"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col flex-1"
            style={{ minHeight: "calc(100vh - 200px)" }}
          >
            <div className="flex flex-col gap-3 flex-1 pb-4 overflow-y-auto">
              {threadMessages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: i < 4 ? i * 0.06 : 0, type: "spring", bounce: 0.3 }}
                  className={`flex ${msg.from === "me" ? "justify-end" : "justify-start"} items-end gap-2`}
                >
                  {msg.from === "other" && <Avatar user={activeThread} size={28} />}
                  <div>
                    <div
                      className="px-4 py-2.5 rounded-2xl text-sm font-light max-w-[260px]"
                      style={msg.from === "me"
                        ? { background: "linear-gradient(135deg, #D4C0FF 0%, #F5E6A3 100%)", color: "#2D3748", borderBottomRightRadius: 6, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8)" }
                        : { background: "rgba(255,255,255,0.7)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.7)", color: "#2D3748", borderBottomLeftRadius: 6 }
                      }
                    >
                      {msg.text}
                    </div>
                    <p className={`text-[9px] mt-1 ${msg.from === "me" ? "text-right" : ""}`} style={{ color: "#A0AEC0" }}>{msg.time}</p>
                  </div>
                </motion.div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="lg-strong lg-highlight relative flex items-center gap-2 p-2.5 rounded-2xl mt-auto">
              <input
                type="text"
                value={threadInput}
                onChange={(e) => setThreadInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSendMessage(); }}
                placeholder="Message…"
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-[#A0AEC0] px-2"
                style={{ color: "#2D3748" }}
              />
              <motion.button
                whileHover={{ scale: threadInput.trim() ? 1.08 : 1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleSendMessage}
                className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer flex-shrink-0 transition-all duration-200"
                style={{
                  background: threadInput.trim()
                    ? "linear-gradient(135deg, #D4C0FF 0%, #F5E6A3 100%)"
                    : "rgba(240,235,255,0.5)",
                  boxShadow: threadInput.trim() ? "inset 0 1px 0 rgba(255,255,255,0.8)" : "none",
                }}
                aria-label="Envoyer"
              >
                <Send size={13} strokeWidth={2} style={{ color: threadInput.trim() ? "#2D3748" : "#A0AEC0" }} />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Modals */}
      <AnimatePresence>
        {sharePost && <ShareModal postCaption={sharePost.caption} onClose={() => setSharePost(null)} />}
        {showAddStory && <AddStoryModal onClose={() => setShowAddStory(false)} />}
        {storyUser && <StoryViewer user={storyUser} onClose={() => setStoryUser(null)} />}
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
