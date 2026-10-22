"use client";

/* Le code-barres d'un produit emballé : Open Food Facts d'abord, une
   estimation si le produit n'y est pas. Sortie de NutritionTab.tsx le
   2026-10-22 avec les trois autres modales d'ajout. */

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, Barcode, Minus, Plus } from "lucide-react";
import { aiFetch } from "@/lib/aiFetch";
import { AssistantSpark } from "@/components/AssistantMark";
import MacroTiles from "@/components/MacroTiles";
import { MEAL_META, heureMaintenant, momentActuel, type MealType, type MealEntry } from "@/lib/repas";

/* ─── BarcodeScannerModal ────────────────────────────────────────────── */
type BarcodePhase = "scan" | "loading" | "result" | "fallback";

interface BarcodeProduct {
  name: string;
  brand: string | null;
  image: string | null;
  nutriscore: string | null;
  quantity: string | null;
  per100: { calories: number; proteins: number; carbs: number; fats: number; fiber: number };
}

/* Couleurs officielles du Nutri-Score (fixes, non liées au thème). */
const NUTRISCORE_COLOR: Record<string, string> = {
  A: "#038141", B: "#85BB2F", C: "#FECB02", D: "#EE8100", E: "#E63E11",
};

interface BarcodeEstimated {
  foodName: string;
  calories: number;
  proteins: number;
  carbs: number;
  fats: number;
  mealType: MealType;
}

export default function BarcodeScannerModal({ onClose, onAdd, typeInitial }: {
  /** Le moment déjà choisi dans « Ajouter un repas » : il prime sur l'heure. */
  typeInitial?: MealType;
  onClose: () => void;
  onAdd: (meal: Omit<MealEntry, "id">) => void;
}) {
  const [phase, setPhase] = useState<BarcodePhase>("scan");
  const [product, setProduct] = useState<BarcodeProduct | null>(null);
  const [grams, setGrams] = useState("100");
  const [mealType, setMealType] = useState<MealType>(typeInitial ?? momentActuel());
  const [error, setError] = useState<string | null>(null);
  // Fallback IA
  const [fallbackName, setFallbackName] = useState("");
  const [estimating, setEstimating] = useState(false);
  const [estimated, setEstimated] = useState<BarcodeEstimated | null>(null);
  const [estimateMealType, setEstimateMealType] = useState<MealType>(typeInitial ?? momentActuel());

  const scannerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const html5QrRef = useRef<any>(null);
  const didStop = useRef(false);

  // Masque la barre de nav du bas tant que la modale est ouverte (sinon elle recouvre les boutons sur mobile).
  useEffect(() => {
    document.body.classList.add("modal-open");
    return () => document.body.classList.remove("modal-open");
  }, []);

  const stopScanner = async () => {
    if (html5QrRef.current && !didStop.current) {
      didStop.current = true;
      try { await html5QrRef.current.stop(); } catch { /* already stopped */ }
    }
  };

  const lookupBarcode = async (code: string) => {
    await stopScanner();
    setPhase("loading");
    setError(null);
    try {
      const res = await aiFetch(`/api/nutrition/barcode?code=${encodeURIComponent(code)}`);
      const data = await res.json();
      if (res.status === 404) {
        // Produit totalement inconnu
        setFallbackName("");
        setEstimated(null);
        setPhase("fallback");
        return;
      }
      if (!res.ok) throw new Error("Erreur réseau");
      if (data.partial) {
        // Produit trouvé mais sans nutrition → fallback IA pré-rempli
        const pre = data.brand ? `${data.name} ${data.brand}` : data.name;
        setFallbackName(pre);
        setEstimated(null);
        setPhase("fallback");
        return;
      }
      setProduct(data as BarcodeProduct);
      setPhase("result");
    } catch {
      setError("Impossible de récupérer le produit, réessaie.");
      setPhase("scan");
      didStop.current = false;
      startScanner();
    }
  };

  const estimateByAI = async () => {
    if (!fallbackName.trim()) return;
    setEstimating(true);
    setError(null);
    try {
      const res = await aiFetch("/api/nutrition/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: fallbackName.trim() }),
      });
      if (!res.ok) throw new Error("Estimation échouée");
      const data = await res.json();
      setEstimated({
        foodName: data.foodName || fallbackName,
        calories: data.calories || 0,
        proteins: data.proteins || 0,
        carbs: data.carbs || 0,
        fats: data.fats || 0,
        mealType: typeInitial ?? (data.mealType || momentActuel()),
      });
      setEstimateMealType(typeInitial ?? (data.mealType || momentActuel()));
    } catch {
      setError("Estimation impossible pour ce produit.");
    } finally {
      setEstimating(false);
    }
  };

  const handleConfirmEstimate = () => {
    if (!estimated) return;
    onAdd({
      name: estimated.foodName,
      calories: estimated.calories,
      proteins: estimated.proteins,
      carbs: estimated.carbs,
      fats: estimated.fats,
      time: heureMaintenant(),
      mealType: estimateMealType,
    });
  };

  const startScanner = () => {
    if (!scannerRef.current) return;
    import("html5-qrcode").then(({ Html5Qrcode }) => {
      const scannerId = "aura-barcode-reader";
      // Ensure container exists
      if (!document.getElementById(scannerId)) return;
      const scanner = new Html5Qrcode(scannerId, { verbose: false });
      html5QrRef.current = scanner;
      scanner.start(
        { facingMode: "environment" },
        // Pas de `qrbox` : la lib ne dessine pas son propre cadre → on garde
        // seulement notre viseur (repères + balayage), cohérent avec la Photo IA.
        { fps: 10, aspectRatio: 1 },
        (decodedText: string) => { lookupBarcode(decodedText); },
        () => { /* scan attempt, ignore errors */ }
      ).catch((err: unknown) => {
        console.error("Camera error:", err);
        setError("Caméra inaccessible, autorise l’accès à l’appareil photo.");
      });
    });
  };

  useEffect(() => {
    const t = setTimeout(startScanner, 120);
    return () => {
      clearTimeout(t);
      stopScanner();
    };
  }, []); // eslint-disable-line

  const computedMacros = product ? {
    calories: Math.round(product.per100.calories * Number(grams) / 100),
    proteins: Math.round(product.per100.proteins * Number(grams) / 100 * 10) / 10,
    carbs:    Math.round(product.per100.carbs    * Number(grams) / 100 * 10) / 10,
    fats:     Math.round(product.per100.fats     * Number(grams) / 100 * 10) / 10,
  } : null;

  const handleConfirm = () => {
    if (!product || !computedMacros) return;
    const label = product.brand ? `${product.name} (${product.brand})` : product.name;
    onAdd({
      name: label,
      calories: computedMacros.calories,
      proteins: computedMacros.proteins,
      carbs: computedMacros.carbs,
      fats: computedMacros.fats,
      time: heureMaintenant(),
      mealType,
    });
  };

  const restart = () => {
    setPhase("scan");
    setProduct(null);
    setGrams("100");
    setError(null);
    didStop.current = false;
    setTimeout(startScanner, 80);
  };

  const CARD_STYLE = {
    background: "rgb(var(--surface-rgb))",
    border: "1px solid rgba(var(--accent-rgb),0.14)",
    boxShadow: "var(--ombre-flottant)",
    maxHeight: "90dvh",
    overflowY: "auto" as const,
  };

  const adjustGrams = (delta: number) => {
    setGrams(g => String(Math.max(1, (parseInt(g) || 100) + delta)));
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-end md:items-center justify-center px-4 pb-6 md:pb-0"
      style={{ background: "rgba(var(--tint-violet-rgb),0.5)", backdropFilter: "blur(16px)" }}
      onClick={onClose}>

      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30 }}
        transition={{ type: "spring", damping: 26, stiffness: 280 }}
        className="w-full max-w-sm rounded-3xl overflow-x-hidden"
        style={CARD_STYLE}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between p-5 pb-4">
          <div>
            <p className="vy-label" style={{ color: "var(--text-3)" }}>
              Scanner
            </p>
            <h2 className="text-[20px] font-semibold" style={{ color: "var(--text-1)" }}>
              {phase === "scan"     ? "Scanner un produit"
               : phase === "loading" ? "Recherche du produit…"
               : phase === "fallback"
                 ? (estimated ? "Produit estimé" : "Décris le produit")
               : "Produit identifié"}
            </h2>
          </div>
          <motion.button whileTap={{ scale: 0.9 }} onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer"
            style={{ background: "rgba(var(--tint-violet-rgb),0.8)" }}>
            <X size={14} strokeWidth={2} style={{ color: "var(--text-3)" }} />
          </motion.button>
        </div>

        <div className="px-5 pb-6">
          <AnimatePresence mode="wait">

            {/* SCAN */}
            {phase === "scan" && (
              <motion.div key="scan"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col gap-3">

                {error && (
                  <div className="px-3 py-2.5 rounded-2xl text-[13px] font-medium"
                    style={{ background: "rgba(242,109,109,0.12)", color: "#F2685F", border: "1px solid rgba(242,109,109,0.28)" }}>
                    ⚠️ {error}
                  </div>
                )}

                {/* Viseur caméra LIVE — plein cadre, cohérent avec la Photo IA */}
                <div className="relative rounded-2xl overflow-hidden"
                  style={{ background: "linear-gradient(160deg,#2A2140,#140E22)", height: 320 }}>
                  {/* html5-qrcode injecte sa <video> ici → forcée en object-fit cover (globals.css) */}
                  <div id="aura-barcode-reader" ref={scannerRef} className="absolute inset-0" style={{ width: "100%", height: "100%" }} />
                  <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(180deg,rgba(var(--voile-photo-rgb),0.12),rgba(var(--voile-photo-rgb),0.32))" }} />
                  {/* repères d'angle (mêmes que la Photo IA) */}
                  {[["top-3 left-3", "border-t-2 border-l-2 rounded-tl-xl"],
                    ["top-3 right-3", "border-t-2 border-r-2 rounded-tr-xl"],
                    ["bottom-3 left-3", "border-b-2 border-l-2 rounded-bl-xl"],
                    ["bottom-3 right-3", "border-b-2 border-r-2 rounded-br-xl"],
                  ].map(([pos, cls], i) => (
                    <div key={i} className={`absolute w-7 h-7 ${pos} ${cls} pointer-events-none`} style={{ borderColor: "rgba(255,255,255,0.85)" }} />
                  ))}
                  {/* Balayage lumineux violet↗or (signature Vaiiya) */}
                  <motion.div
                    className="absolute left-6 right-6 pointer-events-none"
                    style={{ height: 2, background: "linear-gradient(90deg,transparent,#FFD98A,var(--accent),transparent)", boxShadow: "0 0 10px rgba(255,217,138,0.6)" }}
                    animate={{ top: ["12%", "88%", "12%"] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  />
                  <div className="absolute left-1/2 bottom-3 -translate-x-1/2 whitespace-nowrap text-[11px] font-semibold px-3 py-1.5 rounded-full pointer-events-none"
                    style={{ background: "var(--verre-photo)", color: "#fff", backdropFilter: "blur(16px) saturate(170%)", WebkitBackdropFilter: "blur(16px) saturate(170%)" }}>
                    Centre le code-barres
                  </div>
                </div>
              </motion.div>
            )}

            {/* LOADING */}
            {phase === "loading" && (
              <motion.div key="loading"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-4 py-8">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}>
                  <Loader2 size={36} strokeWidth={1.5} style={{ color: "var(--exp-encre)" }} />
                </motion.div>
                <motion.p animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.6, repeat: Infinity }}
                  className="text-[13px] font-medium" style={{ color: "var(--text-2)" }}>
                  Recherche dans Open Food Facts…
                </motion.p>
              </motion.div>
            )}

            {/* FALLBACK IA — produit non référencé ou sans nutrition */}
            {phase === "fallback" && (
              <motion.div key="fallback"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex flex-col gap-3">

                {/* Bandeau d'info — ton positif, tokenisé (clair + sombre) */}
                {!estimated && (
                  <div className="flex items-start gap-2.5 px-3 py-3 rounded-2xl"
                    style={{ background: "rgba(var(--tint-violet-rgb),0.6)", border: "1px solid rgba(var(--violet-mid-rgb),0.35)" }}>
                    <span className="flex-shrink-0" style={{ marginTop: 1 }}><AssistantSpark px={15} /></span>
                    <p className="text-[13px] font-light leading-relaxed" style={{ color: "var(--text-2)" }}>
                      {fallbackName
                        ? "Trouvé, mais sans données nutritionnelles. Décris-le, je m’occupe des chiffres."
                        : "Pas encore dans la base. Décris-le, je m’occupe des chiffres."}
                    </p>
                  </div>
                )}

                {/* Champ nom + bouton estimer */}
                {!estimated && (
                  <>
                    <div>
                      <label className="vy-label mb-1.5 block"
                        style={{ color: "var(--text-3)" }}>Nom du produit</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={fallbackName}
                          onChange={e => setFallbackName(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter" && fallbackName.trim()) estimateByAI(); }}
                          placeholder="Ex : Yaourt grec Fage 0%, 150g…"
                          autoFocus
                          className="flex-1 px-4 py-2.5 rounded-xl text-[16px] outline-none"
                          style={{ background: "rgba(var(--tint-violet-rgb),0.5)", border: "1px solid rgba(var(--violet-mid-rgb),0.5)", color: "var(--text-1)" }}
                        />
                        <motion.button
                          whileTap={{ scale: 0.93 }}
                          onClick={estimateByAI}
                          disabled={!fallbackName.trim() || estimating}
                          className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-[13px] font-semibold cursor-pointer flex-shrink-0"
                          style={{
                            background: fallbackName.trim() && !estimating
                              ? "linear-gradient(135deg,#8B5CF6,#C13BC1)"
                              : "rgba(var(--tint-violet-rgb),0.6)",
                            color: fallbackName.trim() && !estimating ? "#fff" : "var(--text-3)",
                            boxShadow: fallbackName.trim() && !estimating ? "var(--ombre-action)" : "none",
                            minWidth: 80, justifyContent: "center",
                          }}>
                          {estimating
                            ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}>
                                <Loader2 size={13} strokeWidth={2} />
                              </motion.div>
                            : <>Estimer</>}
                        </motion.button>
                      </div>
                      <p className="text-[11px] mt-1.5 font-light" style={{ color: "var(--text-3)" }}>
                        Précise la marque et la quantité.
                      </p>
                    </div>

                    {error && (
                      <div className="px-3 py-2 rounded-xl text-[13px]"
                        style={{ background: "rgba(252,129,129,0.1)", color: "#E53E3E" }}>
                        ⚠️ {error}
                      </div>
                    )}

                    <div className="flex gap-2 mt-1">
                      <motion.button whileTap={{ scale: 0.95 }} onClick={restart}
                        className="flex-1 py-2.5 rounded-2xl text-[13px] font-semibold cursor-pointer"
                        style={{ background: "rgba(var(--tint-violet-rgb),0.6)", color: "var(--exp-encre)", border: "1px solid rgba(var(--accent-rgb),0.25)" }}>
                        ↩ Rescanner
                      </motion.button>
                      <motion.button whileTap={{ scale: 0.95 }} onClick={onClose}
                        className="flex-1 py-2.5 rounded-2xl text-[13px] font-medium cursor-pointer"
                        style={{ background: "rgba(var(--tint-violet-rgb),0.4)", color: "var(--text-2)", border: "1px solid rgba(var(--violet-mid-rgb),0.3)" }}>
                        Annuler
                      </motion.button>
                    </div>
                  </>
                )}

                {/* Résultat IA */}
                {estimated && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col gap-3">

                    {/* Estimation IA — mini fiche */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="vy-label flex items-center gap-1" style={{ color: "var(--exp-encre)" }}>
                          Estimation
                        </p>
                        <p className="font-semibold text-[16px] leading-tight mt-1" style={{ color: "var(--text-1)" }}>
                          {estimated.foodName}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="vy-nombre text-[26px] leading-none" style={{ fontWeight: 500, color: "var(--exp-encre)" }}>{estimated.calories}</p>
                        <p className="text-[11px] mt-1" style={{ color: "var(--text-3)" }}>kcal</p>
                      </div>
                    </div>
                    <MacroTiles proteins={estimated.proteins} carbs={estimated.carbs} fats={estimated.fats} />

                    {/* Type de repas */}
                    <div>
                      <label className="vy-label mb-1.5 block"
                        style={{ color: "var(--text-3)" }}>Type de repas</label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {(Object.keys(MEAL_META) as MealType[]).map(mt => (
                          <motion.button key={mt} whileTap={{ scale: 0.95 }}
                            onClick={() => setEstimateMealType(mt)}
                            className="py-2 rounded-xl text-[11px] font-medium cursor-pointer flex items-center justify-center gap-1.5"
                            style={{
                              background: estimateMealType === mt ? "rgba(var(--accent-rgb),0.15)" : "rgba(var(--tint-violet-rgb),0.5)",
                              border: estimateMealType === mt ? "1px solid rgba(var(--accent-rgb),0.35)" : "1px solid rgba(var(--violet-mid-rgb),0.3)",
                              color: estimateMealType === mt ? "var(--text-1)" : "var(--text-2)",
                            }}>
                            <span style={{ fontSize: 13 }}>{MEAL_META[mt].icon}</span>
                            <span>{MEAL_META[mt].label}</span>
                          </motion.button>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <motion.button whileTap={{ scale: 0.95 }}
                        onClick={() => { setEstimated(null); setError(null); }}
                        className="flex-1 py-3 rounded-2xl text-[13px] font-medium cursor-pointer"
                        style={{ background: "rgba(var(--tint-violet-rgb),0.6)", color: "var(--text-2)", border: "1px solid rgba(var(--violet-mid-rgb),0.4)" }}>
                        Modifier
                      </motion.button>
                      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                        onClick={handleConfirmEstimate}
                        className="flex-[2] py-3 rounded-2xl text-[16px] font-bold cursor-pointer flex items-center justify-center gap-2"
                        style={{ background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", color: "#fff", boxShadow: "var(--ombre-action)" }}>
                        <Plus size={16} strokeWidth={2.5} /> Ajouter à ma journée
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* RESULT */}
            {phase === "result" && product && computedMacros && (
              <motion.div key="result"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex flex-col gap-3">

                {/* Product card */}
                <div className="flex items-center gap-3 p-3 rounded-2xl"
                  style={{ background: "rgba(var(--tint-violet-rgb),0.4)", border: "1px solid rgba(var(--violet-mid-rgb),0.3)" }}>
                  {product.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img loading="lazy" decoding="async" src={product.image} alt={product.name}
                      className="w-14 h-14 rounded-xl object-contain flex-shrink-0"
                      style={{ background: "#fff" }} />
                  ) : (
                    <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: "rgba(var(--accent-rgb),0.1)" }}>
                      <Barcode size={20} strokeWidth={1.5} style={{ color: "var(--exp-encre)" }} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[16px] leading-tight" style={{ color: "var(--text-1)" }}>
                      {product.name}
                    </p>
                    {product.brand && (
                      <p className="text-[11px] mt-0.5 font-light" style={{ color: "var(--text-2)" }}>{product.brand}</p>
                    )}
                    {product.quantity && (
                      <p className="text-[11px] mt-0.5" style={{ color: "var(--text-3)" }}>{product.quantity}</p>
                    )}
                  </div>
                  {/* Nutri-Score (si connu) */}
                  {product.nutriscore && (
                    <div className="flex flex-col items-center gap-1 flex-shrink-0">
                      <span className="text-[11px] font-bold tracking-widest" style={{ color: "var(--text-3)" }}>NUTRI</span>
                      <span className="w-8 h-8 rounded-lg flex items-center justify-center text-[16px] font-black"
                        style={{ background: NUTRISCORE_COLOR[product.nutriscore], color: "#fff" }}>
                        {product.nutriscore}
                      </span>
                    </div>
                  )}
                </div>

                {/* Quantity stepper */}
                <div>
                  <label className="vy-label mb-2 block"
                    style={{ color: "var(--text-3)" }}>Quantité</label>
                  <div className="flex items-center gap-2">
                    <motion.button whileTap={{ scale: 0.86 }}
                      onClick={() => adjustGrams(-10)}
                      className="w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer flex-shrink-0"
                      style={{ background: "rgba(var(--accent-rgb),0.1)", border: "1px solid rgba(var(--accent-rgb),0.2)" }}>
                      <Minus size={14} strokeWidth={2} style={{ color: "var(--exp-encre)" }} />
                    </motion.button>
                    <div className="flex-1 flex items-center gap-1">
                      <input
                        type="number" value={grams} min="1" max="2000"
                        onChange={e => setGrams(e.target.value)}
                        className="flex-1 text-center py-2 rounded-xl text-[16px] font-semibold outline-none"
                        style={{ background: "rgba(var(--tint-violet-rgb),0.5)", border: "1px solid rgba(var(--violet-mid-rgb),0.5)", color: "var(--text-1)" }}
                      />
                      <span className="text-[13px] font-light" style={{ color: "var(--text-3)" }}>g</span>
                    </div>
                    <motion.button whileTap={{ scale: 0.86 }}
                      onClick={() => adjustGrams(10)}
                      className="w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer flex-shrink-0"
                      style={{ background: "rgba(var(--accent-rgb),0.1)", border: "1px solid rgba(var(--accent-rgb),0.2)" }}>
                      <Plus size={14} strokeWidth={2} style={{ color: "var(--exp-encre)" }} />
                    </motion.button>
                  </div>
                </div>

                {/* Macros calculées pour la quantité */}
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-medium" style={{ color: "var(--text-2)" }}>Pour {grams} g</span>
                  <span className="flex items-baseline gap-1">
                    <span className="vy-nombre text-[26px]" style={{ fontWeight: 500, color: "var(--exp-encre)" }}>{computedMacros.calories}</span>
                    <span className="text-[11px]" style={{ color: "var(--text-3)" }}>kcal</span>
                  </span>
                </div>
                <MacroTiles proteins={computedMacros.proteins} carbs={computedMacros.carbs} fats={computedMacros.fats} />

                {/* Meal type */}
                <div>
                  <label className="vy-label mb-1.5 block"
                    style={{ color: "var(--text-3)" }}>Type de repas</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(Object.keys(MEAL_META) as MealType[]).map(mt => (
                      <motion.button key={mt} whileTap={{ scale: 0.95 }}
                        onClick={() => setMealType(mt)}
                        className="py-2 rounded-xl text-[11px] font-medium cursor-pointer flex items-center justify-center gap-1.5"
                        style={{
                          background: mealType === mt ? "rgba(var(--accent-rgb),0.15)" : "rgba(var(--tint-violet-rgb),0.5)",
                          border: mealType === mt ? "1px solid rgba(var(--accent-rgb),0.35)" : "1px solid rgba(var(--violet-mid-rgb),0.3)",
                          color: mealType === mt ? "var(--text-1)" : "var(--text-2)",
                        }}>
                        <span style={{ fontSize: 13 }}>{MEAL_META[mt].icon}</span>
                        <span>{MEAL_META[mt].label}</span>
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <motion.button whileTap={{ scale: 0.95 }} onClick={restart}
                    className="flex-1 py-3 rounded-2xl text-[13px] font-medium cursor-pointer"
                    style={{ background: "rgba(var(--tint-violet-rgb),0.6)", color: "var(--text-2)", border: "1px solid rgba(var(--violet-mid-rgb),0.4)" }}>
                    Rescanner
                  </motion.button>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    onClick={handleConfirm}
                    className="flex-[2] py-3 rounded-2xl text-[16px] font-bold cursor-pointer flex items-center justify-center gap-2"
                    style={{ background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", color: "#fff", boxShadow: "var(--ombre-action)" }}>
                    <Plus size={16} strokeWidth={2.5} /> Ajouter à ma journée
                  </motion.button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
