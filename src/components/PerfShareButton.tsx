"use client";

/* ════════════════════════════════════════════════════════════════════
   PerfShareButton — télécharge / partage la carte de perf directement.

   L'aperçu du poster est désormais affiché à même le feed / profil / fin
   de séance (PerfShareCard), donc ce bouton n'ouvre plus de modale : il
   génère le PNG et déclenche le partage natif (mobile) ou le téléchargement
   (desktop), avec un retour visuel (spinner → ✓).

     <PerfShareButton data={perfData} iconSize={20} />                    // icône seule
     <PerfShareButton data={perfData} label="Télécharger la carte" … />   // icône + texte
   ════════════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { ImageDown, Loader2, Check } from "lucide-react";
import { sharePerfCard, type PerfShareData } from "@/lib/perfShareExport";

export default function PerfShareButton({
  data, label, iconSize = 18, className, style, ariaLabel,
}: {
  data: PerfShareData;
  label?: string;
  iconSize?: number;
  className?: string;
  style?: React.CSSProperties;
  ariaLabel?: string;
}) {
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");

  const run = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (state === "busy") return;
    setState("busy");
    const r = await sharePerfCard(data, `vaiiya-perf-${Date.now()}.png`);
    setState(r === "error" ? "error" : "done");
    window.setTimeout(() => setState("idle"), 1800);
  };

  const icon =
    state === "busy" ? <Loader2 size={iconSize} className="animate-spin" />
    : state === "done" ? <Check size={iconSize} strokeWidth={2.5} />
    : <ImageDown size={iconSize} strokeWidth={2} />;

  return (
    <button
      type="button"
      aria-label={ariaLabel ?? label}
      onClick={run}
      disabled={state === "busy"}
      className={className}
      style={style}
    >
      {icon}
      {label && (
        <span>
          {state === "busy" ? "Génération…"
            : state === "done" ? "Enregistré ✦"
            : state === "error" ? "Réessaie"
            : label}
        </span>
      )}
    </button>
  );
}
