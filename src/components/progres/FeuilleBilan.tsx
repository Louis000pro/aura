"use client";

/* ════════════════════════════════════════════════════════════════════
   Le bilan d'une semaine (lot 4). Gratuit et sans IA : tout se tire des
   faits (séances, records, journal des versions, jours choisis), et la
   phrase du Guide est écrite d'avance (`bilan.*` dans `guides.ts`).

   ⚠️ Jamais un reproche : une semaine sans séance se dit comme un départ,
   et on ne compte jamais ce qui manque.
   ════════════════════════════════════════════════════════════════════ */

import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import FeuilleBas from "@/components/semaine/FeuilleBas";
import ExerciseThumb from "@/components/seance/ExerciseThumb";
import { VisageGuide } from "@/components/AssistantMark";
import { voix, type GuideRef } from "@/lib/guides";
import { lireSemaineBilan } from "@/lib/progres";
import type { RecordMouvement } from "@/lib/records";
import { motJours } from "@/lib/vueProgramme";
import {
  bilanSemaine, cleBilan, JOURS_COURTS, libelleSeances, plusJours, texteDuree, texteProgres, texteSemaine,
  type ChangementSemaine, type SeanceFaite,
} from "@/lib/vueProgres";

export default function FeuilleBilan({ userId, lundi, aujourdhui, seances, records, guide, nomDuGuide, jours, onFermer, onPlanning }: {
  userId: string;
  lundi: string;
  aujourdhui: string;
  seances: readonly SeanceFaite[];
  records: readonly RecordMouvement[];
  guide: GuideRef;
  nomDuGuide: string | null;
  jours: number[] | null;
  onFermer: () => void;
  onPlanning: () => void;
}) {
  const [semaine, setSemaine] = useState<{ pour: string; prevues: number; changements: ChangementSemaine[] } | null | undefined>(undefined);

  useEffect(() => {
    let vivant = true;
    void lireSemaineBilan(userId, lundi, nomDuGuide).then((r) => { if (vivant) setSemaine(r ? { pour: lundi, ...r } : null); });
    return () => { vivant = false; };
  }, [userId, lundi, nomDuGuide]);

  const lu = semaine && semaine.pour === lundi ? semaine : null;
  const b = bilanSemaine({ lundi, seances, prevues: lu?.prevues ?? 0, records, changements: lu?.changements ?? [] });
  const cle = cleBilan(b);
  const phrase = voix(guide, cle, {
    seances: b.seances, total: b.prevues ?? b.seances,
    titre: b.progres[0]?.record.nom.toLowerCase(), paliers: b.progres.length, duree: texteDuree(b.minutes),
  });
  /* « La semaine qui vient » n'a de sens que pour la dernière semaine finie
     (ou la semaine en cours, le dimanche). */
  const suivante = plusJours(lundi, 7);
  const parleDeLaSuite = suivante > aujourdhui && suivante <= plusJours(aujourdhui, 7);

  return (
    <FeuilleBas onClose={onFermer} hauteur="92dvh">
      <div className="px-5 pb-8 pt-2">
        <div className="flex items-center gap-2">
          <button type="button" onClick={onFermer} aria-label="Fermer"
            className="-ml-2 flex h-10 w-10 items-center justify-center rounded-full cursor-pointer" style={{ color: "var(--text-1)" }}>
            <X size={20} />
          </button>
          <span className="text-[13px] font-semibold" style={{ color: "var(--text-2)" }}>{texteSemaine(lundi)}</span>
        </div>
        <h2 className="vy-titre mt-1" style={{ color: "var(--text-0)" }}>Ta semaine</h2>

        <div className="mt-4 flex gap-6">
          <div>
            <b className="vy-nombre block leading-none" style={{ fontSize: 44, fontWeight: 700, color: "var(--text-0)" }}>{b.seances}</b>
            <span className="text-[13px]" style={{ color: "var(--text-2)" }}>{libelleSeances(b)}</span>
          </div>
          {b.minutes > 0 && (
            <div>
              <b className="vy-nombre block leading-none" style={{ fontSize: 44, fontWeight: 700, color: "var(--text-0)" }}>{texteDuree(b.minutes).replace(" min", "")}</b>
              <span className="text-[13px]" style={{ color: "var(--text-2)" }}>{b.minutes < 60 ? "minutes d’entraînement" : "d’entraînement"}</span>
            </div>
          )}
        </div>

        <div className="mt-4 flex justify-between" aria-label="Les jours de la semaine">
          {b.jours.map((fait, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5 text-[11px] font-semibold" style={{ color: "var(--text-2)" }}>
              <i className="grid h-[30px] w-[30px] place-items-center rounded-full"
                style={{ background: fait ? "#2BD4A0" : "rgba(160,174,192,0.16)", color: "#fff" }}
                aria-label={fait ? "séance faite" : undefined}>
                {fait && <Check size={14} strokeWidth={3} />}
              </i>
              {JOURS_COURTS[i]}
            </div>
          ))}
        </div>

        {b.progres.length > 0 && (
          <section className="mt-5">
            <h3 className="pb-1.5 text-[13px] font-semibold" style={{ color: "var(--text-2)", borderBottom: "1px solid rgba(var(--text-3-rgb),0.14)" }}>Ce qui a progressé</h3>
            {b.progres.map((l) => {
              const t = texteProgres(l);
              return (
                <div key={l.record.cle} className="grid items-center gap-2.5 py-2 text-[16px]"
                  style={{ gridTemplateColumns: "38px minmax(0,1fr)", borderBottom: "1px solid rgba(var(--text-3-rgb),0.14)", color: "var(--text-1)" }}>
                  <ExerciseThumb name={l.record.nom} size={38} />
                  <div>{t.avant}<b style={{ color: "var(--teal-encre)" }}>{t.apres}</b></div>
                </div>
              );
            })}
          </section>
        )}

        {b.changements.length > 0 && (
          <section className="mt-5">
            <h3 className="pb-1.5 text-[13px] font-semibold" style={{ color: "var(--text-2)", borderBottom: "1px solid rgba(var(--text-3-rgb),0.14)" }}>Ce qui a bougé</h3>
            {b.changements.map((c, i) => (
              <div key={i} className="py-2 text-[16px]" style={{ borderBottom: "1px solid rgba(var(--text-3-rgb),0.14)", color: "var(--text-1)" }}>
                {c.texte} <span style={{ color: "var(--text-2)" }}>· {c.auteur}</span>
              </div>
            ))}
          </section>
        )}

        {semaine !== undefined && (
          <div className="mt-5 grid items-end gap-2.5" style={{ gridTemplateColumns: "44px minmax(0,1fr)" }}>
            <VisageGuide guide={guide} etat={b.seances > 0 ? "encourage" : "listen"} size={44} />
            <p className="vy-corps px-3.5 py-2.5" style={{ borderRadius: "18px 18px 18px 4px", background: "rgba(139,92,246,0.1)", color: "var(--text-0)" }}>{phrase}</p>
          </div>
        )}

        {parleDeLaSuite && (
          <section className="mt-5">
            <h3 className="pb-1.5 text-[13px] font-semibold" style={{ color: "var(--text-2)", borderBottom: "1px solid rgba(var(--text-3-rgb),0.14)" }}>La semaine qui vient</h3>
            <div className="py-2 text-[16px]" style={{ borderBottom: "1px solid rgba(var(--text-3-rgb),0.14)", color: "var(--text-1)" }}>
              {jours && jours.length > 0
                ? `${jours.length === 1 ? "Une séance prévue" : `${jours.length} séances prévues`} : ${motJours(jours)}.`
                : "Aucun jour choisi pour l’instant : tes séances viennent quand tu veux."}
            </div>
          </section>
        )}

        <button type="button" onClick={onPlanning}
          className="mt-5 flex min-h-[50px] w-full items-center justify-center rounded-2xl text-[16px] font-semibold text-white cursor-pointer"
          style={{ background: "linear-gradient(90deg,#8B5CF6,#C13BC1)", boxShadow: "var(--ombre-action)" }}>
          Voir mon planning
        </button>
      </div>
    </FeuilleBas>
  );
}
