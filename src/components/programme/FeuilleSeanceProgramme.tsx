"use client";

/* ════════════════════════════════════════════════════════════════════
   ENTRAÎNEMENT · LOT 3 · L'ÉDITEUR D'UNE SÉANCE DU PROGRAMME
   (maquette, page « une séance du programme »)

   Les exercices de la séance, tels que le cycle les propose À CE LIEU.
   On peut changer le nombre de séries, remplacer un mouvement par un
   autre qui fait le même travail (même fonction, même lieu, même
   mesure : `equivalents`), le retirer, en ajouter un, et dire lesquels
   sont les mouvements principaux (ceux sur lesquels Vaiiya mesure la
   progression).

   « Enregistrer » réécrit le modèle de la séance et note la version dans
   la même transaction (`modifier_modele`). Les changements valent à
   chaque fois : les séances déjà posées dans le planning gardent les
   exercices qu'elles avaient.
   ════════════════════════════════════════════════════════════════════ */

import { useMemo, useState } from "react";
import { ArrowLeft, ArrowUp, Minus, Plus } from "lucide-react";
import FeuilleBas from "@/components/semaine/FeuilleBas";
import ExerciseThumb from "@/components/seance/ExerciseThumb";
import {
  libelleDuree, prescrire, projeterPrescription, type ContexteComposition, type LignePrescription,
} from "@/lib/banqueEtapes";
import { equivalents } from "@/lib/remplacement";
import { estimerMinutes, itemDExercice } from "@/lib/dureeLibre";
import { modifierSeance } from "@/lib/programmeVersions";
import { ajoutsPossibles, doseLigne, motLieu, texteChangementSeance } from "@/lib/vueProgramme";
import type { EtapeCycle } from "@/lib/programme";

export default function FeuilleSeanceProgramme({ etape, ctx, lignes, tousLes, ceJour, onClose, onEnregistre }: {
  etape: EtapeCycle;
  ctx: ContexteComposition;
  lignes: LignePrescription[];
  /** La longueur du cycle : la séance revient tous les N entraînements. */
  tousLes: number;
  /** « Seulement ce jour-là » : le programme ne change pas. */
  ceJour?: { quand: string; enregistrer: (lignes: LignePrescription[]) => Promise<string | null> };
  onClose: () => void;
  onEnregistre: (message: string) => void;
}) {
  const [brouillon, setBrouillon] = useState<LignePrescription[]>(() => lignes.map((l) => ({ ...l })));
  const [ouvert, setOuvert] = useState<number | null>(null);
  const [ajout, setAjout] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const texte = useMemo(() => texteChangementSeance(etape.nom, lignes, brouillon), [etape.nom, lignes, brouillon]);
  const minutes = brouillon.length ? estimerMinutes(projeterPrescription(brouillon.map((l, i) => ({ ...l, emplacement: i }))).map(itemDExercice)) : 0;
  const principaux = brouillon.filter((l) => l.statut === "repere").length;

  const changer = (i: number, f: (l: LignePrescription) => LignePrescription) =>
    setBrouillon((b) => b.map((l, j) => (j === i ? f(l) : l)));

  const enregistrer = async () => {
    if (!texte || envoi) { if (!texte) onClose(); return; }
    setEnvoi(true); setErreur(null);
    if (ceJour) {
      const souci = await ceJour.enregistrer(brouillon);
      if (souci) { setErreur(souci); setEnvoi(false); } else onEnregistre("");
      return;
    }
    const r = await modifierSeance(etape, ctx, lignes, brouillon, texte);
    if (r === "ok") onEnregistre(`${etape.nom} est enregistrée. Ça vaut pour les prochaines fois.`);
    else { setErreur("Ça n’a pas été enregistré. Réessaie dans un instant."); setEnvoi(false); }
  };

  const possibles = ajout ? ajoutsPossibles(ctx.lieu, brouillon.map((l) => l.exercice_nom)) : [];

  return (
    <FeuilleBas onClose={onClose} hauteur="90dvh" niveau={105}>
      <div className="flex items-center justify-between px-4 pt-1 pb-2 flex-shrink-0">
        <button type="button" onClick={ajout ? () => setAjout(false) : onClose} aria-label="Retour"
          className="w-10 h-10 flex items-center justify-center bg-transparent border-none cursor-pointer" style={{ color: "var(--text-0)" }}>
          <ArrowLeft size={20} />
        </button>
        {!ajout && (
          <button type="button" onClick={() => void enregistrer()} disabled={envoi}
            className="px-4 py-2 rounded-full text-[13px] font-bold border-none cursor-pointer"
            style={{ background: texte ? "linear-gradient(135deg,#8B5CF6,#C13BC1)" : "rgba(var(--text-3-rgb),0.14)", color: texte ? "#fff" : "var(--text-2)" }}>
            {texte ? "Enregistrer" : "Fermer"}
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-8">
        {ajout ? (
          <>
            <h2 className="vy-titre" style={{ fontSize: 24, color: "var(--text-0)" }}>Ajouter un exercice</h2>
            <p className="text-[13px] mt-1 mb-3" style={{ color: "var(--text-2)" }}>Ce qui se fait {motLieu(ctx.lieu)}.</p>
            <div className="flex flex-col">
              {possibles.map((e) => (
                <button key={e.nom} type="button" disabled={brouillon.length >= 12}
                  onClick={() => { setBrouillon((b) => [...b, prescrire(e, b.length, ctx)]); setAjout(false); }}
                  className="vy-filet flex items-center gap-3 py-2 text-left bg-transparent border-none cursor-pointer">
                  <ExerciseThumb name={e.nom} size={44} />
                  <span className="flex-1 text-[16px]" style={{ color: "var(--text-0)" }}>{e.nom}</span>
                  <Plus size={16} style={{ color: "var(--exp-encre)" }} />
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <h2 className="vy-titre" style={{ fontSize: 26, color: "var(--text-0)" }}>{etape.nom}</h2>
            <p className="text-[13px] mt-1" style={{ color: "var(--text-2)" }}>
              <span className="vy-nombre">{brouillon.length}</span> exercices · <span className="vy-nombre">{minutes}</span> min
              {tousLes > 1 ? <> · tous les <span className="vy-nombre">{tousLes}</span> entraînements</> : null} · {motLieu(ctx.lieu)}
            </p>
            <p className="text-[13px] mt-3" style={{ color: "var(--text-3)" }}>
              {ceJour
                ? <>Seulement {ceJour.quand} : ton programme ne change pas. Pour les changer à chaque fois, passe par la vue Programme.</>
                : "Tes changements valent à chaque fois. Une séance déjà posée dans ton planning garde ses exercices."}
            </p>

            <div className="mt-4 overflow-hidden" style={{ borderRadius: "var(--r-bloc)", background: "rgba(var(--surface-rgb),0.9)", border: "1px solid rgba(var(--text-3-rgb),0.16)" }}>
              {brouillon.map((l, i) => {
                const estOuvert = ouvert === i;
                const autres = estOuvert ? equivalents({ fonction: l.fonction, mesure: l.mesure, lieu: ctx.lieu, cleActuelle: l.exercice_cle }).slice(0, 6) : [];
                return (
                  <div key={`${l.exercice_cle}-${i}`} className="vy-filet">
                    <button type="button" onClick={() => setOuvert(estOuvert ? null : i)}
                      className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left bg-transparent border-none cursor-pointer"
                      style={{ background: estOuvert ? "rgba(var(--tint-violet-rgb),0.5)" : "transparent" }}>
                      <ExerciseThumb name={l.exercice_nom} size={44} />
                      <span className="flex-1 min-w-0">
                        <b className="block text-[16px] truncate" style={{ color: "var(--text-0)" }}>{l.exercice_nom}</b>
                        {l.statut === "repere" && <small className="block text-[11px]" style={{ color: "var(--exp-encre)" }}>mouvement principal</small>}
                      </span>
                      <span className="vy-nombre text-[13px] flex-shrink-0" style={{ color: "var(--text-2)" }}>{doseLigne(l)}</span>
                    </button>
                    {estOuvert && (
                      <div className="px-3.5 pb-3.5">
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div>
                            <small className="block text-[11px]" style={{ color: "var(--text-3)" }}>Séries</small>
                            <div className="flex items-center justify-center gap-2 mt-1">
                              <button type="button" aria-label="Une série de moins" disabled={l.series <= 1}
                                onClick={() => changer(i, (x) => ({ ...x, series: Math.max(1, x.series - 1) }))}
                                className="w-8 h-8 rounded-full flex items-center justify-center border-none cursor-pointer" style={{ background: "rgba(var(--text-3-rgb),0.14)", color: "var(--text-0)" }}><Minus size={14} /></button>
                              <b className="vy-nombre text-[16px]" style={{ color: "var(--text-0)" }}>{l.series}</b>
                              <button type="button" aria-label="Une série de plus" disabled={l.series >= 8}
                                onClick={() => changer(i, (x) => ({ ...x, series: Math.min(8, x.series + 1) }))}
                                className="w-8 h-8 rounded-full flex items-center justify-center border-none cursor-pointer" style={{ background: "rgba(var(--text-3-rgb),0.14)", color: "var(--text-0)" }}><Plus size={14} /></button>
                            </div>
                          </div>
                          <div>
                            <small className="block text-[11px]" style={{ color: "var(--text-3)" }}>{l.mesure === "duree" ? "Durée" : "Répétitions"}</small>
                            <b className="vy-nombre block text-[16px] mt-2" style={{ color: "var(--text-0)" }}>
                              {l.mesure === "duree" ? libelleDuree(l.duree_s ?? 0) : l.reps_min === l.reps_max ? l.reps_min : `${l.reps_min} à ${l.reps_max}`}
                            </b>
                          </div>
                          <div>
                            <small className="block text-[11px]" style={{ color: "var(--text-3)" }}>Repos</small>
                            <b className="vy-nombre block text-[16px] mt-2" style={{ color: "var(--text-0)" }}>{l.repos_s}{" "}s</b>
                          </div>
                        </div>

                        {autres.length > 0 && (
                          <>
                            <small className="block text-[11px] mt-4 mb-2" style={{ color: "var(--text-3)" }}>Le remplacer par un mouvement qui fait le même travail</small>
                            <div className="flex gap-2 overflow-x-auto -mx-3.5 px-3.5 pb-1" style={{ scrollbarWidth: "none" }}>
                              {autres.map((a) => (
                                <button key={a.cle} type="button"
                                  onClick={() => changer(i, (x) => ({ ...x, exercice_cle: a.cle, exercice_nom: a.nom, charge_type: a.chargeType ?? x.charge_type }))}
                                  className="flex-none flex flex-col items-center gap-1 p-2 rounded-2xl border-none cursor-pointer"
                                  style={{ width: 92, background: "rgba(var(--surface-rgb),1)", boxShadow: "var(--ombre-pose)" }}>
                                  <ExerciseThumb name={a.nom} size={52} />
                                  <span className="text-[11px] leading-tight text-center" style={{ color: "var(--text-0)" }}>{a.nom}</span>
                                </button>
                              ))}
                            </div>
                          </>
                        )}

                        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-4 text-[13px] font-semibold">
                          {!ceJour && <button type="button" onClick={() => changer(i, (x) => ({ ...x, statut: x.statut === "repere" ? "complementaire" : "repere" }))}
                            className="bg-transparent border-none p-0 cursor-pointer" style={{ color: "var(--exp-encre)" }}>
                            {l.statut === "repere" ? "Ne plus suivre ce mouvement" : "En faire un mouvement principal"}
                          </button>}
                          {i > 0 && (
                            <button type="button" onClick={() => { setBrouillon((b) => { const c = [...b]; [c[i - 1], c[i]] = [c[i], c[i - 1]]; return c; }); setOuvert(i - 1); }}
                              className="flex items-center gap-1 bg-transparent border-none p-0 cursor-pointer" style={{ color: "var(--text-2)" }}>
                              <ArrowUp size={13} /> Plus tôt dans la séance
                            </button>
                          )}
                          {brouillon.length > 1 && (
                            <button type="button" onClick={() => { setBrouillon((b) => b.filter((_, j) => j !== i)); setOuvert(null); }}
                              className="bg-transparent border-none p-0 cursor-pointer" style={{ color: "var(--text-3)" }}>
                              Retirer de la séance
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {brouillon.length < 12 && (
              <button type="button" onClick={() => { setAjout(true); setOuvert(null); }}
                className="mt-3 flex items-center gap-2 text-[16px] font-semibold bg-transparent border-none p-0 cursor-pointer" style={{ color: "var(--exp-encre)" }}>
                <Plus size={16} /> Ajouter un exercice
              </button>
            )}

            {!ceJour && <p className="text-[13px] mt-5" style={{ color: "var(--text-2)" }}>
              {principaux > 0
                ? <>Vaiiya mesure ta progression sur {principaux === 1 ? "le mouvement principal" : <>les <span className="vy-nombre">{principaux}</span> mouvements principaux</>}. Si tu en changes un, la comparaison repart de zéro pour lui.</>
                : "Aucun mouvement principal : Vaiiya ne mesurera pas ta progression sur cette séance."}
            </p>}
            {erreur && <p className="text-[13px] mt-3" style={{ color: "#D93A3A" }}>{erreur}</p>}
          </>
        )}
      </div>
    </FeuilleBas>
  );
}
