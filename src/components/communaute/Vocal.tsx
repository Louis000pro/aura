"use client";

/* ─────────────────────────────────────────────────────────────────────
   LES MESSAGES VOCAUX D'UNE CONVERSATION.

   Toucher le micro démarre l'enregistrement, une barre remplace la
   saisie (point qui bat, chrono, « Annuler », flèche d'envoi). Une
   minute au plus : à 60 s l'enregistrement s'arrête et part tout seul.

   ⚠️ 32 kbit/s, mono, et `audio/mp4` en priorité : c'est le format que
   Safari ET Chrome savent relire, et une minute pèse ~240 Ko. Le coût en
   stockage reste négligeable (voir 20261022_messages_vocaux.sql).
   ───────────────────────────────────────────────────────────────────── */

import { useCallback, useEffect, useRef, useState } from "react";
import { Pause, Play, Trash2, ArrowUp, Loader2 } from "lucide-react";

export const DUREE_MAX_VOCAL = 60;

const FORMATS = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"];

function formatEnregistrable(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  return FORMATS.find((f) => MediaRecorder.isTypeSupported?.(f));
}

export function chrono(s: number): string {
  const t = Math.max(0, Math.floor(s));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
}

/** L'enregistreur. `arreter(true)` rend le son, `arreter(false)` le jette. */
export function useEnregistreurVocal(onFini: (son: Blob, secondes: number) => void) {
  const [actif, setActif] = useState(false);
  const [secondes, setSecondes] = useState(0);
  const [erreur, setErreur] = useState<string | null>(null);
  const rec = useRef<MediaRecorder | null>(null);
  const flux = useRef<MediaStream | null>(null);
  const morceaux = useRef<Blob[]>([]);
  const garder = useRef(true);
  const debut = useRef(0);
  const minuteur = useRef<number | null>(null);
  const finiRef = useRef(onFini);
  useEffect(() => { finiRef.current = onFini; }, [onFini]);

  const nettoyer = useCallback(() => {
    if (minuteur.current) { window.clearInterval(minuteur.current); minuteur.current = null; }
    flux.current?.getTracks().forEach((t) => t.stop());
    flux.current = null;
    rec.current = null;
    setActif(false);
  }, []);

  const arreter = useCallback((envoyer: boolean) => {
    garder.current = envoyer;
    if (rec.current && rec.current.state !== "inactive") rec.current.stop();
    else nettoyer();
  }, [nettoyer]);

  const demarrer = useCallback(async () => {
    setErreur(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setErreur("Ton navigateur ne sait pas enregistrer de vocal.");
      return;
    }
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } });
      flux.current = s;
      const mimeType = formatEnregistrable();
      const r = new MediaRecorder(s, { ...(mimeType ? { mimeType } : {}), audioBitsPerSecond: 32000 });
      morceaux.current = [];
      garder.current = true;
      r.ondataavailable = (e) => { if (e.data.size > 0) morceaux.current.push(e.data); };
      r.onstop = () => {
        const duree = (Date.now() - debut.current) / 1000;
        const son = new Blob(morceaux.current, { type: r.mimeType || mimeType || "audio/webm" });
        nettoyer();
        // Moins d'une demi-seconde : un toucher par erreur, rien ne part.
        if (garder.current && duree >= 0.5 && son.size > 0) finiRef.current(son, Math.min(DUREE_MAX_VOCAL, duree));
      };
      rec.current = r;
      debut.current = Date.now();
      setSecondes(0);
      r.start(250);
      setActif(true);
      minuteur.current = window.setInterval(() => {
        const t = (Date.now() - debut.current) / 1000;
        setSecondes(t);
        if (t >= DUREE_MAX_VOCAL) arreter(true);
      }, 200);
    } catch {
      nettoyer();
      setErreur("Le micro n’est pas autorisé. Active-le dans les réglages du navigateur.");
    }
  }, [arreter, nettoyer]);

  useEffect(() => () => { garder.current = false; rec.current?.stop(); nettoyer(); }, [nettoyer]);

  return { actif, secondes, erreur, demarrer, arreter, effacerErreur: () => setErreur(null) };
}

/** La barre qui remplace la saisie pendant l'enregistrement. */
export function BarreEnregistrement({ secondes, onAnnuler, onEnvoyer, couleurs }: {
  secondes: number;
  onAnnuler: () => void;
  onEnvoyer: () => void;
  couleurs: { carte: string; trait: string; t1: string; t3: string };
}) {
  return (
    <div
      className="flex min-h-[48px] flex-1 items-center gap-3 rounded-full pl-2 pr-1.5"
      style={{ background: couleurs.carte, border: `1px solid ${couleurs.trait}` }}
    >
      <button
        type="button" onClick={onAnnuler} aria-label="Annuler le vocal"
        className="flex h-9 w-9 items-center justify-center rounded-full"
        style={{ color: "#E5484D" }}
      >
        <Trash2 className="h-[18px] w-[18px]" />
      </button>
      <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ background: "#E5484D" }} />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full" style={{ background: "#E5484D" }} />
      </span>
      <span className="vy-nombre text-[16px]" style={{ color: couleurs.t1, fontWeight: 600 }} aria-live="off">
        {chrono(secondes)}
      </span>
      <span className="flex-1 truncate text-[13px]" style={{ color: couleurs.t3 }}>
        {secondes > DUREE_MAX_VOCAL - 10 ? `Encore ${Math.ceil(DUREE_MAX_VOCAL - secondes)} s` : "Enregistrement…"}
      </span>
      <button
        type="button" onClick={onEnvoyer} aria-label="Envoyer le vocal"
        className="flex h-9 w-9 items-center justify-center rounded-full text-white"
        style={{ background: "linear-gradient(135deg, #8B5CF6, #C13BC1)" }}
      >
        <ArrowUp className="h-[18px] w-[18px]" strokeWidth={2.4} />
      </button>
    </div>
  );
}

/** Une bulle vocale : lecture, barre de progression, durée. */
export function LecteurVocal({ url, duree, aMoi }: { url: string | null; duree: number; aMoi: boolean }) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [lecture, setLecture] = useState(false);
  const [charge, setCharge] = useState(false);
  const [pos, setPos] = useState(0);

  const encre = aMoi ? "#fff" : "var(--text-1)";
  const piste = aMoi ? "rgba(255,255,255,0.35)" : "rgba(var(--text-3-rgb),0.3)";
  const plein = aMoi ? "#fff" : "#8B5CF6";

  const basculer = () => {
    if (!url) return;
    if (!audio.current) {
      const a = new Audio(url);
      a.preload = "auto";
      a.ontimeupdate = () => setPos(a.currentTime);
      a.onplaying = () => { setCharge(false); setLecture(true); };
      a.onpause = () => setLecture(false);
      a.onended = () => { setLecture(false); setPos(0); };
      a.onerror = () => { setCharge(false); setLecture(false); };
      audio.current = a;
    }
    const a = audio.current;
    if (a.paused) { setCharge(true); void a.play().catch(() => setCharge(false)); }
    else a.pause();
  };

  useEffect(() => () => { audio.current?.pause(); }, []);

  const part = duree > 0 ? Math.min(1, pos / duree) : 0;

  return (
    <span className="flex w-[210px] max-w-full items-center gap-2.5 py-0.5" onPointerDown={(e) => e.stopPropagation()}>
      <button
        type="button" onClick={basculer} disabled={!url}
        aria-label={lecture ? "Mettre en pause" : "Écouter le message vocal"}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full disabled:opacity-50"
        style={{ background: aMoi ? "rgba(255,255,255,0.22)" : "rgba(139,92,246,0.14)", color: encre }}
      >
        {charge ? <Loader2 className="h-4 w-4 animate-spin" />
          : lecture ? <Pause className="h-4 w-4" fill="currentColor" />
          : <Play className="ml-0.5 h-4 w-4" fill="currentColor" />}
      </button>
      <span className="relative h-[3px] flex-1 overflow-hidden rounded-full" style={{ background: piste }}>
        <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${part * 100}%`, background: plein }} />
      </span>
      <span className="vy-nombre text-[13px]" style={{ color: encre, opacity: 0.85 }}>
        {chrono(lecture || pos > 0 ? pos : duree)}
      </span>
    </span>
  );
}
