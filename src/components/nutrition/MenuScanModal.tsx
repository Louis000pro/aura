"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Camera, Upload, BookOpen, SwitchCamera, Star, Target, Image as ImageIcon } from "lucide-react";
import { aiFetch } from "@/lib/aiFetch";
import { preparerPhotoIA } from "@/lib/photoIA";
import { createClient } from "@/lib/supabase";
import { AssistantSpark } from "@/components/AssistantMark";

/* ─── MenuScanModal ──────────────────────────────────────────────────────
   « La carte » du resto en photo → l'IA lit et CLASSE les plats selon
   l'objectif du moment. Aucune macro inventée ici (on n'a pas vu l'assiette) :
   juste un verdict + une raison relative. Le vrai décompte se fait ensuite
   avec la Photo IA de l'assiette (onPickDish → ouvre PhotoAnalysisModal).
   Voir [[nutrition-onmangeou-redesign]].
   ─────────────────────────────────────────────────────────────────────── */
type MenuVerdict = "recommande" | "correct" | "eviter";
type MenuDish = { name: string; verdict: MenuVerdict; reason: string; best: boolean };
export type MenuScanResult = { place: string | null; dishes: MenuDish[]; goalKnown: boolean };
type MenuPhase = "select" | "analyzing" | "result";

const MENU_VERDICT_META: Record<MenuVerdict, { label: string; color: string; tint: string; stripe: string }> = {
  recommande: { label: "Recommandé", color: "#0E8A68", tint: "rgba(31,192,152,0.14)",  stripe: "#1FC098" },
  correct:    { label: "Correct",    color: "#B5730A", tint: "rgba(239,159,39,0.15)",  stripe: "#EF9F27" },
  eviter:     { label: "À éviter",   color: "#C0525C", tint: "rgba(224,106,115,0.14)", stripe: "#E06A73" },
};

export default function MenuScanModal({ objectiveLine, objectiveChip, goalKnown, initialResult, onClose, onResult, onPickDish }: {
  objectiveLine: string;
  objectiveChip: string;
  goalKnown: boolean;
  initialResult?: MenuScanResult | null;   // rouvre directement sur le classement (retour depuis la photo)
  onClose: () => void;
  onResult?: (r: MenuScanResult) => void;  // remonte le scan au parent pour pouvoir y revenir
  onPickDish: (dishName: string) => void;
}) {
  const [phase, setPhase] = useState<MenuPhase>(initialResult ? "result" : "select");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [result, setResult] = useState<MenuScanResult | null>(initialResult ?? null);
  const [error, setError] = useState<string | null>(null);
  const [focusedIdx, setFocusedIdx] = useState<number | null>(null);  // plat « déplié » dans la liste (évite la sélection au 1er tap)
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [camReady, setCamReady] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");

  useEffect(() => {
    document.body.classList.add("modal-open");
    return () => document.body.classList.remove("modal-open");
  }, []);

  const analyze = async (file: File) => {
    setPhase("analyzing");
    setError(null);
    /* Même préparation que la photo d'un repas, un peu plus grande : sur une
       carte, c'est du TEXTE qu'il faut lire. */
    let photo;
    try {
      photo = await preparerPhotoIA(file, 1600);
    } catch {
      setError("Cette photo ne s’ouvre pas. Essaie avec une autre.");
      setPhase("select");
      return;
    }
    setPhotoUrl(photo.apercu);
    {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        const res = await aiFetch("/api/nutrition/carte", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
          },
          body: JSON.stringify({ image: photo.base64, mimeType: photo.mimeType, objective: objectiveLine, goalKnown }),
        });
        if (res.status === 401) { setError("Connecte-toi pour lire une carte."); setPhase("select"); return; }
        if (res.status === 422) { setError("Je n’ai pas réussi à lire les plats, rapproche-toi et recadre la carte."); setPhase("select"); return; }
        if (!res.ok) throw new Error();
        const data: MenuScanResult = await res.json();
        if (!data?.dishes?.length) { setError("Aucun plat lisible, réessaie."); setPhase("select"); return; }
        setResult(data);
        onResult?.(data);          // le parent garde le classement en cache → retour depuis la photo sans re-scan
        setPhase("result");
      } catch {
        setError("Lecture impossible, réessaie.");
        setPhase("select");
      }
    }
  };

  // ── Caméra live in-app (identique à la Photo IA) ──
  const stopCam = () => { streamRef.current?.getTracks().forEach(t => t.stop()); streamRef.current = null; };
  const startCam = async (mode: "environment" | "user"): Promise<boolean> => {
    if (!navigator.mediaDevices?.getUserMedia) { setCamReady(false); return false; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: mode }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play().catch(() => {}); }
      setCamReady(true); return true;
    } catch { setCamReady(false); return false; }
  };
  const flipCam = async () => {
    const next = facingMode === "environment" ? "user" : "environment";
    stopCam();
    if (await startCam(next)) setFacingMode(next); else await startCam(facingMode);
  };
  const capturePhoto = () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth; canvas.height = v.videoHeight;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    ctx.drawImage(v, 0, 0);
    canvas.toBlob(blob => {
      if (!blob) return;
      stopCam();
      analyze(new File([blob], `carte-${Date.now()}.jpg`, { type: "image/jpeg" }));
    }, "image/jpeg", 0.9);
  };
  useEffect(() => {
    if (phase === "select") startCam(facingMode); else stopCam();
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

  const best = result?.dishes.find(d => d.best) ?? result?.dishes[0] ?? null;
  const others = result ? result.dishes.filter(d => d !== best) : [];

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
            <p className="vy-label" style={{ color: "var(--text-3)" }}>Carte du resto</p>
            <h2 className="text-[20px] font-semibold" style={{ color: "var(--text-1)" }}>
              {phase === "analyzing" ? "Je lis la carte…" : phase === "result" ? "Trié pour toi" : "Photographie la carte"}
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

            {/* SELECT — viseur immersif */}
            {phase === "select" && (
              <motion.div key="select" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                {error && (
                  <div className="mb-3 px-3 py-2.5 rounded-2xl text-[13px] font-medium"
                    style={{ background: "rgba(242,109,109,0.12)", color: "#F2685F", border: "1px solid rgba(242,109,109,0.28)" }}>
                    ⚠️ {error}
                  </div>
                )}
                <input ref={camRef} type="file" accept="image/*" capture="environment"
                  className="hidden" onChange={e => e.target.files?.[0] && analyze(e.target.files[0])} />
                <input ref={fileRef} type="file" accept="image/*"
                  className="hidden" onChange={e => e.target.files?.[0] && analyze(e.target.files[0])} />

                <div className="relative w-full rounded-2xl overflow-hidden"
                  style={{ height: 320, background: "linear-gradient(160deg,#2A2140,#140E22)" }}>
                  <video ref={videoRef} autoPlay playsInline muted
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{ opacity: camReady ? 1 : 0, transition: "opacity .3s" }} />
                  <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(180deg,rgba(var(--voile-photo-rgb),0.12),rgba(var(--voile-photo-rgb),0.32))" }} />
                  {[["top-3 left-3", "border-t-2 border-l-2 rounded-tl-xl"],
                    ["top-3 right-3", "border-t-2 border-r-2 rounded-tr-xl"],
                    ["bottom-3 left-3", "border-b-2 border-l-2 rounded-bl-xl"],
                    ["bottom-3 right-3", "border-b-2 border-r-2 rounded-br-xl"],
                  ].map(([pos, cls], i) => (
                    <div key={i} className={`absolute w-7 h-7 ${pos} ${cls} pointer-events-none`} style={{ borderColor: "rgba(255,255,255,0.85)" }} />
                  ))}

                  {camReady ? (
                    <>
                      <div className="absolute pointer-events-none" style={{ left: "13%", right: "13%", top: "17%", bottom: "17%", border: "1.5px dashed rgba(255,255,255,0.4)", borderRadius: 10 }} />
                      <div className="absolute left-1/2 bottom-3 -translate-x-1/2 whitespace-nowrap text-[11px] font-semibold px-3 py-1.5 rounded-full pointer-events-none inline-flex items-center gap-1.5"
                        style={{ background: "var(--verre-photo)", color: "#fff", backdropFilter: "blur(16px) saturate(170%)", WebkitBackdropFilter: "blur(16px) saturate(170%)" }}>
                        Cadre la carte entière
                      </div>
                    </>
                  ) : (
                    <button type="button" onClick={() => camRef.current?.click()}
                      className="absolute inset-0 flex flex-col items-center justify-center gap-3 cursor-pointer">
                      <div className="w-16 h-16 rounded-full flex items-center justify-center"
                        style={{ background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", boxShadow: "var(--ombre-action)" }}>
                        <BookOpen size={26} strokeWidth={1.8} style={{ color: "#fff" }} />
                      </div>
                      <div className="text-center px-6">
                        <p className="text-[16px] font-semibold" style={{ color: "#fff" }}>Photographier la carte</p>
                        <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.72)" }}>Autorise la caméra, ou touche pour l&apos;appareil photo</p>
                      </div>
                    </button>
                  )}
                </div>

                {camReady ? (
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
                  <motion.button whileTap={{ scale: 0.97 }} onClick={() => fileRef.current?.click()}
                    className="w-full mt-3 py-3.5 rounded-2xl flex items-center justify-center gap-2.5 cursor-pointer"
                    style={{ background: "rgba(var(--tint-violet-rgb),0.6)", border: "1px solid rgba(var(--violet-mid-rgb),0.5)" }}>
                    <Upload size={15} strokeWidth={1.8} style={{ color: "var(--exp-encre)" }} />
                    <span className="font-medium text-[16px]" style={{ color: "var(--text-2)" }}>Choisir dans la galerie</span>
                  </motion.button>
                )}

                <p className="text-[11px] text-center mt-4 font-light" style={{ color: "var(--text-3)" }}>
                  Les plats sont classés selon ton objectif, sans chiffres inventés.
                </p>
              </motion.div>
            )}

            {/* ANALYZING */}
            {phase === "analyzing" && (
              <motion.div key="analyzing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col gap-4">
                {photoUrl && (
                  <div className="w-full rounded-2xl overflow-hidden relative" style={{ height: 300 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img loading="lazy" decoding="async" src={photoUrl} alt="carte" className="w-full h-full object-cover" />
                    <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,rgba(var(--voile-photo-rgb),0.05),rgba(var(--voile-photo-rgb),0.5))" }} />
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
                        Je lis les plats…
                      </motion.span>
                    </div>
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="rounded-2xl animate-pulse" style={{ height: 44, background: "rgba(var(--tint-violet-rgb),0.6)" }} />
                  ))}
                </div>
              </motion.div>
            )}

            {/* RESULT — le classement */}
            {phase === "result" && best && result && (
              <motion.div key="result" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex flex-col gap-3">

                {/* Contexte : objectif + resto */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
                    style={{ background: "rgba(var(--tint-violet-rgb),0.6)", border: "1px solid rgba(var(--violet-mid-rgb),0.4)", color: "var(--text-2)" }}>
                    <Target size={12} strokeWidth={2} style={{ color: "var(--exp-encre)" }} /> {objectiveChip}
                  </span>
                  {result.place && <span className="text-[11px]" style={{ color: "var(--text-3)" }}>· {result.place}</span>}
                </div>
                <p className="flex items-start gap-1.5 text-[11px] leading-snug -mt-1" style={{ color: "var(--text-3)" }}>
                  Estimations d&apos;après la carte, le vrai compte se fera à l&apos;assiette.
                </p>

                {/* Hero — le meilleur choix */}
                <div className="relative rounded-2xl p-4 overflow-hidden"
                  style={{ background: "linear-gradient(160deg,rgba(31,192,152,0.12),rgba(var(--tint-violet-rgb),0.15))", border: "1px solid rgba(31,192,152,0.34)" }}>
                  <span aria-hidden className="absolute top-0 left-0 right-0" style={{ height: 3, background: "linear-gradient(90deg,#1FC098,#39E0B5)" }} />
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full"
                    style={{ color: "#0E8A68", background: "rgba(31,192,152,0.14)", border: "1px solid rgba(31,192,152,0.3)" }}>
                    <Star size={11} strokeWidth={2.5} fill="#1FC098" style={{ color: "#1FC098" }} /> Le meilleur choix
                  </span>
                  <p className="font-semibold text-[20px] leading-tight mt-2.5" style={{ color: "var(--text-1)" }}>{best.name}</p>
                  {best.reason && <p className="text-[13px] mt-1 leading-snug" style={{ color: "var(--text-2)" }}>{best.reason}</p>}
                  <motion.button whileTap={{ scale: 0.97 }} onClick={() => onPickDish(best.name)}
                    className="w-full mt-3.5 py-3 rounded-2xl text-[16px] font-bold cursor-pointer flex items-center justify-center gap-2"
                    style={{ background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", color: "#fff", boxShadow: "var(--ombre-action)" }}>
                    <Camera size={16} strokeWidth={2} /> Je pars là-dessus
                  </motion.button>
                </div>

                {/* Les autres plats — 1er tap = on DÉPLIE le plat sur place (pas de sélection accidentelle),
                    2e tap sur « Je pars là-dessus » = vraie sélection. Voir [[nutrition-onmangeou-redesign]]. */}
                {others.length > 0 && (
                  <>
                    <p className="vy-label mt-0.5" style={{ color: "var(--text-3)" }}>
                      Les autres plats <span className="font-normal tracking-normal normal-case">· touche pour choisir</span>
                    </p>
                    <div className="flex flex-col gap-2">
                      {others.map((d, i) => {
                        const vm = MENU_VERDICT_META[d.verdict];
                        const open = focusedIdx === i;
                        return (
                          <motion.div key={`${d.name}-${i}`} layout
                            className="rounded-2xl overflow-hidden"
                            style={{
                              background: open
                                ? `linear-gradient(160deg, ${vm.tint}, rgba(var(--tint-violet-rgb),0.15))`
                                : "rgba(var(--tint-violet-rgb),0.4)",
                              border: open ? `1px solid ${vm.stripe}59` : "1px solid rgba(var(--violet-mid-rgb),0.28)",
                            }}>
                            <motion.button whileTap={{ scale: 0.98 }} onClick={() => setFocusedIdx(open ? null : i)}
                              className="w-full flex items-center gap-3 p-3 cursor-pointer text-left">
                              <span className="self-stretch rounded-full flex-shrink-0" style={{ width: 4, background: vm.stripe }} />
                              <div className="flex-1 min-w-0">
                                <p className={`font-semibold leading-tight ${open ? "text-[20px]" : "text-[16px]"}`} style={{ color: "var(--text-1)" }}>{d.name}</p>
                                {d.reason && <p className="text-[11px] mt-0.5 leading-snug" style={{ color: open ? "var(--text-2)" : "var(--text-3)" }}>{d.reason}</p>}
                              </div>
                              <span className="text-[11px] font-bold px-2 py-1 rounded-full flex-shrink-0"
                                style={{ color: vm.color, background: vm.tint }}>{vm.label}</span>
                            </motion.button>
                            <AnimatePresence initial={false}>
                              {open && (
                                <motion.div key="cta"
                                  initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2 }} className="overflow-hidden">
                                  <div className="px-3 pb-3">
                                    <motion.button whileTap={{ scale: 0.97 }} onClick={() => onPickDish(d.name)}
                                      className="w-full py-2.5 rounded-xl text-[16px] font-bold cursor-pointer flex items-center justify-center gap-2"
                                      style={{ background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", color: "#fff", boxShadow: "var(--ombre-action)" }}>
                                      <Camera size={15} strokeWidth={2} /> Je pars là-dessus
                                    </motion.button>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.div>
                        );
                      })}
                    </div>
                  </>
                )}

                <p className="text-[11px] text-center mt-1 font-light" style={{ color: "var(--text-3)" }}>
                  Tu choisis → tu photographies l&apos;assiette quand elle arrive pour le vrai décompte.
                </p>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
