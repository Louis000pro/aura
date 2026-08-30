"use client";

/* ─────────────────────────────────────────────────────────────
   « Vous avez dévoilé Sillage ensemble. »

   Le relais est la seule chose de Vaiiya qui se fasse à deux, et le
   profil d'un ami n'en disait rien : ses affiches, son rang, ses
   séances, jamais les vôtres. La preuve du lien existait en base et
   ne s'affichait nulle part.

   ⚠️ UNE LIGNE, PAS UN HISTORIQUE. Une seule phrase, la dernière
   affiche nommée, et rien si vous n'avez jamais joué ensemble.
   Dérouler la liste des semaines passées ferait un palmarès, donc
   une comparaison, donc exactement ce qui est refusé depuis juillet.

   ⚠️ ELLE EST SYMÉTRIQUE PAR CONSTRUCTION. La lecture passe par la
   RLS (`relaisPartage`), qui ne rend que les runs communs : chacun
   des deux voit donc la même ligne chez l'autre, sans qu'on ait à
   l'écrire deux fois.

   Le visage est le même cadrage rond que le badge de la série
   (`badgeSerie`), pour que la ligne et l'étagère du dessous se
   lisent comme une seule famille.
   ───────────────────────────────────────────────────────────── */

import Image from "next/image";
import { imageEtat, SERIES, type SerieSlug } from "@/lib/defi";

const EN_LETTRES = ["", "une", "deux", "trois", "quatre", "cinq", "six", "sept"];

export default function LigneEnsemble({ serie, nombre }: {
  serie: SerieSlug;
  nombre: number;
}) {
  // Au-delà de sept, le chiffre reprend la main : une phrase qui
  // épelle « treize » se lit moins vite qu'elle ne s'écrit.
  const combien = EN_LETTRES[nombre] ?? String(nombre);

  return (
    <div
      className="mt-5 flex items-center gap-3 rounded-2xl px-3.5 py-3"
      style={{
        background: "rgba(var(--tint-violet-rgb),0.45)",
        border: "1px solid rgba(var(--accent-rgb),0.14)",
      }}
    >
      <div
        className="relative h-11 w-11 flex-shrink-0 overflow-hidden rounded-full"
        style={{ border: "2px solid #D7A62A" }}
      >
        <Image src={imageEtat(serie, 4)} alt="" fill sizes="44px" className="object-cover" />
      </div>

      <p className="min-w-0 flex-1 text-[13.5px] leading-snug" style={{ color: "var(--text-2)" }}>
        {nombre === 1 ? (
          <>
            Vous avez dévoilé{" "}
            <b style={{ color: "var(--text-1)", fontWeight: 600 }}>{SERIES[serie].nom}</b>{" "}
            ensemble.
          </>
        ) : (
          <>
            Vous avez dévoilé{" "}
            <b style={{ color: "var(--text-1)", fontWeight: 600 }}>{combien} affiches</b>{" "}
            ensemble.
          </>
        )}
      </p>
    </div>
  );
}
