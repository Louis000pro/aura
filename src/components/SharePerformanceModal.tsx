"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Lock, Globe, Users, Check, Camera, Trash2, AlignLeft, AlignCenter, Plus } from "lucide-react";
import PerformanceCard, { type PerformanceData, type FontStyle, PHOTO_FILTER_PRESETS } from "./PerformanceCard";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

type Audience = "public" | "friends" | "private";

const audiences: { id: Audience; label: string; icon: typeof Globe }[] = [
  { id: "public",  label: "Public", icon: Globe  },
  { id: "friends", label: "Amis",   icon: Users  },
  { id: "private", label: "Privé",  icon: Lock   },
];

const HERO_SIZES = [
  { key: "s" as const, scale: 0.72 },
  { key: "m" as const, scale: 1.0  },
  { key: "l" as const, scale: 1.38 },
];

const CORNER_RADII = [12, 24, 40];

type CustomMetric = { label: string; value: string; unit: string };

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

  /* ── Photo & filter ── */
  const [customBgImage,  setCustomBgImage]  = useState<string | undefined>(undefined);
  const [photoFilterKey, setPhotoFilterKey] = useState<string | undefined>(undefined);
  const photoInputRef = useRef<HTMLInputElement>(null);

  /* ── Metric editing ── */
  const [heroIndex,     setHeroIndex]     = useState(0);
  const [visibleSubs,   setVisibleSubs]   = useState<Set<number>>(
    () => new Set(data.metrics.map((_, i) => i).filter(i => i !== 0))
  );
  const [customMetrics, setCustomMetrics] = useState<CustomMetric[]>([]);

  /* ── Layout / style ── */
  const [heroSizeKey, setHeroSizeKey] = useState<"s" | "m" | "l">("m");
  const [heroAlign,   setHeroAlign]   = useState<"left" | "center">("left");
  const [fontStyle,   setFontStyle]   = useState<FontStyle>("regular");
  const [cardRadius,  setCardRadius]  = useState(24);
  const [showBadge,   setShowBadge]   = useState(true);
  const [showDate,    setShowDate]    = useState(true);
  const [showTitle,   setShowTitle]   = useState(true);
  const [showBranding,setShowBranding]= useState(true);

  /* Derived */
  const cssFilter     = PHOTO_FILTER_PRESETS.find(f => f.key === photoFilterKey)?.filter;
  const heroTextScale = HERO_SIZES.find(s => s.key === heroSizeKey)?.scale ?? 1.0;
  const shownIndices  = Array.from(visibleSubs).filter(i => i !== heroIndex);

  // Merged metrics: base + custom
  const mergedMetrics = [...data.metrics, ...customMetrics.map(cm => ({
    label: cm.label || "Label",
    value: cm.value || "—",
    unit:  cm.unit || undefined,
  }))];

  // Metrics hidden (not hero, not visible)
  const hiddenMetrics = mergedMetrics
    .map((m, i) => ({ m, idx: i }))
    .filter(({ idx }) => idx !== heroIndex && !visibleSubs.has(idx));

  /* ── Custom metric handlers ── */
  const addCustomMetric = () => {
    const newIdx = mergedMetrics.length;
    setCustomMetrics(prev => [...prev, { label: "", value: "", unit: "" }]);
    setVisibleSubs(prev => new Set([...prev, newIdx]));
  };

  const updateCustomMetric = (j: number, field: keyof CustomMetric, val: string) => {
    setCustomMetrics(prev => prev.map((cm, i) => i === j ? { ...cm, [field]: val } : cm));
  };

  const removeCustomMetric = (j: number) => {
    const removedIdx = data.metrics.length + j;
    setCustomMetrics(prev => prev.filter((_, i) => i !== j));
    setVisibleSubs(prev => {
      const n = new Set<number>();
      prev.forEach(idx => {
        if (idx === removedIdx) return;
        n.add(idx > removedIdx ? idx - 1 : idx);
      });
      return n;
    });
    setHeroIndex(prev => {
      if (prev === removedIdx) return 0;
      return prev > removedIdx ? prev - 1 : prev;
    });
  };

  /* ── Metric card callbacks ── */
  const handleMakeHero = (idx: number) => {
    const prev = heroIndex;
    setHeroIndex(idx);
    setVisibleSubs(s => {
      const n = new Set(s);
      n.delete(idx);
      n.add(prev);
      return n;
    });
  };

  const handleToggleSub = (idx: number) => {
    setVisibleSubs(s => {
      const n = new Set(s);
      n.has(idx) ? n.delete(idx) : n.add(idx);
      return n;
    });
  };

  /* ── Share ── */
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
      performance_data: { ...data, metrics: mergedMetrics },
    });
    setPosting(false);
    if (err) { console.error("share performance:", err); setError("Le partage a échoué, réessaie"); return; }
    setPosted(true);
    setTimeout(() => {
      setPosted(false);
      setCaption("");
      setAudience("friends");
      onClose();
    }, 1600);
  };

  /* ── Nav-bar icon button ── */
  const NavBtn = ({ icon: Icon, label: lbl, onClick, danger = false }: { icon: typeof Camera; label: string; onClick: () => void; danger?: boolean }) => (
    <motion.button whileTap={{ scale: 0.85 }} onClick={onClick}
      className="flex flex-col items-center gap-1 cursor-pointer">
      <Icon size={17} strokeWidth={1.5} style={{ color: danger ? "#C4A5A5" : "#B0A0D8" }} />
      <span style={{ fontSize: "0.44rem", fontWeight: 700, letterSpacing: "0.12em", color: danger ? "#C4A5A5" : "#B0A0D8" }}>{lbl}</span>
    </motion.button>
  );

  /* ── Toggle pill ── */
  const Pill = ({ label: lbl, active, onClick }: { label: string; active: boolean; onClick: () => void }) => (
    <motion.button whileTap={{ scale: 0.92 }} onClick={onClick}
      className="px-3 py-1 rounded-full cursor-pointer text-[10px] font-semibold tracking-wide"
      style={{
        background: active ? "rgba(167,139,250,0.16)" : "rgba(0,0,0,0.04)",
        border:     active ? "1px solid rgba(167,139,250,0.32)" : "1px solid rgba(0,0,0,0.06)",
        color:      active ? "#7C5CFA" : "#A0AEC0",
      }}>
      {lbl}
    </motion.button>
  );

  const Divider = () => <div className="mx-5 h-px" style={{ background: "rgba(167,139,250,0.08)" }} />;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} className="fixed inset-0 z-[100]"
            style={{ background: "rgba(240,235,255,0.4)", backdropFilter: "blur(12px)" }}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="fixed inset-x-4 bottom-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[440px] z-[110] rounded-3xl overflow-hidden"
            style={{
              background: "rgba(255,255,255,0.96)", backdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,0.9)",
              boxShadow: "0 32px 80px rgba(167,139,250,0.18), 0 8px 32px rgba(0,0,0,0.1)",
              maxHeight: "92vh", overflowY: "auto",
            }}
          >
            <input ref={photoInputRef} type="file" accept="image/*" className="hidden"
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
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                  transition={{ type: "spring", bounce: 0.5, delay: 0.1 }}
                  className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, #D4C0FF 0%, #F5E6A3 100%)" }}>
                  <Check size={24} strokeWidth={2} style={{ color: "#2D3748" }} />
                </motion.div>
                <p className="text-base font-medium" style={{ color: "#2D3748" }}>Publié !</p>
                <p className="text-xs font-light" style={{ color: "#A0AEC0" }}>Visible dans le feed de tes abonnés</p>
              </motion.div>
            ) : (
              <>
                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b" style={{ borderColor: "rgba(167,139,250,0.1)" }}>
                  <div>
                    <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: "#A0AEC0" }}>Partager</p>
                    <p className="text-base font-light" style={{ color: "#2D3748" }}>Aperçu de la carte</p>
                  </div>
                  <motion.button whileTap={{ scale: 0.9 }} onClick={onClose}
                    className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer"
                    style={{ background: "rgba(240,235,255,0.6)" }}>
                    <X size={15} strokeWidth={1.5} style={{ color: "#A0AEC0" }} />
                  </motion.button>
                </div>

                {/* ── Card preview ── */}
                <div className="px-5 pt-4 pb-0">
                  <PerformanceCard
                    data={{ ...data, metrics: mergedMetrics }}
                    size="md"
                    customBgImage={customBgImage}
                    photoFilter={cssFilter}
                    heroIndex={heroIndex}
                    shownIndices={shownIndices}
                    heroTextScale={heroTextScale}
                    heroAlign={heroAlign}
                    fontStyle={fontStyle}
                    cardRadius={cardRadius}
                    showBadge={showBadge}
                    showDate={showDate}
                    showTitle={showTitle}
                    showBranding={showBranding}
                    editMode
                    onMakeHero={handleMakeHero}
                    onToggleSub={handleToggleSub}
                  />
                </div>

                {/* ── Hidden metric chips ── */}
                {hiddenMetrics.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 px-5 pt-2.5">
                    {hiddenMetrics.map(({ m, idx }) => (
                      <motion.button key={idx} whileTap={{ scale: 0.94 }}
                        onClick={() => handleToggleSub(idx)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-full cursor-pointer"
                        style={{ border: "1px dashed rgba(167,139,250,0.35)", background: "rgba(240,235,255,0.3)", color: "#A78BFA", fontSize: "0.65rem", fontWeight: 600 }}>
                        <Plus size={8} strokeWidth={2.5} />
                        {m.label || "Sans titre"}
                      </motion.button>
                    ))}
                  </div>
                )}

                {/* ── Mise en page: size + align + corners ── */}
                <div className="flex items-center justify-between px-5 pt-3 pb-0 gap-2">
                  {/* Hero size */}
                  <div className="flex gap-1">
                    {HERO_SIZES.map(({ key, scale }) => (
                      <motion.button key={key} whileTap={{ scale: 0.88 }} onClick={() => setHeroSizeKey(key)}
                        className="flex items-center justify-center rounded-xl cursor-pointer"
                        style={{
                          width: 32, height: 26,
                          background: heroSizeKey === key ? "rgba(167,139,250,0.18)" : "rgba(240,235,255,0.4)",
                          border:     heroSizeKey === key ? "1px solid rgba(167,139,250,0.3)" : "1px solid rgba(167,139,250,0.1)",
                          fontSize:   scale < 1 ? "0.6rem" : scale > 1 ? "0.9rem" : "0.74rem",
                          fontWeight: 700, color: heroSizeKey === key ? "#7C5CFA" : "#A0AEC0",
                        }}>
                        Aa
                      </motion.button>
                    ))}
                  </div>

                  {/* Alignment */}
                  <div className="flex gap-1">
                    {([{ a: "left" as const, I: AlignLeft }, { a: "center" as const, I: AlignCenter }] as const).map(({ a, I }) => (
                      <motion.button key={a} whileTap={{ scale: 0.88 }} onClick={() => setHeroAlign(a)}
                        className="flex items-center justify-center rounded-xl cursor-pointer"
                        style={{ width: 32, height: 26, background: heroAlign === a ? "rgba(167,139,250,0.18)" : "rgba(240,235,255,0.4)", border: heroAlign === a ? "1px solid rgba(167,139,250,0.3)" : "1px solid rgba(167,139,250,0.1)" }}>
                        <I size={13} strokeWidth={1.8} style={{ color: heroAlign === a ? "#7C5CFA" : "#A0AEC0" }} />
                      </motion.button>
                    ))}
                  </div>

                  {/* Corner radius */}
                  <div className="flex gap-1.5 items-center">
                    {CORNER_RADII.map(r => (
                      <motion.button key={r} whileTap={{ scale: 0.88 }} onClick={() => setCardRadius(r)}
                        className="cursor-pointer"
                        style={{
                          width: 22, height: 22,
                          borderRadius: r / 2.5,
                          background: cardRadius === r ? "rgba(167,139,250,0.22)" : "rgba(240,235,255,0.5)",
                          border:     cardRadius === r ? "1.5px solid #A78BFA" : "1.5px solid rgba(167,139,250,0.18)",
                        }}
                      />
                    ))}
                  </div>
                </div>

                <div className="mx-5 mt-3 h-px" style={{ background: "rgba(167,139,250,0.08)" }} />

                {/* ── Éléments (show/hide + font) ── */}
                <div className="px-5 pt-3 pb-2">
                  <p className="text-[10px] font-bold tracking-widest uppercase mb-2.5" style={{ color: "#A0AEC0" }}>Éléments</p>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <Pill label="Badge"   active={showBadge}    onClick={() => setShowBadge(v => !v)} />
                    <Pill label="Date"    active={showDate}     onClick={() => setShowDate(v => !v)} />
                    <Pill label="Titre"   active={showTitle}    onClick={() => setShowTitle(v => !v)} />
                    <Pill label="✦ Vaiiya"  active={showBranding} onClick={() => setShowBranding(v => !v)} />
                  </div>

                  {/* Font style */}
                  <p className="text-[10px] font-bold tracking-widest uppercase mb-2" style={{ color: "#A0AEC0" }}>Police</p>
                  <div className="flex gap-1.5">
                    {([
                      { key: "light"   as FontStyle, fw: 300, label: "Léger"    },
                      { key: "regular" as FontStyle, fw: 700, label: "Normal"   },
                      { key: "bold"    as FontStyle, fw: 900, label: "Gras"     },
                    ] as const).map(({ key, fw, label: lbl }) => (
                      <motion.button key={key} whileTap={{ scale: 0.92 }} onClick={() => setFontStyle(key)}
                        className="flex-1 py-1.5 rounded-xl cursor-pointer"
                        style={{
                          background: fontStyle === key ? "rgba(167,139,250,0.18)" : "rgba(240,235,255,0.4)",
                          border:     fontStyle === key ? "1px solid rgba(167,139,250,0.3)" : "1px solid rgba(167,139,250,0.1)",
                          fontWeight: fw, fontSize: "0.72rem",
                          color: fontStyle === key ? "#7C5CFA" : "#A0AEC0",
                        }}>
                        {lbl}
                      </motion.button>
                    ))}
                  </div>
                </div>

                <Divider />

                {/* ── Données ── */}
                <div className="px-5 pt-3 pb-2">
                  <p className="text-[10px] font-bold tracking-widest uppercase mb-2.5" style={{ color: "#A0AEC0" }}>Données</p>

                  {/* Custom metric inputs */}
                  {customMetrics.map((cm, j) => (
                    <div key={j} className="flex gap-1.5 mb-2 items-center">
                      <input
                        value={cm.label}
                        onChange={(e) => updateCustomMetric(j, "label", e.target.value)}
                        placeholder="Label"
                        className="outline-none text-xs px-3 py-2 rounded-xl"
                        style={{ flex: 2, background: "rgba(240,235,255,0.4)", border: "1px solid rgba(167,139,250,0.15)", color: "#2D3748", minWidth: 0 }}
                      />
                      <input
                        value={cm.value}
                        onChange={(e) => updateCustomMetric(j, "value", e.target.value)}
                        placeholder="Valeur"
                        className="outline-none text-xs px-3 py-2 rounded-xl"
                        style={{ flex: 2, background: "rgba(240,235,255,0.4)", border: "1px solid rgba(167,139,250,0.15)", color: "#2D3748", minWidth: 0 }}
                      />
                      <input
                        value={cm.unit}
                        onChange={(e) => updateCustomMetric(j, "unit", e.target.value)}
                        placeholder="Unité"
                        className="outline-none text-xs px-3 py-2 rounded-xl"
                        style={{ flex: 1, background: "rgba(240,235,255,0.4)", border: "1px solid rgba(167,139,250,0.15)", color: "#2D3748", minWidth: 0 }}
                      />
                      <motion.button whileTap={{ scale: 0.85 }} onClick={() => removeCustomMetric(j)}
                        className="w-7 h-7 rounded-full flex items-center justify-center cursor-pointer flex-shrink-0"
                        style={{ background: "rgba(252,129,129,0.12)" }}>
                        <X size={11} strokeWidth={2.5} style={{ color: "#FC8181" }} />
                      </motion.button>
                    </div>
                  ))}

                  {/* Add button */}
                  <motion.button whileTap={{ scale: 0.97 }} onClick={addCustomMetric}
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-2xl cursor-pointer"
                    style={{ border: "1.5px dashed rgba(167,139,250,0.25)", background: "rgba(240,235,255,0.18)", color: "#A78BFA", fontSize: "0.75rem", fontWeight: 600 }}>
                    <Plus size={13} strokeWidth={2.5} />
                    Ajouter une donnée
                  </motion.button>
                </div>

                <Divider />

                {/* ── Photo section ── */}
                {customBgImage ? (
                  <div className="pt-3 pb-1">
                    <div className="flex gap-3 px-5 pb-1"
                      style={{ overflowX: "auto", scrollbarWidth: "none", WebkitOverflowScrolling: "touch" } as React.CSSProperties}>
                      {/* Aucun */}
                      <button onClick={() => setPhotoFilterKey(undefined)}
                        className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer">
                        <div className="relative overflow-hidden" style={{ width: 52, height: 52, borderRadius: 11, boxShadow: !photoFilterKey ? "0 0 0 2.5px #A78BFA" : "0 1px 6px rgba(0,0,0,0.16)" }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img loading="lazy" decoding="async" src={customBgImage} alt="" className="w-full h-full object-cover" />
                          {!photoFilterKey && <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(167,139,250,0.22)" }}><Check size={13} strokeWidth={3} style={{ color: "#fff" }} /></div>}
                        </div>
                        <span style={{ fontSize: "0.5rem", fontWeight: 700, letterSpacing: "0.08em", color: !photoFilterKey ? "#A78BFA" : "#A0AEC0" }}>Aucun</span>
                      </button>

                      {PHOTO_FILTER_PRESETS.map(({ key, name, filter }) => {
                        const sel = photoFilterKey === key;
                        return (
                          <button key={key} onClick={() => setPhotoFilterKey(key)}
                            className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer">
                            <div className="relative overflow-hidden" style={{ width: 52, height: 52, borderRadius: 11, boxShadow: sel ? "0 0 0 2.5px #A78BFA" : "0 1px 6px rgba(0,0,0,0.16)" }}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img loading="lazy" decoding="async" src={customBgImage} alt={name} className="w-full h-full object-cover" style={{ filter }} />
                              {sel && <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.15)" }}><Check size={13} strokeWidth={3} style={{ color: "#fff" }} /></div>}
                            </div>
                            <span style={{ fontSize: "0.5rem", fontWeight: 700, letterSpacing: "0.08em", color: sel ? "#A78BFA" : "#A0AEC0" }}>{name}</span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex items-center justify-center gap-8 pt-2.5 pb-1">
                      <NavBtn icon={Camera} label="CHANGER" onClick={() => photoInputRef.current?.click()} />
                      <NavBtn icon={Trash2} label="SUPPRIMER" danger onClick={() => { setCustomBgImage(undefined); setPhotoFilterKey(undefined); }} />
                    </div>
                  </div>
                ) : (
                  <div className="px-5 pt-3 pb-1">
                    <motion.button whileTap={{ scale: 0.98 }} onClick={() => photoInputRef.current?.click()}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl cursor-pointer"
                      style={{ border: "1.5px dashed rgba(167,139,250,0.22)", background: "rgba(240,235,255,0.18)", color: "#B8A8E0", fontSize: "0.78rem", fontWeight: 500 }}>
                      <Camera size={14} strokeWidth={1.5} />
                      <span>Ajouter une photo de fond</span>
                    </motion.button>
                  </div>
                )}

                <div className="mx-5 mt-3 h-px" style={{ background: "rgba(167,139,250,0.08)" }} />

                {/* Caption */}
                <div className="px-5 pt-3 pb-3">
                  <textarea value={caption} onChange={(e) => setCaption(e.target.value)}
                    placeholder="Ajouter une légende…" rows={2} maxLength={300}
                    className="w-full px-4 py-3 rounded-2xl text-sm font-light outline-none resize-none"
                    style={{ background: "rgba(240,235,255,0.4)", border: "1px solid rgba(167,139,250,0.15)", color: "#2D3748" }} />
                </div>

                {/* Audience */}
                <div className="px-5 pb-3 flex gap-2">
                  {audiences.map(({ id, label, icon: Icon }) => (
                    <button key={id} onClick={() => setAudience(id)}
                      className="flex-1 rounded-xl py-2 px-3 flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                      style={audience === id ? { background: "linear-gradient(135deg, rgba(240,235,255,0.95), rgba(255,251,240,0.95))", border: "1px solid rgba(255,255,255,0.8)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)" } : { background: "rgba(240,235,255,0.3)", border: "1px solid rgba(167,139,250,0.1)" }}>
                      <Icon size={12} strokeWidth={1.5} style={{ color: audience === id ? "#A78BFA" : "#CBD5E0" }} />
                      <span className="text-[11px] font-medium" style={{ color: audience === id ? "#2D3748" : "#A0AEC0" }}>{label}</span>
                    </button>
                  ))}
                </div>

                {error && <p className="px-5 pb-2 text-xs text-center" style={{ color: "#FC8181" }}>{error}</p>}

                {/* Share */}
                <div className="px-5 pb-5">
                  <motion.button whileTap={{ scale: 0.97 }} onClick={handleShare} disabled={posting}
                    className="w-full rounded-2xl py-3.5 flex items-center justify-center gap-2 cursor-pointer"
                    style={{ background: "linear-gradient(135deg, #D4C0FF 0%, #F5E6A3 100%)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9), 0 4px 16px rgba(167,139,250,0.25)", opacity: posting ? 0.7 : 1 }}>
                    {posting ? (
                      <motion.div className="w-4 h-4 rounded-full border-2"
                        style={{ borderColor: "rgba(45,55,72,0.3)", borderTopColor: "#2D3748" }}
                        animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} />
                    ) : <Send size={14} strokeWidth={2} style={{ color: "#2D3748" }} />}
                    <span className="text-sm font-semibold" style={{ color: "#2D3748" }}>{posting ? "Publication…" : "Partager la performance"}</span>
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
