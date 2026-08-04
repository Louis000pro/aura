"use client";

/* ════════════════════════════════════════════════════════════════════
   TastePrefsPrompt — le « rendez-vous goûts ».

   Dans l'onglet Nutrition, une fois que l'utilisateur a noté au moins 3 repas
   (= il utilise vraiment la nutrition), on lui demande GENTIMENT ses préférences
   de cuisine : aime-t-il cuisiner, a-t-il le temps, accès aux ingrédients, bases.
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
import { addDaysStr, daysSince } from "@/lib/dates";
import {
  type TasteProfile,
  Q_COOKING, Q_TIME, Q_INGREDIENTS,
  BASE_GROUPS, KNOWN_BASES,
  isTasteComplete, saveTasteProfile, tasteTodayStr, fetchTasteProfile,
} from "@/lib/tasteProfile";
import PlacesTop3Picker from "@/components/PlacesTop3Picker";

const MEALS_BEFORE_ASKING = 3;  // on ne demande qu'après quelques repas notés (engagement réel)
const WEIGHIN_DAYS = 30;        // priorité au rendez-vous poids (pas de double popup)

export default function TastePrefsPrompt() {
  const { user } = useAuth();
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);

  const [cooking, setCooking] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [ingredients, setIngredients] = useState<string | null>(null);
  const [bases, setBases] = useState<string[]>([]);
  const [places, setPlaces] = useState<string[]>([]);
  const [custom, setCustom] = useState("");

  useEffect(() => {
    if (!user?.id) return;
    const uid = user.id;
    let cancelled = false;

    // « Plus tard » → on attend la date snoozée. (Le « déjà répondu » est
    // vérifié plus bas contre la BASE, pas seulement le localStorage.)
    try {
      const snooze = localStorage.getItem(`vaiiya_taste_snooze_${uid}`);
      if (snooze && snooze > tasteTodayStr()) return;
    } catch { return; }

    // Priorité au rendez-vous poids (pas de double popup) : si une pesée est snoozée
    // on l'ignore, sinon on regardera si une pesée est due plus bas.
    let weighinSnoozed = false;
    try {
      const ws = localStorage.getItem(`vaiiya_weighin_snooze_${uid}`);
      weighinSnoozed = !!(ws && ws > tasteTodayStr());
    } catch { /* ignore */ }

    const supabase = createClient();
    (async () => {
      // Déjà répondu ? On regarde le local ET la BASE (source de vérité) :
      // sinon le popup revient sur un nouvel appareil / après un cache vidé /
      // une mise à jour du service worker. Si la base a le profil, on réhydrate
      // le flag local pour que ce soit instantané les fois suivantes.
      const existing = await fetchTasteProfile(uid);
      if (cancelled) return;
      if (existing) {
        try { localStorage.setItem(`vaiiya_taste_profile_${uid}`, JSON.stringify(existing)); } catch { /* ignore */ }
        return;
      }

      // On ne demande qu'aux gens qui utilisent VRAIMENT la nutrition : ≥ 3 repas notés.
      // Les curieux de passage ne sont jamais embêtés, et la perso s'active vite.
      const { count } = await supabase
        .from("nutrition_logs")
        .select("user_id", { count: "exact", head: true })
        .eq("user_id", uid);
      if (cancelled || (count ?? 0) < MEALS_BEFORE_ASKING) return;

      // Pesée due ? → on laisse passer le WeighInPrompt cette fois et on réessaiera.
      const { data } = await supabase
        .from("weight_logs")
        .select("date")
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      const row = data as { date: string } | null;
      const weighinDue = !weighinSnoozed && (!row || daysSince(row.date) >= WEIGHIN_DAYS);
      if (!weighinDue) setShow(true);
    })();

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
    const profile: TasteProfile = { cooking, time, ingredients, bases, places, updatedAt: tasteTodayStr() };
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
            className="w-full max-w-sm rounded-t-3xl md:rounded-3xl bg-white px-6 pt-7 pb-8 md:pb-7 flex flex-col overflow-hidden"
            style={{ boxShadow: "0 -8px 40px rgba(var(--accent-rgb),0.18)", maxHeight: "86vh" }}
          >
            <div className="flex items-center justify-between mb-1 flex-shrink-0">
              <div
                className="flex items-center justify-center rounded-2xl"
                style={{ width: 44, height: 44, background: "linear-gradient(135deg,rgba(var(--accent-rgb),0.16),rgba(var(--gold-rgb),0.14))" }}
              >
                <Sparkles size={22} style={{ color: "var(--accent)" }} strokeWidth={2} />
              </div>
              <button onClick={later} aria-label="Fermer" style={{ color: "#CBD5E0" }}>
                <X size={20} />
              </button>
            </div>

            <h2 className="text-xl font-light mt-3 flex-shrink-0" style={{ color: "var(--text-1)" }}>
              On personnalise tes plats ? ✨
            </h2>
            <p className="text-sm mt-1.5 mb-4 flex-shrink-0" style={{ color: "var(--text-3)", lineHeight: 1.5 }}>
              Quelques questions rapides pour te proposer des repas qui te ressemblent vraiment.
            </p>

            {/* Contenu scrollable (fondu en bas = indice qu'il y a plus dessous) */}
            <div className="relative flex-1 min-h-0 flex flex-col">
              <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1 pb-1" style={{ scrollbarWidth: "thin" }}>
              <Question label="Tu aimes cuisiner ?">
                <Segmented options={Q_COOKING} value={cooking} onSelect={setCooking} />
              </Question>
              <Question label="Tu as le temps de cuisiner ?">
                <Segmented options={Q_TIME} value={time} onSelect={setTime} />
              </Question>
              <Question label="Accès aux ingrédients ?">
                <Segmented options={Q_INGREDIENTS} value={ingredients} onSelect={setIngredients} />
              </Question>

              <Question label="Ton top 3 des endroits ?">
                <p className="text-[11px] -mt-1 mb-1.5" style={{ color: "var(--text-3)" }}>
                  Tape dans l&apos;ordre — pour te conseiller quoi commander.
                </p>
                <PlacesTop3Picker value={places} onChange={setPlaces} />
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
                              background: on ? "linear-gradient(135deg,var(--violet-mid),var(--cream-mid))" : "rgba(var(--tint-violet-rgb),0.5)",
                              border: on ? "1px solid rgba(var(--accent-rgb),0.4)" : "1px solid rgba(var(--violet-mid-rgb),0.35)",
                              color: on ? "var(--text-1)" : "var(--text-2)", fontSize: 11, fontWeight: 500,
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
                        style={{ background: "linear-gradient(135deg,var(--violet-mid),var(--cream-mid))", border: "1px solid rgba(var(--accent-rgb),0.4)", color: "var(--text-1)", fontSize: 11, fontWeight: 500 }}>
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
                    style={{ border: "1.5px solid #E2E8F0", color: "var(--text-1)" }}
                  />
                  <button onClick={addCustom} type="button" aria-label="Ajouter"
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 cursor-pointer"
                    style={{ background: "rgba(var(--accent-rgb),0.12)", border: "1px solid rgba(var(--accent-rgb),0.25)" }}>
                    <Plus size={15} strokeWidth={2.5} style={{ color: "var(--accent)" }} />
                  </button>
                </div>
              </Question>
              </div>
              <div aria-hidden className="pointer-events-none absolute left-0 right-0 bottom-0 h-6"
                style={{ background: "linear-gradient(to top, #FFFFFF, rgba(var(--surface-rgb),0))" }} />
            </div>

            {/* Pied (fixe) */}
            <div className="flex-shrink-0 pt-3">
              <button
                onClick={save}
                disabled={saving || !canSave}
                className="w-full rounded-2xl py-3.5 text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: "linear-gradient(135deg,var(--accent),var(--gold))", boxShadow: "0 6px 20px rgba(var(--accent-rgb),0.3)" }}
              >
                {saving ? "..." : "Enregistrer mes goûts"}
              </button>
              <button onClick={later} className="w-full mt-2 py-2.5 text-sm font-medium" style={{ color: "var(--text-3)" }}>
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
      <p className="text-xs font-semibold mb-2" style={{ color: "var(--text-body)" }}>{label}</p>
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
              background: on ? "linear-gradient(135deg,var(--violet-mid),var(--cream-mid))" : "rgba(var(--tint-violet-rgb),0.5)",
              border: on ? "1px solid rgba(var(--accent-rgb),0.4)" : "1px solid rgba(var(--violet-mid-rgb),0.35)",
              color: on ? "var(--text-1)" : "var(--text-2)", fontSize: 11.5, fontWeight: 500,
            }}>
            {o}
          </button>
        );
      })}
    </div>
  );
}
