"use client";

/* ════════════════════════════════════════════════════════════════════
   GardeConnexion — une page de l'app sans session renvoie à la connexion.

   Avant (signalé par Louis le 2026-10-12) : se déconnecter, ou voir sa
   session expirer, sur un écran de l'app laissait cet écran à l'affichage
   SANS la barre du bas (elle disparaît sans compte), donc sans aucune
   sortie. On ne pouvait plus rien faire.

   ⚠️ LA LISTE EST CELLE DES ÉCRANS DE L'APP, PAS CELLE DES PAGES PUBLIQUES.
   Protéger « tout sauf le public » fermerait au visiteur la prochaine page
   vitrine qu'on oublierait d'ajouter à l'exemption. Ici, un oubli laisse au
   pire une page de l'app ouverte comme avant, ce qui est le bon échec.

   ⚠️ ON NE CROIT PAS `isLoading` SUR PAROLE. `AuthContext` le passe à faux
   au bout de 3 s même si la session n'a pas encore répondu (réseau lent) :
   rediriger là enverrait vers la connexion quelqu'un qui est connecté. On
   redemande donc la session à Supabase avant de bouger.
   ════════════════════════════════════════════════════════════════════ */

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase";

const ECRANS_APP = [
  "/progression",
  "/nutrition",
  "/communaute",
  "/profil",
  "/parametres",
  "/notifications",
  "/defi",
  "/admin",
  "/analyse",
  "/bienvenue",
  "/choisir-pseudo",
];

function estEcranApp(pathname: string): boolean {
  return ECRANS_APP.some((r) => pathname === r || pathname.startsWith(`${r}/`));
}

export default function GardeConnexion() {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (isLoading || user || !estEcranApp(pathname)) return;
    let annule = false;
    createClient().auth.getSession().then(({ data }) => {
      if (annule || data.session) return;
      router.replace(`/auth?next=${encodeURIComponent(pathname)}`);
    }).catch(() => { /* hors ligne : on ne sait pas, on ne bouge pas */ });
    return () => { annule = true; };
  }, [isLoading, user, pathname, router]);

  return null;
}
