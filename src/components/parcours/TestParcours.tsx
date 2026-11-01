"use client";

/* ════════════════════════════════════════════════════════════════════
   LE TEST D'UN PROGRAMME (maquette « Les programmes », version 2, écran
   « Le test de la dernière semaine » ; Louis, 2026-11-01 : « et si on
   dépasse 10 ? »).

   La consigne, le personnage animé du mouvement, puis la façon de noter :
   · un compte avec grille : de 0 à 10 d'un toucher, et « 11+ » ouvre un
     compteur avec un − et un +, sans limite ;
   · un compte sans grille (on dépasse 10 dès le départ) : le compteur,
     tout de suite ;
   · une tenue : un chrono qu'on lance et qu'on arrête, puis ± 5 secondes ;
   · une charge : un compteur par 2,5 kg.
   Le test du départ reste écrit sous le test final, pour se comparer à
   soi. Rien ne s'écrit avant « Noter mon test ».
   ════════════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";
import ExerciseThumb from "@/components/seance/ExerciseThumb";
import { useGuideActif } from "@/context/GuideContext";
import { voix } from "@/lib/guides";
import { noterTestParcours } from "@/lib/parcoursBase";
import { capitale, typoParcours, valeurCourte, valeurDite } from "@/lib/parcours";
import type { EtatParcours } from "@/hooks/useJournee";
import { BulleGuide, Bouton, DEGRADE, E, Ecran, GROUPE, MONO, TITRE } from "./commun";

/** Le compteur : − grand pas, − petit pas, la valeur, + petit pas, + grand pas. */
function Compteur({ valeur, onChange, pas, grandPas, unite }: {
  valeur: number; onChange: (v: number) => void; pas: number; grandPas: number; unite: string;
}) {
  const bouton = (delta: number, label: string, grand = false) => (
    <button type="button" onClick={() => onChange(Math.max(0, Math.round((valeur + delta) * 10) / 10))}
      aria-label={label}
      className="flex items-center justify-center cursor-pointer flex-shrink-0"
      style={{
        width: grand ? 44 : 52, height: grand ? 44 : 52, borderRadius: 999,
        border: "1px solid rgba(31,27,46,0.12)", background: "#FFFFFF", color: E.t1,
        fontSize: 13, fontWeight: 700,
      }}>
      {grand ? (delta > 0 ? `+${String(grandPas).replace(".", ",")}` : `−${String(grandPas).replace(".", ",")}`)
        : delta > 0 ? <Plus size={20} strokeWidth={2.6} /> : <Minus size={20} strokeWidth={2.6} />}
    </button>
  );
  return (
    <div className="flex items-center justify-between gap-1.5 mt-2.5">
      {bouton(-grandPas, `Moins ${grandPas} ${unite}`, true)}
      {bouton(-pas, `Moins ${pas}`)}
      <span className="flex-1 text-center" style={{ ...MONO, fontWeight: 800, fontSize: 40, lineHeight: 1, color: E.t1 }} aria-live="polite">
        {valeurCourte(unite === "kg" ? "kg" : "reps", valeur)}
        {unite === "kg" && <span style={{ fontSize: 16, fontWeight: 600, marginLeft: 4, color: E.t3 }}>kg</span>}
      </span>
      {bouton(pas, `Plus ${pas}`)}
      {bouton(grandPas, `Plus ${grandPas} ${unite}`, true)}
    </div>
  );
}

export default function TestParcours({ parcours, onFermer, onTermine }: {
  parcours: EtatParcours;
  onFermer: () => void;
  /** Le test final est noté : le programme est terminé. */
  onTermine: (valeur: number) => void;
}) {
  const { guide } = useGuideActif();
  const { lu, prochain } = parcours;
  const test = lu.def.test;
  /* Figé à l'ouverture : la relecture qui suit la note ne doit pas changer
     l'écran sous les yeux. */
  const [moment] = useState<"depart" | "fin">(() => (prochain?.genre === "test_fin" ? "fin" : "depart"));
  const depart = lu.testDepart;
  const compteurDirect = test.mesure === "reps" && (!test.grille || (moment === "fin" && (depart ?? 0) > 10));

  const [valeur, setValeur] = useState<number | null>(() => {
    if (test.mesure === "kg") return depart ?? 20;
    if (compteurDirect) return depart ?? 0;
    return null;
  });
  const [compteur, setCompteur] = useState(compteurDirect);
  const [chrono, setChrono] = useState<{ depuis: number } | null>(null);
  const [maintenant, setMaintenant] = useState(0);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [note, setNote] = useState<number | null>(null);
  const tic = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (tic.current) clearInterval(tic.current); }, []);
  const lancerChrono = () => {
    const d = Date.now();
    setChrono({ depuis: d });
    setMaintenant(d);
    if (tic.current) clearInterval(tic.current);
    tic.current = setInterval(() => setMaintenant(Date.now()), 250);
  };
  const arreterChrono = () => {
    if (!chrono) return;
    if (tic.current) clearInterval(tic.current);
    tic.current = null;
    setValeur(Math.round((Date.now() - chrono.depuis) / 1000));
    setChrono(null);
  };

  const noter = async () => {
    if (valeur === null) return;
    setEnvoi(true);
    setErreur(null);
    const r = await noterTestParcours(lu.id, moment, valeur);
    setEnvoi(false);
    if (!r.ok) {
      setErreur(r.code === "seances_manquantes"
        ? "Il te reste des séances avant le test final."
        : "Je n’arrive pas à noter ton test pour l’instant. Réessaie dans un moment.");
      return;
    }
    if (moment === "fin") { onTermine(valeur); return; }
    setNote(valeur);
  };

  const enCours = chrono ? Math.max(0, Math.floor((maintenant - chrono.depuis) / 1000)) : null;

  return (
    <Ecran ouvert onFermer={onFermer} etiquette={moment === "fin" ? "Le test final" : "Le test"}>
      <div className="flex flex-col px-[22px]" style={{ minHeight: "100dvh", paddingTop: "max(24px, env(safe-area-inset-top))", paddingBottom: 26 }}>
        <p className="m-0 text-[13px] font-bold pr-12" style={{ color: E.t3 }}>{typoParcours(parcours.pastille)}</p>
        <h1 className="m-0 mt-1.5 text-[34px] leading-[1.05]" style={TITRE}>{moment === "fin" ? "Le test final" : "Le test"}</h1>

        {note !== null ? (
          /* Le test du départ est noté : le Guide le dit, et on continue. */
          <>
            <div className="flex-1 flex items-center justify-center min-h-0">
              <ExerciseThumb name={test.mouvement} size={200} />
            </div>
            <div style={{ ...GROUPE, padding: 16 }}>
              <p className="m-0 text-[13px] font-bold" style={{ color: E.t3 }}>{typoParcours(test.titre)}</p>
              <p className="m-0 mt-1" style={{ ...MONO, fontWeight: 800, fontSize: 40, lineHeight: 1.25, background: DEGRADE, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
                {valeurCourte(test.mesure, note)}
              </p>
            </div>
            <div className="mt-4">
              <BulleGuide guide={guide} etat="encourage" texte={voix(guide, "parcours.depart", { avant: capitale(valeurDite(test, note)) })} />
            </div>
            <div className="mt-4"><Bouton onClick={onFermer}>Continuer</Bouton></div>
          </>
        ) : (
          <>
            <p className="m-0 mt-2.5 text-[16px] leading-[23px]" style={{ color: E.t2 }}>{typoParcours(test.consigne)}</p>
            <div className="flex-1 flex items-center justify-center min-h-[180px]">
              <ExerciseThumb name={test.mouvement} size={210} />
            </div>

            <div style={{ ...GROUPE, padding: 16 }}>
              <p className="m-0 text-[13px] font-bold" style={{ color: E.t3 }}>{typoParcours(test.titre)}</p>

              {test.mesure === "secondes" ? (
                <>
                  <p className="m-0 mt-4 text-center" style={{ ...MONO, fontWeight: 800, fontSize: 48, lineHeight: 1.15, color: chrono ? E.lav : E.t1 }} aria-live="off">
                    {valeurCourte("secondes", enCours ?? valeur ?? 0)}
                  </p>
                  <div className="flex items-center justify-center gap-2 mt-3">
                    {chrono ? (
                      <button type="button" onClick={arreterChrono} className="cursor-pointer border-none text-white text-[16px] font-extrabold" style={{ height: 48, padding: "0 22px", borderRadius: 16, background: DEGRADE }}>
                        J’arrête
                      </button>
                    ) : (
                      <>
                        {valeur !== null && (
                          <button type="button" onClick={() => setValeur(Math.max(0, valeur - 5))} aria-label="Moins 5 secondes"
                            className="cursor-pointer text-[13px] font-bold" style={{ height: 44, padding: "0 14px", borderRadius: 14, border: "1px solid rgba(31,27,46,0.12)", background: "#FFFFFF", color: E.t1 }}>−5 s</button>
                        )}
                        <button type="button" onClick={lancerChrono} className="cursor-pointer text-[16px] font-bold"
                          style={{ height: 48, padding: "0 18px", borderRadius: 16, border: `1.5px solid ${E.lav}`, background: "#FFFFFF", color: E.lav }}>
                          {valeur === null ? "Lancer le chrono" : "Recommencer"}
                        </button>
                        {valeur !== null && (
                          <button type="button" onClick={() => setValeur(valeur + 5)} aria-label="Plus 5 secondes"
                            className="cursor-pointer text-[13px] font-bold" style={{ height: 44, padding: "0 14px", borderRadius: 14, border: "1px solid rgba(31,27,46,0.12)", background: "#FFFFFF", color: E.t1 }}>+5 s</button>
                        )}
                      </>
                    )}
                  </div>
                </>
              ) : test.mesure === "kg" ? (
                <Compteur valeur={valeur ?? 20} onChange={setValeur} pas={2.5} grandPas={10} unite="kg" />
              ) : compteur ? (
                <>
                  <Compteur valeur={valeur ?? 0} onChange={setValeur} pas={1} grandPas={5} unite="répétitions" />
                  {test.grille && (
                    <button type="button" onClick={() => { setCompteur(false); setValeur(null); }}
                      className="block mx-auto mt-2 text-[13px] font-semibold cursor-pointer bg-transparent border-none min-h-[44px]" style={{ color: E.t3 }}>
                      Revenir à la grille
                    </button>
                  )}
                </>
              ) : (
                <div role="radiogroup" aria-label={test.titre} className="grid gap-1.5 mt-2.5" style={{ gridTemplateColumns: "repeat(6, minmax(0, 1fr))" }}>
                  {Array.from({ length: 11 }, (_, n) => (
                    <button key={n} type="button" role="radio" aria-checked={valeur === n} onClick={() => setValeur(n)}
                      className="flex items-center justify-center cursor-pointer"
                      style={{
                        height: 44, borderRadius: 12, ...MONO, fontSize: 18,
                        fontWeight: valeur === n ? 800 : 600,
                        background: valeur === n ? DEGRADE : "#FFFFFF",
                        color: valeur === n ? "#FFFFFF" : E.t1,
                        border: valeur === n ? "none" : "1px solid rgba(31,27,46,0.12)",
                      }}>
                      {n}
                    </button>
                  ))}
                  <button type="button" onClick={() => { setCompteur(true); setValeur(11); }}
                    className="flex items-center justify-center cursor-pointer"
                    style={{ height: 44, borderRadius: 12, ...MONO, fontSize: 18, fontWeight: 600, background: "#FFFFFF", color: E.t1, border: "1px solid rgba(31,27,46,0.12)" }}>
                    11+
                  </button>
                </div>
              )}

              <p className="m-0 mt-3 text-[13px] leading-[18px]" style={{ color: E.t3 }}>
                {moment === "fin" && depart !== null
                  ? typoParcours(`Au départ : ${valeurDite(test, depart)}.`)
                  : "Le même test reviendra à la fin."}
              </p>
            </div>

            <div className="mt-4">
              <Bouton desactive={valeur === null || !!chrono} enCours={envoi} onClick={() => void noter()}>Noter mon test</Bouton>
            </div>
            {erreur && <p role="alert" className="m-0 mt-2 text-[13px]" style={{ color: E.t2 }}>{erreur}</p>}
          </>
        )}
      </div>
    </Ecran>
  );
}
