"use client";

/* ════════════════════════════════════════════════════════════════════
   AssistantSheet — le chat global, en bottom sheet par-dessus la page.

   S'ouvre depuis l'orbe de navigation (ou open()), reste contextuel
   (la page derrière est visible/grisée). Lit tout son état depuis
   useAssistant() : un seul cerveau, une seule UI. Thématisé (clair/sombre)
   via les design tokens.
   ════════════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Send, X, Mic, Square, Dumbbell, Check, CalendarDays, Play, ImagePlus } from "lucide-react";
import { useAssistant } from "@/context/AssistantContext";
import { useWorkoutLaunch } from "@/context/WorkoutLaunchContext";
import { useVoiceCapture } from "@/hooks/useVoiceCapture";
import { CATEGORY_LABEL } from "@/lib/assistantActions";
import { fichierEnDataUrl } from "@/lib/assistantImage";
import { AssistantAvatar } from "@/components/AssistantMark";

/** 6 jours à venir → puces de programmation (tokens compris par resolveWhen). */
function joursProposes() {
  return Array.from({ length: 6 }, (_, n) => {
    const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + n);
    const token = n === 0 ? "aujourd_hui" : `dans_${n}_jour`;
    const label = n === 0 ? "Aujourd'hui"
      : n === 1 ? "Demain"
      : d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" });
    return { token, label };
  });
}

const SUGGESTIONS = [
  "Comment créer une séance ?",
  "Où voir ma progression ?",
  "Suivre ma nutrition",
  "Passer en mode sombre",
];

/* ── Rendu lisible des réponses de l'✦ ──
   Le modèle glisse parfois du markdown (**gras**, listes en *, titres #, `code`).
   À l'écran, ces symboles sont moches à lire. On les transforme en présentation
   propre : gras réel, puces à tiret « – », et on retire les artefacts (# ` ^ ~ *
   isolés). Filet de sécurité — le prompt demande déjà d'écrire sans markdown. */
function renderInline(text: string, keyBase: string): React.ReactNode[] {
  // Découpe **gras** (et __gras__) en morceaux ; nettoie les symboles restants.
  const parts = text.split(/(\*\*[^*]+\*\*|__[^_]+__)/g);
  return parts.map((part, i) => {
    const bold = part.match(/^\*\*([^*]+)\*\*$/) || part.match(/^__([^_]+)__$/);
    if (bold) {
      return (
        <strong key={`${keyBase}-b${i}`} style={{ fontWeight: 600 }}>
          {clean(bold[1])}
        </strong>
      );
    }
    const c = clean(part);
    return c ? <span key={`${keyBase}-s${i}`}>{c}</span> : null;
  });
}

/** Retire les symboles markdown résiduels qui salissent la lecture. */
function clean(s: string): string {
  return s
    .replace(/`+/g, "")        // `code`
    .replace(/[\^~]/g, "")     // ^ ~ (exposants / barrés markdown)
    .replace(/(^|\s)\*(?=\S)/g, "$1") // * d'emphase collé à un mot
    .replace(/\*(?=\s|$)/g, ""); // * isolé
}

function AssistantContent({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <>
      {lines.map((raw, i) => {
        const line = raw.replace(/^\s+/, (m) => m); // garde l'indentation légère
        // Puce ( - , * , • ) → tiret propre avec retrait pendu
        const bullet = line.match(/^\s*[-*•]\s+(.*)$/);
        if (bullet) {
          return (
            <span key={i} style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
              <span style={{ color: "var(--accent)", flexShrink: 0 }}>–</span>
              <span>{renderInline(bullet[1], `l${i}`)}</span>
            </span>
          );
        }
        // Liste numérotée → on garde le numéro
        const num = line.match(/^\s*(\d+)[.)]\s+(.*)$/);
        if (num) {
          return (
            <span key={i} style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
              <span style={{ color: "var(--accent)", fontWeight: 600, flexShrink: 0 }}>{num[1]}.</span>
              <span>{renderInline(num[2], `l${i}`)}</span>
            </span>
          );
        }
        // Titre markdown (#, ##…) → ligne en gras, sans les dièses
        const head = line.match(/^\s*#{1,6}\s+(.*)$/);
        if (head) {
          return (
            <span key={i} style={{ display: "block", fontWeight: 600 }}>
              {renderInline(head[1], `l${i}`)}
            </span>
          );
        }
        return (
          <span key={i} style={{ display: "block" }}>
            {renderInline(line, `l${i}`)}
          </span>
        );
      })}
    </>
  );
}

export default function AssistantSheet() {
  const { isOpen, close, messages, isStreaming, sendMessage, pseudo, memoryNotice, pendingSeance, pendingPlan, pendingRecipe, pendingCreated, actionLoading, confirmSeance, cancelSeance, scheduleCreated, dismissCreated, confirmPlan, cancelPlan, confirmRecipe, cancelRecipe } = useAssistant();
  const { launchWorkout } = useWorkoutLaunch();
  const [mounted, setMounted] = useState(false);
  const [input, setInput] = useState("");
  const [attachment, setAttachment] = useState<string | null>(null); // data URL image à envoyer
  const [attaching, setAttaching] = useState(false);
  const [attachError, setAttachError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const voice = useVoiceCapture({ onTranscript: (t) => sendMessage(t) });

  useEffect(() => { setMounted(true); }, []);

  // La saisie grandit VERTICALEMENT avec le texte (on voit tout ce qu'on écrit,
  // on peut se relire et se corriger — plus de ligne unique qui défile à l'horizontale).
  const autoGrow = () => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 132)}px`; // plafonné, puis scroll interne
  };
  useEffect(() => { autoGrow(); }, [input]);

  // Auto-scroll en bas à chaque nouveau contenu
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    // La carte de séance s'anime et grandit après le 1er rendu : on re-scroll
    // une fois sa hauteur stabilisée pour que ses boutons (Créer/Annuler)
    // soient toujours visibles et cliquables.
    if (pendingSeance || pendingPlan || pendingRecipe || pendingCreated) {
      const t = setTimeout(() => el.scrollTo({ top: el.scrollHeight, behavior: "smooth" }), 360);
      return () => clearTimeout(t);
    }
  }, [messages, isOpen, pendingSeance, pendingPlan, pendingRecipe, pendingCreated, actionLoading]);

  // Échap pour fermer
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, close]);

  const submit = (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if ((!input.trim() && !attachment) || isStreaming) return;
    sendMessage(input, attachment ?? undefined);
    setInput("");
    setAttachment(null);
    setAttachError(null);
  };

  // Choix d'une image → compression navigateur → aperçu, prête à partir.
  const onPickImage = async (file: File | undefined) => {
    if (fileRef.current) fileRef.current.value = ""; // permet de re-choisir le même fichier
    if (!file) return;
    setAttachError(null);
    setAttaching(true);
    try {
      setAttachment(await fichierEnDataUrl(file));
    } catch (err) {
      const m = (err as { message?: string })?.message;
      setAttachError(m === "trop_lourde" ? "Image trop lourde" : "Image illisible");
    } finally {
      setAttaching(false);
    }
  };

  const canSend = (!!input.trim() || !!attachment) && !isStreaming;

  // « La faire maintenant » : lance le tunnel avec la séance qu'on vient de créer.
  const faireMaintenant = () => {
    const pc = pendingCreated;
    if (!pc) return;
    launchWorkout({
      sessionId: pc.id,
      title: pc.title,
      accent: "var(--accent)",
      duration: pc.duration,
      difficulty: pc.difficulty,
      category: pc.category,
      exerciseList: pc.exerciseList.map((e) => ({
        name: e.name, sets: e.sets, reps: e.reps, rest: e.rest, restAfter: e.restAfter,
        tip: e.tip ?? "", benefit: e.benefit ?? "", muscles: e.muscles ?? [],
      })),
    });
    dismissCreated();
    close();
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Voile (page visible derrière) */}
          <motion.div
            key="assistant-backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={close}
            className="fixed inset-0 z-[110]"
            style={{ background: "rgba(10,7,24,0.42)", backdropFilter: "blur(2px)", WebkitBackdropFilter: "blur(2px)" }}
          />

          {/* Sheet */}
          <motion.div
            key="assistant-sheet"
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            className="fixed z-[111] left-0 right-0 bottom-0 mx-auto flex flex-col overflow-hidden
                       md:left-auto md:right-6 md:bottom-6 md:w-[420px] md:rounded-3xl"
            style={{
              height: "min(88vh, 760px)",
              maxWidth: 640,
              background: "rgba(var(--surface-rgb),0.97)",
              backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
              borderTopLeftRadius: 28, borderTopRightRadius: 28,
              border: "1px solid rgba(var(--accent-rgb),0.18)",
              boxShadow: "0 -12px 48px rgba(0,0,0,0.28)",
            }}
          >
            {/* Poignée + header */}
            <div className="relative flex-shrink-0">
              <div className="flex justify-center pt-2.5 pb-1">
                <div className="w-10 h-1 rounded-full" style={{ background: "rgba(var(--accent-rgb),0.35)" }} />
              </div>
              <div className="flex items-center gap-3 px-4 pb-3 pt-1"
                style={{ borderBottom: "1px solid rgba(var(--accent-rgb),0.12)" }}>
                <AssistantAvatar size={36} />
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-semibold leading-tight" style={{ color: "var(--text-0)" }}>Vaiiya ✦</p>
                  <p className="text-[11px] font-medium" style={{ color: "var(--accent)" }}>Ton assistant — partout, tout le temps</p>
                </div>
                <button onClick={close} aria-label="Fermer"
                  className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer flex-shrink-0"
                  style={{ background: "rgba(var(--accent-rgb),0.10)" }}>
                  <X size={16} strokeWidth={2} style={{ color: "var(--text-2)" }} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3 min-h-0"
              style={{ scrollbarWidth: "none" }}>
              {messages.length === 0 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center justify-center gap-5 flex-1 text-center px-4">
                  <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                    className="flex items-center justify-center">
                    <AssistantAvatar size={80} />
                  </motion.div>
                  <div>
                    <p className="text-base font-semibold mb-1" style={{ color: "var(--text-0)" }}>
                      Salut{pseudo ? `, ${pseudo}` : ""} ✦
                    </p>
                    <p className="text-sm font-light leading-relaxed" style={{ color: "var(--text-soft)" }}>
                      Demande-moi n'importe quoi, ou dis-moi où tu veux aller dans l'app.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {SUGGESTIONS.map((s, i) => (
                      <motion.button key={s}
                        initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.08 + i * 0.06 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => sendMessage(s)}
                        className="px-3.5 py-2 rounded-2xl text-[13px] font-medium cursor-pointer"
                        style={{ background: "rgba(var(--accent-rgb),0.10)", color: "var(--text-1)", border: "1px solid rgba(var(--accent-rgb),0.18)" }}>
                        {s}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}

              <AnimatePresence initial={false}>
                {messages.map((msg) => (
                  <motion.div key={msg.id}
                    initial={{ opacity: 0, y: 8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.26, ease: [0.25, 0.46, 0.45, 0.94] }}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} items-end gap-2`}>
                    {msg.role === "assistant" && (
                      <AssistantAvatar size={28} className="mb-0.5" />
                    )}
                    <div className="px-4 py-2.5 rounded-3xl text-[14px] font-light leading-relaxed"
                      style={{
                        maxWidth: "80%", wordBreak: "break-word", whiteSpace: "pre-wrap",
                        ...(msg.role === "user"
                          ? { background: "linear-gradient(135deg, var(--accent), var(--violet-mid))", color: "#fff", borderBottomRightRadius: 8 }
                          : { background: "rgba(var(--tint-violet-rgb),0.6)", color: "var(--text-1)", borderBottomLeftRadius: 8, border: "1px solid rgba(var(--accent-rgb),0.10)" }),
                      }}>
                      {msg.role === "user" && msg.image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={msg.image} alt="" className="block rounded-2xl mb-1.5"
                          style={{ maxWidth: "100%", maxHeight: 220, objectFit: "cover" }} />
                      )}
                      {msg.role === "assistant" ? <AssistantContent text={msg.content} /> : msg.content}
                      {msg.streaming && msg.role === "assistant" && msg.content === "" && (
                        <span className="flex items-center gap-1 py-0.5">
                          {[0, 1, 2].map((i) => (
                            <motion.span key={i} className="block w-1.5 h-1.5 rounded-full" style={{ background: "var(--text-3)" }}
                              animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
                              transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }} />
                          ))}
                        </span>
                      )}
                      {msg.streaming && msg.role === "assistant" && msg.content !== "" && (
                        <motion.span animate={{ opacity: [1, 0, 1] }} transition={{ duration: 0.8, repeat: Infinity }}
                          style={{ color: "var(--accent)", marginLeft: 1 }}>|</motion.span>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Zone d'action ÉPINGLÉE au-dessus de la saisie : la carte reste
                TOUJOURS entièrement visible (boutons compris), quelle que soit
                la longueur de la conversation — elle n'est plus écrasée par le
                fil de messages qui, lui, se réduit (flex-1) pour lui faire place. */}
            <div className="flex-shrink-0 px-3 pb-1 flex flex-col gap-2">

              {/* Génération en cours */}
              {actionLoading && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="self-start max-w-[85%] flex items-center gap-2.5 px-4 py-3 rounded-3xl"
                  style={{ background: "rgba(var(--tint-violet-rgb),0.6)", border: "1px solid rgba(var(--accent-rgb),0.12)" }}>
                  <motion.span className="w-4 h-4 rounded-full border-2" style={{ borderColor: "var(--violet-mid)", borderTopColor: "var(--accent)" }}
                    animate={{ rotate: 360 }} transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }} />
                  <span className="text-[13px] font-light" style={{ color: "var(--text-1)" }}>Je te prépare une séance…</span>
                </motion.div>
              )}

              {/* Carte de confirmation — création de séance (aucune écriture sans clic) */}
              {pendingSeance && (
                <motion.div initial={{ opacity: 0, y: 10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                  className="w-full rounded-3xl overflow-hidden"
                  style={{ background: "rgba(var(--surface-rgb),0.98)", border: "1px solid rgba(var(--accent-rgb),0.22)", boxShadow: "0 8px 28px rgba(var(--accent-rgb),0.18)" }}>
                  <div className="flex items-center gap-3 px-4 pt-3.5 pb-3" style={{ borderBottom: "1px solid rgba(var(--accent-rgb),0.10)" }}>
                    <div className="w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0"
                      style={{ background: "linear-gradient(135deg, var(--violet-mid), var(--cream-mid))" }}>
                      <Dumbbell size={16} strokeWidth={1.8} style={{ color: "#fff" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: "var(--accent)" }}>Nouvelle séance</p>
                      <p className="text-[15px] font-semibold leading-tight truncate" style={{ color: "var(--text-0)" }}>{pendingSeance.title}</p>
                    </div>
                  </div>

                  <div className="px-4 py-2.5 flex flex-wrap gap-1.5">
                    {[CATEGORY_LABEL[pendingSeance.category], `${pendingSeance.duration} min`, pendingSeance.difficulty, `${pendingSeance.exercisesCount} exercices`].map((t) => (
                      <span key={t} className="px-2.5 py-1 rounded-full text-[11px] font-medium"
                        style={{ background: "rgba(var(--accent-rgb),0.10)", color: "var(--text-2)" }}>{t}</span>
                    ))}
                  </div>

                  <div className="px-4 pb-2 flex flex-col gap-1.5 overflow-y-auto" style={{ maxHeight: 150, scrollbarWidth: "none" }}>
                    {pendingSeance.exerciseList.map((ex, i) => (
                      <div key={i} className="flex items-center justify-between gap-3 py-1.5 px-3 rounded-xl"
                        style={{ background: "rgba(var(--tint-violet-rgb),0.45)" }}>
                        <span className="text-[13px] font-light truncate" style={{ color: "var(--text-1)" }}>{ex.name}</span>
                        <span className="text-[11px] font-semibold flex-shrink-0" style={{ color: "var(--accent)" }}>{ex.sets} × {ex.reps}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2 px-4 py-3" style={{ borderTop: "1px solid rgba(var(--accent-rgb),0.10)" }}>
                    <motion.button whileTap={{ scale: 0.97 }} onClick={cancelSeance}
                      className="flex-1 py-2.5 rounded-2xl text-[13px] font-semibold cursor-pointer"
                      style={{ background: "rgba(var(--accent-rgb),0.10)", color: "var(--text-2)" }}>
                      Annuler
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.97 }} onClick={confirmSeance}
                      className="flex-1 py-2.5 rounded-2xl text-[13px] font-semibold cursor-pointer flex items-center justify-center gap-1.5"
                      style={{ background: "linear-gradient(135deg, var(--accent), var(--violet-mid))", color: "#fff" }}>
                      <Check size={15} strokeWidth={2.4} /> Créer la séance
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {/* Carte de confirmation — modification du planning (aucune écriture sans clic) */}
              {pendingPlan && (
                <motion.div initial={{ opacity: 0, y: 10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                  className="w-full rounded-3xl overflow-hidden"
                  style={{ background: "rgba(var(--surface-rgb),0.98)", border: "1px solid rgba(var(--accent-rgb),0.22)", boxShadow: "0 8px 28px rgba(var(--accent-rgb),0.18)" }}>
                  <div className="flex items-center gap-3 px-4 pt-3.5 pb-3" style={{ borderBottom: "1px solid rgba(var(--accent-rgb),0.10)" }}>
                    <div className="w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0"
                      style={{ background: "linear-gradient(135deg, var(--violet-mid), var(--cream-mid))" }}>
                      <CalendarDays size={16} strokeWidth={1.8} style={{ color: "#fff" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: "var(--accent)" }}>Modifier le planning</p>
                      <p className="text-[15px] font-semibold leading-tight truncate" style={{ color: "var(--text-0)" }}>{pendingPlan.title}</p>
                    </div>
                  </div>

                  <div className="px-4 pt-2.5 pb-1">
                    <p className="text-[12px] font-medium" style={{ color: "var(--text-2)" }}>{pendingPlan.summary}</p>
                  </div>

                  {pendingPlan.preview && pendingPlan.preview.exerciseList.length > 0 && (
                    <div className="px-4 pb-2 pt-1 flex flex-col gap-1.5 overflow-y-auto" style={{ maxHeight: 150, scrollbarWidth: "none" }}>
                      {pendingPlan.preview.exerciseList.map((ex, i) => (
                        <div key={i} className="flex items-center justify-between gap-3 py-1.5 px-3 rounded-xl"
                          style={{ background: "rgba(var(--tint-violet-rgb),0.45)" }}>
                          <span className="text-[13px] font-light truncate" style={{ color: "var(--text-1)" }}>{ex.name}</span>
                          <span className="text-[11px] font-semibold flex-shrink-0" style={{ color: "var(--accent)" }}>{ex.sets} × {ex.reps}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2 px-4 py-3" style={{ borderTop: "1px solid rgba(var(--accent-rgb),0.10)" }}>
                    <motion.button whileTap={{ scale: 0.97 }} onClick={cancelPlan}
                      className="flex-1 py-2.5 rounded-2xl text-[13px] font-semibold cursor-pointer"
                      style={{ background: "rgba(var(--accent-rgb),0.10)", color: "var(--text-2)" }}>
                      Annuler
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.97 }} onClick={confirmPlan}
                      className="flex-1 py-2.5 rounded-2xl text-[13px] font-semibold cursor-pointer flex items-center justify-center gap-1.5"
                      style={{ background: "linear-gradient(135deg, var(--accent), var(--violet-mid))", color: "#fff" }}>
                      <Check size={15} strokeWidth={2.4} /> Confirmer
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {/* ── Carte RECETTE ── */}
              {pendingRecipe && (
                <motion.div initial={{ opacity: 0, y: 10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                  className="w-full rounded-3xl overflow-hidden"
                  style={{ background: "rgba(var(--surface-rgb),0.98)", border: "1px solid rgba(var(--accent-rgb),0.22)", boxShadow: "0 8px 28px rgba(var(--accent-rgb),0.18)" }}>
                  <div className="flex items-center gap-3 px-4 pt-3.5 pb-3" style={{ borderBottom: "1px solid rgba(var(--accent-rgb),0.10)" }}>
                    <div className="w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0 text-[17px]"
                      style={{ background: "linear-gradient(135deg,#F5B120,#E8620C)" }}>
                      🍽️
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: "var(--accent)" }}>Recette</p>
                      <p className="text-[15px] font-semibold leading-tight truncate" style={{ color: "var(--text-0)" }}>{pendingRecipe.nom}</p>
                    </div>
                  </div>

                  {/* Repères */}
                  <div className="flex flex-wrap gap-1.5 px-4 pt-2.5">
                    {[
                      `${pendingRecipe.prepMin + pendingRecipe.cookMin} min`,
                      `${pendingRecipe.portions} portion${pendingRecipe.portions > 1 ? "s" : ""}`,
                      pendingRecipe.difficulty,
                      `${pendingRecipe.calories} kcal`,
                      `${pendingRecipe.proteins} g prot.`,
                    ].map((t) => (
                      <span key={t} className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: "rgba(var(--tint-violet-rgb),0.7)", color: "var(--text-2)" }}>{t}</span>
                    ))}
                  </div>

                  {/* Ingrédients + étapes */}
                  <div className="px-4 pt-2.5 pb-1 flex flex-col gap-2 overflow-y-auto" style={{ maxHeight: 190, scrollbarWidth: "none" }}>
                    {pendingRecipe.ingredients.length > 0 && (
                      <div className="flex flex-col gap-1">
                        {pendingRecipe.ingredients.map((ing, i) => (
                          <div key={i} className="flex items-center justify-between gap-3 py-1.5 px-3 rounded-xl"
                            style={{ background: "rgba(var(--tint-violet-rgb),0.45)" }}>
                            <span className="text-[13px] font-light truncate" style={{ color: "var(--text-1)" }}>{ing.nom}</span>
                            <span className="text-[11px] font-semibold flex-shrink-0" style={{ color: "var(--accent)" }}>{ing.quantite}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {pendingRecipe.steps.length > 0 && (
                      <ol className="flex flex-col gap-1.5 pl-1">
                        {pendingRecipe.steps.map((s, i) => (
                          <li key={i} className="flex gap-2 text-[12.5px] font-light leading-snug" style={{ color: "var(--text-2)" }}>
                            <span className="flex-shrink-0 font-bold" style={{ color: "var(--accent)" }}>{i + 1}.</span>
                            <span>{s}</span>
                          </li>
                        ))}
                      </ol>
                    )}
                    {pendingRecipe.safetyNote && (
                      <p className="text-[11.5px] font-medium leading-snug px-3 py-2 rounded-xl"
                        style={{ background: "rgba(245,177,32,0.12)", color: "var(--text-2)" }}>
                        ⚠️ {pendingRecipe.safetyNote}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2 px-4 py-3" style={{ borderTop: "1px solid rgba(var(--accent-rgb),0.10)" }}>
                    <motion.button whileTap={{ scale: 0.97 }} onClick={cancelRecipe}
                      className="flex-1 py-2.5 rounded-2xl text-[13px] font-semibold cursor-pointer"
                      style={{ background: "rgba(var(--accent-rgb),0.10)", color: "var(--text-2)" }}>
                      Fermer
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.97 }} onClick={confirmRecipe}
                      className="flex-1 py-2.5 rounded-2xl text-[13px] font-semibold cursor-pointer flex items-center justify-center gap-1.5"
                      style={{ background: "linear-gradient(135deg, var(--accent), var(--violet-mid))", color: "#fff" }}>
                      <Check size={15} strokeWidth={2.4} /> Ajouter au repas
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {/* Carte de SUITE — la séance vient d'être créée : quand la faire ? */}
              {pendingCreated && (
                <motion.div initial={{ opacity: 0, y: 10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                  className="w-full rounded-3xl overflow-hidden"
                  style={{ background: "rgba(var(--surface-rgb),0.98)", border: "1px solid rgba(var(--accent-rgb),0.22)", boxShadow: "0 8px 28px rgba(var(--accent-rgb),0.18)" }}>
                  <div className="flex items-center gap-3 px-4 pt-3.5 pb-3" style={{ borderBottom: "1px solid rgba(var(--accent-rgb),0.10)" }}>
                    <div className="w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0"
                      style={{ background: "linear-gradient(135deg, #2BD4A0, #22B98A)" }}>
                      <Check size={17} strokeWidth={2.6} style={{ color: "#fff" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: "var(--accent)" }}>Séance créée ✓</p>
                      <p className="text-[15px] font-semibold leading-tight truncate" style={{ color: "var(--text-0)" }}>{pendingCreated.title}</p>
                    </div>
                  </div>

                  <div className="px-4 pt-3 pb-1">
                    <p className="text-[13px] font-semibold mb-2" style={{ color: "var(--text-1)" }}>Quand veux-tu la faire ?</p>
                    <div className="flex flex-wrap gap-1.5">
                      {joursProposes().map((j) => (
                        <motion.button key={j.token} whileTap={{ scale: 0.94 }} onClick={() => scheduleCreated(j.token)}
                          className="px-3 py-1.5 rounded-full text-[12.5px] font-medium cursor-pointer capitalize flex items-center gap-1"
                          style={{ background: "rgba(var(--accent-rgb),0.10)", color: "var(--text-1)", border: "1px solid rgba(var(--accent-rgb),0.16)" }}>
                          <CalendarDays size={12} strokeWidth={2} style={{ color: "var(--accent)" }} />{j.label}
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 px-4 py-3 mt-1" style={{ borderTop: "1px solid rgba(var(--accent-rgb),0.10)" }}>
                    <motion.button whileTap={{ scale: 0.97 }} onClick={dismissCreated}
                      className="py-2.5 px-4 rounded-2xl text-[13px] font-semibold cursor-pointer"
                      style={{ background: "rgba(var(--accent-rgb),0.10)", color: "var(--text-2)" }}>
                      Plus tard
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.97 }} onClick={faireMaintenant}
                      className="flex-1 py-2.5 rounded-2xl text-[13px] font-semibold cursor-pointer flex items-center justify-center gap-1.5"
                      style={{ background: "linear-gradient(135deg, var(--accent), var(--violet-mid))", color: "#fff" }}>
                      <Play size={15} strokeWidth={2.4} fill="#fff" /> La faire maintenant
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Input */}
            <div className="flex-shrink-0 px-3 pt-2"
              style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))", borderTop: "1px solid rgba(var(--accent-rgb),0.12)" }}>
              {/* Puce mémoire — « Je m'en souviendrai » */}
              <AnimatePresence>
                {memoryNotice && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 6, scale: 0.96 }}
                    className="flex items-center gap-1.5 w-fit mx-auto mb-2 px-3 py-1.5 rounded-full text-[12px] font-medium"
                    style={{ background: "rgba(var(--accent-rgb),0.12)", color: "var(--accent)", border: "1px solid rgba(var(--accent-rgb),0.22)" }}>
                    {memoryNotice}
                  </motion.div>
                )}
              </AnimatePresence>
              {voice.error && (
                <p className="text-[11px] text-center mb-1.5" style={{ color: "var(--accent)" }}>{voice.error}</p>
              )}
              {attachError && (
                <p className="text-[11px] text-center mb-1.5" style={{ color: "var(--accent)" }}>{attachError}</p>
              )}

              {/* Aperçu de l'image jointe (prête à partir) */}
              <AnimatePresence>
                {(attachment || attaching) && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
                    className="w-fit mb-2 relative">
                    {attaching ? (
                      <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                        style={{ background: "rgba(var(--accent-rgb),0.10)", border: "1px solid rgba(var(--accent-rgb),0.18)" }}>
                        <motion.span className="w-4 h-4 rounded-full border-2"
                          style={{ borderColor: "var(--violet-mid)", borderTopColor: "var(--accent)" }}
                          animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} />
                      </div>
                    ) : (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={attachment!} alt="" className="w-16 h-16 rounded-2xl object-cover"
                          style={{ border: "1px solid rgba(var(--accent-rgb),0.22)" }} />
                        <button type="button" onClick={() => setAttachment(null)} aria-label="Retirer l'image"
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center"
                          style={{ background: "var(--accent)", color: "#fff" }}>
                          <X size={11} strokeWidth={3} />
                        </button>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              <input ref={fileRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => onPickImage(e.target.files?.[0])} />

              <form onSubmit={submit} className="flex items-end gap-2">
                <div className="flex-1 flex items-center px-4 py-2 rounded-3xl"
                  style={{ background: "rgba(var(--tint-violet-rgb),0.5)", border: "1px solid rgba(var(--accent-rgb),0.18)" }}>
                  <textarea
                    ref={taRef}
                    rows={1}
                    value={input} onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      // Entrée = envoyer ; Maj+Entrée = nouvelle ligne (pour se relire/corriger)
                      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(e); }
                    }}
                    placeholder={voice.state === "recording" ? "Écoute en cours…" : "Pose ta question…"}
                    disabled={isStreaming || voice.state !== "idle"}
                    className="flex-1 bg-transparent text-[14px] leading-relaxed outline-none disabled:opacity-60 resize-none py-1"
                    style={{ color: "var(--text-0)", maxHeight: 132 }}
                  />
                </div>

                {/* Joindre une image */}
                <motion.button type="button" whileTap={{ scale: 0.92 }}
                  onClick={() => fileRef.current?.click()}
                  disabled={isStreaming || attaching || voice.state !== "idle"}
                  className="w-11 h-11 flex items-center justify-center rounded-2xl flex-shrink-0 cursor-pointer disabled:opacity-50"
                  style={{ background: "rgba(var(--accent-rgb),0.12)" }}
                  aria-label="Joindre une image">
                  <ImagePlus size={17} strokeWidth={2} style={{ color: "var(--accent)" }} />
                </motion.button>

                {/* Micro */}
                <motion.button type="button" whileTap={{ scale: 0.92 }}
                  onClick={() => (voice.state === "recording" ? voice.stop() : voice.start())}
                  disabled={isStreaming || voice.state === "processing"}
                  className="w-11 h-11 flex items-center justify-center rounded-2xl flex-shrink-0 cursor-pointer"
                  style={voice.state === "recording"
                    ? { background: "linear-gradient(135deg, #FC8181, #F56565)" }
                    : { background: "rgba(var(--accent-rgb),0.12)" }}
                  aria-label={voice.state === "recording" ? "Arrêter" : "Parler"}>
                  {voice.state === "recording"
                    ? <Square size={15} strokeWidth={2.4} style={{ color: "#fff" }} />
                    : <Mic size={17} strokeWidth={2} style={{ color: "var(--accent)" }} />}
                </motion.button>

                {/* Envoyer */}
                <motion.button type="submit" whileTap={canSend ? { scale: 0.92 } : {}}
                  disabled={!canSend}
                  className="w-11 h-11 flex items-center justify-center rounded-2xl flex-shrink-0 cursor-pointer"
                  style={{
                    background: canSend ? "linear-gradient(135deg, var(--accent), var(--violet-mid))" : "rgba(var(--accent-rgb),0.12)",
                    opacity: canSend ? 1 : 0.55,
                  }}
                  aria-label="Envoyer">
                  <Send size={15} strokeWidth={2.2} style={{ color: "#fff" }} />
                </motion.button>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
