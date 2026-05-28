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

  // Sur la home (mobile-only) : pas de padding sidebar desktop
  // Sur les autres pages : padding pour laisser place à la sidebar
  let cls = "min-h-screen";
  if (!noNav) {
    cls = isHome
      ? "pb-28 md:pb-0 min-h-screen"           // home : pas de pl-[88px]
      : "pb-28 md:pb-0 md:pl-[88px] min-h-screen"; // autres : place pour sidebar
  }

  return (
    <main className={cls}>
      {children}
    </main>
  );
}
