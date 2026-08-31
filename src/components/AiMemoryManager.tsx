"use client";

/* ════════════════════════════════════════════════════════════════════
   AiMemoryManager — « Ce que je retiens de toi ».

   Tout ce que le Guide a retenu, visible et retirable un par un. C'est la
   preuve la plus forte que quelqu'un t'accompagne vraiment : ce n'est pas
   un ton, c'est du contenu, et il vient de toi. On peut en retirer un à
   tout moment, sinon ce n'est plus de la mémoire, c'est un dossier
   (transparence + contrôle, RGPD).

   ⚠️ L'ÉCRAN A UN VISAGE, ET UN SEUL. La pastille ✦ générique de
   l'en-tête devient celui du Guide, parce que cette mémoire est la
   sienne. L'état vide n'en repose PAS un deuxième plus bas : un seul
   Guide visible par écran, sinon c'est une mascotte.

   ⚠️ LE TITRE RESTE ICI, LES PHRASES NON. « Ce que je retiens de toi »
   est un en-tête d'écran, identique pour les deux Guides : même
   arbitrage que « On mange où ? ». Ses deux vraies paroles, la promesse
   du bas et l'invitation de l'état vide, vivent dans `guides.ts`.

   ⚠️ « OUBLIER » S'ÉCRIT. La corbeille rouge par ligne faisait d'un
   retrait une suppression dangereuse ; retirer un souvenir est un geste
   normal, et le mot le dit mieux que l'icône. « Tout effacer » garde le
   sien : celui-là est bien irréversible en un clic.

   Sans Guide résolu, `VisageGuide` retombe sur l'étincelle ✦ et `voix`
   sur le texte commun.
   ════════════════════════════════════════════════════════════════════ */

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { X, Trash2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { VisageGuide } from "@/components/AssistantMark";
import { useGuideActif } from "@/context/GuideContext";
import { voix } from "@/lib/guides";
import { createClient } from "@/lib/supabase";
import {
  MEMORY_CATEGORY_LABEL, MEMORY_CATEGORY_EMOJI, normalizeCategory, type AiMemory,
} from "@/lib/aiMemory";

export default function AiMemoryManager({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const { guide } = useGuideActif();
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
    if (!window.confirm("Effacer tout ce que ton Guide retient sur toi ? Cette action est définitive.")) return;
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
            {/* Le visage prend la place de la pastille ✦ : cette mémoire est
                la sienne. `listen` tant qu'il n'a rien retenu (il attend que
                tu lui dises), `explain` dès qu'il a de quoi te montrer.
                L'état se déduit de la liste, jamais du texte. */}
            <VisageGuide guide={guide} etat={!loading && memories.length === 0 ? "listen" : "explain"} size={38} />
            <h2 className="text-base font-semibold min-w-0" style={{ color: "var(--text-1)" }}>Ce que je retiens de toi</h2>
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
            /* Pas de deuxième visage ici : celui de l'en-tête est juste
               au-dessus, et il dit déjà que c'est lui qui parle. */
            <div className="py-10 px-4">
              <p className="text-[13.5px] font-light leading-relaxed" style={{ color: "var(--text-2)" }}>
                {voix(guide, "memoire.vide")}
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
                      whileTap={{ scale: 0.94 }}
                      onClick={() => removeOne(m.id)}
                      type="button"
                      className="mt-0.5 px-1 text-[11.5px] font-semibold cursor-pointer flex-shrink-0"
                      style={{ color: "var(--text-3)" }}
                    >
                      Oublier
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
            {/* Sa promesse. Elle ne s'affiche qu'avec la liste : sur l'écran
                vide, l'invitation du dessus est déjà sa phrase. */}
            <p className="mb-3 text-[11.5px] font-light leading-snug" style={{ color: "var(--text-3)" }}>
              {voix(guide, "memoire.ecran")}
            </p>
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
