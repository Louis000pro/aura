"use client";

import { useRef, useEffect } from "react";

/**
 * VideoPlayer — vidéo avec fond flouté synchronisé (style TikTok/Reels)
 * Le fond suit exactement la vidéo principale : play, pause, seek, time
 * autoPlayOnScroll : joue automatiquement quand la vidéo est visible (IntersectionObserver)
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
  const bgRef   = useRef<HTMLVideoElement>(null);

  /* ── Sync bg avec main ── */
  useEffect(() => {
    const main = mainRef.current;
    const bg   = bgRef.current;
    if (!main || !bg) return;

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

    if (autoPlay && !autoPlayOnScroll) {
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
  }, [src, autoPlay, autoPlayOnScroll]);

  /* ── Autoplay au scroll via IntersectionObserver ── */
  useEffect(() => {
    if (!autoPlayOnScroll) return;
    const container = containerRef.current;
    const main = mainRef.current;
    const bg   = bgRef.current;
    if (!container || !main) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            void main.play().catch(() => {});
            if (bg) { bg.currentTime = main.currentTime; void bg.play().catch(() => {}); }
          } else {
            main.pause();
            bg?.pause();
          }
        });
      },
      { threshold: 0.5 }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, [autoPlayOnScroll]);

  return (
    <div
      ref={containerRef}
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
        loop={loop}
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
        muted={muted || autoPlayOnScroll}
        playsInline
        preload="metadata"
        loop={loop}
      />
    </div>
  );
}
