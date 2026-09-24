"use client";

/* ════════════════════════════════════════════════════════════════════
   GardePseudo — l'écran « choisis ton pseudo » après une première
   connexion Google.

   Un compte Google arrive sans pseudo : `ensure-profile` en fabrique un
   (à partir du nom ou de l'email) et marque `pseudo_choisi = false`. Cette
   garde lit ce drapeau et, s'il est faux, envoie une seule fois vers
   `/choisir-pseudo`. Un compte email a donné son pseudo au formulaire :
   son drapeau vaut `true` (le DEFAULT de la colonne), il ne voit rien.

   ⚠️ DÉFENSIF, COMME `GardeGuide` : on ne redirige QUE sur `false` explicite.
   Tant que `20260924_pseudo_choisi.sql` n'est pas collée, la colonne
   n'existe pas, la lecture échoue, et personne n'est envoyé nulle part.
   L'app se comporte exactement comme avant.

   ⚠️ Elle PRÉCÈDE le choix du Guide : elle ne s'exempte pas de
   `/bienvenue`, donc un compte Google choisit d'abord son pseudo, puis son
   Guide. L'ordre est : pseudo → guide → profil.
   ════════════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase";
import { estSurfacePublique } from "@/lib/surfacesPubliques";

export const ROUTE_PSEUDO = "/choisir-pseudo";

/* On ne s'impose ni sur l'écran lui-même (sinon boucle), ni là où il n'y a
   pas encore de compte. `/bienvenue` n'y est PAS : le pseudo passe avant. */
const EXEMPTES = [ROUTE_PSEUDO, "/auth", "/rejoindre"];

function estExempte(pathname: string): boolean {
  return EXEMPTES.some((r) => pathname === r || pathname.startsWith(`${r}/`));
}

export default function GardePseudo() {
  const { user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  /** `null` = pas encore lu. On ne redirige que sur `true`. */
  const [besoin, setBesoin] = useState<boolean | null>(null);
  const luPour = useRef<string | null>(null);

  // Une seule lecture par compte : le drapeau ne change pas en cours de
  // session (il tombe à true dès que le pseudo est choisi, ce qui recharge).
  useEffect(() => {
    if (!user?.id || luPour.current === user.id) return;
    luPour.current = user.id;
    const supabase = createClient();
    supabase
      .from("profiles")
      .select("pseudo_choisi")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        // Colonne absente / lecture ratée → on ne dérange personne.
        setBesoin(!error && (data as { pseudo_choisi?: boolean } | null)?.pseudo_choisi === false);
      });
  }, [user?.id]);

  useEffect(() => {
    if (!user || besoin !== true) return;
    if (estExempte(pathname)) return;
    if (estSurfacePublique(pathname, true)) return;
    router.replace(ROUTE_PSEUDO);
  }, [user, besoin, pathname, router]);

  return null;
}
