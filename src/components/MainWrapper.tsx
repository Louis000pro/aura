"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function MainWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, isLoading } = useAuth();

  const isAuth = pathname === "/auth";
  const isLanding = pathname === "/" && !user && !isLoading;
  // Invitation à un relais : page publique, sans navigation, pour un
  // visiteur qui n'a pas encore de compte.
  const isInvitation = pathname.startsWith("/rejoindre") && !user && !isLoading;
  const noNav = isAuth || isLanding || isInvitation;
  // Le fil d'une conversation occupe toute la hauteur et masque la barre du
  // bas (comme le tunnel de séance) → aucun padding global.
  const isFil = /^\/communaute\/[^/]+$/.test(pathname);
  // Communauté + Premium gèrent leur propre plein écran → aucun padding global
  const fullBleed = noNav || isFil || pathname === "/premium";

  return (
    <main
      className={noNav ? "min-h-screen" : "md:pb-0 md:pl-[88px] min-h-screen"}
      style={fullBleed ? {} : { paddingTop: "env(safe-area-inset-top)", paddingBottom: "calc(7rem + env(safe-area-inset-bottom))" }}
    >
      {children}
    </main>
  );
}
