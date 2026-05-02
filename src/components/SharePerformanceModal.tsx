"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Lock, Globe, Users } from "lucide-react";
import PerformanceCard, { type PerformanceData } from "./PerformanceCard";

type Audience = "public" | "friends" | "private";

const audiences: { id: Audience; label: string; icon: typeof Globe; color: string }[] = [
  { id: "public", label: "Public", icon: Globe, color: "#7ED8D8" },
  { id: "friends", label: "Amis", icon: Users, color: "#F9A8C9" },
  { id: "private", label: "Privé", icon: Lock, color: "#A0AEC0" },
];

export default function SharePerformanceModal({
  open,
  onClose,
  data,
}: {
  open: boolean;
  onClose: () => void;
  data: PerformanceData;
}) {
  const [caption, setCaption] = useState("");
  const [audience, setAudience] = useState<Audience>("friends");
  const [posted, setPosted] = useState(false);

  const handleShare = () => {
    setPosted(true);
    setTimeout(() => {
      setPosted(false);
      setCaption("");
      onClose();
    }, 1600);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[100]"
            style={{ background: "rgba(255,240,245,0.4)", backdropFilter: "blur(12px)" }}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="fixed inset-x-4 bottom-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[420px] z-[110] lg-strong lg-highlight rounded-3xl overflow-hidden"
          >
            {posted ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-12 flex flex-col items-center justify-center gap-3"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", bounce: 0.5, delay: 0.1 }}
                  className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, #FFD6E7 0%, #B2F0F0 100%)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)" }}
                >
                  <Send size={24} strokeWidth={1.5} style={{ color: "#2D3748" }} />
                </motion.div>
                <p className="text-base font-medium" style={{ color: "#2D3748" }}>
                  Partagé avec succès
                </p>
                <p className="text-xs font-light" style={{ color: "#A0AEC0" }}>
                  Votre performance est visible
                </p>
              </motion.div>
            ) : (
              <>
                {/* Header */}
                <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-white/40">
                  <div>
                    <p className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: "#A0AEC0" }}>
                      Partager
                    </p>
                    <p className="text-base font-light" style={{ color: "#2D3748" }}>
                      Aperçu de la carte
                    </p>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={onClose}
                    className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer"
                    style={{ background: "rgba(255,240,245,0.5)" }}
                    aria-label="Fermer"
                  >
                    <X size={15} strokeWidth={1.5} style={{ color: "#A0AEC0" }} />
                  </motion.button>
                </div>

                {/* Card preview */}
                <div className="p-5">
                  <PerformanceCard data={data} size="md" />
                </div>

                {/* Caption */}
                <div className="px-5 pb-3">
                  <textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Ajouter une légende…"
                    rows={2}
                    className="w-full px-4 py-3 rounded-2xl text-sm font-light outline-none resize-none"
                    style={{
                      background: "rgba(255,255,255,0.6)",
                      border: "1px solid rgba(255,255,255,0.7)",
                      color: "#2D3748",
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8)",
                    }}
                  />
                </div>

                {/* Audience */}
                <div className="px-5 pb-3 flex gap-2">
                  {audiences.map(({ id, label, icon: Icon, color }) => (
                    <button
                      key={id}
                      onClick={() => setAudience(id)}
                      className="flex-1 rounded-xl py-2 px-3 flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                      style={
                        audience === id
                          ? {
                              background: "linear-gradient(135deg, rgba(255,240,245,0.95) 0%, rgba(224,255,255,0.95) 100%)",
                              border: "1px solid rgba(255,255,255,0.8)",
                              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)",
                            }
                          : {
                              background: "rgba(255,255,255,0.4)",
                              border: "1px solid rgba(255,255,255,0.5)",
                            }
                      }
                    >
                      <Icon size={12} strokeWidth={1.5} style={{ color: audience === id ? color : "#A0AEC0" }} />
                      <span className="text-[11px] font-medium" style={{ color: audience === id ? "#2D3748" : "#A0AEC0" }}>
                        {label}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Action */}
                <div className="px-5 pb-5">
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={handleShare}
                    className="w-full rounded-2xl py-3.5 flex items-center justify-center gap-2 cursor-pointer relative overflow-hidden"
                    style={{
                      background: "linear-gradient(135deg, #FFD6E7 0%, #B2F0F0 100%)",
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9), 0 4px 16px rgba(249,168,201,0.25)",
                    }}
                  >
                    <Send size={14} strokeWidth={2} style={{ color: "#2D3748" }} />
                    <span className="text-sm font-semibold" style={{ color: "#2D3748" }}>
                      Partager la performance
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
