"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { estSurfacePublique, estVitrinePure, estVitrineSiAnonyme } from "@/lib/surfacesPubliques";

export default function MainWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, isLoading } = useAuth();

  const isAuth = pathname === "/auth";
  // Le parcours d'entrée n'a ni barre du bas ni rail (voir Navigation).
  const isBienvenue = pathname === "/bienvenue";
  const isLanding = pathname === "/" && !user && !isLoading;
  // Invitation à un relais : page publique, sans navigation, pour un
  // visiteur qui n'a pas encore de compte.
  const isInvitation = pathname.startsWith("/rejoindre") && !user && !isLoading;
  const noNav = isAuth || isBienvenue || isLanding || isInvitation;
  // Le fil d'une conversation occupe toute la hauteur et masque la barre du
  // bas (comme le tunnel de séance) → aucun padding global.
  const isFil = /^\/communaute\/[^/]+$/.test(pathname);
  // Les surfaces publiques n'ont pas de barre du bas : la réserve de 7 rem
  // laisserait un vide au pied de la page. Elles portent déjà leur propre
  // respiration haut et bas (`PageVitrine`), donc aucun padding global.
  const publique = estSurfacePublique(pathname, !!user);
  // Communauté + Premium gèrent leur propre plein écran → aucun padding global
  const fullBleed = noNav || isFil || publique || pathname === "/premium";

  // La réserve de 88 px suit le rail, et ne fait rien d'autre. Une vitrine pure
  // n'en a plus (le rail n'y existe pour personne) ; une page à double vie la
  // garde, et `a-session` l'annule en CSS pour un visiteur anonyme, exactement
  // comme elle masque le rail. Décaler ici en JavaScript déplacerait la page
  // une fois la session résolue.
  const pousse = estVitrinePure(pathname)
    ? ""
    : estVitrineSiAnonyme(pathname)
      ? " md:pl-[88px] reserve-rail-membre"
      : " md:pl-[88px]";

  return (
    <main
      className={noNav ? "min-h-screen" : `md:pb-0 min-h-screen${pousse}`}
      style={fullBleed ? {} : { paddingTop: "env(safe-area-inset-top)", paddingBottom: "calc(7rem + env(safe-area-inset-bottom))" }}
    >
      {children}
    </main>
  );
}
