"use client";

/* ════════════════════════════════════════════════════════════════════
   UN PROGRAMME TERMINÉ (maquette « Les programmes », version 2, écran
   « Programme terminé, et après »).

   Le titre, le test du départ et le test final côte à côte, le Guide qui
   dit le chemin, puis « Et après » : reprendre le cycle là où il était,
   le programme suivant, ou refaire celui-ci.

   ⚠️ JAMAIS UN RECUL À L'ÉCRAN. Un test final égal ou moins bon s'affiche
   sans flèche ni dégradé, et le Guide dit ce qui a été fait.
   ════════════════════════════════════════════════════════════════════ */

import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useGuideActif } from "@/context/GuideContext";
import { voix } from "@/lib/guides";
import { marquerBadgeVu } from "@/lib/celebrationBadge";
import {
  capitale, dansLaPhrase, nbCreneaux, programmeParId, semainesDites, testMieux, typoParcours, valeurCourte, valeurDite, type IdParcours,
} from "@/lib/parcours";
import type { ParcoursLu } from "@/lib/parcoursBase";
import { BulleGuide, Bouton, DEGRADE, E, Ecran, FILET, GROUPE, MONO, SOUS, TITRE } from "./commun";

const NB = String.fromCharCode(160);
const FOND_FIN = "radial-gradient(150% 75% at 0% 0%, rgba(167,139,250,.30) 0%, rgba(167,139,250,.05) 65%, transparent 90%), radial-gradient(150% 75% at 100% 100%, rgba(244,164,222,.28) 0%, rgba(244,164,222,.04) 65%, transparent 90%), linear-gradient(180deg, #F3EEFF 0%, #FAF8FF 45%, #FFF6FB 100%)";

export default function FinParcours({ lu, valeur, cycle, onFermer, onProgramme }: {
  lu: ParcoursLu;
  /** Le test final qu'on vient de noter. */
  valeur: number;
  cycle: { noms: string; etape: string | null } | null;
  onFermer: () => void;
  onProgramme: (id: IdParcours) => void;
}) {
  const { user } = useAuth();
  const { guide } = useGuideActif();
  const def = lu.def;
  const depart = lu.testDepart ?? 0;
  const mieux = testMieux(depart, valeur);
  const suivant = def.suivant ? programmeParId(def.suivant) : null;
  const duree = capitale(semainesDites(def.semaines));

  /* Le badge est montré ici : la prochaine fin de séance ne le refête pas. */
  const compte = user?.id;
  useEffect(() => { if (compte) marquerBadgeVu(compte, `programme-${def.id}`); }, [compte, def.id]);

  const phrase = mieux
    ? voix(guide, "parcours.fin.mieux", { avant: capitale(valeurDite(def.test, depart)), duree: semainesDites(def.semaines), apres: valeurDite(def.test, valeur) })
    : voix(guide, "parcours.fin.fait", { duree, seances: nbCreneaux(def) });

  const lignes: { titre: string; detail: string; onClick: () => void }[] = [
    ...(cycle ? [{ titre: `Reprendre ${cycle.noms}`, detail: cycle.etape ? `à ${cycle.etape}` : "", onClick: onFermer }] : []),
    ...(suivant ? [{ titre: `${suivant.titre}, le suivant`, detail: semainesDites(suivant.semaines), onClick: () => onProgramme(suivant.id) }] : []),
    { titre: `Refaire ${dansLaPhrase(def.titre)}`, detail: def.refaire ?? semainesDites(def.semaines), onClick: () => onProgramme(def.id) },
  ];

  return (
    <Ecran ouvert onFermer={onFermer} etiquette={`${def.titre}, programme terminé`} fond={FOND_FIN}>
      <div className="flex flex-col px-[22px]" style={{ minHeight: "100dvh", paddingTop: "max(26px, env(safe-area-inset-top))", paddingBottom: 26 }}>
        <span className="self-start text-[13px] font-extrabold text-white" style={{ padding: "7px 12px", borderRadius: 999, background: DEGRADE }}>Programme terminé</span>
        <h1 className="m-0 mt-[18px] text-[34px] leading-[1.05] pr-12" style={TITRE}>{typoParcours(def.titre)}</h1>
        <p className="m-0 mt-1.5 text-[16px]" style={{ color: E.t3 }}>
          <span style={{ ...MONO, fontWeight: 700, color: E.t1 }}>{def.semaines}</span>{NB}semaines,{" "}
          <span style={{ ...MONO, fontWeight: 700, color: E.t1 }}>{nbCreneaux(def)}</span>{NB}séances.
        </p>

        <div className="mt-5" style={{ ...GROUPE, padding: "16px 18px" }}>
          <p className="m-0 text-[13px] font-bold" style={{ color: E.t3 }}>{typoParcours(def.test.titre)}</p>
          <div className="flex items-end gap-4 mt-2.5">
            <div>
              <p className="m-0 text-[13px] whitespace-nowrap" style={{ color: E.t3 }}>Au départ</p>
              <p className="m-0 mt-0.5" style={{ ...MONO, fontWeight: 700, fontSize: 30, lineHeight: 1.2, color: E.t4 }}>{valeurCourte(def.test.mesure, depart)}</p>
            </div>
            {mieux && (
              <svg width="28" height="20" viewBox="0 0 28 20" fill="none" stroke={E.t4} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ marginBottom: 6 }}>
                <path d="M2 10h22M18 4l6 6-6 6" />
              </svg>
            )}
            <div>
              <p className="m-0 text-[13px] font-bold whitespace-nowrap" style={{ color: mieux ? E.lav : E.t3 }}>Aujourd’hui</p>
              <p className="m-0 mt-0.5" style={mieux
                ? { ...MONO, fontWeight: 800, fontSize: 48, lineHeight: 1.2, background: DEGRADE, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }
                : { ...MONO, fontWeight: 700, fontSize: 30, lineHeight: 1.2, color: E.t1 }}>
                {valeurCourte(def.test.mesure, valeur)}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4"><BulleGuide guide={guide} etat="encourage" texte={phrase} /></div>
        <p className="m-0 mt-3 text-[13px]" style={{ color: E.t3 }}>{typoParcours(`Ton badge « ${def.titre} » est sur ton profil.`)}</p>

        <p className="m-0 mt-[22px] text-[20px] leading-[26px]" style={SOUS}>Et après</p>
        <div className="mt-2.5" style={GROUPE}>
          {lignes.map((l, i) => (
            <button key={l.titre} type="button" onClick={l.onClick}
              className="w-full flex items-center justify-between gap-2.5 text-left cursor-pointer bg-transparent border-none"
              style={{ padding: "14px 16px", borderTop: i ? FILET : undefined, color: E.t1 }}>
              <span className="text-[16px] font-bold">{typoParcours(l.titre)}</span>
              {l.detail && <span className="text-[13px] whitespace-nowrap" style={{ color: E.t3 }}>{l.detail}</span>}
            </button>
          ))}
        </div>

        <div className="flex-1 min-h-[16px]" />
        <Bouton onClick={onFermer}>{cycle ? "Reprendre mon programme" : "Continuer"}</Bouton>
      </div>
    </Ecran>
  );
}
