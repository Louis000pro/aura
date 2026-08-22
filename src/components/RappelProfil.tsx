"use client";

/* ════════════════════════════════════════════════════════════════════
   Le rappel quand le questionnaire d'entrée a été laissé en chemin.

   ⚠️ CE N'EST PLUS UN ROBOT. Avant le 2026-08-22, une bulle 🤖
   « N'oublie pas de remplir tes objectifs » renvoyait vers l'ancienne
   modale d'inscription, c'est-à-dire vers un formulaire que Nora et
   Sasha ne connaissaient pas. Deux problèmes en un : un personnage
   générique parlait à la place du Guide, et le seul chemin qu'il
   proposait ramenait à la version d'avant.

   Désormais c'est le Guide qui le dit, avec son visage et sa
   formulation (`bienvenue.rappel` dans `lib/guides.ts`), et le seul
   chemin proposé est `/bienvenue`, le questionnaire unique.

   Sans Guide résolu (choix pas encore fait, colonne pas encore là, hors
   ligne), `VisageGuide` repose l'étincelle ✦ et `voix(null, …)` rend la
   formulation commune : le rappel fonctionne quand même, il est
   simplement anonyme.

   ── Ce que ce composant ne fait PLUS ────────────────────────────────
   Il n'ouvre plus de questionnaire (il n'y en a qu'un, et c'est une
   page), il ne lance plus la visite guidée et il ne joue plus la
   célébration : la conclusion de `/bienvenue` fait les trois.
   ════════════════════════════════════════════════════════════════════ */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useGuideActif } from "@/context/GuideContext";
import { useGuidedTour } from "@/context/GuidedTourContext";
import { VisageGuide } from "@/components/AssistantMark";
import { createClient } from "@/lib/supabase";
import { voix } from "@/lib/guides";
import { estSurfacePublique } from "@/lib/surfacesPubliques";
import { usePathname } from "next/navigation";

/** Les routes où un rappel n'a rien à faire : celle qui y répond, et
 *  celles où l'on n'a pas encore de compte à remplir. */
const MUETTES = ["/bienvenue", "/auth", "/rejoindre"];

export default function RappelProfil() {
  const { user, isLoading } = useAuth();
  const { guide } = useGuideActif();
  const { isOpen: visiteOuverte } = useGuidedTour();
  const pathname = usePathname();
  const router = useRouter();

  const [aRepondre, setARepondre] = useState(false);
  const [ecarte, setEcarte] = useState(false);

  useEffect(() => {
    if (!user?.id || isLoading) return;
    let vivant = true;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", user.id)
        .maybeSingle();
      if (!vivant) return;
      /* Une lecture ratée rend `null` : on se tait plutôt que de
         réclamer des réponses peut-être déjà données. */
      setARepondre(data?.onboarding_completed === false);
    })();
    return () => { vivant = false; };
  }, [user?.id, isLoading]);

  const muette = MUETTES.some((r) => pathname === r || pathname.startsWith(`${r}/`))
    || estSurfacePublique(pathname, true);

  if (!user || !aRepondre || ecarte || muette || visiteOuverte) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.88 }}
        transition={{ type: "spring", damping: 22, stiffness: 280 }}
        className="fixed bottom-32 right-3 md:bottom-6 md:right-4 z-50 max-w-[228px]"
      >
        <div
          className="relative rounded-2xl px-4 py-3 shadow-xl"
          style={{
            background: "rgba(var(--surface-rgb),0.97)",
            border: "1.5px solid rgba(var(--violet-mid-rgb),0.7)",
            boxShadow: "0 8px 32px rgba(var(--accent-rgb),0.22), 0 2px 8px rgba(0,0,0,0.08)",
          }}
        >
          <button
            onClick={() => setEcarte(true)}
            aria-label="Masquer ce rappel"
            className="absolute top-2 right-2 w-4 h-4 flex items-center justify-center rounded-full cursor-pointer"
            style={{ background: "rgba(var(--text-3-rgb),0.15)", color: "var(--text-3)" }}
          >
            <X size={9} strokeWidth={2.5} />
          </button>

          <div className="flex items-start gap-2 pr-3">
            {/* `listen` : il attend une réponse de toi. C'est le même
                état que partout ailleurs dans l'app, et il se lit. */}
            <VisageGuide guide={guide} etat="listen" size={26} className="mt-0.5" />
            <div className="flex flex-col items-start gap-1.5">
              <p className="text-[12px] leading-snug" style={{ color: "var(--text-body)" }}>
                {voix(guide, "bienvenue.rappel")}
              </p>
              <button
                onClick={() => router.push("/bienvenue")}
                className="text-[12px] font-bold cursor-pointer underline underline-offset-2"
                style={{ color: "var(--accent)" }}
              >
                Reprendre
              </button>
            </div>
          </div>

          <div
            className="absolute -bottom-2 right-6"
            style={{
              width: 0, height: 0,
              borderLeft: "7px solid transparent",
              borderRight: "7px solid transparent",
              borderTop: "8px solid rgba(var(--surface-rgb),0.97)",
              filter: "drop-shadow(0 2px 2px rgba(var(--accent-rgb),0.15))",
            }}
          />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
