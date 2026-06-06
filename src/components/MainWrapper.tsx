"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function MainWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, isLoading } = useAuth();

  const isAuth = pathname === "/auth";
  const isLanding = pathname === "/" && !user && !isLoading;
  const noNav = isAuth || isLanding;

  return (
    <main
      className={noNav ? "min-h-screen" : "md:pb-0 md:pl-[88px] min-h-screen"}
      style={noNav ? {} : { paddingBottom: "calc(7rem + env(safe-area-inset-bottom))" }}
    >
      {children}
    </main>
  );
}
