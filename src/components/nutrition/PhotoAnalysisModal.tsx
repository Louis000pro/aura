"use client";

/* La photo d'une assiette : caméra dans l'app, préparation de la photo,
   analyse, puis ajustement avant d'ajouter. Sortie de NutritionTab.tsx le
   2026-10-22 avec les trois autres modales d'ajout : l'écran se réécrivait
   autour d'elles, elles ne bougent pas. */

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Camera, Upload, Edit2, Plus, ChevronLeft, SwitchCamera, Image as ImageIcon } from "lucide-react";
import { aiFetch, messageDeRefus } from "@/lib/aiFetch";
import { preparerPhotoIA } from "@/lib/photoIA";
import { AssistantSpark } from "@/components/AssistantMark";
import MacroTiles from "@/components/MacroTiles";
import { MEAL_META, heureMaintenant, type MealType, type MealEntry } from "@/lib/repas";

type AnalysisResult = {
  foodName: string;
  description: string;
  mealType: MealType;
  calories: number;
  proteins: number;
  carbs: number;
  fats: number;
  /** Ce que l'IA a vu, élément par élément : le total en est la somme. */
  items?: { nom: string; grammes: number; calories: number }[];
};

/* ─── PhotoAnalysisModal ─────────────────────────────────────────────── */
type PhotoPhase = "select" | "analyzing" | "result" | "edit";

export default function PhotoAnalysisModal({ onClose, onAdd, onBack }: {
  onClose: () => void;
  onAdd: (meal: Omit<MealEntry, "id">) => void;
  onBack?: () => void;   // présent quand on arrive depuis la carte → revenir au classement (misclic)
}) {
  const [phase, setPhase] = useState<PhotoPhase>("select");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [editData, setEditData] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);          // fallback caméra native (si getUserMedia refusé)
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [camReady, setCamReady] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");

  // Masque la barre de nav du bas tant que la modale est ouverte (sinon elle recouvre les boutons sur mobile).
  useEffect(() => {
    document.body.classList.add("modal-open");
    return () => document.body.classList.remove("modal-open");
  }, []);

  const analyze = async (file: File) => {
    setPhase("analyzing");
    setError(null);
    /* ⚠️ La photo est préparée AVANT l'envoi (lib/photoIA) : sans ça, un
       HEIC d'iPhone ou une photo de 5 Mo échouait avant même d'atteindre
       le modèle. */
    let photo;
    try {
      photo = await preparerPhotoIA(file);
    } catch {
      setError("Cette photo ne s’ouvre pas. Essaie avec une autre, ou prends-la depuis l’appareil photo.");
      setPhase("select");
      return;
    }
    setPhotoUrl(photo.apercu);
    {
      try {
        // aiFetch pose le jeton de session : l'endpoint vision est protégé et
        // plafonné (voir lib/aiLimits.ts).
        const res = await aiFetch("/api/nutrition/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: photo.base64, mimeType: photo.mimeType, heure: new Date().getHours() }),
        });
        if (res.status === 422) {
          const d = await res.json().catch(() => ({}));
          setError(d.message ?? "Je ne vois pas de repas sur cette photo.");
          setPhase("select");
          return;
        }
        // Le serveur sait si la limite touchée est celle du gratuit ou le
        // plafond d'usage raisonnable : on affiche SON message, on ne réécrit
        // pas ici une phrase qui pourrait mentir à un abonné.
        const refus = await messageDeRefus(res);
        if (refus) {
          setError(refus);
          setPhase("select");
          return;
        }
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error ?? "Analyse échouée");
        }
        const data: AnalysisResult = await res.json();
        setEditData({ ...data });
        setPhase("result");
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Erreur inconnue";
        setError(msg.includes("GROQ_API_KEY")
          ? "Clé API manquante, ajoute GROQ_API_KEY dans Vercel."
          : "Analyse impossible, essaie à nouveau.");
        setPhase("select");
      }
    }
  };

  const handleConfirm = () => {
    if (!editData) return;
    onAdd({
      name: editData.foodName,
      calories: editData.calories,
      proteins: editData.proteins,
      carbs: editData.carbs,
      fats: editData.fats,
      time: heureMaintenant(),
      mealType: editData.mealType,
      description: editData.description,
      hasPhoto: true,
    });
  };

  const reset = () => { setPhase("select"); setPhotoUrl(null); setEditData(null); setError(null); };

  // ── Caméra live in-app (getUserMedia) — viseur + obturateur, comme le scanner code-barres.
  const stopCam = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  };
  const startCam = async (mode: "environment" | "user"): Promise<boolean> => {
    if (!navigator.mediaDevices?.getUserMedia) { setCamReady(false); return false; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: mode }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play().catch(() => {}); }
      setCamReady(true);
      return true;
    } catch {
      setCamReady(false);
      return false;
    }
  };
  const flipCam = async () => {
    const next = facingMode === "environment" ? "user" : "environment";
    stopCam();
    if (await startCam(next)) setFacingMode(next);
    else await startCam(facingMode); // pas de 2ᵉ caméra → on revient
  };
  const capturePhoto = () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth; canvas.height = v.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(v, 0, 0);
    canvas.toBlob(blob => {
      if (!blob) return;
      stopCam();
      analyze(new File([blob], `repas-${Date.now()}.jpg`, { type: "image/jpeg" }));
    }, "image/jpeg", 0.9);
  };

  // Démarre la caméra sur l'écran de capture, la coupe ailleurs / à la fermeture.
  useEffect(() => {
    if (phase === "select") startCam(facingMode);
    else stopCam();
    return () => stopCam();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const CARD_STYLE = {
    background: "rgb(var(--surface-rgb))",
    border: "1px solid rgba(var(--accent-rgb),0.14)",
    boxShadow: "var(--ombre-flottant)",
    maxHeight: "90dvh",
    overflowY: "auto" as const,
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
          <div className="flex items-center gap-2.5 min-w-0">
            {onBack && (
              <motion.button whileTap={{ scale: 0.9 }} onClick={onBack}
                className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer flex-shrink-0"
                style={{ background: "rgba(var(--tint-violet-rgb),0.8)" }} aria-label="Revenir au classement de la carte">
                <ChevronLeft size={16} strokeWidth={2.2} style={{ color: "var(--exp-encre)" }} />
              </motion.button>
            )}
            <div className="min-w-0">
              <p className="vy-label" style={{ color: "var(--text-3)" }}>{onBack ? "Retour à la carte" : "Nutrition"}</p>
              <h2 className="text-[20px] font-semibold truncate" style={{ color: "var(--text-1)" }}>
                {phase === "analyzing" ? "Je regarde…"
                  : phase === "result"   ? "Repas identifié"
                  : phase === "edit"     ? "Ajuster"
                  : "Ton assiette en photo"}
              </h2>
            </div>
          </div>
          <motion.button whileTap={{ scale: 0.9 }} onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer flex-shrink-0"
            style={{ background: "rgba(var(--tint-violet-rgb),0.8)" }}>
            <X size={14} strokeWidth={2} style={{ color: "var(--text-3)" }} />
          </motion.button>
        </div>

        <div className="px-5 pb-6">
          <AnimatePresence mode="wait">

            {/* SELECT — viseur immersif (tap = caméra) */}
            {phase === "select" && (
              <motion.div key="select"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                {error && (
                  <div className="mb-3 px-3 py-2.5 rounded-2xl text-[13px] font-medium"
                    style={{ background: "rgba(242,109,109,0.12)", color: "#F2685F", border: "1px solid rgba(242,109,109,0.28)" }}>
                    ⚠️ {error}
                  </div>
                )}

                {/* inputs cachés : caméra native (fallback) + galerie */}
                <input ref={camRef} type="file" accept="image/*" capture="environment"
                  className="hidden" onChange={e => e.target.files?.[0] && analyze(e.target.files[0])} />
                <input ref={fileRef} type="file" accept="image/*"
                  className="hidden" onChange={e => e.target.files?.[0] && analyze(e.target.files[0])} />

                {/* Viseur — caméra LIVE dans l'app */}
                <div className="relative w-full rounded-2xl overflow-hidden"
                  style={{ height: 320, background: "linear-gradient(160deg,#2A2140,#140E22)" }}>
                  <video ref={videoRef} autoPlay playsInline muted
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{ opacity: camReady ? 1 : 0, transition: "opacity .3s" }} />
                  <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(180deg,rgba(var(--voile-photo-rgb),0.12),rgba(var(--voile-photo-rgb),0.32))" }} />
                  {/* repères d'angle */}
                  {[["top-3 left-3", "border-t-2 border-l-2 rounded-tl-xl"],
                    ["top-3 right-3", "border-t-2 border-r-2 rounded-tr-xl"],
                    ["bottom-3 left-3", "border-b-2 border-l-2 rounded-bl-xl"],
                    ["bottom-3 right-3", "border-b-2 border-r-2 rounded-br-xl"],
                  ].map(([pos, cls], i) => (
                    <div key={i} className={`absolute w-7 h-7 ${pos} ${cls} pointer-events-none`} style={{ borderColor: "rgba(255,255,255,0.85)" }} />
                  ))}

                  {camReady ? (
                    <>
                      <div className="absolute top-1/2 left-1/2 rounded-full pointer-events-none" style={{ width: 150, height: 150, transform: "translate(-50%,-50%)", border: "1.5px dashed rgba(255,255,255,0.4)" }} />
                      <div className="absolute left-1/2 bottom-3 -translate-x-1/2 whitespace-nowrap text-[11px] font-semibold px-3 py-1.5 rounded-full pointer-events-none"
                        style={{ background: "var(--verre-photo)", color: "#fff", backdropFilter: "blur(16px) saturate(170%)", WebkitBackdropFilter: "blur(16px) saturate(170%)" }}>
                        Cadre ton assiette
                      </div>
                    </>
                  ) : (
                    <button type="button" onClick={() => camRef.current?.click()}
                      className="absolute inset-0 flex flex-col items-center justify-center gap-3 cursor-pointer">
                      <div className="w-16 h-16 rounded-full flex items-center justify-center"
                        style={{ background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", boxShadow: "var(--ombre-action)" }}>
                        <Camera size={26} strokeWidth={1.8} style={{ color: "#fff" }} />
                      </div>
                      <div className="text-center px-6">
                        <p className="text-[16px] font-semibold" style={{ color: "#fff" }}>Prendre une photo</p>
                        <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.72)" }}>Autorise la caméra, ou touche pour l&apos;appareil photo</p>
                      </div>
                    </button>
                  )}
                </div>

                {camReady ? (
                  /* Barre d'obturateur : galerie · déclencheur · flip */
                  <div className="flex items-center justify-between mt-4 px-6">
                    <motion.button whileTap={{ scale: 0.9 }} onClick={() => fileRef.current?.click()}
                      className="w-11 h-11 rounded-2xl flex items-center justify-center cursor-pointer"
                      style={{ background: "rgba(var(--tint-violet-rgb),0.7)", border: "1px solid rgba(var(--violet-mid-rgb),0.5)" }}>
                      <ImageIcon size={19} strokeWidth={1.8} style={{ color: "var(--exp-encre)" }} />
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.92 }} onClick={capturePhoto}
                      className="rounded-full flex items-center justify-center cursor-pointer flex-shrink-0"
                      style={{ width: 68, height: 68, border: "3px solid rgba(var(--accent-rgb),0.35)" }}>
                      <span className="rounded-full" style={{ width: 52, height: 52, background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", boxShadow: "var(--ombre-action)" }} />
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.9 }} onClick={flipCam}
                      className="w-11 h-11 rounded-2xl flex items-center justify-center cursor-pointer"
                      style={{ background: "rgba(var(--tint-violet-rgb),0.7)", border: "1px solid rgba(var(--violet-mid-rgb),0.5)" }}>
                      <SwitchCamera size={19} strokeWidth={1.8} style={{ color: "var(--exp-encre)" }} />
                    </motion.button>
                  </div>
                ) : (
                  /* Fallback : galerie */
                  <motion.button whileTap={{ scale: 0.97 }} onClick={() => fileRef.current?.click()}
                    className="w-full mt-3 py-3.5 rounded-2xl flex items-center justify-center gap-2.5 cursor-pointer"
                    style={{ background: "rgba(var(--tint-violet-rgb),0.6)", border: "1px solid rgba(var(--violet-mid-rgb),0.5)" }}>
                    <Upload size={15} strokeWidth={1.8} style={{ color: "var(--exp-encre)" }} />
                    <span className="font-medium text-[16px]" style={{ color: "var(--text-2)" }}>Choisir dans la galerie</span>
                  </motion.button>
                )}

                <p className="text-[11px] text-center mt-4 font-light" style={{ color: "var(--text-3)" }}>
                  Les aliments sont reconnus, les calories et macros estimées.
                </p>
              </motion.div>
            )}

            {/* ANALYZING — l'IA regarde (balayage lumineux) */}
            {phase === "analyzing" && (
              <motion.div key="analyzing"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col gap-4">
                {photoUrl && (
                  <div className="w-full rounded-2xl overflow-hidden relative" style={{ height: 300 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img loading="lazy" decoding="async" src={photoUrl} alt="repas" className="w-full h-full object-cover" />
                    <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,rgba(var(--voile-photo-rgb),0.05),rgba(var(--voile-photo-rgb),0.5))" }} />
                    {/* balayage */}
                    <motion.div className="absolute left-0 right-0"
                      style={{ height: 56, background: "linear-gradient(180deg,transparent,rgba(139,92,246,0.55) 60%,transparent)", boxShadow: "0 2px 12px rgba(193,59,193,0.55)" }}
                      animate={{ top: ["4%", "82%", "4%"] }}
                      transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }} />
                    <div className="absolute left-0 right-0 flex items-center justify-center gap-2" style={{ bottom: 16 }}>
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}>
                        <AssistantSpark px={16} />
                      </motion.div>
                      <motion.span animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 1.6, repeat: Infinity }}
                        className="text-[11px] font-semibold" style={{ color: "#fff" }}>
                        J&apos;identifie les aliments…
                      </motion.span>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-2">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="rounded-2xl animate-pulse" style={{ height: 52, background: "rgba(var(--tint-violet-rgb),0.6)" }} />
                  ))}
                </div>
              </motion.div>
            )}

            {/* RESULT */}
            {phase === "result" && editData && (
              <motion.div key="result"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex flex-col gap-3">

                {photoUrl && (
                  <div className="w-full h-36 rounded-2xl overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img loading="lazy" decoding="async" src={photoUrl} alt="repas" className="w-full h-full object-cover" />
                  </div>
                )}

                {/* Titre + kcal */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="vy-label flex items-center gap-1" style={{ color: "var(--text-3)" }}>
                      <Check size={11} strokeWidth={3} style={{ color: "var(--teal-encre)" }} /> Repas identifié
                    </p>
                    <p className="font-semibold text-[16px] leading-tight mt-1" style={{ color: "var(--text-1)" }}>
                      {editData.foodName}
                    </p>
                    {editData.description && (
                      <p className="text-[13px] mt-0.5 font-light" style={{ color: "var(--text-2)" }}>
                        {editData.description}
                      </p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="vy-nombre text-[26px] leading-none" style={{ fontWeight: 500, color: "var(--exp-encre)" }}>{editData.calories}</p>
                    <p className="text-[11px] mt-1" style={{ color: "var(--text-3)" }}>kcal</p>
                  </div>
                </div>

                {/* Ce que l'IA a vu, élément par élément. Le total au-dessus
                    en est la somme exacte (lib/visionRepas) : si un poids est
                    faux, on le voit ici, et « Ajuster » le corrige. */}
                {editData.items && editData.items.length > 0 && (
                  <div className="overflow-hidden" style={{ borderRadius: "var(--r-controle)", border: "1px solid rgba(var(--accent-rgb),0.14)" }}>
                    {editData.items.map((it, k) => (
                      <div key={k} className="flex items-baseline gap-2 px-3 py-2 text-[13px]"
                        style={{ borderTop: k ? "1px solid rgba(var(--accent-rgb),0.10)" : "none" }}>
                        <span className="flex-1 min-w-0 truncate" style={{ color: "var(--text-1)" }}>{it.nom}</span>
                        <span className="vy-nombre flex-shrink-0" style={{ color: "var(--text-3)" }}>{it.grammes} g</span>
                        <span className="vy-nombre flex-shrink-0 w-16 text-right" style={{ color: "var(--text-2)" }}>{it.calories} kcal</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Macros — composant partagé Système D */}
                <MacroTiles proteins={editData.proteins} carbs={editData.carbs} fats={editData.fats} />

                {/* Type de repas + ajuster */}
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium"
                    style={{ background: "rgba(var(--tint-violet-rgb),0.6)", color: "var(--text-2)" }}>
                    <span style={{ fontSize: 13 }}>{MEAL_META[editData.mealType]?.icon}</span>
                    {MEAL_META[editData.mealType]?.label}
                  </span>
                  <motion.button whileTap={{ scale: 0.9 }} onClick={() => setPhase("edit")}
                    className="flex items-center gap-1 text-[13px] font-medium cursor-pointer" style={{ color: "var(--exp-encre)" }}>
                    <Edit2 size={11} strokeWidth={2} /> estimation · ajuster
                  </motion.button>
                </div>

                <div className="flex gap-2 mt-0.5">
                  <motion.button whileTap={{ scale: 0.95 }} onClick={reset}
                    className="flex-1 py-3 rounded-2xl text-[13px] font-medium cursor-pointer"
                    style={{ background: "rgba(var(--tint-violet-rgb),0.6)", color: "var(--text-2)", border: "1px solid rgba(var(--violet-mid-rgb),0.4)" }}>
                    Reprendre
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

            {/* EDIT */}
            {phase === "edit" && editData && (
              <motion.div key="edit"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                className="flex flex-col gap-2.5">

                {[
                  { key: "foodName", label: "Nom du plat",     type: "text"   },
                  { key: "calories", label: "Calories (kcal)", type: "number" },
                  { key: "proteins", label: "Protéines (g)",   type: "number" },
                  { key: "carbs",    label: "Glucides (g)",    type: "number" },
                  { key: "fats",     label: "Lipides (g)",     type: "number" },
                ].map(({ key, label, type }) => (
                  <div key={key}>
                    <label className="vy-label mb-1 block"
                      style={{ color: "var(--text-3)" }}>{label}</label>
                    <input
                      type={type}
                      value={editData[key as keyof AnalysisResult] as string | number}
                      onChange={e => setEditData(prev => prev ? {
                        ...prev,
                        [key]: type === "number" ? (parseInt(e.target.value) || 0) : e.target.value,
                      } : prev)}
                      className="w-full px-4 py-2.5 rounded-xl text-[16px] outline-none"
                      style={{ background: "rgba(var(--tint-violet-rgb),0.5)", border: "1px solid rgba(var(--violet-mid-rgb),0.5)", color: "var(--text-1)" }}
                    />
                  </div>
                ))}

                <div>
                  <label className="vy-label mb-1.5 block"
                    style={{ color: "var(--text-3)" }}>Type de repas</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(Object.keys(MEAL_META) as MealType[]).map(mt => (
                      <motion.button key={mt} whileTap={{ scale: 0.95 }}
                        onClick={() => setEditData(prev => prev ? { ...prev, mealType: mt } : prev)}
                        className="py-2 rounded-xl text-[11px] font-medium cursor-pointer flex items-center justify-center gap-1.5"
                        style={{
                          background: editData.mealType === mt
                            ? "linear-gradient(135deg,rgba(var(--accent-rgb),0.2),rgba(var(--gold-rgb),0.12))"
                            : "rgba(var(--tint-violet-rgb),0.4)",
                          border: editData.mealType === mt
                            ? "1px solid rgba(var(--accent-rgb),0.4)"
                            : "1px solid rgba(var(--violet-mid-rgb),0.3)",
                          color: editData.mealType === mt ? "var(--text-1)" : "var(--text-2)",
                        }}>
                        <span style={{ fontSize: 13 }}>{MEAL_META[mt].icon}</span>
                        <span>{MEAL_META[mt].label}</span>
                      </motion.button>
                    ))}
                  </div>
                </div>

                <motion.button whileTap={{ scale: 0.97 }}
                  onClick={() => setPhase("result")}
                  className="w-full py-3 rounded-2xl text-[16px] font-bold cursor-pointer mt-1"
                  style={{
                    background: "linear-gradient(135deg,#8B5CF6,#C13BC1)",
                    color: "#fff",
                    boxShadow: "var(--ombre-action)",
                  }}>
                  Valider les modifications
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
