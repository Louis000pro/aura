"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronLeft, Sparkles, X } from "lucide-react";

export type OnboardingData = {
  age: string;
  height: string;
  weight: string;
  gender: string;
  goals: string[];
  level: string;
  sessionsPerWeek: string;
  mealsPerDay: string;
  diet: string;
  /** Opt-in WhatsApp (facultatif) : rappels & motivation. */
  phone: string;
  whatsapp: boolean;
};

const defaultData: OnboardingData = {
  age: "", height: "", weight: "", gender: "",
  goals: [], level: "", sessionsPerWeek: "", mealsPerDay: "", diet: "",
  phone: "", whatsapp: false,
};

const GOALS = [
  { id: "masse",      label: "Prise de masse",   emoji: "💪" },
  { id: "poids",      label: "Perte de poids",   emoji: "🔥" },
  { id: "force",      label: "Force",             emoji: "🏋️" },
  { id: "endurance",  label: "Endurance",         emoji: "⚡" },
  { id: "sante",      label: "Santé générale",    emoji: "🌿" },
  { id: "souplesse",  label: "Souplesse",         emoji: "🧘" },
];

const LEVELS = [
  { id: "debutant",      label: "Débutant",       sub: "< 6 mois" },
  { id: "intermediaire", label: "Intermédiaire",  sub: "6 mois – 2 ans" },
  { id: "avance",        label: "Avancé",         sub: "> 2 ans" },
];

const GENDERS = [
  { id: "homme", label: "Homme" },
  { id: "femme", label: "Femme" },
  { id: "autre", label: "Autre" },
];

const SESSIONS = ["1", "2", "3", "4", "5", "6", "7"];
const MEALS    = ["2", "3", "4", "5", "6+"];
const DIETS    = [
  { id: "omnivore",    label: "Omnivore",   emoji: "🥩" },
  { id: "vegetarien",  label: "Végétarien", emoji: "🥗" },
  { id: "vegan",       label: "Vegan",      emoji: "🌱" },
  { id: "sansgluten",  label: "Sans gluten",emoji: "🌾" },
];

/* ── Pill sélectionnable ── */
function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <motion.button type="button" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.94 }} onClick={onClick}
      className="px-4 py-2.5 rounded-2xl text-sm font-medium cursor-pointer transition-all duration-150 border"
      style={active
        ? { background: "linear-gradient(135deg,rgba(var(--violet-mid-rgb),0.9) 0%,rgba(var(--cream-mid-rgb),0.9) 100%)", borderColor: "rgba(var(--accent-rgb),0.5)", color: "var(--text-1)", boxShadow: "inset 0 1px 0 rgba(var(--surface-rgb),0.9), 0 4px 12px rgba(var(--accent-rgb),0.2)" }
        : { background: "rgba(var(--surface-rgb),0.55)", borderColor: "rgba(var(--surface-rgb),0.7)", color: "var(--text-2)" }
      }>
      {children}
    </motion.button>
  );
}

/* ── Input numérique ── */
function NumInput({ label, unit, value, onChange, placeholder }: {
  label: string; unit: string; value: string; onChange: (v: string) => void; placeholder: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: "var(--text-3)" }}>{label}</label>
      <motion.div className="flex items-center gap-2 px-4 py-3 rounded-2xl"
        style={{ background: "rgba(var(--surface-rgb),0.7)", border: "1px solid rgba(var(--surface-rgb),0.8)", backdropFilter: "blur(12px)" }}
        animate={{ boxShadow: focused ? "0 0 0 2px rgba(var(--accent-rgb),0.45)" : "0 2px 8px rgba(var(--accent-rgb),0.06)" }}
      >
        <input type="number" value={value} onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-[#C4CAD4]"
          style={{ color: "var(--text-1)" }} />
        <span className="text-xs font-medium" style={{ color: "var(--text-3)" }}>{unit}</span>
      </motion.div>
    </div>
  );
}

const steps = [
  { title: "Ton corps",       subtitle: "Pour calibrer tes programmes" },
  { title: "Tes objectifs",   subtitle: "Sélectionne tout ce qui s'applique" },
  { title: "Ton niveau",      subtitle: "Sois honnête, ça aide !" },
  { title: "Ta nutrition",    subtitle: "On adapte tes plans repas" },
  { title: "Reste motivé",    subtitle: "Des rappels sur WhatsApp (facultatif)" },
];

export default function OnboardingModal({
  pseudo,
  onComplete,
  onSkip,
}: {
  pseudo: string;
  onComplete: (data: OnboardingData) => void;
  onSkip: () => void;
}) {
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [data, setData] = useState<OnboardingData>(defaultData);

  const go = (n: number) => { setDir(n); setStep(s => s + n); };
  const toggle = (field: keyof OnboardingData, val: string) => {
    setData(d => {
      if (field === "goals") {
        const arr = d.goals.includes(val) ? d.goals.filter(g => g !== val) : [...d.goals, val];
        return { ...d, goals: arr };
      }
      return { ...d, [field]: d[field as keyof OnboardingData] === val ? "" : val };
    });
  };
  const canNext = [
    data.age && data.height && data.weight && data.gender,
    data.goals.length > 0,
    data.level && data.sessionsPerWeek,
    data.mealsPerDay && data.diet,
    true, // WhatsApp : étape facultative, jamais bloquante
  ][step];

  const variants = {
    enter: (d: number) => ({ x: d > 0 ? 60 : -60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit:  (d: number) => ({ x: d > 0 ? -60 : 60, opacity: 0 }),
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] flex items-center justify-center px-4"
      style={{ background: "rgba(var(--tint-violet-rgb),0.55)", backdropFilter: "blur(10px)" }}
    >
      {/* Blobs déco */}
      <motion.div className="absolute rounded-full pointer-events-none"
        style={{ top: "-15%", left: "-10%", width: 500, height: 500, background: "rgba(var(--violet-mid-rgb),0.35)", filter: "blur(80px)" }}
        animate={{ scale: [1,1.15,1] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }} />
      <motion.div className="absolute rounded-full pointer-events-none"
        style={{ bottom: "-15%", right: "-10%", width: 450, height: 450, background: "rgba(var(--cream-mid-rgb),0.3)", filter: "blur(80px)" }}
        animate={{ scale: [1,1.12,1] }} transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }} />

      <motion.div initial={{ scale: 0.9, y: 30, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }} transition={{ type: "spring", damping: 24, stiffness: 260 }}
        className="relative w-full max-w-md overflow-hidden"
        style={{ background: "rgba(var(--surface-rgb),0.88)", backdropFilter: "blur(12px)", border: "1px solid rgba(var(--surface-rgb),0.9)", borderRadius: "2rem", boxShadow: "0 32px 80px -16px rgba(var(--accent-rgb),0.25), inset 0 1px 0 rgba(var(--surface-rgb),0.95)" }}
      >
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg,transparent,rgba(var(--surface-rgb),0.9),transparent)" }} />

        {/* Header */}
        <div className="px-7 pt-7 pb-5">
          {/* Progress bar */}
          <div className="flex gap-1.5 mb-6">
            {steps.map((_, i) => (
              <motion.div key={i} className="h-1 flex-1 rounded-full overflow-hidden" style={{ background: "rgba(var(--accent-rgb),0.12)" }}>
                <motion.div className="h-full rounded-full"
                  style={{ background: "linear-gradient(90deg,var(--accent),var(--gold))" }}
                  initial={{ width: i < step ? "100%" : "0%" }}
                  animate={{ width: i < step ? "100%" : i === step ? "60%" : "0%" }}
                  transition={{ duration: 0.5, ease: "easeOut" }} />
              </motion.div>
            ))}
          </div>

          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: "var(--text-3)" }}>
                Étape {step + 1} / {steps.length}
              </p>
              <h2 className="text-xl font-light mt-0.5" style={{ color: "var(--text-1)" }}>{steps[step].title}</h2>
              <p className="text-xs font-light mt-0.5" style={{ color: "var(--text-3)" }}>{steps[step].subtitle}</p>
            </div>
            <button onClick={onSkip} className="cursor-pointer p-1.5 rounded-xl hover:bg-white/40 transition-colors" style={{ color: "#C4CAD4" }}>
              <X size={16} strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Content animé */}
        <div className="relative overflow-hidden" style={{ minHeight: 260 }}>
          <AnimatePresence custom={dir} mode="wait">
            <motion.div key={step} custom={dir} variants={variants} initial="enter" animate="center" exit="exit"
              transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
              className="px-7 pb-4"
            >
              {/* ── Step 0 : Corps ── */}
              {step === 0 && (
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-3 gap-3">
                    <NumInput label="Âge" unit="ans" value={data.age} onChange={v => setData(d => ({...d, age: v}))} placeholder="25" />
                    <NumInput label="Taille" unit="cm" value={data.height} onChange={v => setData(d => ({...d, height: v}))} placeholder="175" />
                    <NumInput label="Poids" unit="kg" value={data.weight} onChange={v => setData(d => ({...d, weight: v}))} placeholder="70" />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold tracking-widest uppercase mb-2 block" style={{ color: "var(--text-3)" }}>Genre</label>
                    <div className="flex gap-2">
                      {GENDERS.map(g => (
                        <Pill key={g.id} active={data.gender === g.id} onClick={() => toggle("gender", g.id)}>{g.label}</Pill>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Step 1 : Objectifs ── */}
              {step === 1 && (
                <div className="grid grid-cols-2 gap-2.5">
                  {GOALS.map(g => (
                    <motion.button key={g.id} type="button" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }}
                      onClick={() => toggle("goals", g.id)}
                      className="flex items-center gap-3 px-4 py-3.5 rounded-2xl cursor-pointer border text-left"
                      style={data.goals.includes(g.id)
                        ? { background: "linear-gradient(135deg,rgba(var(--violet-mid-rgb),0.85),rgba(var(--cream-mid-rgb),0.85))", borderColor: "rgba(var(--accent-rgb),0.4)", boxShadow: "inset 0 1px 0 rgba(var(--surface-rgb),0.9)" }
                        : { background: "rgba(var(--surface-rgb),0.5)", borderColor: "rgba(var(--surface-rgb),0.7)" }
                      }>
                      <span className="text-xl">{g.emoji}</span>
                      <span className="text-xs font-semibold" style={{ color: data.goals.includes(g.id) ? "var(--text-1)" : "var(--text-2)" }}>{g.label}</span>
                    </motion.button>
                  ))}
                </div>
              )}

              {/* ── Step 2 : Niveau + séances ── */}
              {step === 2 && (
                <div className="flex flex-col gap-5">
                  <div className="flex flex-col gap-2">
                    {LEVELS.map(l => (
                      <motion.button key={l.id} type="button" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                        onClick={() => toggle("level", l.id)}
                        className="flex items-center justify-between px-4 py-3.5 rounded-2xl cursor-pointer border"
                        style={data.level === l.id
                          ? { background: "linear-gradient(135deg,rgba(var(--violet-mid-rgb),0.85),rgba(var(--cream-mid-rgb),0.85))", borderColor: "rgba(var(--accent-rgb),0.4)", boxShadow: "inset 0 1px 0 rgba(var(--surface-rgb),0.9)" }
                          : { background: "rgba(var(--surface-rgb),0.5)", borderColor: "rgba(var(--surface-rgb),0.7)" }
                        }>
                        <span className="text-sm font-semibold" style={{ color: data.level === l.id ? "var(--text-1)" : "var(--text-2)" }}>{l.label}</span>
                        <span className="text-xs font-light" style={{ color: "var(--text-3)" }}>{l.sub}</span>
                      </motion.button>
                    ))}
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold tracking-widest uppercase mb-2 block" style={{ color: "var(--text-3)" }}>Séances / semaine</label>
                    <div className="flex gap-1.5 flex-wrap">
                      {SESSIONS.map(s => (
                        <Pill key={s} active={data.sessionsPerWeek === s} onClick={() => toggle("sessionsPerWeek", s)}>{s}x</Pill>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Step 3 : Nutrition ── */}
              {step === 3 && (
                <div className="flex flex-col gap-5">
                  <div>
                    <label className="text-[10px] font-semibold tracking-widest uppercase mb-2 block" style={{ color: "var(--text-3)" }}>Repas par jour</label>
                    <div className="flex gap-2 flex-wrap">
                      {MEALS.map(m => (
                        <Pill key={m} active={data.mealsPerDay === m} onClick={() => toggle("mealsPerDay", m)}>{m}</Pill>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold tracking-widest uppercase mb-2 block" style={{ color: "var(--text-3)" }}>Alimentation</label>
                    <div className="grid grid-cols-2 gap-2">
                      {DIETS.map(d => (
                        <motion.button key={d.id} type="button" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
                          onClick={() => toggle("diet", d.id)}
                          className="flex items-center gap-2.5 px-4 py-3 rounded-2xl cursor-pointer border"
                          style={data.diet === d.id
                            ? { background: "linear-gradient(135deg,rgba(var(--violet-mid-rgb),0.85),rgba(var(--cream-mid-rgb),0.85))", borderColor: "rgba(var(--accent-rgb),0.4)", boxShadow: "inset 0 1px 0 rgba(var(--surface-rgb),0.9)" }
                            : { background: "rgba(var(--surface-rgb),0.5)", borderColor: "rgba(var(--surface-rgb),0.7)" }
                          }>
                          <span className="text-base">{d.emoji}</span>
                          <span className="text-xs font-semibold" style={{ color: data.diet === d.id ? "var(--text-1)" : "var(--text-2)" }}>{d.label}</span>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Step 4 : WhatsApp (facultatif) ── */}
              {step === 4 && (
                <div className="flex flex-col gap-4">
                  <button type="button" onClick={() => setData(d => ({ ...d, whatsapp: !d.whatsapp }))}
                    className="flex items-center justify-between gap-3 px-4 py-3.5 rounded-2xl cursor-pointer border text-left"
                    style={data.whatsapp
                      ? { background: "linear-gradient(135deg,rgba(var(--violet-mid-rgb),0.85),rgba(var(--cream-mid-rgb),0.85))", borderColor: "rgba(var(--accent-rgb),0.4)", boxShadow: "inset 0 1px 0 rgba(var(--surface-rgb),0.9)" }
                      : { background: "rgba(var(--surface-rgb),0.5)", borderColor: "rgba(var(--surface-rgb),0.7)" }
                    }>
                    <span className="flex items-center gap-2.5 min-w-0">
                      <span className="text-xl">💬</span>
                      <span className="text-sm font-semibold" style={{ color: data.whatsapp ? "var(--text-1)" : "var(--text-2)" }}>
                        Rappels &amp; motivation sur WhatsApp
                      </span>
                    </span>
                    <span className="relative flex-shrink-0 w-10 h-6 rounded-full transition-colors"
                      style={{ background: data.whatsapp ? "var(--accent)" : "rgba(var(--text-3-rgb),0.35)" }}>
                      <motion.span className="absolute top-0.5 w-5 h-5 rounded-full bg-white"
                        animate={{ left: data.whatsapp ? 18 : 2 }} transition={{ type: "spring", stiffness: 500, damping: 32 }} />
                    </span>
                  </button>

                  {data.whatsapp ? (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: "var(--text-3)" }}>Ton numéro WhatsApp</label>
                      <div className="flex items-center gap-2 px-4 py-3 rounded-2xl"
                        style={{ background: "rgba(var(--surface-rgb),0.7)", border: "1px solid rgba(var(--surface-rgb),0.8)" }}>
                        <input type="tel" inputMode="tel" value={data.phone}
                          onChange={e => setData(d => ({ ...d, phone: e.target.value }))}
                          placeholder="+33 6 12 34 56 78" autoComplete="tel"
                          className="flex-1 bg-transparent text-sm outline-none placeholder:text-[#C4CAD4]"
                          style={{ color: "var(--text-1)" }} />
                      </div>
                      <p className="text-[11px] font-light leading-snug mt-0.5" style={{ color: "var(--text-3)" }}>
                        En laissant ton numéro, tu acceptes de recevoir des rappels et de la motivation de Vaiiya sur WhatsApp. Rien d&apos;autre, et tu pourras te désinscrire à tout moment.
                      </p>
                    </div>
                  ) : (
                    <p className="text-[12px] font-light leading-snug" style={{ color: "var(--text-3)" }}>
                      Facultatif — de petits rappels pour ne pas lâcher ta série. Tu peux l&apos;activer plus tard dans les réglages.
                    </p>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-7 py-5 flex flex-col gap-3" style={{ borderTop: "1px solid rgba(var(--accent-rgb),0.08)" }}>
          <div className="flex gap-3">
            {step > 0 && (
              <motion.button type="button" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }} onClick={() => go(-1)}
                className="flex items-center gap-1.5 px-4 py-3 rounded-2xl cursor-pointer"
                style={{ background: "rgba(var(--surface-rgb),0.6)", border: "1px solid rgba(var(--surface-rgb),0.8)", color: "var(--text-2)" }}>
                <ChevronLeft size={16} strokeWidth={2} />
                <span className="text-sm font-medium">Retour</span>
              </motion.button>
            )}
            <motion.button type="button" disabled={!canNext}
              whileHover={canNext ? { scale: 1.02, y: -1 } : {}} whileTap={canNext ? { scale: 0.97 } : {}}
              onClick={() => step < steps.length - 1 ? go(1) : onComplete(data)}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold cursor-pointer"
              style={{
                background: canNext ? "linear-gradient(135deg,var(--accent) 0%,var(--gold) 100%)" : "rgba(220,220,220,0.5)",
                color: canNext ? "#fff" : "var(--text-3)",
                boxShadow: canNext ? "0 4px 20px rgba(var(--accent-rgb),0.4)" : "none",
                opacity: canNext ? 1 : 0.6,
              }}>
              {step === steps.length - 1 ? <><Sparkles size={14} strokeWidth={1.5} /><span>Terminer</span></> : <><span>Continuer</span><ChevronRight size={16} strokeWidth={2} /></>}
            </motion.button>
          </div>

          <button type="button" onClick={onSkip}
            className="text-center text-xs font-light cursor-pointer hover:underline transition-all"
            style={{ color: "var(--text-3)" }}>
            Répondre plus tard
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
