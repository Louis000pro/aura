"use client";

/* ─────────────────────────────────────────────────────────────
   L'étagère de badges d'un profil.

   Un badge ne donne aucun avantage : il décore, rien d'autre.
   C'est pour ça qu'il n'a le droit d'exister que gagné : une
   étagère de cadenas ne décore rien, elle réclame.

   ⚠️ Elle ne montre PAS les badges d'affiche : leur visage est
   l'affiche, et l'affiche est déjà rendue en grand juste
   au-dessus. La règle vit dans `badgesEnEtagere`, pas ici.

   Le composant est partagé par mon profil et celui de quelqu'un
   d'autre : un badge se voit du dehors, sinon il ne décore
   personne. Seul mon profil passe `progres`, donc seul mon
   profil dit ce qui vient ensuite.
   ───────────────────────────────────────────────────────────── */

import Image from "next/image";
import { AssistantSpark } from "@/components/AssistantMark";
import { badgesEnEtagere, prochainBadge, type ProgresBadges } from "@/lib/badges";

export default function EtagereBadges({ slugs, titre, progres }: {
  /** Les slugs débloqués, tels que `chargerBadgesAura` les rend. */
  slugs: Iterable<string>;
  titre: string;
  /** Ce qu'il reste à faire, pour la ligne du prochain badge. Soi seulement. */
  progres?: ProgresBadges | null;
}) {
  const badges = badgesEnEtagere(slugs);
  const suivant = progres ? prochainBadge(progres) : null;

  // Rien de gagné et rien à annoncer : l'étagère est muette. Un titre seul
  // au-dessus du vide décrirait une absence, ce qui est pire que le silence.
  if (!badges.length && !suivant) return null;

  return (
    <div className="mb-8">
      <p
        className="mb-3 text-[10px] font-bold uppercase tracking-[0.14em]"
        style={{ color: "var(--text-3)" }}
      >
        {titre}
      </p>

      {badges.length > 0 && (
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
                  /* ⚠️ LE VISAGE ARRIVE APRÈS, ET L'ÉCRAN N'ATTEND PAS.
                     Un badge sans planche porte son nombre dans le dégradé
                     violet, cerclé d'or ; le jour où huit dessins sont
                     déposés, `Badge.image` les allume sans toucher à une
                     ligne d'affichage. Même discipline que les poses de
                     Nora et Sasha, qui attendent les leurs sans bloquer
                     quoi que ce soit. */
                  <span
                    className="absolute inset-0 grid place-items-center font-black tabular-nums"
                    style={{
                      color: "#fff",
                      fontSize: b.nombre === undefined ? 0 : b.nombre >= 100 ? 17 : 20,
                      letterSpacing: "-0.04em",
                    }}
                  >
                    {b.nombre ?? <AssistantSpark px={24} />}
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
      )}

      {/* Ce qui reste à prendre tient en UNE ligne, et seulement pour le
          prochain. L'étagère ne pose pas de cases verrouillées : c'est la
          règle du 30 août, et une liste de tout ce qu'on n'a pas encore
          serait exactement le mur qu'elle évite. */}
      {suivant && (
        <p
          className={`text-[12px] font-medium ${badges.length > 0 ? "mt-4" : ""}`}
          style={{ color: "var(--text-3)" }}
        >
          Le prochain :{" "}
          <span style={{ color: "var(--exp-encre)", fontWeight: 700 }}>{suivant.badge.nom}</span>
          , encore {suivant.reste}.
        </p>
      )}
    </div>
  );
}
