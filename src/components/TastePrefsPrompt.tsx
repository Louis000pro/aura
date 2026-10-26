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
import { X, Plus } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase";
import { addDaysStr, daysSince } from "@/lib/dates";
import { lockBodyModal } from "@/lib/bodyModal";
import {
  type TasteProfile,
  Q_COOKING, Q_TIME, Q_INGREDIENTS,
  BASE_GROUPS, KNOWN_BASES,
  isTasteComplete, saveTasteProfile, tasteTodayStr,
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
    let cancelled = false;

    try {
      // Déjà répondu → on ne redemande plus.
      if (localStorage.getItem(`vaiiya_taste_profile_${user.id}`)) return;
      // « Plus tard » → on attend la date snoozée.
      const snooze = localStorage.getItem(`vaiiya_taste_snooze_${user.id}`);
      if (snooze && snooze > tasteTodayStr()) return;
    } catch { return; }

    // Priorité au rendez-vous poids (pas de double popup) : si une pesée est snoozée
    // on l'ignore, sinon on regardera si une pesée est due plus bas.
    let weighinSnoozed = false;
    try {
      const ws = localStorage.getItem(`vaiiya_weighin_snooze_${user.id}`);
      weighinSnoozed = !!(ws && ws > tasteTodayStr());
    } catch { /* ignore */ }

    const supabase = createClient();
    (async () => {
      // On ne demande qu'aux gens qui utilisent VRAIMENT la nutrition : ≥ 3 repas notés.
      // Les curieux de passage ne sont jamais embêtés, et la perso s'active vite.
      const { count } = await supabase
        .from("nutrition_logs")
        .select("user_id", { count: "exact", head: true })
        .eq("user_id", user.id);
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

  // La barre du bas s'efface et le fond ne défile plus, comme la pesée.
  useEffect(() => (show ? lockBodyModal() : undefined), [show]);

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
          className="fixed inset-0 z-[60] flex items-end md:items-center justify-center md:px-4"
          style={{ background: "rgba(0,0,0,0.3)" }}
          onClick={later}
        >
          {/* Une vraie feuille du bas sur téléphone, comme la pesée : pleine
              largeur, collée au bord, opaque, et elle garde la place de la
              barre d'accueil de l'iPhone. Avant, elle flottait avec des marges
              latérales et se faisait couper par le bas de l'écran. */}
          <motion.div
            role="dialog" aria-modal="true" aria-labelledby="gouts-titre"
            initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", bounce: 0.18, duration: 0.45 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full md:max-w-md rounded-t-[var(--r-feuille)] md:rounded-[var(--r-feuille)] px-6 pt-3 md:pt-6 flex flex-col overflow-hidden"
            style={{
              background: "rgb(var(--surface-rgb))",
              boxShadow: "0 -12px 40px rgba(0,0,0,0.14)",
              maxHeight: "88dvh",
              paddingBottom: "calc(16px + env(safe-area-inset-bottom))",
            }}
          >
            <div className="mx-auto mb-3 h-1 w-10 flex-shrink-0 rounded-full md:hidden" style={{ background: "rgba(var(--text-3-rgb),0.3)" }} />

            <div className="flex items-start justify-between gap-3 flex-shrink-0">
              <div className="min-w-0">
                <h2 id="gouts-titre" className="vy-titre" style={{ color: "var(--text-0)" }}>
                  On personnalise tes plats&nbsp;?
                </h2>
                <p className="vy-corps mt-1" style={{ color: "var(--text-2)" }}>
                  Quelques questions rapides pour te proposer des repas qui te ressemblent vraiment.
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
            <div className="mb-4 flex-shrink-0" />

            {/* Contenu scrollable (fondu en bas = indice qu'il y a plus dessous) */}
            <div className="relative flex-1 min-h-0 flex flex-col">
              <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1 pb-1" style={{ scrollbarWidth: "thin" }}>
              <Question label="Tu aimes cuisiner ?">
                <Segmented options={Q_COOKING} value={cooking} onSelect={setCooking} />
              </Question>
              <Question label="Tu as le temps de cuisiner ?">
                <Segmented options={Q_TIME} value={time} onSelect={setTime} />
              </Question>
              <Question label="Accès aux ingrédients ?">
                <Segmented options={Q_INGREDIENTS} value={ingredients} onSelect={setIngredients} />
              </Question>

              <Question label="Ton top 3 des endroits ?">
                <p className="text-[11px] -mt-1 mb-1.5" style={{ color: "var(--text-3)" }}>
                  Tape dans l&apos;ordre, pour te conseiller quoi commander.
                </p>
                <PlacesTop3Picker value={places} onChange={setPlaces} />
              </Question>

              <Question label="Tes bases préférées ?">
                {BASE_GROUPS.map((g) => (
                  <div key={g.group} className="mb-2">
                    <p className="text-[11px] font-semibold tracking-widest uppercase mb-1" style={{ color: "var(--text-3)" }}>{g.group}</p>
                    <div className="flex flex-wrap gap-1">
                      {g.items.map((it) => {
                        const on = bases.includes(it.label);
                        return (
                          <button key={it.label} onClick={() => toggleBase(it.label)} type="button"
                            className="flex items-center gap-1 px-2 py-1 rounded-full cursor-pointer select-none"
                            style={{
                              background: on ? "linear-gradient(135deg,#8B5CF6,#C13BC1)" : "rgba(var(--tint-violet-rgb),0.5)",
                              border: on ? "1px solid transparent" : "1px solid rgba(var(--violet-mid-rgb),0.35)",
                              color: on ? "#fff" : "var(--text-2)", fontSize: 11, fontWeight: 500,
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
                        style={{ background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", border: "1px solid transparent", color: "#fff", fontSize: 11, fontWeight: 500 }}>
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
                    className="flex-1 rounded-xl px-3 py-2 text-[13px] outline-none"
                    style={{ border: "1.5px solid rgba(var(--text-3-rgb),0.25)", background: "transparent", color: "var(--text-1)" }}
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
                style={{ background: "linear-gradient(to top, rgb(var(--surface-rgb)), rgba(var(--surface-rgb),0))" }} />
            </div>

            {/* Pied (fixe) */}
            <div className="flex-shrink-0 pt-3">
              <button
                onClick={save}
                disabled={saving || !canSave}
                className="w-full rounded-2xl py-3.5 text-[16px] font-semibold text-white disabled:opacity-50"
                style={{ background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", boxShadow: "var(--ombre-action)" }}
              >
                {saving ? "..." : "Enregistrer mes goûts"}
              </button>
              <button onClick={later} className="w-full mt-1 py-2.5 text-[16px] font-medium" style={{ color: "var(--text-3)" }}>
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
      <p className="text-[13px] font-semibold mb-2" style={{ color: "var(--text-body)" }}>{label}</p>
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
              background: on ? "linear-gradient(135deg,#8B5CF6,#C13BC1)" : "rgba(var(--tint-violet-rgb),0.5)",
              border: on ? "1px solid transparent" : "1px solid rgba(var(--violet-mid-rgb),0.35)",
              color: on ? "#fff" : "var(--text-2)", fontSize: 11, fontWeight: 500,
            }}>
            {o}
          </button>
        );
      })}
    </div>
  );
}
