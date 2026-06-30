"use client";

/* ════════════════════════════════════════════════════════════════════
   WeighInPrompt — le « rendez-vous poids » mensuel.

   Dans l'onglet Nutrition, ~une fois par mois (ou si aucune pesée), demande
   gentiment le poids du jour. Une pesée alimente weight_logs (source UNIQUE
   du poids) → l'objectif se recalcule tout seul (événement « vaiiya:weighin »
   écouté par useNutritionGoals). Guidé, sans se sentir perdu, et ça crée un
   petit rendez-vous avec Vaiiya. Voir [[nutrition-unification-refonte]].
   ════════════════════════════════════════════════════════════════════ */

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Scale, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase";
import { localDateStr, addDaysStr, daysSince } from "@/lib/dates";

const DAYS_BETWEEN = 30;

export default function WeighInPrompt() {
  const { user } = useAuth();
  const [show, setShow] = useState(false);
  const [lastWeight, setLastWeight] = useState<number | null>(null);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    // « Plus tard » : on ne redemande pas avant la date snoozée.
    try {
      const snooze = localStorage.getItem(`vaiiya_weighin_snooze_${user.id}`);
      if (snooze && snooze > localDateStr()) return;
    } catch { /* ignore */ }

    createClient()
      .from("weight_logs")
      .select("weight_kg, date")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const row = data as { weight_kg: number; date: string } | null;
        if (row) setLastWeight(row.weight_kg);
        if (!row || daysSince(row.date) >= DAYS_BETWEEN) setShow(true);
      });

    return () => { cancelled = true; };
  }, [user?.id]);

  const later = () => {
    if (user?.id) {
      try { localStorage.setItem(`vaiiya_weighin_snooze_${user.id}`, addDaysStr(3)); } catch { /* ignore */ }
    }
    setShow(false);
  };

  const save = async () => {
    const kg = parseFloat(value.replace(",", "."));
    if (!user?.id || !kg || kg < 20 || kg > 400) return;
    setSaving(true);
    const { error } = await createClient().from("weight_logs").upsert(
      { user_id: user.id, date: localDateStr(), weight_kg: kg },
      { onConflict: "user_id,date" }
    );
    setSaving(false);
    if (!error) {
      // Prévient l'app : l'objectif se recalcule en direct (hook useNutritionGoals).
      try { window.dispatchEvent(new Event("vaiiya:weighin")); } catch { /* ignore */ }
      setShow(false);
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-end md:items-center justify-center px-4"
          style={{ background: "rgba(0,0,0,0.25)", backdropFilter: "blur(10px)" }}
          onClick={later}
        >
          <motion.div
            initial={{ opacity: 0, y: 80, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 40, scale: 0.97 }}
            transition={{ type: "spring", bounce: 0.28, duration: 0.5 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-t-3xl md:rounded-3xl bg-white px-6 pt-7 pb-8 md:pb-7"
            style={{ boxShadow: "0 -8px 40px rgba(167,139,250,0.18)" }}
          >
            <div className="flex items-center justify-between mb-1">
              <div
                className="flex items-center justify-center rounded-2xl"
                style={{ width: 44, height: 44, background: "linear-gradient(135deg,rgba(167,139,250,0.16),rgba(212,168,67,0.14))" }}
              >
                <Scale size={22} style={{ color: "#A78BFA" }} strokeWidth={2} />
              </div>
              <button onClick={later} aria-label="Fermer" style={{ color: "#CBD5E0" }}>
                <X size={20} />
              </button>
            </div>

            <h2 className="text-xl font-light mt-3" style={{ color: "#2D3748" }}>
              On fait le point ? 💜
            </h2>
            <p className="text-sm mt-1.5 mb-5" style={{ color: "#A0AEC0", lineHeight: 1.5 }}>
              Ça fait un moment — tu pèses combien aujourd&apos;hui&nbsp;? Ça garde ton objectif bien ajusté à toi.
            </p>

            <div className="flex items-center gap-3 mb-5">
              <input
                type="number" inputMode="decimal" autoFocus
                value={value} onChange={(e) => setValue(e.target.value)}
                placeholder={lastWeight ? String(lastWeight) : "70"}
                className="flex-1 rounded-2xl px-4 py-3 text-lg outline-none"
                style={{ border: "1.5px solid #E2E8F0", color: "#2D3748" }}
                onKeyDown={(e) => { if (e.key === "Enter") save(); }}
              />
              <span className="text-sm font-semibold" style={{ color: "#A0AEC0" }}>kg</span>
            </div>

            <button
              onClick={save}
              disabled={saving || !value}
              className="w-full rounded-2xl py-3.5 text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: "linear-gradient(135deg,#A78BFA,#D4A843)", boxShadow: "0 6px 20px rgba(167,139,250,0.3)" }}
            >
              {saving ? "..." : "Enregistrer"}
            </button>
            <button onClick={later} className="w-full mt-2 py-2.5 text-sm font-medium" style={{ color: "#A0AEC0" }}>
              Plus tard
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
