"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

/* ─── Types ─── */
type MealItem = { type: string; nom: string; calories: number };
type MealDay = { jour: string; repas: MealItem[] };
type MealPlan = { semaine: MealDay[] };

/* ─── Meal type meta ─── */
const MEAL_EMOJI: Record<string, string> = {
  "petit-dejeuner": "🥐", "dejeuner": "🍽️", "gouter": "🍪", "diner": "🍲", "collation": "🥤",
};
const MEAL_LABEL: Record<string, string> = {
  "petit-dejeuner": "Petit-déj", "dejeuner": "Déjeuner", "gouter": "Goûter", "diner": "Dîner", "collation": "Collation",
};

function mealTypesForCount(n: number): string[] {
  switch (n) {
    case 2:  return ["dejeuner", "diner"];
    case 3:  return ["petit-dejeuner", "dejeuner", "diner"];
    case 5:  return ["petit-dejeuner", "collation", "dejeuner", "gouter", "diner"];
    case 6:  return ["petit-dejeuner", "collation", "dejeuner", "gouter", "diner", "collation"];
    case 4:
    default: return ["petit-dejeuner", "dejeuner", "gouter", "diner"];
  }
}

/* ─── Banque de repas connus de tous ─── */
const POOLS: Record<string, { nom: string; calories: number }[]> = {
  "petit-dejeuner": [
    { nom: "Tartines beurre & confiture", calories: 350 },
    { nom: "Bol de céréales + lait", calories: 320 },
    { nom: "Porridge avoine & banane", calories: 380 },
    { nom: "Œufs brouillés + pain", calories: 400 },
    { nom: "Pain perdu", calories: 420 },
    { nom: "Yaourt + granola + fruits", calories: 330 },
    { nom: "Croissant + jus d'orange", calories: 360 },
    { nom: "Pancakes + sirop d'érable", calories: 450 },
    { nom: "Smoothie banane-fraise", calories: 280 },
    { nom: "Tartines avocat & œuf", calories: 410 },
    { nom: "Fromage blanc, miel & noix", calories: 340 },
    { nom: "Pain complet & beurre de cacahuète", calories: 390 },
    { nom: "Müesli + lait + banane", calories: 360 },
    { nom: "Omelette + pain", calories: 380 },
    { nom: "Bol de fruits + yaourt", calories: 250 },
    { nom: "Tartines pâte à tartiner", calories: 400 },
    { nom: "Brioche + chocolat chaud", calories: 430 },
    { nom: "Flocons d'avoine & pomme", calories: 350 },
    { nom: "Œufs au plat + bacon", calories: 450 },
    { nom: "Smoothie bowl", calories: 320 },
    { nom: "Pain, fromage & jambon", calories: 420 },
    { nom: "Toasts + œuf poché", calories: 380 },
    { nom: "Crêpes + confiture", calories: 410 },
    { nom: "Skyr, muesli & myrtilles", calories: 330 },
  ],
  "dejeuner": [
    { nom: "Pâtes bolognaise", calories: 650 },
    { nom: "Poulet, riz & haricots verts", calories: 600 },
    { nom: "Steak frites", calories: 700 },
    { nom: "Riz cantonais", calories: 580 },
    { nom: "Salade César au poulet", calories: 520 },
    { nom: "Lasagnes", calories: 680 },
    { nom: "Poulet curry & riz", calories: 620 },
    { nom: "Pâtes carbonara", calories: 700 },
    { nom: "Burger maison + frites", calories: 750 },
    { nom: "Saumon, riz & brocolis", calories: 580 },
    { nom: "Quiche lorraine + salade", calories: 600 },
    { nom: "Couscous poulet & légumes", calories: 640 },
    { nom: "Chili con carne", calories: 590 },
    { nom: "Wrap poulet crudités", calories: 480 },
    { nom: "Omelette, salade & pain", calories: 500 },
    { nom: "Pâtes au pesto", calories: 560 },
    { nom: "Boulettes sauce tomate & riz", calories: 640 },
    { nom: "Croque-monsieur + salade", calories: 550 },
    { nom: "Poke bowl saumon", calories: 540 },
    { nom: "Gratin de pâtes", calories: 660 },
    { nom: "Poulet rôti & pommes de terre", calories: 620 },
    { nom: "Hachis parmentier", calories: 650 },
    { nom: "Risotto aux champignons", calories: 580 },
    { nom: "Sandwich poulet crudités", calories: 460 },
    { nom: "Pâtes au saumon", calories: 620 },
    { nom: "Tacos poulet", calories: 680 },
    { nom: "Salade de pâtes au thon", calories: 520 },
    { nom: "Escalope de dinde & purée", calories: 600 },
  ],
  "gouter": [
    { nom: "Yaourt + fruits rouges", calories: 180 },
    { nom: "Pomme + amandes", calories: 200 },
    { nom: "Banane & beurre de cacahuète", calories: 250 },
    { nom: "Barre de céréales", calories: 150 },
    { nom: "Compote + biscuits", calories: 190 },
    { nom: "Fromage blanc & miel", calories: 170 },
    { nom: "Poignée de noix", calories: 200 },
    { nom: "Smoothie banane", calories: 220 },
    { nom: "Pain + carré de chocolat", calories: 210 },
    { nom: "Yaourt grec & miel", calories: 180 },
    { nom: "Fruits secs & amandes", calories: 230 },
    { nom: "Galettes de riz & confiture", calories: 160 },
    { nom: "Cookies maison", calories: 250 },
    { nom: "Crêpe au sucre", calories: 200 },
    { nom: "Tartine de miel", calories: 190 },
    { nom: "Skyr & myrtilles", calories: 160 },
    { nom: "Madeleine + jus de fruits", calories: 220 },
    { nom: "Chocolat & noisettes", calories: 210 },
  ],
  "diner": [
    { nom: "Soupe, pain & fromage", calories: 450 },
    { nom: "Omelette + salade", calories: 400 },
    { nom: "Poulet & légumes vapeur", calories: 480 },
    { nom: "Riz sauté aux légumes", calories: 500 },
    { nom: "Pâtes tomate-basilic", calories: 520 },
    { nom: "Saumon & purée", calories: 550 },
    { nom: "Salade composée", calories: 420 },
    { nom: "Quiche + salade verte", calories: 540 },
    { nom: "Gratin de courgettes", calories: 460 },
    { nom: "Soupe de légumes + tartines", calories: 400 },
    { nom: "Poisson pané & riz", calories: 540 },
    { nom: "Velouté de potiron + pain", calories: 420 },
    { nom: "Poêlée de légumes & œufs", calories: 450 },
    { nom: "Risotto aux légumes", calories: 520 },
    { nom: "Tortilla de pommes de terre", calories: 500 },
    { nom: "Curry de pois chiches & riz", calories: 540 },
    { nom: "Poulet & haricots verts", calories: 480 },
    { nom: "Tarte aux légumes", calories: 470 },
    { nom: "Pâtes aux courgettes", calories: 510 },
    { nom: "Steak haché & purée", calories: 560 },
    { nom: "Buddha bowl", calories: 500 },
    { nom: "Filet de poisson & ratatouille", calories: 490 },
    { nom: "Gnocchis sauce tomate", calories: 540 },
    { nom: "Salade de lentilles", calories: 440 },
    { nom: "Boulgour & légumes", calories: 480 },
    { nom: "Wok de nouilles & légumes", calories: 530 },
    { nom: "Croque-madame + salade", calories: 560 },
    { nom: "Dahl de lentilles & riz", calories: 520 },
  ],
  "collation": [
    { nom: "Fruit + yaourt", calories: 150 },
    { nom: "Poignée d'amandes", calories: 180 },
    { nom: "Barre protéinée", calories: 200 },
    { nom: "Banane", calories: 100 },
    { nom: "Fromage blanc", calories: 120 },
    { nom: "Smoothie protéiné", calories: 220 },
    { nom: "Œuf dur", calories: 80 },
    { nom: "Compote", calories: 90 },
    { nom: "Galette de riz", calories: 70 },
    { nom: "Noix de cajou", calories: 180 },
    { nom: "Skyr nature", calories: 110 },
    { nom: "Pain & jambon", calories: 150 },
    { nom: "Poignée de noisettes", calories: 170 },
    { nom: "Yaourt à boire", calories: 130 },
  ],
};

const DAY_LABELS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

/* ─── PRNG déterministe (seed → suite stable) ─── */
function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function mulberry32(a: number) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* Numéro de semaine ISO (pour faire varier le plan chaque semaine) */
function weekNumber(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  return Math.ceil(((now.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7);
}

/* ─── Construit le plan local (instantané, sans IA, sans doublon dans la semaine) ─── */
function buildLocalPlan(userId: string, mealsCount: number, variant: number): MealPlan {
  const types = mealTypesForCount(mealsCount);
  const rng = mulberry32(hashStr(`${userId}-w${weekNumber()}-${new Date().getFullYear()}-v${variant}`));

  // Une liste mélangée + un curseur par type (les slots du même type piochent des plats différents)
  const shuffled: Record<string, { nom: string; calories: number }[]> = {};
  const cursor: Record<string, number> = {};

  const semaine: MealDay[] = DAY_LABELS.map((jour) => ({ jour, repas: [] }));

  for (const t of types) {
    if (!shuffled[t]) { shuffled[t] = shuffle(POOLS[t] ?? [], rng); cursor[t] = 0; }
    const pool = shuffled[t];
    for (let d = 0; d < 7; d++) {
      const item = pool.length ? pool[cursor[t] % pool.length] : { nom: "Repas équilibré", calories: 400 };
      cursor[t]++;
      semaine[d].repas.push({ type: t, nom: item.nom, calories: item.calories });
    }
  }
  return { semaine };
}

/* ─── Repas du jour sélectionné ─── */
function DayMeals({ day }: { day: MealDay }) {
  const total = (day.repas ?? []).reduce((s, m) => s + (m.calories || 0), 0);
  return (
    <motion.div key={day.jour}
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2, ease: "easeOut" }}
      className="flex flex-col gap-2">
      {total > 0 && (
        <p className="text-[10px] font-semibold self-end" style={{ color: "#D4A843" }}>~{total} kcal / jour</p>
      )}
      {(day.repas ?? []).map((m, i) => (
        <div key={i} className="flex items-center gap-3 rounded-2xl px-3 py-2.5"
          style={{ background: "rgba(255,255,255,0.7)", border: "1px solid rgba(212,192,255,0.25)" }}>
          <span className="text-lg flex-shrink-0">{MEAL_EMOJI[m.type] ?? "🍽️"}</span>
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-semibold tracking-widest uppercase" style={{ color: "#A0AEC0" }}>{MEAL_LABEL[m.type] ?? "Repas"}</p>
            <p className="text-[13px] font-medium leading-snug" style={{ color: "#2D3748" }}>{m.nom}</p>
          </div>
          {m.calories > 0 && (
            <span className="text-[11px] font-semibold flex-shrink-0" style={{ color: "#A78BFA" }}>{m.calories} kcal</span>
          )}
        </div>
      ))}
    </motion.div>
  );
}

/* ─── Composant principal ─── */
export default function RecommendedMeals() {
  const { user } = useAuth();
  const [mealsCount, setMealsCount] = useState(4);
  const [variant, setVariant] = useState(0);

  const todayIndex = (() => { const d = new Date().getDay(); return d === 0 ? 6 : d - 1; })();
  const [selectedDay, setSelectedDay] = useState(todayIndex);

  const trackRef = useRef<HTMLDivElement>(null);
  const nameRefs = useRef<(HTMLButtonElement | null)[]>([]);

  /* Charge le nombre de repas/jour depuis le profil (sinon 4 par défaut) */
  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    supabase.from("profiles").select("onboarding_meals_day").eq("id", user.id).maybeSingle()
      .then(({ data }) => {
        const n = data?.onboarding_meals_day;
        if (n && n >= 2) setMealsCount(Math.min(6, n));
      });
  }, [user]);

  /* Variant persistant (Régénérer) */
  useEffect(() => {
    if (!user) return;
    try {
      const v = localStorage.getItem(`vaiiya_repas_variant_${user.id}`);
      if (v) setVariant(parseInt(v) || 0);
    } catch { /* ignore */ }
  }, [user]);

  /* Plan construit instantanément (mémo simple) */
  const plan: MealPlan | null = user ? buildLocalPlan(user.id, mealsCount, variant) : null;

  const regenerate = useCallback(() => {
    setVariant((v) => {
      const nv = v + 1;
      if (user) { try { localStorage.setItem(`vaiiya_repas_variant_${user.id}`, String(nv)); } catch { /* ignore */ } }
      return nv;
    });
  }, [user]);

  useEffect(() => {
    nameRefs.current[selectedDay]?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [selectedDay]);

  const currentDay = plan?.semaine?.[selectedDay];

  const getDayFromX = (clientX: number): number => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return selectedDay;
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
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

  const pct = ((selectedDay + 0.5) / 7) * 100;

  return (
    <div className="flex flex-col gap-3">
      {/* Slider jour */}
      <div className="flex flex-col gap-2">
        <div className="flex overflow-x-auto gap-4 pb-0.5" style={{ scrollbarWidth: "none" }}>
          {DAY_LABELS.map((label, i) => (
            <button key={label}
              ref={el => { nameRefs.current[i] = el; }}
              onClick={() => setSelectedDay(i)}
              className="flex-shrink-0 cursor-pointer select-none"
              style={{
                color: i === selectedDay ? "#2D3748" : "#A0AEC0",
                fontWeight: i === selectedDay ? 600 : 400,
                fontSize: 12, transition: "color 0.15s, font-weight 0.15s",
                background: "none", border: "none", padding: 0,
              }}>
              {label}
            </button>
          ))}
        </div>

        <div ref={trackRef}
          className="relative rounded-full cursor-pointer select-none touch-none"
          style={{ height: 5, background: "rgba(212,168,67,0.12)" }}
          onPointerDown={onPointerDown} onPointerMove={onPointerMove}>
          <div className="absolute left-0 top-0 h-full rounded-full pointer-events-none"
            style={{ width: `${pct}%`, background: "linear-gradient(90deg, #D4A843, #A78BFA)", transition: "width 0.12s ease" }} />
        </div>

        <div className="flex justify-end">
          <button onClick={regenerate}
            className="flex items-center gap-1 cursor-pointer" style={{ color: "#A0AEC0", background: "none", border: "none", padding: 0 }}>
            <RefreshCw size={10} strokeWidth={2.5} />
            <span className="text-[9px] font-medium">Changer les repas</span>
          </button>
        </div>
      </div>

      {/* Repas du jour */}
      <div className="min-h-[100px]">
        <AnimatePresence mode="wait">
          {currentDay && <DayMeals key={`${selectedDay}-${variant}`} day={currentDay} />}
        </AnimatePresence>
      </div>
    </div>
  );
}
