"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase";
import { marquerPresence } from "@/lib/presence";
import { dependancesReelles, rejouerJournalEnAttente } from "@/lib/journalSeance";
import { observeParisDay, parisDateStr } from "@/lib/dates";

/* Monté dans le layout : venir sur l'appli, par n'importe quelle page,
   coche la mission « Connexion du jour ». Ne rend rien. Une app laissée
   ouverte traverse minuit → on remarque la présence au changement de jour
   parisien. Il rejoue aussi les séances restées en attente d'enregistrement. */
export default function PresenceDuJour() {
  const { user } = useAuth();
  const [jour, setJour] = useState(() => parisDateStr());

  useEffect(() => observeParisDay(setJour), []);

  useEffect(() => {
    if (!user) return;
    void marquerPresence(createClient(), user.id);
  }, [user, jour]);

  /* R1 · une séance dont la finalisation n'est pas allée au bout (réseau
     coupé, onglet fermé trop tôt) se reprend au retour dans l'app : le
     journal, la cible du planning, le maillon du relais, l'affiche. Pour
     CE compte seulement, et le rejeu s'arrête si le compte change. */
  const uid = user?.id;
  useEffect(() => {
    if (!uid) return;
    const rejouer = () => {
      void rejouerJournalEnAttente(dependancesReelles(createClient()), uid);
    };
    rejouer();
    /* ⚠️ UNE PWA RESTE OUVERTE DES JOURS : l'effet ne se relance pas tout
       seul. On rejoue donc aussi au retour au premier plan et au retour du
       réseau. Les appels qui se chevauchent n'en font qu'un : le rejeu est
       coordonné par compte, la finalisation par lancement. */
    const auPremierPlan = () => { if (document.visibilityState === "visible") rejouer(); };
    document.addEventListener("visibilitychange", auPremierPlan);
    window.addEventListener("online", rejouer);
    return () => {
      document.removeEventListener("visibilitychange", auPremierPlan);
      window.removeEventListener("online", rejouer);
    };
  }, [uid]);

  return null;
}
