"use client";

import { useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Utensils, Dumbbell } from "lucide-react";
import type { User } from "@/context/AuthContext";
import WeeklyProgramme from "@/components/WeeklyProgramme";
import RecommendedMeals from "@/components/RecommendedMeals";

/*
   Tiroir « Aujourd'hui » : le programme de la semaine, puis les plats
   recommandés. Rien d'autre.

   Ce fichier portait aussi un carrousel d'assiettes dessinées (`PlatsZone`,
   `PlateCard`, leurs palettes et le chargement des repas du jour) : plus de
   380 lignes qui n'étaient rendues nulle part depuis que la nutrition a sa
   propre page. Elles ont été retirées le 2026-08-11 avec la requête Supabase
   qui les alimentait à chaque ouverture, pour rien.
*/
export default function StatsDrawer({
  open,
  onClose,
  user,
}: {
  open: boolean;
  onClose: () => void;
  user: User | null;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 md:left-[88px] z-[55]"
            style={{ background: "rgba(var(--tint-violet-rgb),0.5)", backdropFilter: "blur(10px)" }}
          />

          {/* Drawer */}
          <motion.div
            initial={{ y: "-100%" }} animate={{ y: 0 }} exit={{ y: "-100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 280 }}
            className="fixed inset-x-0 md:left-[88px] top-0 z-[60]"
            style={{ height: "calc(100dvh - 112px - env(safe-area-inset-bottom))" }}
          >
            <div className="relative h-full m-2 rounded-3xl overflow-hidden"
              style={{
                background: "rgba(var(--surface-rgb),0.95)",
                backdropFilter: "blur(16px)",
                border: "1px solid rgba(var(--surface-rgb),0.95)",
                boxShadow: "var(--ombre-flottant)",
              }}>

              {/* Header sticky avec bouton close */}
              <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-5 pt-4 pb-2 pointer-events-none">
                <h2 className="text-lg font-extralight pointer-events-auto" style={{ color: "var(--text-1)" }}>Aujourd&apos;hui</h2>
                <button type="button" onClick={onClose}
                  className="w-9 h-9 rounded-full flex items-center justify-center pointer-events-auto"
                  style={{ background: "rgba(var(--accent-rgb),0.12)" }}>
                  <X size={16} strokeWidth={2} style={{ color: "var(--accent)" }} />
                </button>
              </div>

              <div
                ref={scrollRef}
                className="h-full overflow-y-scroll"
                style={{ WebkitOverflowScrolling: "touch", scrollbarWidth: "none" }}
              >
                <section
                  className="h-full flex flex-col pt-16 pb-6 px-5 gap-3"
                  style={{ scrollSnapAlign: "start", scrollSnapStop: "always" }}
                >
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Dumbbell size={14} strokeWidth={1.5} style={{ color: "var(--accent)" }} />
                    <p className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: "var(--text-3)" }}>
                      Séance recommandée
                    </p>
                  </div>
                  <div className="flex-1 overflow-y-auto -mx-1 px-1 flex flex-col gap-5">
                    {user ? (
                      <>
                        <WeeklyProgramme />
                        {/* Plats recommandés — plan nutrition IA */}
                        <div className="flex flex-col gap-3">
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Utensils size={14} strokeWidth={1.5} style={{ color: "var(--gold)" }} />
                            <p className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: "var(--text-3)" }}>
                              Plats recommandés
                            </p>
                          </div>
                          <RecommendedMeals />
                        </div>
                      </>
                    ) : (
                      <p className="text-sm font-light text-center mt-8" style={{ color: "var(--text-3)" }}>Connecte-toi pour voir ton programme</p>
                    )}
                  </div>
                </section>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
