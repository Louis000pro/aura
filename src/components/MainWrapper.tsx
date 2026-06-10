"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function MainWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, isLoading } = useAuth();

  const isAuth = pathname === "/auth";
  const isLanding = pathname === "/" && !user && !isLoading;
  const noNav = isAuth || isLanding;
  // Communauté + Premium gèrent leur propre plein écran → aucun padding global
  const fullBleed = noNav || pathname === "/communaute" || pathname === "/premium";

  return (
    <main
      className={noNav ? "min-h-screen" : "md:pb-0 md:pl-[88px] min-h-screen"}
      style={fullBleed ? {} : { paddingTop: "env(safe-area-inset-top)", paddingBottom: "calc(7rem + env(safe-area-inset-bottom))" }}
    >
      {children}
    </main>
  );
}
