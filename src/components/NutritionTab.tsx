"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Check, Camera, Loader2, Barcode, ChevronLeft, CalendarDays, Heart } from "lucide-react";
import HistoriqueMasque from "@/components/historique/HistoriqueMasque";
import { debutHistorique, historiqueComplet } from "@/lib/historique";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase";
import { signalerRepas } from "@/lib/guideNutrition";
import { localDateStr } from "@/lib/dates";
import { MEAL_META, heureMaintenant, ligneVersRepas, momentActuel, type MealType, type MealEntry, type RecentMeal } from "@/lib/repas";
import { useNutritionGoals } from "@/hooks/useNutritionGoals";
import WeighInPrompt from "@/components/WeighInPrompt";
import TastePrefsPrompt from "@/components/TastePrefsPrompt";
import RecipesByTheme from "@/components/RecipesByTheme";
import RecipeSearch from "@/components/RecipeSearch";
import MealSituationHero from "@/components/MealSituationHero";
import PhotoAnalysisModal from "@/components/nutrition/PhotoAnalysisModal";
import BarcodeScannerModal from "@/components/nutrition/BarcodeScannerModal";
import MenuScanModal, { type MenuScanResult } from "@/components/nutrition/MenuScanModal";
import ManualModal from "@/components/nutrition/ManualModal";
import NutritionCalendar from "@/components/nutrition/NutritionCalendar";

const DAY_LABELS = ["L", "M", "M", "J", "V", "S", "D"];

function getMondayWeek(ref: Date): Date[] {
  const base = new Date(ref);
  const dow = base.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  base.setDate(base.getDate() + diff);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(base);
    d.setDate(d.getDate() + i);
    return d;
  });
}

/* ─── Page principale ────────────────────────────────────────────────── */
export default function NutritionTab({ showBackButton = false, fullPage = true }: { showBackButton?: boolean; fullPage?: boolean }) {
  const { user } = useAuth();
  const supabase = createClient();
  const today = new Date();
  const [calView, setCalView] = useState<"journal" | "calendrier">("journal");
  const [selectedDate, setSelectedDate] = useState(today);
  /* Un jour hors de la fenêtre gratuite ne se lit pas : on ne dit pas
     « aucun repas » d'une journée qui en a peut-être (lib/historique). */
  const debutHisto = debutHistorique(historiqueComplet(user));
  const jourMasque = !!debutHisto && localDateStr(selectedDate) < debutHisto;
  const estAujourdhui = selectedDate.toDateString() === today.toDateString();
  const [weekDays, setWeekDays] = useState<Date[]>([]);
  const [showPhoto, setShowPhoto] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [showBarcode, setShowBarcode] = useState(false);
  const [showMenu, setShowMenu] = useState(false);   // « La carte » du resto en photo → classement
  const [menuResult, setMenuResult] = useState<MenuScanResult | null>(null);  // classement gardé en cache → retour photo→carte sans re-scan
  const [photoFromMenu, setPhotoFromMenu] = useState(false);                  // la photo a été ouverte depuis la carte (affiche le retour)
  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  /* « Noter un repas » depuis l'accueil arrive avec `?ajouter=repas` et ouvre
     DIRECTEMENT le formulaire de saisie (choix de Louis, 2026-09-22). On
     nettoie l'URL aussitôt : un rafraîchissement ou un retour arrière ne doit
     pas rouvrir une feuille qu'on vient de fermer. */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("ajouter") !== "repas") return;
    setShowManual(true);
    params.delete("ajouter");
    const reste = params.toString();
    window.history.replaceState(null, "", window.location.pathname + (reste ? `?${reste}` : ""));
  }, []);

  /* Objectif du jour — lu depuis le profil central (base), partagé avec l'IA. */
  const { goals } = useNutritionGoals();

  /* Derived stats */
  const totalCals  = meals.reduce((s, m) => s + m.calories, 0);
  const totalProt  = meals.reduce((s, m) => s + m.proteins, 0);
  const totalCarbs = meals.reduce((s, m) => s + m.carbs, 0);
  const totalFats  = meals.reduce((s, m) => s + m.fats, 0);

  /* ── Coups de cœur : tes plats les plus souvent enregistrés (ajout en 1 tap).
     Classés par FRÉQUENCE (et non plus par simple récence) ; la récence
     départage. Macros = celles de la dernière fois que tu l'as mangé. ─── */
  const [recentMeals, setRecentMeals] = useState<RecentMeal[]>([]);
  const loadRecents = useCallback(async () => {
    if (!user) { setRecentMeals([]); return; }
    const { data } = await supabase
      .from("nutrition_logs")
      .select("food_name, calories, proteins, carbs, fats")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .order("time", { ascending: false })
      .limit(200);
    if (!data) return;
    // Regroupe par nom : compte la fréquence, garde les macros de l'occurrence la
    // plus récente (les lignes arrivent déjà du plus récent au plus ancien).
    const byName = new Map<string, RecentMeal & { rank: number }>();
    (data as { food_name: string; calories: number; proteins: number; carbs: number; fats: number }[]).forEach((r, i) => {
      const key = (r.food_name ?? "").trim().toLowerCase();
      if (!key) return;
      const existing = byName.get(key);
      if (existing) { existing.count = (existing.count ?? 1) + 1; }
      else { byName.set(key, { name: r.food_name, calories: r.calories, proteins: r.proteins, carbs: r.carbs, fats: r.fats, count: 1, rank: i }); }
    });
    const ranked = [...byName.values()]
      .sort((a, b) => ((b.count ?? 1) - (a.count ?? 1)) || (a.rank - b.rank))
      .slice(0, 8)
      .map(({ name, calories, proteins, carbs, fats, count }) => ({ name, calories, proteins, carbs, fats, count }));
    setRecentMeals(ranked);
  }, [user]); // eslint-disable-line
  useEffect(() => { loadRecents(); }, [loadRecents]);

  /* ── Plats épinglés (favoris manuels) — localStorage : passent devant, jamais évincés ── */
  const [pinned, setPinned] = useState<RecentMeal[]>([]);
  const [pinHintSeen, setPinHintSeen] = useState(true); // true par défaut → pas de flash avant lecture
  useEffect(() => {
    if (!user) { setPinned([]); return; }
    try { const raw = localStorage.getItem(`vaiiya_pinned_meals_${user.id}`); setPinned(raw ? JSON.parse(raw) : []); } catch { setPinned([]); }
    try { setPinHintSeen(!!localStorage.getItem(`vaiiya_pin_hint_seen_${user.id}`)); } catch { /* ignore */ }
  }, [user]);

  const normName = (s: string) => s.trim().toLowerCase();
  const isPinned = (name: string) => pinned.some((p) => normName(p.name) === normName(name));
  const togglePin = (r: RecentMeal) => {
    if (!user) return;
    const exists = isPinned(r.name);
    const next = exists
      ? pinned.filter((p) => normName(p.name) !== normName(r.name))
      : [...pinned, { name: r.name, calories: r.calories, proteins: r.proteins, carbs: r.carbs, fats: r.fats }];
    setPinned(next);
    try { localStorage.setItem(`vaiiya_pinned_meals_${user.id}`, JSON.stringify(next)); } catch { /* ignore */ }
    if (!pinHintSeen) { setPinHintSeen(true); try { localStorage.setItem(`vaiiya_pin_hint_seen_${user.id}`, "1"); } catch { /* ignore */ } }
    showToast(exists ? `${r.name} retiré des favoris` : `${r.name} épinglé ✓`);
  };

  // Affichage : épinglés d'abord (jamais coupés), puis le reste par fréquence.
  // Plafonné pour rester une vraie shortlist (tout visible, sans défilement).
  const displayRecents = useMemo(() => {
    const keys = new Set(pinned.map((p) => normName(p.name)));
    const rest = recentMeals.filter((r) => !keys.has(normName(r.name)));
    return [...pinned, ...rest].slice(0, Math.max(8, pinned.length));
  }, [pinned, recentMeals]);

  // Appui long = épingler/désépingler ; tap simple = ajouter (sans déclencher les deux).
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFired = useRef(false);
  const startPress = (r: RecentMeal) => {
    longPressFired.current = false;
    pressTimer.current = setTimeout(() => { longPressFired.current = true; togglePin(r); }, 480);
  };
  const cancelPress = () => { if (pressTimer.current) { clearTimeout(pressTimer.current); pressTimer.current = null; } };
  const onChipTap = (r: RecentMeal) => {
    if (longPressFired.current) { longPressFired.current = false; return; } // l'appui long a déjà agi
    void quickAddRecent(r);
  };

  useEffect(() => { setWeekDays(getMondayWeek(today)); }, []); // eslint-disable-line

  /* ── Chargement Supabase ─── */
  const loadData = useCallback(async (date: Date) => {
    if (!user) return;
    setIsLoading(true);
    const dateStr = localDateStr(date);
    if (debutHisto && dateStr < debutHisto) { setMeals([]); setIsLoading(false); return; }
    const { data: md } = await supabase
      .from("nutrition_logs").select("*")
      .eq("user_id", user.id).eq("date", dateStr).order("time", { ascending: true });
    setMeals(md ? md.map(ligneVersRepas) : []);
    setIsLoading(false);
  }, [user]); // eslint-disable-line

  useEffect(() => { loadData(selectedDate); }, [selectedDate, user]); // eslint-disable-line

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2800); };

  // Anti-triche : on interdit de logger un repas sur une date future (sinon on
  // pourrait gonfler son EXP avec de faux repas datés dans l'avenir).
  const estDateFuture = (d: Date) => {
    const t = new Date(); t.setHours(0, 0, 0, 0);
    const dd = new Date(d); dd.setHours(0, 0, 0, 0);
    return dd.getTime() > t.getTime();
  };
  const bloquerSiFutur = () => {
    if (estDateFuture(selectedDate)) { showToast("Impossible de logger un repas dans le futur 🙂"); return true; }
    return false;
  };

  /* ── Ajout repas photo IA ─── */
  const handleAddPhoto = async (meal: Omit<MealEntry, "id">) => {
    if (!user) { showToast("Connecte-toi pour sauvegarder"); return; }
    if (bloquerSiFutur()) return;
    const { data, error } = await supabase.from("nutrition_logs").insert({
      user_id: user.id, date: localDateStr(selectedDate), meal_type: meal.mealType,
      food_name: meal.name, description: meal.description ?? null,
      calories: meal.calories, proteins: meal.proteins, carbs: meal.carbs,
      fats: meal.fats, has_photo: meal.hasPhoto ?? false, time: meal.time,
    }).select().single();
    if (!error && data) { setMeals(prev => [...prev, ligneVersRepas(data)]); signalerRepas(); showToast(`${meal.name} ajouté, ${meal.calories} kcal ✓`); }
    else showToast("Erreur lors de l’ajout");
    setShowPhoto(false);
    setPhotoFromMenu(false);
  };

  /* ── Ajout repas code-barres ─── */
  const handleAddBarcode = async (meal: Omit<MealEntry, "id">) => {
    if (!user) { showToast("Connecte-toi pour sauvegarder"); return; }
    if (bloquerSiFutur()) return;
    const { data, error } = await supabase.from("nutrition_logs").insert({
      user_id: user.id, date: localDateStr(selectedDate), meal_type: meal.mealType,
      food_name: meal.name, calories: meal.calories, proteins: meal.proteins,
      carbs: meal.carbs, fats: meal.fats, has_photo: false, time: meal.time,
    }).select().single();
    if (!error && data) { setMeals(prev => [...prev, ligneVersRepas(data)]); signalerRepas(); showToast(`${meal.name} ajouté ✓`); }
    else showToast("Erreur lors de l’ajout");
    setShowBarcode(false);
  };

  /* ── Ajout repas manuel ─── */
  const handleAddManual = async (meal: Omit<MealEntry, "id">) => {
    if (!user) { showToast("Connecte-toi pour sauvegarder"); return; }
    if (bloquerSiFutur()) return;
    const { data, error } = await supabase.from("nutrition_logs").insert({
      user_id: user.id, date: localDateStr(selectedDate), meal_type: meal.mealType,
      food_name: meal.name, calories: meal.calories, proteins: meal.proteins,
      carbs: meal.carbs, fats: meal.fats, has_photo: false, time: meal.time,
    }).select().single();
    if (!error && data) { setMeals(prev => [...prev, ligneVersRepas(data)]); signalerRepas(); showToast(`${meal.name} ajouté ✓`); }
    else showToast("Erreur lors de l’ajout");
    setShowManual(false);
  };

  /* ── Ajout rapide depuis les repas récents (1 tap) ─── */
  const quickAddRecent = async (r: RecentMeal) => {
    if (!user) { showToast("Connecte-toi pour sauvegarder"); return; }
    if (bloquerSiFutur()) return;
    const { data, error } = await supabase.from("nutrition_logs").insert({
      user_id: user.id, date: localDateStr(selectedDate), meal_type: momentActuel(),
      food_name: r.name, calories: r.calories, proteins: r.proteins,
      carbs: r.carbs, fats: r.fats, has_photo: false, time: heureMaintenant(),
    }).select().single();
    if (!error && data) { setMeals(prev => [...prev, ligneVersRepas(data)]); signalerRepas(); showToast(`${r.name} ajouté ✓`); void loadRecents(); }
    else showToast("Erreur lors de l’ajout");
  };

  /* ── Ajout d'une recette (IA) au journal du jour — même flux que ci-dessus ─── */
  const addRecipeMeal = async (m: { name: string; calories: number; proteins: number; carbs: number; fats: number }) => {
    if (!user) { showToast("Connecte-toi pour sauvegarder"); return; }
    if (bloquerSiFutur()) return;
    const { data, error } = await supabase.from("nutrition_logs").insert({
      user_id: user.id, date: localDateStr(selectedDate), meal_type: momentActuel(),
      food_name: m.name, calories: m.calories, proteins: m.proteins,
      carbs: m.carbs, fats: m.fats, has_photo: false, time: heureMaintenant(),
    }).select().single();
    if (!error && data) { setMeals(prev => [...prev, ligneVersRepas(data)]); signalerRepas(); showToast(`${m.name} ajouté ✓`); void loadRecents(); }
    else showToast("Erreur lors de l’ajout");
  };

  /* ── Suppression repas ─── */
  const deleteMeal = async (id: string) => {
    await supabase.from("nutrition_logs").delete().eq("id", id);
    setMeals(prev => prev.filter(m => m.id !== id));
    signalerRepas();
    showToast("Repas supprimé");
  };

  /* Group meals by type (only groups that have meals) */
  const mealGroups = (Object.keys(MEAL_META) as MealType[])
    .map(mt => ({ type: mt, ...MEAL_META[mt], meals: meals.filter(m => m.mealType === mt) }))
    .filter(g => g.meals.length > 0);

  /* Le dessin commun des blocs du journal. Le halo violet a 0,16 qui vivait
     ici ne separait rien : sous une surface pleine et claire, une ombre
     teintee decore, elle ne pose pas. Les deux ombres neutres sont neutres,
     c'est le coeur du geste. Le rayon dit maintenant la taille de la surface :
     ces blocs font la largeur de l'ecran, donc `--r-bloc`. */
  const CARD = {
    background: "rgb(var(--surface-rgb))",
    border: "1px solid rgba(var(--text-3-rgb),0.16)",
    boxShadow: "var(--ombre-pose)",
    borderRadius: "var(--r-bloc)",
  };

  return (
    <div className={fullPage ? "min-h-screen px-4 pt-7 pb-36 md:pl-24 md:pr-8 md:pt-10 md:pb-10" : "w-full px-0 pt-4 pb-12"}>
      <WeighInPrompt />
      <TastePrefsPrompt />

      {/* ── Titre « Suivi nutrition » (le seul titre qui fait sens, en tête) ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="mb-3.5 max-w-5xl">
        {/* Bouton retour vers Progression */}
        {showBackButton && (
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-1.5 mb-3 text-[13px] font-semibold"
            style={{ color: "var(--exp-encre)" }}
          >
            <ChevronLeft size={14} strokeWidth={2.5} />
            Progression
          </button>
        )}
        <div className="flex items-baseline justify-between gap-3">
          <h1 className="text-[34px] leading-none" style={{ color: "var(--text-1)", fontWeight: 800, fontVariationSettings: "var(--w-voix)" }}>
            <em className="not-italic" style={{
              background: "var(--degrade-titre)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              fontStyle: "italic",
              display: "inline-block", paddingRight: "0.14em",  // évite que l'italique coupe le « n » final
            }}>
              Nutrition
            </em>
          </h1>
          <p className="vy-label flex-shrink-0 text-right" style={{ color: "var(--text-3)" }}>
            {today.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
        {/* Plus de trio série / code-barres / photo ici : la série n'était
            qu'un chiffre en dur, et les deux actions vivent maintenant dans
            « On mange où ? » — un seul endroit pour ajouter un repas. */}
      </motion.div>

      {/* ── Calendar view ────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {calView === "calendrier" && (
          <motion.div key="cal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {/* Le retour au journal est une SORTIE, pas un onglet : il ne
                partage donc plus une paire de pastilles avec le calendrier
                qu'on est déjà en train de regarder. */}
            <button
              onClick={() => setCalView("journal")}
              className="vy-label inline-flex items-center gap-1.5 mb-4 px-3 py-2 cursor-pointer"
              style={{
                borderRadius: "var(--r-controle)",
                background: "rgba(var(--accent-rgb),0.10)",
                border: "1px solid rgba(var(--accent-rgb),0.2)",
                color: "var(--text-2)",
              }}
            >
              <ChevronLeft size={13} strokeWidth={2} />
              Journal
            </button>
            <NutritionCalendar
              onDayClick={(date) => {
                setSelectedDate(date);
                setWeekDays(getMondayWeek(date));
                setCalView("journal");
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Week selector ────────────────────────────────────── */}
      {calView === "journal" && <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
        className="flex items-center gap-2 mb-6 max-w-5xl">
        <div className="flex justify-between flex-1 min-w-0">
        {weekDays.map((day, i) => {
          const isSel = day.toDateString() === selectedDate.toDateString();
          const isToday = day.toDateString() === today.toDateString();
          const isPast = day < today && !isToday;
          return (
            <motion.button key={i} whileTap={{ scale: 0.9 }}
              onClick={() => setSelectedDate(day)}
              className="flex flex-col items-center gap-1 w-10 py-2 cursor-pointer"
              style={{
                borderRadius: "var(--r-controle)",
                background: isSel ? "linear-gradient(135deg,var(--accent) 0%,#9270E0 100%)" : "transparent",
              }}>
              <span className="text-[11px] font-semibold"
                style={{ color: isSel ? "rgba(var(--surface-rgb),0.65)" : "var(--text-3)" }}>
                {DAY_LABELS[i]}
              </span>
              <span className="text-[16px] font-semibold" style={{ color: isSel ? "#fff" : "var(--text-1)" }}>
                {day.getDate()}
              </span>
              <div className="w-1 h-1 rounded-full" style={{
                background: isSel ? "rgba(var(--surface-rgb),0.55)" : (isPast || isToday) ? "var(--accent)" : "transparent",
              }} />
            </motion.button>
          );
        })}
        </div>
        {/* Sept jours suffisent presque toujours. Quand ils ne suffisent
            pas, la porte est au bout de la semaine, pas dans une barre
            d'onglets au-dessus. */}
        <motion.button
          whileTap={{ scale: 0.94 }}
          onClick={() => setCalView("calendrier")}
          aria-label="Voir le calendrier du mois"
          className="w-9 h-9 flex items-center justify-center cursor-pointer flex-shrink-0"
          style={{
            borderRadius: "var(--r-controle)",
            background: "rgba(var(--accent-rgb),0.10)",
            border: "1px solid rgba(var(--accent-rgb),0.2)",
          }}
        >
          <CalendarDays size={15} strokeWidth={1.8} style={{ color: "var(--text-2)" }} />
        </motion.button>
      </motion.div>}

      {/* ── Statut ──────────────────────────────────────────────── */}
      {calView === "journal" && isLoading && (
        <div className="flex items-center gap-2 mb-4 max-w-5xl" style={{ color: "var(--text-3)" }}>
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
            <Loader2 size={14} strokeWidth={1.5} />
          </motion.div>
          <span className="text-[13px] font-light">Chargement…</span>
        </div>
      )}
      {calView === "journal" && !user && !isLoading && (
        <div className="max-w-5xl mb-4 px-4 py-3 rounded-2xl flex items-center gap-3"
          style={{ background: "rgba(var(--gold-rgb),0.08)", border: "1px solid rgba(var(--gold-rgb),0.2)" }}>
          <span style={{ fontSize: 16 }}>🔒</span>
          <p className="text-[13px] font-medium" style={{ color: "var(--gold)" }}>
            Connecte-toi pour synchroniser tes repas sur tous tes appareils
          </p>
        </div>
      )}

      {/* ── Aujourd'hui en deux tuiles (maquette bento, Louis 2026-10-11) ──
          Ce qu'on a mangé, et les trois macros. Aucun objectif de calories à
          atteindre ni anneau à remplir : on montre ce qui a été mangé, pas ce
          qui manque. Les barres des macros sont lues contre les repères de
          `useNutritionGoals`, plafonnées à plein. */}
      {calView === "journal" && !jourMasque && (
        <div className="grid gap-2.5 mb-6 max-w-5xl" style={{ gridTemplateColumns: "1.15fr 1fr" }}>
          {/* Toucher une tuile ouvre l'ajout d'un repas (Louis, 2026-10-11) :
              c'est là qu'on regarde ce qu'on a mangé, donc là qu'on veut
              en ajouter. */}
          <button type="button" onClick={() => setShowManual(true)} aria-label="Ajouter un repas"
            className="flex flex-col justify-between gap-1 p-3.5 text-left cursor-pointer active:scale-[0.98] transition-transform" style={CARD}>
            <span className="vy-label" style={{ color: "var(--text-3)" }}>{estAujourdhui ? "Aujourd’hui" : selectedDate.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric" })}</span>
            <strong className="text-[34px] leading-none" style={{ color: "var(--text-0)", fontWeight: 800, fontVariationSettings: "var(--w-voix)" }}>
              {totalCals.toLocaleString("fr-FR")}
            </strong>
            <span className="text-[11px] font-semibold" style={{ color: "var(--text-3)" }}>
              kcal · <span className="vy-nombre">{meals.length}</span> {meals.length > 1 ? "repas notés" : "repas noté"}
            </span>
            <span className="text-[11px] font-bold" style={{ color: "var(--exp-encre)" }}>+ Ajouter un repas</span>
          </button>
          <button type="button" onClick={() => setShowManual(true)} aria-label="Ajouter un repas"
            className="flex flex-col justify-center gap-2 p-3.5 text-left cursor-pointer active:scale-[0.98] transition-transform" style={CARD}>
            {([
              { label: "Protéines", val: totalProt,  goal: goals.proteins, color: "#8B5CF6" },
              { label: "Glucides",  val: totalCarbs, goal: goals.carbs,    color: "#E8620C" },
              { label: "Lipides",   val: totalFats,  goal: goals.fats,     color: "#2BD4A0" },
            ]).map((m) => (
              <div key={m.label} className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold" style={{ color: "var(--text-3)" }}>
                  {m.label} <span className="vy-nombre" style={{ color: "var(--text-0)" }}>{Math.round(m.val)}</span> g
                </span>
                <span className="block h-[5px] rounded-full overflow-hidden" style={{ background: "rgba(var(--accent-rgb),0.12)" }}>
                  <span className="block h-full rounded-full" style={{ width: `${Math.min(100, m.goal > 0 ? (m.val / m.goal) * 100 : 0)}%`, background: m.color }} />
                </span>
              </div>
            ))}
          </button>
        </div>
      )}

      {/* ── On mange où ? — le nouveau #1 (dominant) ─────────── */}
      {calView === "journal" && (
        <div className="mb-6">
          <MealSituationHero
            name={user?.name}
            userId={user?.id}
            goals={goals}
            consumed={{ calories: totalCals, proteins: totalProt, carbs: totalCarbs, fats: totalFats }}
            eatenToday={meals.map((m) => m.name)}
            onPhoto={() => setShowPhoto(true)}
            onBarcode={() => setShowBarcode(true)}
            onManual={() => setShowManual(true)}
            onMenuScan={() => { setMenuResult(null); setPhotoFromMenu(false); setShowMenu(true); }}
            onSkip={() => showToast("Noté, on ne t’embête pas.")}
            classics={displayRecents}
            onQuickAdd={(r) => { void quickAddRecent(r); }}
            onLogIdea={(m) => { void addRecipeMeal(m); }}
          />
        </div>
      )}

      {/* ── Recherche de recette : le raccourci direct (avec image) ──── */}
      {calView === "journal" && (
        <RecipeSearch onAdd={addRecipeMeal} />
      )}

      {/* ── Les repas du jour : toujours visibles, plus repliés en pied. ── */}
      {calView === "journal" && (
      <div className="grid grid-cols-1 gap-5 max-w-5xl">

        {/* RIGHT — Meals */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}
          className="p-5" style={CARD}>

          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="vy-label" style={{ color: "var(--text-3)" }}>
                Repas du jour
              </p>
              <p className="text-[13px] font-light mt-0.5" style={{ color: "var(--text-2)" }}>
                {totalCals} kcal consommés
              </p>
            </div>
            <div className="flex gap-2">
              <motion.button
                whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.93 }}
                onClick={() => setShowBarcode(true)}
                className="flex items-center gap-1 px-3 py-2 rounded-xl text-[13px] font-semibold cursor-pointer"
                style={{
                  background: "rgba(var(--tint-violet-rgb),0.7)",
                  color: "var(--exp-encre)",
                  border: "1px solid rgba(var(--accent-rgb),0.25)",
                }}>
                <Barcode size={12} strokeWidth={2} />
                Scanner
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.93 }}
                onClick={() => setShowPhoto(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[13px] font-semibold cursor-pointer"
                style={{
                  background: "linear-gradient(135deg,var(--violet-mid),var(--cream-mid))",
                  color: "var(--text-1)",
                  boxShadow: "inset 0 1px 0 rgba(var(--surface-rgb),0.9)",
                }}>
                <Camera size={12} strokeWidth={2} />
                Photo IA
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.93 }}
                onClick={() => setShowManual(true)}
                className="flex items-center gap-1 px-3 py-2 rounded-xl text-[13px] font-semibold cursor-pointer"
                style={{
                  background: "rgba(var(--tint-violet-rgb),0.7)",
                  color: "var(--text-2)",
                  border: "1px solid rgba(var(--violet-mid-rgb),0.4)",
                }}>
                <Plus size={12} strokeWidth={2.5} />
                Manuel
              </motion.button>
            </div>
          </div>

          {/* Ajout rapide — coups de cœur (fréquence) + épinglés (appui long) en 1 tap */}
          {displayRecents.length > 0 && (
            <div className="mb-5">
              <div className="flex items-center gap-1.5 mb-2">
                <Heart size={11} strokeWidth={2} style={{ color: "var(--text-3)" }} />
                <p className="vy-label" style={{ color: "var(--text-3)" }}>
                  Tes coups de cœur
                </p>
                {!pinHintSeen && (
                  <span className="text-[11px] font-normal tracking-normal" style={{ color: "#C4B5FD", textTransform: "none" }}>
                    · appui long pour épingler
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {displayRecents.map((r, i) => {
                  const pin = isPinned(r.name);
                  return (
                    <motion.button key={i} whileTap={{ scale: 0.93 }} whileHover={{ scale: 1.03 }}
                      onPointerDown={() => startPress(r)} onPointerUp={cancelPress}
                      onPointerLeave={cancelPress} onPointerMove={cancelPress}
                      onContextMenu={(e) => e.preventDefault()}
                      onClick={() => onChipTap(r)}
                      className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-2xl cursor-pointer"
                      style={{
                        background: pin ? "rgba(244,194,231,0.30)" : "rgba(var(--tint-violet-rgb),0.6)",
                        border: pin ? "1px solid rgba(236,153,201,0.55)" : "1px solid rgba(var(--violet-mid-rgb),0.4)",
                        WebkitTouchCallout: "none",
                      }}>
                      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: "rgba(var(--accent-rgb),0.15)" }}>
                        <Plus size={11} strokeWidth={2.5} style={{ color: "var(--exp-encre)" }} />
                      </div>
                      <div className="text-left">
                        <p className="text-[11px] font-medium leading-tight flex items-center gap-1" style={{ color: "var(--text-1)", whiteSpace: "nowrap" }}>
                          {pin && <Heart size={9} strokeWidth={2.5} style={{ color: "#8B5CF6", fill: "#8B5CF6" }} />}
                          {r.name}
                        </p>
                        <p className="text-[11px] leading-tight" style={{ color: "var(--text-3)" }}>
                          {r.calories} kcal{(r.count ?? 0) >= 2 ? ` · ${r.count}×` : ""}
                        </p>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recettes par thème — générées par l'IA, ajoutables au journal du jour */}
          <div id="nutrition-idees">
            <RecipesByTheme onAdd={addRecipeMeal} />
          </div>

          {/* Empty state */}
          {jourMasque ? (
            <div className="py-10">
              <HistoriqueMasque />
            </div>
          ) : meals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 gap-4">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: "rgba(var(--accent-rgb),0.08)" }}>
                <Camera size={24} strokeWidth={1.5} style={{ color: "#C4B5FD" }} />
              </div>
              <div className="text-center">
                <p className="text-[16px] font-medium" style={{ color: "var(--text-1)" }}>
                  Aucun repas enregistré
                </p>
                <p className="text-[13px] mt-1 font-light max-w-xs" style={{ color: "var(--text-3)" }}>
                  Prends une photo, l&apos;IA identifie les aliments et remplit tout automatiquement
                </p>
              </div>
              <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.95 }}
                onClick={() => setShowPhoto(true)}
                className="flex items-center gap-2 px-5 py-3 rounded-2xl text-[16px] font-semibold cursor-pointer"
                style={{
                  background: "linear-gradient(135deg,var(--violet-mid),var(--cream-mid))",
                  color: "var(--text-1)",
                  boxShadow: "inset 0 1px 0 rgba(var(--surface-rgb),0.9)",
                }}>
                <Camera size={16} strokeWidth={1.5} />
                Analyser mon premier repas
              </motion.button>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              <AnimatePresence initial={false}>
                {mealGroups.map(group => (
                  <motion.div key={group.type}
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>

                    {/* Group header */}
                    <div className="flex items-center gap-2 mb-3">
                      <span style={{ fontSize: 16 }}>{group.icon}</span>
                      <p className="text-[13px] font-semibold" style={{ color: "var(--text-2)" }}>{group.label}</p>
                      <div className="flex-1 h-px" style={{ background: "rgba(var(--accent-rgb),0.1)" }} />
                      <p className="text-[11px] font-medium" style={{ color: "var(--text-3)" }}>
                        {group.meals.reduce((s, m) => s + m.calories, 0)} kcal
                      </p>
                    </div>

                    {/* Meals */}
                    <div className="flex flex-col">
                      {group.meals.map(meal => (
                        <motion.div key={meal.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 16, height: 0, paddingTop: 0, paddingBottom: 0 }}
                          className="vy-filet flex items-center gap-3 py-3 group overflow-hidden">

                          {/* Icon */}
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ background: meal.hasPhoto ? "rgba(var(--accent-rgb),0.12)" : "rgba(var(--accent-rgb),0.07)" }}>
                            {meal.hasPhoto
                              ? <Camera size={14} strokeWidth={1.5} style={{ color: "var(--exp-encre)" }} />
                              : <span style={{ fontSize: 16 }}>{group.icon}</span>
                            }
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-[16px] font-medium leading-tight truncate" style={{ color: "var(--text-1)" }}>
                              {meal.name}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              <span className="text-[11px]" style={{ color: "var(--text-3)" }}>{meal.time}</span>
                              {meal.proteins > 0 && (
                                <>
                                  <span className="text-[11px] px-1.5 py-0.5 rounded-full"
                                    style={{ background: "rgba(var(--accent-rgb),0.1)", color: "var(--exp-encre)" }}>
                                    P {meal.proteins}g
                                  </span>
                                  <span className="text-[11px] px-1.5 py-0.5 rounded-full"
                                    style={{ background: "rgba(123,92,196,0.08)", color: "#7B5CC4" }}>
                                    G {meal.carbs}g
                                  </span>
                                  <span className="text-[11px] px-1.5 py-0.5 rounded-full hidden sm:inline-block"
                                    style={{ background: "rgba(var(--gold-rgb),0.1)", color: "var(--gold)" }}>
                                    L {meal.fats}g
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Calories + delete */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <div className="text-right">
                              <p className="vy-nombre text-[16px]" style={{ fontWeight: 700, color: "var(--text-1)" }}>{meal.calories}</p>
                              <p className="text-[11px]" style={{ color: "var(--text-3)" }}>kcal</p>
                            </div>
                            <motion.button whileTap={{ scale: 0.85 }}
                              onClick={() => deleteMeal(meal.id)}
                              className="w-6 h-6 rounded-full flex items-center justify-center cursor-pointer transition-opacity opacity-30 group-hover:opacity-100"
                              style={{ background: "rgba(252,129,129,0.15)" }}>
                              <X size={10} strokeWidth={2} style={{ color: "#FC8181" }} />
                            </motion.button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      </div>
      )}

      {/* ── Modals + Toast ──────────────────────────────────────── */}
      <AnimatePresence>
        {showBarcode && (
          <BarcodeScannerModal key="barcode" onClose={() => setShowBarcode(false)} onAdd={handleAddBarcode} />
        )}
        {showPhoto && (
          <PhotoAnalysisModal key="photo"
            onClose={() => { setShowPhoto(false); setPhotoFromMenu(false); }}
            onAdd={handleAddPhoto}
            onBack={photoFromMenu ? () => { setShowPhoto(false); setPhotoFromMenu(false); setShowMenu(true); } : undefined}
          />
        )}
        {showManual && (
          <ManualModal key="manual" onClose={() => setShowManual(false)} onAdd={handleAddManual} />
        )}
        {showMenu && (() => {
          // Objectif du moment (données RÉELLES du jour, pas une estimation du plat)
          const known = !!goals && goals.calories > 0;
          const h = new Date().getHours();
          const mealLabel = h < 11 ? "petit-déjeuner" : h < 15 ? "déjeuner" : h < 18 ? "goûter" : "dîner";
          const cap = mealLabel.charAt(0).toUpperCase() + mealLabel.slice(1);
          let diet: string[] = [];
          try { if (user?.id) { const raw = localStorage.getItem(`vaiiya_diet_${user.id}`); if (raw) diet = JSON.parse(raw); } } catch { /* ignore */ }
          const dietTxt = diet.length ? ` Régime/contraintes à respecter : ${diet.join(", ")}.` : "";
          const remaining = known ? Math.max(0, Math.round((goals?.calories ?? 0) - totalCals)) : 0;
          const protLeft = known ? Math.max(0, Math.round((goals?.proteins ?? 0) - totalProt)) : 0;
          const objectiveLine = known
            ? `Repas : ${mealLabel}. Il reste environ ${remaining} kcal sur la journée et ~${protLeft} g de protéines à couvrir.${dietTxt}`
            : `Repas : ${mealLabel}. Objectif calorique inconnu, privilégie un plat équilibré et un bon apport en protéines.${dietTxt}`;
          const objectiveChip = known ? `${cap} · ~${remaining} kcal restantes` : `${cap} · équilibre`;
          return (
            <MenuScanModal key="menu"
              objectiveLine={objectiveLine} objectiveChip={objectiveChip} goalKnown={known}
              initialResult={menuResult} onResult={setMenuResult}
              onClose={() => setShowMenu(false)}
              onPickDish={(name) => {
                // On garde le classement en cache (menuResult) → la photo pourra revenir dessus
                setShowMenu(false);
                setPhotoFromMenu(true);
                showToast(`Bon choix : « ${name} » 🍽️ Photographie ton assiette quand elle arrive pour le vrai décompte.`);
                setShowPhoto(true);
              }}
            />
          );
        })()}
        {toast && (
          <motion.div key="toast"
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: "spring", bounce: 0.4 }}
            className="fixed bottom-32 md:bottom-6 left-1/2 -translate-x-1/2 z-[200] px-5 py-3 rounded-2xl flex items-center gap-2"
            style={{
              background: "rgba(var(--surface-rgb),0.92)",
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(var(--surface-rgb),0.9)",
              boxShadow: "var(--ombre-flottant)",
              whiteSpace: "nowrap",
            }}>
            <Check size={14} strokeWidth={2.5} style={{ color: "var(--gold)" }} />
            <span className="text-[13px] font-medium" style={{ color: "var(--text-1)" }}>{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

