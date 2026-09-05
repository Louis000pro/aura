"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { aiFetch } from "@/lib/aiFetch";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, Dumbbell, Settings, Home, MapPin, Play, X, Lock, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import WorkoutGuideModal from "@/components/WorkoutGuideModal";
import {
  lireSemaine, reposerLaSemaine, setDayStatus, ctxFromLieu, dayTitle, persistLieu, loadLieu,
  weekDatesForOffset, weekOffsetOf, weekdayIndex, todayWeekIndex, parDate,
  type PlanningDay, type GenInput,
} from "@/lib/planning";

/** Nombre max de semaines en avant qu'on autorise à consulter. */
const MAX_WEEK_AHEAD = 6;

/* ─── Types ─── */
type ProfileData = {
  onboarding_level: string | null;
  onboarding_sessions_week: number | null;
  onboarding_goals: string[] | null;
  onboarding_age: number | null;
  onboarding_weight: number | null;
};

/* ─── Badge styles by type — Système D : type = rôle couleur (comme le catalogue) ─── */
function getBadgeStyle(type: string): React.CSSProperties {
  const base = { borderRadius: 999, padding: "2px 10px", fontSize: 11, fontWeight: 600 } as const;
  const t = type.toLowerCase();
  if (t === "repos") return { ...base, background: "rgba(var(--text-3-rgb),0.15)", color: "var(--text-2)" };
  // cardio / endurance / HIIT = énergie = orange
  if (t === "cardio" || t === "endurance" || t === "hiit") return { ...base, background: "rgba(232,98,12,0.14)", color: "#E8620C" };
  // mobilité = corps / récup = teal
  if (t === "mobilité") return { ...base, background: "rgba(43,212,160,0.15)", color: "#12A87E" };
  // force / haut / bas / full body / défaut = résistance = violet (action)
  return { ...base, background: "rgba(139,92,246,0.15)", color: "#8B5CF6" };
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

const DAY_LABELS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

/* ─── Skeleton inline ─── */
function SkeletonDetail() {
  return (
    <div className="flex flex-col gap-2 pt-1">
      {[60, 80, 50, 70, 55].map((w, i) => (
        <motion.div key={i} className="rounded-full"
          style={{ height: 10, width: `${w}%`, background: "rgba(var(--accent-rgb),0.1)" }}
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
    aiFetch(`/api/exercise-video?q=${encodeURIComponent(clean)}`)
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
        style={{ background: "rgba(var(--surface-rgb),0.97)", border: "1px solid rgba(var(--surface-rgb),0.9)", boxShadow: "var(--ombre-flottant)" }}
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <div className="min-w-0">
            <p className="vy-label" style={{ color: "var(--exp-encre)" }}>Tuto · démo</p>
            <p className="text-sm font-semibold truncate" style={{ color: "var(--text-1)" }}>{clean}</p>
          </div>
          <button type="button" onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 cursor-pointer"
            style={{ background: "rgba(var(--accent-rgb),0.12)" }}>
            <X size={15} strokeWidth={2} style={{ color: "var(--exp-encre)" }} />
          </button>
        </div>

        {state === "loading" && (
          <div className="aspect-video w-full flex items-center justify-center" style={{ background: "rgba(var(--accent-rgb),0.06)" }}>
            <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: "rgba(var(--accent-rgb),0.25)", borderTopColor: "var(--accent)" }} />
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
            style={{ background: "rgba(var(--accent-rgb),0.06)", color: "var(--exp-encre)" }}>
            <span className="inline-flex items-center justify-center w-12 h-12 rounded-full" style={{ background: "#FF0000" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7z" /></svg>
            </span>
            <span className="text-sm font-semibold">Voir la démo sur YouTube</span>
          </a>
        )}
        <p className="text-[11px] font-light text-center px-5 py-3" style={{ color: "var(--text-3)" }}>
          Inspire-toi de la technique, adapte à ton niveau
        </p>
      </motion.div>
    </motion.div>,
    document.body
  );
}

/* ─── Day detail panel ─── */
function DayDetail({ day, onTuto, onStart }: { day: PlanningDay; onTuto: (ex: string) => void; onStart: () => void }) {
  const isRest = day.type.toLowerCase() === "repos";
  return (
    <motion.div key={day.date}
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2, ease: "easeOut" }}
      className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2 flex-wrap">
        <span style={getBadgeStyle(day.type)}>{day.type}</span>
        {!isRest && (
          <span className="text-[10px] font-medium" style={{ color: "var(--text-3)" }}>{day.difficulty}</span>
        )}
      </div>
      {!isRest && day.title && (
        <p className="text-sm font-medium leading-snug" style={{ color: "var(--text-1)" }}>{day.title}</p>
      )}
      {isRest && (
        <p className="text-xs font-light" style={{ color: "var(--text-3)" }}>Journée de récupération, repose-toi bien 💤</p>
      )}
      {!isRest && day.exerciseList.length > 0 && (
        <>
          <div className="flex flex-col gap-1.5 mt-0.5">
            {day.exerciseList.map((ex, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onTuto(ex.name)}
                className="flex items-center gap-2 w-full text-left rounded-xl px-2 py-1.5 -mx-1 cursor-pointer transition-colors"
                style={{ background: "rgba(var(--accent-rgb),0.05)" }}
                aria-label={`Voir le tuto : ${ex.name}`}
              >
                <div className="rounded-full flex-shrink-0" style={{ width: 4, height: 4, background: "var(--accent)", opacity: 0.8 }} />
                <p className="text-[11px] leading-snug flex-1" style={{ color: "var(--text-body)" }}>{ex.name}</p>
                <span className="text-[9px] font-medium flex-shrink-0" style={{ color: "var(--text-3)" }}>{ex.sets}×{ex.reps}</span>
                <span className="flex items-center gap-1 flex-shrink-0 rounded-full px-2 py-0.5"
                  style={{ background: "rgba(var(--accent-rgb),0.12)" }}>
                  <Play size={9} strokeWidth={2.5} style={{ color: "var(--exp-encre)" }} fill="currentColor" />
                  <span className="text-[9px] font-semibold" style={{ color: "var(--exp-encre)" }}>Tuto</span>
                </span>
              </button>
            ))}
          </div>
          {/* Lancer la séance du jour sélectionné */}
          <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            onClick={onStart}
            className="mt-1 w-full flex items-center justify-center gap-2 py-3 rounded-2xl cursor-pointer"
            style={{ background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", boxShadow: "var(--ombre-action)" }}
          >
            <Play size={13} strokeWidth={2.5} style={{ color: "#fff", marginLeft: 1 }} fill="currentColor" />
            <span className="text-sm font-semibold" style={{ color: "#fff" }}>Commencer</span>
          </motion.button>
        </>
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
        style={{ background: "rgba(var(--accent-rgb),0.08)", border: "1px solid rgba(var(--accent-rgb),0.18)" }}>
        <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ background: "linear-gradient(135deg,var(--violet-mid),var(--cream-mid))" }}>
          <Dumbbell size={13} strokeWidth={1.8} style={{ color: "var(--text-1)" }} />
        </div>
        <p className="text-[13px] font-light leading-snug" style={{ color: "var(--text-1)" }}>
          Avant de te créer ton programme, dis-moi : tu t&apos;entraînes plutôt <strong className="font-semibold">en salle</strong> ou <strong className="font-semibold">à la maison</strong> ? J&apos;adapterai les exercices 💪
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <motion.button whileTap={{ scale: 0.96 }} onClick={() => onChoose("salle")}
          className="flex flex-col items-center gap-1.5 py-4 cursor-pointer"
          style={{ borderRadius: "var(--r-controle)", background: "rgba(var(--surface-rgb),0.8)", border: "1px solid rgba(var(--violet-mid-rgb),0.5)" }}>
          <Dumbbell size={20} strokeWidth={1.5} style={{ color: "var(--exp-encre)" }} />
          <span className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>En salle</span>
          <span className="text-[10px] font-light" style={{ color: "var(--text-3)" }}>Machines & charges</span>
        </motion.button>
        <motion.button whileTap={{ scale: 0.96 }} onClick={() => onChoose("maison")}
          className="flex flex-col items-center gap-1.5 py-4 cursor-pointer"
          style={{ borderRadius: "var(--r-controle)", background: "rgba(var(--surface-rgb),0.8)", border: "1px solid rgba(var(--cream-mid-rgb),0.6)" }}>
          <Home size={20} strokeWidth={1.5} style={{ color: "var(--gold)" }} />
          <span className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>À la maison</span>
          <span className="text-[10px] font-light" style={{ color: "var(--text-3)" }}>Poids du corps</span>
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
        style={{ background: "rgba(var(--gold-rgb),0.08)", border: "1px solid rgba(var(--gold-rgb),0.18)" }}>
        <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ background: "linear-gradient(135deg,#C4A8FF,var(--violet-mid))" }}>
          <Dumbbell size={13} strokeWidth={1.8} style={{ color: "var(--text-1)" }} />
        </div>
        <p className="text-[13px] font-light leading-snug" style={{ color: "var(--text-1)" }}>
          À la maison, noté. Tu as des <strong className="font-semibold">haltères</strong> ? Sinon je te fais tout au <strong className="font-semibold">poids du corps</strong> 💪
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <motion.button whileTap={{ scale: 0.96 }} onClick={() => onChoose("halteres")}
          className="flex flex-col items-center gap-1.5 py-4 cursor-pointer"
          style={{ borderRadius: "var(--r-controle)", background: "rgba(var(--surface-rgb),0.8)", border: "1px solid rgba(var(--cream-mid-rgb),0.6)" }}>
          <Dumbbell size={20} strokeWidth={1.5} style={{ color: "var(--gold)" }} />
          <span className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>Oui, haltères</span>
          <span className="text-[10px] font-light" style={{ color: "var(--text-3)" }}>Poids du corps + haltères</span>
        </motion.button>
        <motion.button whileTap={{ scale: 0.96 }} onClick={() => onChoose("poids")}
          className="flex flex-col items-center gap-1.5 py-4 cursor-pointer"
          style={{ borderRadius: "var(--r-controle)", background: "rgba(var(--surface-rgb),0.8)", border: "1px solid rgba(var(--violet-mid-rgb),0.5)" }}>
          <Home size={20} strokeWidth={1.5} style={{ color: "var(--exp-encre)" }} />
          <span className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>Non</span>
          <span className="text-[10px] font-light" style={{ color: "var(--text-3)" }}>Poids du corps uniquement</span>
        </motion.button>
      </div>
      <button onClick={onBack} className="text-[10px] font-medium self-center cursor-pointer" style={{ color: "var(--text-3)", background: "none", border: "none" }}>
        ← Changer de lieu
      </button>
    </motion.div>
  );
}

/* ─── Main Component ─── */
export default function WeeklyProgramme() {
  const { user } = useAuth();
  const router = useRouter();
  const isPremium = !!(user?.is_admin || user?.is_premium);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [days, setDays] = useState<PlanningDay[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Lieu d'entraînement (salle / maison) — demandé par le coach avant génération
  const [location, setLocation] = useState<"salle" | "maison" | null>(null);
  // Matériel à la maison : haltères ou poids du corps uniquement
  const [homeEquip, setHomeEquip] = useState<"halteres" | "poids" | null>(null);
  const forceNextRef = useRef(false);
  // Exercice dont on affiche le tuto vidéo (null = fermé)
  const [tuto, setTuto] = useState<string | null>(null);
  // Jour dont on a lancé la séance dans le lecteur guidé (null = fermé)
  const [launchDay, setLaunchDay] = useState<PlanningDay | null>(null);
  // Semaine consultée : 0 = cette semaine, +1 = la prochaine, etc.
  const [weekOffset, setWeekOffset] = useState(0);

  /* ── Charge le lieu + matériel : base d'abord (cross-device), fallback localStorage ── */
  useEffect(() => {
    if (!user) return;
    let alive = true;
    void loadLieu(user.id).then(({ location, equip }) => {
      if (!alive) return;
      if (location) setLocation(location);
      if (equip) setHomeEquip(equip);
    });
    return () => { alive = false; };
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
        void persistLieu(user.id, { location: "salle" }); // localStorage + base (cross-device)
        try { localStorage.removeItem(`vaiiya_lieu_equip_${user.id}`); } catch { /* ignore */ }
      }
      forceNextRef.current = true;
      setHomeEquip(null);
      setLocation("salle");
    } else {
      // Maison → on demande ensuite s'il a des haltères (pas de génération tout de suite)
      if (user) void persistLieu(user.id, { location: "maison" });
      setHomeEquip(null);
      setLocation("maison");
    }
  }, [user]);

  const chooseHomeEquip = useCallback((equip: "halteres" | "poids") => {
    if (user) void persistLieu(user.id, { equip }); // localStorage + base (cross-device)
    forceNextRef.current = true; // force la régénération avec le matériel choisi
    setHomeEquip(equip);
  }, [user]);

  // Today's day index (0 = Lundi … 6 = Dimanche)
  const todayIndex = todayWeekIndex();
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

  /* ── Charge le planning de la semaine (lecture pure depuis V5) ── */
  const generate = useCallback(
    async (loc: "salle" | "maison" | null, equip: "halteres" | "poids" | null, force = false) => {
      if (!user || !profile) return;
      let variant = 0;
      try { variant = parseInt(localStorage.getItem(`vaiiya_prog_variant_${user.id}`) || "0") || 0; } catch { /* ignore */ }
      const gen: GenInput = {
        ctx: ctxFromLieu(loc, equip),
        sessions: profile.onboarding_sessions_week ?? 3,
        goals: (profile.onboarding_goals ?? []).map((g) => goalLabels[g] ?? g),
        level: profile.onboarding_level,
        variant,
        seed: user.id,
      };
      setLoading(true);
      try {
        const dates = weekDatesForOffset(weekOffset);
        // ⚠️ Lire ne pose plus rien (V5) : seule la demande EXPLICITE de
        // refaire la semaine écrit, et elle n'écrit que des séances.
        const week = force ? await reposerLaSemaine(user.id, gen, dates) : await lireSemaine(user.id, dates);
        setDays(week);
        setError(null);
      } catch (e) {
        console.error("Planning load error", e);
        setError("Impossible de charger ton planning.");
      } finally {
        setLoading(false);
      }
    },
    [user, profile, weekOffset]
  );

  /* Régénère un programme différent (incrémente le variant) — réservé au Premium */
  const regenerateProgramme = useCallback(() => {
    if (!isPremium) { router.push("/premium"); return; }
    if (user) {
      try {
        const v = (parseInt(localStorage.getItem(`vaiiya_prog_variant_${user.id}`) || "0") || 0) + 1;
        localStorage.setItem(`vaiiya_prog_variant_${user.id}`, String(v));
      } catch { /* ignore */ }
    }
    generate(location, homeEquip, true);
  }, [user, isPremium, router, location, homeEquip, generate]);

  /* ── Auto-generate on profile load (lieu connu + matériel si maison) ── */
  useEffect(() => {
    const ready = location === "salle" || (location === "maison" && homeEquip);
    if (profileLoaded && profile && profile.onboarding_level && ready) {
      const f = forceNextRef.current;
      forceNextRef.current = false;
      generate(location, homeEquip, f);
    }
  }, [profileLoaded, profile, location, homeEquip, generate]);

  /* ── Recharge le planning quand il est modifié ailleurs (ex: coach IA).
        Si l'événement porte une date (déplacement / nouvelle séance), on SAUTE
        sur la bonne semaine + jour pour que la modif soit visible. ── */
  useEffect(() => {
    const handler = (e: Event) => {
      const date = (e as CustomEvent<{ date?: string }>).detail?.date;
      if (date) {
        const targetOffset = weekOffsetOf(date);
        setSelectedDay(weekdayIndex(date));
        if (targetOffset !== weekOffset) { setWeekOffset(targetOffset); return; } // l'effet rechargera
      }
      void generate(location, homeEquip, false); // même semaine → rafraîchit
    };
    window.addEventListener("programme-updated", handler);
    return () => window.removeEventListener("programme-updated", handler);
  }, [generate, location, homeEquip, weekOffset]);

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
          style={{ color: "var(--text-1)" }}
        >
          Programme auto-généré
        </p>
        <div
          className="p-5 flex items-center gap-4"
          style={{
            borderRadius: "var(--r-bloc)",
            background: "rgba(var(--surface-rgb),0.7)",
            boxShadow: "var(--ombre-pose), inset 0 1px 0 rgba(var(--surface-rgb),0.8)",
          }}
        >
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(var(--accent-rgb),0.12)" }}
          >
            <Dumbbell size={18} strokeWidth={1.5} style={{ color: "var(--exp-encre)" }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium mb-0.5" style={{ color: "var(--text-1)" }}>
              Complète ton profil pour obtenir ton programme
            </p>
            <p className="text-xs font-light" style={{ color: "var(--text-3)" }}>
              Niveau, objectifs et fréquence requis
            </p>
          </div>
          <Link href="/parametres">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl"
              style={{
                background: "linear-gradient(135deg,var(--violet-mid) 0%,var(--cream-mid) 100%)",
                boxShadow: "inset 0 1px 0 rgba(var(--surface-rgb),0.9)",
              }}
            >
              <Settings size={12} strokeWidth={2} style={{ color: "var(--text-1)" }} />
              <span className="text-xs font-semibold" style={{ color: "var(--text-1)" }}>
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

  /* `selectedDay` est un curseur d'ÉCRAN (quelle colonne est choisie) ; le
     jour, lui, se cherche par sa DATE. Le tableau rendu par `lireSemaine` ne
     garantit ni sept entrées ni leur ordre dès qu'un jour peut manquer. */
  const semaineDates = weekDatesForOffset(weekOffset);
  const parJour = parDate(days);
  /* Type explicite : l'indexation d'un Record rend `PlanningDay` alors
     qu'elle peut ne rien trouver. On garde la vérité dans le type. */
  const currentDay: PlanningDay | undefined = parJour[semaineDates[selectedDay]];

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

  // Navigation entre semaines (consultation des séances déplacées plus loin)
  const goWeek = (delta: number) => {
    const next = Math.max(0, Math.min(MAX_WEEK_AHEAD, weekOffset + delta));
    if (next === weekOffset) return;
    setWeekOffset(next);
    setSelectedDay(next === 0 ? todayIndex : 0);
  };
  const weekLabel = weekOffset === 0 ? "Cette semaine"
    : weekOffset === 1 ? "Semaine prochaine"
    : `Semaine du ${new Date(weekDatesForOffset(weekOffset)[0] + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}`;

  return (
    <div className="flex flex-col gap-3">

      {/* ── Navigation entre semaines ── */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => goWeek(-1)}
          disabled={weekOffset <= 0}
          aria-label="Semaine précédente"
          className="w-7 h-7 rounded-xl flex items-center justify-center transition-opacity"
          style={{ background: "rgba(var(--accent-rgb),0.1)", cursor: weekOffset <= 0 ? "default" : "pointer", opacity: weekOffset <= 0 ? 0.3 : 1 }}>
          <ChevronLeft size={15} strokeWidth={2.2} style={{ color: "var(--exp-encre)" }} />
        </button>
        <span className="text-[12px] font-semibold" style={{ color: "var(--text-1)" }}>{weekLabel}</span>
        <button
          type="button"
          onClick={() => goWeek(1)}
          disabled={weekOffset >= MAX_WEEK_AHEAD}
          aria-label="Semaine suivante"
          className="w-7 h-7 rounded-xl flex items-center justify-center transition-opacity"
          style={{ background: "rgba(var(--accent-rgb),0.1)", cursor: weekOffset >= MAX_WEEK_AHEAD ? "default" : "pointer", opacity: weekOffset >= MAX_WEEK_AHEAD ? 0.3 : 1 }}>
          <ChevronRight size={15} strokeWidth={2.2} style={{ color: "var(--exp-encre)" }} />
        </button>
      </div>

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
                color: i === selectedDay ? "var(--text-1)" : "var(--text-3)",
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
          style={{ height: 5, background: "rgba(var(--accent-rgb),0.12)" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}>
          {/* Fill — centré sur le segment du jour */}
          <div className="absolute left-0 top-0 h-full rounded-full pointer-events-none"
            style={{ width: `${pct}%`, background: "linear-gradient(90deg, var(--accent), var(--gold))", transition: "width 0.12s ease" }} />
        </div>

        {/* Lieu + Régénérer */}
        {days && !loading && (
          <div className="flex justify-between items-center">
            <button
              onClick={resetLocation}
              className="flex items-center gap-1 cursor-pointer" style={{ color: "var(--text-3)", background: "none", border: "none", padding: 0 }}>
              {location === "maison" ? <Home size={10} strokeWidth={2} /> : <MapPin size={10} strokeWidth={2} />}
              <span className="text-[9px] font-medium">
                {location === "maison" ? (homeEquip === "halteres" ? "Maison · haltères" : "Maison · poids du corps") : "En salle"} · changer
              </span>
            </button>
            <button
              onClick={regenerateProgramme}
              className="flex items-center gap-1 cursor-pointer" style={{ color: isPremium ? "var(--text-3)" : "#B7A3E0", background: "none", border: "none", padding: 0 }}>
              {isPremium ? <RefreshCw size={10} strokeWidth={2.5} /> : <Lock size={10} strokeWidth={2.5} />}
              <span className="text-[9px] font-medium">{isPremium ? "Régénérer" : "Régénérer · Premium"}</span>
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
        {(loading || (!days && profileLoaded && hasOnboardingData)) && <SkeletonDetail />}

        {/* Contenu */}
        <AnimatePresence mode="wait">
          {!loading && currentDay && (
            <DayDetail
              key={selectedDay}
              day={currentDay}
              onTuto={setTuto}
              onStart={() => setLaunchDay(currentDay)}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Modal tuto vidéo de l'exercice sélectionné */}
      <AnimatePresence>
        {tuto && <ExerciseTutorial exercise={tuto} onClose={() => setTuto(null)} />}
      </AnimatePresence>

      {/* Lecteur guidé de la séance — porté dans <body> pour échapper aux
          transforms du drawer parent (sinon le `fixed` se cale sur le drawer). */}
      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {launchDay && (
            <WorkoutGuideModal
              sessionId={`planning-${launchDay.date}`}
              title={dayTitle(launchDay)}
              accent="var(--accent)"
              duration={launchDay.type === "HIIT" ? 30 : 45}
              difficulty={launchDay.difficulty}
              category={launchDay.type}
              exerciseList={launchDay.exerciseList}
              onClose={() => setLaunchDay(null)}
              onComplete={() => { if (user) void setDayStatus(user.id, launchDay.date, "done"); }}
            />
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}
