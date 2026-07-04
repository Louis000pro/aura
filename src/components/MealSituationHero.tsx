"use client";

/* ════════════════════════════════════════════════════════════════════
   MealSituationHero — le nouveau #1 de la page nutrition.

   Question « On mange où ? » → triple choix contextuel. Navigation PAR CARTES,
   SUR PLACE (chaque niveau = 3 grandes cartes-images). « Une idée / Vite fait /
   À finir » piochent dans la BANQUE DE RECETTES curée (src/lib/recipeBank.ts) et
   ouvrent la fiche complète (RecipeSheet). Voir [[nutrition-onmangeou-redesign]].
   ════════════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home, UtensilsCrossed, Sandwich, Sparkles, Heart, Camera, Barcode,
  Plus, BookOpen, ShoppingBag, ChevronLeft, Clock, Carrot,
} from "lucide-react";
import { loadTasteProfileLocal } from "@/lib/tasteProfile";
import { pickRecipes, matchByIngredients, type Recipe, type MealType } from "@/lib/recipeBank";
import RecipeSheet from "@/components/RecipeSheet";

type Classic = { name: string; calories: number; proteins: number; carbs: number; fats: number; count?: number };
type LoggedMeal = { name: string; calories: number; proteins: number; carbs: number; fats: number };

type Props = {
  name?: string | null;
  userId?: string | null;
  calorieTarget: number;
  onPhoto: () => void;
  onBarcode: () => void;
  onManual: () => void;
  onSkip: () => void;
  classics: Classic[];
  onQuickAdd: (r: Classic) => void;
  onLogIdea: (m: LoggedMeal) => void;
};

type SituationKey = "maison" | "resto" | "pouce";
type Screen = "menu" | "finish" | "classics";
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
    key: "pouce", label: "Sur le pouce", sub: "sans cuisine", Icon: Sandwich,
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

type SubChoice = { key: string; label: string; sub: string; Icon: Icon; run: () => void };

export default function MealSituationHero({
  name, userId, calorieTarget, onPhoto, onBarcode, onManual, onSkip,
  classics, onQuickAdd, onLogIdea,
}: Props) {
  const [sit, setSit] = useState<SituationKey | null>(null);
  const [screen, setScreen] = useState<Screen>("menu");

  const [ingredients, setIngredients] = useState<string[]>([]);
  const [ingInput, setIngInput] = useState("");

  // Fiche recette (piochée dans la banque)
  const [recipeList, setRecipeList] = useState<Recipe[]>([]);
  const [recipeIndex, setRecipeIndex] = useState(0);
  const [recipeOpen, setRecipeOpen] = useState(false);

  const { hello, moment } = greeting();

  const reset = () => { setSit(null); setScreen("menu"); };
  const goBack = () => {
    if (!sit) return reset();
    if (screen === "finish" || screen === "classics") return setScreen("menu");
    return reset();
  };

  const readDiet = (): string[] => {
    try {
      if (userId) { const raw = localStorage.getItem(`vaiiya_diet_${userId}`); if (raw) return JSON.parse(raw); }
    } catch { /* ignore */ }
    return [];
  };

  const openRecipes = (quick: boolean, list?: Recipe[]) => {
    const pool = list ?? pickRecipes({ mealType: mealTypeNow(), diet: readDiet(), quick });
    setRecipeList(pool);
    setRecipeIndex(0);
    setRecipeOpen(true);
  };
  const closeRecipe = () => { setRecipeOpen(false); reset(); };

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

  const generateFinish = () => {
    if (!ingredients.length) return;
    openRecipes(false, matchByIngredients(ingredients, readDiet()));
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
      { key: "carte",     label: "La carte",          sub: "aide-moi à choisir", Icon: BookOpen,    run: onManual },
      { key: "livraison", label: "Je me fais livrer", sub: "à la maison",        Icon: ShoppingBag, run: onManual },
    ];
    return [
      { key: "code",       label: "Code-barres",    sub: "produit emballé", Icon: Barcode, run: onBarcode },
      { key: "photo",      label: "Une photo",      sub: "l'IA estime",     Icon: Camera,  run: onPhoto },
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
    screen === "finish" ? "J'ai des trucs à finir"
    : screen === "classics" ? "Mes classiques"
    : sitObj?.label ?? "";

  const currentRecipe = recipeList[recipeIndex];

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
          <p className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: "var(--text-3)" }}>
            {hello}{name ? ` ${name}` : ""} · {moment}
          </p>
          <h2 className="text-2xl font-light mt-1" style={{ color: "var(--text-1)" }}>On mange où&nbsp;?</h2>
          <p className="text-[11.5px] mt-1.5 flex items-center gap-1.5" style={{ color: "var(--text-3)" }}>
            <span className="inline-block w-[7px] h-[7px] rounded-full flex-shrink-0" style={{ background: "#8B5CF6" }} />
            Dis-moi où, je m&apos;occupe du reste.
          </p>
        </>
      ) : (
        <div className="flex items-center gap-2.5">
          <motion.button whileTap={{ scale: 0.9 }} onClick={goBack}
            className="w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer flex-shrink-0"
            style={{ background: "rgba(var(--tint-violet-rgb),0.8)" }}>
            <ChevronLeft size={16} strokeWidth={2} style={{ color: "var(--text-2)" }} />
          </motion.button>
          <div>
            <p className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: "var(--text-3)" }}>{sitObj?.sub}</p>
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

        {/* Mes classiques */}
        {sit !== null && screen === "classics" && (
          <motion.div key="classics"
            initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }}
            className="flex flex-col gap-2 mt-4">
            {classics.length === 0 ? (
              <p className="text-xs text-center py-8 font-light" style={{ color: "var(--text-3)" }}>
                Tes plats habituels apparaîtront ici dès que tu en auras enregistré quelques-uns.
              </p>
            ) : (
              classics.map((r, i) => (
                <motion.button key={i} whileTap={{ scale: 0.98 }} onClick={() => { onQuickAdd(r); reset(); }}
                  className="flex items-center gap-3 p-3.5 rounded-2xl cursor-pointer text-left"
                  style={{ background: "rgba(var(--tint-violet-rgb),0.5)", border: "1px solid rgba(var(--violet-mid-rgb),0.35)" }}>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(var(--accent-rgb),0.15)" }}>
                    <Plus size={14} strokeWidth={2.5} style={{ color: "var(--accent)" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-tight truncate" style={{ color: "var(--text-1)" }}>{r.name}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: "var(--text-3)" }}>
                      {r.calories} kcal{(r.count ?? 0) >= 2 ? ` · ${r.count}×` : ""}
                    </p>
                  </div>
                </motion.button>
              ))
            )}
          </motion.div>
        )}

        {/* J'ai des trucs à finir : saisie d'ingrédients */}
        {sit !== null && screen === "finish" && (
          <motion.div key="finish"
            initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }}
            className="flex flex-col gap-3 mt-4">
            <p className="text-xs font-light leading-relaxed" style={{ color: "var(--text-2)" }}>
              Dis-moi ce que tu as sous la main, je te trouve un plat — rien à acheter.
            </p>
            <div className="flex gap-2">
              <input value={ingInput} onChange={(e) => setIngInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addIngredients(ingInput); }}
                placeholder="Ex : courgettes, feta, œufs…"
                className="flex-1 px-3.5 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: "rgba(var(--tint-violet-rgb),0.5)", border: "1px solid rgba(var(--violet-mid-rgb),0.5)", color: "var(--text-1)" }} />
              <motion.button whileTap={{ scale: 0.94 }} onClick={() => addIngredients(ingInput)} disabled={!ingInput.trim()}
                className="px-3.5 rounded-xl text-sm font-semibold cursor-pointer flex-shrink-0"
                style={{ background: ingInput.trim() ? "rgba(var(--accent-rgb),0.16)" : "rgba(var(--tint-violet-rgb),0.4)", color: "var(--accent)" }}>
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
                <p className="text-[10px] font-semibold tracking-widest uppercase mb-1.5" style={{ color: "var(--text-3)" }}>Suggestions</p>
                <div className="flex flex-wrap gap-1.5">
                  {baseSuggestions.filter((s) => !ingredients.some((i) => i.toLowerCase() === s.toLowerCase())).map((s) => (
                    <button key={s} onClick={() => addIngredients(s)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs cursor-pointer"
                      style={{ background: "rgba(var(--tint-violet-rgb),0.5)", color: "var(--text-2)", border: "1px solid rgba(var(--violet-mid-rgb),0.35)" }}>
                      <Plus size={11} strokeWidth={2.5} style={{ color: "var(--accent)" }} /> {s}
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
              onClose={closeRecipe}
              onLog={(m) => { onLogIdea(m); closeRecipe(); }}
              onOther={recipeList.length > 1 ? () => setRecipeIndex((i) => (i + 1) % recipeList.length) : undefined}
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
                <p className="text-sm" style={{ color: "var(--text-1)" }}>La banque de recettes se remplit&nbsp;!</p>
                <p className="text-xs mt-1.5 font-light" style={{ color: "var(--text-3)" }}>Aucune recette pour ce filtre pour l&apos;instant — reviens vite.</p>
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
    </motion.div>
  );
}
