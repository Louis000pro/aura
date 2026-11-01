"use client";

/* ════════════════════════════════════════════════════════════════════
   LA SEMAINE D'UN PROGRAMME (maquette « Les programmes », version 2,
   écran « Une séance manquée glisse »).

   Le programme et sa semaine, la barre des séances faites, le Guide qui
   dit qu'une séance a glissé (sans reproche), les jours de la semaine
   avec leurs séances, puis « Changer mes jours » et « Arrêter le
   programme ». Rien ne s'écrit sans un geste, et chaque geste passe par
   `parcoursBase`.
   ════════════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { Check } from "lucide-react";
import { useGuideActif } from "@/context/GuideContext";
import { voix } from "@/lib/guides";
import { arreterParcours, changerJoursParcours } from "@/lib/parcoursBase";
import {
  SEANCES, capitale, dansLaPhrase, departApresChangement, nomDuJour, quandDit, titreCreneau, typoParcours,
} from "@/lib/parcours";
import type { EtatParcours } from "@/hooks/useJournee";
import ChoixJours from "./ChoixJours";
import { BulleGuide, Bouton, DEGRADE, E, Ecran, FILET, Feuille, GROUPE, Lien, MONO, TITRE } from "./commun";

const NB = String.fromCharCode(160);
const COURT = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export default function SemaineParcours({ parcours, aujourdhui, onFermer, onLancer, onTest, reprise }: {
  parcours: EtatParcours;
  aujourdhui: string;
  onFermer: () => void;
  /** Lance la séance du prochain créneau. */
  onLancer: () => void;
  /** Ouvre le test du prochain créneau. */
  onTest: () => void;
  /** « Ton programme habituel reprend… » : le cycle en pause, s'il y en a un. */
  reprise: string | null;
}) {
  const { guide } = useGuideActif();
  const { lu, cal, prochain } = parcours;
  const [jours, setJours] = useState<number[]>(lu.jours);
  const [feuille, setFeuille] = useState<"jours" | "arreter" | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const semaine = prochain?.semaine ?? lu.def.semaines;
  const phrase = prochain?.venueDe
    ? voix(guide, "parcours.glisse", { prevu: capitale(nomDuJour(prochain.venueDe)), jour: quandDit(prochain.date, aujourdhui) })
    : voix(guide, "parcours.semaine");
  const jourDuProchain = parcours.semaine.some((d) => d.creneau?.rang === prochain?.rang);

  const garderJours = async () => {
    setEnvoi(true);
    setErreur(null);
    const d = departApresChangement(cal, aujourdhui);
    const r = await changerJoursParcours(lu.id, jours, d.debut, d.rangDebut);
    setEnvoi(false);
    if (!r.ok) { setErreur("Je n’arrive pas à changer tes jours pour l’instant."); return; }
    setFeuille(null);
  };
  const arreter = async () => {
    setEnvoi(true);
    setErreur(null);
    const r = await arreterParcours(lu.id);
    setEnvoi(false);
    if (!r.ok) { setErreur("Je n’arrive pas à arrêter le programme pour l’instant."); return; }
    setFeuille(null);
    onFermer();
  };

  return (
    <>
      <Ecran ouvert onFermer={onFermer} retour etiquette={`${lu.def.titre}, semaine ${semaine}`} fond="#FAF8FF">
        <div className="px-5" style={{ paddingTop: "calc(max(14px, env(safe-area-inset-top)) + 52px)" }}>
          <p className="m-0 text-[13px] font-bold" style={{ color: E.t3 }}>{typoParcours(lu.def.titre)}</p>
          <h1 className="m-0 mt-1 text-[34px] leading-[1.05]" style={TITRE}>Semaine{NB}{semaine}</h1>
          <div className="mt-3.5">
            <div className="h-2 rounded overflow-hidden" style={{ background: "rgba(31,27,46,0.10)" }}>
              <div className="h-2 rounded" style={{ width: `${Math.round((cal.faits / cal.total) * 100)}%`, background: DEGRADE }} />
            </div>
            <p className="m-0 mt-1.5 text-[13px]" style={{ color: E.t3 }}>
              <span style={{ ...MONO, fontWeight: 700, color: E.t1 }}>{cal.faits}</span>{NB}séances sur{" "}
              <span style={{ ...MONO, fontWeight: 700, color: E.t1 }}>{cal.total}</span>
            </p>
          </div>

          <div className="mt-5"><BulleGuide guide={guide} texte={phrase} /></div>

          <div className="mt-[18px]" style={GROUPE}>
            {parcours.semaine.filter((d) => d.creneau || d.glisse).map((d, i) => {
              const c = d.creneau;
              const estProchain = !!c && c.rang === prochain?.rang;
              const jourCourt = COURT[(new Date(`${d.date}T00:00:00Z`).getUTCDay() + 6) % 7];
              return (
                <div key={d.date} className="flex items-center gap-3.5"
                  style={{ padding: "14px 16px", borderTop: i ? FILET : undefined, background: estProchain ? "rgba(139,92,246,0.06)" : undefined }}>
                  <p className="m-0 flex-shrink-0 text-[13px]" style={{ width: 34, fontWeight: estProchain ? 700 : 600, color: estProchain ? E.lav : c?.fait || !c ? E.t4 : E.t3 }}>{jourCourt}</p>
                  {!c ? (
                    <p className="m-0 flex-1 text-[16px]" style={{ color: E.t4 }}>Pas de séance</p>
                  ) : (
                    <div className="flex-1 min-w-0">
                      <p className="m-0 text-[16px] font-bold" style={{ color: c.fait ? E.t3 : E.t1 }}>{typoParcours(titreCreneau(c))}</p>
                      <p className="m-0 mt-0.5 text-[13px]" style={{ color: E.t3 }}>
                        {c.fait ? "Faite" : estProchain
                          ? typoParcours(`${capitale(quandDit(c.date, aujourdhui))}${c.venueDe ? ` · venue de ${nomDuJour(c.venueDe)}` : ""}`)
                          : c.seance ? <><span style={{ ...MONO, fontWeight: 600 }}>{SEANCES[c.seance]?.minutes}</span>{NB}min</> : "Le même test qu’au départ"}
                      </p>
                    </div>
                  )}
                  {c?.fait && (
                    <span className="flex-shrink-0 flex items-center justify-center rounded-full" style={{ width: 28, height: 28, background: E.teal }}>
                      <Check size={15} strokeWidth={3} color="#FFFFFF" />
                    </span>
                  )}
                  {estProchain && (
                    <button type="button" onClick={c.genre === "seance" ? onLancer : onTest}
                      className="flex-shrink-0 cursor-pointer border-none text-white text-[13px] font-extrabold"
                      style={{ padding: "10px 14px", borderRadius: 12, background: DEGRADE }}>
                      {c.genre === "seance" ? "Lancer" : "Faire le test"}
                    </button>
                  )}
                </div>
              );
            })}
            {!parcours.semaine.some((d) => d.creneau || d.glisse) && (
              <p className="m-0 text-[16px]" style={{ padding: "14px 16px", color: E.t3 }}>Pas de séance cette semaine.</p>
            )}
          </div>

          {prochain && !jourDuProchain && (
            <div className="mt-3 flex items-center gap-3" style={{ ...GROUPE, padding: "14px 16px" }}>
              <div className="flex-1 min-w-0">
                <p className="m-0 text-[13px] font-bold" style={{ color: E.lav }}>Ensuite</p>
                <p className="m-0 mt-0.5 text-[16px] font-bold">{typoParcours(titreCreneau(prochain))}</p>
                <p className="m-0 mt-0.5 text-[13px]" style={{ color: E.t3 }}>{capitale(quandDit(prochain.date, aujourdhui))}</p>
              </div>
              <button type="button" onClick={prochain.genre === "seance" ? onLancer : onTest}
                className="flex-shrink-0 cursor-pointer border-none text-white text-[13px] font-extrabold"
                style={{ padding: "10px 14px", borderRadius: 12, background: DEGRADE }}>
                {prochain.genre === "seance" ? "Lancer" : "Faire le test"}
              </button>
            </div>
          )}

          <div className="mt-3.5">
            <Lien onClick={() => { setJours(lu.jours); setFeuille("jours"); }} couleur={E.lav} gras>Changer mes jours</Lien>
            <Lien onClick={() => setFeuille("arreter")}>Arrêter le programme</Lien>
          </div>
        </div>
      </Ecran>

      <Feuille ouverte={feuille === "jours"} onFermer={() => setFeuille(null)} etiquette="Changer mes jours">
        <h2 className="m-0 mt-5 text-[26px] leading-[31px]" style={TITRE}>Changer mes jours</h2>
        <p className="m-0 mt-2 text-[16px] leading-[23px]" style={{ color: E.t2 }}>
          {typoParcours("La suite se pose sur tes nouveaux jours, à partir d’aujourd’hui. Ce qui est fait ne bouge pas.")}
        </p>
        <div className="mt-4"><ChoixJours jours={jours} nombre={lu.def.parSemaine} onChange={setJours} /></div>
        <div className="mt-5">
          <Bouton desactive={jours.length !== lu.def.parSemaine} enCours={envoi} onClick={() => void garderJours()}>Garder ces jours</Bouton>
        </div>
        {erreur && <p role="alert" className="m-0 mt-2 text-[13px]" style={{ color: E.t2 }}>{erreur}</p>}
      </Feuille>

      <Feuille ouverte={feuille === "arreter"} onFermer={() => setFeuille(null)} etiquette="Arrêter le programme">
        <h2 className="m-0 mt-5 text-[26px] leading-[31px]" style={TITRE}>{typoParcours(`Arrêter ${dansLaPhrase(lu.def.titre)} ?`)}</h2>
        <p className="m-0 mt-2.5 text-[16px] leading-[23px]" style={{ color: E.t2 }}>
          {typoParcours(`Tes séances faites restent dans ton historique.${reprise ? ` ${reprise}` : ""}`)}
        </p>
        <div className="mt-5">
          <Bouton onClick={() => setFeuille(null)}>Continuer le programme</Bouton>
        </div>
        <div className="flex justify-center mt-1">
          <Lien onClick={() => void arreter()}>{envoi ? "Un instant…" : "Arrêter le programme"}</Lien>
        </div>
        {erreur && <p role="alert" className="m-0 mt-2 text-[13px] text-center" style={{ color: E.t2 }}>{erreur}</p>}
      </Feuille>
    </>
  );
}
