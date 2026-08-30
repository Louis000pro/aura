"use client";

/* ─────────────────────────────────────────────────────────────
   L'étagère de badges d'un profil.

   Un badge ne donne aucun avantage : il décore, rien d'autre.
   C'est pour ça qu'il n'a le droit d'exister que gagné : une
   étagère de cadenas ne décore rien, elle réclame.

   ⚠️ Elle ne montre PAS les badges de série : leur visage est
   l'affiche, et l'affiche est déjà rendue en grand juste
   au-dessus. La règle vit dans `badgesEnEtagere`, pas ici.

   Le composant est partagé par mon profil et celui de quelqu'un
   d'autre : un badge se voit du dehors, sinon il ne décore
   personne.
   ───────────────────────────────────────────────────────────── */

import Image from "next/image";
import { AssistantSpark } from "@/components/AssistantMark";
import { badgesEnEtagere } from "@/lib/badges";

export default function EtagereBadges({ slugs, titre }: {
  /** Les slugs débloqués, tels que `chargerBadges` les rend. */
  slugs: Iterable<string>;
  titre: string;
}) {
  const badges = badgesEnEtagere(slugs);
  if (!badges.length) return null;

  return (
    <div className="mb-8">
      <p
        className="mb-3 text-[10px] font-bold uppercase tracking-[0.14em]"
        style={{ color: "var(--text-3)" }}
      >
        {titre}
      </p>

      <div className="flex flex-wrap gap-5">
        {badges.map((b) => (
          <div key={b.slug} className="flex w-[92px] flex-col items-center text-center">
            <div
              className="relative h-14 w-14 overflow-hidden rounded-full"
              style={{
                background: b.degrade,
                border: "2px solid #D7A62A",
                boxShadow: "0 4px 18px -6px rgba(139,92,246,.55)",
              }}
            >
              {b.image ? (
                <Image src={b.image} alt="" fill sizes="56px" className="object-cover" />
              ) : (
                <span className="absolute inset-0 grid place-items-center">
                  <AssistantSpark px={24} />
                </span>
              )}
            </div>

            <b
              className="mt-2 block max-w-full text-[12px] font-semibold leading-tight"
              style={{ color: "var(--text-1)" }}
            >
              {b.nom}
            </b>
          </div>
        ))}
      </div>
    </div>
  );
}
