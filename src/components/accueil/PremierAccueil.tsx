"use client";

/* ════════════════════════════════════════════════════════════════════
   LE PREMIER ACCUEIL (Louis, 2026-10-12, maquette « premier-accueil »,
   piste A). Un nouvel inscrit arrive sur l'accueil et c'est l'accueil
   lui-même qui lui dit bonjour : son Guide en grand, son prénom, une
   phrase, puis DEUX choix de même importance visuelle :
     · commencer sa première séance (courte, gratuite, choisie d'après
       son lieu d'entraînement) ;
     · entrer dans Vaiiya et regarder d'abord.
   Rien n'est imposé, et c'est la consigne : pas de gros bouton qui
   oblige à faire la séance.

   ⚠️ IL NE REVIENT JAMAIS UNE FOIS UN CHOIX FAIT. Le repère vit dans les
   métadonnées du COMPTE (Supabase Auth, aucune migration), donc il suit
   la personne sur tous ses appareils ; le localStorage n'est qu'un cache
   qui évite de le revoir clignoter pendant que la session se lit.
   ⚠️ IL NE S'ADRESSE QU'À UN NOUVEAU : compte de moins de 30 jours ET
   aucune séance enregistrée. Dire « Bienvenue » à quelqu'un qui est là
   depuis des mois, ou qui s'entraîne déjà, sonnerait faux.
   ════════════════════════════════════════════════════════════════════ */

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { readLieu } from "@/lib/planning";
import { workoutSessions } from "@/lib/catalogueSeances";
import { heroImageForSeance } from "@/lib/workoutArt";
import { voix, nomGuide, type GuideRef } from "@/lib/guides";
import { BusteGuide } from "@/components/AssistantMark";
import { useWorkoutLaunch } from "@/context/WorkoutLaunchContext";

const CLE_LOCALE = (id: string) => `vaiiya_premier_accueil_vu_${id}`;
const AGE_MAX_JOURS = 30;

/** La première séance proposée : courte, gratuite, et adaptée au lieu. */
function premiereSeance(userId: string) {
  const { location } = readLieu(userId);
  const id = location === "salle" ? "salle-decouverte" : "express-12";
  return workoutSessions.find((s) => s.id === id) ?? workoutSessions.find((s) => s.id === "express-12")!;
}

/** Doit-on accueillir ce compte ? `null` tant qu'on ne sait pas. */
export function usePremierAccueil(userId: string | undefined) {
  /* Lu tout de suite : l'accueil n'est rendu que côté client (la session
     est résolue), donc aucun écart d'hydratation, et un compte déjà accueilli
     ne voit jamais rien clignoter. */
  const [afficher, setAfficher] = useState<boolean | null>(() => {
    try { return userId && localStorage.getItem(CLE_LOCALE(userId)) === "1" ? false : null; }
    catch { return null; }
  });

  const dejaRegle = afficher === false;
  useEffect(() => {
    if (!userId || dejaRegle) return;
    let vivant = true;
    const supabase = createClient();
    (async () => {
      const { data } = await supabase.auth.getSession();
      const compte = data.session?.user;
      if (!compte) { if (vivant) setAfficher(false); return; }
      const vu = compte.user_metadata?.premier_accueil_vu === true;
      const ageJours = (Date.now() - new Date(compte.created_at).getTime()) / 86_400_000;
      if (vu || ageJours > AGE_MAX_JOURS) {
        try { localStorage.setItem(CLE_LOCALE(userId), "1"); } catch { /* sans gravité */ }
        if (vivant) setAfficher(false);
        return;
      }
      const { count, error } = await supabase
        .from("workout_sessions").select("id", { count: "exact", head: true }).eq("user_id", userId);
      // Une lecture ratée ne déclenche rien : mieux vaut l'accueil habituel
      // qu'un « Bienvenue » à quelqu'un qui s'entraîne déjà.
      if (vivant) setAfficher(!error && (count ?? 0) === 0);
    })().catch(() => { if (vivant) setAfficher(false); });
    return () => { vivant = false; };
  }, [userId, dejaRegle]);

  const fermer = () => {
    setAfficher(false);
    if (!userId) return;
    try { localStorage.setItem(CLE_LOCALE(userId), "1"); } catch { /* sans gravité */ }
    void createClient().auth.updateUser({ data: { premier_accueil_vu: true } }).catch(() => {});
  };

  return { afficher, fermer };
}

export default function PremierAccueil({ userId, pseudo, guide, onFermer }: {
  userId: string;
  pseudo: string;
  guide: GuideRef;
  onFermer: () => void;
}) {
  const { launchWorkout } = useWorkoutLaunch();
  const seance = premiereSeance(userId);
  const photo = heroImageForSeance({ title: seance.title, category: seance.category });

  /* Choisir la séance compte comme un choix : l'accueil habituel prend le
     relais derrière le lecteur. Si la séance est interrompue, c'est la
     reprise de l'accueil qui la repropose, pas ce seuil. */
  const commencer = () => {
    onFermer();
    launchWorkout({
      sessionId: seance.id,
      title: seance.title,
      duration: seance.duration,
      difficulty: seance.difficulty,
      category: seance.category,
      heroImage: photo,
    });
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
      className="flex flex-col"
      aria-label="Bienvenue dans Vaiiya"
    >
      {/* Le Guide, sans cadre : son bas se dissout dans la page. */}
      <div className="relative -mt-4 flex justify-center" style={{ height: 260 }}>
        <BusteGuide guide={guide} hauteur={280} />
      </div>

      <div className="relative -mt-8 text-center">
        {guide && (
          <p className="vy-label" style={{ color: "var(--exp-encre)" }}>{nomGuide(guide)}, ton Guide</p>
        )}
        <h1 className="mt-1 text-[34px] leading-[1.05]"
          style={{ color: "var(--text-0)", fontWeight: 800, fontVariationSettings: "var(--w-voix)", textWrap: "balance" }}>
          Bienvenue,{" "}
          <em style={{
            background: "var(--degrade-titre)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            fontStyle: "italic", display: "inline-block", paddingRight: "0.14em",
          }}>{pseudo}</em>
        </h1>
        <p className="vy-corps mx-auto mt-2 max-w-[30ch]" style={{ color: "var(--text-2)" }}>
          {voix(guide, "accueil.premier")}
        </p>
      </div>

      <div className="mt-6 flex flex-col gap-2.5">
        <button
          type="button"
          onClick={commencer}
          className="flex w-full items-center gap-3 p-2.5 pr-4 text-left text-white active:scale-[.98] transition-transform"
          style={{ borderRadius: "var(--r-bloc)", background: "linear-gradient(135deg, #8B5CF6, #C13BC1)", boxShadow: "var(--ombre-action)" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo} alt="" className="h-14 w-14 shrink-0 object-cover" style={{ borderRadius: "var(--r-controle)" }} />
          <span className="min-w-0 flex-1">
            <b className="block text-[16px]" style={{ fontWeight: 800 }}>Commencer ma première séance</b>
            <span className="vy-nombre block text-[11px] opacity-90">
              {seance.title} · {seance.duration} min · {seance.id === "salle-decouverte" ? "en salle" : "sans matériel"}
            </span>
          </span>
          <ChevronRight className="h-5 w-5 shrink-0" />
        </button>

        <button
          type="button"
          onClick={onFermer}
          className="w-full py-3.5 text-[16px] font-bold active:scale-[.98] transition-transform"
          style={{ borderRadius: "var(--r-bloc)", background: "rgba(var(--surface-rgb), .85)", color: "var(--exp-encre)", boxShadow: "var(--ombre-pose)" }}
        >
          Entrer dans Vaiiya
        </button>
      </div>

      <p className="mt-3 text-center text-[13px]" style={{ color: "var(--text-3)" }}>
        Tu retrouveras cette séance dans Entraînement.
      </p>
    </motion.section>
  );
}
