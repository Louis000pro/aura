"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import ExerciseAnalyzer from "@/components/ExerciseAnalyzer";

/* Outil « Analyse de posture » (caméra + MediaPipe, sur l'appareil).
   Route dédiée, lancée depuis l'orbe assistant (second plan) — plus un
   sous-onglet de Progression. Fonctionne sans le LLM : gratuit, illimité. */
export default function AnalysePage() {
  const router = useRouter();
  return (
    <div className="fixed inset-0 md:left-[88px] overflow-y-auto overscroll-none" style={{ background: "var(--page-bg)", height: "100dvh", WebkitOverflowScrolling: "touch" }}>
      <div
        className="mx-auto w-full max-w-2xl px-4"
        style={{
          paddingTop: "calc(env(safe-area-inset-top) + 62px)",
          paddingBottom: "calc(96px + env(safe-area-inset-bottom))",
        }}
      >
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-1.5 mb-4 text-sm font-medium cursor-pointer"
          style={{ color: "var(--text-3)" }}
        >
          <ArrowLeft size={16} strokeWidth={2} /> Retour
        </button>
        <ExerciseAnalyzer />
      </div>
    </div>
  );
}
