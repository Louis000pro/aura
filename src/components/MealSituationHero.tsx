"use client";

/* ════════════════════════════════════════════════════════════════════
   MealSituationHero — le nouveau #1 de la page nutrition.

   Question « On mange où ? » → triple choix contextuel. Navigation PAR CARTES,
   SUR PLACE (chaque niveau = 3 grandes cartes-images). « Une idée » pioche dans
   la BANQUE DE RECETTES curée (src/lib/recipeBank.ts → RecipeSheet). « À finir »
   GÉNÈRE une recette à partir de tes restes via /api/nutrition/recipe (fiche
   sans image = GeneratedRecipeSheet). Voir [[nutrition-onmangeou-redesign]].

   ⚠️ C'EST LE GUIDE QUI POSE LA QUESTION (2026-08-29). La nutrition était
   le seul pilier où Nora et Sasha n'existaient nulle part, alors que son
   point d'entrée est la question la plus humaine du produit. Son visage
   `listen` (celui qui attend une réponse) remplace la puce violette qui
   précédait « Dis-moi où », et cette phrase vit maintenant dans
   `guides.ts`. Les trois cartes ne bougent pas d'un pixel, et le titre
   « On mange où ? » non plus : c'est un mot de l'app.

   ⚠️ IL NE PARLE QU'À LA RACINE. Une fois entré dans « Maison » ou
   « Resto », on navigue dans des listes : ce n'est plus un seuil, et le
   Guide s'y tairait pour rien.
   ════════════════════════════════════════════════════════════════════ */

import { useState, useRef, useEffect } from "react";
import { aiFetch } from "@/lib/aiFetch";
import { motion, AnimatePresence } from "framer-motion";
import { VisageGuide } from "@/components/AssistantMark";
import { useGuideActif } from "@/context/GuideContext";
import { voix } from "@/lib/guides";
import {
  Home, UtensilsCrossed, Sandwich, Sparkles, Heart, Camera, Barcode,
  Plus, BookOpen, ShoppingBag, ChevronLeft, ChevronRight, Carrot,
  Store, Check, X, Loader2, Flame, ArrowRight, ArrowLeft, ChefHat, Pencil, Search,
  CupSoda, IceCreamCone, Droplet, Coffee, Soup, Salad, GlassWater, Croissant,
} from "lucide-react";
import { loadTasteProfileLocal } from "@/lib/tasteProfile";
import { pickRecipes, rankRecipes, fitReason, type Recipe, type MealType, type DayNeeds } from "@/lib/recipeBank";
import RecipeSheet from "@/components/RecipeSheet";
import GeneratedRecipeSheet, { type GeneratedRecipe } from "@/components/GeneratedRecipeSheet";
import OrderRecapSheet from "@/components/OrderRecapSheet";
import {
  estimateOrder, guessPlace, ambianceImg, CATEGORY_ORDER, CATEGORY_LABEL, EXTRAS_BY_CATEGORY,
  type OrderCategory, type OrderEstimate,
} from "@/lib/orderEstimate";
import { rankGenres, GENRE_PROFILE, type AdvisorNeeds, type RankedGenre } from "@/lib/orderAdvisor";

type Classic = { name: string; calories: number; proteins: number; carbs: number; fats: number; count?: number };
type LoggedMeal = { name: string; calories: number; proteins: number; carbs: number; fats: number };
type DayTotals = { calories: number; proteins: number; carbs: number; fats: number };

type Props = {
  name?: string | null;
  userId?: string | null;
  goals?: DayTotals;      // objectifs du jour
  consumed?: DayTotals;   // déjà mangé aujourd'hui
  eatenToday?: string[];  // noms des plats déjà loggés (anti-répétition)
  onPhoto: () => void;
  onBarcode: () => void;
  onManual: () => void;
  onMenuScan: () => void;   // « La carte » du resto → photo + classement IA
  onSkip: () => void;
  classics: Classic[];
  onQuickAdd: (r: Classic) => void;
  onLogIdea: (m: LoggedMeal) => void;
};

type SituationKey = "maison" | "resto" | "pouce";
type Screen = "menu" | "finish" | "classics" | "livraison" | "livraison-form" | "livraison-advisor";
type Icon = typeof Home;

const SITUATIONS: { key: SituationKey; label: string; sub: string; Icon: Icon; gradient: string; img: string }[] = [
  {
    key: "maison", label: "À la maison", sub: "je cuisine", Icon: Home,
    img: "/nutrition/maison.jpg",
    gradient: "radial-gradient(circle at 30% 22%,#FFDD93,transparent 46%),radial-gradient(circle at 76% 66%,#E8620C,transparent 52%),linear-gradient(158deg,#F5A83C,#A8430F)",
  },
  {
    key: "resto", label: "Resto & livraison", sub: "on me sert", Icon: UtensilsCrossed,
    img: "/nutrition/resto.jpg",
    gradient: "radial-gradient(circle at 26% 24%,#D6BBFF,transparent 46%),radial-gradient(circle at 80% 70%,#C13BC1,transparent 52%),linear-gradient(158deg,#7A4FD0,#432170)",
  },
  {
    // « Sur le pouce » ne disait rien à personne (test fait par Louis autour
    // de lui) : on nomme la chose, pas l'expression. La clé reste `pouce`,
    // elle sert aux chemins d'images (/nutrition/pouce-*.jpg).
    key: "pouce", label: "Sandwich & snack", sub: "acheté tout prêt", Icon: Sandwich,
    img: "/nutrition/pouce.jpg",
    gradient: "radial-gradient(circle at 30% 24%,#C4F7E4,transparent 46%),radial-gradient(circle at 78% 70%,#2BD4A0,transparent 52%),linear-gradient(158deg,#54DCB0,#0E8A67)",
  },
];

function greeting(): { hello: string; moment: string } {
  const h = new Date().getHours();
  const moment = h < 10 ? "ce matin" : h < 15 ? "ce midi" : h < 18 ? "cet aprèm" : "ce soir";
  const hello = h < 18 ? "Bonjour" : "Bonsoir";
  return { hello, moment };
}

const mealTypeNow = (): MealType => {
  const h = new Date().getHours();
  return h < 10 ? "petit-dejeuner" : h < 15 ? "dejeuner" : h < 18 ? "gouter" : "diner";
};

/* Part typique du repas dans la journée (pour cibler « Conseille-moi »). */
const MEAL_SHARE_ADVISOR: Record<MealType, number> = {
  "petit-dejeuner": 0.25, "dejeuner": 0.35, "gouter": 0.1, "diner": 0.32,
};

/* Grande carte-image réutilisée à chaque niveau (racine + sous-choix) */
function PhotoCard({ label, sub, Icon, gradient, img, onClick }: {
  label: string; sub: string; Icon: Icon; gradient: string; img: string; onClick: () => void;
}) {
  return (
    <motion.button whileTap={{ scale: 0.97 }} onClick={onClick}
      className="relative overflow-hidden rounded-3xl cursor-pointer text-left"
      style={{ minHeight: "56vh", background: gradient }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={img} alt="" aria-hidden loading="lazy" decoding="async"
        onError={(e) => { e.currentTarget.style.display = "none"; }}
        className="absolute inset-0 w-full h-full object-cover" />
      <Icon size={34} strokeWidth={1.5} className="absolute" style={{ top: 12, right: 12, color: "rgba(255,255,255,0.30)" }} />
      <div className="absolute inset-x-0 bottom-0" style={{ height: "46%", background: "linear-gradient(to top,rgba(14,7,18,0.9),rgba(14,7,18,0.35) 58%,transparent)" }} />
      <div className="absolute inset-x-0 bottom-0 p-3.5">
        <p className="text-[15px] font-medium leading-tight" style={{ color: "#fff" }}>{label}</p>
        <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.85)" }}>{sub}</p>
      </div>
    </motion.button>
  );
}

/* Barre d'étapes du flux guidé « Je me fais livrer » (Où · Quoi · Extras) */
function StepBar({ cur }: { cur: 1 | 2 | 3 }) {
  const seg = (n: 1 | 2 | 3, label: string) => (
    <span className="flex items-center gap-1 font-semibold" style={{ color: n <= cur ? "var(--accent)" : "var(--text-3)" }}>
      {n < cur ? <Check size={12} strokeWidth={3} /> : <span>{n}</span>} {label}
    </span>
  );
  const bar = (on: boolean) => (
    <span className="flex-1 rounded" style={{ height: 2, background: on ? "var(--accent)" : "rgba(var(--violet-mid-rgb),0.3)", opacity: on ? 0.55 : 1 }} />
  );
  return (
    <div className="flex items-center gap-2 text-xs">
      {seg(1, "Où")}{bar(cur > 1)}{seg(2, "Quoi")}{bar(cur > 2)}{seg(3, "Extras")}
    </div>
  );
}

/* Icônes des ajouts rapides (clé EXTRAS_BY_CATEGORY → composant lucide) */
const EXTRA_ICON: Record<string, Icon> = {
  soda: CupSoda, dessert: IceCreamCone, sauce: Droplet, cafe: Coffee,
  soup: Soup, entree: Salad, jus: GlassWater, viennoiserie: Croissant,
};

/* Portions imposées de « Estimer un reste » : image d'assiette (remplissage
   croissant) + phrase envoyée à l'IA pour corriger la quantité (un reste n'est
   presque jamais une pleine assiette). Voir public/nutrition/portions/. */
type PortionKey = "petite" | "moyenne" | "grande";
const PORTIONS: { key: PortionKey; label: string; sub: string; phrase: string }[] = [
  { key: "petite",  label: "Petite",  sub: "½ assiette",   phrase: "petite portion, environ une demi-assiette" },
  { key: "moyenne", label: "Moyenne", sub: "une assiette", phrase: "portion moyenne, une assiette normale" },
  { key: "grande",  label: "Grande",  sub: "bien remplie", phrase: "grande portion, une assiette bien remplie" },
];

type SubChoice = { key: string; label: string; sub: string; Icon: Icon; run: () => void };

export default function MealSituationHero({
  name, userId, goals, consumed, eatenToday, onPhoto, onBarcode, onManual, onMenuScan, onSkip,
  classics, onQuickAdd, onLogIdea,
}: Props) {
  const { guide } = useGuideActif();
  const [sit, setSit] = useState<SituationKey | null>(null);
  const [screen, setScreen] = useState<Screen>("menu");

  const [ingredients, setIngredients] = useState<string[]>([]);
  const [ingInput, setIngInput] = useState("");

  // Fiche recette (piochée dans la banque)
  const [recipeList, setRecipeList] = useState<Recipe[]>([]);
  const [recipeIndex, setRecipeIndex] = useState(0);
  const [recipeOpen, setRecipeOpen] = useState(false);
  const [recipeNeeds, setRecipeNeeds] = useState<DayNeeds | null>(null); // contexte du jour (« Une idée » seulement)
  const [thinking, setThinking] = useState(false); // latence délibérée avant de révéler la fiche

  // « À finir » → recette GÉNÉRÉE par l'IA à partir des restes (fiche sans image)
  const [genOpen, setGenOpen] = useState(false);
  const [genLoading, setGenLoading] = useState(false);
  const [genError, setGenError] = useState(false);
  const [genRecipe, setGenRecipe] = useState<GeneratedRecipe | null>(null);
  const thinkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (thinkTimer.current) clearTimeout(thinkTimer.current); }, []);

  // Flux « Je me fais livrer »
  const [enseigne, setEnseigne] = useState("");
  const [category, setCategory] = useState<OrderCategory>("burger");
  const [categoryTouched, setCategoryTouched] = useState(false);
  const [formStep, setFormStep] = useState<1 | 2 | 3>(1);
  const [articles, setArticles] = useState<string[]>([]);
  const [articleInput, setArticleInput] = useState("");
  const [estimating, setEstimating] = useState(false);
  const [estErr, setEstErr] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderEstimate | null>(null);

  // « Conseille-moi » : genres classés selon la journée (jitter figé au moment du calcul)
  const [advice, setAdvice] = useState<RankedGenre[]>([]);
  const [advisorNeeds, setAdvisorNeeds] = useState<AdvisorNeeds | null>(null);

  // Flux « Estimer un reste » (à la maison → à finir)
  const [finishMode, setFinishMode] = useState<"cuisiner" | "reste">("cuisiner");
  const [restDish, setRestDish] = useState("");
  const [portion, setPortion] = useState<PortionKey | null>(null);
  const [restBusy, setRestBusy] = useState(false);
  const [restErr, setRestErr] = useState<string | null>(null);
  const [restResult, setRestResult] = useState<LoggedMeal | null>(null);
  const [restEdit, setRestEdit] = useState(false);

  const { hello, moment } = greeting();

  const resetLiv = () => {
    setEnseigne(""); setArticles([]); setArticleInput("");
    setCategory("burger"); setCategoryTouched(false);
    setFormStep(1); setOrder(null); setEstErr(null);
  };
  const resetRest = () => {
    setFinishMode("cuisiner"); setRestDish(""); setPortion(null);
    setRestBusy(false); setRestErr(null); setRestResult(null); setRestEdit(false);
  };
  const resetGen = () => { setGenOpen(false); setGenLoading(false); setGenError(false); setGenRecipe(null); };
  const reset = () => {
    setSit(null); setScreen("menu");
    setIngredients([]); setIngInput("");
    resetLiv(); resetRest(); resetGen();
  };
  const goBack = () => {
    if (!sit) return reset();
    if (screen === "livraison-form") {
      if (formStep > 1) return setFormStep((s) => (s - 1) as 1 | 2 | 3);
      return setScreen("livraison");
    }
    if (screen === "livraison-advisor") return setScreen("livraison");
    if (screen === "finish" || screen === "classics" || screen === "livraison") return setScreen("menu");
    return reset();
  };

  const readDiet = (): string[] => {
    try {
      if (userId) { const raw = localStorage.getItem(`vaiiya_diet_${userId}`); if (raw) return JSON.parse(raw); }
    } catch { /* ignore */ }
    return [];
  };

  // Latence délibérée : un court temps de « réflexion » (squelette de la fiche),
  // plus long à la première idée qu'aux suivantes (« Autre »). Coupé si
  // l'utilisateur préfère moins d'animations (prefers-reduced-motion).
  const thinkFor = (first: boolean) => {
    if (thinkTimer.current) clearTimeout(thinkTimer.current);
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { setThinking(false); return; }
    setThinking(true);
    const ms = first ? 900 + Math.random() * 900 : 500 + Math.random() * 600;
    thinkTimer.current = setTimeout(() => setThinking(false), ms);
  };

  // Besoins de la journée pour classer « Une idée » (Levier A).
  const buildDayNeeds = (): DayNeeds => {
    const g = goals ?? { calories: 2000, proteins: 0, carbs: 0, fats: 0 };
    const c = consumed ?? { calories: 0, proteins: 0, carbs: 0, fats: 0 };
    const t = userId ? loadTasteProfileLocal(userId) : null;
    return {
      mealType: mealTypeNow(),
      goalCalories: g.calories,
      remaining: Math.max(g.calories - c.calories, 0),
      proteinRemaining: Math.max(g.proteins - c.proteins, 0),
      likedBases: t?.bases ?? [],
      avoidNames: eatenToday ?? [],
    };
  };

  const openRecipes = (quick: boolean, list?: Recipe[]) => {
    // « Une idée » (list absente) = on classe selon la journée ; « À finir » garde
    // son propre classement par ingrédients.
    const needs = list ? null : buildDayNeeds();
    let pool = list ?? pickRecipes({ mealType: mealTypeNow(), diet: readDiet(), quick });
    if (needs) pool = rankRecipes(pool, needs);
    setRecipeNeeds(needs);
    setRecipeList(pool);
    setRecipeIndex(0);
    setRecipeOpen(true);
    if (pool.length > 0) thinkFor(true); else setThinking(false);
  };
  const nextRecipe = () => { setRecipeIndex((i) => (i + 1) % recipeList.length); thinkFor(false); };
  const closeRecipe = () => {
    if (thinkTimer.current) clearTimeout(thinkTimer.current);
    setThinking(false);
    setRecipeOpen(false);
    reset();
  };

  const addIngredients = (raw: string) => {
    const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
    if (!parts.length) return;
    setIngredients((prev) => {
      const seen = new Set(prev.map((p) => p.toLowerCase()));
      const next = [...prev];
      for (const p of parts) { if (!seen.has(p.toLowerCase())) { next.push(p); seen.add(p.toLowerCase()); } }
      return next.slice(0, 15);
    });
    setIngInput("");
  };

  // « À finir » : l'IA écrit une recette RÉELLE à partir des restes (pas la banque).
  // Cible kcal = part typique du repas dans la journée ; 1 portion (un plat pour soi).
  const generateFinish = async () => {
    if (!ingredients.length || genLoading) return;
    setGenOpen(true); setGenLoading(true); setGenError(false); setGenRecipe(null);
    try {
      const taste = userId ? loadTasteProfileLocal(userId) : null;
      const calorieTarget = goals?.calories
        ? Math.round(goals.calories * MEAL_SHARE_ADVISOR[mealTypeNow()])
        : null;
      const res = await aiFetch("/api/nutrition/recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ingredients, diet: readDiet(), taste,
          mealType: mealTypeNow(), portions: 1, calorieTarget,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.recipe) throw new Error(json?.error || "Erreur");
      setGenRecipe(json.recipe as GeneratedRecipe);
    } catch {
      setGenError(true);
    } finally {
      setGenLoading(false);
    }
  };

  /* ── « Je me fais livrer » ── */
  const setEnseigneSmart = (name: string) => {
    setEnseigne(name);
    if (!categoryTouched) { const g = guessPlace(name); setCategory(g.category); }
  };
  const pickCategory = (c: OrderCategory) => { setCategory(c); setCategoryTouched(true); };
  const addArticle = (raw: string) => {
    const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
    if (!parts.length) return;
    setArticles((prev) => [...prev, ...parts].slice(0, 20));
    setArticleInput("");
  };
  const removeArticle = (i: number) => setArticles((prev) => prev.filter((_, idx) => idx !== i));
  const toggleExtra = (label: string) =>
    setArticles((prev) => (prev.includes(label) ? prev.filter((a) => a !== label) : [...prev, label]));
  const canEstimate = articles.length > 0;
  const runEstimate = async () => {
    if (!canEstimate || estimating) return;
    setEstimating(true); setEstErr(null);
    try {
      const est = await estimateOrder({ enseigne: enseigne.trim(), category, lockCategory: categoryTouched, articles, origin: "livraison" });
      setOrder(est);
    } catch { setEstErr("Estimation impossible, réessaie."); }
    finally { setEstimating(false); }
  };

  /* ── « Conseille-moi » (livraison) ── */
  const buildAdvisorNeeds = (): AdvisorNeeds => {
    const g = goals ?? { calories: 0, proteins: 0, carbs: 0, fats: 0 };
    const c = consumed ?? { calories: 0, proteins: 0, carbs: 0, fats: 0 };
    const t = userId ? loadTasteProfileLocal(userId) : null;
    return {
      goalCalories: goals ? g.calories : 0,   // 0 = objectif inconnu → pas de « X kcal restantes »
      remaining: Math.max(g.calories - c.calories, 0),
      proteinRemaining: Math.max(g.proteins - c.proteins, 0),
      mealShare: MEAL_SHARE_ADVISOR[mealTypeNow()],
      likedPlaces: t?.places ?? [],
    };
  };
  const openAdvisor = () => {
    const needs = buildAdvisorNeeds();
    setAdvisorNeeds(needs);
    setAdvice(rankGenres(needs));
    setScreen("livraison-advisor");
  };
  // Taper un genre conseillé → parcours d'estimation pré-rempli (genre + plat type),
  // on saute à « Quoi ». Les macros réelles restent calculées par l'estimateur.
  const startFromGenre = (c: OrderCategory) => {
    setCategory(c); setCategoryTouched(true);
    setEnseigne(""); setArticles([GENRE_PROFILE[c].article]); setArticleInput("");
    setEstErr(null); setFormStep(2); setScreen("livraison-form");
  };

  /* ── « Estimer un reste » ── */
  const canEstimateRest = restDish.trim().length > 0 && portion !== null;
  const estimateRest = async () => {
    const dish = restDish.trim();
    if (!dish || !portion || restBusy) return;
    setRestBusy(true); setRestErr(null);
    try {
      const p = PORTIONS.find((x) => x.key === portion)!;
      const res = await aiFetch("/api/nutrition/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: `${dish}, ${p.phrase}` }),
      });
      if (!res.ok) throw new Error();
      const d = await res.json();
      const n = (v: unknown) => Math.max(0, Math.round(Number(v)) || 0);
      setRestResult({
        name: typeof d.foodName === "string" && d.foodName.trim() ? d.foodName.trim() : dish,
        calories: n(d.calories), proteins: n(d.proteins), carbs: n(d.carbs), fats: n(d.fats),
      });
    } catch { setRestErr("Estimation impossible, réessaie."); }
    finally { setRestBusy(false); }
  };

  /* Exactement 3 sous-choix par situation (même structure que la racine) */
  const subChoices = (key: SituationKey): SubChoice[] => {
    if (key === "maison") return [
      { key: "idee",       label: "Une idée",       sub: "qui me tente",    Icon: Sparkles, run: () => openRecipes(false) },
      { key: "finir",      label: "À finir",        sub: "avec tes restes", Icon: Carrot,   run: () => setScreen("finish") },
      { key: "classiques", label: "Mes classiques", sub: "mes habitudes",   Icon: Heart,    run: () => setScreen("classics") },
    ];
    if (key === "resto") return [
      { key: "assiette",  label: "Mon assiette",      sub: "je la scanne",       Icon: Camera,      run: onPhoto },
      { key: "carte",     label: "La carte",          sub: "je la photographie", Icon: BookOpen,    run: onMenuScan },
      { key: "livraison", label: "Je me fais livrer", sub: "à la maison",        Icon: ShoppingBag, run: () => setScreen("livraison") },
    ];
    return [
      { key: "code",       label: "Code-barres",    sub: "produit emballé", Icon: Barcode, run: onBarcode },
      { key: "photo",      label: "Une photo",      sub: "l’IA estime",     Icon: Camera,  run: onPhoto },
      { key: "classiques", label: "Mes classiques", sub: "mes habitudes",   Icon: Heart,   run: () => setScreen("classics") },
    ];
  };

  const sitObj = SITUATIONS.find((s) => s.key === sit) ?? null;
  const baseSuggestions = (() => {
    const t = userId ? loadTasteProfileLocal(userId) : null;
    const fromTaste = (t?.bases ?? []).slice(0, 8);
    return fromTaste.length ? fromTaste : ["Œufs", "Poulet", "Riz", "Pâtes", "Tomates", "Courgettes", "Fromage", "Épinards"];
  })();

  const heading =
    screen === "finish" ? "J’ai des trucs à finir"
    : screen === "classics" ? "Mes classiques"
    : screen === "livraison" ? "Je me fais livrer"
    : screen === "livraison-form" ? "Je sais ce que je prends"
    : screen === "livraison-advisor" ? "Conseille-moi"
    : sitObj?.label ?? "";

  const currentRecipe = recipeList[recipeIndex];
  const currentFit = recipeNeeds && currentRecipe ? fitReason(currentRecipe, recipeNeeds) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
      className="rounded-3xl p-5 max-w-5xl"
      style={{
        background: "rgb(var(--surface-rgb))",
        border: "1px solid rgba(var(--accent-rgb),0.12)",
        boxShadow: "0 6px 26px rgba(var(--accent-rgb),0.16)",
      }}
    >
      {/* En-tête : racine = question ; sous-niveau = retour + titre */}
      {sit === null ? (
        <>
          <p className="text-[11px] font-semiboldst" style={{ color: "var(--text-3)" }}>
            {hello}{name ? ` ${name}` : ""} · {moment}
          </p>
          {/* Le visage prend la place de la puce violette : la question
              change de bouche, pas de mise en page. Sans Guide résolu,
              `VisageGuide` retombe sur l'étincelle ✦ et la phrase reste
              exactement celle d'avant. */}
          <div className="flex items-center gap-2.5 mt-1">
            <VisageGuide guide={guide} etat="listen" size={36} />
            <div className="min-w-0">
              <h2 className="text-2xl font-light leading-none" style={{ color: "var(--text-1)" }}>On mange où&nbsp;?</h2>
              <p className="text-[11.5px] mt-1.5" style={{ color: "var(--text-3)" }}>
                {voix(guide, "nutrition.question")}
              </p>
            </div>
          </div>
        </>
      ) : (
        <div className="flex items-center gap-2.5">
          <motion.button whileTap={{ scale: 0.9 }} onClick={goBack}
            className="w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer flex-shrink-0"
            style={{ background: "rgba(var(--tint-violet-rgb),0.8)" }}>
            <ChevronLeft size={16} strokeWidth={2} style={{ color: "var(--text-2)" }} />
          </motion.button>
          <div>
            <p className="text-[11px] font-semiboldst" style={{ color: "var(--text-3)" }}>{sitObj?.sub}</p>
            <h2 className="text-xl font-light" style={{ color: "var(--text-1)" }}>{heading}</h2>
          </div>
        </div>
      )}

      {/* Contenu — change SUR PLACE */}
      <AnimatePresence mode="wait">
        {/* Racine : les 3 grandes portes */}
        {sit === null && (
          <motion.div key="root"
            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
            className="grid grid-cols-3 gap-2.5 mt-4">
            {SITUATIONS.map((s) => (
              <PhotoCard key={s.key} label={s.label} sub={s.sub} Icon={s.Icon} gradient={s.gradient} img={s.img}
                onClick={() => { setSit(s.key); setScreen("menu"); }} />
            ))}
          </motion.div>
        )}

        {/* Sous-choix : encore 3 grandes cartes */}
        {sit !== null && screen === "menu" && (
          <motion.div key={`menu-${sit}`}
            initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }}
            className="grid grid-cols-3 gap-2.5 mt-4">
            {subChoices(sit).map((c) => (
              <PhotoCard key={c.key} label={c.label} sub={c.sub} Icon={c.Icon}
                gradient={sitObj?.gradient ?? ""} img={`/nutrition/${sit}-${c.key}.jpg`}
                onClick={c.run} />
            ))}
          </motion.div>
        )}

        {/* Mes classiques — tes plats connus, ajout en 1 tap (pastilles, épuré) */}
        {sit !== null && screen === "classics" && (
          <motion.div key="classics"
            initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }}
            className="mt-4">
            {classics.length === 0 ? (
              <div className="flex flex-col items-center text-center gap-2.5 py-9">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{ background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.28)" }}>
                  <Heart size={20} strokeWidth={1.8} style={{ color: "var(--exp-encre)" }} />
                </div>
                <p className="text-xs font-light leading-relaxed max-w-[15rem]" style={{ color: "var(--text-3)" }}>
                  Tes plats habituels apparaîtront ici dès que tu en auras enregistré quelques-uns.
                </p>
              </div>
            ) : (<>
              <p className="text-[11.5px] font-light mb-2 ml-0.5" style={{ color: "var(--text-3)" }}>
                Un tap pour le rajouter à ta journée.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {classics.map((r, i) => {
                  // Liseré = macro dominante EN ÉNERGIE (P·4 / G·4 / L·9), triptyque Système D.
                  // Sans macros connues → neutre. Colore sans juger (pas de rouge « mauvais »).
                  const p = (r.proteins || 0) * 4, c = (r.carbs || 0) * 4, f = (r.fats || 0) * 9;
                  const mx = Math.max(p, c, f);
                  const accent = mx <= 0 ? "rgba(var(--violet-mid-rgb),0.55)"
                    : mx === p ? "#8B5CF6" : mx === c ? "#EF9F27" : "#2BD4A0";
                  return (
                    <motion.button key={i} whileTap={{ scale: 0.97 }} onClick={() => { onQuickAdd(r); reset(); }}
                      className="relative overflow-hidden text-left rounded-2xl p-3 pl-3.5 pr-8 cursor-pointer"
                      style={{ background: "rgba(var(--tint-violet-rgb),0.5)", border: "1px solid rgba(var(--violet-mid-rgb),0.35)" }}>
                      <span aria-hidden className="absolute left-0 top-0 bottom-0" style={{ width: 4, background: accent }} />
                      <p className="text-[13.5px] font-semibold leading-tight"
                        style={{ color: "var(--text-1)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", minHeight: "2.4em" }}>
                        {r.name}
                      </p>
                      <p className="text-[11.5px] font-semibold mt-1.5" style={{ color: "#E8620C", fontVariantNumeric: "tabular-nums" }}>
                        {r.calories} kcal
                      </p>
                      <span className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ background: "rgba(139,92,246,0.14)", border: "1px solid rgba(139,92,246,0.3)" }}>
                        <Plus size={12} strokeWidth={2.5} style={{ color: "var(--exp-encre)" }} />
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </>)}
          </motion.div>
        )}

        {/* À finir : cuisiner un plat (restes → recette) OU estimer un reste (plat déjà prêt) */}
        {sit !== null && screen === "finish" && (
          <motion.div key="finish"
            initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }}
            className="flex flex-col gap-3 mt-4">

            {/* Bascule : cuisiner un plat / estimer un reste */}
            <div className="flex gap-1 p-1 rounded-2xl"
              style={{ background: "rgba(var(--tint-violet-rgb),0.5)", border: "1px solid rgba(var(--violet-mid-rgb),0.35)" }}>
              {([
                { key: "cuisiner" as const, label: "Cuisiner un plat", Icon: ChefHat },
                { key: "reste" as const, label: "Estimer un reste", Icon: Soup },
              ]).map((t) => {
                const on = finishMode === t.key;
                return (
                  <button key={t.key} onClick={() => setFinishMode(t.key)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[12.5px] font-semibold cursor-pointer"
                    style={{ background: on ? "linear-gradient(135deg,#8B5CF6,#C13BC1)" : "transparent", color: on ? "#fff" : "var(--text-3)" }}>
                    <t.Icon size={15} strokeWidth={2} /> {t.label}
                  </button>
                );
              })}
            </div>

            {finishMode === "cuisiner" ? (<>
              <p className="text-xs font-light leading-relaxed" style={{ color: "var(--text-2)" }}>
                Dis-moi ce que tu as sous la main, je te trouve un plat, rien à acheter.
              </p>
              <div className="flex gap-2">
                <input value={ingInput} onChange={(e) => setIngInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") addIngredients(ingInput); }}
                  placeholder="Ex : courgettes, feta, œufs…"
                  className="flex-1 px-3.5 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: "rgba(var(--tint-violet-rgb),0.5)", border: "1px solid rgba(var(--violet-mid-rgb),0.5)", color: "var(--text-1)" }} />
                <motion.button whileTap={{ scale: 0.94 }} onClick={() => addIngredients(ingInput)} disabled={!ingInput.trim()}
                  className="px-3.5 rounded-xl text-sm font-semibold cursor-pointer flex-shrink-0"
                  style={{ background: ingInput.trim() ? "rgba(var(--accent-rgb),0.16)" : "rgba(var(--tint-violet-rgb),0.4)", color: "var(--exp-encre)" }}>
                  Ajouter
                </motion.button>
              </div>
              {ingredients.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {ingredients.map((ing) => (
                    <button key={ing} onClick={() => setIngredients((prev) => prev.filter((x) => x !== ing))}
                      className="flex items-center gap-1 pl-2.5 pr-2 py-1 rounded-full text-xs cursor-pointer"
                      style={{ background: "rgba(139,92,246,0.14)", color: "var(--text-1)", border: "1px solid rgba(139,92,246,0.3)" }}>
                      {ing}<span style={{ fontSize: 13, lineHeight: 1 }}>×</span>
                    </button>
                  ))}
                </div>
              )}
              {baseSuggestions.filter((s) => !ingredients.some((i) => i.toLowerCase() === s.toLowerCase())).length > 0 && (
                <div>
                  <p className="text-[11px] font-semiboldst mb-1.5" style={{ color: "var(--text-3)" }}>Suggestions</p>
                  <div className="flex flex-wrap gap-1.5">
                    {baseSuggestions.filter((s) => !ingredients.some((i) => i.toLowerCase() === s.toLowerCase())).map((s) => (
                      <button key={s} onClick={() => addIngredients(s)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs cursor-pointer"
                        style={{ background: "rgba(var(--tint-violet-rgb),0.5)", color: "var(--text-2)", border: "1px solid rgba(var(--violet-mid-rgb),0.35)" }}>
                        <Plus size={11} strokeWidth={2.5} style={{ color: "var(--exp-encre)" }} /> {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <motion.button whileTap={{ scale: 0.98 }} onClick={generateFinish} disabled={!ingredients.length}
                className="w-full py-3 rounded-2xl text-sm font-semibold cursor-pointer flex items-center justify-center gap-2 mt-1"
                style={{
                  background: ingredients.length ? "linear-gradient(135deg,#8B5CF6,#C13BC1)" : "rgba(var(--tint-violet-rgb),0.5)",
                  color: ingredients.length ? "#fff" : "var(--text-3)",
                  boxShadow: ingredients.length ? "0 4px 16px rgba(147,60,200,0.4)" : "none",
                }}>
                <Carrot size={16} strokeWidth={2} /> Trouve-moi un plat
              </motion.button>
            </>) : restResult ? (<>
              {/* Carte résultat du reste (kcal + macros ajustables) */}
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium self-start"
                style={{ background: "rgba(139,92,246,0.16)", border: "1px solid rgba(139,92,246,0.4)", color: "var(--text-1)" }}>
                <Home size={13} strokeWidth={2} style={{ color: "var(--exp-encre)" }} />
                Reste maison · portion {PORTIONS.find((p) => p.key === portion)?.label.toLowerCase()}
              </span>
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-lg font-medium leading-tight flex-1" style={{ color: "var(--text-1)" }}>{restResult.name}</h3>
                <div className="text-right flex-shrink-0">
                  {restEdit ? (
                    <input type="number" inputMode="numeric" value={restResult.calories}
                      onChange={(e) => setRestResult((r) => r ? { ...r, calories: Math.max(0, parseInt(e.target.value) || 0) } : r)}
                      className="w-20 text-right text-2xl font-light outline-none rounded-lg px-1"
                      style={{ background: "rgba(var(--tint-violet-rgb),0.5)", color: "var(--text-1)" }} />
                  ) : (
                    <p className="text-[28px] font-light leading-none" style={{ color: "#E8620C" }}>{restResult.calories}</p>
                  )}
                  <p className="text-[10px] mt-0.5" style={{ color: "var(--text-3)" }}>kcal</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Protéines", key: "proteins" as const, v: restResult.proteins, c: "#8B5CF6" },
                  { label: "Glucides", key: "carbs" as const, v: restResult.carbs, c: "#EF9F27" },
                  { label: "Lipides", key: "fats" as const, v: restResult.fats, c: "#2BD4A0" },
                ].map((m) => (
                  <div key={m.key} className="relative overflow-hidden rounded-2xl text-center pt-3 pb-2"
                    style={{ background: "rgba(var(--tint-violet-rgb),0.5)", border: "1px solid rgba(var(--violet-mid-rgb),0.3)" }}>
                    <span aria-hidden className="absolute top-0 left-0 right-0" style={{ height: 3, background: m.c }} />
                    {restEdit ? (
                      <input type="number" inputMode="numeric" value={m.v}
                        onChange={(e) => setRestResult((r) => r ? { ...r, [m.key]: Math.max(0, parseInt(e.target.value) || 0) } : r)}
                        className="w-12 mx-auto block text-center text-[15px] font-extrabold outline-none rounded"
                        style={{ background: "rgb(var(--surface-rgb))", color: m.c, fontVariantNumeric: "tabular-nums" }} />
                    ) : (
                      <p className="font-extrabold" style={{ color: m.c, fontSize: 15, fontVariantNumeric: "tabular-nums" }}>{m.v}g</p>
                    )}
                    <p style={{ color: "var(--text-3)", fontSize: 9.5, marginTop: 3 }}>{m.label}</p>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between mt-0.5">
                <button onClick={() => { setRestResult(null); setRestEdit(false); setRestErr(null); }}
                  className="flex items-center gap-1 text-[11px] font-medium cursor-pointer" style={{ color: "var(--text-3)" }}>
                  <ArrowLeft size={12} strokeWidth={2} /> Corriger
                </button>
                <button onClick={() => setRestEdit((e) => !e)}
                  className="flex items-center gap-1 text-[11px] font-medium cursor-pointer" style={{ color: "var(--exp-encre)" }}>
                  <Pencil size={11} strokeWidth={2} /> {restEdit ? "Terminé" : "Ajuster"}
                </button>
              </div>
              <motion.button whileTap={{ scale: 0.98 }} onClick={() => { if (restResult) { onLogIdea(restResult); reset(); } }}
                className="w-full py-3 rounded-2xl text-sm font-semibold cursor-pointer flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", color: "#fff", boxShadow: "0 4px 16px rgba(147,60,200,0.4)" }}>
                <Check size={17} strokeWidth={2.5} /> Ajouter à ma journée
              </motion.button>
            </>) : (<>
              {/* Saisie : nom du plat + portion imposée */}
              <p className="text-xs font-light leading-relaxed" style={{ color: "var(--text-2)" }}>
                Un reste au frigo&nbsp;? Dis-moi lequel, je l&apos;estime, même sans le peser.
              </p>
              <div>
                <p className="text-[11px] font-semiboldst mb-1.5" style={{ color: "var(--text-3)" }}>C&apos;était quoi&nbsp;?</p>
                <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl"
                  style={{ background: "rgba(var(--tint-violet-rgb),0.5)", border: "1px solid rgba(var(--violet-mid-rgb),0.5)" }}>
                  <Search size={15} strokeWidth={1.8} style={{ color: "var(--text-3)" }} />
                  <input value={restDish} onChange={(e) => setRestDish(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && canEstimateRest) estimateRest(); }}
                    placeholder="Gratin de courgettes, pâtes bolo…"
                    className="flex-1 bg-transparent text-sm outline-none" style={{ color: "var(--text-1)" }} />
                </div>
              </div>
              <div>
                <p className="text-[11px] font-semiboldst mb-1.5" style={{ color: "var(--text-3)" }}>Il en restait combien&nbsp;?</p>
                <div className="grid grid-cols-3 gap-2">
                  {PORTIONS.map((p) => {
                    const on = portion === p.key;
                    return (
                      <motion.button key={p.key} whileTap={{ scale: 0.95 }} onClick={() => setPortion(p.key)}
                        className="relative flex flex-col items-center rounded-2xl px-1 pt-3 pb-2.5 cursor-pointer"
                        style={{ background: on ? "rgba(139,92,246,0.14)" : "rgba(var(--tint-violet-rgb),0.5)", border: `${on ? "2px" : "1px"} solid ${on ? "var(--accent)" : "rgba(var(--violet-mid-rgb),0.35)"}` }}>
                        {on && (
                          <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: "var(--accent)" }}>
                            <Check size={10} strokeWidth={3} style={{ color: "#fff" }} />
                          </span>
                        )}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={`/nutrition/portions/${p.key}.png`} alt="" aria-hidden loading="lazy" decoding="async"
                          className="w-11 h-11 object-contain" style={{ opacity: on ? 1 : 0.9 }} />
                        <span className="text-[12.5px] font-medium mt-1" style={{ color: "var(--text-1)" }}>{p.label}</span>
                        <span className="text-[10px]" style={{ color: "var(--text-3)" }}>{p.sub}</span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
              {restErr && <p className="text-xs" style={{ color: "#E53E3E" }}>⚠️ {restErr}</p>}
              <motion.button whileTap={{ scale: 0.98 }} onClick={estimateRest} disabled={!canEstimateRest || restBusy}
                className="w-full py-3 rounded-2xl text-sm font-semibold cursor-pointer flex items-center justify-center gap-2 mt-1"
                style={{
                  background: canEstimateRest ? "linear-gradient(135deg,#8B5CF6,#C13BC1)" : "rgba(var(--tint-violet-rgb),0.5)",
                  color: canEstimateRest ? "#fff" : "var(--text-3)",
                  boxShadow: canEstimateRest ? "0 4px 16px rgba(147,60,200,0.4)" : "none",
                }}>
                {restBusy
                  ? <><Loader2 size={16} strokeWidth={2} className="animate-spin" /> Estimation…</>
                  : <>Estimer ce reste <ArrowRight size={16} strokeWidth={2} /></>}
              </motion.button>
            </>)}
          </motion.div>
        )}

        {/* Je me fais livrer — les 2 portes */}
        {sit !== null && screen === "livraison" && (
          <motion.div key="livraison"
            initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }}
            className="grid grid-cols-2 gap-2.5 mt-4">
            <PhotoCard label="Je sais ce que je prends" sub="log express" Icon={ShoppingBag}
              gradient={sitObj?.gradient ?? ""} img="/nutrition/livraison-jesais.jpg"
              onClick={() => { setFormStep(1); setScreen("livraison-form"); }} />
            <PhotoCard label="Conseille-moi" sub="l’IA choisit" Icon={Sparkles}
              gradient={sitObj?.gradient ?? ""} img="/nutrition/livraison-conseil.jpg"
              onClick={openAdvisor} />
          </motion.div>
        )}

        {/* Je me fais livrer → je sais ce que je prends (parcours guidé 3 étapes) */}
        {sit !== null && screen === "livraison-form" && (
          <motion.div key="livraison-form"
            initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }}
            className="mt-4">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={`step-${formStep}`}
                initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.18 }}
                className="flex flex-col gap-4">

                <StepBar cur={formStep} />

                {/* ── Étape 1 · Où : genre + nom de l'enseigne ── */}
                {formStep === 1 && (<>
                  <h3 className="text-xl font-medium leading-snug" style={{ color: "var(--text-1)" }}>Tu commandes où&nbsp;?</h3>
                  <div>
                    <p className="text-[11px] font-semiboldst mb-1.5" style={{ color: "var(--text-3)" }}>Quel genre d&apos;endroit&nbsp;?</p>
                    <div className="grid grid-cols-4 gap-1.5">
                      {CATEGORY_ORDER.map((c) => {
                        const on = category === c;
                        return (
                          <motion.button key={c} whileTap={{ scale: 0.94 }} onClick={() => pickCategory(c)}
                            className="relative overflow-hidden rounded-xl cursor-pointer"
                            style={{ aspectRatio: "5 / 4", outline: on ? "2px solid var(--accent)" : "1px solid rgba(var(--violet-mid-rgb),0.35)", outlineOffset: "-1px" }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={ambianceImg(c)} alt="" aria-hidden loading="lazy" decoding="async"
                              className="absolute inset-0 w-full h-full object-cover" style={{ opacity: on ? 1 : 0.55 }} />
                            <div className="absolute inset-0" style={{ background: "linear-gradient(to top,rgba(10,6,14,0.82),rgba(10,6,14,0.12))" }} />
                            {on && (
                              <span className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: "var(--accent)" }}>
                                <Check size={10} strokeWidth={3} style={{ color: "#fff" }} />
                              </span>
                            )}
                            <span className="absolute inset-x-0 bottom-0 px-1 pb-1 text-[9px] font-semibold leading-tight text-center block" style={{ color: "#fff", textShadow: "0 1px 3px rgba(0,0,0,0.7)" }}>
                              {CATEGORY_LABEL[c]}
                            </span>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] font-semiboldst mb-1.5" style={{ color: "var(--text-3)" }}>Son nom, pour affiner l&apos;estimation</p>
                    <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl"
                      style={{ background: "rgba(var(--tint-violet-rgb),0.5)", border: "1px solid rgba(var(--violet-mid-rgb),0.5)" }}>
                      <Store size={15} strokeWidth={1.8} style={{ color: "var(--text-3)" }} />
                      <input value={enseigne} onChange={(e) => setEnseigneSmart(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") setFormStep(2); }}
                        placeholder="McDonald’s, le resto du coin…"
                        className="flex-1 bg-transparent text-sm outline-none" style={{ color: "var(--text-1)" }} />
                    </div>
                  </div>
                  <motion.button whileTap={{ scale: 0.98 }} onClick={() => setFormStep(2)}
                    className="w-full py-3 rounded-2xl text-sm font-semibold cursor-pointer flex items-center justify-center gap-2 mt-1"
                    style={{ background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", color: "#fff", boxShadow: "0 4px 16px rgba(147,60,200,0.4)" }}>
                    Suivant <ArrowRight size={16} strokeWidth={2} />
                  </motion.button>
                </>)}

                {/* ── Étape 2 · Quoi : panier vivant, un article à la fois ── */}
                {formStep === 2 && (<>
                  <div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                      style={{ background: "rgba(139,92,246,0.16)", border: "1px solid rgba(139,92,246,0.4)", color: "var(--text-1)" }}>
                      <Flame size={13} strokeWidth={2} style={{ color: "var(--exp-encre)" }} />
                      {enseigne.trim() ? `${enseigne.trim()} · ` : ""}{CATEGORY_LABEL[category]}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-xl font-medium leading-snug" style={{ color: "var(--text-1)" }}>Qu&apos;est-ce que tu prends&nbsp;?</h3>
                    <p className="text-xs font-light mt-1" style={{ color: "var(--text-3)" }}>Ajoute tes articles un par un, un seul suffit.</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    {articles.map((a, i) => (
                      <div key={`${a}-${i}`} className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl"
                        style={{ background: "rgba(var(--tint-violet-rgb),0.5)", border: "1px solid rgba(var(--violet-mid-rgb),0.35)" }}>
                        <span className="flex-1 text-sm" style={{ color: "var(--text-1)" }}>{a}</span>
                        <button onClick={() => removeArticle(i)} aria-label="Retirer" className="cursor-pointer flex-shrink-0">
                          <X size={15} strokeWidth={2} style={{ color: "var(--text-3)" }} />
                        </button>
                      </div>
                    ))}
                    <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl"
                      style={{ border: "1px dashed rgba(var(--violet-mid-rgb),0.6)" }}>
                      <button onClick={() => addArticle(articleInput)} aria-label="Ajouter" className="cursor-pointer flex-shrink-0">
                        <Plus size={16} strokeWidth={2.5} style={{ color: "var(--exp-encre)" }} />
                      </button>
                      <input value={articleInput} onChange={(e) => setArticleInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") addArticle(articleInput); }}
                        placeholder="Ajoute un article…"
                        className="flex-1 bg-transparent text-sm outline-none" style={{ color: "var(--text-1)" }} />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-1">
                    <motion.button whileTap={{ scale: 0.96 }} onClick={goBack} aria-label="Retour"
                      className="px-4 rounded-2xl cursor-pointer flex items-center justify-center flex-shrink-0"
                      style={{ background: "rgba(var(--tint-violet-rgb),0.6)", border: "1px solid rgba(var(--violet-mid-rgb),0.4)" }}>
                      <ArrowLeft size={16} strokeWidth={2} style={{ color: "var(--text-2)" }} />
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.98 }} onClick={() => setFormStep(3)}
                      className="flex-1 py-3 rounded-2xl text-sm font-semibold cursor-pointer flex items-center justify-center gap-2"
                      style={{ background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", color: "#fff", boxShadow: "0 4px 16px rgba(147,60,200,0.4)" }}>
                      Suivant <ArrowRight size={16} strokeWidth={2} />
                    </motion.button>
                  </div>
                </>)}

                {/* ── Étape 3 · Extras : ajouts rapides adaptés à l'endroit ── */}
                {formStep === 3 && (<>
                  <div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                      style={{ background: "rgba(139,92,246,0.16)", border: "1px solid rgba(139,92,246,0.4)", color: "var(--text-1)" }}>
                      <Flame size={13} strokeWidth={2} style={{ color: "var(--exp-encre)" }} />
                      {enseigne.trim() ? `${enseigne.trim()} · ` : ""}{CATEGORY_LABEL[category]}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-xl font-medium leading-snug" style={{ color: "var(--text-1)" }}>Tu oublies rien&nbsp;?</h3>
                    <p className="text-xs font-light mt-1" style={{ color: "var(--text-3)" }}>Les petits plus qu&apos;on oublie souvent.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {EXTRAS_BY_CATEGORY[category].map((x) => {
                      const on = articles.includes(x.label);
                      const XIcon = EXTRA_ICON[x.icon] ?? Plus;
                      return (
                        <button key={x.label} onClick={() => toggleExtra(x.label)}
                          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer text-left"
                          style={{
                            background: on ? "rgba(139,92,246,0.16)" : "rgba(var(--tint-violet-rgb),0.5)",
                            border: `1px solid ${on ? "rgba(139,92,246,0.45)" : "rgba(var(--violet-mid-rgb),0.35)"}`,
                          }}>
                          <XIcon size={17} strokeWidth={1.8} style={{ color: "var(--exp-encre)" }} />
                          <span className="flex-1 text-sm" style={{ color: "var(--text-1)" }}>{x.label}</span>
                          {on
                            ? <Check size={15} strokeWidth={2.5} style={{ color: "var(--exp-encre)" }} />
                            : <Plus size={15} strokeWidth={2} style={{ color: "var(--text-3)" }} />}
                        </button>
                      );
                    })}
                  </div>

                  {estErr && <p className="text-xs" style={{ color: "#E53E3E" }}>⚠️ {estErr}</p>}

                  <div className="flex gap-2 mt-1">
                    <motion.button whileTap={{ scale: 0.96 }} onClick={goBack} aria-label="Retour"
                      className="px-4 rounded-2xl cursor-pointer flex items-center justify-center flex-shrink-0"
                      style={{ background: "rgba(var(--tint-violet-rgb),0.6)", border: "1px solid rgba(var(--violet-mid-rgb),0.4)" }}>
                      <ArrowLeft size={16} strokeWidth={2} style={{ color: "var(--text-2)" }} />
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.98 }} onClick={runEstimate} disabled={!canEstimate || estimating}
                      className="flex-1 py-3 rounded-2xl text-sm font-semibold cursor-pointer flex items-center justify-center gap-2"
                      style={{
                        background: canEstimate ? "linear-gradient(135deg,#8B5CF6,#C13BC1)" : "rgba(var(--tint-violet-rgb),0.5)",
                        color: canEstimate ? "#fff" : "var(--text-3)",
                        boxShadow: canEstimate ? "0 4px 16px rgba(147,60,200,0.4)" : "none",
                      }}>
                      {estimating
                        ? <><Loader2 size={16} strokeWidth={2} className="animate-spin" /> Estimation…</>
                        : <>Estimer les macros</>}
                    </motion.button>
                  </div>
                </>)}

              </motion.div>
            </AnimatePresence>
          </motion.div>
        )}

        {/* Je me fais livrer → Conseille-moi : podium des genres classés selon la journée */}
        {sit !== null && screen === "livraison-advisor" && (
          <motion.div key="livraison-advisor"
            initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }}
            className="mt-4">
            {advice.length === 0 ? (
              <div className="flex flex-col items-center text-center gap-2 py-10">
                <Sparkles size={24} strokeWidth={1.5} style={{ color: "var(--exp-encre)" }} />
                <p className="text-sm font-light" style={{ color: "var(--text-3)" }}>Un instant…</p>
              </div>
            ) : (<>
              {/* Contexte : ce que lit l'IA */}
              <div className="flex items-center gap-1.5 mb-3">
                <Sparkles size={14} strokeWidth={2} style={{ color: "#8B5CF6" }} />
                <p className="text-[12px]" style={{ color: "var(--text-3)" }}>
                  {advisorNeeds && advisorNeeds.goalCalories > 0 ? (
                    <>Il te reste <span style={{ color: "var(--text-1)", fontWeight: 600 }}>{advisorNeeds.remaining} kcal</span>
                    {advisorNeeds.proteinRemaining >= 15 && <> · <span style={{ color: "var(--text-1)", fontWeight: 600 }}>{advisorNeeds.proteinRemaining} g</span> de protéines à couvrir</>}</>
                  ) : (
                    <>{moment.charAt(0).toUpperCase() + moment.slice(1)}, voilà où je partirais.</>
                  )}
                </p>
              </div>

              {/* Reco #1 — carte pleine */}
              {(() => {
                const top = advice[0]; const p = top.profile;
                return (
                  <div className="rounded-2xl overflow-hidden" style={{ border: "2px solid var(--accent)" }}>
                    <div className="relative" style={{ height: 92 }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={ambianceImg(top.category)} alt="" aria-hidden loading="lazy" decoding="async"
                        className="absolute inset-0 w-full h-full object-cover" />
                      <div className="absolute inset-0" style={{ background: "linear-gradient(to top,rgba(10,6,14,0.85),rgba(10,6,14,0.15))" }} />
                      <span className="absolute top-2 left-2.5 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: "var(--accent)", color: "#fff" }}>Le mieux placé</span>
                      <span className="absolute left-3 bottom-2 text-[12px] font-semibold" style={{ color: "#fff", textShadow: "0 1px 3px rgba(0,0,0,0.7)" }}>
                        {CATEGORY_LABEL[top.category]}
                      </span>
                    </div>
                    <div className="p-3.5" style={{ background: "rgb(var(--surface-rgb))" }}>
                      {top.reason && (
                        <div className="inline-flex items-center gap-1.5 mb-2 px-2.5 py-1 rounded-full"
                          style={{ background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.3)" }}>
                          <Sparkles size={12} strokeWidth={2} style={{ color: "#8B5CF6" }} />
                          <span className="text-[11px] font-semibold" style={{ color: "var(--exp-encre)" }}>{top.reason}</span>
                        </div>
                      )}
                      <p className="text-[16px] font-medium leading-snug" style={{ color: "var(--text-1)" }}>{p.title}</p>
                      <p className="text-[12.5px] font-light mt-1 mb-3" style={{ color: "var(--text-3)", lineHeight: 1.5 }}>
                        {p.vise}{p.saute ? ` · ${p.saute}` : ""}
                      </p>
                      <motion.button whileTap={{ scale: 0.98 }} onClick={() => startFromGenre(top.category)}
                        className="w-full py-3 rounded-2xl text-sm font-semibold cursor-pointer flex items-center justify-center gap-2"
                        style={{ background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", color: "#fff", boxShadow: "0 4px 16px rgba(147,60,200,0.4)" }}>
                        Je pars là-dessus <ArrowRight size={16} strokeWidth={2} />
                      </motion.button>
                    </div>
                  </div>
                );
              })()}

              {/* Alternatives — 2 lignes compactes */}
              {advice.length > 1 && (<>
                <p className="text-[11px] font-semiboldst mt-4 mb-2 ml-0.5" style={{ color: "var(--text-3)" }}>Sinon, ça passe aussi</p>
                <div className="flex flex-col gap-2">
                  {advice.slice(1, 3).map((alt) => (
                    <motion.button key={alt.category} whileTap={{ scale: 0.98 }} onClick={() => startFromGenre(alt.category)}
                      className="flex items-center gap-3 p-2.5 rounded-2xl cursor-pointer text-left"
                      style={{ background: "rgba(var(--tint-violet-rgb),0.5)", border: "1px solid rgba(var(--violet-mid-rgb),0.35)" }}>
                      <div className="relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={ambianceImg(alt.category)} alt="" aria-hidden loading="lazy" decoding="async"
                          className="absolute inset-0 w-full h-full object-cover" />
                        <div className="absolute inset-0" style={{ background: "linear-gradient(to top,rgba(10,6,14,0.5),transparent)" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13.5px] font-medium" style={{ color: "var(--text-1)" }}>
                          {CATEGORY_LABEL[alt.category]} · <span style={{ color: "var(--text-3)", fontWeight: 400 }}>{alt.profile.short}</span>
                        </p>
                        <p className="text-[11.5px] font-light truncate" style={{ color: "var(--text-3)" }}>{alt.reason ?? alt.profile.vise}</p>
                      </div>
                      <span className="text-[11px] flex-shrink-0" style={{ color: "var(--text-3)" }}>~{alt.profile.cal}</span>
                      <ChevronRight size={16} strokeWidth={2} className="flex-shrink-0" style={{ color: "var(--text-3)" }} />
                    </motion.button>
                  ))}
                </div>
              </>)}
            </>)}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filet anti-culpabilité — uniquement à la racine */}
      {sit === null && (
        <div className="flex items-center justify-center gap-3 mt-3.5">
          <button onClick={onManual} className="text-[11px] cursor-pointer" style={{ color: "var(--text-3)" }}>J&apos;ai déjà mangé</button>
          <span className="text-[11px]" style={{ color: "var(--text-3)", opacity: 0.5 }}>·</span>
          <button onClick={onSkip} className="text-[11px] cursor-pointer" style={{ color: "var(--text-3)" }}>Je saute ce repas</button>
        </div>
      )}

      {/* Fiche recette (banque curée) */}
      <AnimatePresence>
        {recipeOpen && (
          currentRecipe ? (
            <RecipeSheet
              key="recipe"
              recipe={currentRecipe}
              loading={thinking}
              fitNote={currentFit}
              onClose={closeRecipe}
              onLog={(m) => { onLogIdea(m); closeRecipe(); }}
              onOther={recipeList.length > 1 ? nextRecipe : undefined}
              hasOther={recipeList.length > 1}
            />
          ) : (
            <motion.div key="empty"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[110] flex items-center justify-center px-6"
              style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(6px)" }}
              onClick={closeRecipe}>
              <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-xs rounded-3xl p-6 text-center"
                style={{ background: "rgb(var(--surface-rgb))", border: "1px solid rgba(var(--accent-rgb),0.14)" }}>
                <p className="text-sm" style={{ color: "var(--text-1)" }}>La banque de recettes se remplit.</p>
                <p className="text-xs mt-1.5 font-light" style={{ color: "var(--text-3)" }}>Aucune recette pour ce filtre pour l&apos;instant, reviens vite.</p>
                <button onClick={closeRecipe}
                  className="mt-4 px-5 py-2.5 rounded-2xl text-sm font-semibold cursor-pointer"
                  style={{ background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", color: "#fff" }}>
                  Fermer
                </button>
              </motion.div>
            </motion.div>
          )
        )}
      </AnimatePresence>

      {/* À finir · avec tes restes → recette générée par l'IA (sans image) */}
      <GeneratedRecipeSheet
        open={genOpen}
        eyebrow="À finir · avec tes restes"
        loading={genLoading}
        error={genError}
        recipe={genRecipe}
        loadingTitle="Je cuisine avec tes restes…"
        loadingHint="Un plat avec ce que tu as, rien à acheter…"
        onClose={reset}
        onRetry={generateFinish}
        onOther={generateFinish}
        onAdd={() => {
          if (genRecipe) onLogIdea({
            name: genRecipe.nom, calories: genRecipe.calories,
            proteins: genRecipe.proteins, carbs: genRecipe.carbs, fats: genRecipe.fats,
          });
        }}
      />

      {/* Récap commande (livraison) */}
      <AnimatePresence>
        {order && (
          <OrderRecapSheet
            key="order"
            estimate={order}
            enseigne={enseigne.trim()}
            origin="livraison"
            onClose={() => setOrder(null)}
            onLog={(m) => { onLogIdea(m); reset(); }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
