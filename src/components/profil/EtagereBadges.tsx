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
      <div className="flex items-baseline justify-between mb-3.5">
        <h2 className="vy-sous" style={{ margin: 0, color: "var(--text-0)" }}>{titre}</h2>
        {badges.length > 0 && (
          <span className="vy-nombre text-[13px]" style={{ color: "var(--text-2)" }}>
            {badges.length} {badges.length > 1 ? "gagnés" : "gagné"}
          </span>
        )}
      </div>

      {/* LA VITRINE (maquette « Le profil Vaiiya », 2026-10-14) : les
          médailles posées sur une étagère, et le prochain badge à côté,
          en anneau qui se remplit. Il n'est pas une case verrouillée :
          c'est ce qu'on est en train de gagner, et on le voit avancer. */}
      <div className="relative -mx-5 overflow-x-auto px-5 pb-1" style={{ scrollbarWidth: "none" }}>
        <div className={`relative flex min-w-full w-max gap-3 ${badges.length + (suivant ? 1 : 0) >= 4 ? "justify-between" : "justify-start"}`}>
          {/* l'étagère, sous les médailles, de bout en bout */}
          <div
            aria-hidden
            className="absolute -left-1.5 -right-1.5 rounded-full"
            style={{
              top: 74, height: 10,
              background: "linear-gradient(180deg, rgba(255,255,255,.95), rgba(255,255,255,.4))",
              boxShadow: "0 10px 18px -10px rgba(45,55,72,.4), inset 0 -1px 0 rgba(28,22,38,.06)",
            }}
          />
          {badges.map((b) => (
            <div key={b.slug} className="relative flex w-[76px] flex-shrink-0 flex-col items-center text-center">
              <div
                className="h-[66px] w-[66px] rounded-full p-[3px]"
                style={{
                  background: "conic-gradient(#FFD34E, #F5B120, #FFE89A, #F5B120, #FFD34E)",
                  boxShadow: b.image ? "0 14px 22px -12px rgba(201,138,11,.75)" : "0 14px 22px -12px rgba(139,92,246,.75)",
                }}
              >
                <div
                  className="relative h-full w-full overflow-hidden rounded-full"
                  style={{ background: b.image ? b.degrade : "radial-gradient(80% 80% at 30% 20%, #A98BFF, #8B5CF6 45%, #6A2FC7)" }}
                >
                  {b.image ? (
                    <Image src={b.image} alt="" fill sizes="60px" className="object-cover" style={{ objectPosition: "50% 30%" }} />
                  ) : (
                    /* ⚠️ LE VISAGE ARRIVE APRÈS, ET L'ÉCRAN N'ATTEND PAS.
                       Un badge sans planche porte son nombre ; le jour où
                       les dessins sont déposés, `Badge.image` les allume
                       sans toucher à une ligne d'affichage. */
                    <span
                      className="vy-nombre absolute inset-0 grid place-items-center"
                      style={{ color: "#fff", fontSize: b.nombre === undefined ? 0 : b.nombre >= 100 ? 17 : 20, fontWeight: 800 }}
                    >
                      {b.nombre ?? <AssistantSpark px={24} />}
                    </span>
                  )}
                </div>
              </div>
              <b className="mt-[26px] block max-w-full text-[11px] font-semibold leading-tight" style={{ color: "var(--text-1)" }}>
                {b.nom}
              </b>
            </div>
          ))}

          {/* Le prochain : un anneau qui se remplit, seulement sur MON
              profil (le détail de ce qui reste à quelqu'un d'autre ne
              sort pas, règle du 30 août). */}
          {suivant && (
            <div className="relative flex w-[76px] flex-shrink-0 flex-col items-center text-center">
              <div className="relative h-[66px] w-[66px]">
                <svg width="66" height="66" viewBox="0 0 66 66" aria-hidden className="absolute inset-0 -rotate-90">
                  <defs>
                    <linearGradient id="anneauBadgeProchain" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0" stopColor="#8B5CF6" />
                      <stop offset="1" stopColor="#C13BC1" />
                    </linearGradient>
                  </defs>
                  <circle cx="33" cy="33" r="30" fill="rgba(var(--surface-rgb),.55)" stroke="rgba(139,92,246,.16)" strokeWidth="4" />
                  <circle
                    cx="33" cy="33" r="30" fill="none"
                    stroke="url(#anneauBadgeProchain)" strokeWidth="4" strokeLinecap="round"
                    strokeDasharray={`${(2 * Math.PI * 30 * Math.max(0.04, (suivant.seuil - suivant.reste) / suivant.seuil)).toFixed(1)} ${(2 * Math.PI * 30).toFixed(1)}`}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
                  <span className="vy-nombre text-[16px]" style={{ color: "var(--exp-encre)", fontWeight: 800 }}>
                    {suivant.seuil - suivant.reste}
                  </span>
                  <span className="vy-nombre text-[11px]" style={{ color: "var(--text-3)" }}>/{suivant.seuil}</span>
                </div>
              </div>
              <b className="mt-[26px] block max-w-full text-[11px] font-bold leading-tight" style={{ color: "var(--exp-encre)" }}>
                {suivant.badge.nom}
              </b>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
