"use client";

/* ════════════════════════════════════════════════════════════════════
   La photo d'une séance, et les ambiances des états fixes.

   Extraits de `/progression` par V7A : le héros « Aujourd'hui » vit
   désormais sur l'accueil, et ces deux-là le suivent. Ils restent une
   SOURCE UNIQUE, partagée par les deux écrans — la banque photo parle
   d'elle-même, et il n'y a qu'une façon de la cadrer.
   ════════════════════════════════════════════════════════════════════ */

/** Ambiances des états fixes (widgets) — couleur appliquée in-app, comme la banque. */
export const WIDGET: Record<"repos" | "done" | "setup" | "improvise", {
  img: string; pos: string;
}> = {
  repos:     { img: "repos",     pos: "68% center" },
  done:      { img: "done",      pos: "center 40%" },
  setup:     { img: "setup",     pos: "center 45%" },
  improvise: { img: "improvise", pos: "center 40%" },
};

/** Photo naturelle — la banque parle d'elle-même. Juste l'image, cadrée,
    sur fond sombre le temps du chargement. Le scrim vit chez l'appelant. */
export function Photo({ img, pos = "center 25%", className, style, children }: {
  img: string; pos?: string;
  className?: string; style?: React.CSSProperties; children?: React.ReactNode;
}) {
  return (
    <div className={className} style={{ position: "relative", overflow: "hidden", background: "#101018", ...style }}>
      <div aria-hidden style={{ position: "absolute", inset: 0, backgroundImage: `url(/entrainement/${img}.webp)`, backgroundSize: "cover", backgroundPosition: pos }} />
      {children}
    </div>
  );
}
