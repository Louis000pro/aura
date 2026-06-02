"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Volume2, VolumeX, MoreHorizontal, Trash2, Plus } from "lucide-react";

export type HighlightItem = {
  id: string;
  media_url: string | null;
  media_type: string | null;
  caption?: string | null;
  content_type?: string | null;
  content_data?: Record<string, unknown> | null;
};

export type HighlightViewData = {
  id: string;
  name: string;
  cover_url?: string | null;
  items: HighlightItem[];
};

export default function StoryHighlightViewer({
  highlight,
  isOwner = false,
  onClose,
  onDeleteItem,
  onAddItems,
}: {
  highlight: HighlightViewData;
  isOwner?: boolean;
  onClose: () => void;
  onDeleteItem?: (itemId: string) => Promise<void>;
  onAddItems?: () => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [paused, setPaused]   = useState(false);
  const [muted, setMuted]     = useState(true);
  const [progress, setProgress] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const videoRef      = useRef<HTMLVideoElement>(null);
  const holdTimer     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isHolding     = useRef(false);
  const pointerStart  = useRef<{ x: number; y: number } | null>(null);
  const intervalRef   = useRef<ReturnType<typeof setInterval> | null>(null);

  const STEP_MS   = 5000;
  const TICK_MS   = 80;
  const INCREMENT = 100 / (STEP_MS / TICK_MS);

  const items   = highlight.items;
  const current = items[currentIndex];

  /* ─── Navigation ─── */
  const goNext = useCallback(() => {
    if (currentIndex < items.length - 1) {
      setCurrentIndex((i) => i + 1);
      setProgress(0);
    } else {
      onClose();
    }
  }, [currentIndex, items.length, onClose]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
      setProgress(0);
    }
  }, [currentIndex]);

  /* ─── Reset on item change ─── */
  useEffect(() => {
    setProgress(0);
    setShowMenu(false);
    if (current?.media_type === "video" && videoRef.current) {
      videoRef.current.currentTime = 0;
      void videoRef.current.play().catch(() => {});
    }
  }, [currentIndex, current?.media_type]);

  /* ─── Auto-progress (images only) ─── */
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (paused || current?.media_type === "video") return;

    intervalRef.current = setInterval(() => {
      setProgress((p) => {
        const next = p + INCREMENT;
        if (next >= 100) { goNext(); return 0; }
        return next;
      });
    }, TICK_MS);

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [paused, currentIndex, goNext, current?.media_type, INCREMENT]);

  /* ─── Pointer events (hold=pause / tap=navigate) ─── */
  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("[data-interactive]")) return;
    isHolding.current  = false;
    pointerStart.current = { x: e.clientX, y: e.clientY };
    holdTimer.current  = setTimeout(() => {
      isHolding.current = true;
      setPaused(true);
    }, 200);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("[data-interactive]")) return;
    if (holdTimer.current) { clearTimeout(holdTimer.current); holdTimer.current = null; }
    if (isHolding.current) { isHolding.current = false; setPaused(false); return; }
    const start = pointerStart.current;
    if (!start) return;
    const dx = Math.abs(e.clientX - start.x);
    const dy = Math.abs(e.clientY - start.y);
    if (dx < 14 && dy < 14) {
      const rect = e.currentTarget.getBoundingClientRect();
      if (e.clientX - rect.left < rect.width / 2) goPrev();
      else goNext();
    }
    pointerStart.current = null;
  };

  const handlePointerLeave = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    if (isHolding.current) { isHolding.current = false; setPaused(false); }
  };

  const handleDeleteItem = async () => {
    if (!onDeleteItem || !current) return;
    setDeleting(true);
    setShowMenu(false);
    await onDeleteItem(current.id);
    setDeleting(false);
    // If we deleted the last item, close
    if (items.length <= 1) { onClose(); return; }
    if (currentIndex >= items.length - 1) setCurrentIndex(items.length - 2);
  };

  /* ─── Empty state ─── */
  if (!current) return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[500] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.97)" }}
    >
      <div className="flex flex-col items-center gap-4 text-center px-8">
        <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.08)" }}>
          <Plus size={28} strokeWidth={1.5} style={{ color: "rgba(255,255,255,0.5)" }} />
        </div>
        <p className="text-white/60 text-sm">Aucun média dans cette story</p>
        {onAddItems && (
          <button
            onClick={onAddItems}
            className="px-5 py-2.5 rounded-2xl text-sm font-semibold"
            style={{ background: "linear-gradient(135deg,#C4A8FF,#F5E6A3)", color: "#3D2F6B" }}
          >
            Ajouter des médias
          </button>
        )}
        <button onClick={onClose} className="text-white/40 text-sm mt-1">Fermer</button>
      </div>
    </motion.div>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[500] flex items-center justify-center bg-black"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
    >
      <div
        className="relative w-full max-w-sm overflow-hidden select-none"
        style={{ height: "100dvh" }}
      >
        {/* ─── Media ─── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="absolute inset-0"
          >
            {current.media_url && current.media_type === "video" ? (
              <video
                ref={videoRef}
                src={current.media_url}
                className="w-full h-full object-cover"
                muted={muted}
                playsInline
                autoPlay
                preload="auto"
                onEnded={goNext}
                onTimeUpdate={(e) => {
                  const v = e.currentTarget;
                  if (v.duration) setProgress((v.currentTime / v.duration) * 100);
                }}
              />
            ) : current.media_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={current.media_url}
                alt=""
                className="w-full h-full object-cover"
                draggable={false}
              />
            ) : (
              /* Story sans média — texte / repas / séance */
              <div
                className="absolute inset-0 flex flex-col items-center justify-center px-8"
                style={{
                  background: current.content_type === "meal"
                    ? "linear-gradient(135deg,#1A3A2A 0%,#0D2A1A 100%)"
                    : current.content_type === "workout"
                    ? "linear-gradient(135deg,#1A0A35 0%,#3D1A6B 100%)"
                    : "linear-gradient(135deg,#1A0A35 0%,#3D2F6B 60%,#2D1F50 100%)",
                }}
              >
                <div className="text-center">
                  <div className="text-5xl mb-5">
                    {current.content_type === "meal" ? "🍽️"
                      : current.content_type === "workout" ? "💪"
                      : "✍️"}
                  </div>
                  <div
                    className="inline-block px-4 py-1.5 rounded-full text-xs font-bold mb-5 tracking-widest uppercase"
                    style={{ background: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.7)" }}
                  >
                    {current.content_type === "meal" ? "Repas"
                      : current.content_type === "workout" ? "Séance"
                      : "Story"}
                  </div>
                  {current.caption && (
                    <p className="text-white text-xl font-semibold leading-relaxed">
                      {current.caption}
                    </p>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* ─── Gradients ─── */}
        <div className="absolute inset-x-0 top-0 h-36 pointer-events-none z-10"
          style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)" }} />
        <div className="absolute inset-x-0 bottom-0 h-32 pointer-events-none z-10"
          style={{ background: "linear-gradient(to top, rgba(0,0,0,0.6), transparent)" }} />

        {/* ─── Progress bars ─── */}
        <div className="absolute top-12 inset-x-3 flex gap-1 z-20" data-interactive>
          {items.map((_, i) => (
            <div key={i} className="flex-1 h-[2px] rounded-full overflow-hidden"
              style={{ background: "rgba(255,255,255,0.28)" }}>
              <div
                className="h-full rounded-full"
                style={{
                  background: "white",
                  width: i < currentIndex ? "100%" : i === currentIndex ? `${progress}%` : "0%",
                  transition: i === currentIndex && !paused ? `width ${TICK_MS}ms linear` : "none",
                }}
              />
            </div>
          ))}
        </div>

        {/* ─── Header ─── */}
        <div className="absolute top-[60px] inset-x-3 flex items-center justify-between z-20" data-interactive>
          <div className="flex items-center gap-2">
            <span className="text-white font-bold text-sm drop-shadow-md">{highlight.name}</span>
            <span className="text-white/50 text-xs">{currentIndex + 1} / {items.length}</span>
          </div>
          <div className="flex items-center gap-1.5">
            {current.media_type === "video" && (
              <button
                data-interactive
                onClick={(e) => { e.stopPropagation(); setMuted((m) => !m); }}
                className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer"
                style={{ background: "rgba(0,0,0,0.38)", backdropFilter: "blur(8px)" }}
              >
                {muted
                  ? <VolumeX size={13} strokeWidth={2} style={{ color: "white" }} />
                  : <Volume2 size={13} strokeWidth={2} style={{ color: "white" }} />}
              </button>
            )}
            {isOwner && (
              <button
                data-interactive
                onClick={(e) => { e.stopPropagation(); setShowMenu((m) => !m); setPaused(true); }}
                className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer"
                style={{ background: "rgba(0,0,0,0.38)", backdropFilter: "blur(8px)" }}
              >
                <MoreHorizontal size={15} strokeWidth={2} style={{ color: "white" }} />
              </button>
            )}
            <button
              data-interactive
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer"
              style={{ background: "rgba(0,0,0,0.38)", backdropFilter: "blur(8px)" }}
            >
              <X size={14} strokeWidth={2.5} style={{ color: "white" }} />
            </button>
          </div>
        </div>

        {/* ─── Owner menu ─── */}
        <AnimatePresence>
          {showMenu && (
            <motion.div
              data-interactive
              initial={{ opacity: 0, scale: 0.9, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -8 }}
              transition={{ type: "spring", bounce: 0.2, duration: 0.25 }}
              className="absolute top-[100px] right-3 z-30 rounded-2xl overflow-hidden min-w-[200px]"
              style={{
                background: "rgba(20,20,25,0.96)",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(255,255,255,0.1)",
                boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
              }}
            >
              {onAddItems && (
                <button
                  data-interactive
                  onClick={(e) => { e.stopPropagation(); setShowMenu(false); setPaused(false); onAddItems(); }}
                  className="flex items-center gap-3 px-4 py-3.5 w-full text-left text-sm text-white/90 hover:bg-white/8 transition-colors"
                >
                  <Plus size={14} strokeWidth={2} />
                  Ajouter des médias
                </button>
              )}
              {onDeleteItem && (
                <>
                  <div style={{ height: 1, background: "rgba(255,255,255,0.07)" }} />
                  <button
                    data-interactive
                    onClick={(e) => { e.stopPropagation(); void handleDeleteItem(); }}
                    disabled={deleting}
                    className="flex items-center gap-3 px-4 py-3.5 w-full text-left text-sm transition-colors"
                    style={{ color: deleting ? "rgba(239,68,68,0.45)" : "#EF4444" }}
                  >
                    <Trash2 size={14} strokeWidth={2} />
                    {deleting ? "Suppression…" : "Supprimer ce média"}
                  </button>
                </>
              )}
              <div style={{ height: 1, background: "rgba(255,255,255,0.07)" }} />
              <button
                data-interactive
                onClick={(e) => { e.stopPropagation(); setShowMenu(false); setPaused(false); }}
                className="flex items-center px-4 py-3.5 w-full text-left text-sm"
                style={{ color: "rgba(255,255,255,0.4)" }}
              >
                Annuler
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Caption ─── */}
        {current.caption && (
          <div className="absolute bottom-8 inset-x-4 z-20 pointer-events-none">
            <p className="text-white text-sm text-center leading-relaxed drop-shadow-lg"
              style={{ textShadow: "0 1px 8px rgba(0,0,0,0.8)" }}>
              {current.caption}
            </p>
          </div>
        )}

        {/* ─── Pause indicator ─── */}
        <AnimatePresence>
          {paused && !showMenu && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none"
            >
              <div className="w-14 h-14 rounded-full flex items-center justify-center gap-1.5"
                style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(8px)" }}>
                <div className="w-[3px] h-6 rounded-full bg-white" />
                <div className="w-[3px] h-6 rounded-full bg-white" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
