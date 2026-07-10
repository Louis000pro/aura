"use client";

/* ════════════════════════════════════════════════════════════════════
   PerfShareButton — déclencheur autonome de la modale de partage.

   Gère son propre état d'ouverture + rend PerfShareModal. À poser tel quel
   aux points d'entrée (fin de séance, post du feed, profil) :
     <PerfShareButton data={perfShareData} className="…">Partager</PerfShareButton>
   ════════════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import PerfShareModal from "@/components/PerfShareModal";
import type { PerfShareData } from "@/lib/perfShareExport";

export default function PerfShareButton({
  data, className, style, children, ariaLabel,
}: {
  data: PerfShareData;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        aria-label={ariaLabel}
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        className={className}
        style={style}
      >
        {children}
      </button>
      <AnimatePresence>
        {open && <PerfShareModal data={data} onClose={() => setOpen(false)} />}
      </AnimatePresence>
    </>
  );
}
