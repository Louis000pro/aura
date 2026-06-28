"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, Lock, Plus, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useNutritionGoals } from "@/hooks/useNutritionGoals";

/* ─── Types ─── */
type PoolItem = { nom: string; calories: number; proteins?: number; carbs?: number; fats?: number; i?: boolean; prepMin?: number; difficulty?: string };
type Pools = Record<string, PoolItem[]>;
type MealItem = { type: string; nom: string; calories: number; proteins?: number; carbs?: number; fats?: number };
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
const POOLS: Pools = {
  "petit-dejeuner": [
    { nom: "Tartines beurre & confiture", calories: 350 },
    { nom: "Bol de céréales + lait", calories: 320 },
    { nom: "Porridge avoine & banane", calories: 380 },
    { nom: "Œufs brouillés + pain", calories: 400 },
    { nom: "Pain perdu", calories: 420, i: true },
    { nom: "Yaourt + granola + fruits", calories: 330 },
    { nom: "Croissant + jus d'orange", calories: 360 },
    { nom: "Pancakes + sirop d'érable", calories: 450, i: true },
    { nom: "Smoothie banane-fraise", calories: 280 },
    { nom: "Tartines avocat & œuf", calories: 410 },
    { nom: "Fromage blanc, miel & noix", calories: 340 },
    { nom: "Pain complet & beurre de cacahuète", calories: 390 },
    { nom: "Müesli + lait + banane", calories: 360 },
    { nom: "Omelette + pain", calories: 380 },
    { nom: "Bol de fruits + yaourt", calories: 250 },
    { nom: "Tartines pâte à tartiner", calories: 400, i: true },
    { nom: "Brioche + chocolat chaud", calories: 430, i: true },
    { nom: "Flocons d'avoine & pomme", calories: 350 },
    { nom: "Œufs au plat + bacon", calories: 450 },
    { nom: "Smoothie bowl", calories: 320 },
    { nom: "Pain, fromage & jambon", calories: 420 },
    { nom: "Toasts + œuf poché", calories: 380 },
    { nom: "Crêpes + confiture", calories: 410, i: true },
    { nom: "Skyr, muesli & myrtilles", calories: 330 },
  ],
  "dejeuner": [
    { nom: "Pâtes bolognaise", calories: 650 },
    { nom: "Poulet, riz & haricots verts", calories: 600 },
    { nom: "Steak frites", calories: 700, i: true },
    { nom: "Riz cantonais", calories: 580 },
    { nom: "Salade César au poulet", calories: 520 },
    { nom: "Lasagnes", calories: 680, i: true },
    { nom: "Poulet curry & riz", calories: 620 },
    { nom: "Pâtes carbonara", calories: 700, i: true },
    { nom: "Burger maison + frites", calories: 750, i: true },
    { nom: "Saumon, riz & brocolis", calories: 580 },
    { nom: "Quiche lorraine + salade", calories: 600 },
    { nom: "Couscous poulet & légumes", calories: 640 },
    { nom: "Chili con carne", calories: 590 },
    { nom: "Wrap poulet crudités", calories: 480 },
    { nom: "Omelette, salade & pain", calories: 500 },
    { nom: "Pâtes au pesto", calories: 560 },
    { nom: "Boulettes sauce tomate & riz", calories: 640 },
    { nom: "Croque-monsieur + salade", calories: 550, i: true },
    { nom: "Poke bowl saumon", calories: 540 },
    { nom: "Gratin de pâtes", calories: 660, i: true },
    { nom: "Poulet rôti & pommes de terre", calories: 620 },
    { nom: "Hachis parmentier", calories: 650 },
    { nom: "Risotto aux champignons", calories: 580 },
    { nom: "Sandwich poulet crudités", calories: 460 },
    { nom: "Pâtes au saumon", calories: 620 },
    { nom: "Tacos poulet", calories: 680, i: true },
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
    { nom: "Cookies maison", calories: 250, i: true },
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
    { nom: "Croque-madame + salade", calories: 560, i: true },
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

/* ─── Filtre régime / allergies (heuristique basée sur le nom du plat) ─── */
export type DietKey = "vegetarien" | "vegan" | "sans-gluten" | "sans-lactose";

export const DIET_OPTIONS: { key: DietKey; label: string; emoji: string }[] = [
  { key: "vegetarien",   label: "Végé",         emoji: "🌱" },
  { key: "vegan",        label: "Vegan",        emoji: "🌿" },
  { key: "sans-gluten",  label: "Sans gluten",  emoji: "🌾" },
  { key: "sans-lactose", label: "Sans lactose", emoji: "🥛" },
];

function norm(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}
const KW_MEAT = ["poulet", "dinde", "escalope", "steak", "boeuf", "jambon", "bacon", "lardons", "saumon", "thon", "poisson", "pane", "bolognaise", "carbonara", "parmentier", "chili con carne", "tacos", "burger", "croque", "poke", "boulettes", "hache", "cantonais", "crevette", "viande"];
const KW_ANIMAL = ["oeuf", "omelette", "fromage", "yaourt", "lait", "creme", "beurre", "skyr", "miel", "brioche", "croissant", "crepe", "pancake", "quiche", "gratin", "granola", "chocolat chaud", "madeleine", "pain perdu", "cookies", "muesli", "cesar", "flan"];
const KW_GLUTEN = ["pates", "pate ", "pain", "tartine", "baguette", "croissant", "brioche", "crepe", "pancake", "biscuit", "cookies", "cereales", "muesli", "granola", "lasagnes", "burger", "sandwich", "wrap", "couscous", "boulgour", "gnocchis", "quiche", "tarte", "madeleine", "croque", "nouilles", "pain perdu", "toasts", "semoule"];
const KW_LACTOSE = ["fromage", "yaourt", "lait", "creme", "beurre", "skyr", "gratin", "croque", "quiche", "brioche", "chocolat chaud", "glace", "carbonara", "lasagnes", "flan", "madeleine", "cookies", "pancake", "crepe", "granola", "muesli"];

function classifyMeal(nom: string): { veg: boolean; vegan: boolean; gluten: boolean; lactose: boolean } {
  const n = norm(nom);
  const has = (arr: string[]) => arr.some((k) => n.includes(k));
  const veg = !has(KW_MEAT);
  return { veg, vegan: veg && !has(KW_ANIMAL), gluten: has(KW_GLUTEN), lactose: has(KW_LACTOSE) };
}

function matchesDiet(nom: string, active: Set<DietKey>): boolean {
  if (active.size === 0) return true;
  const t = classifyMeal(nom);
  if (active.has("vegetarien") && !t.veg) return false;
  if (active.has("vegan") && !t.vegan) return false;
  if (active.has("sans-gluten") && t.gluten) return false;
  if (active.has("sans-lactose") && t.lactose) return false;
  return true;
}

/* Filtre chaque pool selon le régime actif (garde le pool complet si le filtre le vide). */
function filterPoolsByDiet(active: Set<DietKey>): Pools {
  if (active.size === 0) return POOLS;
  const out = {} as Pools;
  for (const type of Object.keys(POOLS)) {
    const filtered = POOLS[type].filter((m) => matchesDiet(m.nom, active));
    out[type] = filtered.length >= 2 ? filtered : POOLS[type];
  }
  return out;
}

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

/* ─── Construit le plan local (instantané, sans IA, sans doublon dans la semaine) ───
   Équilibré : max 2 plats "plaisir" (i:true, ex. steak frites, burger) sur la semaine. */
const INDULGENT_MAX = 2;
function buildLocalPlan(userId: string, mealsCount: number, variant: number, pools: Pools, dietKey: string): MealPlan {
  const types = mealTypesForCount(mealsCount);
  const rng = mulberry32(hashStr(`${userId}-w${weekNumber()}-${new Date().getFullYear()}-v${variant}-${dietKey}`));

  const shuffled: Record<string, PoolItem[]> = {};
  const cursor: Record<string, number> = {};
  for (const t of types) {
    if (!shuffled[t]) { shuffled[t] = shuffle(pools[t] ?? [], rng); cursor[t] = 0; }
  }

  let indulgentBudget = INDULGENT_MAX;
  const semaine: MealDay[] = DAY_LABELS.map((jour) => ({ jour, repas: [] }));

  // Jour par jour, type par type → le budget "plaisir" se répartit naturellement
  for (let d = 0; d < 7; d++) {
    for (const t of types) {
      const pool = shuffled[t];
      if (!pool.length) { semaine[d].repas.push({ type: t, nom: "Repas équilibré", calories: 400 }); continue; }

      let chosen: PoolItem | null = null;
      // On avance dans la liste mélangée ; on saute les plats "plaisir" si le budget est épuisé
      for (let scanned = 0; scanned < pool.length; scanned++) {
        const item = pool[cursor[t] % pool.length];
        cursor[t]++;
        if (item.i && indulgentBudget <= 0) continue; // budget plaisir épuisé → on saute
        chosen = item;
        if (item.i) indulgentBudget--;
        break;
      }
      if (!chosen) { chosen = pool[cursor[t] % pool.length]; cursor[t]++; }
      semaine[d].repas.push({ type: t, nom: chosen.nom, calories: chosen.calories, proteins: chosen.proteins, carbs: chosen.carbs, fats: chosen.fats });
    }
  }
  return { semaine };
}

/* ─── Repas du jour sélectionné ─── */
function DayMeals({ day, dayIndex, canEat, addedKeys, onEat }: {
  day: MealDay; dayIndex: number; canEat: boolean;
  addedKeys: Set<string>; onEat: (m: MealItem) => void;
}) {
  const total = (day.repas ?? []).reduce((s, m) => s + (m.calories || 0), 0);
  return (
    <motion.div key={day.jour}
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2, ease: "easeOut" }}
      className="flex flex-col gap-2">
      {total > 0 && (
        <p className="text-[10px] font-semibold self-end" style={{ color: "#D4A843" }}>~{total} kcal / jour</p>
      )}
      {(day.repas ?? []).map((m, i) => {
        const added = addedKeys.has(`${dayIndex}-${m.type}-${m.nom}`);
        return (
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
            {canEat && (
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={() => onEat(m)}
                title="Ajouter à mon journal"
                className="w-7 h-7 rounded-full flex items-center justify-center cursor-pointer flex-shrink-0"
                style={{
                  background: added ? "rgba(52,211,153,0.18)" : "linear-gradient(135deg,#D4C0FF,#F5E6A3)",
                  boxShadow: added ? "none" : "inset 0 1px 0 rgba(255,255,255,0.8)",
                }}>
                {added
                  ? <Check size={13} strokeWidth={2.5} style={{ color: "#34D399" }} />
                  : <Plus size={13} strokeWidth={2.5} style={{ color: "#2D3748" }} />}
              </motion.button>
            )}
          </div>
        );
      })}
    </motion.div>
  );
}

/* ─── Composant principal ─── */
export default function RecommendedMeals() {
  const { user } = useAuth();
  const router = useRouter();
  const isPremium = !!(user?.is_admin || user?.is_premium);
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

  /* Régime / allergies (filtre des suggestions, persistant en local) */
  const [diet, setDiet] = useState<Set<DietKey>>(new Set());
  useEffect(() => {
    if (!user) return;
    try {
      const raw = localStorage.getItem(`vaiiya_diet_${user.id}`);
      if (raw) setDiet(new Set(JSON.parse(raw) as DietKey[]));
    } catch { /* ignore */ }
  }, [user]);
  const toggleDiet = (key: DietKey) => {
    setDiet((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      if (user) { try { localStorage.setItem(`vaiiya_diet_${user.id}`, JSON.stringify([...next])); } catch { /* ignore */ } }
      return next;
    });
  };
  const dietKey = [...diet].sort().join(",");
  const dietPools = useMemo(() => filterPoolsByDiet(diet), [dietKey]); // eslint-disable-line

  /* Objectif du jour — depuis le profil central (base), partagé avec l'IA. */
  const { goals } = useNutritionGoals();
  const goalCals = goals.calories;

  /* ── Banque de plats PERSONNALISÉE par l'IA (cache 1 semaine).
     Si dispo, elle remplace le catalogue figé ; sinon on garde le secours. ─── */
  const [aiPools, setAiPools] = useState<Pools | null>(null);
  const [menuLoading, setMenuLoading] = useState(false);
  useEffect(() => {
    if (!user) { setAiPools(null); return; }
    const cacheKey = `vaiiya_menu_pool_${user.id}_w${weekNumber()}_m${mealsCount}_${dietKey || "all"}`;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) { setAiPools(JSON.parse(cached) as Pools); return; }
    } catch { /* ignore */ }
    if (goalCals <= 0) return; // on attend de connaître l'objectif avant de générer

    let cancelled = false;
    setMenuLoading(true);
    (async () => {
      // Profil de goûts (popup) — local pour l'instant.
      let taste: unknown = null;
      try { const raw = localStorage.getItem(`vaiiya_taste_profile_${user.id}`); if (raw) taste = JSON.parse(raw); } catch { /* ignore */ }
      // Coups de cœur = plats les plus fréquents de l'historique réel.
      let favorites: string[] = [];
      try {
        const { data } = await createClient()
          .from("nutrition_logs").select("food_name")
          .eq("user_id", user.id).order("date", { ascending: false }).limit(150);
        const counts = new Map<string, number>();
        ((data ?? []) as { food_name?: string }[]).forEach((r) => {
          const k = (r.food_name ?? "").trim();
          if (k) counts.set(k, (counts.get(k) ?? 0) + 1);
        });
        favorites = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([n]) => n);
      } catch { /* ignore */ }

      try {
        const res = await fetch("/api/nutrition/menu", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mealTypes: mealTypesForCount(mealsCount), perType: 8,
            calorieTarget: goalCals, diet: [...diet], taste, favorites,
          }),
        });
        const json = await res.json();
        if (cancelled || !res.ok || !json?.pools || typeof json.pools !== "object") return;
        // Normalise (indulgent → i, nombres arrondis, plats vides filtrés).
        const rawPools = json.pools as Record<string, unknown>;
        const norm: Pools = {};
        const num = (v: unknown) => (v == null || isNaN(Number(v)) ? undefined : Math.round(Number(v)));
        for (const t of Object.keys(rawPools)) {
          const arr = rawPools[t];
          if (!Array.isArray(arr)) continue;
          const items: PoolItem[] = [];
          for (const raw of arr) {
            const x = (raw ?? {}) as Record<string, unknown>;
            const nom = typeof x.nom === "string" ? x.nom.trim() : "";
            if (!nom) continue;
            items.push({
              nom, calories: num(x.calories) ?? 0,
              proteins: num(x.proteins), carbs: num(x.carbs), fats: num(x.fats),
              i: x.indulgent === true || x.i === true,
              prepMin: num(x.prepMin),
              difficulty: typeof x.difficulty === "string" ? x.difficulty : undefined,
            });
          }
          if (items.length) norm[t] = items;
        }
        if (!Object.keys(norm).length) return;
        setAiPools(norm);
        try { localStorage.setItem(cacheKey, JSON.stringify(norm)); } catch { /* ignore */ }
      } catch { /* secours = catalogue figé */ }
      finally { if (!cancelled) setMenuLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [user, mealsCount, goalCals, dietKey]); // eslint-disable-line

  /* « Adapté à ta journée » : calories déjà consommées aujourd'hui */
  const [consumedToday, setConsumedToday] = useState(0);
  useEffect(() => {
    if (!user) return;
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    createClient()
      .from("nutrition_logs")
      .select("calories")
      .eq("user_id", user.id)
      .eq("date", todayStr)
      .then(({ data }) => {
        setConsumedToday(((data ?? []) as { calories: number }[]).reduce((s, r) => s + (r.calories || 0), 0));
      });
  }, [user]);
  const remainingToday = Math.max(goalCals - consumedToday, 0);

  /* Banque active : l'IA si dispo (par type, avec assez de plats), sinon le secours. */
  const activePools: Pools = useMemo(() => {
    if (!aiPools) return dietPools;
    const merged: Pools = {};
    for (const t of mealTypesForCount(mealsCount)) {
      const ai = aiPools[t];
      merged[t] = Array.isArray(ai) && ai.length >= 2 ? ai : (dietPools[t] ?? []);
    }
    return merged;
  }, [aiPools, dietPools, mealsCount]);

  /* Plan construit instantanément (mémo simple) */
  const plan: MealPlan | null = user ? buildLocalPlan(user.id, mealsCount, variant, activePools, dietKey) : null;

  const regenerate = useCallback(() => {
    // Régénérer = réservé au Premium (le gratuit garde la sélection du jour)
    if (!isPremium) { router.push("/premium"); return; }
    setVariant((v) => {
      const nv = v + 1;
      if (user) { try { localStorage.setItem(`vaiiya_repas_variant_${user.id}`, String(nv)); } catch { /* ignore */ } }
      return nv;
    });
  }, [user, isPremium, router]);

  useEffect(() => {
    nameRefs.current[selectedDay]?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [selectedDay]);

  const currentDay = plan?.semaine?.[selectedDay];

  /* ── « Manger ça » : logge le plat suggéré dans le journal du jour ── */
  const [addedKeys, setAddedKeys] = useState<Set<string>>(new Set());
  const eatMeal = useCallback(async (m: MealItem) => {
    if (!user) return;
    const key = `${selectedDay}-${m.type}-${m.nom}`;
    const cal = m.calories || 0;
    // Le journal ne regroupe que 4 types → on rabat « collation » sur « goûter »
    const mealType = m.type === "collation" ? "gouter" : m.type;
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const { error } = await createClient().from("nutrition_logs").insert({
      user_id: user.id,
      date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
      meal_type: mealType,
      food_name: m.nom,
      calories: cal,
      // Vraies macros si le plat IA les fournit, sinon estimées (20% P / 50% G / 30% L).
      proteins: m.proteins ?? Math.round((cal * 0.20) / 4),
      carbs: m.carbs ?? Math.round((cal * 0.50) / 4),
      fats: m.fats ?? Math.round((cal * 0.30) / 9),
      has_photo: false,
      time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
    });
    if (!error) {
      setAddedKeys((prev) => new Set(prev).add(key));
      setTimeout(() => setAddedKeys((prev) => { const n = new Set(prev); n.delete(key); return n; }), 2200);
    }
  }, [user, selectedDay]);

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
      {/* Filtre régime / allergies */}
      <div className="flex gap-1.5 overflow-x-auto pb-0.5" style={{ scrollbarWidth: "none" }}>
        {DIET_OPTIONS.map(({ key, label, emoji }) => {
          const on = diet.has(key);
          return (
            <button key={key} onClick={() => toggleDiet(key)}
              className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full cursor-pointer select-none"
              style={{
                background: on ? "linear-gradient(135deg,#D4C0FF,#F5E6A3)" : "rgba(240,235,255,0.5)",
                border: on ? "1px solid rgba(167,139,250,0.4)" : "1px solid rgba(212,192,255,0.35)",
                color: on ? "#2D3748" : "#A0AEC0",
                fontSize: 10, fontWeight: 600, transition: "all 0.15s",
              }}>
              <span style={{ fontSize: 11 }}>{emoji}</span>
              {label}
            </button>
          );
        })}
      </div>

      {/* Adapté à ta journée — calories restantes aujourd'hui */}
      {goalCals > 0 && (
        <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-2xl"
          style={{ background: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.18)" }}>
          <span className="text-[11px] font-medium" style={{ color: "#718096" }}>Aujourd&apos;hui</span>
          <span className="text-[11px] font-semibold" style={{ color: remainingToday > 0 ? "#A78BFA" : "#D4A843" }}>
            {remainingToday > 0 ? `≈ ${remainingToday.toLocaleString("fr-FR")} kcal restantes` : "Objectif atteint 🎉"}
            <span className="font-normal" style={{ color: "#A0AEC0" }}> / {goalCals.toLocaleString("fr-FR")}</span>
          </span>
        </div>
      )}

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

        <div className="flex items-center justify-between">
          {menuLoading ? (
            <span className="flex items-center gap-1 text-[9px] font-medium" style={{ color: "#A78BFA" }}>
              <RefreshCw size={9} strokeWidth={2.5} className="animate-spin" /> L&apos;IA prépare tes plats…
            </span>
          ) : <span />}
          <button onClick={regenerate}
            className="flex items-center gap-1 cursor-pointer" style={{ color: isPremium ? "#A0AEC0" : "#B7A3E0", background: "none", border: "none", padding: 0 }}>
            {isPremium ? <RefreshCw size={10} strokeWidth={2.5} /> : <Lock size={10} strokeWidth={2.5} />}
            <span className="text-[9px] font-medium">{isPremium ? "Changer les repas" : "Changer les repas · Premium"}</span>
          </button>
        </div>
      </div>

      {/* Repas du jour */}
      <div className="min-h-[100px]">
        <AnimatePresence mode="wait">
          {currentDay && <DayMeals key={`${selectedDay}-${variant}`} day={currentDay} dayIndex={selectedDay} canEat={!!user} addedKeys={addedKeys} onEat={eatMeal} />}
        </AnimatePresence>
      </div>
    </div>
  );
}
