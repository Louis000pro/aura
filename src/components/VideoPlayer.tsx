"use client";

/**
 * VideoPlayer — affiche une vidéo avec fond flouté (style TikTok/Reels)
 * Le fond est la même vidéo blurée, scale, assombrie → plus de barres noires
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
  return (
    <div
      className="relative overflow-hidden w-full"
      style={{ maxHeight, background: "#000" }}
    >
      {/* ── Fond flouté (même vidéo, décoratif) ── */}
      <video
        src={src}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        style={{
          filter: "blur(22px) brightness(0.45)",
          transform: "scale(1.12)",
          willChange: "transform",
        }}
        muted
        autoPlay
        loop
        playsInline
        preload="metadata"
        aria-hidden="true"
        tabIndex={-1}
      />

      {/* ── Vidéo principale centrée ── */}
      <video
        src={src}
        className={`relative z-10 w-full object-contain block ${className}`}
        style={{ maxHeight }}
        controls={controls}
        muted={muted}
        autoPlay={autoPlay}
        playsInline
        preload="metadata"
      />
    </div>
  );
}
