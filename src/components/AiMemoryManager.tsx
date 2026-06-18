"use client";

/* ════════════════════════════════════════════════════════════════════
   AiMemoryManager — « Ce que l'IA retient de toi ».

   Modale de gestion de la mémoire long terme : l'utilisateur voit tous
   les faits que l'assistant a retenus, peut en supprimer un par un ou
   tout effacer. Transparence + contrôle (RGPD). Thématisé via tokens.
   ════════════════════════════════════════════════════════════════════ */

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { X, Trash2, Sparkles } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase";
import {
  MEMORY_CATEGORY_LABEL, MEMORY_CATEGORY_EMOJI, normalizeCategory, type AiMemory,
} from "@/lib/aiMemory";

export default function AiMemoryManager({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const [memories, setMemories] = useState<AiMemory[]>([]);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }
    const supabase = createClient();
    supabase
      .from("ai_memories")
      .select("id, content, category, source, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => { setMemories((data ?? []) as AiMemory[]); setLoading(false); });
  }, [user?.id]);

  const removeOne = async (id: string) => {
    setMemories((prev) => prev.filter((m) => m.id !== id));
    const supabase = createClient();
    await supabase.from("ai_memories").delete().eq("id", id);
  };

  const clearAll = async () => {
    if (!user?.id || memories.length === 0) return;
    if (!window.confirm("Effacer tout ce que l'IA retient sur toi ? Cette action est définitive.")) return;
    setClearing(true);
    const supabase = createClient();
    await supabase.from("ai_memories").delete().eq("user_id", user.id);
    setMemories([]);
    setClearing(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center px-4 pb-0 md:pb-0"
      style={{ background: "rgba(0,0,0,0.25)", backdropFilter: "blur(10px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 80, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 40, scale: 0.97 }}
        transition={{ type: "spring", bounce: 0.28, duration: 0.5 }}
        className="w-full max-w-md rounded-t-3xl md:rounded-3xl overflow-hidden flex flex-col"
        style={{ background: "rgba(var(--surface-rgb),0.97)", backdropFilter: "blur(12px)", border: "1px solid rgba(var(--surface-rgb),0.9)", boxShadow: "0 20px 60px rgba(var(--accent-rgb),0.18), inset 0 1px 0 rgba(var(--surface-rgb),0.9)", maxHeight: "90dvh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: "linear-gradient(135deg, var(--violet-mid), var(--cream-mid))" }}>
              <Sparkles size={16} strokeWidth={1.6} style={{ color: "#fff" }} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold" style={{ color: "var(--text-1)" }}>Ce que l'IA retient de toi</h2>
              <p className="text-xs font-light mt-0.5" style={{ color: "var(--text-3)" }}>Pour mieux te coacher, partout</p>
            </div>
          </div>
          <motion.button whileTap={{ scale: 0.9 }} onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer flex-shrink-0" style={{ background: "rgba(var(--tint-violet-rgb),0.8)" }}>
            <X size={14} strokeWidth={2} style={{ color: "var(--text-3)" }} />
          </motion.button>
        </div>

        {/* Liste */}
        <div className="overflow-y-auto flex-1 px-5 pb-3" style={{ scrollbarWidth: "none" }}>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <motion.div className="w-8 h-8 rounded-full border-2" style={{ borderColor: "var(--violet-mid)", borderTopColor: "var(--accent)" }}
                animate={{ rotate: 360 }} transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }} />
            </div>
          ) : memories.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 px-4 text-center">
              <div className="w-14 h-14 rounded-[22px] flex items-center justify-center" style={{ background: "rgba(var(--tint-violet-rgb),0.7)" }}>
                <Sparkles size={24} strokeWidth={1.4} style={{ color: "var(--accent)" }} />
              </div>
              <p className="text-sm font-medium" style={{ color: "var(--text-1)" }}>Je n'ai encore rien retenu</p>
              <p className="text-xs font-light leading-relaxed" style={{ color: "var(--text-3)" }}>
                Parle-moi normalement : confie-moi une blessure, ton régime ou ton planning — ou dis-moi simplement « retiens ça » — et je m'en souviendrai à chaque fois qu'on se parle. 💜
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2 py-1">
              {memories.map((m) => {
                const cat = normalizeCategory(m.category);
                return (
                  <motion.div
                    key={m.id}
                    layout
                    initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-3 px-3.5 py-3 rounded-2xl"
                    style={{ background: "rgba(var(--surface-rgb),0.7)", border: "1px solid rgba(var(--accent-rgb),0.10)", boxShadow: "0 2px 8px rgba(var(--accent-rgb),0.04)" }}
                  >
                    <span className="text-base leading-none mt-0.5 flex-shrink-0" aria-hidden>{MEMORY_CATEGORY_EMOJI[cat]}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-light leading-snug" style={{ color: "var(--text-1)" }}>{m.content}</p>
                      <p className="text-[10px] font-semibold tracking-wide uppercase mt-1" style={{ color: "var(--text-3)" }}>
                        {MEMORY_CATEGORY_LABEL[cat]}{m.source === "user" ? " · à ta demande" : ""}
                      </p>
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.88 }}
                      onClick={() => removeOne(m.id)}
                      aria-label="Oublier"
                      className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer flex-shrink-0"
                      style={{ background: "rgba(254,226,226,0.4)" }}
                    >
                      <Trash2 size={14} strokeWidth={1.7} style={{ color: "#EF4444" }} />
                    </motion.button>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {!loading && memories.length > 0 && (
          <div className="flex-shrink-0 px-5 pb-6 pt-3" style={{ borderTop: "1px solid rgba(var(--violet-mid-rgb),0.25)" }}>
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={clearAll}
              disabled={clearing}
              className="w-full py-3 rounded-2xl text-sm font-semibold cursor-pointer flex items-center justify-center gap-2"
              style={{ background: "rgba(254,226,226,0.45)", border: "1px solid rgba(252,165,165,0.35)", color: "#EF4444" }}
            >
              <Trash2 size={15} strokeWidth={1.8} />
              {clearing ? "Suppression…" : "Tout effacer"}
            </motion.button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
