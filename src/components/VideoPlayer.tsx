"use client";

import { useRef, useEffect, useState } from "react";

/**
 * VideoPlayer — vidéo avec fond flouté, sobre en données.
 * - preload="metadata" : seule la première image est chargée tant qu'on ne lit pas
 *   (l'ancien preload="auto" téléchargeait CHAQUE vidéo du fil en entier → quota Supabase explosé)
 * - lecture au TAP, plus d'autoplay au scroll
 * - le fond flouté est un <canvas> peint depuis la vidéo elle-même : zéro téléchargement en double
 * - autoPlayOnScroll (le fil) ne déclenche plus la lecture : il met seulement en PAUSE hors écran
 */

interface VideoPlayerProps {
  src: string;
  maxHeight?: number;
  controls?: boolean;
  muted?: boolean;
  autoPlay?: boolean;
  autoPlayOnScroll?: boolean;
  loop?: boolean;
  className?: string;
}

export default function VideoPlayer({
  src,
  maxHeight = 380,
  controls = true,
  muted = false,
  autoPlay = false,
  autoPlayOnScroll = false,
  loop = false,
  className = "",
}: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLVideoElement>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  const [playing, setPlaying] = useState(false);

  /* ── Fond flouté : on peint la vidéo dans un petit canvas (aucun 2e fetch) ── */
  useEffect(() => {
    const main = mainRef.current;
    const canvas = bgCanvasRef.current;
    if (!main || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    const paint = () => {
      if (main.videoWidth > 0) {
        canvas.width = 64;
        canvas.height = Math.max(1, Math.round((64 * main.videoHeight) / main.videoWidth));
        ctx.drawImage(main, 0, 0, canvas.width, canvas.height);
      }
    };
    const tick = () => { paint(); raf = requestAnimationFrame(tick); };
    const onPlay = () => { setPlaying(true); cancelAnimationFrame(raf); raf = requestAnimationFrame(tick); };
    const onStop = () => { setPlaying(false); cancelAnimationFrame(raf); paint(); };

    main.addEventListener("loadeddata", paint);
    main.addEventListener("play", onPlay);
    main.addEventListener("pause", onStop);
    main.addEventListener("ended", onStop);
    return () => {
      cancelAnimationFrame(raf);
      main.removeEventListener("loadeddata", paint);
      main.removeEventListener("play", onPlay);
      main.removeEventListener("pause", onStop);
      main.removeEventListener("ended", onStop);
    };
  }, [src]);

  /* ── autoPlay explicite (petits aperçus dans un modal déjà ouvert par l'utilisateur) ── */
  useEffect(() => {
    if (!autoPlay) return;
    const main = mainRef.current;
    if (main) void main.play().catch(() => {});
  }, [autoPlay, src]);

  /* ── Dans le fil : pause dès que la vidéo sort de l'écran ── */
  useEffect(() => {
    if (!autoPlayOnScroll) return;
    const container = containerRef.current;
    const main = mainRef.current;
    if (!container || !main) return;
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => { if (!entry.isIntersecting) main.pause(); }),
      { threshold: 0.35 }
    );
    observer.observe(container);
    return () => observer.disconnect();
  }, [autoPlayOnScroll]);

  const toggle = () => {
    const main = mainRef.current;
    if (!main) return;
    if (main.paused) void main.play().catch(() => {});
    else main.pause();
  };

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden w-full"
      style={{ maxHeight, background: "#000" }}
    >
      {/* ── Fond flouté peint depuis la vidéo ── */}
      <canvas
        ref={bgCanvasRef}
        aria-hidden="true"
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{
          objectFit: "cover",
          filter: "blur(22px) brightness(0.45)",
          transform: "scale(1.12)",
        }}
      />

      {/* ── Vidéo principale ── */}
      <video
        ref={mainRef}
        src={src}
        className={`relative z-10 w-full object-contain block ${className}`}
        style={{ maxHeight }}
        controls={controls}
        muted={muted}
        playsInline
        preload="metadata"
        loop={loop}
        onClick={!controls ? toggle : undefined}
      />

      {/* ── Bouton lecture (quand pas de contrôles natifs) ── */}
      {!controls && !playing && (
        <button
          type="button"
          onClick={toggle}
          aria-label="Lire la vidéo"
          className="absolute inset-0 z-20 flex items-center justify-center cursor-pointer"
          style={{ background: "rgba(0,0,0,0.18)" }}
        >
          <span
            className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }}
          >
            <svg width="18" height="22" viewBox="0 0 12 14" fill="#fff"><path d="M1 1l10 6L1 13V1z" /></svg>
          </span>
        </button>
      )}
    </div>
  );
}
