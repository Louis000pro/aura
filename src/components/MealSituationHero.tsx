"use client";

/* ════════════════════════════════════════════════════════════════════
   MealSituationHero : la question du repas, en tête de l'écran Nutrition.

   Le Guide pose UNE question, datée par le repas qui vient (« Tu manges où
   ce midi ? »), et trois portes photo y répondent. Chaque porte ouvre ses
   trois sous-choix dans la MÊME carte, sur place. « Une idée » pioche dans
   la banque de recettes (lib/collectionsRecettes → RecipeSheet), « À
   finir » génère une recette à partir des restes (/api/nutrition/recipe).
   Voir [[nutrition-onmangeou-redesign]].

   ⚠️ REFAITE LE 2026-10-22 (direction 2 de la maquette « La nutrition
   accueillante », variante 8, validée par Louis). Le titre « On mange
   où ? » et la phrase du Guide en dessous sont devenus une seule question
   (`nutrition.question.<moment>` dans guides.ts). La carte est un cadre
   serré au voile chaud, les photos sont en 3:5 pour prendre la place, et
   le Guide parle à côté de la question, sans pastille.

   ⚠️ LES DEUX LIENS « J'ai déjà mangé · Je saute ce repas » SONT PARTIS.
   Le premier ouvrait la saisie, qu'« Ajouter un repas » porte juste en
   dessous ; le second n'écrivait rien, il affichait seulement un message.

   « Mes classiques » (2026-10-23, maquette « Les favoris ») : à la maison,
   tes recettes favorites en rangée puis tes plats ; pour un sandwich ou
   un snack, tes plats seuls (une recette se cuisine). Les plats sont les
   mêmes dans les deux portes : l'app ne note pas où un repas a été mangé.
   La liste se fige à l'ouverture, pour qu'un plat touché ne bouge pas.
   ════════════════════════════════════════════════════════════════════ */

import { useState, useRef, useEffect } from "react";
import { aiFetch } from "@/lib/aiFetch";
import { motion, AnimatePresence } from "framer-motion";
import { AssistantSpark, VisageGuide } from "@/components/AssistantMark";
import { useGuideActif } from "@/context/GuideContext";
import { voix } from "@/lib/guides";
import {
  Home, Heart, Plus, ChevronLeft, ChevronRight, Carrot,
  Store, Check, X, Loader2, Flame, ArrowRight, ArrowLeft, ChefHat, Pencil, Search,
  CupSoda, IceCreamCone, Droplet, Coffee, Soup, Salad, GlassWater, Croissant,
} from "lucide-react";
import { loadTasteProfileLocal } from "@/lib/tasteProfile";
import { fitReason, rankRecipes, type Recipe, type DayNeeds } from "@/lib/recipeBank";
import { besoinsDuJour, convient, poolDuMoment, regimeConnu } from "@/lib/collectionsRecettes";
import { momentActuel, type MealType, type RecentMeal } from "@/lib/repas";
import RecipeSheet from "@/components/RecipeSheet";
import GeneratedRecipeSheet, { type GeneratedRecipe } from "@/components/GeneratedRecipeSheet";
import OrderRecapSheet from "@/components/OrderRecapSheet";
import GrillePlats from "@/components/nutrition/GrillePlats";
import {
  estimateOrder, guessPlace, ambianceImg, CATEGORY_ORDER, CATEGORY_LABEL, EXTRAS_BY_CATEGORY,
  type OrderCategory, type OrderEstimate,
} from "@/lib/orderEstimate";
import { rankGenres, GENRE_PROFILE, type AdvisorNeeds, type RankedGenre } from "@/lib/orderAdvisor";
import ns from "@/components/nutrition/Nutrition.module.css";

type LoggedMeal = { name: string; calories: number; proteins: number; carbs: number; fats: number };
type DayTotals = { calories: number; proteins: number; carbs: number; fats: number };

type Props = {
  userId?: string | null;
  /** Le repas qui vient, d'après l'heure du téléphone. `null` avant l'hydratation. */
  moment: MealType | null;
  goals?: DayTotals;      // objectifs du jour
  consumed?: DayTotals;   // déjà mangé aujourd'hui
  eatenToday?: string[];  // noms des plats déjà loggés (anti-répétition)
  onPhoto: () => void;
  onBarcode: () => void;
  onMenuScan: () => void;   // « La carte » du resto → photo + classement IA
  /** « Mes plats » : les favoris d'abord, puis les derniers repas. */
  plats: RecentMeal[];
  /** `null` tant que les favoris ne sont pas connus : aucun cœur. */
  estPlatFavori: ((nom: string) => boolean) | null;
  recettesFavorites: Recipe[];
  estRecetteFavorite: ((id: string) => boolean) | null;
  /** Rend l'identifiant du repas écrit, ou `null` si l'écriture a échoué. */
  onAjouterPlat: (r: RecentMeal) => Promise<string | null>;
  onRetirerPlat: (id: string) => Promise<void> | void;
  onCoeurPlat: (r: RecentMeal) => void;
  onCoeurRecette: (r: Recipe) => void;
  /** Une recette favorite s'ouvre dans la fiche de l'écran. */
  onOuvrirRecette: (r: Recipe, liste: Recipe[]) => void;
  onVoirFavoris: () => void;
  onLogIdea: (m: LoggedMeal) => void;
};

type SituationKey = "maison" | "resto" | "pouce";
type Screen = "menu" | "finish" | "classics" | "livraison" | "livraison-form" | "livraison-advisor";
type Icon = typeof Home;

/* Les trois portes. La clé `pouce` reste : elle nomme les fichiers d'images
   (/nutrition/pouce-*.jpg). « Sur le pouce » ne disait rien à personne
   (test fait par Louis autour de lui) : on nomme la chose. */
const SITUATIONS: { key: SituationKey; label: string; sub?: string; img: string }[] = [
  { key: "maison", label: "À la maison", img: "/nutrition/maison.jpg" },
  { key: "resto", label: "Resto, cantine", sub: "ou livraison", img: "/nutrition/resto.jpg" },
  { key: "pouce", label: "Sandwich, snack", sub: "acheté tout prêt", img: "/nutrition/pouce.jpg" },
];

/* Le moment dit dans une phrase du conseiller de livraison. */
const MOMENT_PHRASE: Record<MealType, string> = {
  "petit-dejeuner": "Ce matin", "dejeuner": "Ce midi", "gouter": "Cet après-midi", "diner": "Ce soir",
};

/* Part typique du repas dans la journée (pour cibler « Conseille-moi »). */
const MEAL_SHARE_ADVISOR: Record<MealType, number> = {
  "petit-dejeuner": 0.25, "dejeuner": 0.35, "gouter": 0.1, "diner": 0.32,
};

/* Une porte : la photo d'abord, le mot ensuite, sous la photo et jamais
   dessus. 3:5 à trois de front, 4:5 quand il n'y en a que deux. */
function Porte({ label, sub, img, onClick, ratio = "3 / 5" }: {
  label: string; sub?: string; img: string; onClick: () => void; ratio?: string;
}) {
  return (
    <motion.button whileTap={{ scale: 0.97 }} onClick={onClick}
      className="flex min-w-0 flex-col gap-1.5 text-left cursor-pointer">
      <span className="relative block w-full overflow-hidden"
        style={{ aspectRatio: ratio, borderRadius: "var(--r-bloc)", background: "rgba(var(--accent-rgb),0.10)", boxShadow: "var(--ombre-pose)" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img} alt="" aria-hidden loading="lazy" decoding="async"
          onError={(e) => { e.currentTarget.style.display = "none"; }}
          className="absolute inset-0 h-full w-full object-cover" />
      </span>
      <span className="flex flex-col px-1">
        <span className="text-[13px] font-bold leading-tight" style={{ color: "var(--text-0)" }}>{label}</span>
        {sub && <span className="text-[11px] leading-tight mt-px" style={{ color: "var(--text-3)" }}>{sub}</span>}
      </span>
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
    <div className="flex items-center gap-2 text-[11px]">
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

type SubChoice = { key: string; label: string; sub: string; run: () => void };

export default function MealSituationHero({
  userId, moment, goals, consumed, eatenToday, onPhoto, onBarcode, onMenuScan,
  plats, estPlatFavori, recettesFavorites, estRecetteFavorite,
  onAjouterPlat, onRetirerPlat, onCoeurPlat, onCoeurRecette, onOuvrirRecette, onVoirFavoris, onLogIdea,
}: Props) {
  const { guide } = useGuideActif();
  const [sit, setSit] = useState<SituationKey | null>(null);
  const [screen, setScreen] = useState<Screen>("menu");
  // « Mes plats » tels qu'ils étaient en ouvrant « Mes classiques ».
  const [classiquesFiges, setClassiquesFiges] = useState<RecentMeal[] | null>(null);

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

  /* Le repas dont on parle. Les gestes se font après l'hydratation : si
     l'heure n'est pas encore connue, on la lit au moment du geste. */
  const quand = (): MealType => moment ?? momentActuel();

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
    setSit(null); setScreen("menu"); setClassiquesFiges(null);
    setIngredients([]); setIngInput("");
    resetLiv(); resetRest(); resetGen();
  };
  const ouvrirClassiques = () => { setClassiquesFiges(plats); setScreen("classics"); };
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

  // Besoins de la journée pour classer « Une idée » (Levier A). Même calcul
  // que les idées posées sous la question (lib/collectionsRecettes).
  const buildDayNeeds = (): DayNeeds => besoinsDuJour({
    moment: quand(),
    objectif: goals ?? { calories: 2000, proteins: 0 },
    mange: consumed ?? { calories: 0, proteins: 0 },
    dejaManges: eatenToday ?? [],
    aimes: (userId ? loadTasteProfileLocal(userId)?.bases : null) ?? [],
  });

  const openRecipes = (list?: Recipe[]) => {
    // « Une idée » (list absente) = les recettes du moment, jamais une entrée
    // seule, classées selon la journée ; « À finir » garde son propre ordre.
    const needs = list ? null : buildDayNeeds();
    const regime = regimeConnu(readDiet());
    let pool = list ?? poolDuMoment(quand()).filter((r) => convient(r, regime));
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
        ? Math.round(goals.calories * MEAL_SHARE_ADVISOR[quand()])
        : null;
      const res = await aiFetch("/api/nutrition/recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ingredients, diet: readDiet(), taste,
          mealType: quand(), portions: 1, calorieTarget,
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
      mealShare: MEAL_SHARE_ADVISOR[quand()],
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
      { key: "idee",       label: "Une idée",       sub: "qui me tente",    run: () => openRecipes() },
      { key: "finir",      label: "À finir",        sub: "avec tes restes", run: () => setScreen("finish") },
      { key: "classiques", label: "Mes classiques", sub: "mes habitudes",   run: ouvrirClassiques },
    ];
    if (key === "resto") return [
      { key: "assiette",  label: "Mon assiette",      sub: "je la scanne",       run: onPhoto },
      { key: "carte",     label: "La carte",          sub: "je la photographie", run: onMenuScan },
      { key: "livraison", label: "Je me fais livrer", sub: "à la maison",        run: () => setScreen("livraison") },
    ];
    return [
      { key: "code",       label: "Code-barres",    sub: "produit emballé", run: onBarcode },
      { key: "photo",      label: "Une photo",      sub: "on l’estime",     run: onPhoto },
      { key: "classiques", label: "Mes classiques", sub: "mes habitudes",   run: ouvrirClassiques },
    ];
  };

  /* Une liste figée vide (les plats n'étaient pas encore lus) suit la source. */
  const platsClassiques = classiquesFiges && classiquesFiges.length > 0 ? classiquesFiges : plats;
  const recettesClassiques = sit === "maison" ? recettesFavorites : [];

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

  /* La question du moment. Avant l'hydratation (heure du téléphone pas encore
     lue), la forme sans moment : jamais une heure fausse. */
  const question = voix(guide, moment ? (`nutrition.question.${moment}` as const) : "nutrition.question");

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
      className={`${ns.carte} ${ns.chaud}`}
      style={{ padding: "14px 8px 12px", gap: 12 }}
    >
      {/* En-tête : racine = le Guide et sa question ; sous-niveau = retour + titre */}
      {sit === null ? (
        <div className="flex items-center gap-3 px-1.5">
          {/* Sans Guide résolu, `VisageGuide` retombe sur l'étincelle ✦. */}
          <span className="flex-shrink-0 rounded-full" style={{ boxShadow: "0 0 0 2px rgb(var(--surface-rgb))" }}>
            <VisageGuide guide={guide} etat="listen" size={44} />
          </span>
          <h2 className="min-w-0 text-[26px] font-light"
            style={{ color: "var(--text-0)", lineHeight: 1.08, letterSpacing: "-0.01em", textWrap: "balance" }}>
            {question}
          </h2>
        </div>
      ) : (
        <div className="flex items-center gap-2.5 px-1.5">
          <motion.button whileTap={{ scale: 0.9 }} onClick={goBack} aria-label="Revenir" className={ns.rond}>
            <ChevronLeft size={19} strokeWidth={2.2} />
          </motion.button>
          <h2 className="min-w-0 text-[20px] font-light leading-tight" style={{ color: "var(--text-0)" }}>{heading}</h2>
        </div>
      )}

      {/* Contenu — change SUR PLACE */}
      <AnimatePresence mode="wait">
        {/* Racine : les trois portes */}
        {sit === null && (
          <motion.div key="root"
            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
            className="grid grid-cols-3 gap-1.5">
            {SITUATIONS.map((p) => (
              <Porte key={p.key} label={p.label} sub={p.sub} img={p.img}
                onClick={() => { setSit(p.key); setScreen("menu"); }} />
            ))}
          </motion.div>
        )}

        {/* Sous-choix : encore trois portes, dans la même carte */}
        {sit !== null && screen === "menu" && (
          <motion.div key={`menu-${sit}`}
            initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }}
            className="grid grid-cols-3 gap-1.5">
            {subChoices(sit).map((c) => (
              <Porte key={c.key} label={c.label} sub={c.sub} img={`/nutrition/${sit}-${c.key}.jpg`} onClick={c.run} />
            ))}
          </motion.div>
        )}

        {/* Mes classiques : les recettes favorites (à la maison), puis les plats */}
        {sit !== null && screen === "classics" && (
          <motion.div key="classics"
            initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }}
            className="flex flex-col gap-4 px-1.5">
            {recettesClassiques.length > 0 && (
              <div className="flex flex-col gap-1">
                <div className="flex min-h-11 items-center justify-between gap-3">
                  <span className="text-[13px] font-bold" style={{ color: "var(--text-2)" }}>Mes recettes favorites</span>
                  <button type="button" onClick={onVoirFavoris} className="min-h-11 pl-3 text-[13px] font-semibold cursor-pointer"
                    style={{ color: "var(--exp-encre)" }}>
                    Tout voir
                  </button>
                </div>
                {/* La rangée va jusqu'au bord de la carte, et garde de la place
                    dessous : une rangée qui défile coupe l'ombre de ses photos. */}
                <div className={`${ns.rail} -mb-3 -mr-3.5 pb-3 pr-3.5`} style={{ gap: 8 }}>
                  {recettesClassiques.map((r) => (
                    <button key={r.id} type="button" onClick={() => onOuvrirRecette(r, recettesClassiques)}
                      className="flex flex-shrink-0 flex-col gap-1.5 text-left cursor-pointer" style={{ width: 96 }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={r.image} alt="" loading="lazy" decoding="async" className="block object-cover"
                        style={{ width: 96, height: 128, borderRadius: "var(--r-bloc)", boxShadow: "var(--ombre-pose)", background: "rgba(var(--accent-rgb),0.10)" }} />
                      <span className="line-clamp-2 text-[13px] font-bold leading-snug" style={{ color: "var(--text-0)" }}>{r.nom}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {platsClassiques.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-[13px] font-bold" style={{ color: "var(--text-2)" }}>Mes plats</span>
                <GrillePlats plats={platsClassiques} estFavori={estPlatFavori} hauteur={110}
                  onAjouter={onAjouterPlat} onRetirer={onRetirerPlat} onCoeur={onCoeurPlat} />
              </div>
            )}

            {recettesClassiques.length === 0 && platsClassiques.length === 0 && (
              <div className="flex flex-col items-center text-center gap-2.5 py-9">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{ background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.28)" }}>
                  <Heart size={20} strokeWidth={1.8} style={{ color: "var(--exp-encre)" }} />
                </div>
                <p className="text-[13px] font-light leading-relaxed max-w-[15rem]" style={{ color: "var(--text-3)" }}>
                  {sit === "maison"
                    ? "Tes recettes favorites et tes plats habituels apparaîtront ici."
                    : "Tes plats habituels apparaîtront ici dès que tu en auras enregistré quelques-uns."}
                </p>
              </div>
            )}
          </motion.div>
        )}

        {/* À finir : cuisiner un plat (restes → recette) OU estimer un reste (plat déjà prêt) */}
        {sit !== null && screen === "finish" && (
          <motion.div key="finish"
            initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }}
            className="flex flex-col gap-3 px-1.5">

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
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[13px] font-semibold cursor-pointer"
                    style={{ background: on ? "linear-gradient(135deg,#8B5CF6,#C13BC1)" : "transparent", color: on ? "#fff" : "var(--text-3)" }}>
                    <t.Icon size={15} strokeWidth={2} /> {t.label}
                  </button>
                );
              })}
            </div>

            {finishMode === "cuisiner" ? (<>
              <p className="text-[13px] font-light leading-relaxed" style={{ color: "var(--text-2)" }}>
                Dis-moi ce que tu as sous la main, je te trouve un plat, rien à acheter.
              </p>
              <div className="flex gap-2">
                <input value={ingInput} onChange={(e) => setIngInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") addIngredients(ingInput); }}
                  placeholder="Ex : courgettes, feta, œufs…"
                  className="flex-1 px-3.5 py-2.5 rounded-xl text-[16px] outline-none"
                  style={{ background: "rgba(var(--tint-violet-rgb),0.5)", border: "1px solid rgba(var(--violet-mid-rgb),0.5)", color: "var(--text-1)" }} />
                <motion.button whileTap={{ scale: 0.94 }} onClick={() => addIngredients(ingInput)} disabled={!ingInput.trim()}
                  className="px-3.5 rounded-xl text-[13px] font-semibold cursor-pointer flex-shrink-0"
                  style={{ background: ingInput.trim() ? "rgba(var(--accent-rgb),0.16)" : "rgba(var(--tint-violet-rgb),0.4)", color: "var(--exp-encre)" }}>
                  Ajouter
                </motion.button>
              </div>
              {ingredients.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {ingredients.map((ing) => (
                    <button key={ing} onClick={() => setIngredients((prev) => prev.filter((x) => x !== ing))}
                      className="flex items-center gap-1 pl-2.5 pr-2 py-1 rounded-full text-[11px] cursor-pointer"
                      style={{ background: "rgba(139,92,246,0.14)", color: "var(--text-1)", border: "1px solid rgba(139,92,246,0.3)" }}>
                      {ing}<span style={{ fontSize: 13, lineHeight: 1 }}>×</span>
                    </button>
                  ))}
                </div>
              )}
              {baseSuggestions.filter((s) => !ingredients.some((i) => i.toLowerCase() === s.toLowerCase())).length > 0 && (
                <div>
                  <p className="vy-label mb-1.5" style={{ color: "var(--text-3)" }}>Suggestions</p>
                  <div className="flex flex-wrap gap-1.5">
                    {baseSuggestions.filter((s) => !ingredients.some((i) => i.toLowerCase() === s.toLowerCase())).map((s) => (
                      <button key={s} onClick={() => addIngredients(s)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] cursor-pointer"
                        style={{ background: "rgba(var(--tint-violet-rgb),0.5)", color: "var(--text-2)", border: "1px solid rgba(var(--violet-mid-rgb),0.35)" }}>
                        <Plus size={11} strokeWidth={2.5} style={{ color: "var(--exp-encre)" }} /> {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <motion.button whileTap={{ scale: 0.98 }} onClick={generateFinish} disabled={!ingredients.length}
                className="w-full py-3 rounded-2xl text-[16px] font-semibold cursor-pointer flex items-center justify-center gap-2 mt-1"
                style={{
                  background: ingredients.length ? "linear-gradient(135deg,#8B5CF6,#C13BC1)" : "rgba(var(--tint-violet-rgb),0.5)",
                  color: ingredients.length ? "#fff" : "var(--text-3)",
                  boxShadow: ingredients.length ? "var(--ombre-action)" : "none",
                }}>
                <Carrot size={16} strokeWidth={2} /> Trouve-moi un plat
              </motion.button>
            </>) : restResult ? (<>
              {/* Carte résultat du reste (kcal + macros ajustables) */}
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium self-start"
                style={{ background: "rgba(139,92,246,0.16)", border: "1px solid rgba(139,92,246,0.4)", color: "var(--text-1)" }}>
                <Home size={13} strokeWidth={2} style={{ color: "var(--exp-encre)" }} />
                Reste maison · portion {PORTIONS.find((p) => p.key === portion)?.label.toLowerCase()}
              </span>
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-[20px] font-medium leading-tight flex-1" style={{ color: "var(--text-1)" }}>{restResult.name}</h3>
                <div className="text-right flex-shrink-0">
                  {restEdit ? (
                    <input type="number" inputMode="numeric" value={restResult.calories}
                      onChange={(e) => setRestResult((r) => r ? { ...r, calories: Math.max(0, parseInt(e.target.value) || 0) } : r)}
                      className="w-20 text-right text-[26px] font-light outline-none rounded-lg px-1"
                      style={{ background: "rgba(var(--tint-violet-rgb),0.5)", color: "var(--text-1)" }} />
                  ) : (
                    <p className="text-[26px] font-light leading-none" style={{ color: "#E8620C" }}>{restResult.calories}</p>
                  )}
                  <p className="text-[11px] mt-0.5" style={{ color: "var(--text-3)" }}>kcal</p>
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
                        className="w-12 mx-auto block text-center text-[16px] font-extrabold outline-none rounded"
                        style={{ background: "rgb(var(--surface-rgb))", color: m.c, fontVariantNumeric: "tabular-nums" }} />
                    ) : (
                      <p className="font-extrabold" style={{ color: m.c, fontSize: 16, fontVariantNumeric: "tabular-nums" }}>{m.v}g</p>
                    )}
                    <p style={{ color: "var(--text-3)", fontSize: 11, marginTop: 2 }}>{m.label}</p>
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
                className="w-full py-3 rounded-2xl text-[16px] font-semibold cursor-pointer flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", color: "#fff", boxShadow: "var(--ombre-action)" }}>
                <Check size={17} strokeWidth={2.5} /> Ajouter à ma journée
              </motion.button>
            </>) : (<>
              {/* Saisie : nom du plat + portion imposée */}
              <p className="text-[13px] font-light leading-relaxed" style={{ color: "var(--text-2)" }}>
                Un reste au frigo&nbsp;? Dis-moi lequel, je l&apos;estime, même sans le peser.
              </p>
              <div>
                <p className="vy-label mb-1.5" style={{ color: "var(--text-3)" }}>C&apos;était quoi&nbsp;?</p>
                <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl"
                  style={{ background: "rgba(var(--tint-violet-rgb),0.5)", border: "1px solid rgba(var(--violet-mid-rgb),0.5)" }}>
                  <Search size={15} strokeWidth={1.8} style={{ color: "var(--text-3)" }} />
                  <input value={restDish} onChange={(e) => setRestDish(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && canEstimateRest) estimateRest(); }}
                    placeholder="Gratin de courgettes, pâtes bolo…"
                    className="flex-1 bg-transparent text-[16px] outline-none" style={{ color: "var(--text-1)" }} />
                </div>
              </div>
              <div>
                <p className="vy-label mb-1.5" style={{ color: "var(--text-3)" }}>Il en restait combien&nbsp;?</p>
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
                        <span className="text-[13px] font-medium mt-1" style={{ color: "var(--text-1)" }}>{p.label}</span>
                        <span className="text-[11px]" style={{ color: "var(--text-3)" }}>{p.sub}</span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
              {restErr && <p className="text-[13px]" style={{ color: "#E53E3E" }}>⚠️ {restErr}</p>}
              <motion.button whileTap={{ scale: 0.98 }} onClick={estimateRest} disabled={!canEstimateRest || restBusy}
                className="w-full py-3 rounded-2xl text-[16px] font-semibold cursor-pointer flex items-center justify-center gap-2 mt-1"
                style={{
                  background: canEstimateRest ? "linear-gradient(135deg,#8B5CF6,#C13BC1)" : "rgba(var(--tint-violet-rgb),0.5)",
                  color: canEstimateRest ? "#fff" : "var(--text-3)",
                  boxShadow: canEstimateRest ? "var(--ombre-action)" : "none",
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
            className="grid grid-cols-2 gap-1.5">
            <Porte label="Je sais ce que je prends" sub="je le note" img="/nutrition/livraison-jesais.jpg" ratio="4 / 5"
              onClick={() => { setFormStep(1); setScreen("livraison-form"); }} />
            <Porte label="Conseille-moi" sub="on choisit pour toi" img="/nutrition/livraison-conseil.jpg" ratio="4 / 5"
              onClick={openAdvisor} />
          </motion.div>
        )}

        {/* Je me fais livrer → je sais ce que je prends (parcours guidé 3 étapes) */}
        {sit !== null && screen === "livraison-form" && (
          <motion.div key="livraison-form"
            initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }}
            className="px-1.5">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={`step-${formStep}`}
                initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.18 }}
                className="flex flex-col gap-4">

                <StepBar cur={formStep} />

                {/* ── Étape 1 · Où : genre + nom de l'enseigne ── */}
                {formStep === 1 && (<>
                  <h3 className="text-[20px] font-medium leading-snug" style={{ color: "var(--text-1)" }}>Tu commandes où&nbsp;?</h3>
                  <div>
                    <p className="vy-label mb-1.5" style={{ color: "var(--text-3)" }}>Quel genre d&apos;endroit&nbsp;?</p>
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
                            <div className="absolute inset-0" style={{ background: "var(--voile-carte)" }} />
                            {on && (
                              <span className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: "var(--accent)" }}>
                                <Check size={10} strokeWidth={3} style={{ color: "#fff" }} />
                              </span>
                            )}
                            <span className="absolute inset-x-0 bottom-0 px-1 pb-1 text-[11px] font-semibold leading-tight text-center block" style={{ color: "#fff", textShadow: "0 1px 3px rgba(0,0,0,0.7)" }}>
                              {CATEGORY_LABEL[c]}
                            </span>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <p className="vy-label mb-1.5" style={{ color: "var(--text-3)" }}>Son nom, pour affiner l&apos;estimation</p>
                    <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl"
                      style={{ background: "rgba(var(--tint-violet-rgb),0.5)", border: "1px solid rgba(var(--violet-mid-rgb),0.5)" }}>
                      <Store size={15} strokeWidth={1.8} style={{ color: "var(--text-3)" }} />
                      <input value={enseigne} onChange={(e) => setEnseigneSmart(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") setFormStep(2); }}
                        placeholder="McDonald’s, le resto du coin…"
                        className="flex-1 bg-transparent text-[16px] outline-none" style={{ color: "var(--text-1)" }} />
                    </div>
                  </div>
                  <motion.button whileTap={{ scale: 0.98 }} onClick={() => setFormStep(2)}
                    className="w-full py-3 rounded-2xl text-[16px] font-semibold cursor-pointer flex items-center justify-center gap-2 mt-1"
                    style={{ background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", color: "#fff", boxShadow: "var(--ombre-action)" }}>
                    Suivant <ArrowRight size={16} strokeWidth={2} />
                  </motion.button>
                </>)}

                {/* ── Étape 2 · Quoi : panier vivant, un article à la fois ── */}
                {formStep === 2 && (<>
                  <div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium"
                      style={{ background: "rgba(139,92,246,0.16)", border: "1px solid rgba(139,92,246,0.4)", color: "var(--text-1)" }}>
                      <Flame size={13} strokeWidth={2} style={{ color: "var(--exp-encre)" }} />
                      {enseigne.trim() ? `${enseigne.trim()} · ` : ""}{CATEGORY_LABEL[category]}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-[20px] font-medium leading-snug" style={{ color: "var(--text-1)" }}>Qu&apos;est-ce que tu prends&nbsp;?</h3>
                    <p className="text-[13px] font-light mt-1" style={{ color: "var(--text-3)" }}>Ajoute tes articles un par un, un seul suffit.</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    {articles.map((a, i) => (
                      <div key={`${a}-${i}`} className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl"
                        style={{ background: "rgba(var(--tint-violet-rgb),0.5)", border: "1px solid rgba(var(--violet-mid-rgb),0.35)" }}>
                        <span className="flex-1 text-[16px]" style={{ color: "var(--text-1)" }}>{a}</span>
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
                        className="flex-1 bg-transparent text-[16px] outline-none" style={{ color: "var(--text-1)" }} />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-1">
                    <motion.button whileTap={{ scale: 0.96 }} onClick={goBack} aria-label="Retour"
                      className="px-4 rounded-2xl cursor-pointer flex items-center justify-center flex-shrink-0"
                      style={{ background: "rgba(var(--tint-violet-rgb),0.6)", border: "1px solid rgba(var(--violet-mid-rgb),0.4)" }}>
                      <ArrowLeft size={16} strokeWidth={2} style={{ color: "var(--text-2)" }} />
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.98 }} onClick={() => setFormStep(3)}
                      className="flex-1 py-3 rounded-2xl text-[16px] font-semibold cursor-pointer flex items-center justify-center gap-2"
                      style={{ background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", color: "#fff", boxShadow: "var(--ombre-action)" }}>
                      Suivant <ArrowRight size={16} strokeWidth={2} />
                    </motion.button>
                  </div>
                </>)}

                {/* ── Étape 3 · Extras : ajouts rapides adaptés à l'endroit ── */}
                {formStep === 3 && (<>
                  <div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium"
                      style={{ background: "rgba(139,92,246,0.16)", border: "1px solid rgba(139,92,246,0.4)", color: "var(--text-1)" }}>
                      <Flame size={13} strokeWidth={2} style={{ color: "var(--exp-encre)" }} />
                      {enseigne.trim() ? `${enseigne.trim()} · ` : ""}{CATEGORY_LABEL[category]}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-[20px] font-medium leading-snug" style={{ color: "var(--text-1)" }}>Tu oublies rien&nbsp;?</h3>
                    <p className="text-[13px] font-light mt-1" style={{ color: "var(--text-3)" }}>Les petits plus qu&apos;on oublie souvent.</p>
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
                          <span className="flex-1 text-[16px]" style={{ color: "var(--text-1)" }}>{x.label}</span>
                          {on
                            ? <Check size={15} strokeWidth={2.5} style={{ color: "var(--exp-encre)" }} />
                            : <Plus size={15} strokeWidth={2} style={{ color: "var(--text-3)" }} />}
                        </button>
                      );
                    })}
                  </div>

                  {estErr && <p className="text-[13px]" style={{ color: "#E53E3E" }}>⚠️ {estErr}</p>}

                  <div className="flex gap-2 mt-1">
                    <motion.button whileTap={{ scale: 0.96 }} onClick={goBack} aria-label="Retour"
                      className="px-4 rounded-2xl cursor-pointer flex items-center justify-center flex-shrink-0"
                      style={{ background: "rgba(var(--tint-violet-rgb),0.6)", border: "1px solid rgba(var(--violet-mid-rgb),0.4)" }}>
                      <ArrowLeft size={16} strokeWidth={2} style={{ color: "var(--text-2)" }} />
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.98 }} onClick={runEstimate} disabled={!canEstimate || estimating}
                      className="flex-1 py-3 rounded-2xl text-[16px] font-semibold cursor-pointer flex items-center justify-center gap-2"
                      style={{
                        background: canEstimate ? "linear-gradient(135deg,#8B5CF6,#C13BC1)" : "rgba(var(--tint-violet-rgb),0.5)",
                        color: canEstimate ? "#fff" : "var(--text-3)",
                        boxShadow: canEstimate ? "var(--ombre-action)" : "none",
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
            className="px-1.5">
            {advice.length === 0 ? (
              <div className="flex flex-col items-center text-center gap-2 py-10">
                <AssistantSpark px={24} />
                <p className="text-[13px] font-light" style={{ color: "var(--text-3)" }}>Un instant…</p>
              </div>
            ) : (<>
              {/* Contexte : ce que lit l'IA */}
              <div className="flex items-center gap-1.5 mb-3">
                <AssistantSpark px={14} />
                <p className="text-[13px]" style={{ color: "var(--text-3)" }}>
                  {advisorNeeds && advisorNeeds.goalCalories > 0 ? (
                    <>Il te reste <span style={{ color: "var(--text-1)", fontWeight: 600 }}>{advisorNeeds.remaining} kcal</span>
                    {advisorNeeds.proteinRemaining >= 15 && <> · <span style={{ color: "var(--text-1)", fontWeight: 600 }}>{advisorNeeds.proteinRemaining} g</span> de protéines à couvrir</>}</>
                  ) : (
                    <>{MOMENT_PHRASE[quand()]}, voilà où je partirais.</>
                  )}
                </p>
              </div>

              {/* Reco #1 — carte pleine */}
              {(() => {
                const top = advice[0]; const p = top.profile;
                return (
                  <div className="overflow-hidden" style={{ borderRadius: "var(--r-bloc)", border: "1px solid rgba(var(--violet-mid-rgb),0.35)", boxShadow: "var(--ombre-pose)" }}>
                    <div className="relative" style={{ height: 92 }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={ambianceImg(top.category)} alt="" aria-hidden loading="lazy" decoding="async"
                        className="absolute inset-0 w-full h-full object-cover" />
                      <div className="absolute inset-0" style={{ background: "var(--voile-carte)" }} />
                      <span className="absolute top-2 left-2.5 text-[11px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: "var(--accent)", color: "#fff" }}>Le mieux placé</span>
                      <span className="absolute left-3 bottom-2 text-[11px] font-semibold" style={{ color: "#fff", textShadow: "0 1px 3px rgba(0,0,0,0.7)" }}>
                        {CATEGORY_LABEL[top.category]}
                      </span>
                    </div>
                    <div className="p-3.5" style={{ background: "rgb(var(--surface-rgb))" }}>
                      {top.reason && (
                        <div className="inline-flex items-center gap-1.5 mb-2 px-2.5 py-1 rounded-full"
                          style={{ background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.3)" }}>
                          <AssistantSpark px={12} />
                          <span className="text-[11px] font-semibold" style={{ color: "var(--exp-encre)" }}>{top.reason}</span>
                        </div>
                      )}
                      <p className="text-[16px] font-medium leading-snug" style={{ color: "var(--text-1)" }}>{p.title}</p>
                      <p className="text-[13px] font-light mt-1 mb-3" style={{ color: "var(--text-3)", lineHeight: 1.5 }}>
                        {p.vise}{p.saute ? ` · ${p.saute}` : ""}
                      </p>
                      <motion.button whileTap={{ scale: 0.98 }} onClick={() => startFromGenre(top.category)}
                        className="w-full py-3 rounded-2xl text-[16px] font-semibold cursor-pointer flex items-center justify-center gap-2"
                        style={{ background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", color: "#fff", boxShadow: "var(--ombre-action)" }}>
                        Je pars là-dessus <ArrowRight size={16} strokeWidth={2} />
                      </motion.button>
                    </div>
                  </div>
                );
              })()}

              {/* Alternatives — 2 lignes compactes */}
              {advice.length > 1 && (<>
                <p className="vy-label mt-4 mb-2 ml-0.5" style={{ color: "var(--text-3)" }}>Sinon, ça passe aussi</p>
                <div className="flex flex-col gap-2">
                  {advice.slice(1, 3).map((alt) => (
                    <motion.button key={alt.category} whileTap={{ scale: 0.98 }} onClick={() => startFromGenre(alt.category)}
                      className="flex items-center gap-3 p-2.5 rounded-2xl cursor-pointer text-left"
                      style={{ background: "rgba(var(--tint-violet-rgb),0.5)", border: "1px solid rgba(var(--violet-mid-rgb),0.35)" }}>
                      <div className="relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={ambianceImg(alt.category)} alt="" aria-hidden loading="lazy" decoding="async"
                          className="absolute inset-0 w-full h-full object-cover" />
                        <div className="absolute inset-0" style={{ background: "var(--voile-carte)" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium" style={{ color: "var(--text-1)" }}>
                          {CATEGORY_LABEL[alt.category]} · <span style={{ color: "var(--text-3)", fontWeight: 400 }}>{alt.profile.short}</span>
                        </p>
                        <p className="text-[11px] font-light truncate" style={{ color: "var(--text-3)" }}>{alt.reason ?? alt.profile.vise}</p>
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

      {/* Fiche recette (banque curée) */}
      <AnimatePresence>
        {recipeOpen && (
          currentRecipe ? (
            <RecipeSheet
              key="recipe"
              recipe={currentRecipe}
              loading={thinking}
              fitNote={currentFit}
              favori={estRecetteFavorite ? estRecetteFavorite(currentRecipe.id) : null}
              onFavori={() => onCoeurRecette(currentRecipe)}
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
                <p className="text-[16px]" style={{ color: "var(--text-1)" }}>La banque de recettes se remplit.</p>
                <p className="text-[13px] mt-1.5 font-light" style={{ color: "var(--text-3)" }}>Rien pour ce filtre.</p>
                <button onClick={closeRecipe}
                  className="mt-4 px-5 py-2.5 rounded-2xl text-[16px] font-semibold cursor-pointer"
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
    </motion.section>
  );
}
