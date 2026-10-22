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
import { X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase";
import { localDateStr, addDaysStr, daysSince } from "@/lib/dates";
import { lockBodyModal } from "@/lib/bodyModal";

const DAYS_BETWEEN = 30;

/* Deux usages, une seule feuille.
   - Sans prop : le rendez-vous mensuel, qui décide lui-même de s'ouvrir.
   - Avec `ouvert` : piloté par un écran (la courbe de poids du profil).
   ⚠️ En mode piloté, fermer n'écrit JAMAIS le report : refermer une feuille
   qu'on a ouverte soi-même n'a pas à repousser le rendez-vous de trois
   jours. Une seule porte pour se peser dans toute l'app, jamais deux. */
export default function WeighInPrompt({ ouvert, onFermer }: {
  ouvert?: boolean;
  onFermer?: () => void;
} = {}) {
  const { user } = useAuth();
  const pilote = ouvert !== undefined;
  const [showAuto, setShowAuto] = useState(false);
  const show = pilote ? ouvert : showAuto;
  const [lastWeight, setLastWeight] = useState<number | null>(null);
  const [lastDate, setLastDate] = useState<string | null>(null);
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
        if (row) { setLastWeight(Number(row.weight_kg)); setLastDate(row.date); }
        if (!pilote && (!row || daysSince(row.date) >= DAYS_BETWEEN)) setShowAuto(true);
      });

    return () => { cancelled = true; };
  }, [user?.id, pilote]);

  // La barre du bas s'efface sous la feuille, comme sous toutes les autres.
  useEffect(() => (show ? lockBodyModal() : undefined), [show]);

  const later = () => {
    if (pilote) { onFermer?.(); return; }
    if (user?.id) {
      try { localStorage.setItem(`vaiiya_weighin_snooze_${user.id}`, addDaysStr(3)); } catch { /* ignore */ }
    }
    setShowAuto(false);
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
      setValue("");
      if (pilote) onFermer?.(); else setShowAuto(false);
    }
  };

  const kgDit = parseFloat(value.replace(",", "."));
  const valide = Number.isFinite(kgDit) && kgDit >= 20 && kgDit <= 400;
  const derniere = lastWeight !== null && lastDate
    ? `Dernière pesée : ${lastWeight.toFixed(1).replace(".", ",")} kg, le ${new Date(lastDate + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}.`
    : null;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-end md:items-center justify-center md:px-4"
          style={{ background: "rgba(0,0,0,0.3)" }}
          onClick={later}
        >
          {/* Une vraie feuille du bas sur téléphone : pleine largeur, collée au
              bord, et elle garde la place de la barre d'accueil de l'iPhone.
              Avant, elle flottait avec des marges latérales mais touchait le
              bas de l'écran : on aurait dit une carte coupée. */}
          <motion.div
            role="dialog" aria-modal="true" aria-labelledby="pesee-titre"
            initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", bounce: 0.18, duration: 0.45 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full md:max-w-sm rounded-t-[var(--r-feuille)] md:rounded-[var(--r-feuille)] px-6 pt-3 md:pt-6"
            style={{
              background: "rgb(var(--surface-rgb))",
              boxShadow: "0 -12px 40px rgba(0,0,0,0.14)",
              paddingBottom: "calc(20px + env(safe-area-inset-bottom))",
            }}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full md:hidden" style={{ background: "rgba(var(--text-3-rgb),0.3)" }} />

            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="pesee-titre" className="vy-titre" style={{ color: "var(--text-0)" }}>
                  {pilote ? "Ta pesée du jour" : "On fait le point ?"}
                </h2>
                <p className="vy-corps mt-1" style={{ color: "var(--text-2)" }}>
                  {pilote
                    ? "Elle s’ajoute à ta courbe et garde ton objectif ajusté."
                    : "Ça fait un moment. Tu pèses combien aujourd’hui ? Ça garde ton objectif ajusté à toi."}
                </p>
              </div>
              <button
                onClick={later} aria-label="Fermer"
                className="-mr-2 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full"
                style={{ color: "var(--text-3)" }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Le chiffre est le héros : grand, centré, dans le visage des
                valeurs. Champ texte avec clavier décimal, donc ni flèches de
                navigateur ni virgule refusée. */}
            <label
              className="mt-5 flex items-baseline justify-center gap-2 rounded-[var(--r-bloc)] px-4 py-4"
              style={{ background: "rgba(var(--text-3-rgb),0.08)" }}
            >
              <input
                type="text" inputMode="decimal" autoComplete="off" autoFocus
                aria-label="Ton poids en kilos"
                value={value}
                onChange={(e) => setValue(e.target.value.replace(/[^0-9.,]/g, "").slice(0, 5))}
                placeholder={lastWeight !== null ? lastWeight.toFixed(1).replace(".", ",") : "70"}
                className="champ-geant vy-nombre w-[4.2ch] bg-transparent text-right outline-none"
                style={{ fontSize: 40, fontWeight: 700, color: "var(--poids-encre)", lineHeight: 1.1 }}
                onKeyDown={(e) => { if (e.key === "Enter") save(); }}
              />
              <span className="text-[20px] font-semibold" style={{ color: "var(--text-3)" }}>kg</span>
            </label>

            {derniere && (
              <p className="mt-2 text-center text-[13px]" style={{ color: "var(--text-3)" }}>{derniere}</p>
            )}

            <button
              onClick={save}
              disabled={saving || !valide}
              className="mt-5 w-full rounded-2xl py-3.5 text-[16px] font-semibold text-white disabled:opacity-50"
              style={{ background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", boxShadow: "var(--ombre-action)" }}
            >
              {saving ? "Enregistrement…" : "Enregistrer"}
            </button>
            {!pilote && (
              <button onClick={later} className="w-full mt-1 py-2.5 text-[16px] font-medium" style={{ color: "var(--text-3)" }}>
                Plus tard
              </button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
