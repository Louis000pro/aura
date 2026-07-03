"use client";

/* ════════════════════════════════════════════════════════════════════
   MealSituationHero — le nouveau #1 de la page nutrition.

   On ne prescrit plus (fini le gros anneau-culpabilité en tête). On pose une
   question humaine — « On mange où ? » — et on ouvre la bonne boîte à outils
   selon la situation réelle : à la maison (je cuisine), resto & livraison (on
   me sert), sur le pouce (sans cuisine). 2 taps max.

   Phase 1 : câblage aux flux existants (Photo IA, code-barres, manuel, coups
   de cœur). Phase 2 : « À la maison » complet — sous-intentions « Une idée » /
   « Vite fait » → carte résultat immersive + « je fais ça » + « Autre ».
   Voir [[nutrition-onmangeou-redesign]].
   ════════════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home, UtensilsCrossed, Sandwich, Sparkles, Heart, Camera, Barcode,
  Plus, MessageSquare, ChevronRight, ChevronLeft, X, Clock, RefreshCw, Loader2, Check,
} from "lucide-react";
import { loadTasteProfileLocal } from "@/lib/tasteProfile";
import { fetchIdeas, mealTypeFromHour, type Idea } from "@/lib/mealIdeas";

type Classic = { name: string; calories: number; proteins: number; carbs: number; fats: number; count?: number };
type LoggedMeal = { name: string; calories: number; proteins: number; carbs: number; fats: number };

type Props = {
  name?: string | null;
  userId?: string | null;
  calorieTarget: number;
  onPhoto: () => void;      // Photo IA (scan assiette / photo)
  onBarcode: () => void;    // Code-barres
  onManual: () => void;     // Saisie manuelle / « je note juste »
  onSkip: () => void;       // « Je saute ce repas » (sans jugement)
  classics: Classic[];      // Coups de cœur (plats fréquents) — ajout 1 tap
  onQuickAdd: (r: Classic) => void;
  onLogIdea: (m: LoggedMeal) => void; // « Je fais ça » → journal du jour
};

type SituationKey = "maison" | "resto" | "pouce";
type SheetView = "menu" | "classics" | "ideas";

const SITUATIONS: {
  key: SituationKey; label: string; sub: string;
  Icon: typeof Home; gradient: string; img: string;
}[] = [
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

/* Dégradé « plat chaud » pour la carte résultat (photos réelles = plus tard). */
const DISH_GRADIENT =
  "radial-gradient(circle at 28% 20%,#FFE0A0,transparent 45%),radial-gradient(circle at 74% 64%,#E8620C,transparent 52%),linear-gradient(158deg,#F19A3C,#9E3E0E)";

function greeting(): { hello: string; moment: string } {
  const h = new Date().getHours();
  const moment = h < 10 ? "ce matin" : h < 15 ? "ce midi" : h < 18 ? "cet aprèm" : "ce soir";
  const hello = h < 18 ? "Bonjour" : "Bonsoir";
  return { hello, moment };
}

/* Une action de la bottom-sheet (2ᵉ tap) */
type Action = { label: string; desc?: string; Icon: typeof Home; run: () => void };

export default function MealSituationHero({
  name, userId, calorieTarget, onPhoto, onBarcode, onManual, onSkip,
  classics, onQuickAdd, onLogIdea,
}: Props) {
  const [active, setActive] = useState<SituationKey | null>(null);
  const [view, setView] = useState<SheetView>("menu");
  const { hello, moment } = greeting();

  /* ── Idées « À la maison » (chargées à la demande, gardées pour la session) ── */
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [ideaIndex, setIdeaIndex] = useState(0);
  const [ideasLoading, setIdeasLoading] = useState(false);
  const [ideasQuick, setIdeasQuick] = useState(false);

  const close = () => { setActive(null); setView("menu"); };
  const pick = (fn: () => void) => { close(); fn(); };

  const openIdeas = async (quick: boolean) => {
    setIdeasQuick(quick);
    setIdeaIndex(0);
    setView("ideas");
    if (ideas.length) return; // déjà chargées cette session
    setIdeasLoading(true);
    const taste = userId ? loadTasteProfileLocal(userId) : null;
    let diet: string[] = [];
    try {
      if (userId) { const raw = localStorage.getItem(`vaiiya_diet_${userId}`); if (raw) diet = JSON.parse(raw); }
    } catch { /* ignore */ }
    const favorites = classics.map((c) => c.name).slice(0, 10);
    const list = await fetchIdeas({ mealType: mealTypeFromHour(), calorieTarget, taste, diet, favorites });
    setIdeas(list);
    setIdeasLoading(false);
  };

  /* Sous-intentions par situation */
  const actionsFor = (key: SituationKey): Action[] => {
    if (key === "maison") return [
      { label: "Une idée qui me tente", desc: "des plats adaptés à tes goûts", Icon: Sparkles, run: () => openIdeas(false) },
      { label: "Vite fait",            desc: "prêt en 15 min ou moins",        Icon: Clock,    run: () => openIdeas(true) },
      { label: "Mes classiques",       desc: "tes plats les plus fréquents",   Icon: Heart,    run: () => setView("classics") },
      { label: "Ajouter à la main",    desc: "je sais déjà ce que je fais",    Icon: Plus,     run: () => pick(onManual) },
    ];
    if (key === "resto") return [
      { label: "Scanner mon assiette",       desc: "l'IA lit ton plat en photo", Icon: Camera,        run: () => pick(onPhoto) },
      { label: "Décrire ce que j'ai mangé",  desc: "en quelques mots",           Icon: MessageSquare, run: () => pick(onManual) },
    ];
    return [
      { label: "Scanner un code-barres", desc: "produit emballé",        Icon: Barcode, run: () => pick(onBarcode) },
      { label: "Prendre une photo",      desc: "l'IA estime les macros", Icon: Camera,  run: () => pick(onPhoto) },
      { label: "À la main",              desc: "rapide",                 Icon: Plus,    run: () => pick(onManual) },
    ];
  };

  const activeSituation = SITUATIONS.find((s) => s.key === active) ?? null;

  /* Plat courant (filtré « vite fait » le cas échéant) */
  const shown = ideasQuick ? ideas.filter((d) => (d.prepMin ?? 99) <= 15) : ideas;
  const pool = shown.length ? shown : ideas;
  const dish = pool.length ? pool[ideaIndex % pool.length] : null;

  const heading = view === "classics" ? "Mes classiques" : view === "ideas"
    ? (ideasQuick ? "Vite fait" : "Une idée pour toi") : activeSituation?.label;

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
      {/* Eyebrow + question */}
      <p className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: "var(--text-3)" }}>
        {hello}{name ? ` ${name}` : ""} · {moment}
      </p>
      <h2 className="text-2xl font-light mt-1" style={{ color: "var(--text-1)" }}>
        On mange où&nbsp;?
      </h2>
      <p className="text-[11.5px] mt-1.5 flex items-center gap-1.5" style={{ color: "var(--text-3)" }}>
        <span className="inline-block w-[7px] h-[7px] rounded-full flex-shrink-0" style={{ background: "#8B5CF6" }} />
        Dis-moi où, je m&apos;occupe du reste.
      </p>

      {/* Les 3 portes — cartes photo, légende sur l'image */}
      <div className="grid grid-cols-3 gap-2.5 mt-4">
        {SITUATIONS.map(({ key, label, sub, Icon, gradient, img }) => (
          <motion.button
            key={key}
            whileTap={{ scale: 0.96 }}
            onClick={() => { setActive(key); setView("menu"); }}
            className="relative overflow-hidden rounded-2xl cursor-pointer text-left"
            style={{ minHeight: 172, background: gradient }}
          >
            {/* Vraie photo si présente (public/nutrition/<key>.jpg), sinon le dégradé */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img} alt="" aria-hidden loading="lazy" decoding="async"
              onError={(e) => { e.currentTarget.style.display = "none"; }}
              className="absolute inset-0 w-full h-full object-cover"
            />
            {/* Icône-texture discrète */}
            <Icon size={30} strokeWidth={1.5}
              className="absolute" style={{ top: 10, right: 10, color: "rgba(255,255,255,0.28)" }} />
            {/* Voile bas pour la lisibilité de la légende */}
            <div className="absolute inset-x-0 bottom-0" style={{
              height: "62%",
              background: "linear-gradient(to top,rgba(14,7,18,0.86),rgba(14,7,18,0.35) 55%,transparent)",
            }} />
            {/* Légende */}
            <div className="absolute inset-x-0 bottom-0 p-3">
              <p className="text-[13px] font-medium leading-tight" style={{ color: "#fff" }}>{label}</p>
              <p className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.82)" }}>{sub}</p>
            </div>
          </motion.button>
        ))}
      </div>

      {/* Filet anti-culpabilité — toujours là, discret */}
      <div className="flex items-center justify-center gap-3 mt-3.5">
        <button onClick={onManual} className="text-[11px] cursor-pointer" style={{ color: "var(--text-3)" }}>
          J&apos;ai déjà mangé
        </button>
        <span className="text-[11px]" style={{ color: "var(--text-3)", opacity: 0.5 }}>·</span>
        <button onClick={onSkip} className="text-[11px] cursor-pointer" style={{ color: "var(--text-3)" }}>
          Je saute ce repas
        </button>
      </div>

      {/* ── Bottom-sheet : 2ᵉ tap ── */}
      <AnimatePresence>
        {active && activeSituation && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end md:items-center justify-center px-4 pb-6 md:pb-0"
            style={{ background: "rgba(var(--tint-violet-rgb),0.5)", backdropFilter: "blur(16px)" }}
            onClick={close}
          >
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30 }}
              transition={{ type: "spring", damping: 26, stiffness: 280 }}
              className="w-full max-w-sm rounded-3xl overflow-hidden"
              style={{
                background: "rgb(var(--surface-rgb))",
                border: "1px solid rgba(var(--accent-rgb),0.14)",
                boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
                maxHeight: "88dvh", overflowY: "auto",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header sheet */}
              <div className="flex items-center justify-between p-5 pb-3">
                <div className="flex items-center gap-2.5">
                  {view !== "menu" && (
                    <button onClick={() => setView("menu")}
                      className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer flex-shrink-0"
                      style={{ background: "rgba(var(--tint-violet-rgb),0.8)" }}>
                      <ChevronLeft size={15} strokeWidth={2} style={{ color: "var(--text-2)" }} />
                    </button>
                  )}
                  <div>
                    <p className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: "var(--text-3)" }}>
                      {activeSituation.sub}
                    </p>
                    <h3 className="text-lg font-light" style={{ color: "var(--text-1)" }}>{heading}</h3>
                  </div>
                </div>
                <button onClick={close}
                  className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer flex-shrink-0"
                  style={{ background: "rgba(var(--tint-violet-rgb),0.8)" }}>
                  <X size={14} strokeWidth={2} style={{ color: "var(--text-3)" }} />
                </button>
              </div>

              <div className="px-5 pb-6">
                <AnimatePresence mode="wait">
                  {/* ── Menu des sous-intentions ── */}
                  {view === "menu" && (
                    <motion.div key="menu"
                      initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}
                      className="flex flex-col gap-2.5">
                      {actionsFor(activeSituation.key).map(({ label, desc, Icon, run }) => (
                        <motion.button key={label} whileTap={{ scale: 0.98 }} onClick={run}
                          className="flex items-center gap-3 p-3.5 rounded-2xl cursor-pointer text-left"
                          style={{ background: "rgba(var(--tint-violet-rgb),0.5)", border: "1px solid rgba(var(--violet-mid-rgb),0.35)" }}>
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ background: "rgba(var(--accent-rgb),0.14)" }}>
                            <Icon size={19} strokeWidth={1.6} style={{ color: "var(--accent)" }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium leading-tight" style={{ color: "var(--text-1)" }}>{label}</p>
                            {desc && <p className="text-[11px] mt-0.5" style={{ color: "var(--text-3)" }}>{desc}</p>}
                          </div>
                          <ChevronRight size={17} strokeWidth={2} style={{ color: "var(--text-3)" }} />
                        </motion.button>
                      ))}
                    </motion.div>
                  )}

                  {/* ── Mes classiques ── */}
                  {view === "classics" && (
                    <motion.div key="classics"
                      initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}
                      className="flex flex-col gap-2">
                      {classics.length === 0 ? (
                        <p className="text-xs text-center py-6 font-light" style={{ color: "var(--text-3)" }}>
                          Tes plats habituels apparaîtront ici dès que tu en auras enregistré quelques-uns.
                        </p>
                      ) : (
                        classics.map((r, i) => (
                          <motion.button key={i} whileTap={{ scale: 0.98 }}
                            onClick={() => pick(() => onQuickAdd(r))}
                            className="flex items-center gap-3 p-3 rounded-2xl cursor-pointer text-left"
                            style={{ background: "rgba(var(--tint-violet-rgb),0.5)", border: "1px solid rgba(var(--violet-mid-rgb),0.35)" }}>
                            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                              style={{ background: "rgba(var(--accent-rgb),0.15)" }}>
                              <Plus size={13} strokeWidth={2.5} style={{ color: "var(--accent)" }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] font-medium leading-tight truncate" style={{ color: "var(--text-1)" }}>{r.name}</p>
                              <p className="text-[10px] mt-0.5" style={{ color: "var(--text-3)" }}>
                                {r.calories} kcal{(r.count ?? 0) >= 2 ? ` · ${r.count}×` : ""}
                              </p>
                            </div>
                          </motion.button>
                        ))
                      )}
                    </motion.div>
                  )}

                  {/* ── Une idée / Vite fait : carte résultat immersive ── */}
                  {view === "ideas" && (
                    <motion.div key="ideas"
                      initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}
                      className="flex flex-col gap-3">
                      {ideasLoading ? (
                        <div className="flex flex-col items-center justify-center gap-3 py-12">
                          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}>
                            <Loader2 size={30} strokeWidth={1.5} style={{ color: "var(--accent)" }} />
                          </motion.div>
                          <p className="text-xs font-medium" style={{ color: "var(--text-2)" }}>Je te trouve une bonne idée…</p>
                        </div>
                      ) : !dish ? (
                        <p className="text-xs text-center py-8 font-light" style={{ color: "var(--text-3)" }}>
                          Aucune idée sous la main pour l&apos;instant. Réessaie dans un instant.
                        </p>
                      ) : (
                        <>
                          {/* Carte photo, légende sur l'image */}
                          <div className="relative overflow-hidden rounded-2xl" style={{ minHeight: 196, background: DISH_GRADIENT }}>
                            <UtensilsCrossed size={64} strokeWidth={1.5}
                              className="absolute" style={{ top: 22, left: "50%", transform: "translateX(-50%)", color: "rgba(255,255,255,0.9)" }} />
                            <div className="absolute flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                              style={{ top: 12, left: 12, background: "rgba(20,12,24,0.42)", backdropFilter: "blur(6px)" }}>
                              <Sparkles size={12} style={{ color: "#fff" }} />
                              <span className="text-[10px] font-medium" style={{ color: "#fff" }}>pour toi</span>
                            </div>
                            <div className="absolute inset-x-0 bottom-0" style={{
                              height: "62%",
                              background: "linear-gradient(to top,rgba(14,7,18,0.9),rgba(14,7,18,0.4) 55%,transparent)",
                            }} />
                            <div className="absolute inset-x-0 bottom-0 p-3.5">
                              <p className="text-base font-medium leading-tight" style={{ color: "#fff" }}>{dish.nom}</p>
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ color: "#fff", background: "rgba(255,255,255,0.16)" }}>
                                  {dish.calories} kcal
                                </span>
                                {dish.proteins > 0 && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ color: "#fff", background: "rgba(139,92,246,0.55)" }}>
                                    {dish.proteins}g protéines
                                  </span>
                                )}
                              </div>
                              <p className="text-[10.5px] mt-2" style={{ color: "rgba(255,255,255,0.85)" }}>
                                {dish.prepMin ? `prêt en ${dish.prepMin} min` : "facile à préparer"}
                                {dish.difficulty ? ` · ${dish.difficulty}` : ""}
                              </p>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2">
                            <motion.button whileTap={{ scale: 0.97 }}
                              onClick={() => pick(() => onLogIdea({ name: dish.nom, calories: dish.calories, proteins: dish.proteins, carbs: dish.carbs, fats: dish.fats }))}
                              className="flex-1 py-3 rounded-2xl text-sm font-semibold cursor-pointer flex items-center justify-center gap-2"
                              style={{ background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", color: "#fff", boxShadow: "0 4px 16px rgba(147,60,200,0.4)" }}>
                              <Check size={16} strokeWidth={2.5} /> Je fais ça
                            </motion.button>
                            <motion.button whileTap={{ scale: 0.95 }}
                              onClick={() => setIdeaIndex((i) => i + 1)}
                              className="flex items-center gap-1.5 px-4 py-3 rounded-2xl text-sm font-medium cursor-pointer flex-shrink-0"
                              style={{ background: "rgba(var(--tint-violet-rgb),0.6)", color: "var(--text-2)", border: "1px solid rgba(var(--violet-mid-rgb),0.4)" }}>
                              <RefreshCw size={14} strokeWidth={2} /> Autre
                            </motion.button>
                          </div>
                        </>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
