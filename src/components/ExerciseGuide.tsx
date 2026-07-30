"use client";

import { useState, useEffect } from "react";
import { resolveGuide, pickGenre, frameSrc, type Genre } from "@/lib/exerciseGuides";

/* ════════════════════════════════════════════════════════════════════
   Le personnage-guide du « tunnel » de séance : rejoue le geste de l'exo
   en fondu-enchaîné quand un sprite existe (cf. src/lib/exerciseGuides.ts),
   sinon un halo violet épuré — JAMAIS de photo hors-sujet pendant l'effort.

   Les frames vivent dans  public/entrainement/guides/<key>-<genre>-<n>.webp .
   Ajouter un exo = `npm run guides` + une règle dans exerciseGuides.ts.
   Aucune modif ici nécessaire pour brancher une nouvelle vague de sprites.

   `genre` : le jour où on laisse l'utilisateur choisir son personnage, on
   passe son choix ici. Tant que personne ne le passe — et tant qu'un exo
   n'a qu'une seule planche — on affiche la version qui existe.
   ════════════════════════════════════════════════════════════════════ */
export default function ExerciseGuide({
  name,
  genre,
  loading = "eager",
  compact = false,
}: {
  name: string;
  genre?: Genre;
  loading?: "eager" | "lazy";
  compact?: boolean;
}) {
  const guide = resolveGuide(name);
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    setFrame(0);
    if (!guide || guide.frames < 2) return;
    if (typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setFrame(f => (f + 1) % guide.frames), 900);
    return () => clearInterval(t);
  }, [guide]);

  /* Halo violet — place réservée au personnage (fallback épuré). */
  const halo = (
    <div className="pointer-events-none absolute left-1/2 -translate-x-1/2"
      style={{
        top: "1%",
        width: compact ? 116 : 300,
        height: compact ? 116 : 300,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(139,92,246,0.16), transparent 62%)",
      }} />
  );

  if (!guide) return halo;
  const g = pickGenre(guide, genre);

  return (
    <div className="relative z-[1] flex justify-center mt-1" style={{ height: compact ? 72 : 176 }} aria-hidden>
      {halo}
      {Array.from({ length: guide.frames }).map((_, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={i} src={frameSrc(guide, g, i)} alt="" loading={loading} decoding="async"
          className="absolute top-0 h-full w-auto object-contain"
          style={{ opacity: i === frame ? 1 : 0, transition: "opacity 500ms ease-in-out" }} />
      ))}
    </div>
  );
}
