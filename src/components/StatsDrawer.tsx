"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, Utensils, Camera, Dumbbell, BarChart3 } from "lucide-react";
import { createClient } from "@/lib/supabase";
import type { User } from "@/context/AuthContext";
import WeeklyProgramme from "@/components/WeeklyProgramme";
import { stats } from "@/data/statsData";
import type { StatData } from "@/data/statsData";

/* ─── Types ──────────────────────────────────────────────────────────── */
type Meal = {
  id: string;
  name: string;
  calories: number;
  proteins: number;
  carbs: number;
  fats: number;
  time: string;
  mealType: string;
  hasPhoto?: boolean;
};

const MEAL_EMOJI: Record<string, string> = {
  "petit-dejeuner": "🥐",
  "dejeuner":       "🍽️",
  "gouter":         "🍪",
  "diner":          "🍲",
};

const MEAL_LABEL: Record<string, string> = {
  "petit-dejeuner": "Petit-déj",
  "dejeuner":       "Déjeuner",
  "gouter":         "Goûter",
  "diner":          "Dîner",
};

/* Palette de couleurs des aliments par type de repas */
const MEAL_PALETTE: Record<string, { protein: [string, string]; carbs: [string, string]; veggies: [string, string]; grain: string }> = {
  "petit-dejeuner": { protein: ["#FFE5A8", "#E8C26A"], carbs: ["#F5D4A8", "#D8A66B"], veggies: ["#FFB088", "#F08660"], grain: "#B8804F" }, // jaune œuf, pain doré, fruit
  "dejeuner":       { protein: ["#F5C99B", "#D4A05A"], carbs: ["#E8D7FF", "#C4A8E8"], veggies: ["#C9E5C0", "#8FB682"], grain: "#9F84BF" }, // viande, riz, salade
  "gouter":         { protein: ["#FFE8A8", "#F2C95C"], carbs: ["#FFD4B0", "#E89B5C"], veggies: ["#FFB088", "#D87E5A"], grain: "#9C6839" }, // sucré
  "diner":          { protein: ["#E8A878", "#C97D5C"], carbs: ["#E0CDFA", "#A88FC9"], veggies: ["#A8C99B", "#7A9F6A"], grain: "#7B5942" }, // chaleureux
};

/* Calcule combien d'aliments générer selon les calories */
function plateFillness(calories: number): "light" | "medium" | "full" {
  if (calories < 200) return "light";
  if (calories < 500) return "medium";
  return "full";
}

/* ─── Composant ──────────────────────────────────────────────────────── */
export default function StatsDrawer({
  open,
  onClose,
  user,
  onOpenStat,
  onOpenRepas,
  mealsRefreshKey = 0,
}: {
  open: boolean;
  onClose: () => void;
  user: User | null;
  onOpenStat: (stat: StatData) => void;
  onOpenRepas: () => void;
  mealsRefreshKey?: number;
}) {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [activeIdx, setActiveIdx] = useState(0); // 0=séance, 1=plats, 2=stats
  const scrollRef = useRef<HTMLDivElement>(null);

  /* ─ Fetch meals du jour (re-fetch quand mealsRefreshKey change) ─ */
  useEffect(() => {
    if (!open || !user) return;
    const supabase = createClient();
    const today = new Date().toISOString().slice(0, 10);
    supabase
      .from("nutrition_logs")
      .select("id, food_name, calories, proteins, carbs, fats, time, meal_type, has_photo")
      .eq("user_id", user.id)
      .eq("date", today)
      .order("time", { ascending: true })
      .then(({ data }) => {
        if (data) {
          setMeals(data.map((r: Record<string, unknown>) => ({
            id:        String(r.id),
            name:      r.food_name as string,
            calories:  (r.calories as number) ?? 0,
            proteins:  (r.proteins as number) ?? 0,
            carbs:     (r.carbs as number) ?? 0,
            fats:      (r.fats as number) ?? 0,
            time:      (r.time as string) ?? "",
            mealType:  (r.meal_type as string) ?? "dejeuner",
            hasPhoto:  Boolean(r.has_photo),
          })));
        }
      });
  }, [open, user, mealsRefreshKey]);

  /* ─ Détection scroll pour mettre à jour les dots ─ */
  const onScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const h = scrollRef.current.clientHeight;
    const t = scrollRef.current.scrollTop;
    const idx = Math.round(t / h);
    setActiveIdx(Math.max(0, Math.min(2, idx)));
  }, []);

  /* ─ Aller à une zone via clic dot ─ */
  const goTo = (i: number) => {
    if (!scrollRef.current) return;
    const h = scrollRef.current.clientHeight;
    scrollRef.current.scrollTo({ top: i * h, behavior: "smooth" });
  };

  /* ─ Calcul totaux du jour ─ */
  const totalCals = meals.reduce((s, m) => s + m.calories, 0);
  const totalProteins = meals.reduce((s, m) => s + m.proteins, 0);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40"
            style={{ background: "rgba(240,235,255,0.5)", backdropFilter: "blur(10px)" }}
          />

          {/* Drawer */}
          <motion.div
            initial={{ y: "-100%" }} animate={{ y: 0 }} exit={{ y: "-100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 280 }}
            className="fixed inset-x-0 top-0 z-50"
            style={{ height: "calc(100dvh - 112px)" }}
          >
            <div className="relative h-full m-2 rounded-3xl overflow-hidden"
              style={{
                background: "rgba(255,255,255,0.95)",
                backdropFilter: "blur(16px)",
                border: "1px solid rgba(255,255,255,0.95)",
                boxShadow: "0 20px 60px rgba(167,139,250,0.2)",
              }}>

              {/* Header sticky avec bouton close */}
              <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-5 pt-4 pb-2 pointer-events-none">
                <h2 className="text-lg font-extralight pointer-events-auto" style={{ color: "#2D3748" }}>Aujourd'hui</h2>
                <button type="button" onClick={onClose}
                  className="w-9 h-9 rounded-full flex items-center justify-center pointer-events-auto"
                  style={{ background: "rgba(167,139,250,0.12)" }}>
                  <X size={16} strokeWidth={2} style={{ color: "#A78BFA" }} />
                </button>
              </div>

              {/* Dots indicateur (verticale, droite) */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-2.5">
                {[0, 1, 2].map(i => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => goTo(i)}
                    aria-label={`Aller à la zone ${i + 1}`}
                    className="block rounded-full transition-all"
                    style={{
                      width: activeIdx === i ? 7 : 5,
                      height: activeIdx === i ? 7 : 5,
                      background: activeIdx === i ? "#A78BFA" : "rgba(167,139,250,0.3)",
                    }}
                  />
                ))}
              </div>

              {/* Scroll container avec snap */}
              <div
                ref={scrollRef}
                onScroll={onScroll}
                className="h-full overflow-y-scroll"
                style={{
                  scrollSnapType: "y mandatory",
                  WebkitOverflowScrolling: "touch",
                  scrollbarWidth: "none",
                }}
              >

                {/* ─── ZONE 1 : Séance recommandée ─── */}
                <section
                  className="h-full flex flex-col pt-16 pb-6 px-5 gap-3"
                  style={{ scrollSnapAlign: "start", scrollSnapStop: "always" }}
                >
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Dumbbell size={14} strokeWidth={1.5} style={{ color: "#A78BFA" }} />
                    <p className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: "#A0AEC0" }}>
                      Séance recommandée
                    </p>
                  </div>
                  <div className="flex-1 overflow-y-auto -mx-1 px-1">
                    {user ? <WeeklyProgramme /> : (
                      <p className="text-sm font-light text-center mt-8" style={{ color: "#A0AEC0" }}>Connecte-toi pour voir ton programme</p>
                    )}
                  </div>
                </section>

                {/* ─── ZONE 2 : Plats du jour — Carousel horizontal d'assiettes ─── */}
                <PlatsZone
                  meals={meals}
                  totalCals={totalCals}
                  totalProteins={totalProteins}
                  onOpenRepas={onOpenRepas}
                />
                {/* ─── ZONE 3 : Statistiques ─── */}
                <section
                  className="h-full flex flex-col pt-16 pb-6 px-5 gap-3"
                  style={{ scrollSnapAlign: "start", scrollSnapStop: "always" }}
                >
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <BarChart3 size={14} strokeWidth={1.5} style={{ color: "#A78BFA" }} />
                    <p className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: "#A0AEC0" }}>
                      Mes statistiques
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    {stats.slice(0, 6).map((stat) => {
                      const Icon = stat.icon;
                      return (
                        <motion.button type="button" key={stat.label}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => onOpenStat(stat)}
                          className="rounded-2xl p-3 flex flex-col items-start gap-1.5 cursor-pointer text-left"
                          style={{
                            background: "rgba(255,255,255,0.85)",
                            border: "1px solid rgba(212,192,255,0.3)",
                            boxShadow: "0 2px 8px rgba(167,139,250,0.06)",
                          }}>
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                            style={{ background: "rgba(167,139,250,0.1)" }}>
                            <Icon size={14} strokeWidth={1.5} style={{ color: stat.iconColor }} />
                          </div>
                          <p className="text-[9px] font-semibold tracking-widest uppercase" style={{ color: "#A0AEC0" }}>{stat.label}</p>
                          <p className="text-base font-semibold leading-none" style={{ color: "#2D3748" }}>
                            {stat.value}<span className="text-[10px] font-normal ml-1" style={{ color: "#A0AEC0" }}>{stat.unit}</span>
                          </p>
                          {/* Mini bar de progression */}
                          <div className="w-full h-1 rounded-full overflow-hidden mt-1"
                            style={{ background: "rgba(167,139,250,0.12)" }}>
                            <div className="h-full rounded-full"
                              style={{
                                width: `${Math.min(100, stat.progress * 100)}%`,
                                background: stat.barGradient,
                              }} />
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </section>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
/* ═══════════════════════════════════════════════════════════════════════════
   PLATS ZONE — Carousel horizontal d'assiettes qui s'accumulent au fil du jour
   ═══════════════════════════════════════════════════════════════════════════ */
function PlatsZone({
  meals,
  totalCals,
  totalProteins,
  onOpenRepas,
}: {
  meals: Meal[];
  totalCals: number;
  totalProteins: number;
  onOpenRepas: () => void;
}) {
  const carouselRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const totalCards = meals.length + 1; // +1 pour la carte "Ajouter"
  const prevLenRef = useRef(-1);

  /* Détection de la carte centrée par sa proximité au centre du viewport */
  const onCarouselScroll = useCallback(() => {
    if (!carouselRef.current) return;
    const container = carouselRef.current;
    const containerCenter = container.scrollLeft + container.clientWidth / 2;
    let closestIdx = 0;
    let closestDist = Infinity;
    Array.from(container.children).forEach((child, idx) => {
      const el = child as HTMLElement;
      const childCenter = el.offsetLeft + el.clientWidth / 2;
      const dist = Math.abs(childCenter - containerCenter);
      if (dist < closestDist) {
        closestDist = dist;
        closestIdx = idx;
      }
    });
    setActiveIdx(closestIdx);
  }, []);

  /* Centrer une carte donnée par index */
  const scrollToCard = useCallback((idx: number) => {
    if (!carouselRef.current) return;
    const el = carouselRef.current.children[idx] as HTMLElement | undefined;
    if (el) el.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, []);

  /* Auto-scroll vers la carte "Ajouter" au mount initial + après un ajout */
  useEffect(() => {
    if (!carouselRef.current) return;
    const prev = prevLenRef.current;
    prevLenRef.current = meals.length;
    // Initial render (prev === -1) ou meals a grandi (nouveau repas ajouté)
    if (prev === -1 || meals.length > prev) {
      // Petit délai pour s'assurer que les enfants sont rendus
      requestAnimationFrame(() => {
        const el = carouselRef.current?.children[meals.length] as HTMLElement | undefined;
        if (el) {
          el.scrollIntoView({
            inline: "center",
            block: "nearest",
            behavior: prev === -1 ? "auto" : "smooth",
          });
          setActiveIdx(meals.length);
        }
      });
    }
  }, [meals.length]);

  return (
    <section
      className="h-full flex flex-col pt-16 pb-6 gap-3"
      style={{ scrollSnapAlign: "start", scrollSnapStop: "always" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0 px-5">
        <div className="flex items-center gap-2">
          <Utensils size={14} strokeWidth={1.5} style={{ color: "#D4A843" }} />
          <p className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: "#A0AEC0" }}>
            Plats du jour
          </p>
        </div>
        {meals.length > 0 && (
          <p className="text-[10px] font-semibold" style={{ color: "#A78BFA" }}>
            {totalCals} kcal · {totalProteins}g P
          </p>
        )}
      </div>

      {/* Carousel horizontal avec peek */}
      <div
        ref={carouselRef}
        onScroll={onCarouselScroll}
        className="flex-1 overflow-x-scroll overflow-y-hidden flex items-center"
        style={{
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
          // Padding pour que la 1re et la dernière carte puissent se centrer
          paddingLeft: "12.5%",
          paddingRight: "12.5%",
        }}
      >
        {/* Une carte par repas */}
        {meals.map((meal, idx) => (
          <PlateCard
            key={meal.id}
            meal={meal}
            index={idx}
            isActive={activeIdx === idx}
            onActivate={() => scrollToCard(idx)}
            onTap={onOpenRepas}
          />
        ))}

        {/* Carte finale "Ajouter" — toujours présente */}
        <PlateCard
          key="add-new"
          meal={null}
          index={meals.length}
          isActive={activeIdx === meals.length}
          onActivate={() => scrollToCard(meals.length)}
          onTap={onOpenRepas}
        />
      </div>

      {/* Dots indicateur — affichés que si plusieurs cartes */}
      {totalCards > 1 && (
        <div className="flex items-center justify-center gap-1.5 flex-shrink-0">
          {Array.from({ length: totalCards }).map((_, i) => (
            <div key={i}
              className="rounded-full transition-all"
              style={{
                width: activeIdx === i ? 18 : 5,
                height: 5,
                background: activeIdx === i
                  ? "linear-gradient(90deg, #A78BFA, #D4A843)"
                  : "rgba(167,139,250,0.25)",
              }} />
          ))}
        </div>
      )}

      {/* Récap en bas */}
      {meals.length > 0 ? (
        <div className="flex gap-2 flex-shrink-0 px-5">
          {[
            { label: "kcal", value: totalCals,           color: "#A78BFA" },
            { label: "Prot", value: `${totalProteins}g`, color: "#D4A843" },
            { label: "Repas", value: meals.length,       color: "#A78BFA" },
          ].map(s => (
            <div key={s.label}
              className="flex-1 rounded-2xl p-2.5 text-center"
              style={{ background: "rgba(255,255,255,0.85)", border: "1px solid rgba(212,192,255,0.25)" }}>
              <p className="text-[8px] font-semibold tracking-widest uppercase" style={{ color: "#A0AEC0" }}>{s.label}</p>
              <p className="text-base font-semibold mt-0.5" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex-shrink-0 px-5 text-center">
          <p className="text-[11px] font-light" style={{ color: "#A0AEC0" }}>
            Tap l'assiette pour ajouter — photo, code-barres ou saisie
          </p>
        </div>
      )}
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PLATE CARD — Une assiette SVG individuelle avec contenu varié selon repas
   ═══════════════════════════════════════════════════════════════════════════ */
function PlateCard({
  meal,
  index,
  isActive,
  onActivate,
  onTap,
}: {
  meal: Meal | null; // null = carte "Ajouter"
  index: number;
  isActive: boolean;
  onActivate: () => void;
  onTap: () => void;
}) {
  const isAddCard = meal === null;
  const fillness = meal ? plateFillness(meal.calories) : "light";
  const palette = meal ? (MEAL_PALETTE[meal.mealType] ?? MEAL_PALETTE.dejeuner) : null;
  const plateId = `plate-${index}`;

  // Tap : si la carte est centrée → ouvre le modal. Sinon → scroll au centre.
  const handleClick = () => {
    if (isActive) onTap();
    else onActivate();
  };

  return (
    <motion.div
      animate={{
        opacity: isActive ? 1 : 0.55,
        scale: isActive ? 1 : 0.82,
      }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="flex-shrink-0 flex flex-col items-center justify-center px-3 gap-3"
      style={{
        width: "75%",
        scrollSnapAlign: "center",
        scrollSnapStop: "always",
        filter: isActive ? "none" : "saturate(0.85)",
      }}
    >
      <motion.button
        type="button"
        onClick={handleClick}
        whileTap={{ scale: 0.97 }}
        whileHover={{ scale: 1.02 }}
        className="relative outline-none"
        style={{ width: 220, height: 220 }}
        aria-label={isAddCard ? "Ajouter un repas" : `Voir le détail de ${meal?.name}`}
      >
        {/* Ombre portée */}
        <div className="absolute pointer-events-none"
          style={{
            bottom: -6, left: "50%", transform: "translateX(-50%)",
            width: 200, height: 18, borderRadius: "50%",
            background: "radial-gradient(ellipse, rgba(45,55,72,0.18) 0%, transparent 70%)",
            filter: "blur(8px)",
          }} />

        <svg viewBox="0 0 220 220" width="220" height="220" style={{ overflow: "visible" }}>
          <defs>
            <radialGradient id={`${plateId}-body`} cx="40%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="55%" stopColor="#F8F4FB" />
              <stop offset="100%" stopColor="#E8DEF0" />
            </radialGradient>
            <radialGradient id={`${plateId}-inner`} cx="45%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="100%" stopColor="#F0E8F5" />
            </radialGradient>
            <linearGradient id={`${plateId}-shine`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(255,255,255,0.7)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </linearGradient>
            {palette && (
              <>
                <radialGradient id={`${plateId}-protein`} cx="40%" cy="35%">
                  <stop offset="0%" stopColor={palette.protein[0]} />
                  <stop offset="100%" stopColor={palette.protein[1]} />
                </radialGradient>
                <radialGradient id={`${plateId}-carbs`} cx="40%" cy="35%">
                  <stop offset="0%" stopColor={palette.carbs[0]} />
                  <stop offset="100%" stopColor={palette.carbs[1]} />
                </radialGradient>
                <radialGradient id={`${plateId}-veggies`} cx="40%" cy="35%">
                  <stop offset="0%" stopColor={palette.veggies[0]} />
                  <stop offset="100%" stopColor={palette.veggies[1]} />
                </radialGradient>
              </>
            )}
          </defs>

          {/* Corps de l'assiette */}
          <circle cx="110" cy="110" r="105" fill={`url(#${plateId}-body)`} />
          <circle cx="110" cy="110" r="82" fill={`url(#${plateId}-inner)`} />
          <circle cx="110" cy="110" r="82" fill="none" stroke="rgba(167,139,250,0.18)" strokeWidth="0.5" />
          <ellipse cx="85" cy="55" rx="55" ry="22" fill={`url(#${plateId}-shine)`} opacity="0.6" />
          <ellipse cx="170" cy="100" rx="8" ry="35" fill="rgba(255,255,255,0.35)" />

          {/* ─── Aliments si l'assiette est pleine ─── */}
          {!isAddCard && palette && (
            <>
              {/* Toujours présent : protéine grosse */}
              <ellipse cx="85" cy="100" rx={fillness === "full" ? 38 : fillness === "medium" ? 32 : 24}
                       ry={fillness === "full" ? 30 : fillness === "medium" ? 25 : 20}
                       fill={`url(#${plateId}-protein)`} opacity="0.94" />

              {/* Medium + Full : féculents */}
              {fillness !== "light" && (
                <ellipse cx="140" cy="125" rx={fillness === "full" ? 32 : 26}
                         ry={fillness === "full" ? 26 : 20}
                         fill={`url(#${plateId}-carbs)`} opacity="0.9" />
              )}

              {/* Medium + Full : veggies */}
              {fillness !== "light" && (
                <ellipse cx="130" cy="85" rx={fillness === "full" ? 26 : 20}
                         ry={fillness === "full" ? 20 : 15}
                         fill={`url(#${plateId}-veggies)`} opacity="0.87" />
              )}

              {/* Full uniquement : un blob supplémentaire (sauce/extra) */}
              {fillness === "full" && (
                <ellipse cx="75" cy="145" rx="22" ry="16"
                         fill={`url(#${plateId}-veggies)`} opacity="0.82" />
              )}
              {fillness === "full" && (
                <ellipse cx="155" cy="80" rx="18" ry="13"
                         fill={`url(#${plateId}-protein)`} opacity="0.78" />
              )}

              {/* Grains/morceaux — quantité varie selon fillness */}
              <circle cx="80" cy="92" r="2.6" fill={palette.grain} opacity="0.75" />
              <circle cx="98" cy="113" r="2.1" fill={palette.grain} opacity="0.75" />
              {fillness !== "light" && <>
                <circle cx="142" cy="120" r="2.3" fill={palette.grain} opacity="0.75" />
                <circle cx="130" cy="135" r="2.6" fill={palette.grain} opacity="0.7" />
                <circle cx="122" cy="92" r="2" fill={palette.veggies[1]} opacity="0.7" />
                <circle cx="138" cy="78" r="1.7" fill={palette.veggies[1]} opacity="0.7" />
              </>}
              {fillness === "full" && <>
                <circle cx="92" cy="148" r="2.4" fill={palette.veggies[1]} opacity="0.7" />
                <circle cx="68" cy="138" r="1.9" fill={palette.grain} opacity="0.7" />
                <circle cx="148" cy="145" r="2.1" fill={palette.carbs[1]} opacity="0.65" />
                <circle cx="115" cy="110" r="1.6" fill={palette.protein[1]} opacity="0.65" />
                <circle cx="160" cy="115" r="1.8" fill={palette.veggies[1]} opacity="0.65" />
              </>}
            </>
          )}
        </svg>

        {/* Icône camera + plus pour la carte "Ajouter" */}
        {isAddCard && (
          <div className="absolute pointer-events-none"
            style={{
              top: "50%", left: "50%",
              transform: "translate(-50%, -50%)",
              width: 56, height: 56,
              borderRadius: 18,
              background: "linear-gradient(135deg, rgba(212,192,255,0.35), rgba(245,230,163,0.35))",
              backdropFilter: "blur(4px)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 4px 16px rgba(167,139,250,0.18)",
            }}>
            <Camera size={22} strokeWidth={1.5} style={{ color: "#A78BFA" }} />
          </div>
        )}
      </motion.button>

      {/* Légende sous l'assiette */}
      <div className="text-center">
        {isAddCard ? (
          <>
            <p className="text-sm font-semibold" style={{ color: "#2D3748" }}>
              Nouvelle assiette
            </p>
            <p className="text-[11px] font-light mt-0.5" style={{ color: "#A0AEC0" }}>
              Tap pour ajouter un repas
            </p>
          </>
        ) : meal && (
          <>
            <div className="flex items-center justify-center gap-1.5">
              <span className="text-base">{MEAL_EMOJI[meal.mealType] ?? "🍽️"}</span>
              <p className="text-sm font-semibold truncate max-w-[200px]" style={{ color: "#2D3748" }}>
                {meal.name}
              </p>
            </div>
            <p className="text-[11px] font-light mt-0.5" style={{ color: "#A0AEC0" }}>
              {MEAL_LABEL[meal.mealType] ?? "Repas"}
              {meal.time && ` · ${meal.time.substring(0, 5)}`}
              {` · ${meal.calories} kcal · ${meal.proteins}g prot`}
            </p>
          </>
        )}
      </div>
    </motion.div>
  );
}
