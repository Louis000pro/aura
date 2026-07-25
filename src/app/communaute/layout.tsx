"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import ConversationListPane from "@/components/communaute/ConversationListPane";
import { lockBodyModal } from "@/lib/bodyModal";

/**
 * La liste vit dans un layout persistant : changer de conversation ne la
 * démonte plus, donc recherche, scroll, archives et données déjà chargées
 * restent en place. Sur mobile, chaque page conserve son parcours plein écran.
 */
export default function CommunauteLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const activeId = pathname.match(/^\/communaute\/([^/]+)/)?.[1];
  const pleinEcran = pathname !== "/communaute";

  useEffect(() => {
    if (pleinEcran) return lockBodyModal();
  }, [pleinEcran]);

  return (
    <div className="md:flex md:h-[100dvh] md:overflow-hidden">
      <ConversationListPane
        activeId={activeId}
        className={pleinEcran
          ? "hidden w-[440px] shrink-0 border-r border-[rgba(var(--text-3-rgb),.14)] md:flex"
          : "flex w-full shrink-0 md:w-[440px] md:border-r md:border-[rgba(var(--text-3-rgb),.14)]"}
      />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
