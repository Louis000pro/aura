"use client";

/* ════════════════════════════════════════════════════════════════════
   TastePrefsPrompt — le « rendez-vous goûts ».

   Dans l'onglet Nutrition, ~1 semaine après que l'utilisateur a commencé à
   l'utiliser, on lui demande GENTIMENT ses préférences de cuisine : aime-t-il
   cuisiner, a-t-il le temps, accès aux ingrédients, et ses bases préférées.
   Ça construit un « profil de goûts » qui nourrira ensuite les recommandations
   de plats (menu généré par l'IA). Stocké en local + best-effort en base
   (profiles.taste_profile). Voir [[nutrition-unification-refonte]].

   Mécanique calquée sur WeighInPrompt (snooze « plus tard », non bloquant).
   ════════════════════════════════════════════════════════════════════ */

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Plus } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase";
import {
  type TasteProfile,
  Q_COOKING, Q_TIME, Q_INGREDIENTS,
  BASE_GROUPS, KNOWN_BASES,
  isTasteComplete, saveTasteProfile, tasteTodayStr,
} from "@/lib/tasteProfile";

const DAYS_BEFORE_ASKING = 7;   // ~1 semaine d'utilisation avant de demander
const WEIGHIN_DAYS = 30;        // priorité au rendez-vous poids (pas de double popup)

function addDaysStr(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function daysSince(dateStr: string): number {
  const then = new Date(dateStr + "T00:00:00").getTime();
  return Math.floor((Date.now() - then) / 86400000);
}

export default function TastePrefsPrompt() {
  const { user } = useAuth();
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);

  const [cooking, setCooking] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [ingredients, setIngredients] = useState<string | null>(null);
  const [bases, setBases] = useState<string[]>([]);
  const [custom, setCustom] = useState("");

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    try {
      // Déjà répondu → on ne redemande plus.
      if (localStorage.getItem(`vaiiya_taste_profile_${user.id}`)) return;
      // « Plus tard » → on attend la date snoozée.
      const snooze = localStorage.getItem(`vaiiya_taste_snooze_${user.id}`);
      if (snooze && snooze > tasteTodayStr()) return;
      // Repère « première visite nutrition » → démarre le compte à rebours.
      const firstKey = `vaiiya_taste_firstseen_${user.id}`;
      const first = localStorage.getItem(firstKey);
      if (!first) { localStorage.setItem(firstKey, tasteTodayStr()); return; }
      if (daysSince(first) < DAYS_BEFORE_ASKING) return;
    } catch { return; }

    // Priorité au rendez-vous poids : si une pesée est due, on laisse passer le
    // WeighInPrompt cette fois et on réessaiera à la prochaine visite.
    let weighinSnoozed = false;
    try {
      const ws = localStorage.getItem(`vaiiya_weighin_snooze_${user.id}`);
      weighinSnoozed = !!(ws && ws > tasteTodayStr());
    } catch { /* ignore */ }

    createClient()
      .from("weight_logs")
      .select("date")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const row = data as { date: string } | null;
        const weighinDue = !weighinSnoozed && (!row || daysSince(row.date) >= WEIGHIN_DAYS);
        if (!weighinDue) setShow(true);
      });

    return () => { cancelled = true; };
  }, [user?.id]);

  const later = () => {
    if (user?.id) {
      try { localStorage.setItem(`vaiiya_taste_snooze_${user.id}`, addDaysStr(4)); } catch { /* ignore */ }
    }
    setShow(false);
  };

  const toggleBase = (label: string) =>
    setBases((prev) => prev.includes(label) ? prev.filter((b) => b !== label) : [...prev, label]);

  const addCustom = () => {
    const v = custom.trim();
    if (!v) return;
    setBases((prev) => prev.some((b) => b.toLowerCase() === v.toLowerCase()) ? prev : [...prev, v]);
    setCustom("");
  };

  const canSave = isTasteComplete({ cooking, time, ingredients });

  const save = async () => {
    if (!user?.id || !canSave) return;
    setSaving(true);
    const profile: TasteProfile = { cooking, time, ingredients, bases, updatedAt: tasteTodayStr() };
    await saveTasteProfile(user.id, profile);
    setSaving(false);
    setShow(false);
  };

  const customBases = bases.filter((b) => !KNOWN_BASES.has(b));

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
            className="w-full max-w-sm rounded-t-3xl md:rounded-3xl bg-white px-6 pt-7 pb-8 md:pb-7 flex flex-col"
            style={{ boxShadow: "0 -8px 40px rgba(167,139,250,0.18)", maxHeight: "86vh" }}
          >
            <div className="flex items-center justify-between mb-1 flex-shrink-0">
              <div
                className="flex items-center justify-center rounded-2xl"
                style={{ width: 44, height: 44, background: "linear-gradient(135deg,rgba(167,139,250,0.16),rgba(212,168,67,0.14))" }}
              >
                <Sparkles size={22} style={{ color: "#A78BFA" }} strokeWidth={2} />
              </div>
              <button onClick={later} aria-label="Fermer" style={{ color: "#CBD5E0" }}>
                <X size={20} />
              </button>
            </div>

            <h2 className="text-xl font-light mt-3 flex-shrink-0" style={{ color: "#2D3748" }}>
              On personnalise tes plats ? ✨
            </h2>
            <p className="text-sm mt-1.5 mb-4 flex-shrink-0" style={{ color: "#A0AEC0", lineHeight: 1.5 }}>
              Quelques questions rapides pour te proposer des repas qui te ressemblent vraiment.
            </p>

            {/* Contenu scrollable (fondu en bas = indice qu'il y a plus dessous) */}
            <div className="relative flex-1 min-h-0">
              <div className="h-full overflow-y-auto -mx-1 px-1 pb-1" style={{ scrollbarWidth: "thin" }}>
              <Question label="Tu aimes cuisiner ?">
                <Segmented options={Q_COOKING} value={cooking} onSelect={setCooking} />
              </Question>
              <Question label="Tu as le temps de cuisiner ?">
                <Segmented options={Q_TIME} value={time} onSelect={setTime} />
              </Question>
              <Question label="Accès aux ingrédients ?">
                <Segmented options={Q_INGREDIENTS} value={ingredients} onSelect={setIngredients} />
              </Question>

              <Question label="Tes bases préférées ?">
                {BASE_GROUPS.map((g) => (
                  <div key={g.group} className="mb-2">
                    <p className="text-[9px] font-semibold tracking-widest uppercase mb-1" style={{ color: "#CBD5E0" }}>{g.group}</p>
                    <div className="flex flex-wrap gap-1">
                      {g.items.map((it) => {
                        const on = bases.includes(it.label);
                        return (
                          <button key={it.label} onClick={() => toggleBase(it.label)} type="button"
                            className="flex items-center gap-1 px-2 py-1 rounded-full cursor-pointer select-none"
                            style={{
                              background: on ? "linear-gradient(135deg,#D4C0FF,#F5E6A3)" : "rgba(240,235,255,0.5)",
                              border: on ? "1px solid rgba(167,139,250,0.4)" : "1px solid rgba(212,192,255,0.35)",
                              color: on ? "#2D3748" : "#718096", fontSize: 11, fontWeight: 500,
                            }}>
                            <span style={{ fontSize: 11 }}>{it.emoji}</span>{it.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {/* Ajouts libres */}
                {customBases.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {customBases.map((b) => (
                      <button key={b} onClick={() => toggleBase(b)} type="button"
                        className="flex items-center gap-1 px-2 py-1 rounded-full cursor-pointer select-none"
                        style={{ background: "linear-gradient(135deg,#D4C0FF,#F5E6A3)", border: "1px solid rgba(167,139,250,0.4)", color: "#2D3748", fontSize: 11, fontWeight: 500 }}>
                        {b}<X size={11} strokeWidth={2.5} />
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <input
                    value={custom} onChange={(e) => setCustom(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustom(); } }}
                    placeholder="Ajouter un aliment…"
                    className="flex-1 rounded-xl px-3 py-2 text-xs outline-none"
                    style={{ border: "1.5px solid #E2E8F0", color: "#2D3748" }}
                  />
                  <button onClick={addCustom} type="button" aria-label="Ajouter"
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 cursor-pointer"
                    style={{ background: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.25)" }}>
                    <Plus size={15} strokeWidth={2.5} style={{ color: "#A78BFA" }} />
                  </button>
                </div>
              </Question>
              </div>
              <div aria-hidden className="pointer-events-none absolute left-0 right-0 bottom-0 h-6"
                style={{ background: "linear-gradient(to top, #FFFFFF, rgba(255,255,255,0))" }} />
            </div>

            {/* Pied (fixe) */}
            <div className="flex-shrink-0 pt-3">
              <button
                onClick={save}
                disabled={saving || !canSave}
                className="w-full rounded-2xl py-3.5 text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: "linear-gradient(135deg,#A78BFA,#D4A843)", boxShadow: "0 6px 20px rgba(167,139,250,0.3)" }}
              >
                {saving ? "..." : "Enregistrer mes goûts"}
              </button>
              <button onClick={later} className="w-full mt-2 py-2.5 text-sm font-medium" style={{ color: "#A0AEC0" }}>
                Plus tard
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ─── Sous-composants ─── */
function Question({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <p className="text-xs font-semibold mb-2" style={{ color: "#4A5568" }}>{label}</p>
      {children}
    </div>
  );
}

function Segmented({ options, value, onSelect }: { options: string[]; value: string | null; onSelect: (v: string) => void }) {
  return (
    <div className="flex gap-1.5">
      {options.map((o) => {
        const on = value === o;
        return (
          <button key={o} onClick={() => onSelect(o)} type="button"
            className="flex-1 rounded-xl px-2 py-2 cursor-pointer select-none"
            style={{
              background: on ? "linear-gradient(135deg,#D4C0FF,#F5E6A3)" : "rgba(240,235,255,0.5)",
              border: on ? "1px solid rgba(167,139,250,0.4)" : "1px solid rgba(212,192,255,0.35)",
              color: on ? "#2D3748" : "#718096", fontSize: 11.5, fontWeight: 500,
            }}>
            {o}
          </button>
        );
      })}
    </div>
  );
}
