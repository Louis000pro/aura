"use client";

import { usePathname } from "next/navigation";

export default function MainWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuth = pathname === "/auth";

  return (
    <main className={isAuth ? "min-h-screen" : "pb-28 md:pb-0 md:pl-[88px] min-h-screen"}>
      {children}
    </main>
  );
}
