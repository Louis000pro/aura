"use client";

/* ════════════════════════════════════════════════════════════════════
   TasteProfileModal — édition du « profil de goûts » dans les Paramètres.

   Mêmes questions et mêmes bases que le popup TastePrefsPrompt (tout vient de
   @/lib/tasteProfile), mais habillé avec les tokens de thème pour rester
   cohérent avec les autres réglages (et correct en mode sombre).
   Permet de modifier ses goûts à tout moment — ça réajuste le menu IA.
   Voir [[nutrition-unification-refonte]].
   ════════════════════════════════════════════════════════════════════ */

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { X, Check, Plus } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  type TasteProfile,
  Q_COOKING, Q_TIME, Q_INGREDIENTS,
  BASE_GROUPS, KNOWN_BASES,
  isTasteComplete, fetchTasteProfile, saveTasteProfile, tasteTodayStr,
} from "@/lib/tasteProfile";
import PlacesTop3Picker from "@/components/PlacesTop3Picker";

export default function TasteProfileModal({ onClose, onSaved }: { onClose: () => void; onSaved?: () => void }) {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const [cooking, setCooking] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [ingredients, setIngredients] = useState<string | null>(null);
  const [bases, setBases] = useState<string[]>([]);
  const [places, setPlaces] = useState<string[]>([]);
  const [custom, setCustom] = useState("");

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    fetchTasteProfile(user.id).then((p) => {
      if (cancelled) return;
      if (p) {
        setCooking(p.cooking ?? null);
        setTime(p.time ?? null);
        setIngredients(p.ingredients ?? null);
        setBases(Array.isArray(p.bases) ? p.bases : []);
        setPlaces(Array.isArray(p.places) ? p.places : []);
      }
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [user?.id]);

  const toggleBase = (label: string) =>
    setBases((prev) => prev.includes(label) ? prev.filter((b) => b !== label) : [...prev, label]);

  const addCustom = () => {
    const v = custom.trim();
    if (!v) return;
    setBases((prev) => prev.some((b) => b.toLowerCase() === v.toLowerCase()) ? prev : [...prev, v]);
    setCustom("");
  };

  const customBases = bases.filter((b) => !KNOWN_BASES.has(b));
  const canSave = isTasteComplete({ cooking, time, ingredients });

  const save = async () => {
    if (!user?.id || !canSave) return;
    setSaving(true);
    const profile: TasteProfile = { cooking, time, ingredients, bases, places, updatedAt: tasteTodayStr() };
    await saveTasteProfile(user.id, profile);
    setSaving(false);
    setSuccess(true);
    onSaved?.();
    setTimeout(onClose, 1100);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center px-4"
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
          <div>
            <h2 className="text-base font-semibold" style={{ color: "var(--text-1)" }}>Mes goûts cuisine</h2>
            <p className="text-xs font-light mt-0.5" style={{ color: "var(--text-3)" }}>Pour des recommandations de plats qui te ressemblent</p>
          </div>
          <motion.button whileTap={{ scale: 0.9 }} onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer flex-shrink-0" style={{ background: "rgba(var(--tint-violet-rgb),0.8)" }}>
            <X size={14} strokeWidth={2} style={{ color: "var(--text-3)" }} />
          </motion.button>
        </div>

        {/* Contenu */}
        <div className="overflow-y-auto flex-1 px-6 pb-2" style={{ scrollbarWidth: "none" }}>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <motion.div className="w-8 h-8 rounded-full border-2" style={{ borderColor: "var(--violet-mid)", borderTopColor: "var(--accent)" }}
                animate={{ rotate: 360 }} transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }} />
            </div>
          ) : success ? (
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center gap-3 py-10">
              <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, var(--violet-mid), var(--cream-mid))" }}>
                <Check size={24} strokeWidth={2.5} style={{ color: "var(--text-1)" }} />
              </div>
              <p className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>Goûts mis à jour.</p>
              <p className="text-xs font-light text-center" style={{ color: "var(--text-3)" }}>Ton menu de la semaine va s&apos;adapter</p>
            </motion.div>
          ) : (
            <div className="flex flex-col gap-5 pt-1">
              <Field label="Tu aimes cuisiner ?">
                <Segmented options={Q_COOKING} value={cooking} onSelect={setCooking} />
              </Field>
              <Field label="Tu as le temps de cuisiner ?">
                <Segmented options={Q_TIME} value={time} onSelect={setTime} />
              </Field>
              <Field label="Accès aux ingrédients ?">
                <Segmented options={Q_INGREDIENTS} value={ingredients} onSelect={setIngredients} />
              </Field>

              <Field label="Ton top 3 des endroits">
                <p className="text-[11px] font-light -mt-1 mb-1" style={{ color: "var(--text-3)" }}>
                  Tape dans l&apos;ordre, ils orientent les conseils livraison.
                </p>
                <PlacesTop3Picker value={places} onChange={setPlaces} />
              </Field>

              <Field label="Tes bases préférées">
                {BASE_GROUPS.map((g) => (
                  <div key={g.group} className="mb-2">
                    <p className="text-[9px] font-semibold tracking-widest uppercase mb-1" style={{ color: "var(--text-3)" }}>{g.group}</p>
                    <div className="flex flex-wrap gap-1">
                      {g.items.map((it) => (
                        <Chip key={it.label} on={bases.includes(it.label)} onClick={() => toggleBase(it.label)}>
                          <span style={{ fontSize: 12 }}>{it.emoji}</span>{it.label}
                        </Chip>
                      ))}
                    </div>
                  </div>
                ))}

                {customBases.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {customBases.map((b) => (
                      <Chip key={b} on onClick={() => toggleBase(b)}>
                        {b}<X size={11} strokeWidth={2.5} />
                      </Chip>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <input
                    value={custom} onChange={(e) => setCustom(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustom(); } }}
                    placeholder="Ajouter un aliment…"
                    className="flex-1 rounded-xl px-3 py-2 text-xs outline-none"
                    style={{ background: "rgba(var(--tint-violet-rgb),0.5)", border: "1px solid rgba(var(--accent-rgb),0.15)", color: "var(--text-1)" }}
                  />
                  <button onClick={addCustom} type="button" aria-label="Ajouter"
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 cursor-pointer"
                    style={{ background: "rgba(var(--accent-rgb),0.12)", border: "1px solid rgba(var(--accent-rgb),0.25)" }}>
                    <Plus size={15} strokeWidth={2.5} style={{ color: "var(--accent)" }} />
                  </button>
                </div>
              </Field>
            </div>
          )}
        </div>

        {/* Footer fixe */}
        {!loading && !success && (
          <div className="flex-shrink-0 px-6 pb-6 pt-3" style={{ borderTop: "1px solid rgba(var(--violet-mid-rgb),0.25)" }}>
            <motion.button
              whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
              onClick={save}
              disabled={saving || !canSave}
              className="w-full py-3.5 rounded-2xl text-sm font-semibold cursor-pointer disabled:opacity-50"
              style={{ background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", color: "#fff", boxShadow: "0 4px 20px rgba(var(--accent-rgb),0.3), inset 0 1px 0 rgba(var(--surface-rgb),0.9)" }}
            >
              {saving ? "Enregistrement…" : "Enregistrer mes goûts"}
            </motion.button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

/* ─── Sous-composants (style tokens) ─── */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-[10px] font-semibold tracking-wider uppercase" style={{ color: "var(--text-3)" }}>{label}</label>
      {children}
    </div>
  );
}

function Segmented({ options, value, onSelect }: { options: string[]; value: string | null; onSelect: (v: string) => void }) {
  return (
    <div className="flex gap-2">
      {options.map((o) => {
        const on = value === o;
        return (
          <motion.button key={o} whileTap={{ scale: 0.95 }} onClick={() => onSelect(o)} type="button"
            className="flex-1 py-2.5 rounded-2xl text-xs font-semibold cursor-pointer transition-all"
            style={on
              ? { background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", color: "#fff", boxShadow: "0 4px 12px rgba(var(--accent-rgb),0.25), inset 0 1px 0 rgba(var(--surface-rgb),0.9)" }
              : { background: "rgba(var(--tint-violet-rgb),0.5)", color: "var(--text-3)", border: "1px solid rgba(var(--accent-rgb),0.12)" }
            }>
            {o}
          </motion.button>
        );
      })}
    </div>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <motion.button whileTap={{ scale: 0.93 }} onClick={onClick} type="button"
      className="flex items-center gap-1 px-2 py-1 rounded-full cursor-pointer select-none text-xs font-medium"
      style={on
        ? { background: "linear-gradient(135deg, var(--violet-mid) 0%, var(--accent) 100%)", color: "#fff", boxShadow: "0 2px 8px rgba(var(--accent-rgb),0.3)" }
        : { background: "rgba(var(--tint-violet-rgb),0.6)", color: "var(--text-2)", border: "1px solid rgba(var(--accent-rgb),0.15)" }
      }>
      {children}
    </motion.button>
  );
}
