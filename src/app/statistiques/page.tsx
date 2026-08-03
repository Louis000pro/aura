"use client";

/* ════════════════════════════════════════════════════════════════════
   /statistiques — la vue « progression » détaillée.

   VOLONTAIREMENT hors du menu : on n'y arrive qu'en la demandant à l'✦
   (« montre ma progression », « mes statistiques »). Elle remet à l'écran
   la vue riche existante `ProgressionStats` (poids, séances de la semaine,
   records, calories/volume sur 8 semaines) qui était devenue orpheline.
   ════════════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BarChart3 } from "lucide-react";
import ProgressionStats from "@/components/ProgressionStats";

export default function StatistiquesPage() {
  const [toast, setToast] = useState<string | null>(null);
  const montrer = (m: string) => {
    setToast(m);
    window.setTimeout(() => setToast(null), 2200);
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 pt-4 pb-2">
      <header className="mb-4 flex items-center gap-2.5">
        <span className="grid place-items-center h-9 w-9 rounded-2xl"
          style={{ background: "linear-gradient(135deg,var(--accent),var(--gold))" }}>
          <BarChart3 size={17} strokeWidth={2} style={{ color: "#fff" }} />
        </span>
        <div className="min-w-0">
          <h1 className="text-[19px] font-extrabold leading-tight" style={{ color: "var(--text-0)" }}>
            Tes statistiques
          </h1>
          <p className="text-[12.5px] leading-snug" style={{ color: "var(--text-3)" }}>
            Tes séances, tes calories, ton poids et tes records — ton évolution.
          </p>
        </div>
      </header>

      <ProgressionStats onToast={montrer} />

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}
            className="fixed left-1/2 -translate-x-1/2 z-[80] px-4 py-2.5 rounded-2xl text-[13px] font-semibold"
            style={{
              bottom: "calc(6rem + env(safe-area-inset-bottom))",
              background: "rgb(var(--surface-rgb))", color: "var(--text-0)",
              border: "1px solid rgba(var(--accent-rgb),0.2)", boxShadow: "0 8px 28px rgba(0,0,0,0.18)",
            }}>
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
