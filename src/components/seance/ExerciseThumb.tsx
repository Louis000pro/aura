"use client";

import { useEffect, useRef, useState } from "react";
import { resolveGuide, pickGenre, frameSrc, type Genre } from "@/lib/exerciseGuides";

/* ════════════════════════════════════════════════════════════════════
   La vignette animée d'un exercice, pour les listes (bibliothèque,
   séance en cours de création).

   Deux différences avec ExerciseGuide, qui vit dans le tunnel :
   • les frames ne sont montées QUE si la vignette est à l'écran. Une
     grille de cent exos ferait sinon des centaines de requêtes d'un coup.
   • l'animation est décalée d'une carte à l'autre (`delay`) : cent
     personnages qui changent de pose à la même milliseconde, ça clignote.

   Pas de sprite pour ce nom : on garde la place avec un halo violet, la
   même règle que dans le tunnel (jamais d'image hors sujet).
   ════════════════════════════════════════════════════════════════════ */
export default function ExerciseThumb({
  name,
  size = 84,
  delay = 0,
  genre,
}: {
  name: string;
  size?: number;
  delay?: number;
  genre?: Genre;
}) {
  const guide = resolveGuide(name);
  const boite = useRef<HTMLDivElement>(null);
  /* Navigateur sans IntersectionObserver : on affiche tout de suite. */
  const [visible, setVisible] = useState(() => typeof IntersectionObserver === "undefined");
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const el = boite.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      entries => { if (entries.some(e => e.isIntersecting)) setVisible(true); },
      { rootMargin: "240px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || !guide || guide.frames < 2) return;
    if (typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    let boucle: ReturnType<typeof setInterval> | null = null;
    const depart = setTimeout(() => {
      boucle = setInterval(() => setFrame(f => (f + 1) % guide.frames), 900);
    }, delay % 900);
    return () => { clearTimeout(depart); if (boucle) clearInterval(boucle); };
  }, [visible, guide, delay]);

  const g = guide ? pickGenre(guide, genre) : "f";

  return (
    <div
      ref={boite}
      className="relative flex-shrink-0 flex items-end justify-center overflow-hidden"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          borderRadius: "50%",
          background: "radial-gradient(circle at 50% 45%, rgba(139,92,246,0.18), transparent 66%)",
        }}
      />
      {visible && guide && Array.from({ length: guide.frames }).map((_, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={i}
          src={frameSrc(guide, g, i)}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 w-full h-full object-contain"
          style={{ opacity: i === frame ? 1 : 0, transition: "opacity 420ms ease-in-out" }}
        />
      ))}
    </div>
  );
}
