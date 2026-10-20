"use client";

/* Séparé de `PremierAccueil.tsx` pour que l'accueil puisse savoir s'il faut
   l'afficher SANS télécharger l'écran lui-même ni le catalogue qu'il lit :
   presque personne ne le voit, il n'a rien à faire dans le chargement de
   l'écran le plus ouvert de l'app. */

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";

const CLE_LOCALE = (id: string) => `vaiiya_premier_accueil_vu_${id}`;
const AGE_MAX_JOURS = 30;

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

