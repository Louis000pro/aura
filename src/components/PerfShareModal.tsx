"use client";

/* ════════════════════════════════════════════════════════════════════
   PerfShareModal — plein écran : aperçu de la carte de perf + partage.

   Montre PerfShareCard puis « Enregistrer / Partager » (sharePerfCard :
   partage natif mobile si dispo, sinon téléchargement du PNG 1080×1920).
   S'ouvre via PerfShareButton depuis fin de séance / feed / profil.
   ════════════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { motion } from "framer-motion";
import { X, Share2 } from "lucide-react";
import PerfShareCard from "@/components/PerfShareCard";
import { sharePerfCard, type PerfShareData } from "@/lib/perfShareExport";

export default function PerfShareModal({ data, onClose }: { data: PerfShareData; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const cardW = typeof window !== "undefined" ? Math.min(300, window.innerWidth - 88) : 300;

  const onShare = async () => {
    setBusy(true); setMsg(null);
    const r = await sharePerfCard(data, `vaiiya-perf-${Date.now()}.png`);
    setBusy(false);
    setMsg(
      r === "shared" ? "Partagé ✦"
      : r === "downloaded" ? "Image enregistrée — à poster où tu veux"
      : "Échec de l'export, réessaie",
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center px-6"
      style={{ background: "rgba(3,2,8,0.72)", backdropFilter: "blur(14px)" }}
    >
      <motion.button
        whileTap={{ scale: 0.9 }} onClick={onClose}
        aria-label="Fermer"
        className="absolute top-5 right-5 w-9 h-9 rounded-full flex items-center justify-center cursor-pointer"
        style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.16)" }}
      >
        <X size={16} color="#fff" />
      </motion.button>

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.97 }}
        transition={{ type: "spring", bounce: 0.28, duration: 0.5 }}
        onClick={(e) => e.stopPropagation()}
        className="flex flex-col items-center"
      >
        <PerfShareCard data={data} width={cardW} />

        <motion.button
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          onClick={onShare} disabled={busy}
          className="mt-6 flex items-center gap-2 px-6 py-3.5 rounded-2xl cursor-pointer disabled:opacity-60"
          style={{ background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", color: "#fff", fontWeight: 600, fontSize: 14, boxShadow: "0 8px 26px rgba(139,92,246,0.4)" }}
        >
          <Share2 size={16} /> {busy ? "Génération…" : "Enregistrer / Partager"}
        </motion.button>
        {msg && <p className="mt-3 text-xs text-center" style={{ color: "rgba(255,255,255,0.8)" }}>{msg}</p>}
      </motion.div>
    </motion.div>
  );
}
