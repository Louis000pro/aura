"use client";

/* ════════════════════════════════════════════════════════════════════
   useVoiceCapture — capture micro → transcription (réutilisable).

   Extrait de la logique vocale de HomeOrb pour être partagé par l'orbe
   de navigation (NavOrb) et toute autre surface. Enregistre via
   MediaRecorder, envoie le blob à /api/transcribe et renvoie le texte
   via onTranscript. Expose aussi des niveaux audio pour un vumètre.
   ════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useRef, useState } from "react";
import { aiFetch } from "@/lib/aiFetch";

export type VoiceState = "idle" | "recording" | "processing";

function pickMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/ogg",
    "audio/mp4",
  ];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
}

function extFromMime(mime: string) {
  if (mime.includes("ogg")) return "ogg";
  if (mime.includes("mp4")) return "mp4";
  return "webm";
}

export function useVoiceCapture({
  onTranscript,
}: {
  onTranscript: (text: string) => void;
}) {
  const [state, setState] = useState<VoiceState>("idle");
  const [levels, setLevels] = useState<number[]>([0, 0, 0, 0, 0]);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  // onTranscript via ref : évite de recréer start() à chaque rendu du parent
  const onTranscriptRef = useRef(onTranscript);
  // Annuler = l'enregistrement s'arrête sans rien transcrire (glisser pour
  // annuler du « maintenir pour parler »). Et un arrêt demandé avant que le
  // micro soit ouvert (doigt relevé pendant la demande d'accès) est gardé
  // pour être appliqué dès l'ouverture.
  const annuleRef = useRef(false);
  const arretDemandeRef = useRef(false);
  // Le niveau le plus fort entendu pendant l'enregistrement : s'il est resté
  // au ras du silence, on n'envoie rien (Whisper inventerait une phrase).
  const picRef = useRef(0);
  const vumetreRef = useRef(false);
  useEffect(() => { onTranscriptRef.current = onTranscript; }, [onTranscript]);

  const cleanup = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => () => {
    if (mediaRecorderRef.current?.state === "recording") {
      try { mediaRecorderRef.current.stop(); } catch {}
    }
    cleanup();
  }, [cleanup]);

  const start = useCallback(async () => {
    annuleRef.current = false;
    arretDemandeRef.current = false;
    picRef.current = 0;
    vumetreRef.current = false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mime = pickMimeType();
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        setState("processing");
        const blob = new Blob(chunksRef.current, { type: mime || "audio/webm" });
        cleanup();

        const silence = vumetreRef.current && picRef.current < 0.12;
        if (annuleRef.current || blob.size < 1000 || silence) { setState("idle"); return; }

        try {
          const form = new FormData();
          form.append("audio", blob, `voice.${extFromMime(mime)}`);
          const res = await aiFetch("/api/transcribe", { method: "POST", body: form });
          if (!res.ok) throw new Error(await res.text());
          const data = await res.json();
          if (data?.text?.trim()) onTranscriptRef.current(data.text.trim());
        } catch {
          setError("La transcription n’a pas marché. Réessaie.");
          setTimeout(() => setError(null), 2500);
        } finally {
          setState("idle");
        }
      };

      // Vumètre
      try {
        const ctx = new AudioContext();
        audioCtxRef.current = ctx;
        ctx.resume().catch(() => {});
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.5;
        source.connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);
        const tick = () => {
          analyser.getByteFrequencyData(data);
          vumetreRef.current = true;
          let max = 0;
          for (let i = 0; i < data.length; i++) if (data[i] > max) max = data[i];
          picRef.current = Math.max(picRef.current, max / 255);
          setLevels([0.05, 0.15, 0.3, 0.5, 0.7].map((r) =>
            Math.min(1, (data[Math.floor(r * data.length)] ?? 0) / 180)));
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      } catch { /* vumètre off, enregistrement ok */ }

      recorder.start();
      setState("recording");
      if (arretDemandeRef.current) recorder.stop();
    } catch {
      setError("Le micro n’est pas accessible.");
      setTimeout(() => setError(null), 2500);
      setState("idle");
    }
  }, [cleanup]);

  const stop = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    } else {
      arretDemandeRef.current = true;
    }
  }, []);

  const cancel = useCallback(() => {
    annuleRef.current = true;
    stop();
  }, [stop]);

  return { state, levels, error, start, stop, cancel };
}
