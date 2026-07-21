"use client";

/* ─────────────────────────────────────────────────────────────
   Les affiches gagnées, sur le profil.

   Section distincte des badges historiques (Badges.tsx) : ceux-là
   se gagnent seul et sont des pastilles à emoji, ceux-ci se
   gagnent À DEUX et leur visage est l'affiche elle-même. Les
   mélanger diluerait les deux.
   ───────────────────────────────────────────────────────────── */

import { useState, useEffect } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { AssistantSpark } from "@/components/AssistantMark";
import { chargerBadges } from "@/lib/messagerie";
import { badgeParSlug, type Badge } from "@/lib/badges";

export default function BadgesRelais({ userId }: { userId: string }) {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [charge, setCharge] = useState(true);

  useEffect(() => {
    void chargerBadges(userId).then((slugs) => {
      setBadges(slugs.map(badgeParSlug).filter((b): b is Badge => b !== null));
      setCharge(false);
    });
  }, [userId]);

  if (charge) return null;

  return (
    <div className="mb-8">
      <p
        className="mb-3 text-[10px] font-semibold uppercase"
        style={{ color: "var(--text-3)", letterSpacing: ".14em" }}
      >
        Affiches gagnées
      </p>

      {badges.length === 0 ? (
        <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-3)" }}>
          Aucune pour l&apos;instant. Elles se gagnent à deux, en terminant un relais.
        </p>
      ) : (
        <div className="flex flex-wrap gap-5">
          {badges.map((b, i) => (
            <motion.div
              key={b.slug}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.06, duration: 0.3 }}
              className="flex w-[76px] flex-col items-center text-center"
            >
              <div
                className="relative h-[68px] w-[68px] overflow-hidden rounded-full"
                style={{
                  background: b.degrade,
                  border: "2px solid #D7A62A",
                  boxShadow: "0 4px 18px -4px rgba(215,166,42,.45)",
                }}
              >
                {b.image ? (
                  <Image src={b.image} alt="" fill sizes="68px" className="object-cover" />
                ) : (
                  <span className="absolute inset-0 grid place-items-center">
                    <AssistantSpark px={28} />
                  </span>
                )}
              </div>
              <b className="mt-2 block w-full truncate text-[12px] font-semibold" style={{ color: "var(--text-1)" }}>
                {b.nom}
              </b>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
