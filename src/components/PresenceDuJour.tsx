"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase";
import { marquerPresence } from "@/lib/presence";
import { rejouerJournalEnAttente } from "@/lib/journalSeance";
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

  /* R1 · une séance dont l'enregistrement avait échoué (réseau coupé,
     onglet fermé trop tôt) se rejoue au retour dans l'app, avec la cible
     du planning qu'elle devait refermer. */
  const uid = user?.id;
  useEffect(() => {
    if (!uid) return;
    void rejouerJournalEnAttente(createClient(), uid);
  }, [uid]);

  return null;
}
