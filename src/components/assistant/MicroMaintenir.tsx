"use client";

/* ─────────────────────────────────────────────────────────────
   Le micro « maintenir pour parler » (maquette « La conversation
   du Guide », version 3, validée par Louis le 2026-10-20).

   On appuie, on parle, on relâche : le message part. On glisse le
   doigt vers la gauche (ou vers le haut) pour annuler, sans rien
   envoyer. Un appui trop court ne part pas : il rappelle qu'il faut
   maintenir.

   Au clavier (Entrée ou Espace sur le bouton), un premier appui
   ouvre le micro et un second l'arrête : maintenir une touche n'est
   pas un geste qu'on peut demander à tout le monde.
   ───────────────────────────────────────────────────────────── */

import { useEffect, useRef, useState } from "react";
import { Mic } from "lucide-react";
import type { VoiceState } from "@/hooks/useVoiceCapture";

type Voix = {
  state: VoiceState;
  levels: number[];
  start: () => void;
  stop: () => void;
  cancel: () => void;
};

/** Au-delà de cette distance, relâcher annule. */
const SEUIL_ANNULER = 72;
/** En dessous, l'appui est un toucher : on ne transcrit rien. */
const APPUI_MIN_MS = 350;

export default function MicroMaintenir({ voix, desactive }: { voix: Voix; desactive: boolean }) {
  const origine = useRef<{ x: number; y: number; t: number } | null>(null);
  const [arme, setArme] = useState(false);
  const [rappel, setRappel] = useState(false);
  const [secondes, setSecondes] = useState(0);

  const enregistre = voix.state === "recording";

  useEffect(() => {
    if (!enregistre) return;
    const debut = Date.now();
    const id = window.setInterval(() => setSecondes(Math.floor((Date.now() - debut) / 1000)), 250);
    return () => { window.clearInterval(id); setSecondes(0); };
  }, [enregistre]);

  useEffect(() => {
    if (!rappel) return;
    const id = window.setTimeout(() => setRappel(false), 1800);
    return () => window.clearTimeout(id);
  }, [rappel]);

  const lever = (e: React.PointerEvent<HTMLButtonElement>) => {
    const o = origine.current;
    origine.current = null;
    if (!o) return;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* déjà relâché */ }
    if (arme) { setArme(false); voix.cancel(); return; }
    if (Date.now() - o.t < APPUI_MIN_MS) { voix.cancel(); setRappel(true); return; }
    voix.stop();
  };

  return (
    <>
      {(enregistre || rappel) && (
        <div className="absolute inset-y-0 left-0 flex items-center gap-3 px-4 rounded-3xl pointer-events-none"
          style={{ right: 104, background: "rgb(var(--surface-rgb))", border: "1px solid rgba(var(--accent-rgb),0.22)" }}
          aria-live="polite">
          {rappel && !enregistre ? (
            <span className="text-[13px]" style={{ color: "var(--text-2)" }}>Maintiens le micro pour parler</span>
          ) : arme ? (
            <span className="text-[13px] font-semibold" style={{ color: "var(--exp-encre)" }}>Relâche pour annuler</span>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: "linear-gradient(135deg, #8B5CF6, #C13BC1)" }} aria-hidden />
              <span className="vy-nombre text-[13px]" style={{ color: "var(--text-0)" }}>
                {Math.floor(secondes / 60)}:{String(secondes % 60).padStart(2, "0")}
              </span>
              <span className="flex items-end gap-[3px] h-4" aria-hidden>
                {voix.levels.map((l, i) => (
                  <span key={i} className="w-[3px] rounded-full"
                    style={{ height: `${Math.max(18, l * 100)}%`, background: "var(--accent)" }} />
                ))}
              </span>
              <span className="text-[13px] truncate" style={{ color: "var(--text-2)" }}>‹ Glisse pour annuler</span>
            </>
          )}
        </div>
      )}

      <button type="button"
        disabled={desactive || voix.state === "processing"}
        onPointerDown={(e) => {
          if (e.button !== 0 || voix.state !== "idle") return;
          e.preventDefault();
          try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* sans capture, le geste marche quand même */ }
          origine.current = { x: e.clientX, y: e.clientY, t: Date.now() };
          setArme(false);
          setRappel(false);
          voix.start();
        }}
        onPointerMove={(e) => {
          const o = origine.current;
          if (!o) return;
          setArme(o.x - e.clientX > SEUIL_ANNULER || o.y - e.clientY > SEUIL_ANNULER);
        }}
        onPointerUp={lever}
        onPointerCancel={() => { origine.current = null; setArme(false); voix.cancel(); }}
        onContextMenu={(e) => e.preventDefault()}
        onClick={(e) => {
          // Seul le clavier passe ici (detail = 0) : le doigt est déjà géré.
          if (e.detail !== 0) return;
          if (enregistre) voix.stop(); else voix.start();
        }}
        className="w-11 h-11 flex items-center justify-center rounded-2xl flex-shrink-0 cursor-pointer select-none"
        style={{
          touchAction: "none",
          WebkitTouchCallout: "none",
          transform: enregistre ? "scale(1.12)" : undefined,
          transition: "transform 120ms ease",
          background: enregistre ? "linear-gradient(135deg, #8B5CF6, #C13BC1)" : "rgba(var(--accent-rgb),0.12)",
          boxShadow: enregistre ? "var(--ombre-action)" : undefined,
        }}
        aria-label={enregistre ? "Arrêter et envoyer" : "Maintenir pour parler"}>
        <Mic size={17} strokeWidth={2} style={{ color: enregistre ? "#fff" : "var(--exp-encre)" }} />
      </button>
    </>
  );
}
