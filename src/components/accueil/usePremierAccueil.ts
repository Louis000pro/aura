"use client";

/* Séparé de `PremierAccueil.tsx` pour que l'accueil puisse savoir s'il faut
   l'afficher SANS télécharger l'écran lui-même ni le catalogue qu'il lit :
   presque personne ne le voit, il n'a rien à faire dans le chargement de
   l'écran le plus ouvert de l'app.

   ⚠️ TROIS CAS, ET UN SEUL REPÈRE (`premiere_journee_vue`, dans le compte) :
   · un compte de moins de 30 jours sans aucune séance voit sa première journée,
     même s'il a déjà noté un repas : c'est ainsi qu'elle survit à l'aller-retour
     vers Nutrition ;
   · un compte plus ancien la voit s'il n'a RIEN fait, ni séance ni repas
     (décision de Louis, 2026-11-05 : 60 comptes sur 71 n'ont rien fait) ;
   · un compte sans aucune action qui n'a pas vu la visite y passe d'abord,
     sans repasser les questions.
   L'ancien repère (`premier_accueil_vu`) n'est plus lu : presque tout le monde
   l'a posé en touchant « Entrer dans Vaiiya », sans rien faire ensuite. */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { premiersPasVus } from "@/lib/premiersPas/reponses";
import { createClient } from "@/lib/supabase";

const CLE_LOCALE = (id: string) => `vaiiya_premiere_journee_vue_${id}`;
const AGE_JEUNE_JOURS = 30;

/** Doit-on accueillir ce compte ? `null` tant qu'on ne sait pas. */
export function usePremierAccueil(userId: string | undefined) {
  const router = useRouter();
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
      if (compte.user_metadata?.premiere_journee_vue === true) {
        try { localStorage.setItem(CLE_LOCALE(userId), "1"); } catch { /* sans gravité */ }
        if (vivant) setAfficher(false);
        return;
      }
      const compter = (table: "workout_sessions" | "nutrition_logs") =>
        supabase.from(table).select("id", { count: "exact", head: true }).eq("user_id", userId);
      const [seances, repas] = await Promise.all([compter("workout_sessions"), compter("nutrition_logs")]);
      // Une lecture ratée ne déclenche rien : mieux vaut l'accueil habituel
      // qu'un « Ta première journée » à quelqu'un qui s'entraîne déjà.
      if (seances.error || repas.error) { if (vivant) setAfficher(false); return; }
      const sansSeance = (seances.count ?? 0) === 0;
      const sansRepas = (repas.count ?? 0) === 0;
      const ageJours = (Date.now() - new Date(compte.created_at).getTime()) / 86_400_000;
      const neuf = sansSeance && (ageJours <= AGE_JEUNE_JOURS || sansRepas);
      if (!vivant) return;
      if (neuf && sansRepas && !premiersPasVus(userId, compte.user_metadata)) {
        router.replace("/premiers-pas?visite=1");
        return;
      }
      setAfficher(neuf);
    })().catch(() => { if (vivant) setAfficher(false); });
    return () => { vivant = false; };
  }, [userId, dejaRegle, router]);

  const fermer = () => {
    setAfficher(false);
    if (!userId) return;
    try { localStorage.setItem(CLE_LOCALE(userId), "1"); } catch { /* sans gravité */ }
    void createClient().auth.updateUser({ data: { premiere_journee_vue: true } }).catch(() => {});
  };

  return { afficher, fermer };
}
