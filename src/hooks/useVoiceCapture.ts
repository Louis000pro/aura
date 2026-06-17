"use client";

/* ════════════════════════════════════════════════════════════════════
   useVoiceCapture — capture micro → transcription (réutilisable).

   Extrait de la logique vocale de HomeOrb pour être partagé par l'orbe
   de navigation (NavOrb) et toute autre surface. Enregistre via
   MediaRecorder, envoie le blob à /api/transcribe et renvoie le texte
   via onTranscript. Expose aussi des niveaux audio pour un vumètre.
   ════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useRef, useState } from "react";

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

        if (blob.size < 1000) { setState("idle"); return; }

        try {
          const form = new FormData();
          form.append("audio", blob, `voice.${extFromMime(mime)}`);
          const res = await fetch("/api/transcribe", { method: "POST", body: form });
          if (!res.ok) throw new Error(await res.text());
          const data = await res.json();
          if (data?.text?.trim()) onTranscriptRef.current(data.text.trim());
        } catch {
          setError("Transcription échouée 🙏");
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
          setLevels([0.05, 0.15, 0.3, 0.5, 0.7].map((r) =>
            Math.min(1, (data[Math.floor(r * data.length)] ?? 0) / 180)));
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      } catch { /* vumètre off, enregistrement ok */ }

      recorder.start();
      setState("recording");
    } catch {
      setError("Micro inaccessible 🙏");
      setTimeout(() => setError(null), 2500);
      setState("idle");
    }
  }, [cleanup]);

  const stop = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  return { state, levels, error, start, stop };
}
