"use client";

/* ════════════════════════════════════════════════════════════════════
   TES CLASSIQUES, SUR LE PROFIL (maquette « Le chrono et le score »,
   version 3 : « Ton meilleur sur chacun »).

   Une couverture sombre par classique déjà fait : son nom, ce qu'on y
   compte, ton meilleur en grand, le jour où tu l'as posé, et combien de
   fois tu l'as fait. Rien ne s'affiche tant qu'aucun classique n'a de
   score, ni quand la base ne répond pas (`null` n'est pas « aucun »).

   ⚠️ On ne compare qu'à soi : aucun classement, aucun chiffre d'autrui.
   ════════════════════════════════════════════════════════════════════ */

import { useEffect, useState } from "react";
import { lireScores } from "@/lib/scoresClassiques";
import { CLASSIQUES, FACON, bilanDe, dateCourte, faitNFois, scoreCourt, type ScoreDate } from "@/lib/classiques";

const NB = String.fromCharCode(160);
/* Une lumière par couverture, dans les couleurs de la marque (jamais de vert). */
const LUMIERES = [
  "radial-gradient(120% 70% at 100% 0%, rgba(193,59,193,0.55), transparent 55%), radial-gradient(90% 60% at 0% 100%, rgba(139,92,246,0.7), transparent 60%)",
  "radial-gradient(110% 70% at 0% 0%, rgba(245,177,32,0.45), transparent 55%), radial-gradient(90% 60% at 100% 100%, rgba(139,92,246,0.65), transparent 60%)",
  "radial-gradient(110% 70% at 0% 0%, rgba(139,92,246,0.6), transparent 55%), radial-gradient(90% 60% at 100% 100%, rgba(79,110,247,0.55), transparent 60%)",
  "radial-gradient(110% 70% at 100% 0%, rgba(193,59,193,0.5), transparent 55%), radial-gradient(90% 60% at 0% 100%, rgba(139,92,246,0.75), transparent 60%)",
];

export default function TesClassiques({ userId }: { userId: string }) {
  const [scores, setScores] = useState<{ pour: string; data: ScoreDate[] | null } | null>(null);
  useEffect(() => {
    let vivant = true;
    void lireScores(userId).then((data) => { if (vivant) setScores({ pour: userId, data }); });
    return () => { vivant = false; };
  }, [userId]);
  const data = scores?.pour === userId ? scores.data : null;
  if (!data?.length) return null;

  const faits = CLASSIQUES.flatMap((c) => {
    const bilan = bilanDe(data.filter((s) => s.classique === c.id));
    return bilan.meilleur ? [{ c, meilleur: bilan.meilleur, fois: bilan.essais.length, dernier: bilan.essais[bilan.essais.length - 1].quand }] : [];
  }).sort((a, b) => b.dernier.localeCompare(a.dernier));
  if (!faits.length) return null;

  return (
    <section className="mt-7">
      <div className="flex items-baseline gap-2 px-1">
        <h3 className="vy-sous" style={{ color: "var(--text-0)" }}>Tes classiques</h3>
        <span className="vy-nombre text-[20px]" style={{ color: "var(--text-2)", fontWeight: 700 }}>{faits.length}</span>
      </div>
      <p className="text-[16px] px-1 mt-0.5" style={{ color: "var(--text-2)" }}>Ton meilleur sur chacun.</p>
      <div className="grid gap-3 mt-3" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
        {faits.map(({ c, meilleur, fois }, i) => (
          <article key={c.id} className="relative overflow-hidden flex flex-col justify-between p-3.5"
            style={{ aspectRatio: "4 / 5", borderRadius: "var(--r-affiche)", background: "#130E1E", boxShadow: "var(--ombre-pose)" }}>
            <div className="absolute inset-0" style={{ background: LUMIERES[i % LUMIERES.length] }} aria-hidden="true" />
            <div className="relative min-w-0">
              <p className="text-[16px] font-bold leading-tight text-white">{c.titre}</p>
              <p className="text-[13px] mt-0.5 leading-snug" style={{ color: "rgba(255,255,255,0.7)" }}>
                {FACON[c.sorte].charAt(0).toUpperCase() + FACON[c.sorte].slice(1)}
              </p>
            </div>
            <div className="relative">
              <p className="text-white leading-none" style={{ fontWeight: 900, fontVariationSettings: "'wdth' 112", letterSpacing: "-0.03em", fontSize: scoreCourt(meilleur).length > 5 ? 34 : 48 }}>
                {scoreCourt(meilleur)}
              </p>
              <div className="flex items-baseline justify-between gap-2 mt-2 text-[13px]" style={{ color: "rgba(255,255,255,0.72)" }}>
                <span>{dateCourte(meilleur.quand)}</span>
                <span>{faitNFois(fois)}</span>
              </div>
            </div>
          </article>
        ))}
      </div>
      <p className="sr-only">{faits.map(({ c, meilleur }) => `${c.titre}${NB}: ${scoreCourt(meilleur)}`).join(", ")}</p>
    </section>
  );
}
