"use client";

/* ─────────────────────────────────────────────────────────────
   Les badges mis en jeu par un défi.

   Verrouillés, ils disent ce qu'il y a à gagner ; débloqués, ils
   décorent le profil. Ils ne donnent jamais le moindre avantage.
   ───────────────────────────────────────────────────────────── */

import Image from "next/image";
import { Lock } from "lucide-react";
import { AssistantSpark } from "@/components/AssistantMark";
import type { Badge } from "@/lib/badges";

export default function RangeeBadges({ badges, debloques }: {
  badges: Badge[];
  debloques: string[];
}) {
  if (!badges.length) return null;

  return (
    <div>
      <p
        className="mb-3 text-[11px] font-bold uppercase"
        style={{ color: "var(--text-3)", letterSpacing: ".16em" }}
      >
        À débloquer
      </p>

      <div className="flex gap-4">
        {badges.map((b) => {
          const ouvert = debloques.includes(b.slug);
          return (
            <div key={b.slug} className="flex min-w-0 flex-1 flex-col items-center text-center">
              <div
                className="relative h-[62px] w-[62px] overflow-hidden rounded-full"
                style={{
                  background: b.degrade,
                  filter: ouvert ? "none" : "grayscale(1)",
                  opacity: ouvert ? 1 : 0.42,
                  boxShadow: ouvert ? "0 4px 18px -4px rgba(139,92,246,.55)" : "none",
                  border: ouvert ? "2px solid #D7A62A" : "2px solid rgba(160,174,192,.35)",
                }}
              >
                {b.image ? (
                  <Image src={b.image} alt="" fill sizes="62px" className="object-cover" />
                ) : (
                  <span className="absolute inset-0 grid place-items-center">
                    <AssistantSpark px={26} />
                  </span>
                )}

                {!ouvert && (
                  <span className="absolute inset-0 grid place-items-center bg-black/35">
                    <Lock className="h-4 w-4 text-white/90" />
                  </span>
                )}
              </div>

              <b
                className="mt-2 block max-w-full truncate text-[12.5px] font-semibold"
                style={{ color: ouvert ? "var(--text-0)" : "var(--text-2)" }}
              >
                {b.nom}
              </b>
              <span className="mt-0.5 block text-[10.5px] leading-tight" style={{ color: "var(--text-3)" }}>
                {ouvert ? "Débloqué" : b.condition}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
