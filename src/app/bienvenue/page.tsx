"use client";

/* Le parcours d'entrée : choix du Guide, puis le profil.

   La route est atteignable directement (c'est ce qui permet de la tester
   avant que la garde existe), et elle n'est branchée sur RIEN : ni
   l'authentification, ni `GardeGuide`, ni l'onboarding historique. Rien
   n'y envoie personne aujourd'hui, il faut y aller soi-même. */

import ParcoursBienvenue from "@/components/bienvenue/ParcoursBienvenue";

export default function BienvenuePage() {
  return <ParcoursBienvenue />;
}
