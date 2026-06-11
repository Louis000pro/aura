"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, Dumbbell, Settings, Home, MapPin, Play, X } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

/* ─── Types ─── */
type WorkoutDay = {
  jour: string;
  type: "Repos" | "Cardio" | "Force" | "Mobilité" | "HIIT" | "Endurance" | "Full Body" | "Haut du corps" | "Bas du corps" | string;
  titre: string;
  exercices: string[];
  duree: string;
};

type Programme = {
  semaine: WorkoutDay[];
};

type ProfileData = {
  onboarding_level: string | null;
  onboarding_sessions_week: number | null;
  onboarding_goals: string[] | null;
  onboarding_age: number | null;
  onboarding_weight: number | null;
};

/* ─── Badge styles by type ─── */
function getBadgeStyle(type: string): React.CSSProperties {
  const t = type.toLowerCase();
  if (t === "repos") return { background: "rgba(160,174,192,0.15)", color: "#718096", borderRadius: 999, padding: "2px 10px", fontSize: 11, fontWeight: 600 };
  if (t === "cardio" || t === "endurance") return { background: "rgba(96,165,250,0.15)", color: "#2563EB", borderRadius: 999, padding: "2px 10px", fontSize: 11, fontWeight: 600 };
  if (t === "force" || t === "haut du corps" || t === "bas du corps") return { background: "rgba(167,139,250,0.15)", color: "#7C3AED", borderRadius: 999, padding: "2px 10px", fontSize: 11, fontWeight: 600 };
  if (t === "hiit") return { background: "rgba(252,129,129,0.15)", color: "#DC2626", borderRadius: 999, padding: "2px 10px", fontSize: 11, fontWeight: 600 };
  if (t === "mobilité") return { background: "rgba(52,211,153,0.15)", color: "#059669", borderRadius: 999, padding: "2px 10px", fontSize: 11, fontWeight: 600 };
  if (t === "full body") return { background: "rgba(251,191,36,0.15)", color: "#D97706", borderRadius: 999, padding: "2px 10px", fontSize: 11, fontWeight: 600 };
  // default
  return { background: "rgba(167,139,250,0.15)", color: "#7C3AED", borderRadius: 999, padding: "2px 10px", fontSize: 11, fontWeight: 600 };
}

/* ─── Goal labels ─── */
const goalLabels: Record<string, string> = {
  masse: "prise de masse",
  prise_de_masse: "prise de masse",
  poids: "perte de poids",
  perte_de_poids: "perte de poids",
  force: "force",
  endurance: "endurance",
  sante: "santé générale",
  sante_generale: "santé générale",
  souplesse: "souplesse",
};

/* ─── Cache helpers ─── */
function getCacheKey(userId: string): string {
  const now = new Date();
  // ISO week number
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const week = Math.ceil(((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
  return `aura_programme_${userId}_w${week}_${now.getFullYear()}`;
}

function loadFromCache(key: string): Programme | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as Programme;
  } catch {
    return null;
  }
}

function saveToCache(key: string, data: Programme): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch { /* ignore */ }
}

const DAY_LABELS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

/* ─── Skeleton inline ─── */
function SkeletonDetail() {
  return (
    <div className="flex flex-col gap-2 pt-1">
      {[60, 80, 50, 70, 55].map((w, i) => (
        <motion.div key={i} className="rounded-full"
          style={{ height: 10, width: `${w}%`, background: "rgba(167,139,250,0.1)" }}
          animate={{ opacity: [0.4, 0.9, 0.4] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut", delay: i * 0.12 }} />
      ))}
    </div>
  );
}

/* ─── Nettoie le nom d'un exercice pour une recherche vidéo propre ─── */
function cleanExerciseName(raw: string): string {
  return raw
    .replace(/\s*\d+\s*[x×]\s*\d+.*$/i, "") // "4x8", "3 x 12 …"
    .replace(/\s*[-–:]\s*\d+.*$/, "")        // "- 30s", ": 12 reps"
    .replace(/\s*\d+\s*(reps?|répétitions?|sec|s|min|kg)\b.*$/i, "")
    .replace(/\(.*?\)/g, "")                  // parenthèses
    .trim() || raw.trim();
}

/* ─── Modal tuto vidéo d'un exercice (référence YouTube) ─── */
function ExerciseTutorial({ exercise, onClose }: { exercise: string; onClose: () => void }) {
  const [videoId, setVideoId] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "none">("loading");
  const clean = cleanExerciseName(exercise);

  useEffect(() => {
    let cancelled = false;
    setState("loading"); setVideoId(null);
    fetch(`/api/exercise-video?q=${encodeURIComponent(clean)}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d.videoId) { setVideoId(d.videoId); setState("ready"); }
        else setState("none");
      })
      .catch(() => { if (!cancelled) setState("none"); });
    return () => { cancelled = true; };
  }, [clean]);

  const ytSearch = `https://www.youtube.com/results?search_query=${encodeURIComponent(clean + " technique musculation")}`;

  if (typeof document === "undefined") return null;

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[120] flex items-center justify-center px-4"
      style={{ background: "rgba(40,30,70,0.55)", backdropFilter: "blur(8px)" }}
    >
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.97 }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-3xl overflow-hidden"
        style={{ background: "rgba(255,255,255,0.97)", border: "1px solid rgba(255,255,255,0.9)", boxShadow: "0 24px 70px rgba(167,139,250,0.3)" }}
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: "#A78BFA" }}>Tuto · démo</p>
            <p className="text-sm font-semibold truncate" style={{ color: "#2D3748" }}>{clean}</p>
          </div>
          <button type="button" onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 cursor-pointer"
            style={{ background: "rgba(167,139,250,0.12)" }}>
            <X size={15} strokeWidth={2} style={{ color: "#A78BFA" }} />
          </button>
        </div>

        {state === "loading" && (
          <div className="aspect-video w-full flex items-center justify-center" style={{ background: "rgba(167,139,250,0.06)" }}>
            <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: "rgba(167,139,250,0.25)", borderTopColor: "#A78BFA" }} />
          </div>
        )}
        {state === "ready" && videoId && (
          <div className="aspect-video w-full">
            <iframe
              className="w-full h-full"
              src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&autoplay=1`}
              title={`Démo ${clean}`}
              loading="lazy"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}
        {state === "none" && (
          <a href={ytSearch} target="_blank" rel="noopener noreferrer"
            className="aspect-video w-full flex flex-col items-center justify-center gap-2 text-center px-4"
            style={{ background: "rgba(167,139,250,0.06)", color: "#A78BFA" }}>
            <span className="inline-flex items-center justify-center w-12 h-12 rounded-full" style={{ background: "#FF0000" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7z" /></svg>
            </span>
            <span className="text-sm font-semibold">Voir la démo sur YouTube</span>
          </a>
        )}
        <p className="text-[11px] font-light text-center px-5 py-3" style={{ color: "#A0AEC0" }}>
          Inspire-toi de la technique, adapte à ton niveau 💪
        </p>
      </motion.div>
    </motion.div>,
    document.body
  );
}

/* ─── Day detail panel ─── */
function DayDetail({ day, onTuto }: { day: WorkoutDay; onTuto: (ex: string) => void }) {
  const isRest = day.type.toLowerCase() === "repos";
  return (
    <motion.div key={day.jour}
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2, ease: "easeOut" }}
      className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2 flex-wrap">
        <span style={getBadgeStyle(day.type)}>{day.type}</span>
        {day.duree && !isRest && (
          <span className="text-[10px] font-medium" style={{ color: "#A0AEC0" }}>{day.duree}</span>
        )}
      </div>
      {!isRest && day.titre && (
        <p className="text-sm font-medium leading-snug" style={{ color: "#2D3748" }}>{day.titre}</p>
      )}
      {isRest && (
        <p className="text-xs font-light" style={{ color: "#A0AEC0" }}>Journée de récupération — repose-toi bien 💤</p>
      )}
      {!isRest && day.exercices && day.exercices.length > 0 && (
        <div className="flex flex-col gap-1.5 mt-0.5">
          {day.exercices.map((ex, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onTuto(ex)}
              className="flex items-center gap-2 w-full text-left rounded-xl px-2 py-1.5 -mx-1 cursor-pointer transition-colors"
              style={{ background: "rgba(167,139,250,0.05)" }}
              aria-label={`Voir le tuto : ${ex}`}
            >
              <div className="rounded-full flex-shrink-0" style={{ width: 4, height: 4, background: "#A78BFA", opacity: 0.8 }} />
              <p className="text-[11px] leading-snug flex-1" style={{ color: "#4A5568" }}>{ex}</p>
              <span className="flex items-center gap-1 flex-shrink-0 rounded-full px-2 py-0.5"
                style={{ background: "rgba(167,139,250,0.12)" }}>
                <Play size={9} strokeWidth={2.5} style={{ color: "#A78BFA" }} fill="#A78BFA" />
                <span className="text-[9px] font-semibold" style={{ color: "#A78BFA" }}>Tuto</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
}

/* ─── Question du lieu d'entraînement (posée par le coach IA) ─── */
function LocationQuestion({ onChoose }: { onChoose: (loc: "salle" | "maison") => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-3 pt-1"
    >
      <div className="flex items-start gap-2.5 rounded-2xl px-3.5 py-3"
        style={{ background: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.18)" }}>
        <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ background: "linear-gradient(135deg,#D4C0FF,#F5E6A3)" }}>
          <Dumbbell size={13} strokeWidth={1.8} style={{ color: "#2D3748" }} />
        </div>
        <p className="text-[13px] font-light leading-snug" style={{ color: "#2D3748" }}>
          Avant de te créer ton programme, dis-moi : tu t&apos;entraînes plutôt <strong className="font-semibold">en salle</strong> ou <strong className="font-semibold">à la maison</strong> ? J&apos;adapterai les exercices 💪
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <motion.button whileTap={{ scale: 0.96 }} onClick={() => onChoose("salle")}
          className="flex flex-col items-center gap-1.5 py-4 rounded-2xl cursor-pointer"
          style={{ background: "rgba(255,255,255,0.8)", border: "1px solid rgba(212,192,255,0.5)", boxShadow: "0 2px 12px rgba(167,139,250,0.1)" }}>
          <Dumbbell size={20} strokeWidth={1.5} style={{ color: "#A78BFA" }} />
          <span className="text-sm font-semibold" style={{ color: "#2D3748" }}>En salle</span>
          <span className="text-[10px] font-light" style={{ color: "#A0AEC0" }}>Machines & charges</span>
        </motion.button>
        <motion.button whileTap={{ scale: 0.96 }} onClick={() => onChoose("maison")}
          className="flex flex-col items-center gap-1.5 py-4 rounded-2xl cursor-pointer"
          style={{ background: "rgba(255,255,255,0.8)", border: "1px solid rgba(245,230,163,0.6)", boxShadow: "0 2px 12px rgba(212,168,67,0.1)" }}>
          <Home size={20} strokeWidth={1.5} style={{ color: "#D4A843" }} />
          <span className="text-sm font-semibold" style={{ color: "#2D3748" }}>À la maison</span>
          <span className="text-[10px] font-light" style={{ color: "#A0AEC0" }}>Poids du corps</span>
        </motion.button>
      </div>
    </motion.div>
  );
}

/* ─── Question matériel à la maison (haltères ?) ─── */
function HomeEquipQuestion({ onChoose, onBack }: { onChoose: (e: "halteres" | "poids") => void; onBack: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-3 pt-1"
    >
      <div className="flex items-start gap-2.5 rounded-2xl px-3.5 py-3"
        style={{ background: "rgba(212,168,67,0.08)", border: "1px solid rgba(212,168,67,0.18)" }}>
        <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ background: "linear-gradient(135deg,#F5E6A3,#D4C0FF)" }}>
          <Dumbbell size={13} strokeWidth={1.8} style={{ color: "#2D3748" }} />
        </div>
        <p className="text-[13px] font-light leading-snug" style={{ color: "#2D3748" }}>
          Super, à la maison ! Une dernière chose : tu as des <strong className="font-semibold">haltères</strong> ? Sinon je te fais tout au <strong className="font-semibold">poids du corps</strong> 💪
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <motion.button whileTap={{ scale: 0.96 }} onClick={() => onChoose("halteres")}
          className="flex flex-col items-center gap-1.5 py-4 rounded-2xl cursor-pointer"
          style={{ background: "rgba(255,255,255,0.8)", border: "1px solid rgba(245,230,163,0.6)", boxShadow: "0 2px 12px rgba(212,168,67,0.1)" }}>
          <Dumbbell size={20} strokeWidth={1.5} style={{ color: "#D4A843" }} />
          <span className="text-sm font-semibold" style={{ color: "#2D3748" }}>Oui, haltères</span>
          <span className="text-[10px] font-light" style={{ color: "#A0AEC0" }}>Poids du corps + haltères</span>
        </motion.button>
        <motion.button whileTap={{ scale: 0.96 }} onClick={() => onChoose("poids")}
          className="flex flex-col items-center gap-1.5 py-4 rounded-2xl cursor-pointer"
          style={{ background: "rgba(255,255,255,0.8)", border: "1px solid rgba(212,192,255,0.5)", boxShadow: "0 2px 12px rgba(167,139,250,0.1)" }}>
          <Home size={20} strokeWidth={1.5} style={{ color: "#A78BFA" }} />
          <span className="text-sm font-semibold" style={{ color: "#2D3748" }}>Non</span>
          <span className="text-[10px] font-light" style={{ color: "#A0AEC0" }}>Poids du corps uniquement</span>
        </motion.button>
      </div>
      <button onClick={onBack} className="text-[10px] font-medium self-center cursor-pointer" style={{ color: "#A0AEC0", background: "none", border: "none" }}>
        ← Changer de lieu
      </button>
    </motion.div>
  );
}

/* ─── Main Component ─── */
export default function WeeklyProgramme() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [programme, setProgramme] = useState<Programme | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Lieu d'entraînement (salle / maison) — demandé par le coach avant génération
  const [location, setLocation] = useState<"salle" | "maison" | null>(null);
  // Matériel à la maison : haltères ou poids du corps uniquement
  const [homeEquip, setHomeEquip] = useState<"halteres" | "poids" | null>(null);
  const forceNextRef = useRef(false);
  // Exercice dont on affiche le tuto vidéo (null = fermé)
  const [tuto, setTuto] = useState<string | null>(null);

  /* ── Charge le lieu + matériel enregistrés ── */
  useEffect(() => {
    if (!user) return;
    try {
      const v = localStorage.getItem(`vaiiya_lieu_${user.id}`);
      if (v === "salle" || v === "maison") setLocation(v);
      const e = localStorage.getItem(`vaiiya_lieu_equip_${user.id}`);
      if (e === "halteres" || e === "poids") setHomeEquip(e);
    } catch { /* ignore */ }
  }, [user]);

  /* ── Sync si le lieu change ailleurs (ex: coach chat) ── */
  useEffect(() => {
    const handler = () => {
      if (!user) return;
      try {
        const v = localStorage.getItem(`vaiiya_lieu_${user.id}`);
        if (v === "salle" || v === "maison") { forceNextRef.current = true; setLocation(v); }
        const e = localStorage.getItem(`vaiiya_lieu_equip_${user.id}`);
        setHomeEquip(e === "halteres" || e === "poids" ? e : null);
      } catch { /* ignore */ }
    };
    window.addEventListener("lieu-updated", handler);
    return () => window.removeEventListener("lieu-updated", handler);
  }, [user]);

  const chooseLocation = useCallback((loc: "salle" | "maison") => {
    if (loc === "salle") {
      if (user) {
        try {
          localStorage.setItem(`vaiiya_lieu_${user.id}`, "salle");
          localStorage.removeItem(`vaiiya_lieu_equip_${user.id}`);
        } catch { /* ignore */ }
      }
      forceNextRef.current = true;
      setHomeEquip(null);
      setLocation("salle");
    } else {
      // Maison → on demande ensuite s'il a des haltères (pas de génération tout de suite)
      if (user) {
        try { localStorage.setItem(`vaiiya_lieu_${user.id}`, "maison"); } catch { /* ignore */ }
      }
      setHomeEquip(null);
      setLocation("maison");
    }
  }, [user]);

  const chooseHomeEquip = useCallback((equip: "halteres" | "poids") => {
    if (user) {
      try { localStorage.setItem(`vaiiya_lieu_equip_${user.id}`, equip); } catch { /* ignore */ }
    }
    forceNextRef.current = true; // force la régénération avec le matériel choisi
    setHomeEquip(equip);
  }, [user]);

  // Today's day index (0 = Lundi … 6 = Dimanche), fallback to 0
  const todayIndex = (() => { const d = new Date().getDay(); return d === 0 ? 6 : d - 1; })();
  const [selectedDay, setSelectedDay] = useState(todayIndex);

  /* ── Fetch profile ── */
  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    supabase
      .from("profiles")
      .select("onboarding_level, onboarding_sessions_week, onboarding_goals, onboarding_age, onboarding_weight")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data, error: err }) => {
        if (!err && data) {
          setProfile(data as ProfileData);
        }
        setProfileLoaded(true);
      });
  }, [user]);

  /* ── Generate programme ── */
  const generate = useCallback(
    async (loc: "salle" | "maison" | null, equip: "halteres" | "poids" | null, force = false) => {
      if (!user || !profile) return;

      // Check cache first (unless forced)
      const cacheKey = getCacheKey(user.id);
      if (!force) {
        const cached = loadFromCache(cacheKey);
        if (cached) {
          setProgramme(cached);
          return;
        }
      }

      setLoading(true);
      setError(null);

      const level = profile.onboarding_level ?? "intermédiaire";
      const sessions = profile.onboarding_sessions_week ?? 3;
      const goals = (profile.onboarding_goals ?? [])
        .map((g) => goalLabels[g] ?? g)
        .join(", ") || "forme générale";
      const lieuLine =
        loc === "salle"
          ? "- Lieu: EN SALLE DE SPORT type BASIC FIT. Base-toi UNIQUEMENT sur le matériel d'une salle Basic Fit : machines guidées (presse à cuisses, leg extension, leg curl, pec deck, tirage vertical/poitrine, rowing assis, développé épaules, abducteurs/adducteurs, mollets), machine Smith, poulies/câbles, racks, haltères et barres, plus cardio (tapis, vélo, elliptique, rameur). Propose des exercices réalisables avec cet équipement."
          : loc === "maison" && equip === "halteres"
          ? "- Lieu: À LA MAISON AVEC HALTÈRES. Utilise EXCLUSIVEMENT des exercices au poids du corps ET avec des haltères (éventuellement un banc ou une chaise). AUCUNE machine, AUCUNE poulie, AUCune barre de salle."
          : loc === "maison"
          ? "- Lieu: À LA MAISON SANS MATÉRIEL. Utilise EXCLUSIVEMENT des exercices au POIDS DU CORPS (aucun haltère, aucune machine, aucun élastique). Joue sur les variations, le tempo, l'amplitude et le nombre de répétitions."
          : "";

      const prompt = `Tu es un coach sportif expert. Génère un programme hebdomadaire personnalisé en JSON pour cet utilisateur:
- Niveau: ${level}
- Objectifs: ${goals}
- Séances/semaine: ${sessions}
${lieuLine}
Réponds UNIQUEMENT avec un JSON valide de cette forme:
{ "semaine": [ { "jour": "Lundi", "type": "Repos", "titre": "", "exercices": [], "duree": "" }, { "jour": "Mardi", "type": "Force", "titre": "Push Day", "exercices": ["Développé couché 4x8", "Pompes 3x12", "Élévations latérales 3x15"], "duree": "45 min" } ] }
Maximum 7 jours, exactement ${sessions} séances actives, le reste en Repos.
Pour les jours de repos: type "Repos", titre "", exercices [], duree "".`;

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [{ role: "user", content: prompt }],
            maxTokens: 2500,
          }),
        });

        if (!response.ok || !response.body) throw new Error("API error");

        // Consume the full stream
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          fullText += decoder.decode(value, { stream: true });
        }

        // Extract JSON from the response
        const match = fullText.match(/\{[\s\S]*\}/);
        if (!match) throw new Error("No JSON found in response");

        const parsed: Programme = JSON.parse(match[0]);

        // Validate basic structure
        if (!parsed.semaine || !Array.isArray(parsed.semaine)) {
          throw new Error("Invalid programme structure");
        }

        saveToCache(cacheKey, parsed);
        setProgramme(parsed);
      } catch (err) {
        console.error("Programme generation error:", err);
        setError("Impossible de générer le programme. Réessaie.");
      } finally {
        setLoading(false);
      }
    },
    [user, profile]
  );

  /* ── Auto-generate on profile load (lieu connu + matériel si maison) ── */
  useEffect(() => {
    const ready = location === "salle" || (location === "maison" && homeEquip);
    if (profileLoaded && profile && profile.onboarding_level && ready) {
      const f = forceNextRef.current;
      forceNextRef.current = false;
      generate(location, homeEquip, f);
    }
  }, [profileLoaded, profile, location, homeEquip, generate]);

  /* ── Recharge depuis le cache quand l'IA modifie le programme ── */
  useEffect(() => {
    const handler = () => {
      if (!user) return;
      const now = new Date();
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      const week = Math.ceil(((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
      const key = `aura_programme_${user.id}_w${week}_${now.getFullYear()}`;
      try {
        const raw = localStorage.getItem(key);
        if (raw) setProgramme(JSON.parse(raw));
      } catch { /* ignore */ }
    };
    window.addEventListener("programme-updated", handler);
    return () => window.removeEventListener("programme-updated", handler);
  }, [user]);

  /* ── Refs (must be before any conditional return — Rules of Hooks) ── */
  const trackRef = useRef<HTMLDivElement>(null);
  const namesRef = useRef<HTMLDivElement>(null);
  const nameRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Scroll le nom sélectionné dans la vue quand le slider bouge
  // ⚠️ Doit rester AVANT tout return conditionnel (Rules of Hooks)
  useEffect(() => {
    nameRefs.current[selectedDay]?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [selectedDay]);

  /* ── No profile data ── */
  const hasOnboardingData =
    profile &&
    (profile.onboarding_level ||
      profile.onboarding_sessions_week ||
      (profile.onboarding_goals && profile.onboarding_goals.length > 0));

  if (profileLoaded && !hasOnboardingData) {
    return (
      <div className="px-6 pb-4">
        <p
          className="text-lg font-light mb-3"
          style={{ color: "#2D3748" }}
        >
          Programme auto-généré
        </p>
        <div
          className="rounded-2xl p-5 flex items-center gap-4"
          style={{
            background: "rgba(255,255,255,0.7)",
            backdropFilter: "blur(12px)",
            boxShadow:
              "0 4px 24px rgba(167,139,250,0.1), inset 0 1px 0 rgba(255,255,255,0.8)",
          }}
        >
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(167,139,250,0.12)" }}
          >
            <Dumbbell size={18} strokeWidth={1.5} style={{ color: "#A78BFA" }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium mb-0.5" style={{ color: "#2D3748" }}>
              Complète ton profil pour obtenir ton programme
            </p>
            <p className="text-xs font-light" style={{ color: "#A0AEC0" }}>
              Niveau, objectifs et fréquence requis
            </p>
          </div>
          <Link href="/parametres">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl"
              style={{
                background: "linear-gradient(135deg,#D4C0FF 0%,#F5E6A3 100%)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)",
              }}
            >
              <Settings size={12} strokeWidth={2} style={{ color: "#2D3748" }} />
              <span className="text-xs font-semibold" style={{ color: "#2D3748" }}>
                Réglages
              </span>
            </motion.div>
          </Link>
        </div>
      </div>
    );
  }

  const resetLocation = () => {
    if (user) {
      try {
        localStorage.removeItem(`vaiiya_lieu_${user.id}`);
        localStorage.removeItem(`vaiiya_lieu_equip_${user.id}`);
      } catch { /* ignore */ }
    }
    setHomeEquip(null);
    setLocation(null);
  };

  // Lieu pas encore choisi → le coach pose la question avant de générer
  if (profileLoaded && hasOnboardingData && !location) {
    return <LocationQuestion onChoose={chooseLocation} />;
  }
  // Maison choisie mais matériel inconnu → on demande s'il a des haltères
  if (profileLoaded && hasOnboardingData && location === "maison" && !homeEquip) {
    return <HomeEquipQuestion onChoose={chooseHomeEquip} onBack={resetLocation} />;
  }

  const currentDay = programme?.semaine?.[selectedDay];

  const getDayFromX = (clientX: number): number => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return selectedDay;
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    // 7 segments égaux : chaque jour occupe 1/7 de la largeur
    return Math.min(6, Math.floor((x / rect.width) * 7));
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setSelectedDay(getDayFromX(e.clientX));
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    setSelectedDay(getDayFromX(e.clientX));
  };

  // Centre de chaque segment sur une grille de 7 (ex: jour 0 → 7.1%, jour 6 → 92.9%)
  const pct = ((selectedDay + 0.5) / 7) * 100;

  return (
    <div className="flex flex-col gap-3">

      {/* ── Slider jour ── */}
      <div className="flex flex-col gap-2">

        {/* Noms complets scrollables */}
        <div ref={namesRef} className="flex overflow-x-auto gap-4 pb-0.5" style={{ scrollbarWidth: "none" }}>
          {DAY_LABELS.map((label, i) => (
            <button key={label}
              ref={el => { nameRefs.current[i] = el; }}
              onClick={() => setSelectedDay(i)}
              className="flex-shrink-0 cursor-pointer select-none"
              style={{
                color: i === selectedDay ? "#2D3748" : "#A0AEC0",
                fontWeight: i === selectedDay ? 600 : 400,
                fontSize: 12,
                transition: "color 0.15s, font-weight 0.15s",
                background: "none", border: "none", padding: 0,
              }}>
              {label}
            </button>
          ))}
        </div>

        {/* Track draggable — pas de rond, juste la barre qui se remplit */}
        <div ref={trackRef}
          className="relative rounded-full cursor-pointer select-none touch-none"
          style={{ height: 5, background: "rgba(167,139,250,0.12)" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}>
          {/* Fill — centré sur le segment du jour */}
          <div className="absolute left-0 top-0 h-full rounded-full pointer-events-none"
            style={{ width: `${pct}%`, background: "linear-gradient(90deg, #A78BFA, #D4A843)", transition: "width 0.12s ease" }} />
        </div>

        {/* Lieu + Régénérer */}
        {programme && !loading && (
          <div className="flex justify-between items-center">
            <button
              onClick={resetLocation}
              className="flex items-center gap-1 cursor-pointer" style={{ color: "#A0AEC0", background: "none", border: "none", padding: 0 }}>
              {location === "maison" ? <Home size={10} strokeWidth={2} /> : <MapPin size={10} strokeWidth={2} />}
              <span className="text-[9px] font-medium">
                {location === "maison" ? (homeEquip === "halteres" ? "Maison · haltères" : "Maison · poids du corps") : "En salle"} · changer
              </span>
            </button>
            <button
              onClick={() => generate(location, homeEquip, true)}
              className="flex items-center gap-1 cursor-pointer" style={{ color: "#A0AEC0", background: "none", border: "none", padding: 0 }}>
              <RefreshCw size={10} strokeWidth={2.5} />
              <span className="text-[9px] font-medium">Régénérer</span>
            </button>
          </div>
        )}
      </div>

      {/* ── Détail du jour sélectionné ── */}
      <div className="min-h-[100px]">
        {/* Erreur */}
        {error && !loading && (
          <div className="rounded-2xl p-3 flex items-center justify-between"
            style={{ background: "rgba(252,129,129,0.08)", border: "1px solid rgba(252,129,129,0.18)" }}>
            <p className="text-xs" style={{ color: "#DC2626" }}>{error}</p>
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => generate(location, homeEquip, true)}
              className="text-[10px] font-semibold px-2.5 py-1 rounded-lg cursor-pointer"
              style={{ background: "rgba(252,129,129,0.15)", color: "#DC2626" }}>
              Réessayer
            </motion.button>
          </div>
        )}

        {/* Skeleton */}
        {(loading || (!programme && profileLoaded && hasOnboardingData)) && <SkeletonDetail />}

        {/* Contenu */}
        <AnimatePresence mode="wait">
          {!loading && currentDay && <DayDetail key={selectedDay} day={currentDay} onTuto={setTuto} />}
        </AnimatePresence>
      </div>

      {/* Modal tuto vidéo de l'exercice sélectionné */}
      <AnimatePresence>
        {tuto && <ExerciseTutorial exercise={tuto} onClose={() => setTuto(null)} />}
      </AnimatePresence>
    </div>
  );
}
