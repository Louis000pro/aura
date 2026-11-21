"use client";

/* ════════════════════════════════════════════════════════════════════
   La vue Progrès d'Entraînement (lot 4, maquette « Entraînement repensé »).

   De haut en bas : « Depuis le … » (une barre par semaine depuis
   l'inscription), « Avant, maintenant » (les records : la première valeur
   et celle d'aujourd'hui), le poids, puis « Tes semaines » (le bilan du
   dimanche, calculé sans IA, et les semaines d'avant).

   Les records, la constance et le poids vivaient dans le profil : ils
   sont ici depuis le lot 4 (décision 5 de la maquette). La constance, ce
   sont désormais le relief et sa phrase.

   ⚠️ Rien n'est écrit ici, sauf par les écrans qui existaient déjà (un
   record ajouté à la main, une pesée).
   ════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronRight, Plus } from "lucide-react";
import ExerciseThumb from "@/components/seance/ExerciseThumb";
import { FicheRecord } from "@/components/profil/RecordsProgres";
import AjoutRecord from "@/components/profil/AjoutRecord";
import CourbePoids from "@/components/profil/CourbePoids";
import WeighInPrompt from "@/components/WeighInPrompt";
import HistoriqueMasque from "@/components/historique/HistoriqueMasque";
import FeuilleBilan from "@/components/progres/FeuilleBilan";
import { lireRecords, valeurRecord, type RecordMouvement } from "@/lib/records";
import { lireProgres, type DonneesProgres } from "@/lib/progres";
import {
  avantMaintenant, barresRelief, bilanSemaine, dateLongue, depuisQuand, moisDe, phraseDepuis,
  plusJours, positionSurRelief, resumeDepuis, semaineDuBilan, semainesDepuis, sousTitreBilan,
  texteDuree, texteSemaine, titreBilan, uniteAvantMaintenant,
} from "@/lib/vueProgres";
import type { GuideRef } from "@/lib/guides";

/** Une phrase dont les nombres sont marqués ⟦n⟧ : ils prennent le visage du chiffre. */
function AvecNombres({ texte }: { texte: string }) {
  return (
    <>
      {texte.split(/⟦|⟧/).map((morceau, i) => (i % 2
        ? <b key={i} className="vy-nombre" style={{ fontWeight: 700, color: "var(--text-0)" }}>{morceau}</b>
        : <span key={i}>{morceau}</span>))}
    </>
  );
}

/** Combien de semaines passées on liste sous le bilan. */
const SEMAINES_LISTEES = 4;

export default function VueProgres({ userId, aujourdhui, guide, nomDuGuide, jours, debutHisto, onPlanning }: {
  userId: string;
  aujourdhui: string;
  guide: GuideRef;
  nomDuGuide: string | null;
  /** Les jours d'entraînement (1 = lundi), pour « la semaine qui vient ». */
  jours: number[] | null;
  /** Le premier jour visible de l'historique (offre gratuite), ou `null`. */
  debutHisto: string | null;
  onPlanning: () => void;
}) {
  const [donnees, setDonnees] = useState<{ pour: string; d: DonneesProgres | null } | null>(null);
  const [records, setRecords] = useState<{ pour: string; liste: RecordMouvement[] | null } | null>(null);
  const [versionRecords, setVersionRecords] = useState(0);
  const [ficheRecord, setFicheRecord] = useState<RecordMouvement | null>(null);
  const [ajout, setAjout] = useState(false);
  const [pesee, setPesee] = useState(false);
  const [poidsMasque, setPoidsMasque] = useState(false);
  const [bilanOuvert, setBilanOuvert] = useState<string | null>(null);

  useEffect(() => {
    let vivant = true;
    void lireProgres(userId).then((d) => { if (vivant) setDonnees({ pour: userId, d }); });
    return () => { vivant = false; };
  }, [userId]);

  useEffect(() => {
    let vivant = true;
    void lireRecords(userId).then((liste) => { if (vivant) setRecords({ pour: userId, liste }); });
    return () => { vivant = false; };
  }, [userId, versionRecords]);

  const d = donnees?.pour === userId ? donnees.d : undefined;
  const liste = records?.pour === userId ? records.liste : undefined;

  const semaines = useMemo(() => (d ? semainesDepuis(d.inscritLe, aujourdhui, d.seances) : []), [d, aujourdhui]);
  const resume = useMemo(() => resumeDepuis(semaines), [semaines]);
  const barres = useMemo(() => barresRelief(semaines, aujourdhui), [semaines, aujourdhui]);
  const lignesAvm = useMemo(() => avantMaintenant(liste ?? []), [liste]);
  const lundiBilan = semaineDuBilan(aujourdhui);

  const bilanDe = useCallback((lundi: string) => bilanSemaine({
    lundi, seances: d?.seances ?? [], prevues: 0, records: liste ?? [], changements: [],
  }), [d, liste]);

  const marque = d?.programme && barres.length ? positionSurRelief(barres, d.programme.depuis) : null;

  /* Les semaines listées sous le bilan : les plus récentes d'abord, sans
     remonter avant l'inscription. */
  const passees = useMemo(() => {
    if (!d) return [] as string[];
    const out: string[] = [];
    for (let i = 1; i <= SEMAINES_LISTEES; i++) {
      const l = plusJours(lundiBilan, -7 * i);
      if (plusJours(l, 6) < d.inscritLe) break;
      out.push(l);
    }
    return out;
  }, [d, lundiBilan]);

  if (d === undefined) {
    return <div className="mt-6 h-[180px] animate-pulse" style={{ borderRadius: "var(--r-bloc)", background: "rgba(var(--tint-violet-rgb),0.45)" }} />;
  }
  if (d === null) {
    return <p className="vy-corps mt-6" style={{ color: "var(--text-2)" }}>Tes progrès ne se lisent pas pour l’instant. Réessaie dans un moment.</p>;
  }

  const bilan = bilanDe(lundiBilan);
  const bilanVisible = plusJours(lundiBilan, 6) >= d.inscritLe;
  const gap = barres.length > 30 ? 2 : 3;

  return (
    <div className="mt-5">
      {/* ── Depuis le … ── */}
      <section aria-label="Depuis ton inscription">
        <span className="text-[13px] font-semibold" style={{ color: "var(--text-2)" }}>Depuis le {dateLongue(d.inscritLe)}</span>
        <div className="mt-0.5 flex items-baseline gap-2" style={{ color: "var(--text-0)" }}>
          <b className="vy-nombre leading-none" style={{ fontSize: 64, fontWeight: 700 }}>{resume.semaines}</b>
          <span className="vy-sous">semaine{resume.semaines > 1 ? "s" : ""}</span>
        </div>
        <div className="mt-3.5 flex items-end" style={{ height: 58, gap }} aria-hidden="true">
          {barres.map((b) => (
            <i key={b.lundi} className="block flex-1"
              style={b.vide
                ? { height: 3, borderRadius: 2, background: "rgba(var(--text-3-rgb),0.45)", boxShadow: b.enCours ? "inset 0 0 0 1.5px #8B5CF6" : undefined }
                : {
                  height: `${Math.max(8, b.part * 100)}%`, borderRadius: "3px 3px 1px 1px",
                  background: b.enCours ? "transparent" : "#2BD4A0",
                  boxShadow: b.enCours ? "inset 0 0 0 1.5px #2BD4A0" : undefined,
                }} />
          ))}
        </div>
        <div className="relative mt-1.5 text-[11px]" style={{ height: marque !== null ? 30 : 16, color: "var(--text-2)" }}>
          <span className="absolute left-0 top-0">{barres.length ? moisDe(barres[0].lundi) : ""}</span>
          {marque !== null && marque < 0.72 && d.programme && (
            <span className="absolute top-0 max-w-[40%] truncate pl-1.5 font-semibold leading-tight"
              style={{ left: `${marque * 100}%`, borderLeft: "1.5px solid var(--exp-encre)", color: "var(--exp-encre)" }}>
              {dateLongue(d.programme.depuis)}<br />{d.programme.nom}
            </span>
          )}
          <span className="absolute right-0 top-0">cette semaine</span>
        </div>
        <p className="vy-corps mt-1.5" style={{ color: "var(--text-1)" }}><AvecNombres texte={phraseDepuis(resume)} /></p>
      </section>

      {/* ── Avant, maintenant ── */}
      {liste !== null && liste !== undefined && (
        <section className="mt-8" aria-label="Avant, maintenant">
          <div className="mb-2.5 flex items-baseline justify-between gap-3">
            <h3 className="vy-sous" style={{ color: "var(--text-0)" }}>Avant, maintenant</h3>
            {liste.length > 0 ? (
              <button type="button" onClick={() => setAjout(true)}
                className="-mr-1 flex min-h-[40px] items-center gap-1 px-1 text-[13px] font-semibold cursor-pointer" style={{ color: "var(--exp-encre)" }}>
                <Plus size={15} strokeWidth={2.4} /> Ajouter
              </button>
            ) : null}
          </div>
          {depuisQuand(lignesAvm) && <p className="-mt-2 mb-2 text-[13px]" style={{ color: "var(--text-2)" }}>Depuis {depuisQuand(lignesAvm)}</p>}
          {liste.length === 0 ? (
            <div className="flex items-center gap-3 py-2">
              <span className="flex-shrink-0 rounded-2xl" style={{ background: "rgba(139,92,246,0.08)" }}><ExerciseThumb name="Pompes" size={64} /></span>
              <div className="min-w-0">
                <p className="text-[13px] leading-snug" style={{ color: "var(--text-2)" }}>
                  Note tes répétitions ou ta charge pendant une séance, ou ajoute un chiffre que tu connais : ta première valeur et ton record s’afficheront ici.
                </p>
                <button type="button" onClick={() => setAjout(true)} className="mt-1 min-h-[40px] text-[13px] font-semibold cursor-pointer" style={{ color: "var(--exp-encre)" }}>
                  Ajouter un record
                </button>
              </div>
            </div>
          ) : (
            <div className="-mx-5 flex gap-2.5 overflow-x-auto px-5 pb-2.5" style={{ scrollbarWidth: "none" }}>
              {lignesAvm.map(({ record: r, avant, maintenant }, i) => (
                <button key={r.cle} type="button" onClick={() => setFicheRecord(r)}
                  className="flex w-[150px] flex-none flex-col p-3 text-left cursor-pointer"
                  style={{ borderRadius: "var(--r-bloc)", background: "rgba(var(--surface-rgb),0.9)", border: "1px solid rgba(var(--text-3-rgb),0.16)", boxShadow: "var(--ombre-pose)" }}>
                  <span className="mx-auto mb-1"><ExerciseThumb name={r.nom} size={84} delay={i * 300} /></span>
                  <span className="truncate text-[13px] font-bold" style={{ color: "var(--text-0)" }}>{r.nom}</span>
                  <span className="mt-0.5 flex items-baseline gap-1.5">
                    {avant && <>
                      <span className="vy-nombre text-[16px]" style={{ color: "var(--text-3)", fontWeight: 600 }}>
                        {/* Un gainage qui passe la minute : les deux valeurs s'écrivent en minutes (« 0:40 → 1:30 »). */}
                        {r.mesure === "duree" && maintenant.valeur >= 60 && avant.valeur < 60
                          ? `0:${String(Math.round(avant.valeur)).padStart(2, "0")}` : valeurRecord(r.mesure, avant)}
                      </span>
                      <span className="text-[13px]" style={{ color: "var(--text-3)" }} aria-label="puis">→</span>
                    </>}
                    <b className="vy-nombre text-[26px]" style={{ color: "var(--teal-encre)", fontWeight: 700 }}>{valeurRecord(r.mesure, maintenant)}</b>
                  </span>
                  <span className="text-[11px]" style={{ color: "var(--text-2)" }}>{uniteAvantMaintenant(r)}</span>
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── Le poids ── */}
      <section className="mt-6 overflow-hidden" aria-label="Ton poids"
        style={{ borderRadius: "var(--r-bloc)", background: "rgba(var(--surface-rgb),0.9)", border: "1px solid rgba(var(--text-3-rgb),0.16)" }}>
        <CourbePoids userId={userId} onPeser={() => setPesee(true)} debut={debutHisto} onMasques={setPoidsMasque} />
      </section>
      {poidsMasque && <HistoriqueMasque className="mt-3" />}

      {/* ── Tes semaines ── */}
      {bilanVisible && (
        <section className="mt-8" aria-label="Tes semaines">
          <div className="mb-2.5 flex items-baseline justify-between gap-3">
            <h3 className="vy-sous" style={{ color: "var(--text-0)" }}>Tes semaines</h3>
            <span className="text-[13px]" style={{ color: "var(--text-2)" }}>un bilan chaque dimanche</span>
          </div>
          <button type="button" onClick={() => setBilanOuvert(lundiBilan)}
            className="grid w-full items-center gap-2.5 px-4 py-3.5 text-left cursor-pointer"
            style={{ gridTemplateColumns: "minmax(0,1fr) 20px", borderRadius: "var(--r-bloc)", background: "linear-gradient(135deg,#2A2140,#17131F)", boxShadow: "var(--ombre-pose)" }}>
            <span className="min-w-0">
              <small className="block text-[11px] font-semibold" style={{ color: "#C9BEEA" }}>Semaine {texteSemaine(lundiBilan)}</small>
              <b className="vy-titre mt-0.5 block" style={{ color: "#fff", fontSize: 20 }}>{titreBilan(bilan)}</b>
              <span className="mt-0.5 block truncate text-[13px]" style={{ color: "#D8D0F0" }}>{sousTitreBilan(bilan)}</span>
            </span>
            <ChevronRight size={20} color="#fff" />
          </button>
          {passees.map((l) => {
            const b = bilanDe(l);
            return (
              <button key={l} type="button" onClick={() => setBilanOuvert(l)}
                className="grid w-full items-center gap-2 py-2.5 text-left text-[16px] cursor-pointer"
                style={{ gridTemplateColumns: "minmax(0,1fr) auto", borderBottom: "1px solid rgba(var(--text-3-rgb),0.14)", color: "var(--text-1)" }}>
                <span className="truncate first-letter:uppercase">{texteSemaine(l).replace(/^du /, "")}</span>
                <span className="text-[13px]" style={{ color: "var(--text-2)" }}>
                  {b.seances === 0 ? "sans séance" : `${b.seances} séance${b.seances > 1 ? "s" : ""} · ${texteDuree(b.minutes)}`}
                </span>
              </button>
            );
          })}
        </section>
      )}

      {ficheRecord && (
        <FicheRecord record={ficheRecord} onFermer={() => setFicheRecord(null)}
          onRetire={() => { setFicheRecord(null); setVersionRecords((v) => v + 1); }} />
      )}
      {ajout && liste && (
        <AjoutRecord userId={userId} records={liste} onFermer={() => setAjout(false)}
          onAjoute={() => { setAjout(false); setVersionRecords((v) => v + 1); }} />
      )}
      <WeighInPrompt ouvert={pesee} onFermer={() => setPesee(false)} />
      {bilanOuvert && (
        <FeuilleBilan userId={userId} lundi={bilanOuvert} aujourdhui={aujourdhui} seances={d.seances} records={liste ?? []}
          guide={guide} nomDuGuide={nomDuGuide} jours={jours}
          onFermer={() => setBilanOuvert(null)} onPlanning={() => { setBilanOuvert(null); onPlanning(); }} />
      )}
    </div>
  );
}
