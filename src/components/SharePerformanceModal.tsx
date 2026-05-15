"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Lock, Globe, Users, Check, Star, Eye, EyeOff } from "lucide-react";
import PerformanceCard, { type PerformanceData, PHOTO_FILTER_PRESETS } from "./PerformanceCard";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

type Audience = "public" | "friends" | "private";

const audiences: { id: Audience; label: string; icon: typeof Globe }[] = [
  { id: "public",  label: "Public", icon: Globe  },
  { id: "friends", label: "Amis",   icon: Users  },
  { id: "private", label: "Privé",  icon: Lock   },
];

export default function SharePerformanceModal({
  open,
  onClose,
  data,
}: {
  open:    boolean;
  onClose: () => void;
  data:    PerformanceData;
}) {
  const { user } = useAuth();
  const [caption,   setCaption]   = useState("");
  const [audience,  setAudience]  = useState<Audience>("friends");
  const [posting,   setPosting]   = useState(false);
  const [posted,    setPosted]    = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  /* ── Personnalisation ── */
  const [customBgImage,  setCustomBgImage]  = useState<string | undefined>(undefined);
  const [photoFilterKey, setPhotoFilterKey] = useState<string | undefined>(undefined);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [heroIndex,  setHeroIndex]  = useState(0);
  const [visibleSubs, setVisibleSubs] = useState<Set<number>>(
    () => new Set(data.metrics.map((_, i) => i).filter(i => i !== 0))
  );

  const cssFilter = PHOTO_FILTER_PRESETS.find(f => f.key === photoFilterKey)?.filter;

  const toggleSub = (idx: number) => {
    if (idx === heroIndex) return;
    setVisibleSubs(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  const setHero = (idx: number) => {
    setHeroIndex(idx);
    setVisibleSubs(prev => {
      const next = new Set(prev);
      next.delete(idx);
      next.add(heroIndex);
      return next;
    });
  };

  const shownIndices = Array.from(visibleSubs).filter(i => i !== heroIndex);

  const handleShare = async () => {
    if (!user) { setError("Connecte-toi pour partager"); return; }
    setPosting(true);
    setError(null);
    const supabase = createClient();
    const { error: err } = await supabase.from("posts").insert({
      user_id:          user.id,
      type:             data.type,
      caption:          caption.trim(),
      audience,
      performance_data: data,
    });
    setPosting(false);
    if (err) { setError(err.message); return; }
    setPosted(true);
    setTimeout(() => {
      setPosted(false);
      setCaption("");
      setAudience("friends");
      onClose();
    }, 1600);
  };

  /* ── Hidden file input ── */
  const openFilePicker = () => photoInputRef.current?.click();

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[100]"
            style={{ background: "rgba(240,235,255,0.4)", backdropFilter: "blur(12px)" }}
          />

          {/* Sheet */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="fixed inset-x-4 bottom-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[440px] z-[110] rounded-3xl overflow-hidden"
            style={{
              background:     "rgba(255,255,255,0.96)",
              backdropFilter: "blur(20px)",
              border:         "1px solid rgba(255,255,255,0.9)",
              boxShadow:      "0 32px 80px rgba(167,139,250,0.18), 0 8px 32px rgba(0,0,0,0.1)",
              maxHeight:      "92vh",
              overflowY:      "auto",
            }}
          >
            {/* ── Hidden file input ── */}
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setCustomBgImage(URL.createObjectURL(file));
                setPhotoFilterKey(undefined);
                e.target.value = "";
              }}
            />

            {posted ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-12 flex flex-col items-center justify-center gap-3">
                <motion.div
                  initial={{ scale: 0 }} animate={{ scale: 1 }}
                  transition={{ type: "spring", bounce: 0.5, delay: 0.1 }}
                  className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, #D4C0FF 0%, #F5E6A3 100%)" }}
                >
                  <Check size={24} strokeWidth={2} style={{ color: "#2D3748" }} />
                </motion.div>
                <p className="text-base font-medium" style={{ color: "#2D3748" }}>Publié !</p>
                <p className="text-xs font-light" style={{ color: "#A0AEC0" }}>Visible dans le feed de tes abonnés</p>
              </motion.div>
            ) : (
              <>
                {/* ── Header ── */}
                <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b" style={{ borderColor: "rgba(167,139,250,0.1)" }}>
                  <div>
                    <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: "#A0AEC0" }}>Partager</p>
                    <p className="text-base font-light" style={{ color: "#2D3748" }}>Aperçu de la carte</p>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.9 }} onClick={onClose}
                    className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer"
                    style={{ background: "rgba(240,235,255,0.6)" }}
                  >
                    <X size={15} strokeWidth={1.5} style={{ color: "#A0AEC0" }} />
                  </motion.button>
                </div>

                {/* ── Card preview ── */}
                <div className="px-5 pt-4 pb-0">
                  <PerformanceCard
                    data={data}
                    size="md"
                    customBgImage={customBgImage}
                    photoFilter={cssFilter}
                    heroIndex={heroIndex}
                    shownIndices={shownIndices}
                  />
                </div>

                {/* ── Filters (photo mode) — directly below card ── */}
                {customBgImage ? (
                  <div className="pt-3 pb-1">
                    {/* Filter strip */}
                    <div
                      className="flex gap-3 px-5 pb-1"
                      style={{ overflowX: "auto", scrollbarWidth: "none", WebkitOverflowScrolling: "touch" } as React.CSSProperties}
                    >
                      {/* Aucun */}
                      <button
                        onClick={() => setPhotoFilterKey(undefined)}
                        className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer"
                      >
                        <div
                          className="relative overflow-hidden"
                          style={{
                            width: 52, height: 52, borderRadius: 11,
                            boxShadow: !photoFilterKey ? "0 0 0 2.5px #A78BFA" : "0 1px 6px rgba(0,0,0,0.16)",
                          }}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={customBgImage} alt="" className="w-full h-full object-cover" />
                          {!photoFilterKey && (
                            <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(167,139,250,0.22)" }}>
                              <Check size={13} strokeWidth={3} style={{ color: "#fff" }} />
                            </div>
                          )}
                        </div>
                        <span style={{ fontSize: "0.5rem", fontWeight: 700, letterSpacing: "0.08em", color: !photoFilterKey ? "#A78BFA" : "#A0AEC0" }}>
                          Aucun
                        </span>
                      </button>

                      {PHOTO_FILTER_PRESETS.map(({ key, name, filter }) => {
                        const sel = photoFilterKey === key;
                        return (
                          <button
                            key={key}
                            onClick={() => setPhotoFilterKey(key)}
                            className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer"
                          >
                            <div
                              className="relative overflow-hidden"
                              style={{
                                width: 52, height: 52, borderRadius: 11,
                                boxShadow: sel ? "0 0 0 2.5px #A78BFA" : "0 1px 6px rgba(0,0,0,0.16)",
                              }}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={customBgImage} alt={name} className="w-full h-full object-cover" style={{ filter }} />
                              {sel && (
                                <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.15)" }}>
                                  <Check size={13} strokeWidth={3} style={{ color: "#fff" }} />
                                </div>
                              )}
                            </div>
                            <span style={{ fontSize: "0.5rem", fontWeight: 700, letterSpacing: "0.08em", color: sel ? "#A78BFA" : "#A0AEC0" }}>
                              {name}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Photo controls — simple, luxurious */}
                    <div className="flex items-center justify-center gap-1 pt-2 pb-1">
                      <motion.button
                        whileTap={{ scale: 0.94 }}
                        onClick={openFilePicker}
                        className="cursor-pointer px-4 py-1.5 rounded-full"
                        style={{ color: "#9B8EC4", fontSize: "0.75rem", fontWeight: 500, letterSpacing: "0.01em" }}
                      >
                        📷&ensp;Changer
                      </motion.button>
                      <span style={{ color: "#D1D5DB", fontSize: "0.65rem" }}>·</span>
                      <motion.button
                        whileTap={{ scale: 0.94 }}
                        onClick={() => { setCustomBgImage(undefined); setPhotoFilterKey(undefined); }}
                        className="cursor-pointer px-4 py-1.5 rounded-full"
                        style={{ color: "#C4A5A5", fontSize: "0.75rem", fontWeight: 500, letterSpacing: "0.01em" }}
                      >
                        🗑&ensp;Supprimer
                      </motion.button>
                    </div>
                  </div>
                ) : (
                  /* ── Add photo (no photo yet) ── */
                  <div className="px-5 pt-3 pb-1">
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      onClick={openFilePicker}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl cursor-pointer"
                      style={{
                        border:     "1.5px dashed rgba(167,139,250,0.22)",
                        background: "rgba(240,235,255,0.18)",
                        color:      "#B8A8E0",
                        fontSize:   "0.78rem",
                        fontWeight: 500,
                      }}
                    >
                      <span>📷</span>
                      <span>Ajouter une photo de fond</span>
                    </motion.button>
                  </div>
                )}

                {/* ── Divider ── */}
                <div className="mx-5 mt-3 mb-0 h-px" style={{ background: "rgba(167,139,250,0.08)" }} />

                {/* ── Valeurs affichées ── */}
                <div className="px-5 pt-3 pb-3">
                  <p className="text-[10px] font-bold tracking-widest uppercase mb-2.5" style={{ color: "#A0AEC0" }}>Valeurs affichées</p>
                  <div className="flex flex-col gap-1.5">
                    {data.metrics.map((m, idx) => {
                      const isHero    = idx === heroIndex;
                      const isVisible = isHero || visibleSubs.has(idx);
                      return (
                        <div
                          key={idx}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-2xl"
                          style={{
                            background: isHero ? "rgba(167,139,250,0.1)" : "rgba(0,0,0,0.03)",
                            border:     isHero ? "1px solid rgba(167,139,250,0.2)" : "1px solid rgba(0,0,0,0.05)",
                          }}
                        >
                          <motion.button
                            whileTap={{ scale: 0.82 }}
                            onClick={() => setHero(idx)}
                            title="Afficher en grand"
                            className="cursor-pointer flex-shrink-0"
                          >
                            <Star
                              size={15}
                              strokeWidth={isHero ? 0 : 1.5}
                              style={{ color: isHero ? "#D4A843" : "#D1D5DB" }}
                              fill={isHero ? "#D4A843" : "none"}
                            />
                          </motion.button>
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-medium truncate" style={{ color: "#2D3748" }}>{m.label}</span>
                            <span className="text-xs font-light ml-1.5" style={{ color: "#A0AEC0" }}>
                              {m.value}{m.unit ? ` ${m.unit}` : ""}
                            </span>
                          </div>
                          {isHero && (
                            <span className="text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: "rgba(212,168,67,0.15)", color: "#B45309" }}>
                              HERO
                            </span>
                          )}
                          {!isHero && (
                            <motion.button
                              whileTap={{ scale: 0.85 }}
                              onClick={() => toggleSub(idx)}
                              className="cursor-pointer flex-shrink-0"
                              title={isVisible ? "Masquer" : "Afficher"}
                            >
                              {isVisible
                                ? <Eye    size={15} strokeWidth={1.5} style={{ color: "#A78BFA" }} />
                                : <EyeOff size={15} strokeWidth={1.5} style={{ color: "#CBD5E0" }} />
                              }
                            </motion.button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[10px] mt-2" style={{ color: "#A0AEC0" }}>
                    ★ = valeur affichée en grand · 👁 = afficher/masquer
                  </p>
                </div>

                {/* ── Divider ── */}
                <div className="mx-5 h-px" style={{ background: "rgba(167,139,250,0.08)" }} />

                {/* ── Caption ── */}
                <div className="px-5 pt-3 pb-3">
                  <textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Ajouter une légende…"
                    rows={2}
                    maxLength={300}
                    className="w-full px-4 py-3 rounded-2xl text-sm font-light outline-none resize-none"
                    style={{
                      background: "rgba(240,235,255,0.4)",
                      border:     "1px solid rgba(167,139,250,0.15)",
                      color:      "#2D3748",
                    }}
                  />
                </div>

                {/* ── Audience ── */}
                <div className="px-5 pb-3 flex gap-2">
                  {audiences.map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      onClick={() => setAudience(id)}
                      className="flex-1 rounded-xl py-2 px-3 flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                      style={audience === id ? {
                        background: "linear-gradient(135deg, rgba(240,235,255,0.95), rgba(255,251,240,0.95))",
                        border:     "1px solid rgba(255,255,255,0.8)",
                        boxShadow:  "inset 0 1px 0 rgba(255,255,255,0.9)",
                      } : {
                        background: "rgba(240,235,255,0.3)",
                        border:     "1px solid rgba(167,139,250,0.1)",
                      }}
                    >
                      <Icon size={12} strokeWidth={1.5} style={{ color: audience === id ? "#A78BFA" : "#CBD5E0" }} />
                      <span className="text-[11px] font-medium" style={{ color: audience === id ? "#2D3748" : "#A0AEC0" }}>
                        {label}
                      </span>
                    </button>
                  ))}
                </div>

                {/* ── Error ── */}
                {error && (
                  <p className="px-5 pb-2 text-xs text-center" style={{ color: "#FC8181" }}>{error}</p>
                )}

                {/* ── Share button ── */}
                <div className="px-5 pb-5">
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={handleShare}
                    disabled={posting}
                    className="w-full rounded-2xl py-3.5 flex items-center justify-center gap-2 cursor-pointer"
                    style={{
                      background: "linear-gradient(135deg, #D4C0FF 0%, #F5E6A3 100%)",
                      boxShadow:  "inset 0 1px 0 rgba(255,255,255,0.9), 0 4px 16px rgba(167,139,250,0.25)",
                      opacity:    posting ? 0.7 : 1,
                    }}
                  >
                    {posting ? (
                      <motion.div
                        className="w-4 h-4 rounded-full border-2"
                        style={{ borderColor: "rgba(45,55,72,0.3)", borderTopColor: "#2D3748" }}
                        animate={{ rotate: 360 }}
                        transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                      />
                    ) : (
                      <Send size={14} strokeWidth={2} style={{ color: "#2D3748" }} />
                    )}
                    <span className="text-sm font-semibold" style={{ color: "#2D3748" }}>
                      {posting ? "Publication…" : "Partager la performance"}
                    </span>
                  </motion.button>
                </div>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
