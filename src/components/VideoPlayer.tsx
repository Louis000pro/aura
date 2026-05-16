"use client";

import { useRef, useEffect } from "react";

/**
 * VideoPlayer — vidéo avec fond flouté synchronisé (style TikTok/Reels)
 * Le fond suit exactement la vidéo principale : play, pause, seek, time
 */

interface VideoPlayerProps {
  src: string;
  maxHeight?: number;
  controls?: boolean;
  muted?: boolean;
  autoPlay?: boolean;
  className?: string;
}

export default function VideoPlayer({
  src,
  maxHeight = 380,
  controls = true,
  muted = false,
  autoPlay = false,
  className = "",
}: VideoPlayerProps) {
  const mainRef = useRef<HTMLVideoElement>(null);
  const bgRef   = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const main = mainRef.current;
    const bg   = bgRef.current;
    if (!main || !bg) return;

    // Sync time toutes les 500ms pour rester aligné
    const syncInterval = setInterval(() => {
      if (!main.paused && Math.abs(bg.currentTime - main.currentTime) > 0.3) {
        bg.currentTime = main.currentTime;
      }
    }, 500);

    const onPlay   = () => { bg.currentTime = main.currentTime; void bg.play().catch(() => {}); };
    const onPause  = () => bg.pause();
    const onSeeked = () => { bg.currentTime = main.currentTime; };
    const onEnded  = () => bg.pause();

    main.addEventListener("play",   onPlay);
    main.addEventListener("pause",  onPause);
    main.addEventListener("seeked", onSeeked);
    main.addEventListener("ended",  onEnded);

    // Si autoPlay actif, lancer les deux immédiatement
    if (autoPlay) {
      void main.play().catch(() => {});
      void bg.play().catch(() => {});
    }

    return () => {
      clearInterval(syncInterval);
      main.removeEventListener("play",   onPlay);
      main.removeEventListener("pause",  onPause);
      main.removeEventListener("seeked", onSeeked);
      main.removeEventListener("ended",  onEnded);
    };
  }, [src, autoPlay]);

  return (
    <div
      className="relative overflow-hidden w-full"
      style={{ maxHeight, background: "#000" }}
    >
      {/* ── Fond flouté synchronisé ── */}
      <video
        ref={bgRef}
        src={src}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        style={{
          filter: "blur(22px) brightness(0.45)",
          transform: "scale(1.12)",
          willChange: "transform",
        }}
        muted
        playsInline
        preload="metadata"
        aria-hidden="true"
        tabIndex={-1}
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
      />
    </div>
  );
}
