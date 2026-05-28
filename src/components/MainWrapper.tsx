"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function MainWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, isLoading } = useAuth();

  const isAuth = pathname === "/auth";
  const isLanding = pathname === "/" && !user && !isLoading;
  const isHome = pathname === "/" && user;
  const noNav = isAuth || isLanding;

  // Sur la home (mobile-only) : pas de padding sidebar, mais on garde pb-28
  // (la bottom nav reste visible sur la home même sur desktop)
  // Sur les autres pages : padding pour laisser place à la sidebar desktop
  let cls = "min-h-screen";
  if (!noNav) {
    cls = isHome
      ? "pb-28 min-h-screen"                       // home : pb-28 partout, pas de sidebar
      : "pb-28 md:pb-0 md:pl-[88px] min-h-screen"; // autres : sidebar desktop
  }

  return (
    <main className={cls}>
      {children}
    </main>
  );
}
